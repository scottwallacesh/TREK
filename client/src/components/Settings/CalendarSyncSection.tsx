import { useState } from 'react';
import api from '../../api/client';

export function CalendarSyncSection({ currentUser, onTokenUpdate }: { currentUser: any, onTokenUpdate?: (newToken: string) => void }) {
  const [token, setToken] = useState(currentUser?.calendar_token || '');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const syncUrl = token
    ? `${window.location.origin}/api/calendar/feed/${token}.ics`
    : '';

  const handleCopy = () => {
    if (!syncUrl) return;
    navigator.clipboard.writeText(syncUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (token && !window.confirm('This will break any existing calendar syncs. Are you sure you want to generate a new link?')) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('calendar/rotate', {});

      const newToken = res.calendar_token || res.data?.calendar_token;
      if (!newToken) throw new Error("No token returned from server");

      setToken(newToken);

      try {
        if (onTokenUpdate) onTokenUpdate(newToken);
      } catch (storeErr) {
        console.warn('Global store update failed, but token is saved');
      }

    } catch (err: any) {
      console.error('Failed to rotate calendar token:', err.response || err);
      alert('Could not generate calendar link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Calendar Subscription
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Subscribe to a live feed of your TREK itineraries. Paste this link into Google Calendar, Apple Calendar, or Outlook to keep your travel plans synced automatically.
      </p>

      {token ? (
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            readOnly
            value={syncUrl}
            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 focus:outline-none"
            onClick={(e) => e.currentTarget.select()}
          />
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors whitespace-nowrap"
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={handleRegenerate}
            disabled={isLoading}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium rounded-md transition-colors whitespace-nowrap disabled:opacity-50"
          >
            Revoke & Regenerate
          </button>
        </div>
      ) : (
        <button
          onClick={handleRegenerate}
          disabled={isLoading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          {isLoading ? 'Generating...' : 'Generate Sync Link'}
        </button>
      )}
    </div>
  );
}
