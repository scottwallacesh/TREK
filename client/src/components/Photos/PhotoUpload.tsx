import { Upload, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from '../../i18n';
import type { Day, Place } from '../../types';

interface PhotoUploadProps {
  tripId: number;
  days: Day[];
  places: Place[];
  onUpload: (fd: FormData) => Promise<void>;
  onClose: () => void;
}

export function PhotoUpload({ tripId, days, places, onUpload, onClose }: PhotoUploadProps) {
  const { t } = useTranslation();
  const [files, setFiles] = useState([]);
  const [dayId, setDayId] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles) => {
    const withPreview = acceptedFiles.map((file) => Object.assign(file, { preview: URL.createObjectURL(file) }));
    setFiles((prev) => [...prev, ...withPreview]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.heic'] },
    maxFiles: 30,
    maxSize: 10 * 1024 * 1024,
  });

  const removeFile = (index) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('photos', file));
      if (dayId) formData.append('day_id', dayId);
      if (placeId) formData.append('place_id', placeId);
      if (caption) formData.append('caption', caption);

      await onUpload(formData);
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      setFiles([]);
    } catch (err: unknown) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          isDragActive ? 'border-slate-900 bg-slate-50' : 'border-gray-300 hover:border-slate-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className={`mx-auto mb-3 h-10 w-10 ${isDragActive ? 'text-slate-900' : 'text-gray-400'}`} />
        {isDragActive ? (
          <p className="font-medium text-slate-700">{t('photos.dropHere')}</p>
        ) : (
          <>
            <p className="font-medium text-gray-600">{t('photos.dropHereActive')}</p>
            <p className="mt-1 text-sm text-gray-400">{t('photos.clickToSelect')}</p>
            <p className="mt-2 text-xs text-gray-400">{t('photos.fileTypeHint')}</p>
          </>
        )}
      </div>

      {/* Preview grid */}
      {files.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">
            {files.length} {t(files.length !== 1 ? 'photos.photosSelected' : 'photos.photoSelected')}
          </p>
          <div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
            {files.map((file, idx) => (
              <div key={idx} className="group relative aspect-square">
                <img src={file.preview} alt={file.name} className="h-full w-full rounded-lg object-cover" />
                <button
                  onClick={() => removeFile(idx)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 truncate rounded-b-lg bg-black/50 p-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {formatSize(file.size)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Options */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">{t('photos.linkDay')}</label>
            <select
              value={dayId}
              onChange={(e) => setDayId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">{t('photos.noDay')}</option>
              {(days || []).map((day) => (
                <option key={day.id} value={day.id}>
                  {t('photos.dayLabel', { number: day.day_number })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">{t('photos.linkPlace')}</label>
            <select
              value={placeId}
              onChange={(e) => setPlaceId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">{t('photos.noPlace')}</option>
              {(places || []).map((place) => (
                <option key={place.id} value={place.id}>
                  {place.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">{t('photos.captionForAll')}</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t('photos.captionPlaceholder')}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
            <span className="text-sm text-slate-900">{t('common.uploading')}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200">
            <div
              className="h-1.5 rounded-full bg-slate-900 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {uploading ? t('common.uploading') : t('photos.uploadN', { n: files.length })}
        </button>
      </div>
    </div>
  );
}
