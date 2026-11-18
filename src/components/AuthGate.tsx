import React from 'react';
import { Loader2, Lock, Moon, ShieldCheck, Sun } from 'lucide-react';

interface AuthGateProps {
  authReady: boolean;
  authBusy: boolean;
  authError: string | null;
  needsVerification?: boolean;
  userEmail?: string | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  authReady,
  authBusy,
  authError,
  needsVerification = false,
  userEmail,
  isDark,
  onToggleTheme,
  onSignIn,
  onSignOut,
}) => {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex h-14 items-center justify-between gap-8 border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
        <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 dark:text-white">
          BabelSpec
        </span>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          {isDark ? (
            <Sun className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          {!authReady ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Loader2
                className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                Verifying session credentials...
              </p>
            </div>
          ) : needsVerification ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                  Email Verification Required
                </h1>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Signed in as {userEmail || 'your account'}, but your email address is not marked verified. Confidential threads require a verified account before accessing Firestore or compilation endpoints.
              </p>
              <button
                type="button"
                onClick={onSignOut}
                disabled={authBusy}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-900 hover:bg-slate-100 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                Sign out and choose a verified account
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Sign in to BabelSpec
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  Translate multilingual ideas into precision coding-agent specifications. Your prompt threads, context graphs, and project constraints are stored strictly inside your own private account.
                </p>
              </div>

              <div className="space-y-3 border-t border-b border-slate-200 py-4 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
                <div className="flex items-start gap-2.5">
                  <Lock
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400"
                    aria-hidden="true"
                  />
                  <span>
                    Per-account database isolation enforced by verified Firestore security rules.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400"
                    aria-hidden="true"
                  />
                  <span>
                    Authenticated API requests verified server-side with zero local browser chat leakage.
                  </span>
                </div>
              </div>

              {authError && (
                <div
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
                >
                  {authError}
                </div>
              )}

              <button
                type="button"
                onClick={onSignIn}
                disabled={authBusy}
                className="flex w-full items-center justify-center gap-2.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60 cursor-pointer dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {authBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Connecting account...
                  </>
                ) : (
                  'Continue with Google'
                )}
              </button>

              <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                New users are provisioned automatically on first sign-in.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
