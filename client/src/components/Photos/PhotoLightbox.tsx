import { Check, ChevronLeft, ChevronRight, Edit2, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '../../i18n';
import type { Day, Photo, Place } from '../../types';

interface PhotoLightboxProps {
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
  onUpdate: (photoId: number, data: Partial<Photo>) => Promise<void>;
  onDelete: (photoId: number) => Promise<void>;
  days: Day[];
  places: Place[];
  tripId: number;
}

export function PhotoLightbox({
  photos,
  initialIndex,
  onClose,
  onUpdate,
  onDelete,
  days,
  places,
  tripId,
}: PhotoLightboxProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(initialIndex || 0);
  const [editCaption, setEditCaption] = useState(false);
  const [caption, setCaption] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const photo = photos[index];

  useEffect(() => {
    setIndex(initialIndex || 0);
  }, [initialIndex]);

  useEffect(() => {
    if (photo) setCaption(photo.caption || '');
  }, [photo]);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
    setEditCaption(false);
  }, []);

  const next = useCallback(() => {
    setIndex((i) => Math.min(photos.length - 1, i + 1));
    setEditCaption(false);
  }, [photos.length]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, prev, next]);

  const handleSaveCaption = async () => {
    setIsSaving(true);
    try {
      await onUpdate(photo.id, { caption });
      setEditCaption(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Foto löschen?')) return;
    await onDelete(photo.id);
    if (photos.length <= 1) {
      onClose();
    } else {
      setIndex((i) => Math.min(i, photos.length - 2));
    }
  };

  if (!photo) return null;

  const day = days?.find((d) => d.id === photo.day_id);
  const place = places?.find((p) => p.id === photo.place_id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      style={{ paddingBottom: 'var(--bottom-nav-h)' }}
      onClick={onClose}
    >
      {/* Main area */}
      <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Top bar */}
        <div className="flex flex-shrink-0 items-center justify-between p-4">
          <div className="text-sm text-white/60">
            {index + 1} / {photos.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-red-400"
              title={t('common.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Image area */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-16">
          {/* Prev button */}
          {index > 0 && (
            <button
              onClick={prev}
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          <img
            src={photo.url}
            alt={photo.caption || photo.original_name}
            className="max-h-full max-w-full select-none rounded-lg object-contain"
            draggable={false}
          />

          {/* Next button */}
          {index < photos.length - 1 && (
            <button
              onClick={next}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Bottom info */}
        <div className="flex-shrink-0 p-4">
          {/* Caption */}
          <div className="mb-2 flex items-center gap-2">
            {editCaption ? (
              <>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveCaption()}
                  placeholder={t('photos.addCaption')}
                  className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white focus:border-white/40 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveCaption}
                  disabled={isSaving}
                  className="rounded-lg bg-slate-900 p-1.5 text-white hover:bg-slate-700"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setEditCaption(false);
                    setCaption(photo.caption || '');
                  }}
                  className="p-1.5 text-white/60 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <p
                  className="flex-1 cursor-pointer text-sm text-white hover:text-white/80"
                  onClick={() => setEditCaption(true)}
                >
                  {photo.caption || <span className="italic text-white/40">{t('photos.addCaption')}</span>}
                </p>
                <button onClick={() => setEditCaption(true)} className="p-1.5 text-white/40 hover:text-white/70">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-white/40">
            <span>{photo.original_name}</span>
            {photo.created_at && <span>{formatDate(photo.created_at)}</span>}
            {day && <span>📅 Tag {day.day_number}</span>}
            {place && <span>📍 {place.name}</span>}
            {photo.file_size && <span>{formatSize(photo.file_size)}</span>}
          </div>
        </div>

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div className="flex-shrink-0 px-4 pb-4">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setIndex(i);
                    setEditCaption(false);
                  }}
                  className={`h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg transition-all ${
                    i === index ? 'scale-105 ring-2 ring-white' : 'opacity-50 hover:opacity-75'
                  }`}
                >
                  <img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr, locale = 'en-US') {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
