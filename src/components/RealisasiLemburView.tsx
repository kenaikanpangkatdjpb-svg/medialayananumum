import React, { useState } from 'react';
import { 
  DollarSign, TrendingUp, Search, Plus, Download, 
  FileText, CheckCircle2, Clock, AlertCircle, Edit3, Trash2, 
  Eye, Calendar, Check, X, Building, Paperclip, 
  Table, RefreshCw, Save
} from 'lucide-react';
import { RealisasiLemburItem, RealisasiGolonganItem, RealisasiGolonganMonthData, CurrentUser, RencanaLemburRow } from '../types';
import { formatIDR, formatNumberIDR, INITIAL_REALISASI_GOLONGAN_2026 } from '../mockData';
import { saveFirestoreDoc, deleteFirestoreDoc } from '../lib/firebase';

interface RealisasiLemburViewProps {
  realisasiLembur: RealisasiLemburItem[];
  setRealisasiLembur: React.Dispatch<React.SetStateAction<RealisasiLemburItem[]>>;
  realisasiGolongan?: RealisasiGolonganItem[];
  setRealisasiGolongan?: React.Dispatch<React.SetStateAction<RealisasiGolonganItem[]>>;
  rencanaLembur: RencanaLemburRow[];
  isEditMode: boolean;
  currentUser?: CurrentUser | null;
}

type MonthKey = 'jan' | 'feb' | 'mar' | 'apr' | 'mei' | 'jun' | 'jul' | 'agu' | 'sep' | 'okt' | 'nov' | 'des';

const MONTH_KEYS: { key: MonthKey; label: string }[] = [
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
];

export default function RealisasiLemburView({
  realisasiLembur,
  setRealisasiLembur,
  realisasiGolongan = INITIAL_REALISASI_GOLONGAN_2026,
  setRealisasiGolongan,
  isEditMode,
  currentUser
}: RealisasiLemburViewProps) {
  const isAdmin = currentUser?.role === 'admin' || isEditMode;

  // View mode: 'matrix' (sesuai format gambar) or 'sp2d-list' (detail transaksi SP2D)
  const [activeViewMode, setActiveViewMode] = useState<'matrix' | 'sp2d-list'>('matrix');

  // Pagu total default: Rp 111.876.000 (sesuai perhitungan dokumen)
  const [paguTotal, setPaguTotal] = useState<number>(111876000);
  const [isEditingPagu, setIsEditingPagu] = useState(false);
  const [tempPagu, setTempPagu] = useState<number>(111876000);

  // Local state fallback if setRealisasiGolongan is not provided
  const [matrixData, setMatrixData] = useState<RealisasiGolonganItem[]>(() => {
    return (realisasiGolongan && realisasiGolongan.length > 0) ? realisasiGolongan : INITIAL_REALISASI_GOLONGAN_2026;
  });

  // Editing matrix cell modal state
  const [editingMatrixMonth, setEditingMatrixMonth] = useState<MonthKey | null>(null);
  const [editGol2Lembur, setEditGol2Lembur] = useState<string>('');
  const [editGol2Makan, setEditGol2Makan] = useState<string>('');
  const [editGol3Lembur, setEditGol3Lembur] = useState<string>('');
  const [editGol3Makan, setEditGol3Makan] = useState<string>('');
  const [editGol4Lembur, setEditGol4Lembur] = useState<string>('');
  const [editGol4Makan, setEditGol4Makan] = useState<string>('');

  // SP2D List state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBidang, setSelectedBidang] = useState('Semua');
  const [selectedBulan, setSelectedBulan] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RealisasiLemburItem | null>(null);
  const [viewingItem, setViewingItem] = useState<RealisasiLemburItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // SP2D Form State
  const [formBidang, setFormBidang] = useState('Bagian Umum');
  const [formBulan, setFormBulan] = useState('Agustus 2026');
  const [formNomorSP2D, setFormNomorSP2D] = useState('');
  const [formTanggalSP2D, setFormTanggalSP2D] = useState('');
  const [formUraian, setFormUraian] = useState('');
  const [formPenerima, setFormPenerima] = useState<number>(5);
  const [formJam, setFormJam] = useState<number>(40);
  const [formUangLembur, setFormUangLembur] = useState<number>(1500000);
  const [formUangMakan, setFormUangMakan] = useState<number>(600000);
  const [formStatus, setFormStatus] = useState<'Selesai Dibayar' | 'Proses SP2D' | 'Pengajuan SPM'>('Selesai Dibayar');
  const [formLampiranName, setFormLampiranName] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync matrix data from props if changed
  React.useEffect(() => {
    if (realisasiGolongan && realisasiGolongan.length > 0) {
      setMatrixData(realisasiGolongan);
    }
  }, [realisasiGolongan]);

  // =========================================================================
  // MATRIX CALCULATIONS (Dynamic based on matrixData & paguTotal)
  // =========================================================================
  const getGolonganRow = (golId: string) => {
    return matrixData.find(g => g.id === golId) || matrixData[0];
  };

  const gol2 = getGolonganRow('gol-2');
  const gol3 = getGolonganRow('gol-3');
  const gol4 = getGolonganRow('gol-4');

  // Compute monthly calculations for all 12 months
  const monthlyCalculations = MONTH_KEYS.map((m) => {
    const key = m.key;
    const g2Data = gol2[key] as RealisasiGolonganMonthData | undefined;
    const g3Data = gol3[key] as RealisasiGolonganMonthData | undefined;
    const g4Data = gol4[key] as RealisasiGolonganMonthData | undefined;

    const g2Lembur = g2Data?.lembur ?? null;
    const g2Makan = g2Data?.makanLembur ?? null;
    const g3Lembur = g3Data?.lembur ?? null;
    const g3Makan = g3Data?.makanLembur ?? null;
    const g4Lembur = g4Data?.lembur ?? null;
    const g4Makan = g4Data?.makanLembur ?? null;

    const hasData = [g2Lembur, g2Makan, g3Lembur, g3Makan, g4Lembur, g4Makan].some(v => v !== null && v !== undefined);

    const totalLemburDetail = (g2Lembur || 0) + (g3Lembur || 0) + (g4Lembur || 0);
    const totalMakanDetail = (g2Makan || 0) + (g3Makan || 0) + (g4Makan || 0);
    const totalBulanIni = totalLemburDetail + totalMakanDetail;

    return {
      key: m.key,
      label: m.label,
      hasData,
      g2Lembur,
      g2Makan,
      g3Lembur,
      g3Makan,
      g4Lembur,
      g4Makan,
      totalLemburDetail: hasData ? totalLemburDetail : null,
      totalMakanDetail: hasData ? totalMakanDetail : null,
      totalBulanIni: hasData ? totalBulanIni : 0,
      totalBulanIniDisplay: hasData ? totalBulanIni : null
    };
  });

  // Calculate cumulative realisasi, percentage, and sisa anggaran for each month
  let runningCumulative = 0;
  const computedMonthData = monthlyCalculations.map((m) => {
    if (m.hasData) {
      runningCumulative += m.totalBulanIni;
    }
    const totalRealisasiSd = runningCumulative;
    const percentAkumulatif = paguTotal > 0 ? (totalRealisasiSd / paguTotal) * 100 : 0;
    const sisaAnggaran = paguTotal - totalRealisasiSd;

    return {
      ...m,
      totalRealisasiSd,
      percentAkumulatif,
      sisaAnggaran
    };
  });

  // Overall summary metrics
  const latestMonthWithData = [...computedMonthData].reverse().find(m => m.hasData) || computedMonthData[0];
  const grandTotalRealisasi = latestMonthWithData.totalRealisasiSd;
  const grandPersentase = paguTotal > 0 ? (grandTotalRealisasi / paguTotal) * 100 : 0;
  const grandSisa = paguTotal - grandTotalRealisasi;

  // =========================================================================
  // MATRIX EDIT HANDLERS
  // =========================================================================
  const handleOpenEditMonth = (monthKey: MonthKey) => {
    setEditingMatrixMonth(monthKey);
    const g2Data = gol2[monthKey] as RealisasiGolonganMonthData | undefined;
    const g3Data = gol3[monthKey] as RealisasiGolonganMonthData | undefined;
    const g4Data = gol4[monthKey] as RealisasiGolonganMonthData | undefined;

    setEditGol2Lembur(g2Data?.lembur !== null && g2Data?.lembur !== undefined ? String(g2Data.lembur) : '');
    setEditGol2Makan(g2Data?.makanLembur !== null && g2Data?.makanLembur !== undefined ? String(g2Data.makanLembur) : '');
    setEditGol3Lembur(g3Data?.lembur !== null && g3Data?.lembur !== undefined ? String(g3Data.lembur) : '');
    setEditGol3Makan(g3Data?.makanLembur !== null && g3Data?.makanLembur !== undefined ? String(g3Data.makanLembur) : '');
    setEditGol4Lembur(g4Data?.lembur !== null && g4Data?.lembur !== undefined ? String(g4Data.lembur) : '');
    setEditGol4Makan(g4Data?.makanLembur !== null && g4Data?.makanLembur !== undefined ? String(g4Data.makanLembur) : '');
  };

  const handleSaveMatrixMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatrixMonth) return;

    const key = editingMatrixMonth;

    const parseVal = (str: string) => {
      const trimmed = str.trim();
      if (!trimmed || trimmed === '-') return null;
      const num = parseInt(trimmed.replace(/\D/g, ''), 10);
      return isNaN(num) ? null : num;
    };

    const newMatrix = matrixData.map(row => {
      if (row.id === 'gol-2') {
        return {
          ...row,
          [key]: {
            lembur: parseVal(editGol2Lembur),
            makanLembur: parseVal(editGol2Makan)
          }
        };
      }
      if (row.id === 'gol-3') {
        return {
          ...row,
          [key]: {
            lembur: parseVal(editGol3Lembur),
            makanLembur: parseVal(editGol3Makan)
          }
        };
      }
      if (row.id === 'gol-4') {
        return {
          ...row,
          [key]: {
            lembur: parseVal(editGol4Lembur),
            makanLembur: parseVal(editGol4Makan)
          }
        };
      }
      return row;
    });

    setMatrixData(newMatrix);
    if (setRealisasiGolongan) {
      setRealisasiGolongan(newMatrix);
    }

    try {
      for (const row of newMatrix) {
        await saveFirestoreDoc('realisasi_golongan_2026', row);
      }
      showToast(`Data realisasi lembur bulan ${editingMatrixMonth.toUpperCase()} berhasil disimpan ke cloud!`);
    } catch (err) {
      showToast(`Tersimpan di memori lokal.`);
    }

    setEditingMatrixMonth(null);
  };

  // Reset to default document data
  const handleResetToDefault = () => {
    if (confirm('Kembalikan data tabel realisasi sesuai data resmi dokumen Kanwil DJPb Riau TA 2026?')) {
      setMatrixData(INITIAL_REALISASI_GOLONGAN_2026);
      if (setRealisasiGolongan) {
        setRealisasiGolongan(INITIAL_REALISASI_GOLONGAN_2026);
      }
      setPaguTotal(111876000);
      showToast('Data berhasil di-reset sesuai dokumen resmi TA 2026.');
    }
  };

  // =========================================================================
  // SP2D LIST FILTERING & LOGIC
  // =========================================================================
  const filteredList = realisasiLembur.filter((item) => {
    const matchSearch = 
      item.nomorSP2D.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.uraian.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bidang.toLowerCase().includes(searchTerm.toLowerCase());
    const matchBidang = selectedBidang === 'Semua' || item.bidang === selectedBidang;
    const matchBulan = selectedBulan === 'Semua' || item.bulan.toLowerCase().includes(selectedBulan.toLowerCase());
    const matchStatus = selectedStatus === 'Semua' || item.status === selectedStatus;
    return matchSearch && matchBidang && matchBulan && matchStatus;
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormBidang('Bagian Umum');
    setFormBulan('Agustus 2026');
    setFormNomorSP2D(`2601901000${Math.floor(1000 + Math.random() * 9000)}`);
    setFormTanggalSP2D(new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }));
    setFormUraian('');
    setFormPenerima(5);
    setFormJam(35);
    setFormUangLembur(1200000);
    setFormUangMakan(450000);
    setFormStatus('Selesai Dibayar');
    setFormLampiranName('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: RealisasiLemburItem) => {
    setEditingItem(item);
    setFormBidang(item.bidang);
    setFormBulan(item.bulan);
    setFormNomorSP2D(item.nomorSP2D);
    setFormTanggalSP2D(item.tanggalSP2D);
    setFormUraian(item.uraian);
    setFormPenerima(item.jumlahPenerima);
    setFormJam(item.jumlahJam);
    setFormUangLembur(item.uangLembur);
    setFormUangMakan(item.uangMakanLembur);
    setFormStatus(item.status as any);
    setFormLampiranName(item.lampiranName || '');
    setIsModalOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const calculatedTotal = (Number(formUangLembur) || 0) + (Number(formUangMakan) || 0);

    if (editingItem) {
      const updated: RealisasiLemburItem = {
        ...editingItem,
        bidang: formBidang,
        bulan: formBulan,
        nomorSP2D: formNomorSP2D,
        tanggalSP2D: formTanggalSP2D,
        uraian: formUraian,
        jumlahPenerima: Number(formPenerima) || 1,
        jumlahJam: Number(formJam) || 1,
        uangLembur: Number(formUangLembur) || 0,
        uangMakanLembur: Number(formUangMakan) || 0,
        totalRealisasi: calculatedTotal,
        status: formStatus,
        lampiranName: formLampiranName || editingItem.lampiranName || 'Dokumen_SP2D_Lembur.pdf'
      };

      const newList = realisasiLembur.map(i => i.id === updated.id ? updated : i);
      setRealisasiLembur(newList);
      try {
        await saveFirestoreDoc('realisasi_lembur_2026', updated);
        showToast('Data transaksi SP2D lembur berhasil diperbarui!');
      } catch (err) {
        showToast('Tersimpan di data lokal.');
      }
    } else {
      const newItem: RealisasiLemburItem = {
        id: `real-lbr-${Date.now()}`,
        bidang: formBidang,
        bulan: formBulan,
        nomorSP2D: formNomorSP2D,
        tanggalSP2D: formTanggalSP2D,
        uraian: formUraian,
        jumlahPenerima: Number(formPenerima) || 1,
        jumlahJam: Number(formJam) || 1,
        uangLembur: Number(formUangLembur) || 0,
        uangMakanLembur: Number(formUangMakan) || 0,
        totalRealisasi: calculatedTotal,
        status: formStatus,
        lampiranName: formLampiranName || 'Dokumen_SP2D_Lembur.pdf',
        lampiranSize: '1.2 MB',
        createdBy: currentUser?.fullName || currentUser?.username || 'Subbagian Keuangan',
        createdAt: new Date().toISOString()
      };

      const newList = [newItem, ...realisasiLembur];
      setRealisasiLembur(newList);
      try {
        await saveFirestoreDoc('realisasi_lembur_2026', newItem);
        showToast('Realisasi pencairan lembur baru berhasil ditambahkan!');
      } catch (err) {
        showToast('Tersimpan di data lokal.');
      }
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data realisasi lembur ini?')) return;
    const newList = realisasiLembur.filter(i => i.id !== id);
    setRealisasiLembur(newList);
    try {
      await deleteFirestoreDoc('realisasi_lembur_2026', id);
      showToast('Data realisasi lembur berhasil dihapus.');
    } catch (err) {
      showToast('Data dihapus dari memori lokal.');
    }
  };

  // =========================================================================
  // EXPORT EXACT MATRIX TO CSV
  // =========================================================================
  const handleExportMatrixCSV = () => {
    let header1 = 'Golongan';
    let header2 = '';
    
    MONTH_KEYS.forEach(m => {
      header1 += `,${m.label},`;
      header2 += ',Lembur,Makan Lembur';
    });

    const formatCsvNum = (num: number | null | undefined) => {
      if (num === null || num === undefined) return '';
      return num;
    };

    const rowGol2 = `Golongan II${MONTH_KEYS.map(m => {
      const k = m.key;
      const data = gol2[k] as RealisasiGolonganMonthData | undefined;
      return `,${formatCsvNum(data?.lembur)},${formatCsvNum(data?.makanLembur)}`;
    }).join('')}`;

    const rowGol3 = `Golongan III${MONTH_KEYS.map(m => {
      const k = m.key;
      const data = gol3[k] as RealisasiGolonganMonthData | undefined;
      return `,${formatCsvNum(data?.lembur)},${formatCsvNum(data?.makanLembur)}`;
    }).join('')}`;

    const rowGol4 = `Golongan IV${MONTH_KEYS.map(m => {
      const k = m.key;
      const data = gol4[k] as RealisasiGolonganMonthData | undefined;
      return `,${formatCsvNum(data?.lembur)},${formatCsvNum(data?.makanLembur)}`;
    }).join('')}`;

    const rowDetail = `Total per Detail${computedMonthData.map(m => {
      return `,${m.totalLemburDetail !== null ? m.totalLemburDetail : '-'},${m.totalMakanDetail !== null ? m.totalMakanDetail : '-'}`;
    }).join('')}`;

    const rowTotalBulan = `Total Keseluruhan per bulan${computedMonthData.map(m => {
      return `,${m.totalBulanIniDisplay !== null ? m.totalBulanIniDisplay : '-'},`;
    }).join('')}`;

    const rowRealisasiSd = `Total Realisasi s.d.${computedMonthData.map(m => {
      return `,${m.totalRealisasiSd},`;
    }).join('')}`;

    const rowPersen = `% akumulatif dari pagu${computedMonthData.map(m => {
      return `,${m.percentAkumulatif.toFixed(2).replace('.', ',')}%,`;
    }).join('')}`;

    const rowSisa = `Sisa Anggaran akhir bulan${computedMonthData.map(m => {
      return `,${m.sisaAnggaran},`;
    }).join('')}`;

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [
      'REALISASI ANGGARAN LEMBUR TA 2026',
      `PAGU ANGGARAN TOTAL: ${paguTotal}`,
      '',
      header1,
      header2,
      rowGol2,
      rowGol3,
      rowGol4,
      rowDetail,
      rowTotalBulan,
      rowRealisasiSd,
      rowPersen,
      rowSisa
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Realisasi_Anggaran_Lembur_TA_2026_Format_Dokumen.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Tabel Realisasi Lembur TA 2026 berhasil diekspor.');
  };

  return (
    <div className="space-y-6" id="realisasi-lembur-view-root">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl z-50 flex items-center space-x-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2.5 bg-red-600 text-white rounded-xl shadow-xs">
              <DollarSign className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg md:text-xl font-display font-extrabold text-red-600 tracking-tight">
                  Realisasi Anggaran Lembur TA 2026
                </h2>
                <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded-md border border-red-200">
                  DIPA 2026
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kanwil Ditjen Perbendaharaan Provinsi Riau • Matriks Monitoring Penyerapan Uang Lembur & Uang Makan Lembur
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Switcher: Matriks Dokumen vs Detail SP2D */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveViewMode('matrix')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewMode === 'matrix'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Table className="w-3.5 h-3.5 text-red-600" />
              <span>Matriks Golongan (Sesuai Gambar)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode('sp2d-list')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewMode === 'sp2d-list'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-djpb-blue" />
              <span>Daftar SP2D ({realisasiLembur.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportMatrixCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel / CSV</span>
          </button>

          {isAdmin && activeViewMode === 'matrix' && (
            <button
              type="button"
              onClick={handleResetToDefault}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              title="Reset ke nilai awal dokumen resmi"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Data</span>
            </button>
          )}

          {isAdmin && activeViewMode === 'sp2d-list' && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#0A2540] hover:bg-[#123860] text-amber-300 text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Input SP2D Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="realisasi-lembur-kpis">
        
        {/* Pagu Card with Inline Edit Option for Admin */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs relative group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">PAGU ANGGARAN LEMBUR</span>
            <div className="flex items-center space-x-1">
              {isAdmin && !isEditingPagu && (
                <button
                  type="button"
                  onClick={() => {
                    setTempPagu(paguTotal);
                    setIsEditingPagu(true);
                  }}
                  className="p-1 text-slate-400 hover:text-djpb-blue rounded-md transition-colors cursor-pointer"
                  title="Ubah Pagu Alokasi"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="p-1.5 bg-blue-50 text-djpb-blue rounded-lg">
                <Building className="w-4 h-4" />
              </span>
            </div>
          </div>
          
          {isEditingPagu ? (
            <div className="mt-2 space-y-2">
              <input
                type="number"
                value={tempPagu}
                onChange={(e) => setTempPagu(Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1 text-sm font-mono font-bold bg-slate-50 border border-djpb-blue rounded-lg text-slate-900 focus:outline-none"
              />
              <div className="flex justify-end space-x-1">
                <button
                  type="button"
                  onClick={() => setIsEditingPagu(false)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaguTotal(tempPagu);
                    setIsEditingPagu(false);
                    showToast('Pagu alokasi lembur 2026 berhasil diperbarui.');
                  }}
                  className="px-2 py-0.5 bg-djpb-blue hover:bg-djpb-blue-light text-white text-[10px] font-bold rounded"
                >
                  Simpan
                </button>
              </div>
            </div>
          ) : (
            <div className="text-xl font-bold font-mono text-slate-900 mt-2">
              {formatIDR(paguTotal)}
            </div>
          )}

          <div className="text-[11px] text-slate-400 mt-1">
            Alokasi DIPA Kanwil DJPb Riau TA 2026
          </div>
        </div>

        {/* Total Realisasi */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TOTAL REALISASI S.D. AGUSTUS</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-2">
            {formatIDR(grandTotalRealisasi)}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center justify-between">
            <span>7 Bulan Penyerapan Efektif</span>
            <span className="font-mono">({formatNumberIDR(grandTotalRealisasi)})</span>
          </div>
        </div>

        {/* Persentase Akumulatif */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">% AKUMULATIF DARI PAGU</span>
            <span className="px-2 py-0.5 bg-blue-100 text-djpb-blue text-[10px] font-bold rounded-md">
              {grandPersentase.toFixed(2)}%
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-djpb-blue mt-2">
            {grandPersentase.toFixed(2).replace('.', ',')}%
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
            <div 
              className="bg-djpb-blue h-2 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, grandPersentase)}%` }}
            />
          </div>
        </div>

        {/* Sisa Anggaran */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">SISA ANGGARAN AKHIR PERIODE</span>
            <span className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-700 mt-2">
            {formatIDR(grandSisa)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Tersedia untuk Sep s.d. Des 2026
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: MATRIKS GOLONGAN SESUAI FORMAT DOKUMEN & GAMBAR                    */}
      {/* ========================================================================= */}
      {activeViewMode === 'matrix' && (
        <div className="space-y-6 animate-in fade-in duration-150" id="matrix-dokumen-view">
          
          {/* Main Excel-styled Document Matrix Table */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            
            {/* Table Header Bar */}
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
                <h3 className="font-display font-extrabold text-sm text-red-600 uppercase tracking-wide">
                  Tabel Matriks Realisasi Anggaran Lembur TA 2026
                </h3>
                <span className="text-[11px] text-slate-500 hidden md:inline">
                  (Rincian per Golongan Pegawai dan Bulan Realisasi)
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-xs">
                {isAdmin && (
                  <span className="text-[11px] text-slate-500 bg-slate-200/70 px-2.5 py-1 rounded-lg">
                    💡 Klik tombol ikon pensil pada header bulan untuk memperbarui angka realisasi
                  </span>
                )}
              </div>
            </div>

            {/* Scrollable Document Matrix */}
            <div className="overflow-x-auto p-3">
              <table className="w-full border-collapse border border-black text-xs select-none">
                <thead>
                  {/* Header Row 1: Golongan + 12 Bulan */}
                  <tr>
                    <th 
                      rowSpan={2} 
                      className="bg-[#d9ead3] text-black border border-black font-bold px-4 py-3 text-center min-w-[130px] sticky left-0 z-10"
                    >
                      Golongan
                    </th>
                    {MONTH_KEYS.map((m) => (
                      <th 
                        key={m.key} 
                        colSpan={2} 
                        className="bg-[#d9ead3] text-black border border-black font-bold px-3 py-2 text-center text-xs whitespace-nowrap min-w-[160px]"
                      >
                        <div className="flex items-center justify-center space-x-1.5">
                          <span>{m.label}</span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditMonth(m.key)}
                              className="p-0.5 text-black hover:text-red-700 hover:bg-emerald-200/60 rounded transition-colors cursor-pointer"
                              title={`Edit data realisasi ${m.label}`}
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                  
                  {/* Header Row 2: Sub-columns Lembur & Makan Lembur */}
                  <tr>
                    {MONTH_KEYS.map((m) => (
                      <React.Fragment key={`sub-${m.key}`}>
                        <th className="bg-[#d9ead3] text-black border border-black font-bold px-2 py-1.5 text-center text-[11px] min-w-[80px]">
                          Lembur
                        </th>
                        <th className="bg-[#d9ead3] text-black border border-black font-bold px-2 py-1.5 text-center text-[11px] min-w-[80px]">
                          Makan Lembur
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>

                <tbody className="font-mono">
                  
                  {/* Row 1: Golongan II */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="font-sans font-bold text-black px-4 py-2.5 border border-black bg-slate-50/60 sticky left-0 z-10">
                      Golongan II
                    </td>
                    {computedMonthData.map((m) => (
                      <React.Fragment key={`g2-${m.key}`}>
                        <td className="px-2 py-2.5 border border-black text-right text-black">
                          {formatNumberIDR(m.g2Lembur)}
                        </td>
                        <td className="px-2 py-2.5 border border-black text-right text-black">
                          {formatNumberIDR(m.g2Makan)}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>

                  {/* Row 2: Golongan III */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="font-sans font-bold text-black px-4 py-2.5 border border-black bg-slate-50/60 sticky left-0 z-10">
                      Golongan III
                    </td>
                    {computedMonthData.map((m) => (
                      <React.Fragment key={`g3-${m.key}`}>
                        <td className="px-2 py-2.5 border border-black text-right text-black">
                          {formatNumberIDR(m.g3Lembur)}
                        </td>
                        <td className="px-2 py-2.5 border border-black text-right text-black">
                          {formatNumberIDR(m.g3Makan)}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>

                  {/* Row 3: Golongan IV */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="font-sans font-bold text-black px-4 py-2.5 border border-black bg-slate-50/60 sticky left-0 z-10">
                      Golongan IV
                    </td>
                    {computedMonthData.map((m) => (
                      <React.Fragment key={`g4-${m.key}`}>
                        <td className="px-2 py-2.5 border border-black text-right text-black">
                          {formatNumberIDR(m.g4Lembur)}
                        </td>
                        <td className="px-2 py-2.5 border border-black text-right text-black">
                          {formatNumberIDR(m.g4Makan)}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>

                  {/* Row 4: Total per Detail */}
                  <tr className="bg-slate-100/90 font-bold">
                    <td className="font-sans font-extrabold text-black px-4 py-2.5 border border-black bg-slate-100 sticky left-0 z-10">
                      Total per Detail
                    </td>
                    {computedMonthData.map((m) => (
                      <React.Fragment key={`tot-det-${m.key}`}>
                        <td className="px-2 py-2.5 border border-black text-right text-black">
                          {m.totalLemburDetail !== null ? formatNumberIDR(m.totalLemburDetail) : '-'}
                        </td>
                        <td className="px-2 py-2.5 border border-black text-right text-black">
                          {m.totalMakanDetail !== null ? formatNumberIDR(m.totalMakanDetail) : '-'}
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>

                  {/* Row 5: Total Keseluruhan per bulan (Peach/Light Orange) */}
                  <tr className="bg-[#fce4d6] font-bold">
                    <td className="font-sans font-extrabold text-black px-4 py-2.5 border border-black bg-[#fce4d6] sticky left-0 z-10">
                      Total Keseluruhan per bulan
                    </td>
                    {computedMonthData.map((m) => (
                      <td 
                        key={`tot-all-${m.key}`} 
                        colSpan={2} 
                        className="px-3 py-2.5 border border-black text-center font-bold text-black"
                      >
                        {m.totalBulanIniDisplay !== null ? formatNumberIDR(m.totalBulanIniDisplay) : '-'}
                      </td>
                    ))}
                  </tr>

                  {/* Row 6: Total Realisasi s.d. (Peach/Light Orange) */}
                  <tr className="bg-[#fce4d6] font-bold">
                    <td className="font-sans font-extrabold text-black px-4 py-2.5 border border-black bg-[#fce4d6] sticky left-0 z-10">
                      Total Realisasi s.d.
                    </td>
                    {computedMonthData.map((m) => (
                      <td 
                        key={`tot-sd-${m.key}`} 
                        colSpan={2} 
                        className="px-3 py-2.5 border border-black text-center font-bold text-black"
                      >
                        {m.totalRealisasiSd > 0 ? formatNumberIDR(m.totalRealisasiSd) : '-'}
                      </td>
                    ))}
                  </tr>

                  {/* Row 7: % akumulatif dari pagu (Peach/Light Orange) */}
                  <tr className="bg-[#fce4d6] font-bold">
                    <td className="font-sans font-extrabold text-black px-4 py-2.5 border border-black bg-[#fce4d6] sticky left-0 z-10">
                      % akumulatif dari pagu
                    </td>
                    {computedMonthData.map((m) => (
                      <td 
                        key={`pct-${m.key}`} 
                        colSpan={2} 
                        className="px-3 py-2.5 border border-black text-center font-bold text-black"
                      >
                        {m.percentAkumulatif > 0 ? `${m.percentAkumulatif.toFixed(2).replace('.', ',')}%` : '-'}
                      </td>
                    ))}
                  </tr>

                  {/* Row 8: Sisa Anggaran akhir bulan (Peach/Light Orange) */}
                  <tr className="bg-[#fce4d6] font-bold">
                    <td className="font-sans font-extrabold text-black px-4 py-2.5 border border-black bg-[#fce4d6] sticky left-0 z-10">
                      Sisa Anggaran akhir bulan
                    </td>
                    {computedMonthData.map((m) => (
                      <td 
                        key={`sisa-${m.key}`} 
                        colSpan={2} 
                        className="px-3 py-2.5 border border-black text-center font-bold text-black"
                      >
                        {m.totalRealisasiSd > 0 ? formatNumberIDR(m.sisaAnggaran) : formatNumberIDR(paguTotal)}
                      </td>
                    ))}
                  </tr>

                </tbody>
              </table>
            </div>

            {/* Document Footer Notes */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-700">Sumber Dokumen:</span>
                <span>Subbagian Keuangan, Bagian Umum Kanwil Ditjen Perbendaharaan Provinsi Riau</span>
              </div>
              <div className="flex items-center space-x-3 text-[11px]">
                <span className="flex items-center space-x-1">
                  <span className="w-3 h-3 bg-[#d9ead3] border border-slate-300 rounded-xs" />
                  <span>Header Kolom Bulan</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-3 h-3 bg-[#fce4d6] border border-slate-300 rounded-xs" />
                  <span>Baris Akumulasi & Sisa Anggaran</span>
                </span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: DETAIL TRANSAKSI SP2D PERBENDAHARAAN                               */}
      {/* ========================================================================= */}
      {activeViewMode === 'sp2d-list' && (
        <div className="space-y-6 animate-in fade-in duration-150" id="sp2d-list-view">
          
          {/* Filter and Search Bar */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari No SP2D, uraian, atau unit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-djpb-blue"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedBidang}
                onChange={(e) => setSelectedBidang(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-djpb-blue cursor-pointer"
              >
                <option value="Semua">Semua Bidang/Bagian</option>
                <option value="Kakanwil">Kakanwil</option>
                <option value="Bagian Umum">Bagian Umum</option>
                <option value="Bidang PPA I">Bidang PPA I</option>
                <option value="Bidang PPA II">Bidang PPA II</option>
                <option value="Bidang PAPK">Bidang PAPK</option>
                <option value="Bidang SKKI">Bidang SKKI</option>
              </select>

              <select
                value={selectedBulan}
                onChange={(e) => setSelectedBulan(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-djpb-blue cursor-pointer"
              >
                <option value="Semua">Semua Bulan</option>
                {MONTH_KEYS.map(m => (
                  <option key={m.key} value={m.label}>{m.label}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-djpb-blue cursor-pointer"
              >
                <option value="Semua">Semua Status</option>
                <option value="Selesai Dibayar">Selesai Dibayar</option>
                <option value="Proses SP2D">Proses SP2D</option>
                <option value="Pengajuan SPM">Pengajuan SPM</option>
              </select>
            </div>
          </div>

          {/* SP2D Table */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden" id="table-realisasi-sp2d">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 w-12 text-center">No</th>
                    <th className="py-3.5 px-4">SP2D & Tanggal</th>
                    <th className="py-3.5 px-4">Bidang/Bagian</th>
                    <th className="py-3.5 px-4 min-w-[220px]">Uraian Kegiatan Lembur</th>
                    <th className="py-3.5 px-3 text-center">Org / Jam</th>
                    <th className="py-3.5 px-3 text-right">Uang Lembur</th>
                    <th className="py-3.5 px-3 text-right">Uang Makan</th>
                    <th className="py-3.5 px-4 text-right font-bold">Total Realisasi</th>
                    <th className="py-3.5 px-3 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        Tidak ada data realisasi lembur yang sesuai dengan kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                        
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-800 text-xs">{item.nomorSP2D}</div>
                          <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{item.tanggalSP2D}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2.5 py-1 bg-blue-50 text-djpb-blue font-bold rounded-lg text-[11px] border border-blue-100">
                            {item.bidang}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-1">{item.bulan}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-medium leading-relaxed max-w-sm">
                            {item.uraian}
                          </div>
                          {item.lampiranName && (
                            <div className="inline-flex items-center space-x-1 mt-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                              <Paperclip className="w-2.5 h-2.5" />
                              <span>{item.lampiranName}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <div className="font-bold text-slate-700">{item.jumlahPenerima} Org</div>
                          <div className="text-[11px] text-slate-400">{item.jumlahJam} Jam</div>
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                          {formatNumberIDR(item.uangLembur)}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                          {formatNumberIDR(item.uangMakanLembur)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-xs">
                          {formatIDR(item.totalRealisasi)}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                            item.status === 'Selesai Dibayar'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : item.status === 'Proses SP2D'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-djpb-blue border-blue-200'
                          }`}>
                            {item.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => setViewingItem(item)}
                              className="p-1.5 text-slate-500 hover:text-djpb-blue hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Lihat Detail & Bukti"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            
                            {isAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(item)}
                                  className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Data SP2D"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item.id)}
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Data"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredList.length > 0 && (
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                    <tr>
                      <td colSpan={7} className="py-3 px-4 text-right uppercase tracking-wider text-[11px]">
                        Total SP2D Ditampilkan ({filteredList.length} Transaksi):
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sm text-emerald-800">
                        {formatIDR(filteredList.reduce((acc, curr) => acc + curr.totalRealisasi, 0))}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT REALISASI MATRIKS BULANAN (PER GOLONGAN)                       */}
      {/* ========================================================================= */}
      {editingMatrixMonth && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto" id="modal-edit-matrix-month">
          <form 
            onSubmit={handleSaveMatrixMonth}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
          >
            <div className="bg-red-600 text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-white/20 text-white rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm font-display leading-tight">
                    Edit Realisasi Lembur Bulan {MONTH_KEYS.find(m => m.key === editingMatrixMonth)?.label} 2026
                  </h3>
                  <p className="text-[11px] text-red-100">Matriks Golongan Dokumen TA 2026</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingMatrixMonth(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <p className="text-slate-500 text-xs leading-relaxed">
                Masukkan nilai realisasi dalam satuan Rupiah (tanpa titik). Kosongkan atau isi tanda strip (-) jika belum ada realisasi.
              </p>

              {/* Golongan II */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <span className="font-bold text-slate-800 text-xs block border-b border-slate-200 pb-1">
                  1. Golongan II
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Uang Lembur (Rp)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 3576000"
                      value={editGol2Lembur}
                      onChange={(e) => setEditGol2Lembur(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Uang Makan (Rp)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 945000"
                      value={editGol2Makan}
                      onChange={(e) => setEditGol2Makan(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Golongan III */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <span className="font-bold text-slate-800 text-xs block border-b border-slate-200 pb-1">
                  2. Golongan III
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Uang Lembur (Rp)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 5490000"
                      value={editGol3Lembur}
                      onChange={(e) => setEditGol3Lembur(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Uang Makan (Rp)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 1443000"
                      value={editGol3Makan}
                      onChange={(e) => setEditGol3Makan(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Golongan IV */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <span className="font-bold text-slate-800 text-xs block border-b border-slate-200 pb-1">
                  3. Golongan IV
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Uang Lembur (Rp)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 1224000"
                      value={editGol4Lembur}
                      onChange={(e) => setEditGol4Lembur(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Uang Makan (Rp)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 287000"
                      value={editGol4Makan}
                      onChange={(e) => setEditGol4Makan(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900"
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingMatrixMonth(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Matriks</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INPUT / EDIT SP2D LEMBUR                                             */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto" id="modal-realisasi-lembur-form">
          <form 
            onSubmit={handleSaveForm}
            className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150"
          >
            <div className="bg-[#0A2540] text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm font-display leading-tight">
                    {editingItem ? 'Edit Data Realisasi SP2D Lembur' : 'Input Realisasi SP2D Lembur Baru'}
                  </h3>
                  <p className="text-[11px] text-blue-200">Subbagian Keuangan Kanwil DJPb Riau</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Bidang/Bagian *
                  </label>
                  <select
                    value={formBidang}
                    onChange={(e) => setFormBidang(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-djpb-blue"
                  >
                    <option value="Kakanwil">Kakanwil</option>
                    <option value="Bagian Umum">Bagian Umum</option>
                    <option value="Bidang PPA I">Bidang PPA I</option>
                    <option value="Bidang PPA II">Bidang PPA II</option>
                    <option value="Bidang PAPK">Bidang PAPK</option>
                    <option value="Bidang SKKI">Bidang SKKI</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Bulan / Periode *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="Contoh: Agustus 2026"
                    value={formBulan}
                    onChange={(e) => setFormBulan(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-djpb-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Nomor SP2D *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="Nomor SP2D 14 digit"
                    value={formNomorSP2D}
                    onChange={(e) => setFormNomorSP2D(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-none focus:border-djpb-blue"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Tanggal SP2D *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="Contoh: 10 Agustus 2026"
                    value={formTanggalSP2D}
                    onChange={(e) => setFormTanggalSP2D(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-djpb-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                  Uraian Kegiatan Lembur *
                </label>
                <textarea 
                  required
                  rows={2}
                  placeholder="Deskripsi kegiatan atau lembur yang dibayarkan..."
                  value={formUraian}
                  onChange={(e) => setFormUraian(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-djpb-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-1 text-[10px]">
                    Jumlah Pegawai (Orang)
                  </label>
                  <input 
                    type="number"
                    value={formPenerima}
                    onChange={(e) => setFormPenerima(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase tracking-wider mb-1 text-[10px]">
                    Total Jam Kerja Lembur
                  </label>
                  <input 
                    type="number"
                    value={formJam}
                    onChange={(e) => setFormJam(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Uang Lembur (Rp) *
                  </label>
                  <input 
                    type="number"
                    value={formUangLembur}
                    onChange={(e) => setFormUangLembur(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-djpb-blue"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Uang Makan Lembur (Rp) *
                  </label>
                  <input 
                    type="number"
                    value={formUangMakan}
                    onChange={(e) => setFormUangMakan(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-djpb-blue"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <span className="font-bold text-emerald-900 text-xs">Total Realisasi SP2D:</span>
                <span className="font-mono font-black text-emerald-800 text-sm">
                  {formatIDR((Number(formUangLembur) || 0) + (Number(formUangMakan) || 0))}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Status Pembayaran *
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800"
                  >
                    <option value="Selesai Dibayar">Selesai Dibayar</option>
                    <option value="Proses SP2D">Proses SP2D</option>
                    <option value="Pengajuan SPM">Pengajuan SPM</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1 text-[10px]">
                    Nama Berkas Lampiran SP2D
                  </label>
                  <input 
                    type="text"
                    placeholder="Contoh: SP2D_Lembur_Agustus2026.pdf"
                    value={formLampiranName}
                    onChange={(e) => setFormLampiranName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                  />
                </div>
              </div>

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Realisasi</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETAIL REALISASI SP2D                                               */}
      {/* ========================================================================= */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" id="modal-detail-realisasi-lembur">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="bg-[#0A2540] text-white p-4.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm font-display">Detail Transaksi SP2D Lembur</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setViewingItem(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Nomor SP2D</span>
                  <div className="font-mono font-bold text-sm text-slate-800">{viewingItem.nomorSP2D}</div>
                </div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full border border-emerald-200 text-[11px]">
                  {viewingItem.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-700">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Bidang/Bagian:</span>
                  <p className="font-bold text-djpb-blue">{viewingItem.bidang}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Bulan / Tanggal:</span>
                  <p className="font-medium">{viewingItem.bulan} ({viewingItem.tanggalSP2D})</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Penerima Lembur:</span>
                  <p className="font-medium">{viewingItem.jumlahPenerima} Pegawai</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Total Jam:</span>
                  <p className="font-medium">{viewingItem.jumlahJam} Jam Kerja</p>
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Uraian Pekerjaan:</span>
                <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800 leading-relaxed mt-1">
                  {viewingItem.uraian}
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Uang Lembur:</span>
                  <span className="font-mono font-medium">{formatIDR(viewingItem.uangLembur)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Uang Makan Lembur:</span>
                  <span className="font-mono font-medium">{formatIDR(viewingItem.uangMakanLembur)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900 text-sm">
                  <span>Total Realisasi:</span>
                  <span className="font-mono text-emerald-700">{formatIDR(viewingItem.totalRealisasi)}</span>
                </div>
              </div>

              {viewingItem.lampiranName && (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <Paperclip className="w-4 h-4 text-djpb-blue" />
                    <div>
                      <div className="font-semibold text-slate-800 truncate max-w-[200px]">{viewingItem.lampiranName}</div>
                      <div className="text-[10px] text-slate-400">{viewingItem.lampiranSize || 'Dokumen PDF'}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast(`Mengunduh berkas ${viewingItem.lampiranName}...`)}
                    className="px-3 py-1.5 bg-djpb-blue hover:bg-djpb-blue-light text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Unduh
                  </button>
                </div>
              )}

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
