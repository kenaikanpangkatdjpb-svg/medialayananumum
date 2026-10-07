import React, { useState, useRef } from 'react';
import { 
  Plus, Shield, UserCheck, Calendar, Trash2, Edit3,
  Check, FileText, ShoppingCart, HelpCircle, X,
  FileSpreadsheet, Upload, Download, RotateCcw, AlertCircle, FileCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { VisitorLog, SecurityShift, SecurityRosterItem, CurrentUser, ProcurementPlan } from '../types';
import { formatIDR, INITIAL_SECURITY_SHIFTS, INITIAL_PROCUREMENTS } from '../mockData';
import SecurityGuardSection from './SecurityGuardSection';
import EmployeeAdvocacySection from './EmployeeAdvocacySection';
import { saveFirestoreDoc, deleteFirestoreDoc, saveFirestoreCollection, subscribeFirestoreCollection } from '../lib/firebase';
import { safeLocalStorageSet, safeLocalStorageGet } from '../lib/storage';

interface InformasiSectionProps {
  subTab: string;
  visitorLogs: VisitorLog[];
  setVisitorLogs: React.Dispatch<React.SetStateAction<VisitorLog[]>>;
  securityShifts: SecurityShift[];
  setSecurityShifts?: React.Dispatch<React.SetStateAction<SecurityShift[]>>;
  securityRoster?: SecurityRosterItem[];
  setSecurityRoster?: React.Dispatch<React.SetStateAction<SecurityRosterItem[]>>;
  isEditMode: boolean;
  currentUser?: CurrentUser | null;
}

export default function InformasiSection({
  subTab,
  visitorLogs,
  setVisitorLogs,
  securityShifts,
  setSecurityShifts,
  securityRoster = [],
  setSecurityRoster,
  isEditMode,
  currentUser
}: InformasiSectionProps) {
  // Check Admin Role
  const isAdmin = isEditMode || currentUser?.role === 'admin' || (currentUser?.role as string) === 'Administrator';

  // Visitor check-in states
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [visitorForm, setVisitorForm] = useState({
    name: '',
    institution: '',
    purpose: '',
    destinationDivision: 'Bidang PAPK',
    keyCardNumber: 'CARD-01'
  });

  // Long-term procurement plans state
  const [procurements, setProcurements] = useState<ProcurementPlan[]>(() => {
    return safeLocalStorageGet<ProcurementPlan[]>('melayu_procurements', INITIAL_PROCUREMENTS);
  });

  // Sync procurements with Firestore on mount
  React.useEffect(() => {
    const unsub = subscribeFirestoreCollection<ProcurementPlan>('procurements', INITIAL_PROCUREMENTS, setProcurements);
    return () => unsub();
  }, []);

  React.useEffect(() => {
    safeLocalStorageSet('melayu_procurements', JSON.stringify(procurements));
  }, [procurements]);

  const [showProcureModal, setShowProcureModal] = useState(false);
  const [procureForm, setProcureForm] = useState({
    item: '',
    qty: 1,
    estimatedBudget: 5000000,
    targetMonth: 'Agustus 2026'
  });

  // Security shift Excel & edit state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showExcelPreviewModal, setShowExcelPreviewModal] = useState(false);
  const [excelPreviewData, setExcelPreviewData] = useState<SecurityShift[]>([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [uploadSuccessNotice, setUploadSuccessNotice] = useState('');

  // Manual shift edit/add modal state
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShiftIndex, setEditingShiftIndex] = useState<number | null>(null);
  const [shiftForm, setShiftForm] = useState<SecurityShift>({
    day: 'Senin',
    shiftMorning: '',
    shiftEvening: '',
    shiftNight: ''
  });

  // Visitor check-in handle
  const handleVisitorCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorForm.name || !visitorForm.institution) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toISOString().split('T')[0];

    const newVisitor: VisitorLog = {
      id: `vis-${Date.now()}`,
      name: visitorForm.name,
      institution: visitorForm.institution,
      purpose: visitorForm.purpose,
      visitDate: dateStr,
      visitTime: timeStr,
      destinationDivision: visitorForm.destinationDivision,
      keyCardNumber: visitorForm.keyCardNumber
    };

    setVisitorLogs([newVisitor, ...visitorLogs]);
    saveFirestoreDoc('visitors', newVisitor);
    setShowVisitorModal(false);
    setVisitorForm({ name: '', institution: '', purpose: '', destinationDivision: 'Bidang PAPK', keyCardNumber: 'CARD-01' });
  };

  const handleDeleteVisitor = (id: string) => {
    setVisitorLogs(visitorLogs.filter(v => v.id !== id));
    deleteFirestoreDoc('visitors', id);
  };

  // Procurement handle
  const handleAddProcure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!procureForm.item) return;
    const newProc: ProcurementPlan = {
      id: Date.now(),
      item: procureForm.item,
      qty: procureForm.qty,
      estimatedBudget: procureForm.estimatedBudget,
      targetMonth: procureForm.targetMonth,
      progress: 0,
      status: 'Direncanakan'
    };
    setProcurements([...procurements, newProc]);
    saveFirestoreDoc('procurements', newProc);
    setShowProcureModal(false);
    setProcureForm({ item: '', qty: 1, estimatedBudget: 5000000, targetMonth: 'Agustus 2026' });
  };

  const handleUpdateProcProgress = (id: number | string, direction: 'up' | 'down') => {
    let updatedItem: ProcurementPlan | null = null;
    const updatedList = procurements.map(p => {
      if (p.id !== id) return p;
      let newProg = p.progress;
      if (direction === 'up') newProg = Math.min(100, p.progress + 20);
      else newProg = Math.max(0, p.progress - 20);

      let status = p.status;
      if (newProg === 100) status = 'Selesai';
      else if (newProg >= 80) status = 'Kontrak Kerja';
      else if (newProg >= 40) status = 'Proses Lelang';
      else if (newProg >= 10) status = 'Persiapan Dokumen';
      else status = 'Direncanakan';

      updatedItem = { ...p, progress: newProg, status };
      return updatedItem;
    });

    setProcurements(updatedList);
    if (updatedItem) {
      saveFirestoreDoc('procurements', updatedItem);
    }
  };

  const handleDeleteProc = (id: number | string) => {
    setProcurements(procurements.filter(p => p.id !== id));
    deleteFirestoreDoc('procurements', String(id));
  };

  // Handle Excel Upload for Security Guard Shifts
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        
        // Parse raw 2D array of rows
        const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
        
        if (!rawRows || rawRows.length < 2) {
          alert('File Excel kosong atau tidak berisi data jadwal.');
          return;
        }

        const parsedShifts: SecurityShift[] = [];

        // Parse starting from row 1 (row 0 is assumed header)
        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          const day = row[0] ? String(row[0]).trim() : '';
          const morning = row[1] ? String(row[1]).trim() : '-';
          const evening = row[2] ? String(row[2]).trim() : '-';
          const night = row[3] ? String(row[3]).trim() : '-';

          // Filter out header repetition or empty day
          if (day && day.toLowerCase() !== 'hari' && day.toLowerCase() !== 'day') {
            parsedShifts.push({
              day,
              shiftMorning: morning,
              shiftEvening: evening,
              shiftNight: night
            });
          }
        }

        if (parsedShifts.length === 0) {
          alert('Format kolom Excel tidak sesuai. Pastikan Kolom 1 = Hari, Kolom 2 = Shift Pagi, Kolom 3 = Shift Sore, Kolom 4 = Shift Malam.');
          return;
        }

        setExcelPreviewData(parsedShifts);
        setExcelFileName(file.name);
        setShowExcelPreviewModal(true);
      } catch (err) {
        console.error('Error reading Excel:', err);
        alert('Gagal membaca file Excel. Pastikan format file adalah .xlsx, .xls, atau .csv');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Confirm and Apply Excel Import
  const handleApplyExcelData = () => {
    if (excelPreviewData.length > 0 && setSecurityShifts) {
      setSecurityShifts(excelPreviewData);
      setShowExcelPreviewModal(false);
      setUploadSuccessNotice(`Berhasil mengimpor ${excelPreviewData.length} baris jadwal pengawasan penjagaan keamanan dari file ${excelFileName}`);
      setTimeout(() => setUploadSuccessNotice(''), 6000);
    }
  };

  // Download Excel Template
  const handleDownloadTemplate = () => {
    const templateRows = [
      { 'Hari': 'Senin', 'Shift Pagi (07:00 - 15:00)': 'Sertu Dani / Prasetyo', 'Shift Sore (15:00 - 23:00)': 'Agus / Jaka', 'Shift Malam (23:00 - 07:00)': 'Rudi / Slamet' },
      { 'Hari': 'Selasa', 'Shift Pagi (07:00 - 15:00)': 'Rudi / Slamet', 'Shift Sore (15:00 - 23:00)': 'Sertu Dani / Prasetyo', 'Shift Malam (23:00 - 07:00)': 'Agus / Jaka' },
      { 'Hari': 'Rabu', 'Shift Pagi (07:00 - 15:00)': 'Agus / Jaka', 'Shift Sore (15:00 - 23:00)': 'Rudi / Slamet', 'Shift Malam (23:00 - 07:00)': 'Sertu Dani / Prasetyo' },
      { 'Hari': 'Kamis', 'Shift Pagi (07:00 - 15:00)': 'Sertu Dani / Prasetyo', 'Shift Sore (15:00 - 23:00)': 'Agus / Jaka', 'Shift Malam (23:00 - 07:00)': 'Rudi / Slamet' },
      { 'Hari': 'Jumat', 'Shift Pagi (07:00 - 15:00)': 'Rudi / Slamet', 'Shift Sore (15:00 - 23:00)': 'Sertu Dani / Prasetyo', 'Shift Malam (23:00 - 07:00)': 'Agus / Jaka' },
      { 'Hari': 'Sabtu', 'Shift Pagi (07:00 - 15:00)': 'Agus / Jaka', 'Shift Sore (15:00 - 23:00)': 'Rudi / Slamet', 'Shift Malam (23:00 - 07:00)': 'Sertu Dani / Prasetyo' },
      { 'Hari': 'Minggu', 'Shift Pagi (07:00 - 15:00)': 'Sertu Dani / Prasetyo', 'Shift Sore (15:00 - 23:00)': 'Agus / Jaka', 'Shift Malam (23:00 - 07:00)': 'Rudi / Slamet' }
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Keamanan');
    XLSX.writeFile(wb, 'Template_Jadwal_Pengawasan_Keamanan.xlsx');
  };

  // Export current schedule to Excel
  const handleExportCurrent = () => {
    const exportRows = securityShifts.map(s => ({
      'Hari': s.day,
      'Shift Pagi (07:00 - 15:00)': s.shiftMorning,
      'Shift Sore (15:00 - 23:00)': s.shiftEvening,
      'Shift Malam (23:00 - 07:00)': s.shiftNight
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Keamanan');
    XLSX.writeFile(wb, 'Jadwal_Pengawasan_Penjagaan_Keamanan_Kanwil_DJPb_Riau.xlsx');
  };

  // Reset shifts to default
  const handleResetShifts = () => {
    if (confirm('Apakah Anda yakin ingin mengembalikan jadwal piket keamanan ke pengaturan default?')) {
      if (setSecurityShifts) {
        setSecurityShifts(INITIAL_SECURITY_SHIFTS);
        setUploadSuccessNotice('Jadwal pengawasan penjagaan keamanan berhasil dikembalikan ke pengaturan default.');
        setTimeout(() => setUploadSuccessNotice(''), 5000);
      }
    }
  };

  // Manual Add / Edit Shift
  const handleOpenAddShift = () => {
    setEditingShiftIndex(null);
    setShiftForm({ day: 'Senin', shiftMorning: '', shiftEvening: '', shiftNight: '' });
    setShowShiftModal(true);
  };

  const handleOpenEditShift = (index: number) => {
    const item = securityShifts[index];
    setEditingShiftIndex(index);
    setShiftForm({ ...item });
    setShowShiftModal(true);
  };

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setSecurityShifts) return;

    if (editingShiftIndex !== null) {
      const updated = [...securityShifts];
      updated[editingShiftIndex] = shiftForm;
      setSecurityShifts(updated);
    } else {
      setSecurityShifts([...securityShifts, shiftForm]);
    }
    setShowShiftModal(false);
  };

  const handleDeleteShift = (index: number) => {
    if (!setSecurityShifts) return;
    if (confirm('Apakah Anda yakin ingin menghapus baris jadwal ini?')) {
      const updated = securityShifts.filter((_, i) => i !== index);
      setSecurityShifts(updated);
    }
  };

  return (
    <div className="p-6 space-y-6" id="informasi-section-root">
      {/* ----------------- SUB-TAB: PENGAWASAN PENJAGAAN KEAMANAN (JADWAL PIKET SATPAM) ----------------- */}
      {subTab === 'pengawasan-penjagaan' && (
        <SecurityGuardSection
          securityShifts={securityShifts}
          setSecurityShifts={setSecurityShifts}
          securityRoster={securityRoster}
          setSecurityRoster={setSecurityRoster}
          isAdmin={isAdmin}
        />
      )}

      {/* ----------------- SUB-TAB: MONITORING PENGISIAN EMPLOYEE ADVOCACY (EA) ----------------- */}
      {(subTab === 'monitoring-ea' || subTab === 'employee-advocacy') && (
        <EmployeeAdvocacySection
          currentUser={currentUser}
          isEditMode={isEditMode}
        />
      )}

      {/* ----------------- SUB-TAB: RENCANA PENGADAAN BARANG (PROCUREMENT) ----------------- */}
      {subTab === 'rencana-pengadaan' && (
        <div className="space-y-4" id="procurement-subtab">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base md:text-lg font-display font-bold text-slate-800">Rencana Pengadaan Barang Jangka Panjang (DIPA)</h2>
              <p className="text-xs text-slate-500">Pipeline pengadaan sarpras skala besar, mebeler rapat, dan renovasi fisik gedung.</p>
            </div>
            {isAdmin && (
              <button
                id="btn-add-procure"
                onClick={() => setShowProcureModal(true)}
                className="flex items-center space-x-1 px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Rencana</span>
              </button>
            )}
          </div>

          {/* Procurements Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold font-display">
                    <th className="py-3.5 px-4">Nama Pengadaan</th>
                    <th className="py-3.5 px-4">Volume</th>
                    <th className="py-3.5 px-4">Estimasi Anggaran</th>
                    <th className="py-3.5 px-4">Target Pelaksanaan</th>
                    <th className="py-3.5 px-4">Status Progres</th>
                    {isAdmin && <th className="py-3.5 px-4 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {procurements.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">{p.item}</td>
                      <td className="py-3.5 px-4 font-mono font-bold">{p.qty} unit</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-djpb-blue">{formatIDR(p.estimatedBudget)}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600">{p.targetMonth}</td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-1">
                          <span>{p.status}</span>
                          <span className="font-mono">{p.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              p.progress === 100 ? 'bg-green-600' :
                              p.progress >= 40 ? 'bg-djpb-blue' : 'bg-amber-500'
                            }`}
                            style={{ width: `${p.progress}%` }}
                          ></div>
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              id={`btn-proc-down-${p.id}`}
                              onClick={() => handleUpdateProcProgress(p.id, 'down')}
                              className="px-1.5 py-0.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded cursor-pointer"
                              title="Kurangi Progres"
                            >
                              -20%
                            </button>
                            <button
                              id={`btn-proc-up-${p.id}`}
                              onClick={() => handleUpdateProcProgress(p.id, 'up')}
                              className="px-1.5 py-0.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded cursor-pointer"
                              title="Tambah Progres"
                            >
                              +20%
                            </button>
                            <button
                              id={`btn-delete-proc-${p.id}`}
                              onClick={() => handleDeleteProc(p.id)}
                              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL FORMS ----------------- */}

      {/* Procurement Plan Modal */}
      {showProcureModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="procure-modal">
          <form onSubmit={handleAddProcure} className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-display font-bold text-slate-800">Tambah Rencana Pengadaan Jangka Panjang</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Nama Barang / Pengadaan</label>
                <input 
                  type="text" required
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={procureForm.item}
                  onChange={(e) => setProcureForm({ ...procureForm, item: e.target.value })}
                  placeholder="Contoh: Renovasi Gedung Lobi Utama..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Volume (Kuantitas)</label>
                  <input 
                    type="number" min={1} required
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                    value={procureForm.qty}
                    onChange={(e) => setProcureForm({ ...procureForm, qty: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Target Waktu Mulai</label>
                  <select 
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={procureForm.targetMonth}
                    onChange={(e) => setProcureForm({ ...procureForm, targetMonth: e.target.value })}
                  >
                    <option>Agustus 2026</option>
                    <option>September 2026</option>
                    <option>Oktober 2026</option>
                    <option>November 2026</option>
                    <option>Desember 2026</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Estimasi Anggaran DIPA (Rp)</label>
                <input 
                  type="number" min={1000} required
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                  value={procureForm.estimatedBudget}
                  onChange={(e) => setProcureForm({ ...procureForm, estimatedBudget: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowProcureModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Simpan Rencana
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Excel Preview Modal */}
      {showExcelPreviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="excel-preview-modal">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 space-y-4 animate-in zoom-in-95 duration-150 relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-800 text-sm md:text-base">
                    Konfirmasi Import Excel Jadwal Keamanan
                  </h3>
                  <p className="text-xs text-slate-500">File: <span className="font-mono font-bold text-slate-700">{excelFileName}</span> ({excelPreviewData.length} baris terdeteksi)</p>
                </div>
              </div>

              <button 
                onClick={() => setShowExcelPreviewModal(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Berikut adalah pratinjau data dari file Excel yang Anda unggah. Klik tombol <strong>"Simpan & Terapkan Jadwal"</strong> untuk memperbarui jadwal piket satpam di sistem.
            </p>

            <div className="overflow-y-auto max-h-64 border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase font-display">
                  <tr>
                    <th className="py-2.5 px-3">Hari</th>
                    <th className="py-2.5 px-3">Shift Pagi</th>
                    <th className="py-2.5 px-3">Shift Sore</th>
                    <th className="py-2.5 px-3">Shift Malam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                  {excelPreviewData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-800">{row.day}</td>
                      <td className="py-2.5 px-3">{row.shiftMorning}</td>
                      <td className="py-2.5 px-3">{row.shiftEvening}</td>
                      <td className="py-2.5 px-3">{row.shiftNight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowExcelPreviewModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyExcelData}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Simpan & Terapkan Jadwal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift Add/Edit Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="shift-modal">
          <form onSubmit={handleSaveShift} className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-display font-bold text-slate-800">
                {editingShiftIndex !== null ? 'Edit Baris Shift Keamanan' : 'Tambah Baris Shift Keamanan'}
              </h3>
              <button
                type="button"
                onClick={() => setShowShiftModal(false)}
                className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Hari / Tanggal</label>
                <input 
                  type="text" required
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  value={shiftForm.day}
                  onChange={(e) => setShiftForm({ ...shiftForm, day: e.target.value })}
                  placeholder="Contoh: Senin atau Senin, 10 Agt 2026"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Shift Pagi (07:00 - 15:00)</label>
                <input 
                  type="text" required
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  value={shiftForm.shiftMorning}
                  onChange={(e) => setShiftForm({ ...shiftForm, shiftMorning: e.target.value })}
                  placeholder="Nama petugas shift pagi"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Shift Sore (15:00 - 23:00)</label>
                <input 
                  type="text" required
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  value={shiftForm.shiftEvening}
                  onChange={(e) => setShiftForm({ ...shiftForm, shiftEvening: e.target.value })}
                  placeholder="Nama petugas shift sore"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Shift Malam (23:00 - 07:00)</label>
                <input 
                  type="text" required
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  value={shiftForm.shiftNight}
                  onChange={(e) => setShiftForm({ ...shiftForm, shiftNight: e.target.value })}
                  placeholder="Nama petugas shift malam"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowShiftModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Simpan Baris
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
