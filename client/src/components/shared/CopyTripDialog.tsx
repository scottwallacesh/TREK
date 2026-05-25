import { Check, X } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { useTranslation } from '../../i18n';

interface CopyTripDialogProps {
  isOpen: boolean;
  tripTitle: string;
  onClose: () => void;
  onConfirm: () => void;
}

const WILL_COPY_KEYS = [
  'dashboard.confirm.copy.will1',
  'dashboard.confirm.copy.will2',
  'dashboard.confirm.copy.will3',
  'dashboard.confirm.copy.will4',
  'dashboard.confirm.copy.will5',
  'dashboard.confirm.copy.will6',
];

const WONT_COPY_KEYS = [
  'dashboard.confirm.copy.wont1',
  'dashboard.confirm.copy.wont2',
  'dashboard.confirm.copy.wont3',
  'dashboard.confirm.copy.wont4',
];

export default function CopyTripDialog({ isOpen, tripTitle, onClose, onConfirm }: CopyTripDialogProps) {
  const { t } = useTranslation();

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, handleEsc]);

  if (!isOpen) return null;

  return (
    <div
      className="trek-backdrop-enter fixed inset-0 z-[10000] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)', paddingBottom: 'var(--bottom-nav-h)' }}
      onClick={onClose}
    >
      <div
        className="trek-modal-enter w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          {t('dashboard.confirm.copy.title')}
        </h3>
        <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {tripTitle}
        </p>

        <div className="flex flex-col gap-3">
          <div
            className="rounded-xl p-3"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-secondary)' }}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: '#16a34a' }}>
              {t('dashboard.confirm.copy.willCopy')}
            </p>
            <ul className="flex flex-col gap-1">
              {WILL_COPY_KEYS.map((key) => (
                <li key={key} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Check size={13} className="flex-shrink-0" style={{ color: '#16a34a' }} />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>

          <div
            className="rounded-xl p-3"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-secondary)' }}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {t('dashboard.confirm.copy.wontCopy')}
            </p>
            <ul className="flex flex-col gap-1">
              {WONT_COPY_KEYS.map((key) => (
                <li key={key} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <X size={13} className="flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-secondary)' }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            {t('dashboard.confirm.copy.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
