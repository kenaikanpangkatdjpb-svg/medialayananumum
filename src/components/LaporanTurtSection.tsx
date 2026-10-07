import React, { useState, useMemo } from 'react';
import { 
  FileText, Download, Printer, Filter, Calendar, CheckCircle2, Clock, 
  XCircle, ArrowUpDown, Search, RefreshCw, Layers, Package, Car, Home,
  MessageSquare, CalendarCheck, FileSpreadsheet, Building2, User, Check,
  ChevronRight, BarChart3, PieChart, Sparkles, ShieldCheck, Loader2, FileDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  RoomBooking, ItemBooking, VehicleBooking, 
  FacilityFeedback, MonthlyNeed, CurrentUser 
} from '../types';
import { SuratPermintaan } from './SuratPermintaanBarangPersediaan';
import { formatDisplayDate } from '../lib/dateUtils';
import KemenkeuLogo from './KemenkeuLogo';
import { exportElementToPdf } from '../lib/pdfExport';

export type ReportCategory = 
  | 'ruangan' 
  | 'barang' 
  | 'kendaraan' 
  | 'feedback' 
  | 'persediaan';

interface LaporanTurtSectionProps {
  subTab: string;
  roomBookings: RoomBooking[];
  itemBookings: ItemBooking[];
  vehicleBookings: VehicleBooking[];
  feedbacks: FacilityFeedback[];
  needs: MonthlyNeed[];
  currentUser?: CurrentUser | null;
  onNavigateToTab?: (tabId: string) => void;
}

export default function LaporanTurtSection({
  subTab,
  roomBookings,
  itemBookings,
  vehicleBookings,
  feedbacks,
  needs,
  currentUser,
  onNavigateToTab
}: LaporanTurtSectionProps) {
  // Determine initial category from subTab
  const getCategoryFromSubTab = (tab: string): ReportCategory => {
    if (tab === 'laporan-barang') return 'barang';
    if (tab === 'laporan-kendaraan') return 'kendaraan';
    if (tab === 'laporan-feedback') return 'feedback';
    if (tab === 'laporan-persediaan') return 'persediaan';
    return 'ruangan';
  };

  const [activeCategory, setActiveCategory] = useState<ReportCategory>(() => getCategoryFromSubTab(subTab));

  // Sync if subTab prop changes
  React.useEffect(() => {
    if (subTab.startsWith('laporan-')) {
      const cat = getCategoryFromSubTab(subTab);
      setActiveCategory(cat);
    }
  }, [subTab]);

  // Filter States
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('semua');
  const [divisionFilter, setDivisionFilter] = useState<string>('semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [specificFilter, setSpecificFilter] = useState<string>('semua'); // For room/item/vehicle/category

  // Print modal state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [signerName, setSignerName] = useState('Ahmad Nauval');
  const [signerNip, setSignerNip] = useState('198210042002121003');
  const [signerTitle, setSignerTitle] = useState('Kepala Subbagian Tata Usaha dan Rumah Tangga');
  const [reportTitleCustom, setReportTitleCustom] = useState('');

  // Sample SPBP data for persediaan report if none from storage
  const [spbpRequests, setSpbpRequests] = useState<SuratPermintaan[]>(() => {
    try {
      const stored = localStorage.getItem('melayu_spbp_requests');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'SPBP-2026-06-001',
        documentNo: 'SPBP/PAPK/2026/06/001',
        division: 'Bidang PAPK',
        date: '08 Juni 2026',
        items: [
          { no: 1, itemName: 'Tissue Halus/Kotak', quantity: 10, unit: 'buah' },
          { no: 2, itemName: 'Map Transparan A4', quantity: 10, unit: 'buah' },
          { no: 3, itemName: 'Amplop Putih', quantity: 20, unit: 'buah' }
        ],
        approvedByTitle: 'Kepala Subbagian TURT',
        approvedByName: 'Ahmad Nauval',
        approvedByNip: '198210042002121003',
        proposedByTitle: 'Kepala Seksi ASPLK',
        proposedByName: 'Yasmi',
        proposedByNip: '196901091998031001',
        status: 'Disetujui',
        createdDate: '2026-06-08'
      },
      {
        id: 'SPBP-2026-07-002',
        documentNo: 'SPBP/PPA1/2026/07/002',
        division: 'Bidang PPA I',
        date: '30 Juli 2026',
        items: [
          { no: 1, itemName: 'Kertas HVS A4 80gr Gramedia', quantity: 20, unit: 'rim' },
          { no: 2, itemName: 'Tinta Printer Canon Black GI-790', quantity: 5, unit: 'botol' }
        ],
        approvedByTitle: 'Kepala Subbagian TURT',
        approvedByName: 'Ahmad Nauval',
        approvedByNip: '198210042002121003',
        proposedByTitle: 'Kepala Seksi PPA I-A',
        proposedByName: 'Budi Santoso',
        proposedByNip: '197805142001121002',
        status: 'Diajukan',
        createdDate: '2026-07-30'
      },
      {
        id: 'SPBP-2026-05-004',
        documentNo: 'SPBP/SKKI/2026/05/004',
        division: 'Bidang SKKI',
        date: '15 Mei 2026',
        items: [
          { no: 1, itemName: 'Kertas A4 80gr Gramedia', quantity: 15, unit: 'rim' },
          { no: 2, itemName: 'Tinta Printer Canon Black', quantity: 4, unit: 'botol' }
        ],
        approvedByTitle: 'Kepala Subbagian TURT',
        approvedByName: 'Ahmad Nauval',
        approvedByNip: '198210042002121003',
        proposedByTitle: 'Kepala Seksi Kepatuhan Internal',
        proposedByName: 'Dwi Rahmawati',
        proposedByNip: '198503122008012002',
        status: 'Selesai',
        createdDate: '2026-05-15'
      }
    ];
  });

  // Helper date filter
  const isDateInRange = (dateStr: string) => {
    if (!dateStr) return true;
    const cleanDate = dateStr.length >= 10 ? dateStr.substring(0, 10) : dateStr;
    if (startDate && cleanDate < startDate) return false;
    if (endDate && cleanDate > endDate) return false;
    return true;
  };

  // Quick Date presets
  const handleQuickDatePreset = (preset: 'today' | '7days' | 'month' | 'year' | 'all') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      setStartDate(`${year}-${month}-01`);
      setEndDate(todayStr);
    } else if (preset === 'year') {
      const year = today.getFullYear();
      setStartDate(`${year}-01-01`);
      setEndDate(`${year}-12-31`);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // 1. FILTERED ROOM BOOKINGS
  const filteredRooms = useMemo(() => {
    return roomBookings.filter(item => {
      if (!isDateInRange(item.date)) return false;
      if (statusFilter !== 'semua' && item.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (divisionFilter !== 'semua' && item.division !== divisionFilter) return false;
      if (specificFilter !== 'semua' && item.roomName !== specificFilter) return false;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchName = item.bookerName?.toLowerCase().includes(query);
        const matchRoom = item.roomName?.toLowerCase().includes(query);
        const matchPurpose = item.purpose?.toLowerCase().includes(query);
        const matchDiv = item.division?.toLowerCase().includes(query);
        if (!matchName && !matchRoom && !matchPurpose && !matchDiv) return false;
      }
      return true;
    });
  }, [roomBookings, startDate, endDate, statusFilter, divisionFilter, specificFilter, searchTerm]);

  // 2. FILTERED ITEM BOOKINGS
  const filteredItems = useMemo(() => {
    return itemBookings.filter(item => {
      if (!isDateInRange(item.date)) return false;
      if (statusFilter !== 'semua' && item.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (divisionFilter !== 'semua' && item.division !== divisionFilter) return false;
      if (specificFilter !== 'semua' && item.itemName !== specificFilter) return false;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchName = item.bookerName?.toLowerCase().includes(query);
        const matchItem = item.itemName?.toLowerCase().includes(query);
        const matchDiv = item.division?.toLowerCase().includes(query);
        if (!matchName && !matchItem && !matchDiv) return false;
      }
      return true;
    });
  }, [itemBookings, startDate, endDate, statusFilter, divisionFilter, specificFilter, searchTerm]);

  // 3. FILTERED VEHICLE BOOKINGS
  const filteredVehicles = useMemo(() => {
    return vehicleBookings.filter(item => {
      if (!isDateInRange(item.date)) return false;
      if (statusFilter !== 'semua' && item.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (divisionFilter !== 'semua' && item.division !== divisionFilter) return false;
      if (specificFilter !== 'semua' && item.vehicleName !== specificFilter) return false;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchName = item.bookerName?.toLowerCase().includes(query);
        const matchDest = item.destination?.toLowerCase().includes(query);
        const matchVeh = item.vehicleName?.toLowerCase().includes(query);
        const matchDiv = item.division?.toLowerCase().includes(query);
        if (!matchName && !matchDest && !matchVeh && !matchDiv) return false;
      }
      return true;
    });
  }, [vehicleBookings, startDate, endDate, statusFilter, divisionFilter, specificFilter, searchTerm]);

  // 4. FILTERED FACILITY FEEDBACK
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(item => {
      if (!isDateInRange(item.date)) return false;
      if (statusFilter !== 'semua' && item.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (divisionFilter !== 'semua' && item.reporterDivision !== divisionFilter) return false;
      if (specificFilter !== 'semua' && item.category !== specificFilter) return false;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchName = item.reporterName?.toLowerCase().includes(query);
        const matchDesc = item.description?.toLowerCase().includes(query);
        const matchCat = item.category?.toLowerCase().includes(query);
        if (!matchName && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [feedbacks, startDate, endDate, statusFilter, divisionFilter, specificFilter, searchTerm]);

  // 5. FILTERED PERMINTAAN PERSEDIAAN (SPBP)
  const filteredSpbp = useMemo(() => {
    return spbpRequests.filter(item => {
      const dateToCheck = item.createdDate || item.date;
      if (!isDateInRange(dateToCheck)) return false;
      if (statusFilter !== 'semua' && item.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (divisionFilter !== 'semua' && item.division !== divisionFilter) return false;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchDoc = item.documentNo?.toLowerCase().includes(query);
        const matchDiv = item.division?.toLowerCase().includes(query);
        const matchName = item.proposedByName?.toLowerCase().includes(query);
        const matchItems = item.items?.some(it => it.itemName?.toLowerCase().includes(query));
        if (!matchDoc && !matchDiv && !matchName && !matchItems) return false;
      }
      return true;
    });
  }, [spbpRequests, startDate, endDate, statusFilter, divisionFilter, searchTerm]);

  // Summary Metrics depending on active category
  const metrics = useMemo(() => {
    if (activeCategory === 'ruangan') {
      const total = filteredRooms.length;
      const approved = filteredRooms.filter(r => r.status === 'Disetujui').length;
      const pending = filteredRooms.filter(r => r.status === 'Pending').length;
      const rejected = filteredRooms.filter(r => r.status === 'Ditolak').length;
      return { total, approved, pending, other: rejected, otherLabel: 'Ditolak' };
    }
    if (activeCategory === 'barang') {
      const total = filteredItems.length;
      const borrowed = filteredItems.filter(r => r.status === 'Dipinjam').length;
      const returned = filteredItems.filter(r => r.status === 'Kembali').length;
      const pending = filteredItems.filter(r => r.status === 'Pending').length;
      const rejected = filteredItems.filter(r => r.status === 'Ditolak').length;
      return { total, approved: borrowed + returned, pending, other: rejected, otherLabel: 'Ditolak', detailLabel: `${returned} Sudah Kembali` };
    }
    if (activeCategory === 'kendaraan') {
      const total = filteredVehicles.length;
      const approved = filteredVehicles.filter(r => r.status === 'Disetujui' || r.status === 'Selesai').length;
      const pending = filteredVehicles.filter(r => r.status === 'Pending').length;
      const rejected = filteredVehicles.filter(r => r.status === 'Ditolak').length;
      return { total, approved, pending, other: rejected, otherLabel: 'Ditolak' };
    }
    if (activeCategory === 'feedback') {
      const total = filteredFeedbacks.length;
      const resolved = filteredFeedbacks.filter(r => r.status === 'Resolved').length;
      const inProgress = filteredFeedbacks.filter(r => r.status === 'In Progress').length;
      const open = filteredFeedbacks.filter(r => r.status === 'Open').length;
      return { total, approved: resolved, pending: open, other: inProgress, otherLabel: 'Diproses' };
    }
    // persediaan
    const total = filteredSpbp.length;
    const approved = filteredSpbp.filter(r => r.status === 'Disetujui' || r.status === 'Selesai').length;
    const pending = filteredSpbp.filter(r => r.status === 'Diajukan' || r.status === 'Draf').length;
    const rejected = filteredSpbp.filter(r => r.status === 'Ditolak').length;
    return { total, approved, pending, other: rejected, otherLabel: 'Ditolak' };
  }, [activeCategory, filteredRooms, filteredItems, filteredVehicles, filteredFeedbacks, filteredSpbp]);

  // Export to Excel Functionality
  const handleExportExcel = () => {
    let filename = '';
    let sheetData: any[] = [];

    const nowStr = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

    if (activeCategory === 'ruangan') {
      filename = `Laporan_Peminjaman_Ruangan_DJPb_Riau_${new Date().toISOString().split('T')[0]}.xlsx`;
      sheetData = filteredRooms.map((r, idx) => ({
        'No': idx + 1,
        'Nama Ruangan': r.roomName,
        'Tanggal Kegiatan': r.date,
        'Waktu (WIB)': `${r.startTime} - ${r.endTime}`,
        'Nama Peminjam': r.bookerName,
        'Unit / Bidang': r.division,
        'Nama / Agenda Kegiatan': r.purpose,
        'Peralatan Tambahan': r.equipmentNeeded || '-',
        'Status Pengajuan': r.status,
        'Catatan Verifikator': r.statusNote || '-'
      }));
    } else if (activeCategory === 'barang') {
      filename = `Laporan_Peminjaman_Barang_DJPb_Riau_${new Date().toISOString().split('T')[0]}.xlsx`;
      sheetData = filteredItems.map((item, idx) => ({
        'No': idx + 1,
        'Nama Barang': item.itemName,
        'Jumlah (Unit)': item.quantity,
        'Tanggal Pinjam': item.date,
        'Nama Peminjam': item.bookerName,
        'Unit / Bidang': item.division,
        'Status': item.status,
        'Keterangan Status': item.statusNote || '-'
      }));
    } else if (activeCategory === 'kendaraan') {
      filename = `Laporan_Peminjaman_Kendaraan_DJPb_Riau_${new Date().toISOString().split('T')[0]}.xlsx`;
      sheetData = filteredVehicles.map((v, idx) => ({
        'No': idx + 1,
        'Kendaraan Dinas': v.vehicleName,
        'No. Polisi': v.plateNumber || '-',
        'Supir / Pengemudi': v.driverName || 'Tanpa Supir',
        'Tanggal Berangkat': v.date,
        'Jam Operasional': `${v.startTime || '08:00'} - ${v.endTime || '16:00'} WIB`,
        'Durasi (Hari)': v.durationDays,
        'Nama Pemohon': v.bookerName,
        'Unit / Bidang': v.division,
        'Tujuan Perjalanan Dinas': v.destination,
        'Status': v.status,
        'Catatan': v.statusNote || '-'
      }));
    } else if (activeCategory === 'feedback') {
      filename = `Laporan_Feedback_Sarpras_DJPb_Riau_${new Date().toISOString().split('T')[0]}.xlsx`;
      sheetData = filteredFeedbacks.map((f, idx) => ({
        'No': idx + 1,
        'Kategori Aduan': f.category,
        'Tanggal Lapor': f.date,
        'Pelapor': f.reporterName,
        'Unit / Bidang': f.reporterDivision,
        'Uraian Aduan / Kerusakan': f.description,
        'Status Penanganan': f.status,
        'Rating Kepuasan': f.rating ? `${f.rating}/5 Bintang` : '-'
      }));
    } else {
      filename = `Laporan_Permintaan_Barang_Persediaan_DJPb_Riau_${new Date().toISOString().split('T')[0]}.xlsx`;
      sheetData = filteredSpbp.map((s, idx) => ({
        'No': idx + 1,
        'No. Dokumen SPBP': s.documentNo,
        'Tanggal SPBP': s.date,
        'Unit Pemohon': s.division,
        'Pejabat Pengusul': `${s.proposedByName} (${s.proposedByTitle})`,
        'Daftar Barang Diminta': s.items.map(it => `${it.itemName} (${it.quantity} ${it.unit})`).join('; '),
        'Status': s.status,
        'Pejabat Penyetuju': `${s.approvedByName} (${s.approvedByTitle})`
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Rekapitulasi');
    XLSX.writeFile(workbook, filename);
  };

  // Direct PDF Export function
  const handleDownloadPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);

    try {
      const cleanTitle = (reportTitleCustom || `Laporan_${activeCategory}`).replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${cleanTitle}.pdf`;

      const success = await exportElementToPdf({
        filename,
        elementId: 'printable-report-sheet',
        onSuccess: () => {
          setIsExportingPdf(false);
        },
        onError: (err) => {
          setIsExportingPdf(false);
          console.error('PDF export error:', err);
          window.print();
        }
      });

      if (!success) {
        setIsExportingPdf(false);
      }
    } catch (err) {
      setIsExportingPdf(false);
      console.error('PDF export error:', err);
      window.print();
    }
  };

  // Safe browser print
  const handlePrintDocument = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('Native print failed, falling back to PDF download:', err);
      handleDownloadPdf();
    }
  };

  // Open Print Preview Modal
  const handleOpenPrintPreview = () => {
    let title = '';
    if (activeCategory === 'ruangan') title = 'LAPORAN REKAPITULASI PEMINJAMAN RUANG RAPAT & AULA';
    else if (activeCategory === 'barang') title = 'LAPORAN REKAPITULASI PEMINJAMAN BARANG INVENTARIS KANTOR';
    else if (activeCategory === 'kendaraan') title = 'LAPORAN REKAPITULASI PEMINJAMAN KENDARAAN DINAS JABATAN/OPERASIONAL';
    else if (activeCategory === 'feedback') title = 'LAPORAN REKAPITULASI ADUAN & FEEDBACK SARANA PRASARANA';
    else title = 'LAPORAN REKAPITULASI PERMINTAAN BARANG PERSEDIAAN (SPBP)';

    setReportTitleCustom(title);
    setShowPrintModal(true);
  };

  // Category Configuration
  const categoryConfig = [
    { id: 'ruangan' as ReportCategory, label: 'Peminjaman Ruangan', icon: Home, count: filteredRooms.length },
    { id: 'barang' as ReportCategory, label: 'Peminjaman Barang', icon: Package, count: filteredItems.length },
    { id: 'kendaraan' as ReportCategory, label: 'Peminjaman Kendaraan', icon: Car, count: filteredVehicles.length },
    { id: 'feedback' as ReportCategory, label: 'Feedback Sarpras', icon: MessageSquare, count: filteredFeedbacks.length },
    { id: 'persediaan' as ReportCategory, label: 'Permintaan Persediaan', icon: CalendarCheck, count: filteredSpbp.length }
  ];

  return (
    <div className="space-y-6" id="laporan-turt-container">
      {/* 1. Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-djpb-blue/10 text-djpb-blue rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-display font-bold text-slate-800">
                Pusat Pembuatan Laporan Subbagian TURT
              </h1>
              <p className="text-xs text-slate-500">
                Modul Administrator untuk menyusun, memfilter, mencetak, dan mengunduh rekapitulasi data layanan umum & sarpras.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            id="btn-export-excel"
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Download file Excel (.xlsx)"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <button
            id="btn-print-laporan"
            onClick={handleOpenPrintPreview}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Pratinjau Cetak / PDF Resmi"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan Resmi</span>
          </button>
        </div>
      </div>

      {/* 2. Category Switcher Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2" id="report-category-tabs">
        {categoryConfig.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              id={`tab-report-${cat.id}`}
              onClick={() => {
                setActiveCategory(cat.id);
                setStatusFilter('semua');
                setDivisionFilter('semua');
                setSpecificFilter('semua');
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                isActive 
                  ? 'bg-djpb-blue text-white border-djpb-blue shadow-sm' 
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-500'}`} />
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {cat.count} Data
                </span>
              </div>
              <div>
                <p className="text-xs font-bold leading-tight line-clamp-1">{cat.label}</p>
                <p className={`text-[10px] ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                  Rekap & Ekspor Data
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Filter & Period Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4" id="report-filter-panel">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-djpb-blue" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Filter & Parameter Laporan
            </span>
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 mr-1">Pintasan Tanggal:</span>
            <button
              type="button"
              onClick={() => handleQuickDatePreset('today')}
              className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => handleQuickDatePreset('7days')}
              className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => handleQuickDatePreset('month')}
              className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => handleQuickDatePreset('year')}
              className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Tahun Ini (2026)
            </button>
            <button
              type="button"
              onClick={() => handleQuickDatePreset('all')}
              className="text-[11px] px-2.5 py-1 bg-blue-50 text-djpb-blue hover:bg-blue-100 font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Semua Periode
            </button>
          </div>
        </div>

        {/* Input Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Dari Tanggal */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mulai Tanggal</label>
            <input 
              type="date"
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:ring-1 focus:ring-djpb-blue"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Sampai Tanggal */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sampai Tanggal</label>
            <input 
              type="date"
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:ring-1 focus:ring-djpb-blue"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
            <select
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="semua">Semua Status</option>
              {activeCategory === 'ruangan' && (
                <>
                  <option value="Disetujui">Disetujui</option>
                  <option value="Pending">Pending</option>
                  <option value="Ditolak">Ditolak</option>
                </>
              )}
              {activeCategory === 'barang' && (
                <>
                  <option value="Dipinjam">Dipinjam (Disetujui)</option>
                  <option value="Kembali">Kembali (Sudah Dikembalikan)</option>
                  <option value="Pending">Pending</option>
                  <option value="Ditolak">Ditolak</option>
                </>
              )}
              {activeCategory === 'kendaraan' && (
                <>
                  <option value="Disetujui">Disetujui</option>
                  <option value="Pending">Pending</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Ditolak">Ditolak</option>
                </>
              )}
              {activeCategory === 'feedback' && (
                <>
                  <option value="Resolved">Resolved (Selesai)</option>
                  <option value="In Progress">In Progress (Diproses)</option>
                  <option value="Open">Open (Menunggu Tindak Lanjut)</option>
                </>
              )}
              {activeCategory === 'persediaan' && (
                <>
                  <option value="Disetujui">Disetujui</option>
                  <option value="Diajukan">Diajukan</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Ditolak">Ditolak</option>
                </>
              )}
            </select>
          </div>

          {/* Division Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unit / Bidang</label>
            <select
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:bg-white"
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
            >
              <option value="semua">Semua Bidang / Bagian</option>
              <option value="Bagian Umum">Bagian Umum</option>
              <option value="Bidang PPA I">Bidang PPA I</option>
              <option value="Bidang PPA II">Bidang PPA II</option>
              <option value="Bidang PAPK">Bidang PAPK</option>
              <option value="Bidang SKKI">Bidang SKKI</option>
            </select>
          </div>

          {/* Specific Search */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cari Kata Kunci</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input 
                type="text"
                placeholder="Nama / Agenda / Keterangan..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:ring-1 focus:ring-djpb-blue"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Terdata</span>
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-slate-800 mt-2">{metrics.total}</p>
          <p className="text-[10px] text-slate-400 mt-1">Sesuai kriteria filter</p>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Disetujui / Selesai</span>
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-900 mt-2">{metrics.approved}</p>
          <p className="text-[10px] text-emerald-700 mt-1">
            {metrics.total > 0 ? `${Math.round((metrics.approved / metrics.total) * 100)}% terealisasi` : 'Tidak ada data'}
          </p>
        </div>

        <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Pending / Proses</span>
            <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-amber-900 mt-2">{metrics.pending}</p>
          <p className="text-[10px] text-amber-700 mt-1">Menunggu penanganan</p>
        </div>

        <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">{metrics.otherLabel}</span>
            <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-rose-900 mt-2">{metrics.other}</p>
          <p className="text-[10px] text-rose-700 mt-1">Status {metrics.otherLabel.toLowerCase()}</p>
        </div>
      </div>

      {/* 5. Main Report Table Content */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <span>Rekapitulasi Data: {categoryConfig.find(c => c.id === activeCategory)?.label}</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Menampilkan {
                activeCategory === 'ruangan' ? filteredRooms.length :
                activeCategory === 'barang' ? filteredItems.length :
                activeCategory === 'kendaraan' ? filteredVehicles.length :
                activeCategory === 'feedback' ? filteredFeedbacks.length :
                filteredSpbp.length
              } catatan
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <span>Periode:</span>
            <span className="font-semibold text-slate-700">
              {startDate ? formatDisplayDate(startDate) : 'Awal'} s.d. {endDate ? formatDisplayDate(endDate) : 'Sekarang'}
            </span>
          </div>
        </div>

        {/* Table Rendering Based on Active Category */}
        <div className="overflow-x-auto">
          {/* A. RUANGAN */}
          {activeCategory === 'ruangan' && (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] text-slate-400 uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Ruangan</th>
                  <th className="py-3 px-4">Tanggal & Jam (WIB)</th>
                  <th className="py-3 px-4">Pemohon & Unit</th>
                  <th className="py-3 px-4">Nama Kegiatan</th>
                  <th className="py-3 px-4">Peralatan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Catatan Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      Tidak ada data peminjaman ruangan yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((room, idx) => (
                    <tr key={room.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{room.roomName}</td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-800">{formatDisplayDate(room.date)}</div>
                        <div className="text-[10px] text-djpb-blue font-mono">{room.startTime} - {room.endTime} WIB</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{room.bookerName}</div>
                        <div className="text-[10px] text-slate-400">{room.division}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs">{room.purpose}</td>
                      <td className="py-3 px-4 text-slate-500">{room.equipmentNeeded || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          room.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-700' :
                          room.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                          'bg-rose-50 text-rose-700'
                        }`}>
                          {room.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">{room.statusNote || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* B. BARANG */}
          {activeCategory === 'barang' && (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] text-slate-400 uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Barang Inventaris</th>
                  <th className="py-3 px-4 text-center">Jumlah</th>
                  <th className="py-3 px-4">Tanggal Pinjam</th>
                  <th className="py-3 px-4">Nama Peminjam</th>
                  <th className="py-3 px-4">Unit / Bidang</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Keterangan / Status Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      Tidak ada data peminjaman barang yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{item.itemName}</td>
                      <td className="py-3 px-4 text-center font-mono font-semibold">{item.quantity} Unit</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{formatDisplayDate(item.date)}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{item.bookerName}</td>
                      <td className="py-3 px-4 text-slate-500">{item.division}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          item.status === 'Dipinjam' ? 'bg-blue-50 text-blue-700' :
                          item.status === 'Kembali' ? 'bg-emerald-50 text-emerald-700' :
                          item.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                          'bg-rose-50 text-rose-700'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">{item.statusNote || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* C. KENDARAAN */}
          {activeCategory === 'kendaraan' && (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] text-slate-400 uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Kendaraan & Plat</th>
                  <th className="py-3 px-4">Layanan Supir</th>
                  <th className="py-3 px-4">Tanggal & Jam</th>
                  <th className="py-3 px-4">Pemohon & Unit</th>
                  <th className="py-3 px-4">Tujuan Perjalanan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      Tidak ada data peminjaman kendaraan yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((veh, idx) => (
                    <tr key={veh.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{veh.vehicleName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{veh.plateNumber || '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] text-slate-700 font-medium">{veh.driverName || 'Tanpa Supir'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-800">{formatDisplayDate(veh.date)} ({veh.durationDays} hari)</div>
                        <div className="text-[10px] text-amber-800 font-mono font-medium">{veh.startTime || '08:00'} - {veh.endTime || '16:00'} WIB</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{veh.bookerName}</div>
                        <div className="text-[10px] text-slate-400">{veh.division}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs">{veh.destination}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          veh.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-700' :
                          veh.status === 'Selesai' ? 'bg-blue-50 text-blue-700' :
                          veh.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                          'bg-rose-50 text-rose-700'
                        }`}>
                          {veh.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">{veh.statusNote || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* D. FEEDBACK SARPRAS */}
          {activeCategory === 'feedback' && (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] text-slate-400 uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Kategori Aduan</th>
                  <th className="py-3 px-4">Tanggal Lapor</th>
                  <th className="py-3 px-4">Pelapor & Unit</th>
                  <th className="py-3 px-4">Uraian Aduan / Kerusakan</th>
                  <th className="py-3 px-4">Status Penanganan</th>
                  <th className="py-3 px-4">Rating Kepuasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFeedbacks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      Tidak ada data feedback sarana prasarana yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredFeedbacks.map((fb, idx) => (
                    <tr key={fb.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          fb.category === 'AC' ? 'bg-sky-50 text-sky-700' :
                          fb.category === 'IT / Jaringan' ? 'bg-purple-50 text-purple-700' :
                          fb.category === 'Kebersihan' ? 'bg-emerald-50 text-emerald-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {fb.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">{formatDisplayDate(fb.date)}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{fb.reporterName}</div>
                        <div className="text-[10px] text-slate-400">{fb.reporterDivision}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-sm">{fb.description}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          fb.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700' :
                          fb.status === 'In Progress' ? 'bg-amber-50 text-amber-700' :
                          'bg-rose-50 text-rose-700'
                        }`}>
                          {fb.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">{fb.rating ? `${fb.rating}/5 ★` : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* E. PERSEDIAAN (SPBP) */}
          {activeCategory === 'persediaan' && (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] text-slate-400 uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">No. Dokumen SPBP</th>
                  <th className="py-3 px-4">Tanggal SPBP</th>
                  <th className="py-3 px-4">Unit Pemohon</th>
                  <th className="py-3 px-4">Pejabat Pengusul</th>
                  <th className="py-3 px-4">Daftar Barang Diminta</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Verifikator TURT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSpbp.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      Tidak ada data permintaan persediaan yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredSpbp.map((spbp, idx) => (
                    <tr key={spbp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-djpb-blue">{spbp.documentNo}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{spbp.date}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{spbp.division}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-700">{spbp.proposedByName}</div>
                        <div className="text-[10px] text-slate-400">{spbp.proposedByTitle}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                          {spbp.items.map((it, i) => (
                            <li key={i}>{it.itemName} ({it.quantity} {it.unit})</li>
                          ))}
                        </ul>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          spbp.status === 'Disetujui' ? 'bg-emerald-50 text-emerald-700' :
                          spbp.status === 'Selesai' ? 'bg-blue-50 text-blue-700' :
                          spbp.status === 'Diajukan' ? 'bg-amber-50 text-amber-700' :
                          'bg-rose-50 text-rose-700'
                        }`}>
                          {spbp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-500">{spbp.approvedByName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 6. PRINT PREVIEW MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto print-modal-container" id="print-report-modal">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 space-y-6 my-auto max-h-[92vh] overflow-y-auto print-modal-card print:overflow-visible print:max-h-none print:p-0 print:shadow-none">
            {/* Modal Top Control Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print-modal-header print:hidden">
              <div>
                <h3 className="text-base font-display font-bold text-slate-800 flex items-center space-x-2">
                  <Printer className="w-5 h-5 text-djpb-blue" />
                  <span>Pratinjau Cetak Laporan Resmi</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Format tata naskah dinas resmi Kanwil Ditjen Perbendaharaan Provinsi Riau.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  title="Unduh langsung file PDF dokumen resmi"
                >
                  {isExportingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Simpan PDF</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handlePrintDocument}
                  className="px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
                  title="Cetak via dialog printer browser"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Dokumen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Signature & Title Parameters Setting Bar (Hidden on print) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3 print:hidden text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Pejabat Penandatangan</label>
                <input 
                  type="text" 
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">NIP Pejabat</label>
                <input 
                  type="text" 
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono"
                  value={signerNip}
                  onChange={(e) => setSignerNip(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jabatan Penandatangan</label>
                <input 
                  type="text" 
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg"
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                />
              </div>
            </div>

            {/* Print Document Paper Preview (Official DJPb Layout) */}
            <div className="bg-white p-6 sm:p-8 border border-slate-300 rounded-xl shadow-xs text-slate-900 font-sans space-y-6" id="printable-report-sheet">
              {/* Kop Surat Resmi */}
              <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
                <div className="flex items-center space-x-3">
                  <KemenkeuLogo className="w-16 h-16" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-900">KEMENTERIAN KEUANGAN REPUBLIK INDONESIA</h4>
                    <h5 className="text-[11px] font-semibold uppercase text-slate-800">DIREKTORAT JENDERAL PERBENDAHARAAN</h5>
                    <h6 className="text-[11px] font-bold uppercase text-slate-900">KANTOR WILAYAH PROVINSI RIAU</h6>
                    <p className="text-[9px] text-slate-600">Jl. Jenderal Sudirman No. 249, Pekanbaru, Riau • Telp. (0761) 21544</p>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-500 font-mono">
                  <div>TANGGAL CETAK:</div>
                  <div className="font-bold text-slate-800">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
              </div>

              {/* Judul Laporan */}
              <div className="text-center space-y-1">
                <h3 className="text-sm md:text-base font-bold uppercase tracking-wider underline text-slate-900">
                  {reportTitleCustom}
                </h3>
                <p className="text-xs text-slate-600">
                  Periode: {startDate ? formatDisplayDate(startDate) : 'Seluruh Riwayat'} s.d. {endDate ? formatDisplayDate(endDate) : 'Sekarang'}
                </p>
              </div>

              {/* Rincian Ringkasan Statistik */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs border border-slate-300 rounded-lg p-3 bg-slate-50">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Total Pengajuan</div>
                  <div className="text-base font-bold font-mono text-slate-800">{metrics.total}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Disetujui / Selesai</div>
                  <div className="text-base font-bold font-mono text-emerald-800">{metrics.approved}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Pending / Proses</div>
                  <div className="text-base font-bold font-mono text-amber-800">{metrics.pending}</div>
                </div>
              </div>

              {/* Tabel Cetak */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px] text-slate-800 border-collapse">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300">
                    {activeCategory === 'ruangan' && (
                      <tr>
                        <th className="py-2 px-3 border-r border-slate-300 w-10 text-center">No</th>
                        <th className="py-2 px-3 border-r border-slate-300">Ruangan</th>
                        <th className="py-2 px-3 border-r border-slate-300">Tanggal & Jam</th>
                        <th className="py-2 px-3 border-r border-slate-300">Pemohon / Unit</th>
                        <th className="py-2 px-3 border-r border-slate-300">Kegiatan</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    )}
                    {activeCategory === 'barang' && (
                      <tr>
                        <th className="py-2 px-3 border-r border-slate-300 w-10 text-center">No</th>
                        <th className="py-2 px-3 border-r border-slate-300">Barang Inventaris</th>
                        <th className="py-2 px-3 border-r border-slate-300 text-center">Jumlah</th>
                        <th className="py-2 px-3 border-r border-slate-300">Tgl Pinjam</th>
                        <th className="py-2 px-3 border-r border-slate-300">Peminjam / Bidang</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    )}
                    {activeCategory === 'kendaraan' && (
                      <tr>
                        <th className="py-2 px-3 border-r border-slate-300 w-10 text-center">No</th>
                        <th className="py-2 px-3 border-r border-slate-300">Mobil / Plat</th>
                        <th className="py-2 px-3 border-r border-slate-300">Supir</th>
                        <th className="py-2 px-3 border-r border-slate-300">Tgl & Jam</th>
                        <th className="py-2 px-3 border-r border-slate-300">Pemohon / Tujuan</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    )}
                    {activeCategory === 'feedback' && (
                      <tr>
                        <th className="py-2 px-3 border-r border-slate-300 w-10 text-center">No</th>
                        <th className="py-2 px-3 border-r border-slate-300">Kategori</th>
                        <th className="py-2 px-3 border-r border-slate-300">Tgl Lapor</th>
                        <th className="py-2 px-3 border-r border-slate-300">Pelapor / Unit</th>
                        <th className="py-2 px-3 border-r border-slate-300">Uraian Aduan</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    )}
                    {activeCategory === 'persediaan' && (
                      <tr>
                        <th className="py-2 px-3 border-r border-slate-300 w-10 text-center">No</th>
                        <th className="py-2 px-3 border-r border-slate-300">No. SPBP</th>
                        <th className="py-2 px-3 border-r border-slate-300">Tgl SPBP</th>
                        <th className="py-2 px-3 border-r border-slate-300">Unit Pengusul</th>
                        <th className="py-2 px-3 border-r border-slate-300">Rincian Barang</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {activeCategory === 'ruangan' && filteredRooms.map((r, i) => (
                      <tr key={r.id}>
                        <td className="py-1.5 px-3 border-r border-slate-200 text-center">{i + 1}</td>
                        <td className="py-1.5 px-3 border-r border-slate-200 font-semibold">{r.roomName}</td>
                        <td className="py-1.5 px-3 border-r border-slate-200">{r.date} ({r.startTime}-{r.endTime})</td>
                        <td className="py-1.5 px-3 border-r border-slate-200">{r.bookerName} ({r.division})</td>
                        <td className="py-1.5 px-3 border-r border-slate-200">{r.purpose}</td>
                        <td className="py-1.5 px-3 text-center font-semibold">{r.status}</td>
                      </tr>
                    ))}
                    {activeCategory === 'barang' && filteredItems.map((item, i) => (
                      <tr key={item.id}>
                        <td className="py-1.5 px-3 border-r border-slate-200 text-center">{i + 1}</td>
                        <td className="py-1.5 px-3 border-r border-slate-200 font-semibold">{item.itemName}</td>
                        <td className="py-1.5 px-3 border-r border-slate-200 text-center">{item.quantity} Unit</td>
                        <td className="py-1.5 px-3 border-r border-slate-200">{item.date}</td>
                        <td className="py-1.5 px-3 border-r border-slate-200">{item.bookerName} ({item.division})</td>
                        <td className="py-1.5 px-3 text-center font-semibold">{item.status}</td>
                      </tr>
                    ))}
                    {activeCategory === 'kendaraan' && filteredVehicles.map((v, i) => (
                      <tr key={v.id}>
                        <td className="py-1.5 px-3 border-r border-slate-200 text-center">{i + 1}</td>
                        <td className="py-1.5 px-3 border-r border-slate-200 font-semibold">{v.vehicleName} ({v.plateNumber || '-'})</td>
                        <td className="py-1.5 px-3 border-r border-slate-200">{v.driverName || 'Tanpa Supir'}</td>
                        <td className="py-1.5 px-3 border-r border-slate-200">{v.date} ({v.startTime || '08:00'}-{v.endTime || '16:00'})</td>
                        <td className="py-1.5 px-3 border-r border-slate-200">{v.bookerName} - {v.destination}</td>
                        <td className="py-1.5 px-3 text-center font-semibold">{v.status}</td>
                      </tr>
                    ))}
                    {activeCategory === 'feedback' && filteredFeedbacks.map((f, i) => (
                      <tr key={f.id}>
                        <td className="py-1.5 px-3 border-r border-slate-200 text-center">{i + 1}</td>
                        <td className="py-1.5 px-3 border-r border-slate-200 font-semibold">{f.category}</td>
                        <td className="py-1.5 px-3 border-r border-slate-200">{f.date}</td>
                        <td className="py-1.5 px-3 border-r border-slate-200">{f.reporterName} ({f.reporterDivision})</td>
                        <td className="py-1.5 px-3 border-r border-slate-200">{f.description}</td>
                        <td className="py-1.5 px-3 text-center font-semibold">{f.status}</td>
                      </tr>
                    ))}
                    {activeCategory === 'persediaan' && filteredSpbp.map((s, i) => (
                      <tr key={s.id}>
                        <td className="py-1.5 px-3 border-r border-slate-200 text-center">{i + 1}</td>
                        <td className="py-1.5 px-3 border-r border-slate-200 font-semibold">{s.documentNo}</td>
                        <td className="py-1.5 px-3 border-r border-slate-200">{s.date}</td>
                        <td className="py-1.5 px-3 border-r border-slate-200">{s.division}</td>
                        <td className="py-1.5 px-3 border-r border-slate-200">{s.items.map(it => `${it.itemName} (${it.quantity})`).join(', ')}</td>
                        <td className="py-1.5 px-3 text-center font-semibold">{s.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bagian Kolom Tanda Tangan */}
              <div className="pt-6 grid grid-cols-2 text-xs">
                <div></div>
                <div className="text-center space-y-16">
                  <div>
                    <p>Pekanbaru, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="font-semibold">{signerTitle}</p>
                  </div>
                  <div>
                    <p className="font-bold underline uppercase">{signerName}</p>
                    <p className="text-[10px] font-mono text-slate-600">NIP {signerNip}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
