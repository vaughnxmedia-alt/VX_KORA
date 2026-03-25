import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'author' | 'client';

type UserProfile = {
  [key: string]: any;
};

export type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  role: UserRole | null;
  hasTheBriefAccess: boolean;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  isLoading: true,
  role: null,
  hasTheBriefAccess: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasTheBriefAccess, setHasTheBriefAccess] = useState(false);

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error fetching initial session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching profile:', error);
            setProfile(null);
          } else {
            setProfile(data);
          }
        });

      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching user role:', error);
            setRole(null);
            return;
          }
          const roles = (data ?? []).map((r) => r.role as UserRole);
          if (roles.includes('admin')) setRole('admin');
          else if (roles.includes('author')) setRole('author');
          else if (roles.includes('client')) setRole('client');
          else setRole(roles[0] ?? null);
        });
    } else {
      setProfile(null);
      setRole(null);
    }
  }, [user]);

  useEffect(() => {
    const checkAccess = async () => {
      setIsCheckingAccess(true);
      const privilegedRoles = ['admin', 'author'];
      if (role && privilegedRoles.includes(role)) {
        setHasTheBriefAccess(true);
        setIsCheckingAccess(false);
        return;
      }

      const accessToken = localStorage.getItem('theBriefAccessToken');
      if (accessToken) {
        try {
          const { data, error } = await supabase.functions.invoke(
            'check-brief-access',
            { body: { access_token: accessToken } }
          );

          if (error) throw error;
          if (data && data.hasAccess) {
            setHasTheBriefAccess(true);
          } else {
            localStorage.removeItem('theBriefAccessToken');
            setHasTheBriefAccess(false);
          }
        } catch (error) {
          console.error('Error checking Brief access:', error);
          setHasTheBriefAccess(false);
        }
      } else {
        setHasTheBriefAccess(false);
      }
      setIsCheckingAccess(false);
    };

    if (!isLoading) {
      checkAccess();
    }
  }, [role, isLoading]);


  return (
    <AuthContext.Provider value={{ user, profile, session, isLoading: isLoading || isCheckingAccess, role, hasTheBriefAccess }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
      throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
