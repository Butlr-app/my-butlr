import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { getGuestPortal } from '@/lib/guestApi';
import { normalizeLanguage } from '@/lib/i18n';
import { extractInvitationToken } from '@/lib/invitation';
import {
  getSecureItem,
  removeSecureItem,
  setSecureItem,
} from '@/lib/secureStorage';
import type { GuestLanguage, GuestPortalPayload } from '@/types/guest';

const STORAGE_KEY = 'my-butlr-guest-stay-token';

interface GuestSessionValue {
  token: string | null;
  portal: GuestPortalPayload | null;
  language: GuestLanguage;
  loading: boolean;
  activating: boolean;
  bootstrapError: boolean;
  activate: (invitation: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshPortal: () => Promise<void>;
}

const GuestSessionContext = createContext<GuestSessionValue | null>(null);

export function GuestSessionProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [portal, setPortal] = useState<GuestPortalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [bootstrapError, setBootstrapError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      try {
        const savedToken = await getSecureItem(STORAGE_KEY);
        if (!savedToken) return;
        const payload = await getGuestPortal(savedToken);
        if (cancelled) return;
        setToken(savedToken);
        setPortal(payload);
      } catch {
        await removeSecureItem(STORAGE_KEY);
        if (!cancelled) setBootstrapError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const activate = useCallback(async (invitation: string) => {
    const parsedToken = extractInvitationToken(invitation);
    if (!parsedToken) throw new Error('invalid_invitation');
    setActivating(true);
    try {
      const payload = await getGuestPortal(parsedToken);
      await setSecureItem(STORAGE_KEY, parsedToken);
      setToken(parsedToken);
      setPortal(payload);
      setBootstrapError(false);
    } finally {
      setActivating(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await removeSecureItem(STORAGE_KEY);
    setToken(null);
    setPortal(null);
  }, []);

  const refreshPortal = useCallback(async () => {
    if (!token) return;
    const payload = await getGuestPortal(token);
    setPortal(payload);
  }, [token]);

  const language = normalizeLanguage(portal?.reservation.guest_language);
  const value = useMemo(
    () => ({
      token,
      portal,
      language,
      loading,
      activating,
      bootstrapError,
      activate,
      signOut,
      refreshPortal,
    }),
    [
      token,
      portal,
      language,
      loading,
      activating,
      bootstrapError,
      activate,
      signOut,
      refreshPortal,
    ],
  );

  return <GuestSessionContext.Provider value={value}>{children}</GuestSessionContext.Provider>;
}

export function useGuestSession(): GuestSessionValue {
  const value = useContext(GuestSessionContext);
  if (!value) throw new Error('useGuestSession must be used inside GuestSessionProvider');
  return value;
}
