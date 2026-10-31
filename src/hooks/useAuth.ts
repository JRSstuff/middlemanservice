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

export const DEMO_USERS: Record<'buyer' | 'seller' | 'staff', { user: User; profile: Profile }> = {
  buyer: {
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'buyer@safeswap.dev',
      user_metadata: { display_name: 'Buyer Alex', role: 'buyer' },
      app_metadata: { role: 'buyer' },
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00.000Z',
    } as unknown as User,
    profile: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'buyer@safeswap.dev',
      display_name: 'Buyer Alex',
      avatar_url: null,
      phone: null,
      role: 'buyer' as UserRole,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  },
  seller: {
    user: {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'seller@safeswap.dev',
      user_metadata: { display_name: 'Seller Maria', role: 'seller' },
      app_metadata: { role: 'seller' },
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00.000Z',
    } as unknown as User,
    profile: {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'seller@safeswap.dev',
      display_name: 'Seller Maria',
      avatar_url: null,
      phone: null,
      role: 'seller' as UserRole,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  },
  staff: {
    user: {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'staff@safeswap.dev',
      user_metadata: { display_name: 'Staff Verification Specialist', role: 'staff' },
      app_metadata: { role: 'staff' },
      aud: 'authenticated',
      created_at: '2026-01-01T00:00:00.000Z',
    } as unknown as User,
    profile: {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'staff@safeswap.dev',
      display_name: 'Staff Verification Specialist',
      avatar_url: null,
      phone: null,
      role: 'staff' as UserRole,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  },
};

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
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      // 1. Check local prototype user session
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('SAFESWAP_PROTOTYPE_USER');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (isMounted && parsed?.user) {
              setState({
                user: parsed.user,
                session: parsed.session || null,
                profile: parsed.profile || null,
                isLoading: false,
                error: null,
              });
              return;
            }
          } catch {
            localStorage.removeItem('SAFESWAP_PROTOTYPE_USER');
          }
        }
      }

      // 2. Check Supabase Auth session
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
          // Default to Buyer Alex for seamless prototype testing if not logged in
          const defaultDemo = DEMO_USERS.buyer;
          if (isMounted) {
            setState({
              user: defaultDemo.user,
              session: null,
              profile: defaultDemo.profile,
              isLoading: false,
              error: null,
            });
          }
        }
      } catch (err: any) {
        // Fallback to default demo user on network/offline error
        const defaultDemo = DEMO_USERS.buyer;
        if (isMounted) {
          setState({
            user: defaultDemo.user,
            session: null,
            profile: defaultDemo.profile,
            isLoading: false,
            error: null,
          });
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
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signInAsDemo = (persona: 'buyer' | 'seller' | 'staff') => {
    const demo = DEMO_USERS[persona];
    if (typeof window !== 'undefined') {
      localStorage.setItem('SAFESWAP_PROTOTYPE_USER', JSON.stringify(demo));
    }
    setState({
      user: demo.user,
      session: null,
      profile: demo.profile,
      isLoading: false,
      error: null,
    });
    return demo;
  };

  const signInWithPassword = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    // 1. Try Supabase Auth password sign-in
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data?.user) {
        const profile = await fetchProfile(data.user.id);
        if (typeof window !== 'undefined') {
          localStorage.setItem('SAFESWAP_PROTOTYPE_USER', JSON.stringify({ user: data.user, profile }));
        }
        setState({
          user: data.user,
          session: data.session,
          profile,
          isLoading: false,
          error: null,
        });
        return data;
      }
    } catch {
      // Fall through to prototype database profile lookup
    }

    // 2. Direct database profile lookup (prototype mode - NO EMAIL SENDING)
    try {
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      const role: UserRole = email.includes('staff') ? 'staff' : email.includes('seller') ? 'seller' : 'buyer';
      const userProfile: Profile = dbProfile || {
        id: crypto.randomUUID(),
        email,
        display_name: email.split('@')[0],
        avatar_url: null,
        phone: null,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockUser = {
        id: userProfile.id,
        email,
        user_metadata: { display_name: userProfile.display_name, role: userProfile.role },
        app_metadata: { role: userProfile.role },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as unknown as User;

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'SAFESWAP_PROTOTYPE_USER',
          JSON.stringify({ user: mockUser, profile: userProfile })
        );
      }

      setState({
        user: mockUser,
        session: null,
        profile: userProfile,
        isLoading: false,
        error: null,
      });

      return { user: mockUser, session: null };
    } catch (err: any) {
      setState((prev) => ({ ...prev, isLoading: false, error: err.message || 'Authentication failed' }));
      throw err;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole = 'buyer'
  ) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    let userId: string = crypto.randomUUID();

    // Try Supabase Auth without blocking on email confirmation
    try {
      const { data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName, role },
        },
      });
      if (data?.user?.id) {
        userId = data.user.id;
      }
    } catch {
      // Ignore SMTP / email delivery failures in prototype
    }

    // Ensure record exists in public.profiles table
    const newProfile: Profile = {
      id: userId,
      email,
      display_name: displayName,
      avatar_url: null,
      phone: null,
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await (supabase.from('profiles') as any).upsert(newProfile);
    } catch {
      // Ignore RLS insert error if profile exists
    }

    const mockUser = {
      id: userId,
      email,
      user_metadata: { display_name: displayName, role },
      app_metadata: { role },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as unknown as User;

    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'SAFESWAP_PROTOTYPE_USER',
        JSON.stringify({ user: mockUser, profile: newProfile })
      );
    }

    setState({
      user: mockUser,
      session: null,
      profile: newProfile,
      isLoading: false,
      error: null,
    });

    return { user: mockUser, session: null };
  };

  const signOut = async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    if (typeof window !== 'undefined') {
      localStorage.removeItem('SAFESWAP_PROTOTYPE_USER');
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore signOut errors
    }
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
    signInAsDemo,
    signInWithPassword,
    signUp,
    signOut,
    refreshProfile: () => state.user && fetchProfile(state.user.id),
  };
}
