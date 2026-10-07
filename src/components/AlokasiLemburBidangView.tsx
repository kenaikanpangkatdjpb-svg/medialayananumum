import React, { useState, useMemo } from 'react';
import { 
  Layers, Download, Plus, Edit3, Trash2, Check, X, 
  Search, Filter, FileSpreadsheet, RefreshCw, Calculator, 
  CheckCircle2, DollarSign, PieChart as PieIcon, ArrowUpDown, ChevronDown, ChevronUp
} from 'lucide-react';
import { AlokasiBidangSection, AlokasiBidangDetailItem, CurrentUser } from '../types';
import { formatIDR, formatNumberIDR, INITIAL_ALOKASI_BIDANG_2026 } from '../mockData';
import { saveFirestoreDoc, deleteFirestoreDoc } from '../lib/firebase';

interface AlokasiLemburBidangViewProps {
  alokasiBidang?: AlokasiBidangSection[];
  setAlokasiBidang?: React.Dispatch<React.SetStateAction<AlokasiBidangSection[]>>;
  isEditMode: boolean;
  currentUser?: CurrentUser | null;
}

export default function AlokasiLemburBidangView({
  alokasiBidang,
  setAlokasiBidang,
  isEditMode,
  currentUser
}: AlokasiLemburBidangViewProps) {
  const isAdmin = currentUser?.role === 'admin' || isEditMode;

  // Local state initialized with props or default data
  const [data, setData] = useState<AlokasiBidangSection[]>(() => {
    return (alokasiBidang && alokasiBidang.length > 0) ? alokasiBidang : INITIAL_ALOKASI_BIDANG_2026;
  });

  // Keep synchronized if parent updates
  React.useEffect(() => {
    if (alokasiBidang && alokasiBidang.length > 0) {
      setData(alokasiBidang);
    }
  }, [alokasiBidang]);

  const updateAllData = (newData: AlokasiBidangSection[]) => {
    setData(newData);
    if (setAlokasiBidang) {
      setAlokasiBidang(newData);
    }
    try {
      localStorage.setItem('melayu_alokasi_bidang_2026', JSON.stringify(newData));
      // Sync to Firestore for each section
      newData.forEach(sec => {
        saveFirestoreDoc('alokasi_bidang_2026', sec).catch(() => {});
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Filter & Search states
  const [selectedBidang, setSelectedBidang] = useState<string>('Semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'alokasi-kakanwil': true,
    'alokasi-pa1': true,
    'alokasi-pa2': true,
    'alokasi-papk': true,
    'alokasi-skki': true,
    'alokasi-umum': true,
  });

  // Modal edit detail state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingDetailItem, setEditingDetailItem] = useState<AlokasiBidangDetailItem | null>(null);
  
  // Form fields in modal
  const [formDetail, setFormDetail] = useState('');
  const [formVol, setFormVol] = useState<number>(0);
  const [formHargaSatuan, setFormHargaSatuan] = useState<number>(0);
  const [formGolongan, setFormGolongan] = useState<string>('Golongan III');
  const [formJenis, setFormJenis] = useState<string>('Lembur');

  // Summary calculations
  const grandTotal = useMemo(() => {
    return data.reduce((acc, sec) => {
      const secTotal = sec.details.reduce((dAcc, d) => dAcc + d.jumlahBiaya, 0);
      return acc + secTotal;
    }, 0);
  }, [data]);

  const summaryStats = useMemo(() => {
    let totalLembur = 0;
    let totalMakan = 0;
    let totalGol2 = 0;
    let totalGol3 = 0;
    let totalGol4 = 0;

    data.forEach(sec => {
      sec.details.forEach(d => {
        const text = d.detail.toLowerCase();
        if (text.includes('makan')) {
          totalMakan += d.jumlahBiaya;
        } else {
          totalLembur += d.jumlahBiaya;
        }

        if (text.includes('golongan ii') && !text.includes('golongan iii')) {
          totalGol2 += d.jumlahBiaya;
        } else if (text.includes('golongan iii')) {
          totalGol3 += d.jumlahBiaya;
        } else if (text.includes('golongan iv')) {
          totalGol4 += d.jumlahBiaya;
        }
      });
    });

    return {
      totalLembur,
      totalMakan,
      totalGol2,
      totalGol3,
      totalGol4,
      unitCount: data.length
    };
  }, [data]);

  // Filtered data
  const filteredData = useMemo(() => {
    return data.filter(sec => {
      const matchBidang = selectedBidang === 'Semua' || sec.bidang.toLowerCase() === selectedBidang.toLowerCase();
      if (!matchBidang) return false;

      if (!searchTerm.trim()) return true;

      const term = searchTerm.toLowerCase();
      const matchSecName = sec.bidang.toLowerCase().includes(term);
      const matchDetails = sec.details.some(d => d.detail.toLowerCase().includes(term));
      return matchSecName || matchDetails;
    });
  }, [data, selectedBidang, searchTerm]);

  // Toggle section collapse
  const toggleSection = (secId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [secId]: !prev[secId]
    }));
  };

  // Open modal to add item to section
  const handleOpenAddModal = (sectionId: string) => {
    setEditingSectionId(sectionId);
    setEditingDetailItem(null);
    setFormDetail('Uang Lembur Golongan III [1 ORG x 2 JAM x 26 HR]');
    setFormVol(52);
    setFormHargaSatuan(30000);
    setFormGolongan('Golongan III');
    setFormJenis('Lembur');
    setIsEditModalOpen(true);
  };

  // Open modal to edit existing detail item
  const handleOpenEditModal = (sectionId: string, item: AlokasiBidangDetailItem) => {
    setEditingSectionId(sectionId);
    setEditingDetailItem(item);
    setFormDetail(item.detail);
    setFormVol(item.vol);
    setFormHargaSatuan(item.hargaSatuan);
    setFormGolongan(item.golongan || 'Golongan III');
    setFormJenis(item.jenis || 'Lembur');
    setIsEditModalOpen(true);
  };

  // Save detail item (create or update)
  const handleSaveDetailItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSectionId) return;

    const calculatedJumlah = formVol * formHargaSatuan;

    const updatedData = data.map(sec => {
      if (sec.id !== editingSectionId) return sec;

      let newDetails: AlokasiBidangDetailItem[];
      if (editingDetailItem) {
        // Update existing item
        newDetails = sec.details.map(d => {
          if (d.id === editingDetailItem.id) {
            return {
              ...d,
              detail: formDetail,
              vol: formVol,
              hargaSatuan: formHargaSatuan,
              jumlahBiaya: calculatedJumlah,
              golongan: formGolongan,
              jenis: formJenis
            };
          }
          return d;
        });
      } else {
        // Add new item
        const newItem: AlokasiBidangDetailItem = {
          id: `det-${Date.now()}`,
          detail: formDetail,
          vol: formVol,
          hargaSatuan: formHargaSatuan,
          jumlahBiaya: calculatedJumlah,
          golongan: formGolongan,
          jenis: formJenis
        };
        newDetails = [...sec.details, newItem];
      }

      const newTotal = newDetails.reduce((sum, it) => sum + it.jumlahBiaya, 0);

      return {
        ...sec,
        details: newDetails,
        totalBiaya: newTotal
      };
    });

    updateAllData(updatedData);
    setIsEditModalOpen(false);
  };

  // Delete detail item
  const handleDeleteDetailItem = (sectionId: string, itemId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus rincian lembur ini?')) return;

    const updatedData = data.map(sec => {
      if (sec.id !== sectionId) return sec;
      const newDetails = sec.details.filter(d => d.id !== itemId);
      const newTotal = newDetails.reduce((sum, it) => sum + it.jumlahBiaya, 0);
      return {
        ...sec,
        details: newDetails,
        totalBiaya: newTotal
      };
    });

    updateAllData(updatedData);
  };

  // Reset to default document values
  const handleResetToDefault = () => {
    if (!window.confirm('Kembalikan semua data alokasi lembur per bidang ke format resmi dokumen TA 2026?')) return;
    updateAllData(INITIAL_ALOKASI_BIDANG_2026);
  };

  // Export to CSV matching Excel format
  const handleExportCSV = () => {
    const rows: string[] = [];
    rows.push(['ALOKASI ANGGARAN LEMBUR PER BIDANG/BAGIAN TA 2026'].join(','));
    rows.push(['No', 'DETAIL', 'VOL', 'HARGA SATUAN', 'JUMLAH BIAYA'].join(','));

    data.forEach(sec => {
      // Section header row
      rows.push([
        sec.no,
        `"${sec.bidang.replace(/"/g, '""')}"`,
        '',
        '',
        sec.totalBiaya
      ].join(','));

      // Detail rows
      sec.details.forEach(d => {
        rows.push([
          '',
          `"${d.detail.replace(/"/g, '""')}"`,
          d.vol,
          d.hargaSatuan,
          d.jumlahBiaya
        ].join(','));
      });
    });

    // Total row
    rows.push(['TOTAL', '', '', '', grandTotal].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Alokasi_Anggaran_Lembur_Per_Bidang_TA_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="alokasi-lembur-bidang-root">
      
      {/* Header Banner & Title Card */}
      <div className="bg-gradient-to-r from-[#0A2540] via-[#103A60] to-[#0A2540] rounded-2xl p-6 text-white shadow-md border border-slate-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold mb-2 border border-amber-400/30">
              <Layers className="w-3.5 h-3.5" />
              <span>DIPA KANWIL DJPB PROVINSI RIAU TA 2026</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-white drop-shadow-xs">
              ALOKASI ANGGARAN LEMBUR PER BIDANG/BAGIAN TA 2026
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Rincian alokasi kebutuhan uang lembur dan uang makan lembur per unit kerja / bidang / bagian berdasarkan jumlah pegawai, jam kerja, dan standar tarif SBM TA 2026.
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
                onClick={handleResetToDefault}
                className="flex items-center space-x-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
                title="Reset data ke standar dokumen resmi"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Dokumen</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4" id="alokasi-kpi-cards">
        
        {/* Card 1: Total Alokasi Pagu */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Alokasi 6 Bidang</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 mt-2">
            {formatIDR(grandTotal)}
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 mt-1">
            <span className="font-semibold text-emerald-600">100% Pagu Terdistribusi</span>
            <span>• 6 Unit Kerja</span>
          </div>
        </div>

        {/* Card 2: Belanja Uang Lembur */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-blue-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Uang Lembur</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-blue-700 mt-2">
            {formatIDR(summaryStats.totalLembur)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {((summaryStats.totalLembur / grandTotal) * 100).toFixed(1)}% dari Total Alokasi
          </div>
        </div>

        {/* Card 3: Belanja Uang Makan Lembur */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Uang Makan Lembur</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <PieIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-700 mt-2">
            {formatIDR(summaryStats.totalMakan)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {((summaryStats.totalMakan / grandTotal) * 100).toFixed(1)}% dari Total Alokasi
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3" id="alokasi-filter-bar">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari rincian golongan / bidang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A2540] bg-slate-50"
            />
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedBidang}
              onChange={(e) => setSelectedBidang(e.target.value)}
              className="text-xs py-2 px-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0A2540]"
            >
              <option value="Semua">Semua Bidang ({data.length})</option>
              {data.map(sec => (
                <option key={sec.id} value={sec.bidang}>{sec.bidang}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-[11px] text-slate-500 font-medium">
            Menampilkan <strong className="text-slate-800">{filteredData.length}</strong> dari {data.length} Bidang
          </span>
        </div>
      </div>

      {/* Official Table Representation (Exact Format to Image) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-400 overflow-hidden" id="alokasi-bidang-table-wrapper">
        
        {/* Table Title Banner */}
        <div className="bg-[#f8fafc] border-b border-slate-300 px-6 py-4 text-center">
          <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-slate-900">
            ALOKASI ANGGARAN LEMBUR PER BIDANG/BAGIAN TA 2026
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Kantor Wilayah Direktorat Jenderal Perbendaharaan Provinsi Riau
          </p>
        </div>

        <div className="overflow-x-auto p-3">
          <table className="w-full text-left border-collapse border border-black min-w-[760px]">
            
            {/* Table Header: Gold / Amber #f1c232 */}
            <thead>
              <tr className="bg-[#f1c232] text-black font-black text-xs uppercase">
                <th className="py-2.5 px-3 text-center border border-black w-14">
                  No
                </th>
                <th className="py-2.5 px-4 text-center border border-black">
                  DETAIL
                </th>
                <th className="py-2.5 px-3 text-center border border-black w-24">
                  VOL
                </th>
                <th className="py-2.5 px-4 text-center border border-black w-36">
                  HARGA SATUAN
                </th>
                <th className="py-2.5 px-4 text-center border border-black w-44">
                  JUMLAH BIAYA
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="text-xs">
              {filteredData.map((section) => {
                const isExpanded = expandedSections[section.id] !== false;
                const sectionSubtotal = section.details.reduce((acc, d) => acc + d.jumlahBiaya, 0);

                return (
                  <React.Fragment key={section.id}>
                    {/* Section Header Row (Gold / Peach #f6b26b / #f9cb9c) */}
                    <tr className="bg-[#f6b26b] font-bold text-black">
                      <td className="py-2 px-3 text-center border border-black font-black text-sm">
                        {section.no}
                      </td>
                      <td className="py-2 px-4 border border-black font-black text-sm tracking-wide">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => toggleSection(section.id)}
                              className="hover:bg-black/10 p-1 rounded-md transition-colors cursor-pointer"
                              title={isExpanded ? "Sembunyikan rincian" : "Tampilkan rincian"}
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            <span className="uppercase">{section.bidang}</span>
                          </div>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenAddModal(section.id)}
                              className="text-[11px] font-bold px-2 py-0.5 bg-white/80 hover:bg-white text-slate-900 rounded-md border border-black/30 flex items-center space-x-1 cursor-pointer transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Tambah Baris</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center border border-black font-semibold">
                        {/* Empty in header row as in image */}
                      </td>
                      <td className="py-2 px-4 text-right border border-black font-semibold">
                        {/* Empty in header row as in image */}
                      </td>
                      <td className="py-2 px-4 text-right border border-black font-black text-black text-sm">
                        {formatNumberIDR(sectionSubtotal)}
                      </td>
                    </tr>

                    {/* Detail Items Rows */}
                    {isExpanded && section.details.map((detailItem, idx) => (
                      <tr 
                        key={detailItem.id} 
                        className={`hover:bg-amber-50/60 transition-colors ${
                          idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
                        }`}
                      >
                        <td className="py-2 px-3 text-center border border-black text-slate-400 text-[11px]">
                          {/* Empty No column for sub-items, exactly like the image */}
                        </td>
                        <td className="py-2 px-4 border border-black text-black font-medium">
                          <div className="flex items-center justify-between group">
                            <span className="pl-2">{detailItem.detail}</span>
                            
                            {isAdmin && (
                              <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(section.id, detailItem)}
                                  className="p-1 hover:bg-slate-200 text-blue-600 rounded cursor-pointer"
                                  title="Edit baris ini"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDetailItem(section.id, detailItem.id)}
                                  className="p-1 hover:bg-slate-200 text-rose-600 rounded cursor-pointer"
                                  title="Hapus baris ini"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center border border-black font-medium text-black">
                          {detailItem.vol}
                        </td>
                        <td className="py-2 px-4 text-right border border-black font-medium text-black">
                          {formatNumberIDR(detailItem.hargaSatuan)}
                        </td>
                        <td className="py-2 px-4 text-right border border-black font-semibold text-black">
                          {formatNumberIDR(detailItem.jumlahBiaya)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}

              {/* Table Footer: Total Keseluruhan (Soft Blue #a4c2f4 / #8ea9db) */}
              <tr className="bg-[#a4c2f4] text-black font-black text-sm">
                <td colSpan={4} className="py-3 px-6 text-center border border-black uppercase tracking-wider font-black text-sm sm:text-base">
                  TOTAL
                </td>
                <td className="py-3 px-4 text-right border border-black font-black text-black text-sm sm:text-base">
                  {formatNumberIDR(grandTotal)}
                </td>
              </tr>
            </tbody>

          </table>
        </div>

        {/* Footer Note */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Format tabel dan formula kalkulasi sesuai dokumen resmi Alokasi Anggaran Lembur DJPb Riau TA 2026.</span>
          </div>
          <div className="font-semibold text-slate-700">
            Total Alokasi: <span className="text-slate-900 font-black">{formatIDR(grandTotal)}</span>
          </div>
        </div>

      </div>

      {/* Tarif Standar SBM Info Card */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 rounded-2xl p-5 border border-amber-200/80 shadow-xs" id="alokasi-tarif-info">
        <div className="flex items-center space-x-2 mb-3">
          <Calculator className="w-4 h-4 text-amber-700" />
          <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
            Standar Biaya Masukan (SBM) Uang Lembur & Uang Makan Lembur TA 2026
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          <div className="bg-white/80 backdrop-blur-xs rounded-xl p-3.5 border border-amber-200">
            <div className="text-xs font-bold text-slate-900">Golongan II</div>
            <div className="mt-1.5 space-y-0.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Uang Lembur:</span>
                <span className="font-bold text-slate-900">Rp 24.000 / jam</span>
              </div>
              <div className="flex justify-between">
                <span>Uang Makan Lembur:</span>
                <span className="font-bold text-slate-900">Rp 35.000 / hari</span>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xs rounded-xl p-3.5 border border-amber-200">
            <div className="text-xs font-bold text-slate-900">Golongan III</div>
            <div className="mt-1.5 space-y-0.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Uang Lembur:</span>
                <span className="font-bold text-slate-900">Rp 30.000 / jam</span>
              </div>
              <div className="flex justify-between">
                <span>Uang Makan Lembur:</span>
                <span className="font-bold text-slate-900">Rp 37.000 / hari</span>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xs rounded-xl p-3.5 border border-amber-200">
            <div className="text-xs font-bold text-slate-900">Golongan IV</div>
            <div className="mt-1.5 space-y-0.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Uang Lembur:</span>
                <span className="font-bold text-slate-900">Rp 36.000 / jam</span>
              </div>
              <div className="flex justify-between">
                <span>Uang Makan Lembur:</span>
                <span className="font-bold text-slate-900">Rp 41.000 / hari</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modal Add / Edit Detail Row */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
            
            <div className="bg-[#0A2540] text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm">
                  {editingDetailItem ? 'Edit Rincian Alokasi Lembur' : 'Tambah Rincian Alokasi Lembur'}
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

            <form onSubmit={handleSaveDetailItem} className="p-6 space-y-4 text-xs">
              
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Uraian Detail (Contoh: Uang Lembur Golongan III [5 ORG x 2 JAM x 26 HR])
                </label>
                <input
                  type="text"
                  required
                  value={formDetail}
                  onChange={(e) => setFormDetail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A2540] text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Golongan
                  </label>
                  <select
                    value={formGolongan}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormGolongan(val);
                      if (formJenis === 'Lembur') {
                        if (val === 'Golongan II') setFormHargaSatuan(24000);
                        if (val === 'Golongan III') setFormHargaSatuan(30000);
                        if (val === 'Golongan IV') setFormHargaSatuan(36000);
                      } else {
                        if (val === 'Golongan II') setFormHargaSatuan(35000);
                        if (val === 'Golongan III') setFormHargaSatuan(37000);
                        if (val === 'Golongan IV') setFormHargaSatuan(41000);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A2540] text-xs bg-slate-50"
                  >
                    <option value="Golongan II">Golongan II</option>
                    <option value="Golongan III">Golongan III</option>
                    <option value="Golongan IV">Golongan IV</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Jenis Biaya
                  </label>
                  <select
                    value={formJenis}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormJenis(val);
                      if (val === 'Lembur') {
                        if (formGolongan === 'Golongan II') setFormHargaSatuan(24000);
                        if (formGolongan === 'Golongan III') setFormHargaSatuan(30000);
                        if (formGolongan === 'Golongan IV') setFormHargaSatuan(36000);
                      } else {
                        if (formGolongan === 'Golongan II') setFormHargaSatuan(35000);
                        if (formGolongan === 'Golongan III') setFormHargaSatuan(37000);
                        if (formGolongan === 'Golongan IV') setFormHargaSatuan(41000);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A2540] text-xs bg-slate-50"
                  >
                    <option value="Lembur">Uang Lembur</option>
                    <option value="Makan Lembur">Uang Makan Lembur</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Volume (VOL)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formVol}
                    onChange={(e) => setFormVol(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A2540] text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Harga Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    required
                    value={formHargaSatuan}
                    onChange={(e) => setFormHargaSatuan(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0A2540] text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Total Calculation Preview */}
              <div className="bg-slate-100 p-3 rounded-xl flex items-center justify-between border border-slate-200">
                <span className="font-bold text-slate-600">Jumlah Biaya:</span>
                <span className="text-sm font-black text-slate-900">
                  {formatIDR(formVol * formHargaSatuan)}
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
