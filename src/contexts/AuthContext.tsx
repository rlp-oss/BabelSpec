import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  auth,
  signInWithGoogleAccount,
  signOutAccount,
} from '../lib/firebase';
import { ensureUserAccountInitialized } from '../lib/firestoreThreads';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  authBusy: boolean;
  authError: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthError(null);
      if (nextUser && nextUser.emailVerified) {
        try {
          await ensureUserAccountInitialized(nextUser);
        } catch (err) {
          setAuthError(
            err instanceof Error
              ? err.message
              : 'Failed to initialize private account storage.'
          );
        }
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signInWithGoogleAccount();
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in was cancelled before completion.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError(
          'Sign-in popup was blocked by your browser. Please allow popups for this site and try again.'
        );
      } else {
        setAuthError(
          err instanceof Error ? err.message : 'Unable to sign in right now.'
        );
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signOutAccount();
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Failed to sign out cleanly.'
      );
    } finally {
      setAuthBusy(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, authReady, authBusy, authError, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
