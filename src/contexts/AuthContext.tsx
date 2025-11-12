import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import type { Session, User } from '@supabase/supabase-js';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for OAuth callback in URL hash
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.substring(1));
    const hasAccessToken = hashParams.has('access_token');
    const hasError = hashParams.has('error');
    const hasOAuthParams = hasAccessToken || hasError;
    
    if (hasOAuthParams) {
      console.log('=== OAuth Callback Detected ===');
      console.log('Full hash:', hash);
      console.log('Hash params:', Object.fromEntries(hashParams.entries()));
      
      if (hasError) {
        const error = hashParams.get('error');
        const errorDesc = hashParams.get('error_description');
        console.error('❌ OAuth error in URL:', error, errorDesc);
        // Clear hash on error
        window.history.replaceState(null, '', window.location.pathname);
        setLoading(false);
        return;
      }
      
      if (hasAccessToken) {
        console.log('✅ Access token found in URL hash');
        console.log('Token type:', hashParams.get('token_type'));
        console.log('Expires in:', hashParams.get('expires_in'));
        // Don't clear hash yet - let Supabase process it first
      }
    }

    // Set up auth state listener FIRST - this will catch OAuth callbacks
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('=== Auth State Changed ===');
      console.log('Event:', event);
      console.log('Session:', newSession ? 'exists' : 'null');
      console.log('User:', newSession?.user?.email || 'no user');
      console.log('User ID:', newSession?.user?.id || 'no id');
      
      // Handle OAuth callback - this is the key event
      if (event === 'SIGNED_IN') {
        console.log('✅ SIGNED_IN event - User logged in successfully!');
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        
        // Clear the hash after successful sign-in
        if (hasOAuthParams) {
          console.log('Clearing OAuth hash from URL');
          window.history.replaceState(null, '', window.location.pathname);
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed');
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        console.log('⚠️ SIGNED_OUT event - User logged out');
        setSession(null);
        setUser(null);
        setLoading(false);
      } else if (event === 'INITIAL_SESSION') {
        console.log('Initial session loaded');
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      } else {
        console.log('Other auth event:', event);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    });

    // Then get initial session - this also processes OAuth hash tokens
    // This is important: getSession() reads tokens from URL hash and creates session
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('❌ Error getting session:', error);
        setLoading(false);
      } else {
        console.log('=== Initial Session Check ===');
        console.log('Session exists:', !!data?.session);
        console.log('User email:', data?.session?.user?.email || 'no user');
        console.log('User ID:', data?.session?.user?.id || 'no id');
        
        // If we have OAuth params but no session, something went wrong
        if (hasOAuthParams && !data?.session) {
          console.error('⚠️ OAuth callback detected but no session created!');
          console.error('This might mean the tokens are invalid or expired');
        }
        
        // Don't set state here - let onAuthStateChange handle it
        // This ensures we don't race with the OAuth callback
        if (!data?.session) {
          setLoading(false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

