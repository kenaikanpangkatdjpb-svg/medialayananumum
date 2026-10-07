import React, { useState, useEffect } from 'react';
import { 
  Printer, Download, Plus, Trash2, CheckCircle2, Clock, FileText, Eye,
  Search, ShieldCheck, RefreshCw, Send, Sparkles, Check, X,
  FileSpreadsheet, Edit3, ChevronRight, Info, Building2, User,
  AlertCircle, ThumbsUp, CheckSquare, XCircle, AlertTriangle, Loader2, FileDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import KemenkeuLogo from './KemenkeuLogo';
import { subscribeFirestoreCollection, saveFirestoreDoc, deleteFirestoreDoc } from '../lib/firebase';
import { safeLocalStorageSet } from '../lib/storage';
import { formatDisplayDate } from '../lib/dateUtils';
import { exportElementToPdf } from '../lib/pdfExport';

export interface PermintaanItem {
  no: number;
  itemName: string;
  quantity: number;
  unit: string; // e.g. buah, kotak, rim, pack
}

export interface SuratPermintaan {
  id: string;
  documentNo: string;
  division: string;
  date: string;
  items: PermintaanItem[];
  approvedByTitle: string;
  approvedByName: string;
  approvedByNip: string;
  proposedByTitle: string;
  proposedByName: string;
  proposedByNip: string;
  status: 'Draf' | 'Diajukan' | 'Disetujui' | 'Selesai' | 'Ditolak';
  createdDate: string;
  notes?: string;
}

interface SuratPermintaanBarangPersediaanProps {
  currentUserRole?: string;
  isEditMode?: boolean;
}

export default function SuratPermintaanBarangPersediaan({
  currentUserRole = 'user',
  isEditMode = false
}: SuratPermintaanBarangPersediaanProps) {
  const isAdmin = currentUserRole === 'admin' || isEditMode;

  // Active View Tab: 'spbp' | 'form' | 'history' | 'document'
  const [activeTab, setActiveTab] = useState<'spbp' | 'form' | 'history' | 'document'>(isAdmin ? 'spbp' : 'form');

  useEffect(() => {
    if (isAdmin && (activeTab === 'form' || activeTab === 'document')) {
      setActiveTab('spbp');
    } else if (!isAdmin && activeTab === 'spbp') {
      setActiveTab('form');
    }
  }, [isAdmin]);

  // Initial requests list with realistic DJPb data
  const sampleRequest1: SuratPermintaan = {
    id: 'SPBP-2026-06-001',
    documentNo: 'SPBP/PAPK/2026/06/001',
    division: 'Bidang PAPK',
    date: '08 Juni 2026',
    items: [
      { no: 1, itemName: 'Tissue Halus/Kotak', quantity: 10, unit: 'buah' },
      { no: 2, itemName: 'Map Transparan A4', quantity: 10, unit: 'buah' },
      { no: 3, itemName: 'Amplop Putih', quantity: 20, unit: 'buah' },
      { no: 4, itemName: 'Amplop Coklat', quantity: 10, unit: 'buah' },
      { no: 5, itemName: 'Pena Gel Hitam', quantity: 1, unit: 'kotak' },
      { no: 6, itemName: 'Push Pins', quantity: 1, unit: 'kotak' },
    ],
    approvedByTitle: 'Kepala Subbagian TURT',
    approvedByName: 'Ahmad Nauval',
    approvedByNip: '198210042002121003',
    proposedByTitle: 'Kepala Seksi ASPLK',
    proposedByName: 'Yasmi',
    proposedByNip: '196901091998031001',
    status: 'Disetujui',
    createdDate: '2026-06-08'
  };

  const sampleRequest2: SuratPermintaan = {
    id: 'SPBP-2026-07-002',
    documentNo: 'SPBP/PPA1/2026/07/002',
    division: 'Bidang PPA I',
    date: '30 Juli 2026',
    items: [
      { no: 1, itemName: 'Kertas HVS A4 80gr Gramedia', quantity: 20, unit: 'rim' },
      { no: 2, itemName: 'Tinta Printer Canon Black GI-790', quantity: 5, unit: 'botol' },
      { no: 3, itemName: 'Map Business File Biru', quantity: 15, unit: 'buah' },
      { no: 4, itemName: 'Stapler HD-10 Max', quantity: 3, unit: 'buah' }
    ],
    approvedByTitle: 'Kepala Subbagian TURT',
    approvedByName: 'Ahmad Nauval',
    approvedByNip: '198210042002121003',
    proposedByTitle: 'Kepala Seksi PPA I-A',
    proposedByName: 'Budi Santoso',
    proposedByNip: '197805142001121002',
    status: 'Diajukan',
    createdDate: '2026-07-30',
    notes: 'Meminta persetujuan Admin Subbagian TURT'
  };

  const sampleRequest3: SuratPermintaan = {
    id: 'SPBP-2026-05-004',
    documentNo: 'SPBP/SKKI/2026/05/004',
    division: 'Bidang SKKI',
    date: '15 Mei 2026',
    items: [
      { no: 1, itemName: 'Kertas A4 80gr Gramedia', quantity: 15, unit: 'rim' },
      { no: 2, itemName: 'Tinta Printer Canon Black', quantity: 4, unit: 'botol' },
      { no: 3, itemName: 'Stapler Besar Max HD-50', quantity: 2, unit: 'buah' }
    ],
    approvedByTitle: 'Kepala Subbagian TURT',
    approvedByName: 'Ahmad Nauval',
    approvedByNip: '198210042002121003',
    proposedByTitle: 'Kepala Seksi Kepatuhan Internal',
    proposedByName: 'Dwi Rahmawati',
    proposedByNip: '198503122008012002',
    status: 'Selesai',
    createdDate: '2026-05-15'
  };

  const [requestsList, setRequestsList] = useState<SuratPermintaan[]>(() => [
    sampleRequest1,
    sampleRequest2,
    sampleRequest3
  ]);

  // Real-time Firestore sync
  useEffect(() => {
    const unsub = subscribeFirestoreCollection<SuratPermintaan>(
      'spbp_requests',
      [sampleRequest1, sampleRequest2, sampleRequest3],
      (data) => {
        if (data && data.length > 0) {
          setRequestsList(data);
        }
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    safeLocalStorageSet('melayu_spbp_requests', JSON.stringify(requestsList));
  }, [requestsList]);

  // Current Active Selected Document for Preview
  const [activeDocument, setActiveDocument] = useState<SuratPermintaan>(() => requestsList[0] || sampleRequest1);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Live editing mode inside Document view
  const [isLiveEdit, setIsLiveEdit] = useState(false);

  // Modal States for Admin Actions
  const [editingDocument, setEditingDocument] = useState<SuratPermintaan | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Form State for "Rekam / Buat Permintaan Baru"
  const [formDocNo, setFormDocNo] = useState(isAdmin ? 'SPBP/PAPK/2026/06/001' : '');
  const [formDivision, setFormDivision] = useState('Bidang PAPK');
  const [formStatus, setFormStatus] = useState<'Diajukan' | 'Disetujui' | 'Selesai' | 'Ditolak'>(isAdmin ? 'Disetujui' : 'Diajukan');
  const [formDateString, setFormDateString] = useState(isAdmin ? '08 Juni 2026' : '');
  const [formProposedTitle, setFormProposedTitle] = useState(isAdmin ? 'Kepala Seksi ASPLK' : '');
  const [formProposedName, setFormProposedName] = useState(isAdmin ? 'Yasmi' : '');
  const [formProposedNip, setFormProposedNip] = useState(isAdmin ? '196901091998031001' : '');
  const [formItems, setFormItems] = useState<PermintaanItem[]>(isAdmin ? [
    { no: 1, itemName: 'Tissue Halus/Kotak', quantity: 10, unit: 'buah' },
    { no: 2, itemName: 'Map Transparan A4', quantity: 10, unit: 'buah' }
  ] : []);

  // Search & Filter state for History
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('semua');
  const [showQrVerification, setShowQrVerification] = useState(false);

  // Show transient notification toast
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Add Item to Form
  const handleAddFormItem = () => {
    setFormItems(prev => [
      ...prev,
      {
        no: prev.length + 1,
        itemName: '',
        quantity: 1,
        unit: 'buah'
      }
    ]);
  };

  // Remove Item from Form
  const handleRemoveFormItem = (index: number) => {
    setFormItems(prev => prev.filter((_, i) => i !== index).map((item, idx) => ({ ...item, no: idx + 1 })));
  };

  // Update Item in Form
  const handleUpdateFormItem = (index: number, field: keyof PermintaanItem, value: any) => {
    setFormItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Submit New Request from Pegawai / Admin
  const handleSubmitNewForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (formItems.length === 0) {
      alert('Mohon masukkan minimal 1 barang permintaan persediaan.');
      return;
    }

    const newRequest: SuratPermintaan = {
      id: `SPBP-${Date.now()}`,
      documentNo: formDocNo || `SPBP/PAPK/2026/06/${(requestsList.length + 1).toString().padStart(3, '0')}`,
      division: formDivision,
      date: formDateString || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      items: formItems.filter(i => i.itemName.trim() !== ''),
      approvedByTitle: 'Kepala Subbagian TURT',
      approvedByName: 'Ahmad Nauval',
      approvedByNip: '198210042002121003',
      proposedByTitle: formProposedTitle || '-',
      proposedByName: formProposedName || '-',
      proposedByNip: formProposedNip || '-',
      status: isAdmin ? formStatus : 'Diajukan',
      createdDate: new Date().toISOString().split('T')[0],
      notes: 'Perekaman Surat Permintaan Barang Persediaan'
    };

    setRequestsList([newRequest, ...requestsList]);
    saveFirestoreDoc('spbp_requests', newRequest);
    setActiveDocument(newRequest);
    if (isAdmin) {
      setActiveTab('spbp');
    } else {
      setActiveTab('document');
      // Reset form fields
      setFormDocNo('');
      setFormDateString('');
      setFormProposedTitle('');
      setFormProposedName('');
      setFormProposedNip('');
      setFormStatus('Diajukan');
      setFormItems([
        { no: 1, itemName: '', quantity: 1, unit: 'buah' }
      ]);
    }
    showToast('Surat Permintaan Barang Persediaan berhasil direkam! Menampilkan Pratinjau Dokumen Official.', 'success');
  };

  // Admin Action 1: Approve Request (Persetujuan)
  const handleApproveRequest = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const target = requestsList.find(req => req.id === id);
    if (target) {
      const updated: SuratPermintaan = {
        ...target,
        status: 'Disetujui' as const,
        approvedByTitle: 'Kepala Subbagian TURT',
        approvedByName: 'Ahmad Nauval',
        approvedByNip: '198210042002121003'
      };
      setRequestsList(prev => prev.map(req => req.id === id ? updated : req));
      saveFirestoreDoc('spbp_requests', updated);

      if (activeDocument.id === id) {
        setActiveDocument(updated);
      }
    }

    showToast(`Dokumen No. ${id} berhasil DISETUJUI (Approved)!`, 'success');
  };

  // Admin Action 2: Change Status directly (Diajukan, Disetujui, Selesai, Ditolak)
  const handleChangeStatus = (id: string, newStatus: SuratPermintaan['status'], e?: React.ChangeEvent<HTMLSelectElement>) => {
    if (e) e.stopPropagation();

    const target = requestsList.find(req => req.id === id);
    if (target) {
      const updated: SuratPermintaan = { ...target, status: newStatus };
      setRequestsList(prev => prev.map(req => req.id === id ? updated : req));
      saveFirestoreDoc('spbp_requests', updated);

      if (activeDocument.id === id) {
        setActiveDocument(updated);
      }
    }

    showToast(`Status dokumen berhasil diubah menjadi: ${newStatus}`, 'info');
  };

  // Admin Action 3: Open Edit Modal
  const handleOpenEditModal = (req: SuratPermintaan, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingDocument(JSON.parse(JSON.stringify(req))); // deep clone
  };

  // Admin Action 3b: Save Edited Document
  const handleSaveEditedDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDocument) return;

    setRequestsList(prev => prev.map(req => req.id === editingDocument.id ? editingDocument : req));
    saveFirestoreDoc('spbp_requests', editingDocument);

    if (activeDocument.id === editingDocument.id) {
      setActiveDocument(editingDocument);
    }

    setEditingDocument(null);
    showToast(`Perubahan dokumen ${editingDocument.documentNo} berhasil disimpan!`, 'success');
  };

  // Admin Action 4: Confirm Delete
  const handleConfirmDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingDocumentId(id);
  };

  // Admin Action 4b: Execute Delete
  const handleExecuteDelete = () => {
    if (!deletingDocumentId) return;

    const remaining = requestsList.filter(r => r.id !== deletingDocumentId);
    setRequestsList(remaining);
    deleteFirestoreDoc('spbp_requests', deletingDocumentId);

    if (activeDocument.id === deletingDocumentId && remaining.length > 0) {
      setActiveDocument(remaining[0]);
    }

    setDeletingDocumentId(null);
    showToast('Dokumen Surat Permintaan Barang Persediaan berhasil dihapus!', 'info');
  };

  // Print Document Function (Native Browser Dialog)
  const handlePrintDocument = (doc?: SuratPermintaan) => {
    if (doc) {
      setActiveDocument(doc);
    }
    setActiveTab('document');
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.warn('Native print failed, falling back to PDF download:', err);
        handleDownloadPdf(doc || activeDocument);
      }
    }, 350);
  };

  // Direct PDF Generation & Download
  const handleDownloadPdf = async (doc?: SuratPermintaan) => {
    const targetDoc = doc || activeDocument;
    if (doc && doc.id !== activeDocument.id) {
      setActiveDocument(doc);
    }
    setActiveTab('document');

    if (isExportingPdf) return;
    setIsExportingPdf(true);
    showToast('Sedang membuat file PDF resmi Surat Permintaan...', 'info');

    // Wait slightly for tab rendering if needed
    setTimeout(async () => {
      try {
        const cleanDocNo = (targetDoc.documentNo || 'SPBP').replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `Surat_Permintaan_Persediaan_${cleanDocNo}.pdf`;

        const success = await exportElementToPdf({
          filename,
          elementId: 'official-document-paper',
          onSuccess: () => {
            setIsExportingPdf(false);
            showToast(`File ${filename} berhasil diunduh!`, 'success');
          },
          onError: (err) => {
            setIsExportingPdf(false);
            console.error('PDF export error:', err);
            showToast('Membuka dialog cetak browser sebagai alternatif...', 'info');
            window.print();
          }
        });

        if (!success) {
          setIsExportingPdf(false);
        }
      } catch (err) {
        setIsExportingPdf(false);
        console.error('Fatal PDF error:', err);
        window.print();
      }
    }, 200);
  };

  // Download Excel Spreadsheet
  const handleDownloadExcel = (doc: SuratPermintaan) => {
    const wsData = [
      ['KEMENTERIAN KEUANGAN REPUBLIK INDONESIA'],
      ['DIREKTORAT JENDERAL PERBENDAHARAAN'],
      ['KANTOR WILAYAH PROVINSI RIAU'],
      ['SURAT PERMINTAAN BARANG PERSEDIAAN'],
      [''],
      ['No. (diisi petugas)', ':', doc.documentNo || '(diisi petugas)'],
      ['Bidang/Bagian', ':', doc.division],
      ['Tanggal', ':', doc.date],
      ['Status Persetujuan', ':', doc.status],
      [''],
      ['No. Urut', 'Barang Permintaan', 'Jumlah', 'Keterangan'],
      ...doc.items.map(item => [item.no, item.itemName, item.quantity, item.unit]),
      [''],
      ['Perhatian:'],
      ['1. Daftar Permintaan ini ditandatangani serendah-rendahnya oleh Kasi/Kasubag dan diketahui oleh Kabag masing-masing'],
      ['2. Gudang dibuka tiap hari kerja dari jam 09.00 s.d. 12.00 dan jam 13.00 s.d. 16.30 WIB'],
      ['3. Permintaan ini dibuat rangkap dua dan diajukan satu bulan sekali.'],
      [''],
      ['Disetujui oleh', '', 'Diajukan Oleh'],
      [doc.approvedByTitle, '', doc.proposedByTitle],
      ['Ditandatangani secara elektronik', '', 'Ditandatangani secara elektronik'],
      [doc.approvedByName, '', doc.proposedByName],
      [`NIP ${doc.approvedByNip}`, '', `NIP ${doc.proposedByNip}`]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Permintaan Persediaan');
    const divStr = (doc.division || '').replace(/\s+/g, '_');
    const dateStr = (doc.date || '').replace(/\s+/g, '_');
    XLSX.writeFile(wb, `Surat_Permintaan_Barang_Persediaan_${divStr}_${dateStr}.xlsx`);
  };

  const filteredRequests = (requestsList || []).filter(req => {
    if (!req) return false;
    const documentNo = req.documentNo || '';
    const division = req.division || '';
    const proposedByName = req.proposedByName || '';
    const reqItems = req.items || [];
    const status = req.status || '';

    const matchesSearch = 
      documentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      division.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposedByName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reqItems.some(i => (i.itemName || '').toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'semua' || status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans relative">
      
      {/* FLOATING TOAST NOTIFICATION */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl border flex items-center space-x-3 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200 ${
          notification.type === 'success' ? 'bg-emerald-900 text-white border-emerald-700' :
          notification.type === 'error' ? 'bg-rose-900 text-white border-rose-700' :
          'bg-slate-900 text-white border-slate-700'
        }`}>
          {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {notification.type === 'error' && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          {notification.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* HEADER BAR & TOP TABS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-blue-50 text-djpb-blue rounded-xl font-bold">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg md:text-xl font-display font-extrabold text-slate-900 tracking-tight">
                Surat Permintaan Barang Persediaan (SPBP)
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Sistem Pengajuan ATK Pegawai & Menu Persetujuan (Approve) Admin TURT Kanwil DJPb Riau
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 text-xs font-semibold overflow-x-auto">
          {!isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`px-3.5 py-2 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'form'
                  ? 'bg-djpb-blue text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Rekam Surat Permintaan Barang Persediaan</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('spbp')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'spbp'
                ? 'bg-djpb-blue text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Daftar Permintaan (SPBP)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-djpb-blue text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Riwayat ({requestsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('document')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'document'
                ? 'bg-djpb-blue text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Pratinjau Dokumen Official</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SURAT PERMINTAAN BARANG PERSEDIAAN (MAIN OVERVIEW WITH ADMIN CONTROLS) */}
      {/* ========================================================================= */}
      {activeTab === 'spbp' && (
        <div className="space-y-6">
          
          {/* Informational Callout for Admin Workflow */}
          <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 text-xs text-amber-900 flex items-start space-x-3 shadow-2xs">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-950">
                Alur Persetujuan (Approve) Admin Subbagian TURT:
              </p>
              <p className="text-amber-800 leading-relaxed">
                1. Surat Permintaan Barang Persediaan (SPBP) yang diajukan oleh Pegawai akan masuk ke antrean dengan status <span className="bg-amber-200 px-1.5 py-0.5 rounded font-bold text-amber-900">Diajukan</span>.
                <br />
                2. <strong>Admin Subbagian TURT</strong> meninjau permohonan pada daftar di bawah dan dapat menggunakan tombol aksi: <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">✓ Setujui (Approve)</span>, <span className="bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">✏️ Ubah</span>, atau <span className="bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded">🗑️ Hapus</span>.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Surat SPBP</p>
                <p className="text-xl font-black text-slate-900 mt-1 font-mono">{requestsList.length}</p>
              </div>
              <div className="p-2.5 bg-blue-50 text-djpb-blue rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Perlu Persetujuan (Diajukan)</p>
                <p className="text-xl font-black text-amber-600 mt-1 font-mono">
                  {requestsList.filter(r => r.status === 'Diajukan').length}
                </p>
              </div>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Disetujui Admin</p>
                <p className="text-xl font-black text-emerald-600 mt-1 font-mono">
                  {requestsList.filter(r => r.status === 'Disetujui').length}
                </p>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Selesai / Penyerahan</p>
                <p className="text-xl font-black text-blue-600 mt-1 font-mono">
                  {requestsList.filter(r => r.status === 'Selesai').length}
                </p>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Active Documents List Card with Admin Actions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm md:text-base font-display font-extrabold text-slate-900">
                  Daftar Pengajuan Surat Permintaan Barang Persediaan (SPBP)
                </h2>
                <p className="text-xs text-slate-500">
                  Menu Admin untuk menyetujui (approve), mengubah, atau menghapus surat pengajuan persediaan pegawai.
                </p>
              </div>
              {!isAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  className="px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer self-start md:self-auto shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Rekam Permintaan Baru</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requestsList.map((req) => (
                <div 
                  key={req.id}
                  className={`p-4 rounded-xl border transition-all space-y-3 cursor-pointer relative group ${
                    activeDocument.id === req.id 
                      ? 'bg-blue-50/40 border-djpb-blue ring-1 ring-djpb-blue' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                  onClick={() => {
                    setActiveDocument(req);
                    setActiveTab('document');
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-xs text-djpb-blue">{req.documentNo}</span>
                      <h3 className="font-bold text-sm text-slate-900 mt-0.5">{req.division}</h3>
                      <p className="text-[11px] text-slate-500">{formatDisplayDate(req.date)}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center space-x-1 ${
                        req.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        req.status === 'Selesai' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                        req.status === 'Ditolak' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                        'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {req.status === 'Diajukan' && <Clock className="w-3 h-3 text-amber-600" />}
                        {req.status === 'Disetujui' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {req.status === 'Selesai' && <ShieldCheck className="w-3 h-3 text-blue-600" />}
                        {req.status === 'Ditolak' && <XCircle className="w-3 h-3 text-rose-600" />}
                        <span>{req.status === 'Diajukan' ? 'Diajukan (Meminta Persetujuan)' : req.status}</span>
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-700 font-medium space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Rincian Barang ({req.items.length} Item):
                    </p>
                    <p className="line-clamp-2 text-slate-800 font-medium">
                      {req.items.map(i => `${i.itemName} (${i.quantity} ${i.unit})`).join(', ')}
                    </p>
                  </div>

                  {req.proposedByName && (
                    <p className="text-[11px] text-slate-500">
                      Pengusul: <span className="font-semibold text-slate-800">{req.proposedByName}</span> ({req.proposedByTitle || 'Pegawai'})
                    </p>
                  )}

                  {/* ACTION CONTROLS BAR */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                    {isAdmin ? (
                      <>
                        {/* Status Toggle / Approve Button */}
                        <div className="flex items-center space-x-1.5">
                          {req.status === 'Diajukan' ? (
                            <button
                              type="button"
                              onClick={(e) => handleApproveRequest(req.id, e)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg shadow-2xs transition-all flex items-center space-x-1 cursor-pointer"
                              title="Setujui Surat Permintaan Barang Persediaan"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Setujui (Approve)</span>
                            </button>
                          ) : (
                            <select
                              value={req.status}
                              onChange={(e) => handleChangeStatus(req.id, e.target.value as any, e)}
                              className="px-2 py-1 bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-800 cursor-pointer focus:outline-none"
                            >
                              <option value="Diajukan">Diajukan</option>
                              <option value="Disetujui">Disetujui</option>
                              <option value="Selesai">Selesai</option>
                              <option value="Ditolak">Ditolak</option>
                            </select>
                          )}
                        </div>

                        {/* Edit, Preview & Delete Action Buttons */}
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDocument(req);
                              setActiveTab('document');
                            }}
                            className="px-2.5 py-1 bg-djpb-blue hover:bg-djpb-blue-light text-white font-bold text-[11px] rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                            title="Pratinjau Surat Permintaan Barang Persediaan"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview Surat</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleOpenEditModal(req, e)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-djpb-blue font-bold text-[11px] rounded-lg border border-blue-200 transition-colors flex items-center space-x-1 cursor-pointer"
                            title="Ubah Rincian Dokumen"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Ubah</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleConfirmDelete(req.id, e)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] rounded-lg border border-rose-200 transition-colors flex items-center space-x-1 cursor-pointer"
                            title="Hapus Dokumen Surat SPBP"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDocument(req);
                            setActiveTab('document');
                          }}
                          className="px-3 py-1 bg-djpb-blue hover:bg-djpb-blue-light text-white font-bold text-[11px] rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                          title="Pratinjau Surat"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Pratinjau Surat</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintDocument(req)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                          title="Cetak atau Simpan PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak / PDF</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: OFFICIAL DOCUMENT VIEW (MATCHES PDF / IMAGE SCREENSHOT EXACTLY) */}
      {/* ========================================================================= */}
      {activeTab === 'document' && (
        <div className="space-y-4">
          
          {/* Document Control Panel Bar with Approval & Admin Actions */}
          <div className="bg-slate-800 text-white p-3 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
            <div className="flex items-center space-x-3">
              <span className={`font-black px-2.5 py-0.5 rounded uppercase tracking-wider text-[10px] ${
                activeDocument.status === 'Disetujui' ? 'bg-emerald-500 text-slate-950' :
                activeDocument.status === 'Selesai' ? 'bg-blue-400 text-slate-950' :
                'bg-amber-400 text-slate-950'
              }`}>
                Status: {activeDocument.status}
              </span>
              <span className="font-mono font-bold text-slate-200">
                {activeDocument.documentNo}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300 font-medium">{activeDocument.division}</span>
            </div>

            <div className="flex items-center space-x-2">
              {isAdmin && (
                <>
                  {activeDocument.status === 'Diajukan' && (
                    <button
                      type="button"
                      onClick={() => handleApproveRequest(activeDocument.id)}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>Setujui (Approve) Dokumen Ini</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(activeDocument)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-300" />
                    <span>Ubah Dokumen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConfirmDelete(activeDocument.id)}
                    className="px-3 py-1.5 bg-rose-900/80 hover:bg-rose-800 text-rose-100 font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-300" />
                    <span>Hapus</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsLiveEdit(!isLiveEdit)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      isLiveEdit ? 'bg-amber-400 text-slate-950 shadow-xs' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                    title="Edit konten secara langsung di halaman kertas"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isLiveEdit ? 'Selesai Live Edit' : 'Live Edit Kertas'}</span>
                  </button>
                </>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleDownloadExcel(activeDocument)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  title="Unduh Format Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Unduh Excel</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleDownloadPdf(activeDocument)}
                disabled={isExportingPdf}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                title="Unduh langsung file PDF resmi"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Simpan PDF</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handlePrintDocument(activeDocument)}
                className="px-3.5 py-1.5 bg-djpb-blue hover:bg-djpb-blue-light text-white font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                title="Cetak Surat via dialog printer browser"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Dokumen</span>
              </button>
            </div>
          </div>

          {/* REALISTIC A4 OFFICIAL PAPER CONTAINER */}
          <div className="bg-slate-200/60 p-2 sm:p-6 rounded-2xl overflow-x-auto flex justify-center print:p-0 print:bg-white print:overflow-visible">
            
            {/* A4 PAPER CANVAS */}
            <div id="official-document-paper" className="w-full max-w-[210mm] min-h-[297mm] bg-white p-8 sm:p-12 shadow-2xl rounded-sm border border-slate-300 text-black font-serif text-sm relative print:shadow-none print:p-0 print:border-none print:w-full">
              
              {/* 1. KOP SURAT OFFICIAL KEMENKEU */}
              <div className="flex items-start space-x-4 mb-2 pb-2">
                <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                  <KemenkeuLogo className="w-full h-full" />
                </div>

                <div className="flex-1 text-center font-sans">
                  <h2 className="font-extrabold text-sm sm:text-base tracking-wider uppercase text-black leading-tight">
                    KEMENTERIAN KEUANGAN REPUBLIK INDONESIA
                  </h2>
                  <h3 className="font-bold text-xs sm:text-sm tracking-wide uppercase text-black leading-tight">
                    DIREKTORAT JENDERAL PERBENDAHARAAN
                  </h3>
                  <h4 className="font-extrabold text-sm sm:text-base tracking-wider uppercase text-black leading-tight mt-0.5">
                    KANTOR WILAYAH PROVINSI RIAU
                  </h4>
                  <p className="text-[11px] text-slate-800 leading-snug mt-1 font-serif">
                    Jl. Jenderal Sudirman no. 249, Pekanbaru 28116
                  </p>
                  <p className="text-[10px] text-slate-700 leading-snug font-serif">
                    Telepon: 0761 22686, Faksimili: 0761 22647, Website: www.djpbn.kemenkeu.go.id/kanwil/riau
                  </p>
                </div>
              </div>

              {/* Official Kop Lines */}
              <div className="border-b-2 border-black mb-0.5"></div>
              <div className="border-b border-black mb-6"></div>

              {/* 2. DOCUMENT TITLE */}
              <div className="text-center mb-6">
                <h1 className="font-sans font-extrabold text-base sm:text-lg uppercase tracking-wider text-black underline underline-offset-4">
                  SURAT PERMINTAAN BARANG PERSEDIAAN
                </h1>
              </div>

              {/* 3. FORM HEADER METADATA FIELDS */}
              <div className="font-sans text-xs sm:text-sm mb-6 space-y-1.5 max-w-lg">
                <div className="flex items-center">
                  <span className="w-36 font-semibold">No. (diisi petugas)</span>
                  <span className="mr-2">:</span>
                  {isLiveEdit ? (
                    <input
                      type="text"
                      value={activeDocument.documentNo}
                      onChange={(e) => setActiveDocument({ ...activeDocument, documentNo: e.target.value })}
                      className="border border-slate-400 px-2 py-0.5 rounded text-xs font-mono w-64"
                    />
                  ) : (
                    <span className="font-mono text-slate-900 font-bold">{activeDocument.documentNo || ':'}</span>
                  )}
                </div>

                <div className="flex items-center">
                  <span className="w-36 font-semibold">Bidang/Bagian</span>
                  <span className="mr-2">:</span>
                  {isLiveEdit ? (
                    <input
                      type="text"
                      value={activeDocument.division}
                      onChange={(e) => setActiveDocument({ ...activeDocument, division: e.target.value })}
                      className="border border-slate-400 px-2 py-0.5 rounded text-xs w-64"
                    />
                  ) : (
                    <span className="font-bold text-slate-900">{activeDocument.division}</span>
                  )}
                </div>

                <div className="flex items-center">
                  <span className="w-36 font-semibold">Tanggal</span>
                  <span className="mr-2">:</span>
                  {isLiveEdit ? (
                    <input
                      type="text"
                      value={activeDocument.date}
                      onChange={(e) => setActiveDocument({ ...activeDocument, date: e.target.value })}
                      className="border border-slate-400 px-2 py-0.5 rounded text-xs w-64"
                    />
                  ) : (
                    <span className="font-medium text-slate-900">{formatDisplayDate(activeDocument.date)}</span>
                  )}
                </div>
              </div>

              {/* 4. ITEMS TABLE */}
              <div className="mb-6 overflow-x-auto">
                <table className="w-full border-collapse border border-black font-sans text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-black border-b border-black font-bold">
                      <th className="border border-black py-2 px-3 text-center w-16">No. Urut</th>
                      <th className="border border-black py-2 px-4 text-left">Barang Permintaan</th>
                      <th className="border border-black py-2 px-3 text-center w-24">Jumlah</th>
                      <th className="border border-black py-2 px-4 text-center w-36">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeDocument.items.map((item, index) => (
                      <tr key={index} className="border-b border-black hover:bg-slate-50/50">
                        <td className="border border-black py-1.5 px-3 text-center font-bold">
                          {item.no}
                        </td>
                        <td className="border border-black py-1.5 px-4 font-medium">
                          {isLiveEdit ? (
                            <input
                              type="text"
                              value={item.itemName}
                              onChange={(e) => {
                                const newItems = [...activeDocument.items];
                                newItems[index].itemName = e.target.value;
                                setActiveDocument({ ...activeDocument, items: newItems });
                              }}
                              className="w-full border border-slate-300 px-2 py-0.5 text-xs rounded"
                            />
                          ) : (
                            item.itemName
                          )}
                        </td>
                        <td className="border border-black py-1.5 px-3 text-center font-bold font-mono">
                          {isLiveEdit ? (
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...activeDocument.items];
                                newItems[index].quantity = parseInt(e.target.value) || 0;
                                setActiveDocument({ ...activeDocument, items: newItems });
                              }}
                              className="w-16 text-center border border-slate-300 px-1 py-0.5 text-xs rounded"
                            />
                          ) : (
                            item.quantity
                          )}
                        </td>
                        <td className="border border-black py-1.5 px-4 text-center font-medium">
                          {isLiveEdit ? (
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => {
                                const newItems = [...activeDocument.items];
                                newItems[index].unit = e.target.value;
                                setActiveDocument({ ...activeDocument, items: newItems });
                              }}
                              className="w-full text-center border border-slate-300 px-2 py-0.5 text-xs rounded"
                            />
                          ) : (
                            item.unit
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 5. PERHATIAN (INSTRUCTIONS) */}
              <div className="font-sans text-[11px] text-black mb-10 space-y-1">
                <p className="font-bold">Perhatian :</p>
                <div className="pl-4 space-y-0.5 leading-relaxed">
                  <div className="flex items-start">
                    <span className="w-5 shrink-0">1.</span>
                    <span>
                      Daftar Permintaan ini ditandatangani serendah-rendahnya oleh Kasi/Kasubag dan diketahui oleh Kabag masing-masing
                    </span>
                  </div>
                  <div className="flex items-start">
                    <span className="w-5 shrink-0">2.</span>
                    <span>
                      Gudang dibuka tiap hari kerja dari jam 09.00 s.d. 12.00 dan jam 13.00 s.d. 16.30 WIB
                    </span>
                  </div>
                  <div className="flex items-start">
                    <span className="w-5 shrink-0">3.</span>
                    <span>
                      Permintaan ini dibuat rangkap dua dan diajukan satu bulan sekali.
                    </span>
                  </div>
                </div>
              </div>

              {/* 6. ELECTRONIC SIGNATURE SECTION */}
              <div className="grid grid-cols-2 gap-8 font-sans text-xs text-black mb-8 pt-2">
                <div className="text-center space-y-2">
                  <div>
                    <p className="font-semibold">Disetujui oleh</p>
                    <p className="font-bold">{activeDocument.approvedByTitle}</p>
                  </div>

                  <div className="h-20 flex flex-col items-center justify-center">
                    {activeDocument.status === 'Disetujui' || activeDocument.status === 'Selesai' ? (
                      <div className="p-1 bg-white border border-slate-300 rounded-lg shadow-2xs flex flex-col items-center space-y-0.5">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`BSrE-TTE: SPBP No. ${activeDocument.documentNo} | Disetujui: ${activeDocument.approvedByName} (NIP ${activeDocument.approvedByNip}) | Valid & Terverifikasi`)}`} 
                          alt="QR Code TTE BSrE"
                          className="w-16 h-16 object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[7.5px] font-mono font-bold text-blue-900 uppercase tracking-tighter">TTE BSrE KEMENKEU</span>
                      </div>
                    ) : (
                      <div className="w-16 h-16 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 text-[10px] font-mono">
                        (Belum TTE)
                      </div>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {activeDocument.status === 'Disetujui' || activeDocument.status === 'Selesai' ? (
                      <>
                        <p className="text-[10px] text-slate-400 italic">Ditandatangani secara elektronik</p>
                        <p className="font-bold underline text-slate-900">{activeDocument.approvedByName}</p>
                        <p className="text-[11px] font-mono text-slate-700">NIP {activeDocument.approvedByNip}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-[10px] text-amber-600 font-bold italic">[ Menunggu Persetujuan Admin TURT ]</p>
                        <p className="font-bold text-slate-400 underline">( Belum Disetujui )</p>
                        <p className="text-[11px] font-mono text-slate-400">NIP -</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <div>
                    <p className="font-semibold">Diajukan Oleh</p>
                    <p className="font-bold">{activeDocument.proposedByTitle || '\u00A0'}</p>
                  </div>

                  <div className="h-20 flex flex-col items-center justify-center">
                    {activeDocument.proposedByName ? (
                      <div className="p-1 bg-white border border-slate-200 rounded-lg shadow-2xs flex flex-col items-center space-y-0.5">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`BSrE-TTE: Permintaan Barang SPBP No. ${activeDocument.documentNo} | Diajukan: ${activeDocument.proposedByName} (NIP ${activeDocument.proposedByNip || '-'})`)}`} 
                          alt="QR Code TTE Pengusul"
                          className="w-16 h-16 object-contain"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-tighter">TTE Pengusul</span>
                      </div>
                    ) : (
                      <div className="w-16 h-16 border border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-300 text-[10px] font-mono">
                        (Belum TTE)
                      </div>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {activeDocument.proposedByName ? (
                      <>
                        <p className="text-[10px] text-slate-400 italic">Ditandatangani secara elektronik</p>
                        <p className="font-bold underline text-slate-900">{activeDocument.proposedByName}</p>
                        <p className="text-[11px] font-mono text-slate-700">{activeDocument.proposedByNip ? `NIP ${activeDocument.proposedByNip}` : ''}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-[10px] text-slate-400 italic">&nbsp;</p>
                        <p className="font-bold underline text-slate-900">&nbsp;</p>
                        <p className="text-[11px] font-mono text-slate-700">&nbsp;</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 7. FOOTER LEGAL VERIFICATION STATEMENT */}
              <div className="border-t border-slate-300 pt-3 mt-12 font-sans text-[9px] text-slate-600 leading-normal flex items-start space-x-2">
                <div className="w-4 h-4 text-blue-600 shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <p>
                  Dokumen ini telah ditandatangani menggunakan sertifikat elektronik yang diterbitkan oleh Balai Besar Sertifikasi Elektronik (BSrE), BSSN. Untuk memastikan keaslian tanda tangan elektronik, silakan pindai QR Code pada laman <span className="font-bold underline text-blue-800">https://satu.kemenkeu.go.id</span> atau unggah dokumen pada laman <span className="font-bold underline text-blue-800">https://tte.komdigi.go.id/verifyPDF</span>
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REKAM SURAT PERMINTAAN BARANG PERSEDIAAN (FORMAT PERSISI GAMBAR) */}
      {/* ========================================================================= */}
      {activeTab === 'form' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-md max-w-4xl mx-auto space-y-6">
          {/* Header Card */}
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-djpb-blue shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-display font-extrabold text-slate-900">
                Rekam Surat Permintaan Barang Persediaan
              </h2>
              <p className="text-xs font-mono font-bold text-slate-500">
                {formDocNo || '(Nomor Surat Belum Diisi)'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitNewForm} className="space-y-6">
            {/* Top Row Fields */}
            <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 text-xs`}>
              <div>
                <label className="block font-extrabold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                  NOMOR SURAT
                </label>
                <input
                  type="text"
                  value={formDocNo}
                  onChange={(e) => setFormDocNo(e.target.value)}
                  placeholder="Isi nomor surat..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-djpb-blue"
                />
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                  BIDANG / BAGIAN
                </label>
                <select
                  value={formDivision}
                  onChange={(e) => setFormDivision(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-djpb-blue"
                >
                  <option value="Bidang PAPK">Bidang PAPK</option>
                  <option value="Bagian Umum (TURT)">Bagian Umum (TURT)</option>
                  <option value="Bidang PPA I">Bidang PPA I</option>
                  <option value="Bidang PPA II">Bidang PPA II</option>
                  <option value="Bidang SKKI">Bidang SKKI</option>
                </select>
              </div>

              {isAdmin && (
                <div>
                  <label className="block font-extrabold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                    STATUS DOKUMEN
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-djpb-blue"
                  >
                    <option value="Diajukan">Diajukan</option>
                    <option value="Disetujui">Disetujui</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Ditolak">Ditolak</option>
                  </select>
                </div>
              )}
            </div>

            <div className="text-xs">
              <label className="block font-extrabold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                TANGGAL SURAT
              </label>
              <input
                type="text"
                value={formDateString}
                onChange={(e) => setFormDateString(e.target.value)}
                placeholder="Isi tanggal surat (misal: 08 Juni 2026)..."
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-djpb-blue"
              />
            </div>

            {/* Items Table Editor */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800 uppercase text-[11px] tracking-wider">
                  DAFTAR ITEM BARANG ({formItems.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddFormItem}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-djpb-blue border border-blue-200 text-xs font-bold rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Baris Item</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 text-center w-12">No</th>
                      <th className="py-2.5 px-3">Nama Barang</th>
                      <th className="py-2.5 px-3 text-center w-24">Jumlah</th>
                      <th className="py-2.5 px-3 text-center w-28">Satuan</th>
                      <th className="py-2.5 px-3 text-center w-16">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            required
                            value={item.itemName}
                            onChange={(e) => handleUpdateFormItem(idx, 'itemName', e.target.value)}
                            placeholder="Ketik nama barang..."
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:border-djpb-blue"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min={1}
                            required
                            value={item.quantity}
                            onChange={(e) => handleUpdateFormItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full p-2 text-center bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-djpb-blue"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={item.unit}
                            onChange={(e) => handleUpdateFormItem(idx, 'unit', e.target.value)}
                            className="w-full p-2 text-center bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:border-djpb-blue"
                          >
                            <option value="buah">buah</option>
                            <option value="kotak">kotak</option>
                            <option value="rim">rim</option>
                            <option value="pack">pack</option>
                            <option value="botol">botol</option>
                            <option value="set">set</option>
                            <option value="dus">dus</option>
                            <option value="roll">roll</option>
                          </select>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveFormItem(idx)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Baris Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DATA PEJABAT PENGUSUL */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                DATA PEJABAT PENGUSUL (DIAJUKAN OLEH)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                    Jabatan
                  </label>
                  <input
                    type="text"
                    value={formProposedTitle}
                    onChange={(e) => setFormProposedTitle(e.target.value)}
                    placeholder="Isi jabatan pengusul..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                    Nama Pejabat
                  </label>
                  <input
                    type="text"
                    value={formProposedName}
                    onChange={(e) => setFormProposedName(e.target.value)}
                    placeholder="Isi nama pejabat..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                    NIP Pejabat
                  </label>
                  <input
                    type="text"
                    value={formProposedNip}
                    onChange={(e) => setFormProposedNip(e.target.value)}
                    placeholder="Isi NIP pejabat..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveTab(isAdmin ? 'spbp' : 'history')}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-extrabold rounded-xl shadow-md transition-colors flex items-center space-x-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RIWAYAT & DAFTAR SURAT PERMINTAAN (ADMIN REVIEW & APPROVAL TABLE) */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          
          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nomor surat, bidang, atau nama barang..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-djpb-blue"
              />
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto">
              <span className="text-slate-500 font-semibold text-[11px]">Filter Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="semua">Semua Status</option>
                <option value="diajukan">Diajukan (Meminta Persetujuan)</option>
                <option value="disetujui">Disetujui</option>
                <option value="selesai">Selesai</option>
                <option value="ditolak">Ditolak</option>
              </select>
            </div>
          </div>

          {/* History Data Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-extrabold uppercase border-b border-slate-200 tracking-wider">
                    <th className="py-3.5 px-4">Nomor Dokumen SPBP</th>
                    <th className="py-3.5 px-4">Bidang / Bagian</th>
                    <th className="py-3.5 px-4">Tanggal Surat</th>
                    <th className="py-3.5 px-4">Ringkasan Barang</th>
                    <th className="py-3.5 px-4">Pengusul</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">{isAdmin ? 'Aksi Admin' : 'Aksi'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-djpb-blue">
                        {req.documentNo}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {req.division}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {formatDisplayDate(req.date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">
                          {req.items.slice(0, 2).map(i => `${i.itemName} (${i.quantity} ${i.unit})`).join(', ')}
                          {req.items.length > 2 && <span className="text-slate-400 font-normal"> +{req.items.length - 2} item lainnya</span>}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-800">{req.proposedByName || '-'}</p>
                        <p className="text-[10px] text-slate-500">{req.proposedByTitle}</p>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center space-x-1 ${
                          req.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          req.status === 'Selesai' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                          req.status === 'Ditolak' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                          'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {req.status === 'Diajukan' && <Clock className="w-3 h-3 text-amber-600" />}
                          {req.status === 'Disetujui' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {req.status === 'Selesai' && <ShieldCheck className="w-3 h-3 text-blue-600" />}
                          {req.status === 'Ditolak' && <XCircle className="w-3 h-3 text-rose-600" />}
                          <span>{req.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Approve Button (Admin Only) */}
                          {isAdmin && req.status === 'Diajukan' && (
                            <button
                              type="button"
                              onClick={(e) => handleApproveRequest(req.id, e)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center space-x-1 cursor-pointer"
                              title="Setujui (Approve) Permintaan"
                            >
                              <Check className="w-3 h-3" />
                              <span>Setujui</span>
                            </button>
                          )}

                          {/* View Document */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDocument(req);
                              setActiveTab('document');
                            }}
                            className="px-2.5 py-1 bg-djpb-blue hover:bg-djpb-blue-light text-white rounded-lg font-bold text-[11px] transition-colors flex items-center space-x-1 cursor-pointer"
                            title="Pratinjau Surat Official"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Surat</span>
                          </button>

                          {/* Cetak / Unduh PDF */}
                          <button
                            type="button"
                            onClick={() => handlePrintDocument(req)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors flex items-center space-x-1 cursor-pointer"
                            title="Cetak Surat / Simpan PDF"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Cetak PDF</span>
                          </button>

                          {/* Edit Button (Admin Only) */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditModal(req, e)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-djpb-blue rounded-lg border border-blue-200 transition-colors cursor-pointer"
                              title="Ubah Dokumen Surat"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Button (Admin Only) */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => handleConfirmDelete(req.id, e)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] rounded-lg border border-rose-200 transition-colors flex items-center space-x-1 cursor-pointer"
                              title="Hapus Dokumen Surat SPBP"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          )}

                          {/* Export Excel (Admin Only) */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDownloadExcel(req)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Unduh Excel"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL ADMIN: UBAH (EDIT) DOKUMEN SURAT PERMINTAAN */}
      {/* ========================================================================= */}
      {editingDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-100 text-djpb-blue rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-slate-900 text-sm md:text-base">
                    Ubah (Edit) Surat Permintaan Barang Persediaan
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {editingDocument.documentNo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDocument(null)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedDocument} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">Nomor Surat</label>
                  <input
                    type="text"
                    required
                    value={editingDocument.documentNo}
                    onChange={(e) => setEditingDocument({ ...editingDocument, documentNo: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">Bidang / Bagian</label>
                  <input
                    type="text"
                    required
                    value={editingDocument.division}
                    onChange={(e) => setEditingDocument({ ...editingDocument, division: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">Status Dokumen</label>
                  <select
                    value={editingDocument.status}
                    onChange={(e) => setEditingDocument({ ...editingDocument, status: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded font-bold bg-slate-50 text-slate-900"
                  >
                    <option value="Diajukan">Diajukan (Meminta Persetujuan)</option>
                    <option value="Disetujui">Disetujui</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Ditolak">Ditolak</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] mb-1">Tanggal Surat</label>
                <input
                  type="text"
                  required
                  value={editingDocument.date}
                  onChange={(e) => setEditingDocument({ ...editingDocument, date: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              {/* Items Table Editor */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 uppercase text-[11px]">Daftar Item Barang ({editingDocument.items.length})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const newItems = [
                        ...editingDocument.items,
                        { no: editingDocument.items.length + 1, itemName: '', quantity: 1, unit: 'buah' }
                      ];
                      setEditingDocument({ ...editingDocument, items: newItems });
                    }}
                    className="px-2.5 py-1 bg-blue-50 text-djpb-blue text-[11px] font-bold rounded border border-blue-200 flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah Baris Item</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2 px-2 text-center w-10">No</th>
                        <th className="py-2 px-2">Nama Barang</th>
                        <th className="py-2 px-2 text-center w-20">Jumlah</th>
                        <th className="py-2 px-2 text-center w-24">Satuan</th>
                        <th className="py-2 px-2 text-center w-12">Hapus</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {editingDocument.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-1.5 px-2 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={item.itemName}
                              onChange={(e) => {
                                const newItems = [...editingDocument.items];
                                newItems[idx].itemName = e.target.value;
                                setEditingDocument({ ...editingDocument, items: newItems });
                              }}
                              className="w-full p-1 border border-slate-300 rounded"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...editingDocument.items];
                                newItems[idx].quantity = parseInt(e.target.value) || 1;
                                setEditingDocument({ ...editingDocument, items: newItems });
                              }}
                              className="w-full p-1 text-center border border-slate-300 rounded font-mono font-bold"
                            />
                          </td>
                          <td className="py-1.5 px-2">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => {
                                const newItems = [...editingDocument.items];
                                newItems[idx].unit = e.target.value;
                                setEditingDocument({ ...editingDocument, items: newItems });
                              }}
                              className="w-full p-1 text-center border border-slate-300 rounded"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = editingDocument.items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, no: i + 1 }));
                                setEditingDocument({ ...editingDocument, items: newItems });
                              }}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pejabat Pengusul */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="font-extrabold text-slate-800 uppercase text-[10px]">Data Pejabat Pengusul (Diajukan Oleh)</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold">Jabatan</label>
                    <input
                      type="text"
                      value={editingDocument.proposedByTitle}
                      onChange={(e) => setEditingDocument({ ...editingDocument, proposedByTitle: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 rounded font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold">Nama Pejabat</label>
                    <input
                      type="text"
                      value={editingDocument.proposedByName}
                      onChange={(e) => setEditingDocument({ ...editingDocument, proposedByName: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 rounded font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-bold">NIP Pejabat</label>
                    <input
                      type="text"
                      value={editingDocument.proposedByNip}
                      onChange={(e) => setEditingDocument({ ...editingDocument, proposedByNip: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 rounded font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDocument(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CONFIRMATION DELETE (HAPUS SURAT) */}
      {/* ========================================================================= */}
      {deletingDocumentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in zoom-in-95 duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-slate-900 text-base">
                  Konfirmasi Hapus Surat SPBP
                </h3>
                <p className="text-xs text-slate-500">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              Apakah Anda yakin ingin menghapus dokumen Surat Permintaan Barang Persediaan dengan ID <strong className="font-mono text-slate-900">{deletingDocumentId}</strong>?
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDocumentId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Dokumen</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
