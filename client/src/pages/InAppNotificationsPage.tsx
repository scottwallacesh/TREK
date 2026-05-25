import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Layout/Navbar';
import InAppNotificationItem from '../components/Notifications/InAppNotificationItem.tsx';
import { useTranslation } from '../i18n';
import { useInAppNotificationStore } from '../store/inAppNotificationStore.ts';
import { useSettingsStore } from '../store/settingsStore';

export default function InAppNotificationsPage(): React.ReactElement {
  const { t } = useTranslation();
  const { settings } = useSettingsStore();
  const darkMode = settings.dark_mode;
  const dark =
    darkMode === true ||
    darkMode === 'dark' ||
    (darkMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const { notifications, unreadCount, total, isLoading, hasMore, fetchNotifications, markAllRead, deleteAll } =
    useInAppNotificationStore();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications(true);
  }, []);

  // Reload when filter changes
  useEffect(() => {
    // We need to fetch with the unreadOnly filter — re-fetch from scratch
    // The store fetchNotifications doesn't take a filter param directly,
    // so we use the API directly for filtered view via a side channel.
    // For now, reset and fetch — store always loads all, filter is client-side.
    fetchNotifications(true);
  }, [unreadOnly]);

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchNotifications(false);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading]);

  const displayed = unreadOnly ? notifications.filter((n) => !n.is_read) : notifications;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Navbar />
      <div style={{ paddingTop: 'var(--nav-h)' }}>
        <div className="mx-auto max-w-2xl px-4 py-8">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {t('notifications.title')}
                {unreadCount > 0 && (
                  <span
                    className="ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5 align-middle text-xs font-medium"
                    style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}
                  >
                    {unreadCount}
                  </span>
                )}
              </h1>
              <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                {total} {total === 1 ? 'notification' : 'notifications'}
              </p>
            </div>

            {/* Bulk actions */}
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                >
                  <CheckCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('notifications.markAllRead')}</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={deleteAll}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('notifications.deleteAll')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter toggle */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setUnreadOnly(false)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              style={{
                background: !unreadOnly ? 'var(--text-primary)' : 'var(--bg-hover)',
                color: !unreadOnly ? 'var(--bg-primary)' : 'var(--text-secondary)',
              }}
            >
              {t('notifications.all')}
            </button>
            <button
              onClick={() => setUnreadOnly(true)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              style={{
                background: unreadOnly ? 'var(--text-primary)' : 'var(--bg-hover)',
                color: unreadOnly ? 'var(--bg-primary)' : 'var(--text-secondary)',
              }}
            >
              {t('notifications.unreadOnly')}
            </button>
          </div>

          {/* Notification list */}
          <div
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-card)' }}
          >
            {isLoading && displayed.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-current" />
              </div>
            ) : displayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
                <Bell className="h-12 w-12" style={{ color: 'var(--text-faint)' }} />
                <p className="text-base font-medium" style={{ color: 'var(--text-muted)' }}>
                  {t('notifications.empty')}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
                  {t('notifications.emptyDescription')}
                </p>
              </div>
            ) : (
              displayed.map((n) => <InAppNotificationItem key={n.id} notification={n} />)
            )}

            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={loaderRef} className="flex items-center justify-center py-4">
                {isLoading && (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-current" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
