import React, { useState, useMemo } from 'react';
import { 
  Calendar, Layers, Download, Edit3, Plus, Trash2, Check, X, 
  Search, Filter, FileSpreadsheet, RefreshCw, Calculator, 
  CheckCircle2, DollarSign, PieChart as PieIcon, ArrowRight
} from 'lucide-react';
import { RealisasiBidangRow, CurrentUser } from '../types';
import { formatIDR, formatNumberIDR, INITIAL_REALISASI_BIDANG_2026 } from '../mockData';
import { saveFirestoreDoc, deleteFirestoreDoc } from '../lib/firebase';

interface RealisasiLemburBidangViewProps {
  realisasiBidang?: RealisasiBidangRow[];
  setRealisasiBidang?: React.Dispatch<React.SetStateAction<RealisasiBidangRow[]>>;
  isEditMode: boolean;
  currentUser?: CurrentUser | null;
}

type PeriodViewMode = 'bulan' | 'triwulan' | 'semua';

export default function RealisasiLemburBidangView({
  realisasiBidang,
  setRealisasiBidang,
  isEditMode,
  currentUser
}: RealisasiLemburBidangViewProps) {
  const isAdmin = currentUser?.role === 'admin' || isEditMode;

  // Local state initialized with props or default data
  const [data, setData] = useState<RealisasiBidangRow[]>(() => {
    return (realisasiBidang && realisasiBidang.length > 0) ? realisasiBidang : INITIAL_REALISASI_BIDANG_2026;
  });

  // Period View Mode ('bulan' | 'triwulan' | 'semua')
  const [viewMode, setViewMode] = useState<PeriodViewMode>('bulan');

  // Search state
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Editing state
  const [editingRow, setEditingRow] = useState<RealisasiBidangRow | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Synchronize if parent state changes
  React.useEffect(() => {
    if (realisasiBidang && realisasiBidang.length > 0) {
      setData(realisasiBidang);
    }
  }, [realisasiBidang]);

  const updateAllData = (newData: RealisasiBidangRow[]) => {
    setData(newData);
    if (setRealisasiBidang) {
      setRealisasiBidang(newData);
    }
    try {
      localStorage.setItem('melayu_realisasi_bidang_2026', JSON.stringify(newData));
      // Sync each row to Firestore
      newData.forEach(row => {
        saveFirestoreDoc('realisasi_bidang_2026', row).catch(() => {});
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Helper format value: if 0 return '-'
  const formatCellValue = (val: number | null | undefined): string => {
    if (!val || val === 0) return '-';
    return formatNumberIDR(val);
  };

  // Helper compute totals per row
  const getRowTotal = (r: RealisasiBidangRow) => {
    return (r.jan || 0) + (r.feb || 0) + (r.mar || 0) + 
           (r.apr || 0) + (r.mei || 0) + (r.jun || 0) + 
           (r.jul || 0) + (r.agu || 0) + (r.sep || 0) + 
           (r.okt || 0) + (r.nov || 0) + (r.des || 0);
  };

  const getRowTW1 = (r: RealisasiBidangRow) => (r.jan || 0) + (r.feb || 0) + (r.mar || 0);
  const getRowTW2 = (r: RealisasiBidangRow) => (r.apr || 0) + (r.mei || 0) + (r.jun || 0);
  const getRowTW3 = (r: RealisasiBidangRow) => (r.jul || 0) + (r.agu || 0) + (r.sep || 0);
  const getRowTW4 = (r: RealisasiBidangRow) => (r.okt || 0) + (r.nov || 0) + (r.des || 0);

  // Column totals
  const colTotals = useMemo(() => {
    const res = {
      jan: 0, feb: 0, mar: 0,
      apr: 0, mei: 0, jun: 0,
      jul: 0, agu: 0, sep: 0,
      okt: 0, nov: 0, des: 0,
      tw1: 0, tw2: 0, tw3: 0, tw4: 0,
      grandTotal: 0
    };

    data.forEach(r => {
      res.jan += r.jan || 0;
      res.feb += r.feb || 0;
      res.mar += r.mar || 0;
      res.apr += r.apr || 0;
      res.mei += r.mei || 0;
      res.jun += r.jun || 0;
      res.jul += r.jul || 0;
      res.agu += r.agu || 0;
      res.sep += r.sep || 0;
      res.okt += r.okt || 0;
      res.nov += r.nov || 0;
      res.des += r.des || 0;
    });

    res.tw1 = res.jan + res.feb + res.mar;
    res.tw2 = res.apr + res.mei + res.jun;
    res.tw3 = res.jul + res.agu + res.sep;
    res.tw4 = res.okt + res.nov + res.des;
    res.grandTotal = res.tw1 + res.tw2 + res.tw3 + res.tw4;

    return res;
  }, [data]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(r => r.bidang.toLowerCase().includes(term));
  }, [data, searchTerm]);

  // Open Edit Modal
  const handleOpenEdit = (row: RealisasiBidangRow) => {
    setEditingRow({ ...row });
    setIsEditModalOpen(true);
  };

  // Save Modal
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;

    const updated = data.map(r => r.id === editingRow.id ? editingRow : r);
    updateAllData(updated);
    setIsEditModalOpen(false);
    setEditingRow(null);
  };

  // Reset to default
  const handleReset = () => {
    if (!window.confirm('Kembalikan data realisasi lembur per bidang ke nilai dokumen resmi?')) return;
    updateAllData(INITIAL_REALISASI_BIDANG_2026);
  };

  // Export CSV
  const handleExportCSV = () => {
    const rows: string[] = [];

    if (viewMode === 'bulan' || viewMode === 'semua') {
      rows.push(['REALISASI ANGGARAN LEMBUR PER BIDANG/BAGIAN (BULANAN) TA 2026'].join(','));
      rows.push(['Bidang/Bagian', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'TOTAL'].join(','));

      data.forEach(r => {
        rows.push([
          `"${r.bidang.replace(/"/g, '""')}"`,
          r.jan || 0,
          r.feb || 0,
          r.mar || 0,
          r.apr || 0,
          r.mei || 0,
          r.jun || 0,
          r.jul || 0,
          r.agu || 0,
          r.sep || 0,
          r.okt || 0,
          r.nov || 0,
          r.des || 0,
          getRowTotal(r)
        ].join(','));
      });

      rows.push([
        'Total',
        colTotals.jan,
        colTotals.feb,
        colTotals.mar,
        colTotals.apr,
        colTotals.mei,
        colTotals.jun,
        colTotals.jul,
        colTotals.agu,
        colTotals.sep,
        colTotals.okt,
        colTotals.nov,
        colTotals.des,
        colTotals.grandTotal
      ].join(','));

      rows.push('');
    }

    if (viewMode === 'triwulan' || viewMode === 'semua') {
      rows.push(['REALISASI ANGGARAN LEMBUR PER BIDANG/BAGIAN (TRIWULAN) TA 2026'].join(','));
      rows.push(['Bidang/Bagian', 'Triwulan I', 'Triwulan II', 'Triwulan III', 'Triwulan IV', 'TOTAL'].join(','));

      data.forEach(r => {
        rows.push([
          `"${r.bidang.replace(/"/g, '""')}"`,
          getRowTW1(r),
          getRowTW2(r),
          getRowTW3(r),
          getRowTW4(r),
          getRowTotal(r)
        ].join(','));
      });

      rows.push([
        'Total',
        colTotals.tw1,
        colTotals.tw2,
        colTotals.tw3,
        colTotals.tw4,
        colTotals.grandTotal
      ].join(','));
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Realisasi_Anggaran_Lembur_Per_Bidang_${viewMode}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="realisasi-lembur-bidang-root">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0A2540] via-[#103A60] to-[#0A2540] rounded-2xl p-6 text-white shadow-md border border-slate-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-bold mb-2 border border-emerald-400/30">
              <Calendar className="w-3.5 h-3.5" />
              <span>DIPA KANWIL DJPB PROVINSI RIAU TA 2026</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-white drop-shadow-xs">
              REALISASI ANGGARAN LEMBUR PER BIDANG/BAGIAN TA 2026
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Rekapitulasi realisasi penyerapan uang lembur dan uang makan lembur per unit kerja / bidang / bagian dengan pilihan periode <strong>Bulan</strong> dan <strong>Triwulan</strong>.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Excel / CSV</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center space-x-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
                title="Kembalikan data ke nilai default dokumen"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Data</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4" id="realisasi-bidang-kpi">
        
        {/* Total Realisasi */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Realisasi</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-2">
            {formatIDR(colTotals.grandTotal)}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            6 Bidang / Bagian
          </div>
        </div>

        {/* Triwulan I */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-blue-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Triwulan I</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">Jan - Mar</span>
          </div>
          <div className="text-lg sm:text-2xl font-black text-blue-800 mt-2">
            {formatIDR(colTotals.tw1)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {colTotals.grandTotal > 0 ? ((colTotals.tw1 / colTotals.grandTotal) * 100).toFixed(1) : 0}% dari Total
          </div>
        </div>

        {/* Triwulan II */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Triwulan II</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">Apr - Jun</span>
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-700 mt-2">
            {formatIDR(colTotals.tw2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {colTotals.grandTotal > 0 ? ((colTotals.tw2 / colTotals.grandTotal) * 100).toFixed(1) : 0}% dari Total
          </div>
        </div>

        {/* Triwulan III */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-purple-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Triwulan III</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700">Jul - Sep</span>
          </div>
          <div className="text-lg sm:text-2xl font-black text-purple-800 mt-2">
            {formatIDR(colTotals.tw3)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {colTotals.grandTotal > 0 ? ((colTotals.tw3 / colTotals.grandTotal) * 100).toFixed(1) : 0}% dari Total
          </div>
        </div>

      </div>

      {/* Mode Selector Pill Buttons & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3" id="realisasi-period-controls">
        
        {/* Toggle Pill Buttons: Bulan vs Triwulan vs Semua */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setViewMode('bulan')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              viewMode === 'bulan'
                ? 'bg-[#0A2540] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Pilihan Bulan (Jan - Des)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('triwulan')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              viewMode === 'triwulan'
                ? 'bg-[#0A2540] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Pilihan Triwulan (I - IV)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('semua')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
              viewMode === 'semua'
                ? 'bg-[#0A2540] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>Semua</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari bidang..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A2540] bg-slate-50"
          />
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 1. TABEL PILIHAN BULAN (JANUARI - DESEMBER) - SESUAI GAMBAR 1             */}
      {/* ========================================================================= */}
      {(viewMode === 'bulan' || viewMode === 'semua') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-400 overflow-hidden" id="table-realisasi-bulanan-wrapper">
          
          <div className="bg-slate-50 border-b border-slate-300 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <h2 className="text-xs sm:text-sm font-black tracking-wide uppercase text-slate-900">
                Tabel Realisasi Lembur Per Bidang/Bagian (Bulanan TA 2026)
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              Format Rekapitulasi 12 Bulan (Januari s.d. Desember)
            </span>
          </div>

          <div className="overflow-x-auto p-4">
            <table className="w-full text-left border-collapse border border-black min-w-[1000px] text-xs">
              
              {/* Header: Light Green #d9ead3 / #e2efda with distinct black borders */}
              <thead>
                <tr className="bg-[#d9ead3] text-black font-bold">
                  <th className="py-2 px-3 border border-black font-bold text-center min-w-[140px]">
                    Bidang/Bagian
                  </th>
                  <th className="py-2 px-2 text-center border border-black min-w-[80px]">Januari</th>
                  <th className="py-2 px-2 text-center border border-black min-w-[80px]">Februari</th>
                  <th className="py-2 px-2 text-center border border-black min-w-[80px]">Maret</th>
                  <th className="py-2 px-2 text-center border border-black min-w-[80px]">April</th>
                  <th className="py-2 px-2 text-center border border-black min-w-[80px]">Mei</th>
                  <th className="py-2 px-2 text-center border border-black min-w-[80px]">Juni</th>
                  <th className="py-2 px-2 text-center border border-black min-w-[80px]">Juli</th>
                  <th className="py-2 px-2 text-center border border-black min-w-[80px]">Agustus</th>
                  <th className="py-2 px-2 text-center border border-black min-w-[80px]">September</th>
                  <th className="py-2 px-2 text-center border border-black min-w-[80px]">Oktober</th>
                  <th className="py-2 px-2 text-center border border-black min-w-[80px]">November</th>
                  <th className="py-2 px-2 text-center border border-black min-w-[80px]">Desember</th>
                  <th className="py-2 px-3 text-center border border-black font-black min-w-[100px]">TOTAL</th>
                  {isAdmin && <th className="py-2 px-2 text-center border border-black w-12">Aksi</th>}
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {filteredRows.map((r) => {
                  const rowTotal = getRowTotal(r);
                  return (
                    <tr key={r.id} className="hover:bg-amber-50/60 bg-white transition-colors">
                      <td className="py-2 px-3 border border-black font-semibold text-black">
                        {r.bidang}
                      </td>
                      <td className="py-2 px-2 text-right border border-black text-black">
                        {formatCellValue(r.jan)}
                      </td>
                      <td className="py-2 px-2 text-right border border-black text-black">
                        {formatCellValue(r.feb)}
                      </td>
                      <td className="py-2 px-2 text-right border border-black text-black">
                        {formatCellValue(r.mar)}
                      </td>
                      <td className="py-2 px-2 text-right border border-black text-black">
                        {formatCellValue(r.apr)}
                      </td>
                      <td className="py-2 px-2 text-right border border-black text-black">
                        {formatCellValue(r.mei)}
                      </td>
                      <td className="py-2 px-2 text-right border border-black text-black">
                        {formatCellValue(r.jun)}
                      </td>
                      <td className="py-2 px-2 text-right border border-black text-black">
                        {formatCellValue(r.jul)}
                      </td>
                      <td className="py-2 px-2 text-right border border-black text-black">
                        {formatCellValue(r.agu)}
                      </td>
                      <td className="py-2 px-2 text-right border border-black text-black">
                        {formatCellValue(r.sep)}
                      </td>
                      <td className="py-2 px-2 text-right border border-black text-black">
                        {formatCellValue(r.okt)}
                      </td>
                      <td className="py-2 px-2 text-right border border-black text-black">
                        {formatCellValue(r.nov)}
                      </td>
                      <td className="py-2 px-2 text-right border border-black text-black">
                        {formatCellValue(r.des)}
                      </td>
                      <td className="py-2 px-3 text-right border border-black font-semibold text-black">
                        {formatCellValue(rowTotal)}
                      </td>
                      {isAdmin && (
                        <td className="py-2 px-1 text-center border border-black">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(r)}
                            className="p-1 hover:bg-slate-200 text-blue-600 rounded cursor-pointer transition-colors"
                            title="Edit nilai bidang ini"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {/* Footer Total Row: Soft Peach #fce5cd with black borders */}
                <tr className="bg-[#fce5cd] font-bold text-black">
                  <td className="py-2 px-3 border border-black font-bold text-left">
                    Total
                  </td>
                  <td className="py-2 px-2 text-right border border-black font-bold">{formatCellValue(colTotals.jan)}</td>
                  <td className="py-2 px-2 text-right border border-black font-bold">{formatCellValue(colTotals.feb)}</td>
                  <td className="py-2 px-2 text-right border border-black font-bold">{formatCellValue(colTotals.mar)}</td>
                  <td className="py-2 px-2 text-right border border-black font-bold">{formatCellValue(colTotals.apr)}</td>
                  <td className="py-2 px-2 text-right border border-black font-bold">{formatCellValue(colTotals.mei)}</td>
                  <td className="py-2 px-2 text-right border border-black font-bold">{formatCellValue(colTotals.jun)}</td>
                  <td className="py-2 px-2 text-right border border-black font-bold">{formatCellValue(colTotals.jul)}</td>
                  <td className="py-2 px-2 text-right border border-black font-bold">{formatCellValue(colTotals.agu)}</td>
                  <td className="py-2 px-2 text-right border border-black font-bold">{formatCellValue(colTotals.sep)}</td>
                  <td className="py-2 px-2 text-right border border-black font-bold">{formatCellValue(colTotals.okt)}</td>
                  <td className="py-2 px-2 text-right border border-black font-bold">{formatCellValue(colTotals.nov)}</td>
                  <td className="py-2 px-2 text-right border border-black font-bold">{formatCellValue(colTotals.des)}</td>
                  <td className="py-2 px-3 text-right border border-black font-bold text-black">{formatCellValue(colTotals.grandTotal)}</td>
                  {isAdmin && <td className="py-2 px-1 border border-black"></td>}
                </tr>

              </tbody>

            </table>
          </div>

          <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Rekapitulasi bulanan mencerminkan seluruh SP2D lembur yang telah terealisasi.</span>
            </div>
            <div className="font-semibold text-slate-700">
              Total Realisasi Bulanan: <span className="text-slate-900 font-black">{formatIDR(colTotals.grandTotal)}</span>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TABEL PILIHAN TRIWULAN (TRIWULAN I - IV) - SESUAI GAMBAR 2             */}
      {/* ========================================================================= */}
      {(viewMode === 'triwulan' || viewMode === 'semua') && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-400 overflow-hidden" id="table-realisasi-triwulan-wrapper">
          
          <div className="bg-slate-50 border-b border-slate-300 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <h2 className="text-xs sm:text-sm font-black tracking-wide uppercase text-slate-900">
                Tabel Realisasi Lembur Per Bidang/Bagian (Triwulan TA 2026)
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              Format Rekapitulasi Triwulan I s.d. Triwulan IV
            </span>
          </div>

          <div className="overflow-x-auto p-4">
            <table className="w-full text-left border-collapse border border-black min-w-[700px] text-xs">
              
              {/* Header: Light Green #d9ead3 / #e2efda with black borders */}
              <thead>
                <tr className="bg-[#d9ead3] text-black font-bold">
                  <th className="py-2.5 px-4 border border-black font-bold text-center min-w-[160px]">
                    Bidang/Bagian
                  </th>
                  <th className="py-2.5 px-4 text-center border border-black min-w-[120px]">
                    Triwulan I
                  </th>
                  <th className="py-2.5 px-4 text-center border border-black min-w-[120px]">
                    Triwulan II
                  </th>
                  <th className="py-2.5 px-4 text-center border border-black min-w-[120px]">
                    Triwulan III
                  </th>
                  <th className="py-2.5 px-4 text-center border border-black min-w-[120px]">
                    Triwulan IV
                  </th>
                  <th className="py-2.5 px-5 text-center border border-black font-bold min-w-[140px]">
                    TOTAL
                  </th>
                  {isAdmin && <th className="py-2.5 px-2 text-center border border-black w-12">Aksi</th>}
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {filteredRows.map((r) => {
                  const tw1 = getRowTW1(r);
                  const tw2 = getRowTW2(r);
                  const tw3 = getRowTW3(r);
                  const tw4 = getRowTW4(r);
                  const rowTotal = tw1 + tw2 + tw3 + tw4;

                  return (
                    <tr key={`tw-${r.id}`} className="hover:bg-blue-50/40 bg-white transition-colors">
                      <td className="py-2.5 px-4 border border-black font-semibold text-black">
                        {r.bidang}
                      </td>
                      <td className="py-2.5 px-4 text-right border border-black text-black">
                        {formatCellValue(tw1)}
                      </td>
                      <td className="py-2.5 px-4 text-right border border-black text-black">
                        {formatCellValue(tw2)}
                      </td>
                      <td className="py-2.5 px-4 text-right border border-black text-black">
                        {formatCellValue(tw3)}
                      </td>
                      <td className="py-2.5 px-4 text-right border border-black text-black">
                        {formatCellValue(tw4)}
                      </td>
                      <td className="py-2.5 px-5 text-right border border-black font-semibold text-black">
                        {formatCellValue(rowTotal)}
                      </td>
                      {isAdmin && (
                        <td className="py-2.5 px-2 text-center border border-black">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(r)}
                            className="p-1 hover:bg-slate-200 text-blue-600 rounded cursor-pointer transition-colors"
                            title="Edit nilai bidang ini"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {/* Footer Total Row: Soft Peach #fce5cd with black borders */}
                <tr className="bg-[#fce5cd] font-bold text-black">
                  <td className="py-2.5 px-4 border border-black font-bold text-left">
                    Total
                  </td>
                  <td className="py-2.5 px-4 text-right border border-black font-bold">{formatCellValue(colTotals.tw1)}</td>
                  <td className="py-2.5 px-4 text-right border border-black font-bold">{formatCellValue(colTotals.tw2)}</td>
                  <td className="py-2.5 px-4 text-right border border-black font-bold">{formatCellValue(colTotals.tw3)}</td>
                  <td className="py-2.5 px-4 text-right border border-black font-bold">{formatCellValue(colTotals.tw4)}</td>
                  <td className="py-2.5 px-5 text-right border border-black font-bold text-black">{formatCellValue(colTotals.grandTotal)}</td>
                  {isAdmin && <td className="py-2.5 px-2 border border-black"></td>}
                </tr>

              </tbody>

            </table>
          </div>

          <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Nilai per triwulan merupakan akumulasi otomatis dari realisasi bulanan terkait.</span>
            </div>
            <div className="font-semibold text-slate-700">
              Total Realisasi Triwulan: <span className="text-slate-900 font-black">{formatIDR(colTotals.grandTotal)}</span>
            </div>
          </div>

        </div>
      )}

      {/* Modal Edit Nilai Realisasi Bulanan Bidang */}
      {isEditModalOpen && editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="bg-[#0A2540] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm">
                  Edit Realisasi Bulanan - Bidang {editingRow.bidang}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-300" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 overflow-y-auto space-y-4 text-xs">
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: 'jan', label: 'Januari' },
                  { key: 'feb', label: 'Februari' },
                  { key: 'mar', label: 'Maret' },
                  { key: 'apr', label: 'April' },
                  { key: 'mei', label: 'Mei' },
                  { key: 'jun', label: 'Juni' },
                  { key: 'jul', label: 'Juli' },
                  { key: 'agu', label: 'Agustus' },
                  { key: 'sep', label: 'September' },
                  { key: 'okt', label: 'Oktober' },
                  { key: 'nov', label: 'November' },
                  { key: 'des', label: 'Desember' }
                ].map((m) => {
                  const val = (editingRow as any)[m.key] || 0;
                  return (
                    <div key={m.key} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <label className="block font-bold text-slate-700 mb-1">{m.label} (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={val}
                        onChange={(e) => {
                          const num = parseInt(e.target.value) || 0;
                          setEditingRow({
                            ...editingRow,
                            [m.key]: num
                          });
                        }}
                        className="w-full p-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0A2540]"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Total Calculation Preview */}
              <div className="bg-amber-50 p-3 rounded-xl flex items-center justify-between border border-amber-200">
                <span className="font-bold text-amber-900">Total Realisasi Bidang Ini:</span>
                <span className="text-sm font-black text-amber-950">
                  {formatIDR(getRowTotal(editingRow))}
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0A2540] hover:bg-[#103A60] text-amber-300 font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Simpan Perubahan
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
