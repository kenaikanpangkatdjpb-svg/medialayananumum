import React, { useState } from 'react';
import { 
  CalendarClock, TrendingUp, Download, Plus, Edit3, Check, X,
  FileSpreadsheet, ArrowUpRight, CheckCircle2, AlertCircle, 
  HelpCircle, Filter
} from 'lucide-react';
import { RencanaLemburRow, CurrentUser } from '../types';
import { formatIDR, formatNumberIDR } from '../mockData';
import { saveFirestoreDoc } from '../lib/firebase';

interface RencanaLemburViewProps {
  rencanaLembur: RencanaLemburRow[];
  setRencanaLembur: React.Dispatch<React.SetStateAction<RencanaLemburRow[]>>;
  isEditMode: boolean;
  currentUser?: CurrentUser | null;
}

export default function RencanaLemburView({
  rencanaLembur,
  setRencanaLembur,
  isEditMode,
  currentUser
}: RencanaLemburViewProps) {
  const isAdmin = currentUser?.role === 'admin' || isEditMode;

  const [editingRow, setEditingRow] = useState<RencanaLemburRow | null>(null);
  const [selectedBidang, setSelectedBidang] = useState<string>('Semua');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Calculations for totals
  const totalJan = rencanaLembur.reduce((acc, r) => acc + (r.jan || 0), 0);
  const totalFeb = rencanaLembur.reduce((acc, r) => acc + (r.feb || 0), 0);
  const totalMar = rencanaLembur.reduce((acc, r) => acc + (r.mar || 0), 0);
  const totalApr = rencanaLembur.reduce((acc, r) => acc + (r.apr || 0), 0);
  const totalMei = rencanaLembur.reduce((acc, r) => acc + (r.mei || 0), 0);
  const totalJun = rencanaLembur.reduce((acc, r) => acc + (r.jun || 0), 0);
  const totalJul = rencanaLembur.reduce((acc, r) => acc + (r.jul || 0), 0);
  const totalAgu = rencanaLembur.reduce((acc, r) => acc + (r.agu || 0), 0);
  const totalSep = rencanaLembur.reduce((acc, r) => acc + (r.sep || 0), 0);
  const totalOkt = rencanaLembur.reduce((acc, r) => acc + (r.okt || 0), 0);
  const totalNov = rencanaLembur.reduce((acc, r) => acc + (r.nov || 0), 0);
  const totalDes = rencanaLembur.reduce((acc, r) => acc + (r.des || 0), 0);

  const totalKeseluruhanRencana = rencanaLembur.reduce((acc, r) => acc + (r.total || 0), 0);
  const totalKeseluruhanAlokasi = rencanaLembur.reduce((acc, r) => acc + (r.alokasi2026 || 0), 0);
  const selisihAlokasi = totalKeseluruhanAlokasi - totalKeseluruhanRencana;

  // Save Edit Row
  const handleSaveEditRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;

    // Recalculate row total
    const computedTotal = 
      (editingRow.jan || 0) + 
      (editingRow.feb || 0) + 
      (editingRow.mar || 0) + 
      (editingRow.apr || 0) + 
      (editingRow.mei || 0) + 
      (editingRow.jun || 0) + 
      (editingRow.jul || 0) + 
      (editingRow.agu || 0) + 
      (editingRow.sep || 0) + 
      (editingRow.okt || 0) + 
      (editingRow.nov || 0) + 
      (editingRow.des || 0);

    const updatedRow: RencanaLemburRow = {
      ...editingRow,
      total: computedTotal
    };

    const updatedList = rencanaLembur.map(item => item.id === updatedRow.id ? updatedRow : item);
    setRencanaLembur(updatedList);
    setEditingRow(null);

    try {
      await saveFirestoreDoc('rencana_lembur_2026', updatedRow);
      showToast(`Data rencana lembur unit ${updatedRow.bidang} berhasil diperbarui!`);
    } catch (err) {
      console.error(err);
      showToast('Data diperbarui di penyimpanan lokal.');
    }
  };

  // Export Table as CSV
  const handleExportCSV = () => {
    const headers = ['Bidang/Bagian', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Total', 'ALOKASI 2026'];
    const rows = rencanaLembur.map(r => [
      r.bidang,
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
      r.nov !== null ? r.nov : '-',
      r.des !== null ? r.des : '-',
      r.total,
      r.alokasi2026
    ]);

    // Total row
    rows.push([
      'TOTAL',
      totalJan,
      totalFeb,
      totalMar,
      totalApr,
      totalMei,
      totalJun,
      totalJul,
      totalAgu,
      totalSep,
      totalOkt,
      totalNov,
      totalDes,
      totalKeseluruhanRencana,
      totalKeseluruhanAlokasi
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Rencana_Lembur_Kanwil_DJPb_Riau_2026.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Tabel Rencana Lembur 2026 berhasil diunduh sebagai file CSV.');
  };

  return (
    <div className="space-y-6" id="rencana-lembur-view-root">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl z-50 flex items-center space-x-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-[#0A2540] text-amber-300 rounded-xl">
              <CalendarClock className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base md:text-lg font-display font-bold text-slate-800">
                Rencana Lembur Kanwil DJPb Riau Tahun 2026
              </h2>
              <p className="text-xs text-slate-500">
                Matriks Alokasi & Proyeksi Kebutuhan Anggaran Uang Lembur Pegawai Seluruh Bidang/Bagian
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="rencana-lembur-kpi-row">
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL RENCANA LEMBUR 2026</span>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">6 Bidang/Bagian</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-2">
            {formatIDR(totalKeseluruhanRencana)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Total usulan lembur Januari - Desember 2026
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL ALOKASI PAGU 2026</span>
            <span className="px-2 py-0.5 bg-blue-100 text-djpb-blue text-[10px] font-bold rounded-md">DIPA 2026</span>
          </div>
          <div className="text-xl font-bold font-mono text-djpb-blue mt-2">
            {formatIDR(totalKeseluruhanAlokasi)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Pagu alokasi DIPA Bagian Anggaran Lembur
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">SISA CADANGAN ALOKASI</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">Optimal</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-2">
            {formatIDR(selisihAlokasi)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Alokasi terpenuhi aman ({((totalKeseluruhanRencana / totalKeseluruhanAlokasi) * 100).toFixed(1)}% teralokasi)
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MATRIKS TABEL RENCANA LEMBUR KANWIL DJPB RIAU TAHUN 2026 (SESUAI GAMBAR)   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-300 overflow-hidden" id="table-rencana-lembur-wrapper">
        
        {/* Table Title Bar */}
        <div className="bg-slate-100 border-b border-slate-300 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-djpb-blue" />
            <h3 className="text-xs sm:text-sm font-bold font-display uppercase tracking-wider text-slate-800">
              RENCANA LEMBUR KANWIL DJPB RIAU TAHUN 2026
            </h3>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 bg-[#ffff00] border border-slate-400 inline-block rounded-xs"></span>
              <span className="font-semibold text-slate-700">Fokus Serapan (Triwulan III)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 bg-black border border-slate-700 inline-block rounded-xs"></span>
              <span className="font-semibold text-slate-700">Tidak Dialokasikan</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto p-3">
          <table className="w-full text-[11px] sm:text-xs border-collapse border border-black font-sans">
            <thead>
              <tr className="text-black text-center font-bold">
                {/* Column 1: Bidang/Bagian with Light Green background as in original sheet */}
                <th className="bg-[#92d050] text-black py-2.5 px-3.5 text-left border border-black font-bold min-w-[110px]">
                  Bidang/Bagian
                </th>
                <th className="bg-[#fff2cc] text-black py-2.5 px-2 border border-black min-w-[80px]">Januari</th>
                <th className="bg-[#fff2cc] text-black py-2.5 px-2 border border-black min-w-[80px]">Februari</th>
                <th className="bg-[#fff2cc] text-black py-2.5 px-2 border border-black min-w-[80px]">Maret</th>
                <th className="bg-[#fff2cc] text-black py-2.5 px-2 border border-black min-w-[80px]">April</th>
                <th className="bg-[#fff2cc] text-black py-2.5 px-2 border border-black min-w-[80px]">Mei</th>
                <th className="bg-[#fff2cc] text-black py-2.5 px-2 border border-black min-w-[80px]">Juni</th>
                <th className="bg-[#fff2cc] text-black py-2.5 px-2 border border-black min-w-[80px]">Juli</th>
                <th className="bg-[#fff2cc] text-black py-2.5 px-2 border border-black min-w-[80px]">Agustus</th>
                <th className="bg-[#fff2cc] text-black py-2.5 px-2 border border-black min-w-[80px]">September</th>
                <th className="bg-[#fff2cc] text-black py-2.5 px-2 border border-black min-w-[80px]">Oktober</th>
                <th className="bg-[#fff2cc] text-black py-2.5 px-2 border border-black min-w-[80px]">November</th>
                <th className="bg-[#fff2cc] text-black py-2.5 px-2 border border-black min-w-[80px]">Desember</th>
                <th className="bg-[#fff2cc] text-black py-2.5 px-2.5 border border-black font-bold min-w-[90px]">Total</th>
                <th className="bg-[#deebf7] text-black py-2.5 px-2.5 font-bold min-w-[100px] border border-black">ALOKASI 2026</th>
                {isAdmin && <th className="bg-slate-200 text-black py-2.5 px-2 w-14 border border-black">Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {rencanaLembur.map((row, idx) => {
                // Determine highlight cells per row matching the provided image
                const isJulYellow = row.bidang === 'Kakanwil' || row.bidang === 'PA I';
                const isAguYellow = row.bidang === 'Kakanwil' || row.bidang === 'Umum' || row.bidang === 'PA I' || row.bidang === 'PPA II' || row.bidang === 'PAPK' || row.bidang === 'SKKI';
                const isSepYellow = row.bidang === 'Kakanwil' || row.bidang === 'Umum' || row.bidang === 'PA I' || row.bidang === 'PPA II' || row.bidang === 'PAPK' || row.bidang === 'SKKI';

                return (
                  <tr 
                    key={row.id || idx} 
                    className="hover:bg-slate-50/80 transition-colors font-medium text-slate-900 text-right"
                  >
                    {/* Bidang/Bagian Cell */}
                    <td className="bg-[#92d050]/30 font-bold text-left py-2.5 px-3 border border-black text-slate-950">
                      <div>{row.bidang}</div>
                      <div className="text-[9px] font-normal text-slate-600 truncate max-w-[130px]" title={row.namaLengkap}>
                        {row.namaLengkap}
                      </div>
                    </td>

                    {/* Jan */}
                    <td className="py-2.5 px-2 border border-black">
                      {row.jan ? formatNumberIDR(row.jan) : ''}
                    </td>

                    {/* Feb */}
                    <td className="py-2.5 px-2 border border-black">
                      {row.feb ? formatNumberIDR(row.feb) : ''}
                    </td>

                    {/* Mar */}
                    <td className="py-2.5 px-2 border border-black">
                      {row.mar ? formatNumberIDR(row.mar) : ''}
                    </td>

                    {/* Apr */}
                    <td className="py-2.5 px-2 border border-black">
                      {row.apr ? formatNumberIDR(row.apr) : ''}
                    </td>

                    {/* Mei */}
                    <td className="py-2.5 px-2 border border-black">
                      {row.mei ? formatNumberIDR(row.mei) : ''}
                    </td>

                    {/* Jun */}
                    <td className="py-2.5 px-2 border border-black">
                      {row.jun ? formatNumberIDR(row.jun) : ''}
                    </td>

                    {/* Jul (Highlighted yellow for Kakanwil, PA I) */}
                    <td className={`py-2.5 px-2 border border-black ${isJulYellow ? 'bg-[#ffff00] font-bold text-slate-950' : ''}`}>
                      {row.jul ? formatNumberIDR(row.jul) : ''}
                    </td>

                    {/* Agu (Highlighted yellow in image) */}
                    <td className={`py-2.5 px-2 border border-black ${isAguYellow ? 'bg-[#ffff00] font-bold text-slate-950' : ''}`}>
                      {row.agu ? formatNumberIDR(row.agu) : ''}
                    </td>

                    {/* Sep (Highlighted yellow in image) */}
                    <td className={`py-2.5 px-2 border border-black ${isSepYellow ? 'bg-[#ffff00] font-bold text-slate-950' : ''}`}>
                      {row.sep ? formatNumberIDR(row.sep) : ''}
                    </td>

                    {/* Okt */}
                    <td className="py-2.5 px-2 border border-black">
                      {row.okt ? formatNumberIDR(row.okt) : ''}
                    </td>

                    {/* Nov (Black cell for non-PAPK, value for PAPK) */}
                    <td className={`py-2.5 px-2 border border-black ${row.nov === null ? 'bg-black text-black select-none' : ''}`}>
                      {row.nov !== null ? formatNumberIDR(row.nov) : ''}
                    </td>

                    {/* Des (Black cell for non-PAPK, value for PAPK) */}
                    <td className={`py-2.5 px-2 border border-black ${row.des === null ? 'bg-black text-black select-none' : ''}`}>
                      {row.des !== null ? formatNumberIDR(row.des) : ''}
                    </td>

                    {/* Total (Pale yellow column as in image) */}
                    <td className="bg-[#fff2cc] py-2.5 px-2.5 border border-black font-bold text-slate-950 font-mono">
                      {formatNumberIDR(row.total)}
                    </td>

                    {/* Alokasi 2026 (Pale blue column as in image) */}
                    <td className="bg-[#deebf7] py-2.5 px-2.5 border border-black font-bold text-djpb-blue font-mono">
                      {formatNumberIDR(row.alokasi2026)}
                    </td>

                    {/* Admin Action */}
                    {isAdmin && (
                      <td className="py-2 px-1 text-center bg-slate-50 border border-black">
                        <button
                          type="button"
                          onClick={() => setEditingRow({ ...row })}
                          className="p-1.5 text-djpb-blue hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                          title={`Edit Anggaran ${row.bidang}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}

              {/* ========================================================= */}
              {/* TOTAL ROW (EXACT VALUES AS IN THE SPREADSHEET IMAGE)      */}
              {/* ========================================================= */}
              <tr className="bg-slate-100 font-bold text-slate-950 text-right">
                <td className="py-3 px-3 text-left font-black tracking-wide border border-black bg-slate-200">
                  TOTAL
                </td>
                <td className="py-3 px-2 border border-black font-mono">{formatNumberIDR(totalJan)}</td>
                <td className="py-3 px-2 border border-black font-mono">{formatNumberIDR(totalFeb)}</td>
                <td className="py-3 px-2 border border-black font-mono">{formatNumberIDR(totalMar)}</td>
                <td className="py-3 px-2 border border-black font-mono">{formatNumberIDR(totalApr)}</td>
                <td className="py-3 px-2 border border-black font-mono">{formatNumberIDR(totalMei)}</td>
                <td className="py-3 px-2 border border-black font-mono">{formatNumberIDR(totalJun)}</td>
                <td className="py-3 px-2 border border-black font-mono">{formatNumberIDR(totalJul)}</td>
                <td className="py-3 px-2 border border-black font-mono">{formatNumberIDR(totalAgu)}</td>
                <td className="py-3 px-2 border border-black font-mono">{formatNumberIDR(totalSep)}</td>
                <td className="py-3 px-2 border border-black font-mono">{formatNumberIDR(totalOkt)}</td>
                <td className="py-3 px-2 border border-black font-mono">{formatNumberIDR(totalNov)}</td>
                <td className="py-3 px-2 border border-black font-mono">{formatNumberIDR(totalDes)}</td>
                
                {/* Grand Total Rencana (Pale Yellow) */}
                <td className="bg-[#fff2cc] py-3 px-2.5 border border-black font-black font-mono text-slate-950">
                  {formatNumberIDR(totalKeseluruhanRencana)}
                </td>

                {/* Grand Total Alokasi 2026 (Pale Blue) */}
                <td className="bg-[#deebf7] py-3 px-2.5 border border-black font-black font-mono text-djpb-blue">
                  {formatNumberIDR(totalKeseluruhanAlokasi)}
                </td>

                {isAdmin && <td className="bg-slate-200 border border-black"></td>}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-slate-500 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            *Data matriks rencana lembur mengacu pada penetapan pagu alokasi anggaran lembur Kanwil DJPb Riau Tahun Anggaran 2026.
          </div>
          <div className="font-semibold text-slate-700">
            Sumber Data: Subbagian Keuangan Kanwil DJPb Riau
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: EDIT DATA RENCANA LEMBUR BIDANG (ADMIN / KEUANGAN)                  */}
      {/* ========================================================================= */}
      {editingRow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto" id="modal-edit-rencana-lembur">
          <form 
            onSubmit={handleSaveEditRow}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
          >
            <div className="bg-[#0A2540] text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm font-display leading-tight">Edit Rencana Lembur 2026</h3>
                  <p className="text-[11px] text-blue-200">Unit: {editingRow.bidang} • {editingRow.namaLengkap}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingRow(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                Masukkan nilai alokasi rencana bulanan (dalam Rupiah). Total rencana akan dihitung secara otomatis.
              </div>

              {/* Alokasi Pagu DIPA */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Pagu Alokasi 2026 (Rp) *
                </label>
                <input 
                  type="number"
                  required
                  value={editingRow.alokasi2026}
                  onChange={(e) => setEditingRow({ ...editingRow, alokasi2026: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-djpb-blue focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-djpb-blue"
                />
              </div>

              {/* Monthly Inputs Grid */}
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
                  { key: 'des', label: 'Desember' },
                ].map((m) => (
                  <div key={m.key}>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      {m.label} (Rp)
                    </label>
                    <input 
                      type="number"
                      value={(editingRow as any)[m.key] ?? ''}
                      placeholder="0"
                      onChange={(e) => {
                        const val = e.target.value === '' ? (m.key === 'nov' || m.key === 'des' ? null : 0) : parseInt(e.target.value) || 0;
                        setEditingRow({ ...editingRow, [m.key]: val });
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-djpb-blue"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
