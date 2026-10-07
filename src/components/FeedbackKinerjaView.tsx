import React, { useState, useEffect } from 'react';
import { 
  Plus, ChevronLeft, ChevronRight, MessageSquare, 
  Trash2, Edit3, Check, X, Star,
  CheckCircle2, Eye, CheckSquare, Clock, AlertCircle,
  FileCheck, ShieldCheck, Filter
} from 'lucide-react';
import { KinerjaFeedbackItem, CurrentUser } from '../types';
import { INITIAL_KINERJA_FEEDBACK } from '../mockData';
import { 
  saveFirestoreDoc, 
  deleteFirestoreDoc, 
  subscribeFirestoreCollection 
} from '../lib/firebase';
import { safeLocalStorageSet, safeLocalStorageGet } from '../lib/storage';

interface FeedbackKinerjaViewProps {
  currentUser?: CurrentUser | null;
  isEditMode?: boolean;
}

export default function FeedbackKinerjaView({ 
  currentUser, 
  isEditMode = false 
}: FeedbackKinerjaViewProps) {
  const isAdmin = isEditMode || currentUser?.role === 'admin';

  // 1. Core State with LocalStorage & Firestore Real-time Sync
  const [feedbackList, setFeedbackList] = useState<KinerjaFeedbackItem[]>(() => {
    return safeLocalStorageGet<KinerjaFeedbackItem[]>('melayu_kinerja_feedback_items', INITIAL_KINERJA_FEEDBACK);
  });

  useEffect(() => {
    const unsubscribe = subscribeFirestoreCollection<KinerjaFeedbackItem>(
      'kinerja_feedbacks',
      INITIAL_KINERJA_FEEDBACK,
      (data) => {
        if (Array.isArray(data) && data.length > 0) {
          // Sort by number / date
          const sorted = [...data].sort((a, b) => (a.no || 0) - (b.no || 0));
          setFeedbackList(sorted);
        }
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    safeLocalStorageSet('melayu_kinerja_feedback_items', JSON.stringify(feedbackList));
  }, [feedbackList]);

  // 2. Status Filter
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Belum Ditindaklanjuti' | 'Dalam Proses' | 'Selesai'>('Semua');

  // 3. Pagination State
  const itemsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(1);

  // 4. Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<KinerjaFeedbackItem | null>(null);
  const [editingItem, setEditingItem] = useState<KinerjaFeedbackItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<KinerjaFeedbackItem | null>(null);
  const [tindakLanjutItem, setTindakLanjutItem] = useState<KinerjaFeedbackItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tindak Lanjut Form State
  const [tindakLanjutForm, setTindakLanjutForm] = useState({
    status: 'Selesai' as 'Belum Ditindaklanjuti' | 'Dalam Proses' | 'Selesai' | 'Ditolak',
    tindakLanjut: '',
    tindakLanjutBy: '',
    tindakLanjutDate: ''
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 5. Add Form State
  const [addForm, setAddForm] = useState({
    workspaceName: 'Dashboard Integrasi Layanan Kinerja',
    feedbackText: '',
    authorName: currentUser?.fullName || '',
    authorDivision: currentUser?.division || 'Bagian Umum',
    rating: 5,
    date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  });

  // Filtered List
  const filteredList = feedbackList.filter(item => {
    if (statusFilter === 'Semua') return true;
    const itemStatus = item.status || 'Belum Ditindaklanjuti';
    return itemStatus === statusFilter;
  });

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const paginatedItems = filteredList.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevPage = () => {
    if (validCurrentPage > 1) {
      setCurrentPage(validCurrentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (validCurrentPage < totalPages) {
      setCurrentPage(validCurrentPage + 1);
    }
  };

  // Submit new feedback
  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.feedbackText.trim()) return;

    const maxNo = feedbackList.reduce((max, item) => Math.max(max, item.no || 0), 0);
    const newFeedback: KinerjaFeedbackItem = {
      id: `kfb-${Date.now()}`,
      no: maxNo + 1,
      workspaceName: addForm.workspaceName.trim() || 'Dashboard Integrasi Layanan Kinerja',
      feedbackText: addForm.feedbackText.trim(),
      date: addForm.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      authorName: addForm.authorName || currentUser?.fullName || 'Pegawai',
      authorDivision: addForm.authorDivision || 'Kanwil DJPb Riau',
      rating: addForm.rating,
      status: 'Belum Ditindaklanjuti'
    };

    const updated = [newFeedback, ...feedbackList].map((item, idx) => ({ ...item, no: idx + 1 }));
    setFeedbackList(updated);
    setShowAddModal(false);
    setAddForm({
      workspaceName: 'Dashboard Integrasi Layanan Kinerja',
      feedbackText: '',
      authorName: currentUser?.fullName || '',
      authorDivision: currentUser?.division || 'Bagian Umum',
      rating: 5,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    });

    try {
      await saveFirestoreDoc('kinerja_feedbacks', newFeedback);
      showToast('Masukan & feedback sarana layanan kinerja berhasil disimpan!');
    } catch (err) {
      console.error('Failed to save to firestore:', err);
      showToast('Tersimpan di perangkat lokal.');
    }
  };

  // Open Tindak Lanjut Modal
  const handleOpenTindakLanjut = (item: KinerjaFeedbackItem) => {
    setTindakLanjutItem(item);
    setTindakLanjutForm({
      status: (item.status as any) || 'Selesai',
      tindakLanjut: item.tindakLanjut || '',
      tindakLanjutBy: item.tindakLanjutBy || currentUser?.fullName || 'Subbagian Penilaian Kinerja',
      tindakLanjutDate: item.tindakLanjutDate || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    });
  };

  // Submit Tindak Lanjut
  const handleSaveTindakLanjut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tindakLanjutItem) return;

    const updatedItem: KinerjaFeedbackItem = {
      ...tindakLanjutItem,
      status: tindakLanjutForm.status,
      tindakLanjut: tindakLanjutForm.tindakLanjut.trim(),
      tindakLanjutBy: tindakLanjutForm.tindakLanjutBy.trim() || currentUser?.fullName || 'Admin Layanan Kinerja',
      tindakLanjutDate: tindakLanjutForm.tindakLanjutDate.trim() || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    };

    const updated = feedbackList.map(item => item.id === tindakLanjutItem.id ? updatedItem : item);
    setFeedbackList(updated);
    
    // Update selectedDetail if open
    if (selectedDetail && selectedDetail.id === tindakLanjutItem.id) {
      setSelectedDetail(updatedItem);
    }

    setTindakLanjutItem(null);

    try {
      await saveFirestoreDoc('kinerja_feedbacks', updatedItem);
      showToast('Tindak lanjut feedback berhasil disimpan!');
    } catch (err) {
      console.error('Failed to update tindak lanjut in firestore:', err);
      showToast('Tindak lanjut tersimpan di penyimpanan lokal.');
    }
  };

  // Submit edit feedback
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updated = feedbackList.map(item => item.id === editingItem.id ? editingItem : item);
    setFeedbackList(updated);
    setEditingItem(null);

    try {
      await saveFirestoreDoc('kinerja_feedbacks', editingItem);
      showToast('Perubahan data feedback berhasil disimpan!');
    } catch (err) {
      console.error('Failed to update firestore:', err);
      showToast('Perubahan tersimpan di perangkat lokal.');
    }
  };

  // Delete feedback
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    const filtered = feedbackList.filter(item => item.id !== deletingItem.id);
    const reindexed = filtered.map((item, idx) => ({ ...item, no: idx + 1 }));
    setFeedbackList(reindexed);
    setDeletingItem(null);

    try {
      await deleteFirestoreDoc('kinerja_feedbacks', deletingItem.id);
      showToast('Data feedback berhasil dihapus.');
    } catch (err) {
      console.error('Failed to delete in firestore:', err);
      showToast('Data dihapus dari penyimpanan lokal.');
    }
  };

  // Helper badge renderer
  const renderStatusBadge = (status?: string, isYellowRow: boolean = false) => {
    const s = status || 'Belum Ditindaklanjuti';
    if (s === 'Selesai') {
      return (
        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs ${
          isYellowRow 
            ? 'bg-emerald-800 text-emerald-100 border border-emerald-700' 
            : 'bg-emerald-500 text-white border border-emerald-400'
        }`}>
          <CheckCircle2 className="w-3 h-3" />
          <span>Selesai</span>
        </span>
      );
    }
    if (s === 'Dalam Proses') {
      return (
        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs ${
          isYellowRow 
            ? 'bg-amber-900 text-amber-100 border border-amber-800' 
            : 'bg-amber-400 text-slate-900 border border-amber-300'
        }`}>
          <Clock className="w-3 h-3" />
          <span>Dalam Proses</span>
        </span>
      );
    }
    if (s === 'Ditolak') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-700 text-white shadow-xs">
          <X className="w-3 h-3" />
          <span>Ditolak</span>
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
        isYellowRow 
          ? 'bg-slate-900 text-slate-100 border border-slate-700' 
          : 'bg-white/20 text-white border border-white/30 backdrop-blur-xs'
      }`}>
        <AlertCircle className="w-3 h-3" />
        <span>Belum Ditindaklanjuti</span>
      </span>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12" id="feedback-kinerja-container">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 flex items-center space-x-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP HEADER TITLE & ACTION                                              */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center space-x-2 justify-center sm:justify-start">
              <h2 className="text-base md:text-lg font-display font-bold text-slate-800">
                Feedback Layanan Kinerja
              </h2>
              {isAdmin && (
                <span className="px-2 py-0.5 bg-blue-100 text-djpb-blue text-[10px] font-bold rounded-md uppercase tracking-wider">
                  Mode Admin
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Masukan Layanan Kinerja & Tindak Lanjut Pengelola
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-add-kinerja-feedback"
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-1 px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Beri Masukan / Feedback Baru</span>
            </button>
          </div>
        </div>

        {/* Filter Pills for Status Tindak Lanjut */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-1 text-xs font-semibold text-slate-600">
            <Filter className="w-3.5 h-3.5 text-djpb-blue" />
            <span className="text-[11px] text-slate-500 mr-1">Status Tindak Lanjut:</span>
            {(['Semua', 'Belum Ditindaklanjuti', 'Dalam Proses', 'Selesai'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#0A2540] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Total: <strong>{filteredList.length}</strong> masukan
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TABLE DATA WITH ALTERNATING YELLOW & BLUE ROWS                         */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden" id="feedback-table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="table-feedback-sarana">
            <thead>
              <tr className="bg-[#0A2540] text-white text-xs sm:text-sm font-bold border-b border-[#0A2540]">
                <th className="py-3 px-3.5 text-center w-12 border-r border-[#123860]"></th>
                <th className="py-3 px-4 font-bold tracking-wide w-56 sm:w-64 border-r border-[#123860]">
                  Sarana Layanan Kinerja
                </th>
                <th className="py-3 px-4 font-bold tracking-wide border-r border-[#123860]">
                  Masukan & Saran
                </th>
                <th className="py-3 px-4 font-bold tracking-wide w-48 border-r border-[#123860]">
                  Status & Tindak Lanjut
                </th>
                <th className="py-3 px-4 font-bold tracking-wide w-32 sm:w-36 text-left border-r border-[#123860]">
                  Tanggal
                </th>
                {isAdmin && (
                  <th className="py-3 px-3 text-center w-28 bg-[#071d33]">
                    Aksi Admin
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-slate-500 text-xs bg-slate-50">
                    <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                    <p className="font-semibold">Tidak ada masukan layanan kinerja dengan status "{statusFilter}".</p>
                    {statusFilter !== 'Semua' ? (
                      <button 
                        type="button" 
                        onClick={() => setStatusFilter('Semua')}
                        className="mt-2 text-djpb-blue text-xs font-bold hover:underline cursor-pointer"
                      >
                        Tampilkan Semua Masukan
                      </button>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => setShowAddModal(true)}
                        className="mt-2 text-djpb-blue text-xs font-bold hover:underline cursor-pointer"
                      >
                        Beri Masukan Pertama
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => {
                  const isYellow = index % 2 === 0;

                  return (
                    <tr 
                      key={item.id}
                      onClick={() => setSelectedDetail(item)}
                      className={`cursor-pointer transition-all border-b ${
                        isYellow 
                          ? 'bg-[#FFCC00] hover:bg-[#e6b800] text-slate-950 border-amber-400' 
                          : 'bg-[#0070EB] hover:bg-[#0060cb] text-white border-blue-600'
                      }`}
                    >
                      {/* Column 1: Row Number */}
                      <td className="py-3 px-3.5 text-center font-extrabold text-xs sm:text-sm select-none border-r border-black/10">
                        {item.no}.
                      </td>

                      {/* Column 2: Sarana Layanan Kinerja */}
                      <td className="py-3 px-4 font-bold text-xs sm:text-sm border-r border-black/10">
                        <div>{item.workspaceName}</div>
                        {item.authorName && (
                          <div className={`text-[11px] font-normal mt-0.5 opacity-90 ${isYellow ? 'text-slate-800' : 'text-blue-100'}`}>
                            Oleh: {item.authorName}
                          </div>
                        )}
                      </td>

                      {/* Column 3: Masukan */}
                      <td className="py-3 px-4 text-xs sm:text-sm font-medium border-r border-black/10">
                        <div className="line-clamp-2 leading-snug">
                          {item.feedbackText}
                        </div>
                      </td>

                      {/* Column 4: Status & Tindak Lanjut */}
                      <td className="py-3 px-4 text-xs border-r border-black/10">
                        <div className="space-y-1">
                          {renderStatusBadge(item.status, isYellow)}
                          {item.tindakLanjut && (
                            <p className={`text-[11px] line-clamp-1 italic font-normal ${
                              isYellow ? 'text-slate-900' : 'text-blue-50'
                            }`}>
                              "{item.tindakLanjut}"
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Column 5: Tanggal */}
                      <td className="py-3 px-4 text-xs sm:text-sm font-semibold whitespace-nowrap border-r border-black/10">
                        {item.date}
                      </td>

                      {/* Admin Actions Column */}
                      {isAdmin && (
                        <td 
                          className="py-3 px-2 text-center" 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            {/* Tindak Lanjut Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenTindakLanjut(item)}
                              className={`p-1.5 rounded-md transition-all cursor-pointer shadow-xs flex items-center space-x-1 ${
                                isYellow 
                                  ? 'bg-slate-900 hover:bg-black text-amber-300' 
                                  : 'bg-white hover:bg-slate-100 text-djpb-blue'
                              }`}
                              title="Tindak Lanjut Masukan (Admin)"
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-bold hidden sm:inline">Tindak Lanjut</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingItem(item)}
                              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                isYellow 
                                  ? 'hover:bg-amber-400 text-slate-800' 
                                  : 'hover:bg-blue-700 text-white'
                              }`}
                              title="Ubah Data Feedback"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletingItem(item)}
                              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                isYellow 
                                  ? 'hover:bg-amber-400 text-red-700' 
                                  : 'hover:bg-blue-700 text-red-200'
                              }`}
                              title="Hapus Data Feedback"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info & pagination indicator */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Menampilkan <strong className="text-slate-900">{filteredList.length > 0 ? startIndex + 1 : 0}</strong> - <strong className="text-slate-900">{Math.min(startIndex + itemsPerPage, filteredList.length)}</strong> dari <strong className="text-slate-900">{filteredList.length}</strong> masukan
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">Halaman {validCurrentPage} dari {totalPages}</span>
            <div className="flex space-x-1">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={validCurrentPage <= 1}
                className="p-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={validCurrentPage >= totalPages}
                className="p-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL: TINDAK LANJUT ADMIN (TAMBAHKAN PADA ADMIN)                       */}
      {/* ========================================================================= */}
      {tindakLanjutItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto" id="modal-tindak-lanjut-feedback">
          <form 
            onSubmit={handleSaveTindakLanjut} 
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
          >
            <div className="bg-[#0A2540] text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm font-display leading-tight">Tindak Lanjut Feedback Kinerja</h3>
                  <p className="text-[11px] text-blue-200">Masukan No. {tindakLanjutItem.no} • {tindakLanjutItem.workspaceName}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setTindakLanjutItem(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Reference of the feedback */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Masukan Pegawai:</span>
                <p className="font-semibold text-slate-800 leading-relaxed italic">
                  "{tindakLanjutItem.feedbackText}"
                </p>
                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span>Pengirim: <strong>{tindakLanjutItem.authorName || 'Pegawai'}</strong></span>
                  <span>Tanggal: <strong>{tindakLanjutItem.date}</strong></span>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Status Tindak Lanjut *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'Belum Ditindaklanjuti', label: 'Belum', color: 'border-slate-300 text-slate-700 hover:bg-slate-50' },
                    { id: 'Dalam Proses', label: 'Dalam Proses', color: 'border-amber-300 text-amber-700 hover:bg-amber-50' },
                    { id: 'Selesai', label: 'Selesai', color: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' },
                    { id: 'Ditolak', label: 'Ditolak', color: 'border-red-300 text-red-700 hover:bg-red-50' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setTindakLanjutForm({ ...tindakLanjutForm, status: st.id as any })}
                      className={`p-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                        tindakLanjutForm.status === st.id
                          ? 'bg-[#0A2540] text-white border-[#0A2540] shadow-xs ring-2 ring-blue-500/20'
                          : `bg-white ${st.color}`
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Uraian Tindak Lanjut */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Uraian / Tanggapan Tindak Lanjut *
                </label>
                <textarea
                  required
                  rows={4}
                  value={tindakLanjutForm.tindakLanjut}
                  onChange={(e) => setTindakLanjutForm({ ...tindakLanjutForm, tindakLanjut: e.target.value })}
                  placeholder="Ketikkan tindakan perbaikan, koordinasi, atau konfirmasi penyelesaian layanan kinerja yang telah dilakukan..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-djpb-blue focus:bg-white leading-relaxed"
                />
              </div>

              {/* Petugas & Tanggal Tindak Lanjut */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Petugas / Unit Penindak Lanjut
                  </label>
                  <input
                    type="text"
                    required
                    value={tindakLanjutForm.tindakLanjutBy}
                    onChange={(e) => setTindakLanjutForm({ ...tindakLanjutForm, tindakLanjutBy: e.target.value })}
                    placeholder="Contoh: Subbagian Penilaian Kinerja"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-djpb-blue"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tanggal Tindak Lanjut
                  </label>
                  <input
                    type="text"
                    required
                    value={tindakLanjutForm.tindakLanjutDate}
                    onChange={(e) => setTindakLanjutForm({ ...tindakLanjutForm, tindakLanjutDate: e.target.value })}
                    placeholder="Contoh: 26 Juni 2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-djpb-blue"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setTindakLanjutItem(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Tindak Lanjut</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: TAMBAH FEEDBACK / MASUKAN BARU                                  */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto" id="modal-add-kinerja-feedback">
          <form 
            onSubmit={handleAddFeedback} 
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
          >
            <div className="bg-[#0A2540] text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <MessageSquare className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm font-display leading-tight">Beri Masukan Sarana Layanan Kinerja</h3>
                  <p className="text-[11px] text-blue-200">Kirim feedback inovasi dan fasilitas kerja Kanwil DJPb Riau</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sarana Layanan Kinerja *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.workspaceName}
                  onChange={(e) => setAddForm({ ...addForm, workspaceName: e.target.value })}
                  placeholder="Contoh: Dashboard Integrasi Layanan Kinerja"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-djpb-blue focus:bg-white"
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400 self-center">Pilihan cepat:</span>
                  {[
                    'Dashboard Integrasi Layanan Kinerja',
                    'Aplikasi DILAN Kanwil Riau',
                    'Layanan Bidang SKKI',
                    'Layanan Bidang PAPK',
                    'Ruang Rapat Lancang Kuning'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAddForm({ ...addForm, workspaceName: preset })}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-djpb-blue text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Masukan / Saran Perbaikan / Umpan Balik *
                </label>
                <textarea
                  required
                  rows={4}
                  value={addForm.feedbackText}
                  onChange={(e) => setAddForm({ ...addForm, feedbackText: e.target.value })}
                  placeholder="Ketikkan masukan Anda terhadap sarana layanan kinerja, kemudahan akses informasi, atau saran perbaikan sistem..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-djpb-blue focus:bg-white leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Pegawai (Opsional)
                  </label>
                  <input
                    type="text"
                    value={addForm.authorName}
                    onChange={(e) => setAddForm({ ...addForm, authorName: e.target.value })}
                    placeholder="Nama Pengirim"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-djpb-blue"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tanggal
                  </label>
                  <input
                    type="text"
                    value={addForm.date}
                    onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                    placeholder="Contoh: 26 Juni 2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-djpb-blue"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0A2540] hover:bg-[#123860] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-amber-300" />
                <span>Simpan Masukan</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: DETAIL FEEDBACK LENGKAP                                         */}
      {/* ========================================================================= */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto" id="modal-detail-feedback">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="bg-[#0A2540] text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Eye className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm font-display leading-tight">Detail Masukan Kinerja No. {selectedDetail.no}</h3>
                  <p className="text-[11px] text-blue-200">{selectedDetail.workspaceName}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedDetail(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Isi Masukan / Umpan Balik:</span>
                  {renderStatusBadge(selectedDetail.status, true)}
                </div>
                <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                  "{selectedDetail.feedbackText}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Sarana Kinerja</span>
                  <span className="font-bold text-slate-800">{selectedDetail.workspaceName}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Tanggal Masukan</span>
                  <span className="font-bold text-slate-800">{selectedDetail.date}</span>
                </div>
              </div>

              {selectedDetail.authorName && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-djpb-blue block text-[10px] font-bold uppercase">Pengirim</span>
                    <span className="font-bold text-slate-900">{selectedDetail.authorName}</span>
                    {selectedDetail.authorDivision && (
                      <span className="text-slate-500 ml-1">({selectedDetail.authorDivision})</span>
                    )}
                  </div>
                  {selectedDetail.rating && (
                    <div className="flex items-center space-x-0.5">
                      {[...Array(selectedDetail.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tindak Lanjut Information in Detail View */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tindak Lanjut Pengelola / Admin:</span>
                  </span>
                  {selectedDetail.tindakLanjutDate && (
                    <span className="text-[11px] font-semibold text-emerald-700">
                      {selectedDetail.tindakLanjutDate}
                    </span>
                  )}
                </div>

                {selectedDetail.tindakLanjut ? (
                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-800 leading-relaxed font-medium">
                      {selectedDetail.tindakLanjut}
                    </p>
                    {selectedDetail.tindakLanjutBy && (
                      <div className="text-[10px] text-slate-500 font-semibold pt-1 border-t border-emerald-200/50">
                        Ditindaklanjuti oleh: <span className="text-slate-800">{selectedDetail.tindakLanjutBy}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Belum ada uraian tindak lanjut dari admin atau pengelola layanan.
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center space-x-2">
              <div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      const item = selectedDetail;
                      setSelectedDetail(null);
                      handleOpenTindakLanjut(item);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Tindak Lanjut Masukan Ini</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="px-5 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: EDIT DATA FEEDBACK (ADMIN)                                      */}
      {/* ========================================================================= */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto" id="modal-edit-kinerja-feedback">
          <form 
            onSubmit={handleSaveEdit} 
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
          >
            <div className="bg-[#0A2540] text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Edit3 className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm font-display leading-tight">Ubah Masukan No. {editingItem.no}</h3>
                  <p className="text-[11px] text-blue-200">Perbarui rincian sarana, teks masukan, atau tanggal</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingItem(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sarana Layanan Kinerja
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.workspaceName}
                  onChange={(e) => setEditingItem({ ...editingItem, workspaceName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-djpb-blue"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Isi Masukan / Saran
                </label>
                <textarea
                  required
                  rows={4}
                  value={editingItem.feedbackText}
                  onChange={(e) => setEditingItem({ ...editingItem, feedbackText: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-djpb-blue"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tanggal
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.date}
                  onChange={(e) => setEditingItem({ ...editingItem, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-djpb-blue"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0A2540] hover:bg-[#123860] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-amber-300" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: KONFIRMASI HAPUS (ADMIN)                                        */}
      {/* ========================================================================= */}
      {deletingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" id="modal-delete-kinerja-feedback">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-display">Hapus Data Masukan?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Apakah Anda yakin ingin menghapus masukan No. <strong>{deletingItem.no}</strong> ("{deletingItem.workspaceName}")?
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
