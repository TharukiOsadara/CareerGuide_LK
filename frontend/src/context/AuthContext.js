import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on launch.
  useEffect(() => {
    (async () => {
      const token = await tokenStore.get();
      if (token) {
        try {
          const { user: me } = await api('/api/auth/me');
          setUser(me);
        } catch {
          await tokenStore.clear();
        }
      }
      setLoading(false);
    })();
  }, []);

  const persist = async ({ token, user: u }) => {
    if (token) await tokenStore.set(token);
    setUser(u);
    return u;
  };

  const value = useMemo(() => ({
    user,
    loading,
    setUser,

    signIn: async ({ email, password, role }) =>
      persist(await api('/api/auth/signin', { method: 'POST', auth: false, body: { email, password, role } })),

    signUp: async (payload) =>
      persist(await api('/api/auth/signup', { method: 'POST', auth: false, body: payload })),

    googleAuth: async ({ idToken, role }) =>
      persist(await api('/api/auth/google', { method: 'POST', auth: false, body: { idToken, role } })),

    signOut: async () => {
      try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
      await tokenStore.clear();
      setUser(null);
    },

    refresh: async () => {
      try { const { user: me } = await api('/api/auth/me'); setUser(me); return me; } catch { return null; }
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
