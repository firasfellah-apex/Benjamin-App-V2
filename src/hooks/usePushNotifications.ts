import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { addBreadcrumb, captureException } from '@/lib/sentry';

export interface PushNotificationToken {
  value: string;
  type: 'fcm' | 'apns';
}

/**
 * Hook for managing push notifications
 * 
 * Usage:
 * const { token, isRegistered, requestPermission } = usePushNotifications();
 */
export function usePushNotifications() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  // Check if we're on a native platform
  const isNative = Capacitor.isNativePlatform();

  // Listen for push notification taps
  useEffect(() => {
    if (!isNative) return;

    const handleNotificationTap = (event: CustomEvent) => {
      const { orderId, notification } = event.detail;
      
      // Navigate based on user role and order status
      // This will be determined by the current route context
      if (orderId) {
        // Navigate to order detail page
        // The route will depend on user role (customer vs runner)
        const currentPath = window.location.pathname;
        if (currentPath.includes('/customer')) {
          navigate(`/customer/deliveries/${orderId}`);
        } else if (currentPath.includes('/runner')) {
          navigate(`/runner/delivery/${orderId}`);
        } else {
          // Default to customer view
          navigate(`/customer/deliveries/${orderId}`);
        }
      }
    };

    window.addEventListener('pushNotificationTap', handleNotificationTap as EventListener);
    return () => {
      window.removeEventListener('pushNotificationTap', handleNotificationTap as EventListener);
    };
  }, [isNative, navigate]);

  useEffect(() => {
    if (!isNative) {
      // Web push notifications would use Web Push API
      // For now, only support native platforms
      return;
    }

    // Request permission
    PushNotifications.requestPermissions().then((result) => {
      if (result.receive === 'granted') {
        setPermissionStatus('granted');
        // Register for push notifications
        PushNotifications.register();
        addBreadcrumb('Push notifications permission granted');
      } else {
        setPermissionStatus('denied');
        addBreadcrumb('Push notifications permission denied');
      }
    }).catch((error) => {
      console.error('Error requesting push notification permission:', error);
      captureException(error as Error, { context: 'push_notifications_permission' });
      setPermissionStatus('denied');
    });

    // Listen for registration
    const registrationListener = PushNotifications.addListener('registration', (token: PushNotificationToken) => {
      console.log('Push notification token:', token.value);
      setToken(token.value);
      setIsRegistered(true);
      addBreadcrumb('Push notification token received', { token: token.value.substring(0, 20) + '...' });
      
      // TODO: Send token to your backend to store for this user
      // await savePushToken(token.value);
    });

    // Listen for registration errors
    const registrationErrorListener = PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push notification registration error:', error);
      captureException(error as Error, { context: 'push_notifications_registration' });
    });

    // Listen for push notifications received while app is in foreground
    const pushReceivedListener = PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received (foreground):', notification);
      addBreadcrumb('Push notification received', { 
        title: notification.title,
        body: notification.body 
      });
      
      // You can show a local notification or update UI here
      // For now, we'll rely on realtime updates for foreground
    });

    // Listen for push notification actions (when user taps notification)
    const pushActionListener = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push notification action performed:', action);
      addBreadcrumb('Push notification action', { 
        actionId: action.actionId,
        notification: action.notification 
      });
      
      // Handle navigation based on notification data
      // Example: navigate to order detail page
      if (action.notification.data?.orderId) {
        // Navigate to order detail
        // navigate(`/customer/deliveries/${action.notification.data.orderId}`);
      }
    });

    // Cleanup listeners on unmount
    return () => {
      registrationListener.remove();
      registrationErrorListener.remove();
      pushReceivedListener.remove();
      pushActionListener.remove();
    };
  }, [isNative]);

  const requestPermission = async () => {
    if (!isNative) {
      console.warn('Push notifications only supported on native platforms');
      return false;
    }

    try {
      const result = await PushNotifications.requestPermissions();
      if (result.receive === 'granted') {
        setPermissionStatus('granted');
        PushNotifications.register();
        return true;
      } else {
        setPermissionStatus('denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      captureException(error as Error, { context: 'push_notifications_request_permission' });
      return false;
    }
  };

  return {
    token,
    isRegistered,
    permissionStatus,
    requestPermission,
    isSupported: isNative,
  };
}

