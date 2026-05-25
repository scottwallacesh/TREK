import { AlertTriangle, Loader2, Lock, LogIn, ShieldCheck } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { oauthApi } from '../api/client';
import { SCOPE_GROUPS } from '../api/oauthScopes';
import { useTranslation } from '../i18n';
import { useAuthStore } from '../store/authStore';

interface ValidateResult {
  valid: boolean;
  error?: string;
  error_description?: string;
  client?: { name: string; allowed_scopes: string[] };
  scopes?: string[];
  consentRequired?: boolean;
  loginRequired?: boolean;
  scopeSelectable?: boolean;
}

type PageState = 'loading' | 'login_required' | 'consent' | 'auto_approving' | 'error' | 'done';

export default function OAuthAuthorizePage(): React.ReactElement {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [validation, setValidation] = useState<ValidateResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);

  const params = new URLSearchParams(window.location.search);
  const clientId = params.get('client_id') || '';
  const redirectUri = params.get('redirect_uri') || '';
  const scope = params.get('scope') || '';
  const state = params.get('state') || '';
  const codeChallenge = params.get('code_challenge') || '';
  const ccMethod = params.get('code_challenge_method') || '';
  const resource = params.get('resource') || undefined;

  // Load auth state once, then validate
  useEffect(() => {
    loadUser({ silent: true }).catch(() => {});
  }, [loadUser]);

  useEffect(() => {
    if (authLoading) return;
    validateRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  async function validateRequest() {
    setPageState('loading');
    try {
      const result = await oauthApi.validate({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: ccMethod,
        response_type: 'code',
        resource,
      });
      setValidation(result);

      if (!result.valid) {
        setPageState('error');
        setErrorMsg(result.error_description || result.error || 'Invalid authorization request');
        return;
      }

      if (result.loginRequired) {
        setPageState('login_required');
        return;
      }

      if (!result.consentRequired) {
        // Consent already on record — auto-approve silently with the full validated scope
        setPageState('auto_approving');
        await submitConsent(true, result.scopes ?? []);
        return;
      }

      // Pre-select all scopes the client is requesting — user can deselect
      setSelectedScopes(result.scopes ?? []);
      setPageState('consent');
    } catch (err: unknown) {
      setPageState('error');
      setErrorMsg('Failed to validate authorization request. Please try again.');
    }
  }

  async function submitConsent(approved: boolean, scopes: string[] = selectedScopes) {
    setSubmitting(true);
    try {
      const result = await oauthApi.authorize({
        client_id: clientId,
        redirect_uri: redirectUri,
        // When approving, send only the scopes the user selected; deny uses original scope
        scope: approved ? scopes.join(' ') : scope,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: ccMethod,
        approved,
        resource,
      });
      setPageState('done');
      window.location.href = result.redirect;
    } catch {
      setPageState('error');
      setErrorMsg('Authorization failed. Please try again.');
      setSubmitting(false);
    }
  }

  function toggleScope(s: string) {
    setSelectedScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function toggleGroup(groupScopes: string[], allSelected: boolean) {
    setSelectedScopes((prev) =>
      allSelected ? prev.filter((s) => !groupScopes.includes(s)) : [...new Set([...prev, ...groupScopes])]
    );
  }

  function handleLoginRedirect() {
    const next = '/oauth/consent?' + params.toString() + window.location.hash;
    window.location.href = '/login?redirect=' + encodeURIComponent(next);
  }

  // Group requested scopes by their translated group name
  const scopesByGroup = React.useMemo(() => {
    const requested = validation?.scopes || [];
    const groups: Record<string, string[]> = {};
    for (const s of requested) {
      const keys = SCOPE_GROUPS[s];
      const group = keys ? t(keys.groupKey) : 'Other';
      if (!groups[group]) groups[group] = [];
      groups[group].push(s);
    }
    return groups;
  }, [validation, t]);

  // ---- Render states ----

  if (pageState === 'loading' || pageState === 'auto_approving') {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--accent-primary, #4f46e5)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {pageState === 'auto_approving' ? 'Authorizing…' : 'Loading…'}
          </p>
        </div>
      </div>
    );
  }

  if (pageState === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div
          className="w-full max-w-sm space-y-4 rounded-xl p-8 text-center shadow-lg"
          style={{ background: 'var(--bg-card)' }}
        >
          <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Authorization Error
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {errorMsg}
          </p>
        </div>
      </div>
    );
  }

  if (pageState === 'login_required') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-full max-w-sm space-y-5 rounded-xl p-8 shadow-lg" style={{ background: 'var(--bg-card)' }}>
          <div className="space-y-2 text-center">
            <Lock className="mx-auto h-10 w-10" style={{ color: 'var(--accent-primary, #4f46e5)' }} />
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Sign in to continue
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              <strong>{validation?.client?.name || clientId}</strong> wants access to your TREK account. Please sign in
              first.
            </p>
          </div>
          <button
            onClick={handleLoginRedirect}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white"
            style={{ background: 'var(--accent-primary, #4f46e5)' }}
          >
            <LogIn className="h-4 w-4" />
            Sign in to TREK
          </button>
        </div>
      </div>
    );
  }

  // pageState === 'consent'
  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl shadow-lg sm:flex-row"
        style={{ background: 'var(--bg-card)' }}
      >
        {/* Left panel — app identity + actions */}
        <div
          className="flex flex-col px-8 py-8 sm:w-64 sm:flex-shrink-0 sm:border-r"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <div className="flex-1 space-y-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <ShieldCheck className="h-6 w-6" style={{ color: 'var(--accent-primary, #4f46e5)' }} />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                Authorization Request
              </p>
              <h1 className="text-lg font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                {validation?.client?.name || clientId}
              </h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                This application is requesting access to your TREK account.
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-2">
            <p className="mb-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Only grant access to applications you trust. Your data stays on your server.
            </p>
            <button
              onClick={() => submitConsent(true)}
              disabled={submitting || (validation?.scopeSelectable === true && selectedScopes.length === 0)}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-60"
              style={{ background: 'var(--accent-primary, #4f46e5)' }}
            >
              {submitting
                ? 'Authorizing…'
                : validation?.scopeSelectable && selectedScopes.length === 0
                  ? 'Select at least one scope'
                  : validation?.scopeSelectable
                    ? `Approve (${selectedScopes.length} scope${selectedScopes.length !== 1 ? 's' : ''})`
                    : 'Approve Access'}
            </button>
            <button
              onClick={() => submitConsent(false)}
              disabled={submitting}
              className="w-full rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-slate-50 disabled:opacity-60 dark:hover:bg-slate-800"
              style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
            >
              Deny
            </button>
          </div>
        </div>

        {/* Right panel — selectable scopes */}
        <div className="max-h-[80vh] flex-1 overflow-y-auto px-6 py-8 sm:max-h-[600px]">
          <div className="space-y-6">
            {Object.keys(scopesByGroup).length > 0 && (
              <div>
                <p
                  className="mb-4 text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {validation?.scopeSelectable ? 'Choose which permissions to grant' : 'Permissions requested'}
                </p>

                {validation?.scopeSelectable ? (
                  /* DCR client — user selects which scopes to grant */
                  <div className="space-y-3">
                    {Object.entries(scopesByGroup).map(([group, groupScopes]) => {
                      const allGroupSelected = groupScopes.every((s) => selectedScopes.includes(s));
                      const someGroupSelected = groupScopes.some((s) => selectedScopes.includes(s));
                      return (
                        <div
                          key={group}
                          className="overflow-hidden rounded-lg border"
                          style={{ borderColor: 'var(--border-primary)' }}
                        >
                          <label
                            className="flex cursor-pointer items-center gap-2.5 px-3 py-2"
                            style={{ background: 'var(--bg-secondary)' }}
                          >
                            <input
                              type="checkbox"
                              checked={allGroupSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = someGroupSelected && !allGroupSelected;
                              }}
                              onChange={() => toggleGroup(groupScopes, allGroupSelected)}
                              className="flex-shrink-0 rounded"
                            />
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                              {group}
                            </span>
                            <span className="ml-auto text-xs" style={{ color: 'var(--text-tertiary)' }}>
                              {groupScopes.filter((s) => selectedScopes.includes(s)).length}/{groupScopes.length}
                            </span>
                          </label>
                          <div className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
                            {groupScopes.map((s) => {
                              const keys = SCOPE_GROUPS[s];
                              return (
                                <label
                                  key={s}
                                  className="flex cursor-pointer items-start gap-2.5 px-3 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedScopes.includes(s)}
                                    onChange={() => toggleScope(s)}
                                    className="mt-0.5 flex-shrink-0 rounded"
                                  />
                                  <span className="mt-0.5 flex-shrink-0 text-base leading-none">
                                    {s.endsWith(':delete') ? '🗑️' : s.endsWith(':write') ? '✏️' : '👁️'}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                      {keys ? t(keys.labelKey) : s}
                                    </p>
                                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                      {keys ? t(keys.descriptionKey) : ''}
                                    </p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Settings-created client — scopes are fixed, show read-only */
                  <div className="space-y-5">
                    {Object.entries(scopesByGroup).map(([group, groupScopes]) => (
                      <div key={group}>
                        <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          {group}
                        </p>
                        <div className="space-y-1.5">
                          {groupScopes.map((s) => {
                            const keys = SCOPE_GROUPS[s];
                            return (
                              <div
                                key={s}
                                className="flex items-start gap-2.5 rounded-lg px-3 py-2"
                                style={{ background: 'var(--bg-secondary)' }}
                              >
                                <span className="mt-0.5 flex-shrink-0 text-base leading-none">
                                  {s.endsWith(':delete') ? '🗑️' : s.endsWith(':write') ? '✏️' : '👁️'}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {keys ? t(keys.labelKey) : s}
                                  </p>
                                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                    {keys ? t(keys.descriptionKey) : ''}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Always-available tools — granted regardless of scopes */}
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                Always included
              </p>
              <div className="space-y-1.5">
                {[
                  { name: 'list_trips', desc: 'List your trips so the AI can discover trip IDs' },
                  { name: 'get_trip_summary', desc: 'Read a trip overview needed to use any other tool' },
                ].map(({ name, desc }) => (
                  <div
                    key={name}
                    className="flex items-start gap-2.5 rounded-lg px-3 py-2"
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    <span className="mt-0.5 flex-shrink-0 text-base leading-none">👁️</span>
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {name}
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
