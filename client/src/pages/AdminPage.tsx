import {
  AlertTriangle,
  ArrowUpCircle,
  Bell,
  Briefcase,
  Bug,
  CheckCircle,
  Copy,
  Database,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  GitBranch,
  KeyRound,
  Link2,
  Loader2,
  Map,
  Plus,
  Puzzle,
  RefreshCw,
  Save,
  ScrollText,
  Settings as SettingsIcon,
  Shield,
  SlidersHorizontal,
  Sun,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { adminApi, authApi, notificationsApi } from '../api/client';
import AddonManager from '../components/Admin/AddonManager';
import AdminMcpTokensPanel from '../components/Admin/AdminMcpTokensPanel';
import AuditLogPanel from '../components/Admin/AuditLogPanel';
import BackupPanel from '../components/Admin/BackupPanel';
import CategoryManager from '../components/Admin/CategoryManager';
import DefaultUserSettingsTab from '../components/Admin/DefaultUserSettingsTab';
import DevNotificationsPanel from '../components/Admin/DevNotificationsPanel';
import GitHubPanel from '../components/Admin/GitHubPanel';
import PackingTemplateManager from '../components/Admin/PackingTemplateManager';
import PermissionsPanel from '../components/Admin/PermissionsPanel';
import Navbar from '../components/Layout/Navbar';
import PageSidebar, { type PageSidebarTab } from '../components/Layout/PageSidebar';
import CustomSelect from '../components/shared/CustomSelect';
import Modal from '../components/shared/Modal';
import { useToast } from '../components/shared/Toast';
import { useCountUp } from '../hooks/useCountUp';
import { useTranslation } from '../i18n';
import { useAddonStore } from '../store/addonStore';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { getApiErrorMessage } from '../types';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
  last_login?: string | null;
  online?: boolean;
  oidc_issuer?: string | null;
  avatar_url?: string | null;
}

interface AdminStats {
  totalUsers: number;
  totalTrips: number;
  totalPlaces: number;
  totalFiles: number;
}

interface OidcConfig {
  issuer: string;
  client_id: string;
  client_secret: string;
  client_secret_set: boolean;
  display_name: string;
  discovery_url: string;
}

interface UpdateInfo {
  update_available: boolean;
  latest: string;
  current: string;
  release_url?: string;
  is_docker?: boolean;
  is_prerelease?: boolean;
}

const ADMIN_EVENT_LABEL_KEYS: Record<string, string> = {
  version_available: 'settings.notifyVersionAvailable',
};

const ADMIN_CHANNEL_LABEL_KEYS: Record<string, string> = {
  inapp: 'settings.notificationPreferences.inapp',
  email: 'settings.notificationPreferences.email',
  webhook: 'settings.notificationPreferences.webhook',
  ntfy: 'settings.notificationPreferences.ntfy',
};

function AdminNotificationsPanel({ t, toast }: { t: (k: string) => string; toast: ReturnType<typeof useToast> }) {
  const [matrix, setMatrix] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi
      .getNotificationPreferences()
      .then((data: any) => setMatrix(data))
      .catch(() => {});
  }, []);

  if (!matrix)
    return <p style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic', padding: 16 }}>Loading…</p>;

  const visibleChannels = (['inapp', 'email', 'webhook', 'ntfy'] as const).filter((ch) => {
    if (!matrix.available_channels[ch]) return false;
    return matrix.event_types.some((evt: string) => matrix.implemented_combos[evt]?.includes(ch));
  });

  const toggle = async (eventType: string, channel: string) => {
    const current = matrix.preferences[eventType]?.[channel] ?? true;
    const updated = { ...matrix.preferences, [eventType]: { ...matrix.preferences[eventType], [channel]: !current } };
    setMatrix((m: any) => (m ? { ...m, preferences: updated } : m));
    setSaving(true);
    try {
      await adminApi.updateNotificationPreferences(updated);
    } catch {
      setMatrix((m: any) => (m ? { ...m, preferences: matrix.preferences } : m));
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  if (matrix.event_types.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>{t('settings.notificationPreferences.noChannels')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">{t('admin.tabs.notifications')}</h2>
          <p className="mt-1 text-xs text-slate-400">{t('admin.notifications.adminNotificationsHint')}</p>
        </div>
        <div className="p-6">
          {saving && <p style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 8 }}>Saving…</p>}
          {/* Header row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `1fr ${visibleChannels.map(() => '80px').join(' ')}`,
              gap: 4,
              paddingBottom: 6,
              marginBottom: 4,
              borderBottom: '1px solid var(--border-primary)',
            }}
          >
            <span />
            {visibleChannels.map((ch) => (
              <span
                key={ch}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-faint)',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {t(ADMIN_CHANNEL_LABEL_KEYS[ch]) || ch}
              </span>
            ))}
          </div>
          {/* Event rows */}
          {matrix.event_types.map((eventType: string) => {
            const implementedForEvent = matrix.implemented_combos[eventType] ?? [];
            return (
              <div
                key={eventType}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `1fr ${visibleChannels.map(() => '80px').join(' ')}`,
                  gap: 4,
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border-primary)',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                  {t(ADMIN_EVENT_LABEL_KEYS[eventType]) || eventType}
                </span>
                {visibleChannels.map((ch) => {
                  if (!implementedForEvent.includes(ch)) {
                    return (
                      <span key={ch} style={{ textAlign: 'center', color: 'var(--text-faint)', fontSize: 14 }}>
                        —
                      </span>
                    );
                  }
                  const isOn = matrix.preferences[eventType]?.[ch] ?? true;
                  return (
                    <div key={ch} style={{ display: 'flex', justifyContent: 'center' }}>
                      <button
                        onClick={() => toggle(eventType, ch)}
                        className="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors"
                        style={{ background: isOn ? 'var(--text-primary)' : 'var(--border-primary)' }}
                      >
                        <span
                          className="absolute left-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200"
                          style={{ transform: isOn ? 'translateX(16px)' : 'translateX(0)' }}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AdminStatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}): React.ReactElement {
  const animated = useCountUp(value, 900);
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}
    >
      <div className="flex items-center gap-4">
        <Icon className="h-5 w-5" style={{ color: 'var(--text-primary)' }} />
        <div>
          <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {animated}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage(): React.ReactElement {
  const { demoMode, serverTimezone } = useAuthStore();
  const { t, locale } = useTranslation();
  const hour12 = useSettingsStore((s) => s.settings.time_format) === '12h';
  const mcpEnabled = useAddonStore((s) => s.isEnabled('mcp'));
  const devMode = useAuthStore((s) => s.devMode);
  const TABS: PageSidebarTab[] = [
    { id: 'users', label: t('admin.tabs.users'), icon: Users },
    { id: 'config', label: t('admin.tabs.config'), icon: SlidersHorizontal },
    { id: 'defaults', label: t('admin.tabs.defaults'), icon: UserCog },
    { id: 'addons', label: t('admin.tabs.addons'), icon: Puzzle },
    { id: 'settings', label: t('admin.tabs.settings'), icon: SettingsIcon },
    { id: 'notifications', label: t('admin.tabs.notifications'), icon: Bell },
    { id: 'backup', label: t('admin.tabs.backup'), icon: Database },
    { id: 'audit', label: t('admin.tabs.audit'), icon: ScrollText },
    ...(mcpEnabled ? [{ id: 'mcp-tokens', label: t('admin.tabs.mcpTokens'), icon: KeyRound }] : []),
    { id: 'github', label: t('admin.tabs.github'), icon: GitBranch },
    ...(devMode ? [{ id: 'dev-notifications', label: 'Dev: Notifications', icon: Bug }] : []),
  ];

  const [activeTab, setActiveTab] = useState<string>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState<{ username: string; email: string; role: string; password: string }>({
    username: '',
    email: '',
    role: 'user',
    password: '',
  });
  const [showCreateUser, setShowCreateUser] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<{ username: string; email: string; password: string; role: string }>({
    username: '',
    email: '',
    password: '',
    role: 'user',
  });

  // Bag tracking
  const [bagTrackingEnabled, setBagTrackingEnabled] = useState<boolean>(false);
  useEffect(() => {
    adminApi
      .getBagTracking()
      .then((d) => setBagTrackingEnabled(d.enabled))
      .catch(() => {});
  }, []);

  // Places photos
  const [placesPhotosEnabled, setPlacesPhotosEnabledState] = useState<boolean>(true);
  useEffect(() => {
    adminApi
      .getPlacesPhotos()
      .then((d) => setPlacesPhotosEnabledState(d.enabled))
      .catch(() => {});
  }, []);

  // Places autocomplete
  const [placesAutocompleteEnabled, setPlacesAutocompleteEnabledState] = useState<boolean>(true);
  useEffect(() => {
    adminApi
      .getPlacesAutocomplete()
      .then((d) => setPlacesAutocompleteEnabledState(d.enabled))
      .catch(() => {});
  }, []);

  // Places details
  const [placesDetailsEnabled, setPlacesDetailsEnabledState] = useState<boolean>(true);
  useEffect(() => {
    adminApi
      .getPlacesDetails()
      .then((d) => setPlacesDetailsEnabledState(d.enabled))
      .catch(() => {});
  }, []);

  // Collab features
  const [collabFeatures, setCollabFeatures] = useState<{
    chat: boolean;
    notes: boolean;
    polls: boolean;
    whatsnext: boolean;
  }>({ chat: true, notes: true, polls: true, whatsnext: true });
  useEffect(() => {
    adminApi
      .getCollabFeatures()
      .then((d) => setCollabFeatures(d))
      .catch(() => {});
  }, []);

  // OIDC config
  const [oidcConfig, setOidcConfig] = useState<OidcConfig>({
    issuer: '',
    client_id: '',
    client_secret: '',
    client_secret_set: false,
    display_name: '',
    discovery_url: '',
  });
  const [savingOidc, setSavingOidc] = useState<boolean>(false);

  // Auth toggles
  const [passwordLogin, setPasswordLogin] = useState<boolean>(true);
  const [passwordRegistration, setPasswordRegistration] = useState<boolean>(true);
  const [oidcLogin, setOidcLogin] = useState<boolean>(true);
  const [oidcRegistration, setOidcRegistration] = useState<boolean>(true);
  const [envOverrideOidcOnly, setEnvOverrideOidcOnly] = useState<boolean>(false);
  const [oidcConfigured, setOidcConfigured] = useState<boolean>(false);
  const [requireMfa, setRequireMfa] = useState<boolean>(false);

  // Invite links
  const [invites, setInvites] = useState<any[]>([]);
  const [showCreateInvite, setShowCreateInvite] = useState<boolean>(false);
  const [inviteForm, setInviteForm] = useState<{ max_uses: number; expires_in_days: number | '' }>({
    max_uses: 1,
    expires_in_days: 7,
  });

  // File types
  const [allowedFileTypes, setAllowedFileTypes] = useState<string>(
    'jpg,jpeg,png,gif,webp,heic,pdf,doc,docx,xls,xlsx,txt,csv'
  );
  const [savingFileTypes, setSavingFileTypes] = useState<boolean>(false);

  // SMTP settings
  const [smtpValues, setSmtpValues] = useState<Record<string, string>>({});
  const [smtpLoaded, setSmtpLoaded] = useState(false);
  useEffect(() => {
    apiClient
      .get('/auth/app-settings')
      .then((r) => {
        setSmtpValues(r.data || {});
        setSmtpLoaded(true);
      })
      .catch(() => setSmtpLoaded(true));
  }, []);

  // API Keys
  const [mapsKey, setMapsKey] = useState<string>('');
  const [weatherKey, setWeatherKey] = useState<string>('');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [savingKeys, setSavingKeys] = useState<boolean>(false);
  const [validating, setValidating] = useState<Record<string, boolean>>({});
  const [validation, setValidation] = useState<Record<string, boolean | undefined>>({});

  // Version check & update
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);

  const {
    user: currentUser,
    updateApiKeys,
    setAppRequireMfa,
    setTripRemindersEnabled,
    setPlacesPhotosEnabled,
    setPlacesAutocompleteEnabled,
    setPlacesDetailsEnabled,
    logout,
  } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();

  const [showRotateJwtModal, setShowRotateJwtModal] = useState<boolean>(false);
  const [rotatingJwt, setRotatingJwt] = useState<boolean>(false);

  useEffect(() => {
    loadData();
    loadAppConfig();
    loadApiKeys();
    adminApi
      .getOidc()
      .then(setOidcConfig)
      .catch(() => {});
    adminApi
      .checkVersion()
      .then((data) => {
        if (data.update_available) setUpdateInfo(data);
      })
      .catch(() => {});
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersData, statsData, invitesData] = await Promise.all([
        adminApi.users(),
        adminApi.stats(),
        adminApi.listInvites().catch(() => ({ invites: [] })),
      ]);
      setUsers(usersData.users);
      setStats(statsData);
      setInvites(invitesData.invites || []);
    } catch (err: unknown) {
      toast.error(t('admin.toast.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadAppConfig = async () => {
    try {
      const config = await authApi.getAppConfig();
      setPasswordLogin(config.password_login ?? true);
      setPasswordRegistration(config.password_registration ?? config.allow_registration ?? true);
      setOidcLogin(config.oidc_login ?? true);
      setOidcRegistration(config.oidc_registration ?? config.allow_registration ?? true);
      setEnvOverrideOidcOnly(config.env_override_oidc_only ?? false);
      setOidcConfigured(config.oidc_configured ?? false);
      if (config.require_mfa !== undefined) setRequireMfa(!!config.require_mfa);
      if (config.allowed_file_types) setAllowedFileTypes(config.allowed_file_types);
    } catch (err: unknown) {
      // ignore
    }
  };

  const loadApiKeys = async () => {
    try {
      const data = await authApi.getSettings();
      setMapsKey(data.settings?.maps_api_key || '');
      setWeatherKey(data.settings?.openweather_api_key || '');
    } catch (err: unknown) {
      // ignore
    }
  };

  const handleToggleAuthSetting = async (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    try {
      await authApi.updateAppSettings({ [key]: value });
    } catch (err: unknown) {
      setter(!value);
      toast.error(getApiErrorMessage(err, t('common.error')));
    }
  };

  const handleToggleRequireMfa = async (value: boolean) => {
    setRequireMfa(value);
    try {
      await authApi.updateAppSettings({ require_mfa: value });
      setAppRequireMfa(value);
      toast.success(t('common.saved'));
    } catch (err: unknown) {
      setRequireMfa(!value);
      toast.error(getApiErrorMessage(err, t('common.error')));
    }
  };

  const toggleKey = (key) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveApiKeys = async () => {
    setSavingKeys(true);
    try {
      await updateApiKeys({
        maps_api_key: mapsKey,
        openweather_api_key: weatherKey,
      });
      toast.success(t('admin.keySaved'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSavingKeys(false);
    }
  };

  const handleValidateKeys = async () => {
    setValidating({ maps: true, weather: true });
    try {
      // Save first so validation uses the current values
      await updateApiKeys({ maps_api_key: mapsKey, openweather_api_key: weatherKey });
      const result = await authApi.validateKeys();
      setValidation(result);
    } catch (err: unknown) {
      toast.error(t('common.error'));
    } finally {
      setValidating({});
    }
  };

  const handleValidateKey = async (keyType) => {
    setValidating((prev) => ({ ...prev, [keyType]: true }));
    try {
      // Save first so validation uses the current values
      await updateApiKeys({ maps_api_key: mapsKey, openweather_api_key: weatherKey });
      const result = await authApi.validateKeys();
      setValidation((prev) => ({ ...prev, [keyType]: result[keyType] }));
    } catch (err: unknown) {
      toast.error(t('common.error'));
    } finally {
      setValidating((prev) => ({ ...prev, [keyType]: false }));
    }
  };

  const handleCreateUser = async () => {
    if (!createForm.username.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      toast.error(t('admin.toast.fieldsRequired'));
      return;
    }
    if (createForm.password.trim().length < 8) {
      toast.error(t('settings.passwordTooShort'));
      return;
    }
    try {
      const data = await adminApi.createUser(createForm);
      setUsers((prev) => [data.user, ...prev]);
      setShowCreateUser(false);
      setCreateForm({ username: '', email: '', password: '', role: 'user' });
      toast.success(t('admin.toast.userCreated'));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('admin.toast.createError')));
    }
  };

  const handleCreateInvite = async () => {
    try {
      const data = await adminApi.createInvite({
        max_uses: inviteForm.max_uses,
        expires_in_days: inviteForm.expires_in_days || undefined,
      });
      setInvites((prev) => [data.invite, ...prev]);
      setShowCreateInvite(false);
      setInviteForm({ max_uses: 1, expires_in_days: 7 });
      // Copy link to clipboard
      const link = `${window.location.origin}/register?invite=${data.invite.token}`;
      navigator.clipboard.writeText(link).then(() => toast.success(t('admin.invite.copied')));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('admin.invite.createError')));
    }
  };

  const handleDeleteInvite = async (id: number) => {
    try {
      await adminApi.deleteInvite(id);
      setInvites((prev) => prev.filter((i) => i.id !== id));
      toast.success(t('admin.invite.deleted'));
    } catch {
      toast.error(t('admin.invite.deleteError'));
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/register?invite=${token}`;
    navigator.clipboard.writeText(link).then(() => toast.success(t('admin.invite.copied')));
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditForm({ username: user.username, email: user.email, role: user.role, password: '' });
  };

  const handleSaveUser = async () => {
    try {
      const payload: { username?: string; email?: string; role: string; password?: string } = {
        username: editForm.username.trim() || undefined,
        email: editForm.email.trim() || undefined,
        role: editForm.role,
      };
      if (editForm.password.trim()) {
        if (editForm.password.trim().length < 8) {
          toast.error(t('settings.passwordTooShort'));
          return;
        }
        payload.password = editForm.password.trim();
      }
      const data = await adminApi.updateUser(editingUser.id, payload);
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? data.user : u)));
      setEditingUser(null);
      toast.success(t('admin.toast.userUpdated'));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('admin.toast.updateError')));
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.id === currentUser?.id) {
      toast.error(t('admin.toast.cannotDeleteSelf'));
      return;
    }
    if (!confirm(t('admin.deleteUser', { name: user.username }))) return;
    try {
      await adminApi.deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast.success(t('admin.toast.userDeleted'));
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, t('admin.toast.deleteError')));
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      <Navbar />

      <div style={{ paddingTop: 'var(--nav-h)' }}>
        <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <Shield className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t('admin.title')}</h1>
              <p className="text-sm text-slate-500">{t('admin.subtitle')}</p>
            </div>
          </div>

          {/* Update Banner */}
          {updateInfo && (
            <div className="mb-6 flex flex-col items-start gap-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500 dark:bg-amber-600">
                  <ArrowUpCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    {t('admin.update.available')}
                  </p>
                  <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                    {t('admin.update.text')
                      .replace('{version}', `v${updateInfo.latest}`)
                      .replace('{current}', `v${updateInfo.current}`)}
                  </p>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                {updateInfo.release_url && (
                  <a
                    href={updateInfo.release_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-2 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t('admin.update.button')}
                  </a>
                )}
                <button
                  onClick={() => setShowUpdateModal(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-gray-200"
                >
                  <Download className="h-4 w-4" />
                  {t('admin.update.howTo')}
                </button>
              </div>
            </div>
          )}

          {/* Demo Baseline Button */}
          {demoMode && (
            <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div>
                <p className="text-sm font-semibold text-amber-900">Demo Baseline</p>
                <p className="text-xs text-amber-700">
                  Save current state as the hourly reset point. All admin trips and settings will be preserved.
                </p>
              </div>
              <button
                onClick={async () => {
                  try {
                    await adminApi.saveDemoBaseline();
                    toast.success('Baseline saved! Resets will restore to this state.');
                  } catch (e) {
                    toast.error(e.response?.data?.error || 'Failed to save baseline');
                  }
                }}
                className="ml-4 flex-shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
              >
                Save Baseline
              </button>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: t('admin.stats.users'), value: stats.totalUsers, icon: Users },
                { label: t('admin.stats.trips'), value: stats.totalTrips, icon: Briefcase },
                { label: t('admin.stats.places'), value: stats.totalPlaces, icon: Map },
                { label: t('admin.stats.files'), value: stats.totalFiles || 0, icon: FileText },
              ].map(({ label, value, icon: Icon }) => (
                <AdminStatCard key={label} label={label} value={value} icon={Icon} />
              ))}
            </div>
          )}

          {/* Sidebar layout — nav on the left, active panel on the right */}
          <PageSidebar
            sidebarLabel={t('admin.title').toUpperCase()}
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            footer="admin · self-hosted"
          >
            {/* Tab content */}
            {activeTab === 'users' && (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 p-5">
                  <div>
                    <h2 className="font-semibold text-slate-900">{t('admin.tabs.users')}</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      {users.length} {t('admin.stats.users')}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateUser(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-slate-700"
                  >
                    <UserPlus className="h-4 w-4" />
                    {t('admin.createUser')}
                  </button>
                </div>

                {isLoading ? (
                  <div className="p-8 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                          <th className="px-5 py-3">{t('admin.table.user')}</th>
                          <th className="px-5 py-3">{t('admin.table.email')}</th>
                          <th className="px-5 py-3">{t('admin.table.role')}</th>
                          <th className="px-5 py-3">{t('admin.table.created')}</th>
                          <th className="px-5 py-3">{t('admin.table.lastLogin')}</th>
                          <th className="px-5 py-3 text-right">{t('admin.table.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="trek-stagger divide-y divide-slate-100">
                        {users.map((u) => (
                          <tr
                            key={u.id}
                            className={`transition-colors hover:bg-slate-50 ${u.id === currentUser?.id ? 'bg-slate-50/60' : ''}`}
                          >
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  {u.avatar_url ? (
                                    <img
                                      src={u.avatar_url}
                                      alt={u.username}
                                      className="h-8 w-8 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-700">
                                      {u.username.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <span
                                    className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2"
                                    style={{
                                      borderColor: 'var(--bg-card)',
                                      background: u.online ? '#22c55e' : '#94a3b8',
                                    }}
                                  />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-900">{u.username}</p>
                                  {u.id === currentUser?.id && (
                                    <span className="text-xs text-slate-500">{t('admin.you')}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-sm text-slate-600">{u.email}</td>
                            <td className="px-5 py-3">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  u.role === 'admin' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {u.role === 'admin' && <Shield className="h-3 w-3" />}
                                {u.role === 'admin' ? t('settings.roleAdmin') : t('settings.roleUser')}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-sm text-slate-500">
                              {new Date(u.created_at).toLocaleDateString(locale, { timeZone: serverTimezone })}
                            </td>
                            <td className="px-5 py-3 text-sm text-slate-500">
                              {u.last_login
                                ? new Date(u.last_login).toLocaleDateString(locale, {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12,
                                    timeZone: serverTimezone,
                                  })
                                : '—'}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleEditUser(u)}
                                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
                                  title={t('admin.editUser')}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  disabled={u.id === currentUser?.id}
                                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                                  title={t('admin.deleteUserTitle')}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Invite Links (inside users tab) */}
            {activeTab === 'users' && (
              <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 p-5">
                  <div>
                    <h2 className="font-semibold text-slate-900">{t('admin.invite.title')}</h2>
                    <p className="mt-1 text-xs text-slate-400">{t('admin.invite.subtitle')}</p>
                  </div>
                  <button
                    onClick={() => setShowCreateInvite(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-slate-700"
                  >
                    <Plus className="h-4 w-4" />
                    {t('admin.invite.create')}
                  </button>
                </div>

                {invites.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400">{t('admin.invite.empty')}</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {invites.map((inv) => {
                      const isExpired = inv.expires_at && new Date(inv.expires_at) < new Date();
                      const isUsedUp = inv.max_uses > 0 && inv.used_count >= inv.max_uses;
                      const isActive = !isExpired && !isUsedUp;
                      return (
                        <div key={inv.id} className="flex items-center gap-4 px-5 py-3">
                          <Link2
                            className="h-4 w-4 flex-shrink-0"
                            style={{ color: isActive ? 'var(--text-primary)' : '#d1d5db' }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <code className="truncate font-mono text-xs text-slate-600">
                                {inv.token.slice(0, 12)}...
                              </code>
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                                  isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                {isUsedUp
                                  ? t('admin.invite.usedUp')
                                  : isExpired
                                    ? t('admin.invite.expired')
                                    : t('admin.invite.active')}
                              </span>
                            </div>
                            <div className="mt-0.5 text-xs text-slate-400">
                              {inv.used_count}/{inv.max_uses === 0 ? '∞' : inv.max_uses} {t('admin.invite.uses')}
                              {inv.expires_at &&
                                ` · ${t('admin.invite.expiresAt')} ${new Date(inv.expires_at).toLocaleDateString(locale, { timeZone: serverTimezone })}`}
                              {` · ${t('admin.invite.createdBy')} ${inv.created_by_name}`}
                            </div>
                          </div>
                          {isActive && (
                            <button
                              onClick={() => copyInviteLink(inv.token)}
                              title={t('admin.invite.copyLink')}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteInvite(inv.id)}
                            title={t('common.delete')}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div className="mt-6">
                <PermissionsPanel />
              </div>
            )}

            {/* Create Invite Modal */}
            <Modal
              isOpen={showCreateInvite}
              onClose={() => setShowCreateInvite(false)}
              title={t('admin.invite.create')}
              size="sm"
            >
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t('admin.invite.maxUses')}
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5, 0].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setInviteForm((f) => ({ ...f, max_uses: n }))}
                        className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
                          inviteForm.max_uses === n
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {n === 0 ? '∞' : `${n}×`}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {t('admin.invite.expiry')}
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 1, label: '1d' },
                      { value: 3, label: '3d' },
                      { value: 7, label: '7d' },
                      { value: 14, label: '14d' },
                      { value: '', label: '∞' },
                    ].map((opt) => (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => setInviteForm((f) => ({ ...f, expires_in_days: opt.value as number | '' }))}
                        className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
                          inviteForm.expires_in_days === opt.value
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
                  <button
                    onClick={() => setShowCreateInvite(false)}
                    className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleCreateInvite}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
                  >
                    {t('admin.invite.createAndCopy')}
                  </button>
                </div>
              </div>
            </Modal>

            {activeTab === 'config' && (
              <div className="space-y-6">
                <PackingTemplateManager />
                <CategoryManager />
              </div>
            )}

            {activeTab === 'addons' && (
              <div className="space-y-6">
                <AddonManager
                  bagTrackingEnabled={bagTrackingEnabled}
                  onToggleBagTracking={async () => {
                    const next = !bagTrackingEnabled;
                    setBagTrackingEnabled(next);
                    try {
                      await adminApi.updateBagTracking(next);
                    } catch {
                      setBagTrackingEnabled(!next);
                    }
                  }}
                  collabFeatures={collabFeatures}
                  onToggleCollabFeature={async (key: string) => {
                    const next = { ...collabFeatures, [key]: !collabFeatures[key] };
                    setCollabFeatures(next);
                    try {
                      await adminApi.updateCollabFeatures({ [key]: next[key] });
                    } catch {
                      setCollabFeatures(collabFeatures);
                    }
                  }}
                />
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Authentication Methods */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-6 py-4">
                    <h2 className="font-semibold text-slate-900">{t('admin.authMethods')}</h2>
                  </div>
                  <div className="space-y-5 p-6">
                    {envOverrideOidcOnly && (
                      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-600">
                        {t('admin.envOverrideHint')}
                      </p>
                    )}
                    {/* Password Login */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{t('admin.passwordLogin')}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{t('admin.passwordLoginHint')}</p>
                      </div>
                      <button
                        disabled={envOverrideOidcOnly || (!passwordLogin && !oidcLogin)}
                        onClick={() => handleToggleAuthSetting('password_login', !passwordLogin, setPasswordLogin)}
                        title={!passwordLogin && !oidcLogin ? t('admin.lockoutWarning') : undefined}
                        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50"
                        style={{ background: passwordLogin ? 'var(--text-primary)' : 'var(--border-primary)' }}
                      >
                        <span
                          className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
                          style={{ transform: passwordLogin ? 'translateX(20px)' : 'translateX(0)' }}
                        />
                      </button>
                    </div>
                    {/* Password Registration */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{t('admin.passwordRegistration')}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{t('admin.passwordRegistrationHint')}</p>
                      </div>
                      <button
                        disabled={envOverrideOidcOnly}
                        onClick={() =>
                          handleToggleAuthSetting(
                            'password_registration',
                            !passwordRegistration,
                            setPasswordRegistration
                          )
                        }
                        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50"
                        style={{ background: passwordRegistration ? 'var(--text-primary)' : 'var(--border-primary)' }}
                      >
                        <span
                          className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
                          style={{ transform: passwordRegistration ? 'translateX(20px)' : 'translateX(0)' }}
                        />
                      </button>
                    </div>
                    {/* SSO Login (only when OIDC configured) */}
                    {oidcConfigured && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-700">{t('admin.oidcLogin')}</p>
                          <p className="mt-0.5 text-xs text-slate-400">{t('admin.oidcLoginHint')}</p>
                        </div>
                        <button
                          disabled={!passwordLogin && oidcLogin}
                          onClick={() => handleToggleAuthSetting('oidc_login', !oidcLogin, setOidcLogin)}
                          title={!passwordLogin && oidcLogin ? t('admin.lockoutWarning') : undefined}
                          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50"
                          style={{ background: oidcLogin ? 'var(--text-primary)' : 'var(--border-primary)' }}
                        >
                          <span
                            className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
                            style={{ transform: oidcLogin ? 'translateX(20px)' : 'translateX(0)' }}
                          />
                        </button>
                      </div>
                    )}
                    {/* SSO Registration (only when OIDC configured) */}
                    {oidcConfigured && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-700">{t('admin.oidcRegistration')}</p>
                          <p className="mt-0.5 text-xs text-slate-400">{t('admin.oidcRegistrationHint')}</p>
                        </div>
                        <button
                          onClick={() =>
                            handleToggleAuthSetting('oidc_registration', !oidcRegistration, setOidcRegistration)
                          }
                          className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
                          style={{ background: oidcRegistration ? 'var(--text-primary)' : 'var(--border-primary)' }}
                        >
                          <span
                            className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
                            style={{ transform: oidcRegistration ? 'translateX(20px)' : 'translateX(0)' }}
                          />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Require 2FA for all users */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-6 py-4">
                    <h2 className="font-semibold text-slate-900">{t('admin.requireMfa')}</h2>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{t('admin.requireMfa')}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{t('admin.requireMfaHint')}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleRequireMfa(!requireMfa)}
                        className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
                        style={{ background: requireMfa ? 'var(--text-primary)' : 'var(--border-primary)' }}
                      >
                        <span
                          className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
                          style={{ transform: requireMfa ? 'translateX(20px)' : 'translateX(0)' }}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Allowed File Types */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-6 py-4">
                    <h2 className="font-semibold text-slate-900">{t('admin.fileTypes')}</h2>
                    <p className="mt-1 text-xs text-slate-400">{t('admin.fileTypesHint')}</p>
                  </div>
                  <div className="p-6">
                    <input
                      type="text"
                      value={allowedFileTypes}
                      onChange={(e) => setAllowedFileTypes(e.target.value)}
                      placeholder="jpg,png,pdf,doc,docx,xls,xlsx,txt,csv"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-slate-400"
                    />
                    <p className="mt-2 text-xs text-slate-400">{t('admin.fileTypesFormat')}</p>
                    <button
                      onClick={async () => {
                        setSavingFileTypes(true);
                        try {
                          await authApi.updateAppSettings({ allowed_file_types: allowedFileTypes });
                          toast.success(t('admin.fileTypesSaved'));
                        } catch {
                          toast.error(t('common.error'));
                        } finally {
                          setSavingFileTypes(false);
                        }
                      }}
                      disabled={savingFileTypes}
                      className="mt-3 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:bg-slate-400"
                    >
                      {savingFileTypes ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {t('common.save')}
                    </button>
                  </div>
                </div>

                {/* API Keys */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-6 py-4">
                    <h2 className="font-semibold text-slate-900">{t('admin.apiKeys')}</h2>
                    <p className="mt-1 text-xs text-slate-400">{t('admin.apiKeysHint')}</p>
                  </div>
                  <div className="space-y-4 p-6">
                    {/* Google Maps Key */}
                    <div>
                      <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
                        {t('admin.mapsKey')}
                        <span className="rounded-full bg-emerald-200 px-1.5 py-px text-[9px] font-medium text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200">
                          {t('admin.recommended')}
                        </span>
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showKeys.maps ? 'text' : 'password'}
                            value={mapsKey}
                            onChange={(e) => setMapsKey(e.target.value)}
                            placeholder={t('settings.keyPlaceholder')}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-transparent focus:ring-2 focus:ring-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => toggleKey('maps')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showKeys.maps ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <button
                          onClick={() => handleValidateKey('maps')}
                          disabled={!mapsKey || validating.maps}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {validating.maps ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : validation.maps === true ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          ) : validation.maps === false ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : null}
                          {t('admin.validateKey')}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{t('admin.mapsKeyHintLong')}</p>
                      {validation.maps === true && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
                          {t('admin.keyValid')}
                        </p>
                      )}
                      {validation.maps === false && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
                          <span className="inline-block h-2 w-2 rounded-full bg-red-500"></span>
                          {t('admin.keyInvalid')}
                        </p>
                      )}
                    </div>

                    {/* Place Photos Toggle */}
                    <div className="flex items-center justify-between gap-4 border-t border-slate-100 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{t('admin.placesPhotos.title')}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{t('admin.placesPhotos.subtitle')}</p>
                      </div>
                      <button
                        onClick={async () => {
                          const next = !placesPhotosEnabled;
                          setPlacesPhotosEnabledState(next);
                          setPlacesPhotosEnabled(next);
                          try {
                            await adminApi.updatePlacesPhotos(next);
                          } catch {
                            setPlacesPhotosEnabledState(!next);
                            setPlacesPhotosEnabled(!next);
                          }
                        }}
                        className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
                        style={{ background: placesPhotosEnabled ? 'var(--text-primary)' : 'var(--border-primary)' }}
                      >
                        <span
                          className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
                          style={{ transform: placesPhotosEnabled ? 'translateX(20px)' : 'translateX(0)' }}
                        />
                      </button>
                    </div>

                    {/* Place Autocomplete Toggle */}
                    <div className="flex items-center justify-between gap-4 border-t border-slate-100 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{t('admin.placesAutocomplete.title')}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{t('admin.placesAutocomplete.subtitle')}</p>
                      </div>
                      <button
                        onClick={async () => {
                          const next = !placesAutocompleteEnabled;
                          setPlacesAutocompleteEnabledState(next);
                          setPlacesAutocompleteEnabled(next);
                          try {
                            await adminApi.updatePlacesAutocomplete(next);
                          } catch {
                            setPlacesAutocompleteEnabledState(!next);
                            setPlacesAutocompleteEnabled(!next);
                          }
                        }}
                        className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
                        style={{
                          background: placesAutocompleteEnabled ? 'var(--text-primary)' : 'var(--border-primary)',
                        }}
                      >
                        <span
                          className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
                          style={{ transform: placesAutocompleteEnabled ? 'translateX(20px)' : 'translateX(0)' }}
                        />
                      </button>
                    </div>

                    {/* Place Details Toggle */}
                    <div className="flex items-center justify-between gap-4 border-t border-slate-100 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{t('admin.placesDetails.title')}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{t('admin.placesDetails.subtitle')}</p>
                      </div>
                      <button
                        onClick={async () => {
                          const next = !placesDetailsEnabled;
                          setPlacesDetailsEnabledState(next);
                          setPlacesDetailsEnabled(next);
                          try {
                            await adminApi.updatePlacesDetails(next);
                          } catch {
                            setPlacesDetailsEnabledState(!next);
                            setPlacesDetailsEnabled(!next);
                          }
                        }}
                        className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
                        style={{ background: placesDetailsEnabled ? 'var(--text-primary)' : 'var(--border-primary)' }}
                      >
                        <span
                          className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
                          style={{ transform: placesDetailsEnabled ? 'translateX(20px)' : 'translateX(0)' }}
                        />
                      </button>
                    </div>

                    {/* Open-Meteo Weather Info */}
                    <div className="overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500">
                            <Sun className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                            {t('admin.weather.title')}
                          </span>
                        </div>
                        <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200">
                          {t('admin.weather.badge')}
                        </span>
                      </div>
                      <div className="px-4 pb-3">
                        <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
                          {t('admin.weather.description')}
                        </p>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-emerald-600 dark:text-emerald-400">
                          {t('admin.weather.locationHint')}
                        </p>
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <div className="rounded-md border border-emerald-100 bg-white px-3 py-2 dark:border-emerald-800 dark:bg-emerald-900/40">
                            <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                              {t('admin.weather.forecast')}
                            </p>
                            <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                              {t('admin.weather.forecastDesc')}
                            </p>
                          </div>
                          <div className="rounded-md border border-emerald-100 bg-white px-3 py-2 dark:border-emerald-800 dark:bg-emerald-900/40">
                            <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                              {t('admin.weather.climate')}
                            </p>
                            <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                              {t('admin.weather.climateDesc')}
                            </p>
                          </div>
                          <div className="rounded-md border border-emerald-100 bg-white px-3 py-2 dark:border-emerald-800 dark:bg-emerald-900/40">
                            <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                              {t('admin.weather.requests')}
                            </p>
                            <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                              {t('admin.weather.requestsDesc')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveApiKeys}
                      disabled={savingKeys}
                      className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:bg-slate-400"
                    >
                      {savingKeys ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {t('common.save')}
                    </button>
                  </div>
                </div>

                {/* OIDC / SSO Configuration */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-6 py-4">
                    <h2 className="font-semibold text-slate-900">{t('admin.oidcTitle')}</h2>
                    <p className="mt-1 text-xs text-slate-400">{t('admin.oidcSubtitle')}</p>
                  </div>
                  <div className="space-y-4 p-6">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        {t('admin.oidcDisplayName')}
                      </label>
                      <input
                        type="text"
                        value={oidcConfig.display_name}
                        onChange={(e) => setOidcConfig((c) => ({ ...c, display_name: e.target.value }))}
                        placeholder="z.B. Google, Authentik, Keycloak"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-slate-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('admin.oidcIssuer')}</label>
                      <input
                        type="url"
                        value={oidcConfig.issuer}
                        onChange={(e) => setOidcConfig((c) => ({ ...c, issuer: e.target.value }))}
                        placeholder="https://accounts.google.com"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-slate-400"
                      />
                      <p className="mt-1 text-xs text-slate-400">{t('admin.oidcIssuerHint')}</p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Discovery URL <span className="font-normal text-slate-400">(optional)</span>
                      </label>
                      <input
                        type="url"
                        value={oidcConfig.discovery_url}
                        onChange={(e) => setOidcConfig((c) => ({ ...c, discovery_url: e.target.value }))}
                        placeholder="https://auth.example.com/application/o/trek/.well-known/openid-configuration"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-slate-400"
                      />
                      <p className="mt-1 text-xs text-slate-400">
                        Override the auto-constructed discovery URL. Required for providers like Authentik where the
                        endpoint is not at{' '}
                        <code className="rounded bg-slate-100 px-1">{'<issuer>/.well-known/openid-configuration'}</code>
                        .
                      </p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Client ID</label>
                      <input
                        type="text"
                        value={oidcConfig.client_id}
                        onChange={(e) => setOidcConfig((c) => ({ ...c, client_id: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-slate-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Client Secret</label>
                      <input
                        type="password"
                        value={oidcConfig.client_secret}
                        onChange={(e) => setOidcConfig((c) => ({ ...c, client_secret: e.target.value }))}
                        placeholder={oidcConfig.client_secret_set ? '••••••••' : ''}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-slate-400"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        setSavingOidc(true);
                        try {
                          const payload: Record<string, unknown> = {
                            issuer: oidcConfig.issuer,
                            client_id: oidcConfig.client_id,
                            display_name: oidcConfig.display_name,
                            discovery_url: oidcConfig.discovery_url,
                          };
                          if (oidcConfig.client_secret) payload.client_secret = oidcConfig.client_secret;
                          await adminApi.updateOidc(payload);
                          toast.success(t('admin.oidcSaved'));
                        } catch (err: unknown) {
                          toast.error(getApiErrorMessage(err, t('common.error')));
                        } finally {
                          setSavingOidc(false);
                        }
                      }}
                      disabled={savingOidc}
                      className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:bg-slate-400"
                    >
                      {savingOidc ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {t('common.save')}
                    </button>
                  </div>
                </div>
                {/* Danger Zone */}
                <div className="overflow-hidden rounded-xl border border-red-200 bg-white">
                  <div className="border-b border-red-100 bg-red-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 font-semibold text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      Danger Zone
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">Rotate JWT Secret</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          Generate a new JWT signing secret. All active sessions will be invalidated immediately.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowRotateJwtModal(true)}
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Rotate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' &&
              (() => {
                // Derive active channels from smtpValues.notification_channels (plural)
                // with fallback to notification_channel (singular) for existing installs
                const rawChannels = smtpValues.notification_channels ?? smtpValues.notification_channel ?? 'none';
                const activeChans = rawChannels === 'none' ? [] : rawChannels.split(',').map((c: string) => c.trim());
                const emailActive = activeChans.includes('email');
                const webhookActive = activeChans.includes('webhook');
                const ntfyActive = activeChans.includes('ntfy');
                const tripRemindersActive = smtpValues.notify_trip_reminder !== 'false';

                const setChannels = async (email: boolean, webhook: boolean, ntfy: boolean) => {
                  const chans =
                    [email && 'email', webhook && 'webhook', ntfy && 'ntfy'].filter(Boolean).join(',') || 'none';
                  setSmtpValues((prev) => ({ ...prev, notification_channels: chans }));
                  try {
                    await authApi.updateAppSettings({ notification_channels: chans });
                  } catch {
                    // Revert state on failure
                    const reverted =
                      [emailActive && 'email', webhookActive && 'webhook', ntfyActive && 'ntfy']
                        .filter(Boolean)
                        .join(',') || 'none';
                    setSmtpValues((prev) => ({ ...prev, notification_channels: reverted }));
                    toast.error(t('common.error'));
                  }
                };

                const smtpConfigured = !!smtpValues.smtp_host?.trim();
                const saveNotifications = async () => {
                  // Saves credentials only — channel activation is auto-saved by the toggle
                  const notifKeys = [
                    'smtp_host',
                    'smtp_port',
                    'smtp_user',
                    'smtp_pass',
                    'smtp_from',
                    'smtp_skip_tls_verify',
                  ];
                  const payload: Record<string, string> = {};
                  for (const k of notifKeys) {
                    if (smtpValues[k] !== undefined) payload[k] = smtpValues[k];
                  }
                  try {
                    await authApi.updateAppSettings(payload);
                    toast.success(t('admin.notifications.saved'));
                    authApi
                      .getAppConfig()
                      .then((c: { trip_reminders_enabled?: boolean }) => {
                        if (c?.trip_reminders_enabled !== undefined) setTripRemindersEnabled(c.trip_reminders_enabled);
                      })
                      .catch(() => {});
                  } catch {
                    toast.error(t('common.error'));
                  }
                };

                return (
                  <>
                    <div className="space-y-4">
                      {/* Email Panel */}
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                          <div>
                            <h2 className="font-semibold text-slate-900">
                              {t('admin.notifications.emailPanel.title')}
                            </h2>
                            <p className="mt-1 text-xs text-slate-400">{t('admin.smtp.hint')}</p>
                          </div>
                          <button
                            onClick={() => setChannels(!emailActive, webhookActive, ntfyActive)}
                            className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
                            style={{ background: emailActive ? 'var(--text-primary)' : 'var(--border-primary)' }}
                          >
                            <span
                              className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
                              style={{ transform: emailActive ? 'translateX(20px)' : 'translateX(0)' }}
                            />
                          </button>
                        </div>
                        <div className={`space-y-3 p-6 ${!emailActive ? 'pointer-events-none opacity-50' : ''}`}>
                          {smtpLoaded &&
                            [
                              { key: 'smtp_host', label: 'SMTP Host', placeholder: 'mail.example.com' },
                              { key: 'smtp_port', label: 'SMTP Port', placeholder: '587' },
                              { key: 'smtp_user', label: 'SMTP User', placeholder: 'trek@example.com' },
                              { key: 'smtp_pass', label: 'SMTP Password', placeholder: '••••••••', type: 'password' },
                              { key: 'smtp_from', label: 'From Address', placeholder: 'trek@example.com' },
                            ].map((field) => (
                              <div key={field.key}>
                                <label className="mb-1 block text-xs font-medium text-slate-500">{field.label}</label>
                                <input
                                  type={field.type || 'text'}
                                  value={smtpValues[field.key] || ''}
                                  onChange={(e) => setSmtpValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                  placeholder={field.placeholder}
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-slate-400"
                                />
                              </div>
                            ))}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '4px 0',
                            }}
                          >
                            <div>
                              <span className="text-xs font-medium text-slate-500">Skip TLS certificate check</span>
                              <p className="mt-0.5 text-[10px] text-slate-400">
                                Enable for self-signed certificates on local mail servers
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                const newVal = smtpValues.smtp_skip_tls_verify === 'true' ? 'false' : 'true';
                                setSmtpValues((prev) => ({ ...prev, smtp_skip_tls_verify: newVal }));
                              }}
                              className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
                              style={{
                                background:
                                  smtpValues.smtp_skip_tls_verify === 'true'
                                    ? 'var(--text-primary)'
                                    : 'var(--border-primary)',
                              }}
                            >
                              <span
                                className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
                                style={{
                                  transform:
                                    smtpValues.smtp_skip_tls_verify === 'true' ? 'translateX(20px)' : 'translateX(0)',
                                }}
                              />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 border-t border-slate-100 px-6 pb-4 pt-4">
                          <button
                            onClick={saveNotifications}
                            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                          >
                            <Save className="h-4 w-4" />
                            {t('common.save')}
                          </button>
                          <button
                            onClick={async () => {
                              const smtpKeys = [
                                'smtp_host',
                                'smtp_port',
                                'smtp_user',
                                'smtp_pass',
                                'smtp_from',
                                'smtp_skip_tls_verify',
                              ];
                              const payload: Record<string, string> = {};
                              for (const k of smtpKeys) {
                                if (smtpValues[k] !== undefined) payload[k] = smtpValues[k];
                              }
                              await authApi.updateAppSettings(payload).catch(() => {});
                              try {
                                const result = await notificationsApi.testSmtp();
                                if (result.success) toast.success(t('admin.smtp.testSuccess'));
                                else toast.error(result.error || t('admin.smtp.testFailed'));
                              } catch {
                                toast.error(t('admin.smtp.testFailed'));
                              }
                            }}
                            disabled={!smtpConfigured}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
                          >
                            {t('admin.smtp.testButton')}
                          </button>
                        </div>
                      </div>

                      {/* Webhook Panel */}
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center justify-between px-6 py-4">
                          <div>
                            <h2 className="font-semibold text-slate-900">
                              {t('admin.notifications.webhookPanel.title')}
                            </h2>
                            <p className="mt-1 text-xs text-slate-400">{t('admin.webhook.hint')}</p>
                          </div>
                          <button
                            onClick={() => setChannels(emailActive, !webhookActive, ntfyActive)}
                            className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
                            style={{ background: webhookActive ? 'var(--text-primary)' : 'var(--border-primary)' }}
                          >
                            <span
                              className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
                              style={{ transform: webhookActive ? 'translateX(20px)' : 'translateX(0)' }}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Ntfy Panel */}
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center justify-between px-6 py-4">
                          <div>
                            <h2 className="font-semibold text-slate-900">{t('admin.notifications.ntfy')}</h2>
                            <p className="mt-1 text-xs text-slate-400">
                              {t('admin.ntfy.hint') ||
                                'Allow users to configure their own ntfy topics for push notifications.'}
                            </p>
                          </div>
                          <button
                            onClick={() => setChannels(emailActive, webhookActive, !ntfyActive)}
                            className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
                            style={{ background: ntfyActive ? 'var(--text-primary)' : 'var(--border-primary)' }}
                          >
                            <span
                              className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
                              style={{ transform: ntfyActive ? 'translateX(20px)' : 'translateX(0)' }}
                            />
                          </button>
                        </div>
                      </div>

                      {/* In-App Panel */}
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                          <div>
                            <h2 className="font-semibold text-slate-900">
                              {t('admin.notifications.inappPanel.title')}
                            </h2>
                            <p className="mt-1 text-xs text-slate-400">{t('admin.notifications.inappPanel.hint')}</p>
                          </div>
                          <div
                            className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full"
                            style={{ background: 'var(--text-primary)', opacity: 0.5, cursor: 'not-allowed' }}
                          >
                            <span
                              className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
                              style={{ transform: 'translateX(20px)' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Trip Reminders Toggle */}
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center justify-between px-6 py-4">
                          <div>
                            <h2 className="font-semibold text-slate-900">
                              {t('admin.notifications.tripReminders.title')}
                            </h2>
                            <p className="mt-1 text-xs text-slate-400">{t('admin.notifications.tripReminders.hint')}</p>
                          </div>
                          <button
                            onClick={async () => {
                              const next = !tripRemindersActive;
                              setSmtpValues((prev) => ({ ...prev, notify_trip_reminder: next ? 'true' : 'false' }));
                              try {
                                await authApi.updateAppSettings({ notify_trip_reminder: next ? 'true' : 'false' });
                                toast.success(
                                  next
                                    ? t('admin.notifications.tripReminders.enabled')
                                    : t('admin.notifications.tripReminders.disabled')
                                );
                                authApi
                                  .getAppConfig()
                                  .then((c: { trip_reminders_enabled?: boolean }) => {
                                    if (c?.trip_reminders_enabled !== undefined)
                                      setTripRemindersEnabled(c.trip_reminders_enabled);
                                  })
                                  .catch(() => {});
                              } catch {
                                setSmtpValues((prev) => ({
                                  ...prev,
                                  notify_trip_reminder: tripRemindersActive ? 'true' : 'false',
                                }));
                                toast.error(t('common.error'));
                              }
                            }}
                            className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors"
                            style={{
                              background: tripRemindersActive ? 'var(--text-primary)' : 'var(--border-primary)',
                            }}
                          >
                            <span
                              className="absolute left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200"
                              style={{ transform: tripRemindersActive ? 'translateX(20px)' : 'translateX(0)' }}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Admin Webhook Panel */}
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="border-b border-slate-100 px-6 py-4">
                          <h2 className="font-semibold text-slate-900">
                            {t('admin.notifications.adminWebhookPanel.title')}
                          </h2>
                          <p className="mt-1 text-xs text-slate-400">
                            {t('admin.notifications.adminWebhookPanel.hint')}
                          </p>
                        </div>
                        <div className="space-y-3 p-6">
                          {smtpLoaded && (
                            <div>
                              <label className="mb-1 block text-xs font-medium text-slate-500">
                                {t('admin.notifications.adminWebhookPanel.title')}
                              </label>
                              <input
                                type="text"
                                value={
                                  smtpValues.admin_webhook_url === '••••••••' ? '' : smtpValues.admin_webhook_url || ''
                                }
                                onChange={(e) =>
                                  setSmtpValues((prev) => ({ ...prev, admin_webhook_url: e.target.value }))
                                }
                                placeholder={
                                  smtpValues.admin_webhook_url === '••••••••'
                                    ? '••••••••'
                                    : 'https://discord.com/api/webhooks/...'
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-slate-400"
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 border-t border-slate-100 px-6 pb-4 pt-4">
                          <button
                            onClick={async () => {
                              try {
                                await authApi.updateAppSettings({
                                  admin_webhook_url: smtpValues.admin_webhook_url || '',
                                });
                                toast.success(t('admin.notifications.adminWebhookPanel.saved'));
                              } catch {
                                toast.error(t('common.error'));
                              }
                            }}
                            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                          >
                            <Save className="h-4 w-4" />
                            {t('common.save')}
                          </button>
                          <button
                            onClick={async () => {
                              const url =
                                smtpValues.admin_webhook_url === '••••••••' ? undefined : smtpValues.admin_webhook_url;
                              if (!url && smtpValues.admin_webhook_url !== '••••••••') return;
                              try {
                                if (url) await authApi.updateAppSettings({ admin_webhook_url: url }).catch(() => {});
                                const result = await notificationsApi.testWebhook(url);
                                if (result.success)
                                  toast.success(t('admin.notifications.adminWebhookPanel.testSuccess'));
                                else toast.error(result.error || t('admin.notifications.adminWebhookPanel.testFailed'));
                              } catch {
                                toast.error(t('admin.notifications.adminWebhookPanel.testFailed'));
                              }
                            }}
                            disabled={!smtpValues.admin_webhook_url?.trim()}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
                          >
                            {t('admin.notifications.testWebhook')}
                          </button>
                        </div>
                      </div>

                      {/* Admin Ntfy Panel */}
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="border-b border-slate-100 px-6 py-4">
                          <h2 className="font-semibold text-slate-900">
                            {t('admin.notifications.adminNtfyPanel.title')}
                          </h2>
                          <p className="mt-1 text-xs text-slate-400">{t('admin.notifications.adminNtfyPanel.hint')}</p>
                        </div>
                        <div className="space-y-3 p-6">
                          {smtpLoaded && (
                            <>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-500">
                                  {t('admin.notifications.adminNtfyPanel.serverLabel')}
                                </label>
                                <input
                                  type="text"
                                  value={smtpValues.admin_ntfy_server || ''}
                                  onChange={(e) =>
                                    setSmtpValues((prev) => ({ ...prev, admin_ntfy_server: e.target.value }))
                                  }
                                  placeholder={t('admin.notifications.adminNtfyPanel.serverPlaceholder')}
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-slate-400"
                                />
                                <p className="mt-1 text-xs text-slate-400">
                                  {t('admin.notifications.adminNtfyPanel.serverHint')}
                                </p>
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-500">
                                  {t('admin.notifications.adminNtfyPanel.topicLabel')}
                                </label>
                                <input
                                  type="text"
                                  value={smtpValues.admin_ntfy_topic || ''}
                                  onChange={(e) =>
                                    setSmtpValues((prev) => ({ ...prev, admin_ntfy_topic: e.target.value }))
                                  }
                                  placeholder={t('admin.notifications.adminNtfyPanel.topicPlaceholder')}
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-slate-400"
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-slate-500">
                                  {t('admin.notifications.adminNtfyPanel.tokenLabel')}
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="password"
                                    value={
                                      smtpValues.admin_ntfy_token === '••••••••'
                                        ? ''
                                        : smtpValues.admin_ntfy_token || ''
                                    }
                                    onChange={(e) =>
                                      setSmtpValues((prev) => ({ ...prev, admin_ntfy_token: e.target.value }))
                                    }
                                    placeholder={smtpValues.admin_ntfy_token === '••••••••' ? '••••••••' : ''}
                                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-slate-400"
                                  />
                                  {smtpValues.admin_ntfy_token === '••••••••' && (
                                    <button
                                      onClick={async () => {
                                        try {
                                          await authApi.updateAppSettings({ admin_ntfy_token: '' });
                                          setSmtpValues((prev) => ({ ...prev, admin_ntfy_token: '' }));
                                          toast.success(t('admin.notifications.adminNtfyPanel.tokenCleared'));
                                        } catch {
                                          toast.error(t('common.error'));
                                        }
                                      }}
                                      className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                                    >
                                      {t('common.clear')}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 border-t border-slate-100 px-6 pb-4 pt-4">
                          <button
                            onClick={async () => {
                              try {
                                await authApi.updateAppSettings({
                                  admin_ntfy_server: smtpValues.admin_ntfy_server || '',
                                  admin_ntfy_topic: smtpValues.admin_ntfy_topic || '',
                                  ...(smtpValues.admin_ntfy_token && smtpValues.admin_ntfy_token !== '••••••••'
                                    ? { admin_ntfy_token: smtpValues.admin_ntfy_token }
                                    : {}),
                                });
                                toast.success(t('admin.notifications.adminNtfyPanel.saved'));
                              } catch {
                                toast.error(t('common.error'));
                              }
                            }}
                            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                          >
                            <Save className="h-4 w-4" />
                            {t('common.save')}
                          </button>
                          <button
                            onClick={async () => {
                              const topic = smtpValues.admin_ntfy_topic?.trim();
                              if (!topic) return;
                              try {
                                const token =
                                  smtpValues.admin_ntfy_token && smtpValues.admin_ntfy_token !== '••••••••'
                                    ? smtpValues.admin_ntfy_token
                                    : null;
                                const result = await notificationsApi.testNtfy({
                                  topic,
                                  server: smtpValues.admin_ntfy_server || null,
                                  token,
                                });
                                if (result.success) toast.success(t('admin.notifications.adminNtfyPanel.testSuccess'));
                                else toast.error(result.error || t('admin.notifications.adminNtfyPanel.testFailed'));
                              } catch {
                                toast.error(t('admin.notifications.adminNtfyPanel.testFailed'));
                              }
                            }}
                            disabled={!smtpValues.admin_ntfy_topic?.trim()}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40"
                          >
                            {t('admin.notifications.adminNtfyPanel.test')}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6">
                      <AdminNotificationsPanel t={t} toast={toast} />
                    </div>
                  </>
                );
              })()}

            {activeTab === 'backup' && <BackupPanel />}

            {activeTab === 'audit' && <AuditLogPanel serverTimezone={serverTimezone} />}

            {activeTab === 'mcp-tokens' && <AdminMcpTokensPanel />}

            {activeTab === 'github' && <GitHubPanel isPrerelease={updateInfo?.is_prerelease ?? false} />}

            {activeTab === 'defaults' && <DefaultUserSettingsTab />}

            {activeTab === 'dev-notifications' && <DevNotificationsPanel />}
          </PageSidebar>
        </div>
      </div>

      {/* Create user modal */}
      <Modal
        isOpen={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        title={t('admin.createUser')}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowCreateUser(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleCreateUser}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
            >
              {t('admin.createUser')}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('settings.username')} *</label>
            <input
              type="text"
              value={createForm.username}
              onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
              placeholder={t('settings.username')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-transparent focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('common.email')} *</label>
            <input
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              placeholder={t('common.email')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-transparent focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('common.password')} *</label>
            <input
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={t('common.password')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-transparent focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('settings.role')}</label>
            <CustomSelect
              value={createForm.role}
              onChange={(value) => setCreateForm((f) => ({ ...f, role: value }))}
              options={[
                { value: 'user', label: t('settings.roleUser') },
                { value: 'admin', label: t('settings.roleAdmin') },
              ]}
            />
          </div>
        </div>
      </Modal>

      {/* Edit user modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={t('admin.editUser')}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setEditingUser(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSaveUser}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
            >
              {t('common.save')}
            </button>
          </div>
        }
      >
        {editingUser && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('settings.username')}</label>
              <input
                type="text"
                value={editForm.username}
                onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-transparent focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('common.email')}</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-transparent focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {t('admin.newPassword')}{' '}
                <span className="font-normal text-slate-400">({t('admin.newPasswordHint')})</span>
              </label>
              <input
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={t('admin.newPasswordPlaceholder')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-transparent focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('settings.role')}</label>
              <CustomSelect
                value={editForm.role}
                onChange={(value) => setEditForm((f) => ({ ...f, role: value }))}
                options={[
                  { value: 'user', label: t('settings.roleUser') },
                  { value: 'admin', label: t('settings.roleAdmin') },
                ]}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Update instructions popup */}
      {showUpdateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowUpdateModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 440, borderRadius: 16, overflow: 'hidden' }}
            className="border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ArrowUpCircle size={20} style={{ color: 'white' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'white' }}>{t('admin.update.howTo')}</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                  v{updateInfo?.current} → v{updateInfo?.latest}
                </p>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <p className="text-gray-700 dark:text-gray-300" style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                {t('admin.update.dockerText').replace('{version}', `v${updateInfo?.latest ?? ''}`)}
              </p>

              <div
                style={{
                  marginTop: 14,
                  padding: '12px 14px',
                  borderRadius: 10,
                  fontSize: 12,
                  lineHeight: 1.8,
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
                className="border border-gray-700 bg-gray-900 text-gray-100 dark:bg-gray-950"
              >
                {`docker pull mauriceboe/trek:latest
docker stop trek && docker rm trek
docker run -d --name trek \\
  -p 3000:3000 \\
  -v /opt/trek/data:/app/data \\
  -v /opt/trek/uploads:/app/uploads \\
  --restart unless-stopped \\
  mauriceboe/trek:latest`}
              </div>

              <div
                style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, fontSize: 12, lineHeight: 1.5 }}
                className="border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
              >
                <div className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>{t('admin.update.dataInfo')}</span>
                </div>
              </div>

              {updateInfo?.release_url && (
                <div
                  style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, fontSize: 12, lineHeight: 1.5 }}
                  className="border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  <div className="flex items-start gap-2">
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    <span>
                      <a
                        href={updateInfo.release_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline"
                      >
                        {t('admin.update.button')}
                      </a>
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '0 24px 20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowUpdateModal(false)}
                className="bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-gray-200"
                style={{
                  padding: '9px 20px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rotate JWT Secret confirmation modal */}
      <Modal
        isOpen={showRotateJwtModal}
        onClose={() => setShowRotateJwtModal(false)}
        title="Rotate JWT Secret"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowRotateJwtModal(false)}
              disabled={rotatingJwt}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={async () => {
                setRotatingJwt(true);
                try {
                  await adminApi.rotateJwtSecret();
                  setShowRotateJwtModal(false);
                  logout();
                  navigate('/login', { state: { noRedirect: true } });
                } catch {
                  toast.error(t('common.error'));
                  setRotatingJwt(false);
                }
              }}
              disabled={rotatingJwt}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-red-300"
            >
              {rotatingJwt ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Rotate &amp; Log out
            </button>
          </div>
        }
      >
        <div className="flex gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-slate-900">
              Warning, this will invalidate all sessions and log you out.
            </p>
            <p className="text-xs text-slate-500">
              A new JWT secret will be generated immediately. Every logged-in user — including you — will be signed out
              and will need to log in again.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
