import { ArrowLeft } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import FileManager from '../components/Files/FileManager';
import Navbar from '../components/Layout/Navbar';
import { useTranslation } from '../i18n';
import { placeRepo } from '../repo/placeRepo';
import { tripRepo } from '../repo/tripRepo';
import { useTripStore } from '../store/tripStore';
import type { Place, Trip, TripFile } from '../types';

export default function FilesPage(): React.ReactElement {
  const { t } = useTranslation();
  const { id: tripId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tripStore = useTripStore();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [files, setFiles] = useState<TripFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, [tripId]);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const [tripData, placesData] = await Promise.all([tripRepo.get(tripId), placeRepo.list(tripId)]);
      setTrip(tripData.trip);
      setPlaces(placesData.places);
      await tripStore.loadFiles(tripId);
    } catch (err: unknown) {
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setFiles(tripStore.files);
  }, [tripStore.files]);

  const handleUpload = async (formData: FormData): Promise<void> => {
    await tripStore.addFile(tripId, formData);
  };

  const handleDelete = async (fileId: number): Promise<void> => {
    await tripStore.deleteFile(tripId, fileId);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar tripTitle={trip?.name} tripId={tripId} showBack onBack={() => navigate(`/trips/${tripId}`)} />

      <div style={{ paddingTop: 'var(--nav-h)' }}>
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="mb-6 flex items-center gap-3">
            <Link to={`/trips/${tripId}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" />
              {t('common.backToPlanning')}
            </Link>
          </div>

          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('files.pageTitle')}</h1>
              <p className="text-sm text-gray-500">{t('files.subtitle', { count: files.length, trip: trip?.name })}</p>
            </div>
          </div>

          <FileManager files={files} onUpload={handleUpload} onDelete={handleDelete} places={places} tripId={tripId} />
        </div>
      </div>
    </div>
  );
}
