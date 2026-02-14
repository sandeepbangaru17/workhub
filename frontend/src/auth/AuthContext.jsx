/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const me = await api.me();
        if (!active) return;
        setUser({ name: me.name, role: me.role, email: me.email });
      } catch {
        if (!active) return;
        setUser(null);
      } finally {
        if (active) setBooting(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      booting,
      isAuthed: !!user,
      login: (nextUser) => setUser(nextUser),
      syncMe: async () => {
        const me = await api.me();
        setUser({ name: me.name, role: me.role, email: me.email });
      },
      logout: () => {
        setUser(null);
      },
    }),
    [booting, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
