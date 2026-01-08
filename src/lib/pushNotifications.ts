import { PushNotifications, type PermissionStatus, type Token } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { supabase } from '@/db/supabase';

export type AppRole = 'customer' | 'runner' | 'admin';

const PUSH_TOKEN_STORAGE_KEY = 'benjamin:pending_push_token_v1';

type PendingPushToken = {
  token: string;
  platform: 'ios' | 'android' | 'web';
  appRole: AppRole;
  savedAt: string; // ISO
};

function getPlatform(): PendingPushToken['platform'] {
  const p = Capacitor.getPlatform();
  if (p === 'ios' || p === 'android' || p === 'web') return p;
  return 'web';
}

async function storePendingToken(payload: PendingPushToken) {
  const value = JSON.stringify(payload);
  // Prefer native-safe storage (works on iOS/Android even when localStorage is flaky)
  try {
    await Preferences.set({ key: PUSH_TOKEN_STORAGE_KEY, value });
    return;
  } catch {
    // fallthrough
  }
  try {
    localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, value);
  } catch {
    // ignore
  }
}

async function readPendingToken(): Promise<PendingPushToken | null> {
  try {
    const { value } = await Preferences.get({ key: PUSH_TOKEN_STORAGE_KEY });
    if (value) return JSON.parse(value) as PendingPushToken;
  } catch {
    // fallthrough
  }
  try {
    const raw = localStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingPushToken;
  } catch {
    return null;
  }
}

async function clearPendingToken() {
  try {
    await Preferences.remove({ key: PUSH_TOKEN_STORAGE_KEY });
  } catch {
    // fallthrough
  }
  try {
    localStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

async function savePushTokenToSupabase(token: string, appRole: AppRole): Promise<void> {
  const platform = getPlatform();

  const { data: { user }, error: userErr } = await supabase.auth.getUser();

  if (userErr) {
    console.warn('[Push Notifications] getUser error; caching token for later upsert:', userErr.message);
    await storePendingToken({ token, platform, appRole, savedAt: new Date().toISOString() });
    return;
  }

  if (!user) {
    console.warn('[Push Notifications] No user yet; caching token for post-login upsert');
    await storePendingToken({ token, platform, appRole, savedAt: new Date().toISOString() });
    return;
  }

  console.log('[Push Notifications] 💾 Attempting to save token to Supabase:', {
    userId: user.id,
    platform,
    appRole,
    tokenPreview: token.substring(0, 20) + '...',
  });

  const { error } = await supabase
    .from('user_push_tokens')
    .upsert(
      {
        user_id: user.id,
        token,
        platform,
        app_role: appRole,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,token,app_role',
      }
    );

  if (error) {
    console.error('[Push Notifications] ❌ Error saving push token; caching for retry:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      fullError: JSON.stringify(error, null, 2),
    });
    await storePendingToken({ token, platform, appRole, savedAt: new Date().toISOString() });
    return;
  }

  console.log('[Push Notifications] ✅ Token saved to Supabase');
  await clearPendingToken();
}

let authListenerAttached = false;
let pushInitialized = false;

export async function flushPendingPushToken(appRole: AppRole = 'customer'): Promise<void> {
  console.log('[Push Notifications] 🔄 flushPendingPushToken called with appRole:', appRole);
  const pending = await readPendingToken();
  
  if (!pending?.token) {
    console.log('[Push Notifications] No pending token found');
    return;
  }

  console.log('[Push Notifications] ✅ Found pending token, attempting to save:', {
    token: pending.token.substring(0, 20) + '...',
    platform: pending.platform,
    appRole: pending.appRole,
    savedAt: pending.savedAt,
  });

  // If caller passes a role, prefer it (runner app can override)
  const roleToUse = appRole || pending.appRole || 'customer';
  await savePushTokenToSupabase(pending.token, roleToUse);
}

/**
 * Call once at app start.
 * Pass appRole = 'runner' in the runner app, 'customer' in the customer app.
 */
export async function initializePushNotifications(appRole: AppRole = 'customer') {
  if (pushInitialized) return;
  pushInitialized = true;

  // Only initialize on native platforms
  if (!Capacitor.isNativePlatform()) {
    console.log('[Push Notifications] Skipping initialization on web platform');
    return;
  }

  // Attach auth listener ONCE: when user logs in, flush any cached token.
  if (!authListenerAttached) {
    authListenerAttached = true;
    console.log('[Push Notifications] 🔗 Attaching auth state change listener');
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Push Notifications] 🔐 Auth state changed:', event, {
        hasSession: !!session,
        userId: session?.user?.id,
      });
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('[Push Notifications] 🚀 Triggering flushPendingPushToken on', event);
        await flushPendingPushToken(appRole);
      }
    });
  }

  let permStatus: PermissionStatus;
  try {
    permStatus = await PushNotifications.requestPermissions();
  } catch (e) {
    console.warn('[Push Notifications] requestPermissions failed:', e);
    return;
  }

  if (permStatus.receive !== 'granted') {
    console.warn('[Push Notifications] Permission not granted');
    return;
  }

  try {
    await PushNotifications.register();
  } catch (e) {
    console.error('[Push Notifications] register() failed:', e);
    return;
  }

  // NOTE: addListener returns a handle; we keep it simple since initialize is guarded.
  PushNotifications.addListener('registration', async (token: Token) => {
    const tokenValue = (token as any)?.value ?? String(token);
    console.log('✅ PUSH TOKEN:', tokenValue);
    await savePushTokenToSupabase(tokenValue, appRole);
  });

  PushNotifications.addListener('registrationError', (error) => {
    console.error('[Push Notifications] Registration error:', error);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('📩 PUSH RECEIVED:', JSON.stringify(notification));
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('👉 PUSH ACTION:', JSON.stringify(notification));
  });

  // If we already had a token cached from pre-login, try flushing immediately.
  await flushPendingPushToken(appRole);
}
