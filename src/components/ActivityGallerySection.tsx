import React, { useState, useRef, useEffect } from 'react';
import { 
  Image as ImageIcon, Video as VideoIcon, PlusCircle, Search, 
  Calendar, MapPin, User, Tag, Eye, Trash2, Edit3, X, 
  Upload, Play, ExternalLink, Filter, CheckCircle, Share2, 
  Download, MessageSquareQuote, Layers, Sparkles, AlertCircle, CheckSquare, Square, RotateCcw,
  ShieldCheck, Lock, Shield, ChevronLeft, ChevronRight, Images, Star, Plus, Check
} from 'lucide-react';
import { ActivityGalleryItem, CurrentUser } from '../types';
import { INITIAL_ACTIVITY_GALLERY } from '../mockData';
import { compressImage, safeLocalStorageSet } from '../lib/storage';
import { saveFirestoreDoc, deleteFirestoreDoc } from '../lib/firebase';

interface ActivityGallerySectionProps {
  galleryItems: ActivityGalleryItem[];
  setGalleryItems: React.Dispatch<React.SetStateAction<ActivityGalleryItem[]>>;
  onSaveToFirebase?: (items: ActivityGalleryItem[]) => void;
  onDeleteFromFirebase?: (id: string) => void;
  currentUser?: CurrentUser | null;
  isEditMode?: boolean;
}

const CATEGORIES = [
  'Semua Kategori',
  'Rapat & Forum',
  'Sosialisasi & Edukasi',
  'GKM Kepegawaian',
  'Bakti Sosial & Dharma Wanita',
  'Kunjungan Kerja',
  'Olahraga & Seni',
  'Inovasi & Apresiasi'
];

const DIVISIONS = [
  'Bagian Umum',
  'Subbagian TURT',
  'Subbagian Kepegawaian',
  'Subbagian Penilaian Kinerja',
  'Subbagian Keuangan',
  'Bidang SKKI',
  'Bidang PPA I',
  'Bidang PPA II',
  'Bidang PAPK',
  'KPPN Pekanbaru',
  'KPPN Dumai',
  'KPPN Rengat',
  'Dharma Wanita Persatuan (DWP)',
  'Bapor DJPb Riau'
];

// Preset high quality photos for quick selection if user wants instant samples
const PRESET_PHOTOS = [
  { label: 'Aula Rapat RAKORDA', url: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Forum Sosialisasi Kemenkeu', url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Bakti Sosial & Santunan', url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Kunjungan Kerja Lapangan', url: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Diskusi GKM Tim', url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80' }
];

export const formatIndonesianDate = (dateStr?: string, includeWeekday: boolean = false): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const options: Intl.DateTimeFormatOptions = includeWeekday
      ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
      : { day: 'numeric', month: 'short', year: 'numeric' };
    return d.toLocaleDateString('id-ID', options);
  } catch (e) {
    return dateStr;
  }
};

export default function ActivityGallerySection({
  galleryItems = [],
  setGalleryItems,
  onSaveToFirebase,
  onDeleteFromFirebase,
  currentUser,
  isEditMode = false
}: ActivityGallerySectionProps) {
  // Check Administrator Authority
  const isAdmin = currentUser?.role === 'admin' || isEditMode === true;

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMediaType, setSelectedMediaType] = useState<'all' | 'photo' | 'video'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua Kategori');

  // Modals and Action States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<ActivityGalleryItem | null>(null);
  const [editingItem, setEditingItem] = useState<ActivityGalleryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ActivityGalleryItem | null>(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIdsForDelete, setSelectedIdsForDelete] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State for Upload & Edit
  const [formData, setFormData] = useState<{
    title: string;
    date: string;
    division: string;
    mediaType: 'photo' | 'video';
    mediaUrl: string;
    additionalPhotos: string[];
    thumbnailUrl: string;
    narration: string;
    category: string;
    location: string;
    authorName: string;
    tagsInput: string;
  }>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    division: currentUser?.division || 'Bagian Umum',
    mediaType: 'photo',
    mediaUrl: '',
    additionalPhotos: [],
    thumbnailUrl: '',
    narration: '',
    category: 'Rapat & Forum',
    location: 'Aula Lancang Kuning, Kanwil DJPb Riau',
    authorName: currentUser?.fullName || 'Petugas Humas',
    tagsInput: ''
  });

  const [uploadSourceType, setUploadSourceType] = useState<'file' | 'url'>('file');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [isCompressingMedia, setIsCompressingMedia] = useState<boolean>(false);
  const [compressProgress, setCompressProgress] = useState<string>('');
  const [activeDetailPhotoIdx, setActiveDetailPhotoIdx] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset active photo index when opening a new detail item
  useEffect(() => {
    setActiveDetailPhotoIdx(0);
  }, [selectedDetailItem]);

  // Keyboard navigation for multi-photo lightbox
  useEffect(() => {
    if (!selectedDetailItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedDetailItem.mediaType !== 'photo') return;
      const photos = [selectedDetailItem.mediaUrl, ...(selectedDetailItem.additionalPhotos || [])].filter(Boolean);
      if (photos.length <= 1) return;

      if (e.key === 'ArrowRight') {
        setActiveDetailPhotoIdx(prev => (prev + 1) % photos.length);
      } else if (e.key === 'ArrowLeft') {
        setActiveDetailPhotoIdx(prev => (prev - 1 + photos.length) % photos.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDetailItem]);

  // Helper to persist updates to state, local storage, and Firestore
  const updateAndPersist = (newItems: ActivityGalleryItem[]) => {
    setGalleryItems(newItems);
    safeLocalStorageSet('melayu_activity_gallery', JSON.stringify(newItems));
    if (onSaveToFirebase) {
      onSaveToFirebase(newItems);
    }
  };

  // Handle Multi-Photo File Change with automatic high-speed image compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const isVideo = files[0].type.startsWith('video');

    if (isVideo) {
      const file = files[0];
      // Check video size limit (under 15MB for direct upload)
      if (file.size > 15 * 1024 * 1024) {
        alert('Ukuran file video langsung melebihi 15 MB. Disarankan untuk menggunakan opsi "Tautan URL / Embed" (YouTube/Google Drive) agar performa tetap cepat dan tidak membebani browser.');
        return;
      }

      setIsCompressingMedia(true);
      setCompressProgress('Membaca file video...');
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = (event.target?.result as string) || '';
        setFormData(prev => ({
          ...prev,
          mediaUrl: result,
          additionalPhotos: [],
          mediaType: 'video'
        }));
        setMediaPreview(result);
        setIsCompressingMedia(false);
        setCompressProgress('');
      };
      reader.onerror = () => {
        setIsCompressingMedia(false);
        setCompressProgress('');
        alert('Gagal membaca file video.');
      };
      reader.readAsDataURL(file);
    } else {
      // Multi-Photo Image compression: Supports uploading 1 or dozens of photos simultaneously
      setIsCompressingMedia(true);
      const newCompressedPhotos: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCompressProgress(`Mengompresi & mengoptimalkan foto (${i + 1}/${files.length})...`);
        try {
          const compressedDataUrl = await compressImage(file, 1000, 700, 0.68);
          newCompressedPhotos.push(compressedDataUrl);
        } catch (err) {
          console.error('Failed to compress image:', err);
          // Fallback to basic file reader
          const fallbackDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve((ev.target?.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });
          if (fallbackDataUrl) newCompressedPhotos.push(fallbackDataUrl);
        }
      }

      if (newCompressedPhotos.length > 0) {
        setFormData(prev => {
          const existingAll = [prev.mediaUrl, ...prev.additionalPhotos].filter(Boolean);
          let combined: string[];
          if (prev.mediaType === 'video' || existingAll.length === 0) {
            combined = newCompressedPhotos;
          } else {
            // Append newly uploaded photos to existing list
            combined = [...existingAll, ...newCompressedPhotos];
          }

          return {
            ...prev,
            mediaType: 'photo',
            mediaUrl: combined[0] || '',
            additionalPhotos: combined.slice(1)
          };
        });
        setMediaPreview(newCompressedPhotos[0]);
        setToastMessage({
          text: `Berhasil menambahkan ${newCompressedPhotos.length} foto kegiatan.`,
          type: 'success'
        });
        setTimeout(() => setToastMessage(null), 3000);
      }

      setIsCompressingMedia(false);
      setCompressProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Set a specific photo as the primary cover photo (index 0)
  const handleSetCoverPhoto = (targetIdx: number) => {
    setFormData(prev => {
      const all = [prev.mediaUrl, ...prev.additionalPhotos].filter(Boolean);
      if (targetIdx <= 0 || targetIdx >= all.length) return prev;
      const selected = all[targetIdx];
      const remaining = all.filter((_, idx) => idx !== targetIdx);
      const reordered = [selected, ...remaining];
      return {
        ...prev,
        mediaUrl: reordered[0],
        additionalPhotos: reordered.slice(1)
      };
    });
    setToastMessage({
      text: 'Foto utama (cover kegiatan) berhasil diperbarui.',
      type: 'info'
    });
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Remove a photo from the upload/edit list
  const handleRemovePhoto = (targetIdx: number) => {
    setFormData(prev => {
      const all = [prev.mediaUrl, ...prev.additionalPhotos].filter(Boolean);
      const updated = all.filter((_, idx) => idx !== targetIdx);
      return {
        ...prev,
        mediaUrl: updated[0] || '',
        additionalPhotos: updated.slice(1)
      };
    });
  };

  // Add a photo by custom URL
  const handleAddPhotoUrl = (urlToAdd?: string) => {
    const url = (urlToAdd || customUrlInput).trim();
    if (!url) return;
    setFormData(prev => {
      const all = [prev.mediaUrl, ...prev.additionalPhotos].filter(Boolean);
      if (all.includes(url)) return prev;
      const updated = [...all, url];
      return {
        ...prev,
        mediaType: 'photo',
        mediaUrl: updated[0],
        additionalPhotos: updated.slice(1)
      };
    });
    setCustomUrlInput('');
    setToastMessage({
      text: 'Tautan foto berhasil ditambahkan ke album kegiatan.',
      type: 'success'
    });
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Open Upload Modal
  const handleOpenUpload = () => {
    setFormData({
      title: '',
      date: new Date().toISOString().split('T')[0],
      division: currentUser?.division || 'Bagian Umum',
      mediaType: 'photo',
      mediaUrl: '',
      additionalPhotos: [],
      thumbnailUrl: '',
      narration: '',
      category: 'Rapat & Forum',
      location: 'Aula Lancang Kuning, Kanwil DJPb Riau',
      authorName: currentUser?.fullName || 'Petugas Dokumentasi',
      tagsInput: 'DJPbRiau, Kegiatan'
    });
    setMediaPreview(null);
    setCustomUrlInput('');
    setUploadSourceType('file');
    setIsUploadModalOpen(true);
  };

  // Open Edit Modal (Restricted to Administrator)
  const handleOpenEdit = (item: ActivityGalleryItem) => {
    if (!isAdmin) {
      setToastMessage({
        text: 'Akses Ditolak: Fitur Edit Data dan Narasi Kegiatan hanya kewenangan Administrator.',
        type: 'error'
      });
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    setEditingItem(item);
    setFormData({
      title: item.title,
      date: item.date,
      division: item.division,
      mediaType: item.mediaType,
      mediaUrl: item.mediaUrl,
      additionalPhotos: item.additionalPhotos || [],
      thumbnailUrl: item.thumbnailUrl || '',
      narration: item.narration,
      category: item.category,
      location: item.location || '',
      authorName: item.authorName,
      tagsInput: item.tags ? item.tags.join(', ') : ''
    });
    setMediaPreview(item.mediaUrl);
    setCustomUrlInput('');
    setUploadSourceType(item.mediaUrl.startsWith('data:') ? 'file' : 'url');
  };

  // Submit Handler for Create & Update
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Mohon masukkan Judul Kegiatan.');
      return;
    }
    if (!formData.narration.trim()) {
      alert('Mohon masukkan Narasi atau Kalimat Kegiatan.');
      return;
    }
    if (!formData.mediaUrl.trim()) {
      alert('Mohon pilih minimal 1 file foto/video atau masukkan tautan media.');
      return;
    }

    if (editingItem && !isAdmin) {
      alert('Akses Ditolak: Anda tidak memiliki kewenangan administrator untuk mengedit data atau narasi kegiatan.');
      return;
    }

    const tags = formData.tagsInput
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    if (editingItem) {
      // Update existing item
      const updated: ActivityGalleryItem = {
        ...editingItem,
        title: formData.title.trim(),
        date: formData.date,
        division: formData.division,
        mediaType: formData.mediaType,
        mediaUrl: formData.mediaUrl.trim(),
        additionalPhotos: formData.mediaType === 'photo' && formData.additionalPhotos.length > 0 ? formData.additionalPhotos : [],
        thumbnailUrl: formData.thumbnailUrl.trim() || '',
        narration: formData.narration.trim(),
        category: formData.category,
        location: formData.location.trim() || '',
        authorName: formData.authorName.trim(),
        tags: tags.length > 0 ? tags : []
      };

      const newItems = galleryItems.map(it => it.id === editingItem.id ? updated : it);
      updateAndPersist(newItems);
      await saveFirestoreDoc('activity_gallery', updated);
      setEditingItem(null);
      if (selectedDetailItem?.id === editingItem.id) {
        setSelectedDetailItem(updated);
      }
      setToastMessage({
        text: `Perubahan data, album foto, dan narasi "${updated.title}" berhasil disimpan ke database.`,
        type: 'success'
      });
      setTimeout(() => setToastMessage(null), 3000);
    } else {
      // Create new item
      const newItem: ActivityGalleryItem = {
        id: `act-${Date.now()}`,
        title: formData.title.trim(),
        date: formData.date,
        division: formData.division,
        mediaType: formData.mediaType,
        mediaUrl: formData.mediaUrl.trim(),
        additionalPhotos: formData.mediaType === 'photo' && formData.additionalPhotos.length > 0 ? formData.additionalPhotos : [],
        thumbnailUrl: formData.thumbnailUrl.trim() || '',
        narration: formData.narration.trim(),
        category: formData.category,
        location: formData.location.trim() || '',
        authorName: formData.authorName.trim() || (currentUser?.fullName || 'Petugas Dokumentasi'),
        createdAt: new Date().toISOString(),
        tags: tags.length > 0 ? tags : []
      };

      const newItems = [newItem, ...galleryItems];
      updateAndPersist(newItems);
      await saveFirestoreDoc('activity_gallery', newItem);
      setIsUploadModalOpen(false);
      setToastMessage({
        text: `Dokumentasi baru "${newItem.title}" dengan ${1 + (newItem.additionalPhotos?.length || 0)} foto berhasil dipublikasikan dan tersimpan di database.`,
        type: 'success'
      });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Trigger Single Delete Modal (Restricted to Administrator)
  const promptDeleteItem = (item: ActivityGalleryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAdmin) {
      setToastMessage({
        text: 'Akses Ditolak: Penghapusan dokumentasi kegiatan hanya kewenangan Administrator.',
        type: 'error'
      });
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    setItemToDelete(item);
  };

  // Confirm and Execute Single Item Deletion
  const handleConfirmDelete = () => {
    if (!isAdmin) {
      alert('Akses Ditolak: Hanya Administrator yang berwenang menghapus data kegiatan.');
      return;
    }
    if (!itemToDelete) return;
    const deletedId = String(itemToDelete.id);
    const deletedTitle = itemToDelete.title;

    // 1. Immediately record in persistent deleted blacklist to prevent reappearance
    try {
      const deletedKey = 'melayu_deleted_activity_gallery_ids';
      const stored = localStorage.getItem(deletedKey);
      const deletedList: string[] = stored ? JSON.parse(stored) : [];
      if (!deletedList.includes(deletedId)) {
        deletedList.push(deletedId);
        safeLocalStorageSet(deletedKey, JSON.stringify(deletedList));
      }
    } catch (e) {}

    // 2. Remove from local array state and storage
    const newItems = galleryItems.filter(it => String(it.id) !== deletedId);
    setGalleryItems(newItems);
    safeLocalStorageSet('melayu_activity_gallery', JSON.stringify(newItems));

    // 3. Remove document permanently from Firebase Firestore
    deleteFirestoreDoc('activity_gallery', deletedId);
    if (onDeleteFromFirebase) {
      onDeleteFromFirebase(deletedId);
    }
    if (onSaveToFirebase) {
      onSaveToFirebase(newItems);
    }

    // 4. Remove from selection list if present
    setSelectedIdsForDelete(prev => prev.filter(id => String(id) !== deletedId));

    // 5. Close open modals for that item
    if (selectedDetailItem?.id === deletedId) {
      setSelectedDetailItem(null);
    }
    if (editingItem?.id === deletedId) {
      setEditingItem(null);
    }
    setItemToDelete(null);

    // 6. Feedback toast
    setToastMessage({
      text: `Dokumentasi "${deletedTitle}" telah berhasil dihapus secara permanen.`,
      type: 'success'
    });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Toggle selection for bulk delete
  const toggleSelectForDelete = (id: string, e?: React.MouseEvent | React.ChangeEvent) => {
    if (e) e.stopPropagation();
    if (!isAdmin) return;
    const targetId = String(id);
    setSelectedIdsForDelete(prev => 
      prev.includes(targetId) ? prev.filter(item => item !== targetId) : [...prev, targetId]
    );
  };

  // Select all / Deselect all
  const handleToggleSelectAll = () => {
    if (!isAdmin) return;
    if (selectedIdsForDelete.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedIdsForDelete([]);
    } else {
      setSelectedIdsForDelete(filteredItems.map(it => String(it.id)));
    }
  };

  // Open Bulk Delete Modal (Restricted to Administrator)
  const promptBulkDelete = () => {
    if (!isAdmin) {
      setToastMessage({
        text: 'Akses Ditolak: Penghapusan massal hanya kewenangan Administrator.',
        type: 'error'
      });
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    if (selectedIdsForDelete.length === 0) return;
    setIsBulkDeleteModalOpen(true);
  };

  // Confirm and Execute Bulk Delete
  const handleConfirmBulkDelete = () => {
    if (!isAdmin) {
      alert('Akses Ditolak: Hanya Administrator yang berwenang menghapus data kegiatan.');
      return;
    }
    if (selectedIdsForDelete.length === 0) return;
    const count = selectedIdsForDelete.length;
    const idsSet = new Set(selectedIdsForDelete.map(id => String(id)));

    // 1. Add all selected IDs into persistent deleted blacklist
    try {
      const deletedKey = 'melayu_deleted_activity_gallery_ids';
      const stored = localStorage.getItem(deletedKey);
      const deletedList: string[] = stored ? JSON.parse(stored) : [];
      selectedIdsForDelete.forEach(id => {
        const sId = String(id);
        if (!deletedList.includes(sId)) {
          deletedList.push(sId);
        }
      });
      safeLocalStorageSet(deletedKey, JSON.stringify(deletedList));
    } catch (e) {}

    // 2. Remove all from state & local storage
    const newItems = galleryItems.filter(it => !idsSet.has(String(it.id)));
    setGalleryItems(newItems);
    safeLocalStorageSet('melayu_activity_gallery', JSON.stringify(newItems));

    // 3. Delete all from Firebase
    selectedIdsForDelete.forEach(id => {
      deleteFirestoreDoc('activity_gallery', String(id));
      if (onDeleteFromFirebase) onDeleteFromFirebase(String(id));
    });
    if (onSaveToFirebase) {
      onSaveToFirebase(newItems);
    }

    // 4. Close any open modals
    if (selectedDetailItem && idsSet.has(String(selectedDetailItem.id))) {
      setSelectedDetailItem(null);
    }
    if (editingItem && idsSet.has(String(editingItem.id))) {
      setEditingItem(null);
    }

    setSelectedIdsForDelete([]);
    setIsBulkDeleteModalOpen(false);

    setToastMessage({
      text: `${count} dokumentasi kegiatan telah berhasil dihapus secara permanen.`,
      type: 'success'
    });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Restore Default Initial Gallery Items (Restricted to Administrator)
  const handleRestoreInitialGallery = () => {
    if (!isAdmin) {
      setToastMessage({
        text: 'Akses Ditolak: Pemulihan galeri default hanya kewenangan Administrator.',
        type: 'error'
      });
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    if (confirm('Apakah Anda ingin memulihkan seluruh contoh dokumentasi galeri kegiatan default Kanwil DJPb Riau?')) {
      // Clear deleted blacklist
      localStorage.removeItem('melayu_deleted_activity_gallery_ids');
      localStorage.removeItem('melayu_activity_gallery_seeded_v2');

      updateAndPersist(INITIAL_ACTIVITY_GALLERY);
      setSelectedIdsForDelete([]);
      setToastMessage({
        text: 'Galeri kegiatan berhasil dipulihkan ke data default.',
        type: 'info'
      });
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Filtered gallery items
  const filteredItems = galleryItems.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.narration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.division.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.location && item.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.tags && item.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesMediaType = 
      selectedMediaType === 'all' || item.mediaType === selectedMediaType;

    const matchesCategory = 
      selectedCategory === 'Semua Kategori' || item.category === selectedCategory;

    return matchesSearch && matchesMediaType && matchesCategory;
  });

  const countPhotos = galleryItems.filter(i => i.mediaType === 'photo').length;
  const countVideos = galleryItems.filter(i => i.mediaType === 'video').length;

  const copyNarration = (narration: string, id: string) => {
    navigator.clipboard.writeText(narration);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-sm space-y-6" id="galeri-kegiatan-container">
      {/* 1. Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-xl shadow-xs">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-display font-black text-slate-900 text-sm md:text-base tracking-wider uppercase">
                  GALERI KEGIATAN KANWIL DJPB PROVINSI RIAU
                </h3>
                <span className="bg-blue-100 text-djpb-blue text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-200">
                  DOKUMENTASI & NARASI
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Pusat publikasi dokumentasi foto & video kegiatan resmi, sosialisasi, GKM, dan narasi pelaporan pelaksanaan tugas.
              </p>
            </div>
          </div>
        </div>

        {/* Header Action & Counter Badges */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {/* Role Access Badge */}
          {isAdmin ? (
            <span className="bg-amber-50 text-amber-800 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-amber-200 flex items-center space-x-1 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Akses Administrator</span>
            </span>
          ) : (
            <span className="bg-slate-100 text-slate-600 text-[11px] font-medium px-2.5 py-1.5 rounded-xl border border-slate-200 flex items-center space-x-1">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Akses Pegawai (Lihat)</span>
            </span>
          )}

          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-700">
            <span className="flex items-center space-x-1 text-blue-700 font-bold">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{countPhotos} Foto</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center space-x-1 text-purple-700 font-bold">
              <VideoIcon className="w-3.5 h-3.5" />
              <span>{countVideos} Video</span>
            </span>
          </div>

          {isAdmin ? (
            <button
              onClick={() => {
                setIsDeleteMode(!isDeleteMode);
                if (isDeleteMode) {
                  setSelectedIdsForDelete([]);
                }
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer border ${
                isDeleteMode 
                  ? 'bg-rose-600 border-rose-700 text-white shadow-md ring-2 ring-rose-300' 
                  : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 hover:text-rose-800 shadow-2xs'
              }`}
              id="btn-toggle-delete-mode"
              title="Buka Menu Hapus / Kelola Galeri untuk menghapus satu atau banyak dokumentasi kegiatan (Administrator)"
            >
              <Trash2 className={`w-4 h-4 ${isDeleteMode ? 'text-white' : 'text-rose-600'}`} />
              <span>{isDeleteMode ? 'Tutup Menu Hapus' : 'Menu Hapus / Kelola'}</span>
              {isDeleteMode && selectedIdsForDelete.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-white text-rose-700 font-extrabold rounded-full text-[10px]">
                  {selectedIdsForDelete.length}
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setToastMessage({
                  text: 'Akses Ditolak: Menu Hapus/Kelola Galeri serta Edit Data dan Narasi Kegiatan adalah kewenangan khusus Administrator.',
                  type: 'error'
                });
                setTimeout(() => setToastMessage(null), 4000);
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-500 rounded-xl text-xs font-medium flex items-center space-x-1.5 cursor-pointer transition-colors shadow-2xs"
              title="Menu Hapus / Kelola hanya kewenangan Administrator"
              id="btn-toggle-delete-mode-locked"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Menu Hapus / Kelola</span>
            </button>
          )}

          <button
            onClick={handleOpenUpload}
            className="px-4 py-2 bg-gradient-to-r from-djpb-blue to-blue-700 hover:from-blue-700 hover:to-djpb-blue text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-sm hover:shadow-md cursor-pointer active:scale-95"
            id="btn-upload-kegiatan"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Upload Foto / Video Kegiatan</span>
          </button>
        </div>
      </div>

      {/* Mode Hapus Banner / Toolbar Kontrol */}
      {isDeleteMode && (
        <div className="bg-gradient-to-r from-rose-50 via-rose-100/70 to-amber-50 border-2 border-rose-300 rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 space-y-3" id="banner-mode-hapus">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display font-extrabold text-rose-900 text-sm flex items-center space-x-2">
                  <span>MENU HAPUS & KELOLA GALERI AKTIF</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-200 text-rose-800 font-mono font-bold">
                    {selectedIdsForDelete.length} Dipilih
                  </span>
                </h4>
                <p className="text-xs text-rose-700 font-medium">
                  Klik tombol <strong>Hapus</strong> pada kartu foto/video yang ingin dihapus, atau centang kotak untuk menghapus beberapa item sekaligus.
                </p>
              </div>
            </div>

            {/* Bulk Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-2xs transition-colors"
                id="btn-select-all-delete"
              >
                {selectedIdsForDelete.length === filteredItems.length && filteredItems.length > 0 ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-djpb-blue" />
                    <span>Batal Pilih Semua</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 text-slate-500" />
                    <span>Pilih Semua ({filteredItems.length})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={promptBulkDelete}
                disabled={selectedIdsForDelete.length === 0}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer ${
                  selectedIdsForDelete.length > 0
                    ? 'bg-rose-600 hover:bg-rose-700 text-white active:scale-95 shadow-rose-200'
                    : 'bg-rose-200 text-rose-400 cursor-not-allowed border border-rose-300/60'
                }`}
                id="btn-execute-bulk-delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus {selectedIdsForDelete.length > 0 ? `(${selectedIdsForDelete.length}) Terpilih` : 'Terpilih'}</span>
              </button>

              <button
                type="button"
                onClick={handleRestoreInitialGallery}
                className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                title="Pulihkan data dokumentasi default jika galeri kosong atau perlu reset"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>Pulihkan Default</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDeleteMode(false);
                  setSelectedIdsForDelete([]);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-200 ${
          toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-2xs' : 'bg-blue-50 border-blue-200 text-blue-800 shadow-2xs'
        }`}>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Filter & Search Controls */}
      <div className="space-y-3 bg-slate-50/70 p-3.5 md:p-4 rounded-xl border border-slate-200/80">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari judul kegiatan, narasi, nama unit, pemateri, atau kata kunci..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Media Type Tabs */}
          <div className="flex items-center gap-1.5 shrink-0 bg-white p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setSelectedMediaType('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                selectedMediaType === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua ({galleryItems.length})
            </button>
            <button
              onClick={() => setSelectedMediaType('photo')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                selectedMediaType === 'photo'
                  ? 'bg-djpb-blue text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-blue-50 hover:text-djpb-blue'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Foto ({countPhotos})</span>
            </button>
            <button
              onClick={() => setSelectedMediaType('video')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                selectedMediaType === 'video'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700'
              }`}
            >
              <VideoIcon className="w-3.5 h-3.5" />
              <span>Video ({countVideos})</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center space-x-1 shrink-0">
            <Filter className="w-3 h-3" />
            <span>Kategori:</span>
          </span>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="py-14 text-center text-slate-400 space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <ImageIcon className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-700 text-sm">Tidak ada dokumentasi kegiatan ditemukan.</p>
            <p className="text-xs text-slate-400">
              {searchTerm ? 'Coba ubah kata kunci pencarian Anda.' : 'Klik tombol "+ Upload Foto / Video Kegiatan" di atas untuk menambahkan, atau klik "Pulihkan Default" untuk memuat contoh galeri.'}
            </p>
          </div>
          <div className="flex items-center justify-center space-x-2 pt-2">
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(''); setSelectedCategory('Semua Kategori'); setSelectedMediaType('all'); }}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Reset Filter
              </button>
            )}
            <button
              onClick={handleRestoreInitialGallery}
              className="px-3.5 py-1.5 bg-djpb-blue hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Pulihkan Contoh Galeri</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="gallery-cards-grid">
          {filteredItems.map((item) => {
            const isVideo = item.mediaType === 'video';
            const isSelected = selectedIdsForDelete.includes(item.id);
            const totalPhotos = item.mediaType === 'photo' ? 1 + (item.additionalPhotos?.length || 0) : 1;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col group relative ${
                  isDeleteMode && isSelected 
                    ? 'border-rose-500 ring-3 ring-rose-400/40 shadow-md bg-rose-50/10' 
                    : isDeleteMode 
                      ? 'border-rose-200 hover:border-rose-400 shadow-2xs hover:shadow-md' 
                      : 'border-slate-200/90 shadow-2xs hover:shadow-md'
                }`}
                id={`gallery-item-${item.id}`}
              >
                {/* Media Container */}
                <div 
                  className="relative aspect-video w-full bg-slate-950 overflow-hidden cursor-pointer group"
                  onClick={() => {
                    if (isDeleteMode) {
                      toggleSelectForDelete(item.id);
                    } else {
                      setSelectedDetailItem(item);
                    }
                  }}
                >
                  {isVideo ? (
                    <div className="w-full h-full relative flex items-center justify-center bg-slate-900">
                      {item.thumbnailUrl ? (
                        <img 
                          src={item.thumbnailUrl} 
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                        />
                      ) : (
                        <video 
                          src={item.mediaUrl} 
                          className="w-full h-full object-cover pointer-events-none opacity-80" 
                          preload="metadata"
                        />
                      )}
                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-purple-600/90 group-hover:bg-purple-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full overflow-hidden">
                      <img
                        src={item.mediaUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Gradient Overlay & Badges */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"></div>

                  {/* Top Badges / Checkbox */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                    <div className="flex items-center space-x-1.5">
                      {isDeleteMode && isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => toggleSelectForDelete(item.id, e)}
                          className={`p-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-md ${
                            isSelected ? 'bg-rose-600 text-white ring-2 ring-white' : 'bg-black/60 text-white hover:bg-black/80 border border-white/40'
                          }`}
                          title={isSelected ? 'Batalkan pilihan' : 'Pilih untuk dihapus'}
                        >
                          {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase bg-slate-900/80 text-white backdrop-blur-xs border border-white/20 shadow-xs flex items-center space-x-1">
                        {isVideo ? <VideoIcon className="w-3.5 h-3.5 text-purple-400" /> : <ImageIcon className="w-3.5 h-3.5 text-blue-400" />}
                        <span>{isVideo ? 'Video' : 'Foto'}</span>
                      </span>

                      {/* Multi-Photo Count Badge */}
                      {!isVideo && totalPhotos > 1 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-900/90 text-indigo-100 backdrop-blur-xs border border-indigo-400/40 shadow-xs flex items-center space-x-1">
                          <Images className="w-3 h-3 text-indigo-300" />
                          <span>{totalPhotos} Foto</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {isDeleteMode && isAdmin ? (
                        <button
                          type="button"
                          onClick={(e) => promptDeleteItem(item, e)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded-lg shadow-lg flex items-center space-x-1 cursor-pointer transition-all active:scale-95 border border-white/40"
                          title="Hapus dokumentasi ini sekarang (Administrator)"
                          id={`btn-delete-card-top-${item.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 shadow-xs">
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Image Info */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-white/90 z-10">
                    <span className="flex items-center space-x-1 font-mono font-medium drop-shadow-md">
                      <Calendar className="w-3.5 h-3.5 text-amber-300" />
                      <span>{formatIndonesianDate(item.date)}</span>
                    </span>
                    <span className="text-[10px] font-medium bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded text-slate-200">
                      {item.division}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 md:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    {/* Title */}
                    <h4 
                      onClick={() => {
                        if (isDeleteMode && isAdmin) {
                          toggleSelectForDelete(item.id);
                        } else {
                          setSelectedDetailItem(item);
                        }
                      }}
                      className="font-display font-bold text-slate-900 text-sm leading-snug group-hover:text-djpb-blue transition-colors line-clamp-2 cursor-pointer"
                    >
                      {item.title}
                    </h4>

                    {/* Location if any */}
                    {item.location && (
                      <p className="text-[11px] text-slate-500 flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </p>
                    )}

                    {/* Narasi atau Kalimat Kegiatan (Activity Narration) */}
                    <div className="bg-slate-50 border-l-2 border-djpb-blue/60 rounded-r-lg p-2.5 text-xs text-slate-700 leading-relaxed relative">
                      <p className="line-clamp-3 italic text-slate-600 font-sans">
                        "{item.narration}"
                      </p>
                    </div>

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.tags.map((tag, idx) => (
                          <span 
                            key={idx} 
                            className="text-[10px] bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-0.5 rounded-md font-mono"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Meta & Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate max-w-[110px] font-medium">{item.authorName}</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setSelectedDetailItem(item)}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-djpb-blue font-bold rounded-lg text-[11px] transition-colors flex items-center space-x-1 cursor-pointer"
                        title="Lihat Foto/Video & Narasi Lengkap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Buka</span>
                      </button>

                      {/* Administrator Only: Edit Data & Narasi Kegiatan */}
                      {isAdmin && !isDeleteMode && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Data & Narasi Kegiatan (Kewenangan Administrator)"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Administrator Only: Hapus Kegiatan */}
                      {isAdmin && (
                        <button
                          onClick={(e) => promptDeleteItem(item, e)}
                          className={`px-2.5 py-1 font-bold rounded-lg text-[11px] transition-all cursor-pointer flex items-center space-x-1 ${
                            isDeleteMode 
                              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs' 
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                          }`}
                          title="Hapus Dokumentasi Kegiatan Ini (Kewenangan Administrator)"
                          id={`btn-delete-card-${item.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. MODAL: UPLOAD / EDIT KEGIATAN */}
      {(isUploadModalOpen || editingItem) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto" id="modal-upload-kegiatan">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 p-5 md:p-6 flex items-center justify-between z-10">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-50 text-djpb-blue rounded-2xl border border-blue-100">
                  {editingItem ? <Edit3 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base">
                    {editingItem ? 'Edit Dokumentasi & Narasi Kegiatan' : 'Upload Foto / Video & Narasi Kegiatan'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {editingItem ? 'Perbarui rincian, album foto, atau narasi kegiatan' : 'Lengkapi banyak foto/video dan teks narasi pelaksanaan kegiatan'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setIsUploadModalOpen(false); setEditingItem(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-5 md:p-6 space-y-5 text-xs text-slate-700">
              {/* Media Type Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center space-x-1.5">
                  <span>Jenis Media:</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, mediaType: 'photo' }))}
                    className={`p-3 rounded-xl border flex items-center justify-center space-x-2 font-bold cursor-pointer transition-all ${
                      formData.mediaType === 'photo'
                        ? 'bg-blue-50 border-djpb-blue text-djpb-blue ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Dokumentasi Foto (Bisa Banyak Foto)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, mediaType: 'video' }))}
                    className={`p-3 rounded-xl border flex items-center justify-center space-x-2 font-bold cursor-pointer transition-all ${
                      formData.mediaType === 'video'
                        ? 'bg-purple-50 border-purple-600 text-purple-700 ring-2 ring-purple-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <VideoIcon className="w-4 h-4" />
                    <span>Dokumentasi Video</span>
                  </button>
                </div>
              </div>

              {/* Media Upload / Source */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <span>{formData.mediaType === 'photo' ? 'Upload Foto Kegiatan (Bisa Lebih Dari 1 Foto):' : 'Upload File atau Masukkan URL Video:'}</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center space-x-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setUploadSourceType('file')}
                      className={`font-semibold cursor-pointer ${uploadSourceType === 'file' ? 'text-djpb-blue underline' : 'text-slate-400'}`}
                    >
                      Pilih File Komputer/HP
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setUploadSourceType('url')}
                      className={`font-semibold cursor-pointer ${uploadSourceType === 'url' ? 'text-djpb-blue underline' : 'text-slate-400'}`}
                    >
                      Tautan URL / Embed
                    </button>
                  </div>
                </div>

                {uploadSourceType === 'file' ? (
                  <div className="space-y-3">
                    <div 
                      onClick={() => !isCompressingMedia && fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all space-y-2 group ${
                        isCompressingMedia 
                          ? 'border-amber-400 bg-amber-50/50 cursor-wait' 
                          : 'border-blue-300 hover:border-djpb-blue bg-blue-50/20 hover:bg-blue-50/40 cursor-pointer'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple={formData.mediaType === 'photo'}
                        disabled={isCompressingMedia}
                        accept={formData.mediaType === 'photo' ? 'image/*' : 'video/*'}
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="w-12 h-12 bg-white rounded-2xl shadow-2xs border border-slate-200 flex items-center justify-center mx-auto text-slate-500 group-hover:text-djpb-blue group-hover:border-blue-300 transition-all">
                        {isCompressingMedia ? (
                          <RotateCcw className="w-6 h-6 text-amber-600 animate-spin" />
                        ) : (
                          <Upload className="w-6 h-6" />
                        )}
                      </div>
                      {isCompressingMedia ? (
                        <div className="space-y-1">
                          <p className="font-bold text-amber-800 text-xs animate-pulse">
                            {compressProgress || 'Mengompresi dan mengoptimalkan foto agar tajam & hemat memori...'}
                          </p>
                          <p className="text-[10px] text-amber-600">Mohon tunggu sebentar...</p>
                        </div>
                      ) : (
                        <>
                          <p className="font-bold text-slate-800 text-xs">
                            {formData.mediaType === 'photo' 
                              ? 'Klik atau seret untuk memilih foto kegiatan (Bisa pilih banyak foto sekaligus)' 
                              : 'Klik untuk memilih file Video (MP4, WebM)'}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {formData.mediaType === 'photo'
                              ? '✨ Mendukung multi-selection (JPG, PNG, WebP). Seluruh foto otomatis dikompresi beresolusi tinggi.'
                              : 'Maksimal ukuran video langsung 15 MB. Untuk video besar gunakan tautan embed.'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={formData.mediaType === 'photo' ? customUrlInput : formData.mediaUrl}
                        onChange={(e) => {
                          if (formData.mediaType === 'photo') {
                            setCustomUrlInput(e.target.value);
                          } else {
                            setFormData(prev => ({ ...prev, mediaUrl: e.target.value }));
                            setMediaPreview(e.target.value);
                          }
                        }}
                        placeholder={`Masukkan link ${formData.mediaType === 'photo' ? 'gambar (https://...)' : 'video (mp4 / youtube / google drive)'}`}
                        className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      {formData.mediaType === 'photo' && (
                        <button
                          type="button"
                          onClick={() => handleAddPhotoUrl()}
                          className="px-4 py-2.5 bg-djpb-blue hover:bg-djpb-blue-light text-white font-bold rounded-xl text-xs transition-colors shrink-0 flex items-center space-x-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Foto</span>
                        </button>
                      )}
                    </div>
                    
                    {/* Quick Preset Samples */}
                    {formData.mediaType === 'photo' && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400 font-medium">Contoh template foto:</span>
                        {PRESET_PHOTOS.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddPhotoUrl(p.url)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-djpb-blue border border-slate-200 rounded text-[10px] font-medium cursor-pointer"
                          >
                            + {p.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* MULTI-PHOTO PREVIEW & ALBUM MANAGER */}
                {formData.mediaType === 'photo' ? (
                  (() => {
                    const allPhotos = [formData.mediaUrl, ...formData.additionalPhotos].filter(Boolean);
                    if (allPhotos.length === 0) return null;

                    return (
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Images className="w-4 h-4 text-djpb-blue" />
                            <span className="font-bold text-slate-800 text-xs">
                              Album Foto Kegiatan ({allPhotos.length} Foto Siap Dipublikasikan):
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[11px] text-djpb-blue font-bold hover:underline flex items-center space-x-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Foto Lain</span>
                          </button>
                        </div>

                        {/* Photos Grid in Upload Modal */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                          {allPhotos.map((pUrl, pIdx) => {
                            const isCover = pIdx === 0;

                            return (
                              <div 
                                key={pIdx} 
                                className={`relative aspect-video rounded-xl overflow-hidden border-2 bg-slate-900 group shadow-xs ${
                                  isCover ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-slate-200'
                                }`}
                              >
                                <img src={pUrl} alt={`Foto ${pIdx + 1}`} className="w-full h-full object-cover" />
                                
                                {/* Overlay Badges */}
                                <div className="absolute top-1 left-1 z-10">
                                  {isCover ? (
                                    <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 font-extrabold text-[9px] rounded-md shadow-xs flex items-center space-x-0.5">
                                      <Star className="w-2.5 h-2.5 fill-current" />
                                      <span>Cover Utama</span>
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 bg-black/60 text-white font-mono text-[9px] rounded-md">
                                      #{pIdx + 1}
                                    </span>
                                  )}
                                </div>

                                {/* Action Buttons Overlay */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1.5 p-1 z-20">
                                  {!isCover && (
                                    <button
                                      type="button"
                                      onClick={() => handleSetCoverPhoto(pIdx)}
                                      className="px-2 py-1 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-[9px] flex items-center space-x-0.5 shadow-md cursor-pointer transition-transform active:scale-95"
                                      title="Jadikan Sebagai Foto Cover Utama"
                                    >
                                      <Star className="w-2.5 h-2.5" />
                                      <span>Cover</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePhoto(pIdx)}
                                    className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-transform active:scale-95 cursor-pointer shadow-md"
                                    title="Hapus Foto Ini Dari Album"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-slate-400 italic">
                          * Tip: Foto pertama bertanda "Cover Utama" akan menjadi tampilan utama pada galeri. Anda dapat mengubah cover dengan mengklik tombol pada foto di atas.
                        </p>
                      </div>
                    );
                  })()
                ) : (
                  /* Video Preview */
                  mediaPreview && (
                    <div className="p-3 bg-slate-100 rounded-xl space-y-1.5 border border-slate-200">
                      <p className="text-[11px] font-bold text-slate-600 flex items-center space-x-1">
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Preview Video Terpilih:</span>
                      </p>
                      <div className="aspect-video max-h-48 rounded-lg overflow-hidden bg-black flex items-center justify-center">
                        <video src={mediaPreview} controls className="w-full h-full object-contain" />
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Judul Kegiatan */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800">
                  Judul Kegiatan: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Contoh: Rapat Evaluasi Capaian IKPA Satker Lingkup Kanwil DJPb Riau"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Tanggal & Kategori Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800">
                    Tanggal Pelaksanaan: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800">
                    Kategori Kegiatan: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {CATEGORIES.filter(c => c !== 'Semua Kategori').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Unit & Lokasi Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800">
                    Unit / Bagian / Bidang Penyelenggara: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.division}
                    onChange={(e) => setFormData(prev => ({ ...prev, division: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {DIVISIONS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800">
                    Lokasi Pelaksanaan:
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Contoh: Aula Lancang Kuning / Ruang Rapat Zapin"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Narasi atau Kalimat Kegiatan (REQUIRED AS REQUESTED) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <MessageSquareQuote className="w-4 h-4 text-djpb-blue" />
                    <span>Narasi atau Kalimat Kegiatan: <span className="text-rose-500">*</span></span>
                  </label>
                  <span className="text-[10px] text-slate-400">Deskripsi/laporan ringkas kegiatan</span>
                </div>
                <textarea
                  required
                  rows={4}
                  value={formData.narration}
                  onChange={(e) => setFormData(prev => ({ ...prev, narration: e.target.value }))}
                  placeholder="Tuliskan narasi lengkap kegiatan, latar belakang, jalannya acara, kesimpulan, atau kutipan arahan pimpinan..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                />
              </div>

              {/* Nama Pengunggah & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800">
                    Nama Petugas Dokumentasi / Pelapor:
                  </label>
                  <input
                    type="text"
                    value={formData.authorName}
                    onChange={(e) => setFormData(prev => ({ ...prev, authorName: e.target.value }))}
                    placeholder="Nama pengunggah"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800">
                    Tag / Label (Pisahkan dengan koma):
                  </label>
                  <input
                    type="text"
                    value={formData.tagsInput}
                    onChange={(e) => setFormData(prev => ({ ...prev, tagsInput: e.target.value }))}
                    placeholder="Contoh: Rapat, Sosialisasi, IKPA"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {editingItem && isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        const it = editingItem;
                        promptDeleteItem(it);
                      }}
                      className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center space-x-1.5 border border-rose-200"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Hapus Kegiatan</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => { setIsUploadModalOpen(false); setEditingItem(null); }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-djpb-blue hover:bg-djpb-blue-light text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center space-x-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{editingItem ? 'Simpan Perubahan' : 'Publikasikan ke Galeri'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: DETAIL & LIGHTBOX VIEW (MULTI-PHOTO CAROUSEL & ALBUM) */}
      {selectedDetailItem && (() => {
        const currentPhotos = selectedDetailItem.mediaType === 'photo' 
          ? [selectedDetailItem.mediaUrl, ...(selectedDetailItem.additionalPhotos || [])].filter(Boolean)
          : [selectedDetailItem.mediaUrl];
        const currentPhotoUrl = currentPhotos[activeDetailPhotoIdx] || selectedDetailItem.mediaUrl;

        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-3 md:p-6 overflow-y-auto" id="modal-detail-kegiatan">
            <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative">
              {/* Close Button */}
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="absolute top-3 right-3 z-30 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Left Media Area */}
              <div className="md:w-3/5 bg-slate-950 flex flex-col justify-between p-3 relative min-h-[320px] md:min-h-[500px]">
                {/* Media Presentation Box */}
                <div className="flex-1 relative flex items-center justify-center overflow-hidden rounded-xl bg-black">
                  {selectedDetailItem.mediaType === 'video' ? (
                    <video
                      src={selectedDetailItem.mediaUrl}
                      controls
                      autoPlay
                      className="w-full max-h-[440px] object-contain rounded-xl"
                    />
                  ) : (
                    <img
                      src={currentPhotoUrl}
                      alt={`${selectedDetailItem.title} - Foto ${activeDetailPhotoIdx + 1}`}
                      className="w-full max-h-[440px] object-contain rounded-xl transition-all duration-300 select-none"
                    />
                  )}

                  {/* Multi-Photo Carousel Arrows */}
                  {selectedDetailItem.mediaType === 'photo' && currentPhotos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDetailPhotoIdx(prev => (prev - 1 + currentPhotos.length) % currentPhotos.length);
                        }}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2.5 bg-black/70 hover:bg-black/90 text-white rounded-full transition-all cursor-pointer shadow-lg backdrop-blur-xs border border-white/20 active:scale-90 z-20"
                        title="Foto Sebelumnya (Panah Kiri)"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDetailPhotoIdx(prev => (prev + 1) % currentPhotos.length);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 bg-black/70 hover:bg-black/90 text-white rounded-full transition-all cursor-pointer shadow-lg backdrop-blur-xs border border-white/20 active:scale-90 z-20"
                        title="Foto Berikutnya (Panah Kanan)"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  {/* Top-Left Counter Badge */}
                  {selectedDetailItem.mediaType === 'photo' && currentPhotos.length > 1 && (
                    <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-xs text-white px-3 py-1 rounded-xl text-[11px] font-mono border border-white/20 flex items-center space-x-1.5 shadow-md z-10">
                      <Images className="w-3.5 h-3.5 text-amber-400" />
                      <span>Foto {activeDetailPhotoIdx + 1} dari {currentPhotos.length}</span>
                    </div>
                  )}

                  {/* Watermark Tag */}
                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white/90 px-3 py-1 rounded-lg text-[10px] font-mono border border-white/10 flex items-center space-x-1.5 z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span>Dokumentasi Kanwil DJPb Prov. Riau</span>
                  </div>
                </div>

                {/* Bottom Thumbnails Strip for Multi-Photo Items */}
                {selectedDetailItem.mediaType === 'photo' && currentPhotos.length > 1 && (
                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center space-x-2 overflow-x-auto pb-1 px-1">
                    {currentPhotos.map((photoUrl, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setActiveDetailPhotoIdx(pIdx)}
                        className={`w-14 h-11 rounded-lg overflow-hidden shrink-0 transition-all border-2 cursor-pointer relative ${
                          activeDetailPhotoIdx === pIdx
                            ? 'border-amber-400 ring-2 ring-amber-400/50 scale-105 opacity-100 shadow-md'
                            : 'border-white/20 hover:border-white/60 opacity-60 hover:opacity-90'
                        }`}
                        title={`Lihat Foto ${pIdx + 1}`}
                      >
                        <img src={photoUrl} alt={`Thumbnail ${pIdx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[8px] font-mono px-1 rounded">
                          #{pIdx + 1}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Information & Narration Area */}
              <div className="md:w-2/5 p-6 flex flex-col justify-between space-y-4 bg-white overflow-y-auto text-xs">
                <div className="space-y-3">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedDetailItem.mediaType === 'video' ? (
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-purple-700 text-white uppercase tracking-wider">
                        Video Kegiatan
                      </span>
                    ) : currentPhotos.length > 1 ? (
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-indigo-700 text-white flex items-center space-x-1">
                        <Images className="w-3 h-3" />
                        <span>Album {currentPhotos.length} Foto Kegiatan</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-djpb-blue text-white uppercase tracking-wider">
                        Dokumentasi Foto
                      </span>
                    )}

                    <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-900">
                      {selectedDetailItem.category}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-display font-extrabold text-slate-900 text-base leading-snug">
                    {selectedDetailItem.title}
                  </h3>

                  {/* Metadata List */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-2 text-[11px] text-slate-600">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-djpb-blue shrink-0" />
                      <span><strong>Tanggal:</strong> {formatIndonesianDate(selectedDetailItem.date, true)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span><strong>Penyelenggara:</strong> {selectedDetailItem.division}</span>
                    </div>
                    {selectedDetailItem.location && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span><strong>Lokasi:</strong> {selectedDetailItem.location}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span><strong>Dokumentasi Oleh:</strong> {selectedDetailItem.authorName}</span>
                    </div>
                  </div>

                  {/* Complete Narration Box */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-900 flex items-center space-x-1.5">
                        <MessageSquareQuote className="w-4 h-4 text-djpb-blue" />
                        <span>Narasi Kegiatan:</span>
                      </label>
                      <button
                        onClick={() => copyNarration(selectedDetailItem.narration, selectedDetailItem.id)}
                        className="text-[10px] text-djpb-blue hover:underline font-bold flex items-center space-x-1 cursor-pointer"
                      >
                        <span>{copiedId === selectedDetailItem.id ? 'Tersalin!' : 'Salin Teks Narasi'}</span>
                      </button>
                    </div>
                    <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3.5 text-slate-700 leading-relaxed font-sans text-xs">
                      <p className="whitespace-pre-line">{selectedDetailItem.narration}</p>
                    </div>
                  </div>

                  {/* Tags */}
                  {selectedDetailItem.tags && selectedDetailItem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {selectedDetailItem.tags.map((t, idx) => (
                        <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Modal Footer Controls */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {/* Unduh Foto Aktif */}
                    <a
                      href={currentPhotoUrl}
                      download={`Dokumentasi_${selectedDetailItem.title.substring(0, 30)}.jpg`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                      title="Unduh / Buka Foto Beresolusi Penuh"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh</span>
                    </a>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => {
                            const it = selectedDetailItem;
                            promptDeleteItem(it);
                          }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center space-x-1 border border-rose-200"
                          title="Hapus Dokumentasi Kegiatan Ini (Administrator)"
                          id="btn-delete-detail-modal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>

                        <button
                          onClick={() => {
                            const it = selectedDetailItem;
                            setSelectedDetailItem(null);
                            handleOpenEdit(it);
                          }}
                          className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center space-x-1"
                          title="Edit Data & Narasi Kegiatan (Administrator)"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setSelectedDetailItem(null)}
                      className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 6. MODAL: KONFIRMASI HAPUS SINGLE DOKUMENTASI (CUSTOM MODAL DIALOG) */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-150" id="modal-confirm-delete-gallery">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border-2 border-rose-200 animate-in zoom-in-95 duration-150 relative">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="font-display font-bold text-slate-900 text-base">
                  Hapus Dokumentasi Kegiatan?
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Apakah Anda yakin ingin menghapus data dokumentasi dan narasi kegiatan ini dari Galeri Kanwil DJPb Riau? Data yang dihapus tidak dapat dipulihkan kembali.
                </p>
              </div>
            </div>

            {/* Preview of item to delete */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-djpb-blue text-white uppercase">
                  {itemToDelete.mediaType === 'video' ? 'Video' : 'Foto'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-700">
                  {itemToDelete.category}
                </span>
              </div>
              <p className="font-bold text-slate-900 line-clamp-2">{itemToDelete.title}</p>
              <div className="flex items-center space-x-3 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                <span>📅 {formatIndonesianDate(itemToDelete.date)}</span>
                <span>•</span>
                <span className="truncate">🏢 {itemToDelete.division}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md cursor-pointer flex items-center space-x-1.5 active:scale-95"
                id="btn-confirm-delete-gallery-yes"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: KONFIRMASI HAPUS BATCH / MASSAL */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-150" id="modal-confirm-bulk-delete-gallery">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border-2 border-rose-200 animate-in zoom-in-95 duration-150 relative">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="font-display font-bold text-slate-900 text-base">
                  Hapus {selectedIdsForDelete.length} Dokumentasi Terpilih?
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Apakah Anda yakin ingin menghapus sebanyak <strong>{selectedIdsForDelete.length}</strong> foto/video kegiatan yang telah dicentang dari Galeri Kanwil DJPb Riau?
                </p>
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-800 space-y-1">
              <p className="font-bold flex items-center space-x-1">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Peringatan Penghapusan Masal:</span>
              </p>
              <p className="text-[11px] leading-relaxed text-rose-700">
                Data foto, video, dan narasi yang dihapus akan dibersihkan secara permanen dari basis data sistem.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md cursor-pointer flex items-center space-x-1.5 active:scale-95"
                id="btn-confirm-bulk-delete-yes"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus {selectedIdsForDelete.length} Item</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
