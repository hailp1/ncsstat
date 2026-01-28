'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { getSupabase } from '@/utils/supabase/client';
import { getORCIDUser, clearORCIDUser } from '@/utils/cookie-helper';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { logLogin, logLogout } from '@/lib/activity-logger';

export interface Profile {
    id: string;
    full_name: string | null;
    email: string | null;
    orcid_id: string | null;
    tokens: number;
    avatar_url: string | null;
    role: string;
    [key: string]: any;
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    isAdmin: boolean;
    isOrcidUser: boolean;
    refreshProfile: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    isAdmin: false,
    isOrcidUser: false,
    refreshProfile: async () => { },
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const isInitialized = useRef(false);
    const lastUserRef = useRef<string | null>(null);
    const sessionStartRef = useRef<Date | null>(null);
    const supabase = getSupabase();

    const fetchProfile = async (userId: string) => {
        try {
            console.log(`[AuthProvider] Fetching profile for ${userId}...`);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.warn('[AuthProvider] Profile fetch warning:', error.message);
            }
            if (data) {
                setProfile(data as Profile);
            }
        } catch (err) {
            console.error('[AuthProvider] Profile fetch error:', err);
        }
    };

    const initializeAuth = async () => {
        if (isInitialized.current) return;
        isInitialized.current = true;
        console.log('[AuthProvider] Initializing...');

        try {
            // 1. Check Supabase Session
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                setUser(session.user);
                lastUserRef.current = session.user.id;
                sessionStartRef.current = new Date();
                await logLogin(session.user.id);
                await fetchProfile(session.user.id);
            } else {
                // 2. Check ORCID Session
                const orcidUserId = getORCIDUser();
                if (orcidUserId) {
                    // Fetch profile for ORCID user
                    const { data: orcidProfile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', orcidUserId)
                        .single();

                    if (orcidProfile) {
                        setProfile(orcidProfile as Profile);
                        // Mock user object for ORCID
                        setUser({
                            id: orcidUserId,
                            email: orcidProfile.email || `${orcidProfile.orcid_id}@orcid.org`,
                        } as any);
                    }
                }
            }
        } catch (err: any) {
            // Silence harmless AbortError commonly caused by React Strict Mode or rapid navigation
            if (err.name !== 'AbortError') {
                console.error('[AuthProvider] Init error:', err);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Run deep initialization
        initializeAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
            console.log(`[AuthProvider] Auth event: ${event}`, session?.user?.id);

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                if (session?.user) {
                    const userId = session.user.id;

                    // Always update user state to ensure UI is in sync
                    setUser(session.user);

                    // Logging logic - only if user changed
                    if (userId !== lastUserRef.current) {
                        console.log(`[AuthProvider] User changed/detected: ${userId}`);
                        lastUserRef.current = userId;
                        sessionStartRef.current = new Date();
                        // Call non-critical async tasks without blocking
                        logLogin(userId).catch(e => console.warn('Log login fail', e));
                        fetchProfile(userId);
                    } else if (!profile) {
                        // If same user but profile is missing, try fetching it
                        fetchProfile(userId);
                    }
                    setLoading(false);
                } else if (event === 'INITIAL_SESSION') {
                    // No session on initial load, ensure loading is stopped
                    setLoading(false);
                }
            } else if (event === 'SIGNED_OUT') {
                console.log('[AuthProvider] User signed out');
                if (lastUserRef.current) {
                    logLogout(lastUserRef.current, sessionStartRef.current || undefined).catch(e => console.warn('Log logout fail', e));
                }
                setUser(null);
                setProfile(null);
                lastUserRef.current = null;
                sessionStartRef.current = null;
                clearORCIDUser();
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        clearORCIDUser();
        setUser(null);
        setProfile(null);
        window.location.href = '/login';
    };

    const value = {
        user,
        profile,
        loading,
        isAdmin: profile?.role === 'admin',
        isOrcidUser: !!profile?.orcid_id,
        refreshProfile: async () => {
            const currentUserId = user?.id || (profile?.id);
            if (currentUserId) {
                await fetchProfile(currentUserId);
            }
        },
        signOut,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
