import { Camera, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getLocaleForLanguage, useTranslation } from '../../i18n';
import type { Day, Photo, Place } from '../../types';
import Modal from '../shared/Modal';
import { PhotoLightbox } from './PhotoLightbox';
import { PhotoUpload } from './PhotoUpload';

interface PhotoGalleryProps {
  photos: Photo[];
  onUpload: (fd: FormData) => Promise<void>;
  onDelete: (photoId: number) => Promise<void>;
  onUpdate: (photoId: number, data: Partial<Photo>) => Promise<void>;
  places: Place[];
  days: Day[];
  tripId: number;
}

export default function PhotoGallery({
  photos,
  onUpload,
  onDelete,
  onUpdate,
  places,
  days,
  tripId,
}: PhotoGalleryProps) {
  const { t, language } = useTranslation();
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [filterDayId, setFilterDayId] = useState('');

  const filteredPhotos = useMemo(() => {
    return photos.filter((photo) => {
      if (filterDayId && String(photo.day_id) !== String(filterDayId)) return false;
      return true;
    });
  }, [photos, filterDayId]);

  const handlePhotoClick = (photo) => {
    const idx = filteredPhotos.findIndex((p) => p.id === photo.id);
    setLightboxIndex(idx);
  };

  const handleDelete = async (photoId) => {
    await onDelete(photoId);
    if (lightboxIndex !== null) {
      const newPhotos = filteredPhotos.filter((p) => p.id !== photoId);
      if (newPhotos.length === 0) {
        setLightboxIndex(null);
      } else if (lightboxIndex >= newPhotos.length) {
        setLightboxIndex(newPhotos.length - 1);
      }
    }
  };

  return (
    <div
      className="flex h-full flex-col"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif" }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ marginRight: 'auto' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>Fotos</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#9ca3af' }}>
            {photos.length} {photos.length !== 1 ? 'Fotos' : 'Foto'}
          </p>
        </div>

        <select
          value={filterDayId}
          onChange={(e) => setFilterDayId(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="">{t('photos.allDays')}</option>
          {(days || []).map((day) => (
            <option key={day.id} value={day.id}>
              {t('planner.dayN', { n: day.day_number })}
              {day.date ? ` · ${formatDate(day.date, getLocaleForLanguage(language))}` : ''}
            </option>
          ))}
        </select>

        {filterDayId && (
          <button onClick={() => setFilterDayId('')} className="text-xs text-gray-500 underline hover:text-gray-700">
            {t('common.reset')}
          </button>
        )}

        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          <Upload className="h-4 w-4" />
          {t('common.upload')}
        </button>
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredPhotos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
            <Camera size={40} style={{ color: '#d1d5db', display: 'block', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>{t('photos.noPhotos')}</p>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 20px' }}>{t('photos.uploadHint')}</p>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-medium text-white hover:bg-slate-700"
              style={{ display: 'inline-flex', margin: '0 auto' }}
            >
              <Upload className="h-4 w-4" />
              {t('common.upload')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredPhotos.map((photo) => (
              <PhotoThumbnail
                key={photo.id}
                photo={photo}
                days={days}
                places={places}
                onClick={() => handlePhotoClick(photo)}
              />
            ))}

            {/* Upload tile */}
            <button
              onClick={() => setShowUpload(true)}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 transition-colors hover:border-slate-400 hover:text-slate-700"
            >
              <Upload className="h-6 w-6" />
              <span className="text-xs">{t('common.add')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={filteredPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onUpdate={onUpdate}
          onDelete={handleDelete}
          days={days}
          places={places}
          tripId={tripId}
        />
      )}

      {/* Upload Modal */}
      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title={t('common.upload')} size="lg">
        <PhotoUpload
          tripId={tripId}
          days={days}
          places={places}
          onUpload={async (formData) => {
            await onUpload(formData);
            setShowUpload(false);
          }}
          onClose={() => setShowUpload(false)}
        />
      </Modal>
    </div>
  );
}

interface PhotoThumbnailProps {
  photo: Photo;
  days: Day[];
  places: Place[];
  onClick: () => void;
}

function PhotoThumbnail({ photo, days, places, onClick }: PhotoThumbnailProps) {
  const day = days?.find((d) => d.id === photo.day_id);
  const place = places?.find((p) => p.id === photo.place_id);

  return (
    <div
      className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-gray-100"
      onClick={onClick}
    >
      <img
        src={photo.url}
        alt={photo.caption || photo.original_name}
        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
          const next = (e.target as HTMLImageElement).nextSibling as HTMLElement;
          if (next) next.style.display = 'flex';
        }}
      />

      {/* Fallback */}
      <div className="absolute inset-0 hidden items-center justify-center text-2xl text-gray-400">🖼️</div>

      {/* Hover overlay */}
      <div className="absolute inset-0 flex flex-col justify-end bg-black/0 p-2 opacity-0 transition-all duration-200 group-hover:bg-black/40 group-hover:opacity-100">
        {photo.caption && <p className="truncate text-xs font-medium text-white">{photo.caption}</p>}
        {(day || place) && (
          <p className="truncate text-xs text-white/70">
            {day ? `Tag ${day.day_number}` : ''}
            {day && place ? ' · ' : ''}
            {place?.name || ''}
          </p>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr, locale) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}
