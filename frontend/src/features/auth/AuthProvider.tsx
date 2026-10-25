import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, token, type User } from "../../shared/lib/api";

interface Session {
  user: User | null;
  ready: boolean;
  signIn: (user: User, accessToken: string) => void;
  signOut: () => void;
}

const SessionContext = createContext<Session | null>(null);

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside <AuthProvider>");
  return session;
}

/** Owns the signed-in user. Restores the session from the stored token and clears all cached data on sign-out. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(() => token.get() === null);

  const signOut = useCallback(() => { token.set(null); setUser(null); qc.clear(); }, [qc]);
  const signIn = useCallback((u: User, accessToken: string) => { token.set(accessToken); setUser(u); }, []);

  useEffect(() => {
    window.addEventListener("lotwise:logout", signOut); // fired by the API client on an expired token
    if (token.get()) api<{ user: User }>("/auth/me").then((r) => setUser(r.user)).catch(signOut).finally(() => setReady(true));
    return () => window.removeEventListener("lotwise:logout", signOut);
  }, [signOut]);

  return <SessionContext.Provider value={{ user, ready, signIn, signOut }}>{children}</SessionContext.Provider>;
}
