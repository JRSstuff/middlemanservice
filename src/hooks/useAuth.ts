import { useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Database, UserRole } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    error: null,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error.message);
      }
      return data || null;
    } catch (err) {
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (isMounted) {
            setState({
              user: session.user,
              session,
              profile,
              isLoading: false,
              error: null,
            });
          }
        } else {
          if (isMounted) {
            setState({
              user: null,
              session: null,
              profile: null,
              isLoading: false,
              error: null,
            });
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: err.message || 'Failed to authenticate',
          }));
        }
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (isMounted) {
            setState({
              user: session.user,
              session,
              profile,
              isLoading: false,
              error: null,
            });
          }
        } else {
          if (isMounted) {
            setState({
              user: null,
              session: null,
              profile: null,
              isLoading: false,
              error: null,
            });
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signInWithOtp = async (email: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    if (error) {
      setState((prev) => ({ ...prev, isLoading: false, error: error.message }));
      throw error;
    }
    setState((prev) => ({ ...prev, isLoading: false }));
  };

  const signInWithPassword = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setState((prev) => ({ ...prev, isLoading: false, error: error.message }));
      throw error;
    }
    const profile = await fetchProfile(data.user.id);
    setState({
      user: data.user,
      session: data.session,
      profile,
      isLoading: false,
      error: null,
    });
    return data;
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole = 'buyer'
  ) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });
    if (error) {
      setState((prev) => ({ ...prev, isLoading: false, error: error.message }));
      throw error;
    }
    setState((prev) => ({ ...prev, isLoading: false }));
    return data;
  };

  const signOut = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    await supabase.auth.signOut();
    setState({
      user: null,
      session: null,
      profile: null,
      isLoading: false,
      error: null,
    });
  };

  return {
    ...state,
    signInWithOtp,
    signInWithPassword,
    signUp,
    signOut,
    refreshProfile: () => state.user && fetchProfile(state.user.id),
  };
}
