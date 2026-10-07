import React from 'react';
import { 
  DollarSign, CalendarClock, Layers, Calendar
} from 'lucide-react';
import { 
  RencanaLemburRow, 
  RealisasiLemburItem, 
  RealisasiGolonganItem,
  AlokasiBidangSection,
  RealisasiBidangRow,
  CurrentUser 
} from '../types';
import RencanaLemburView from './RencanaLemburView';
import RealisasiLemburView from './RealisasiLemburView';
import AlokasiLemburBidangView from './AlokasiLemburBidangView';
import RealisasiLemburBidangView from './RealisasiLemburBidangView';

interface KeuanganSectionProps {
  subTab: string;
  onSubTabChange?: (tabId: string) => void;
  rencanaLembur: RencanaLemburRow[];
  setRencanaLembur: React.Dispatch<React.SetStateAction<RencanaLemburRow[]>>;
  realisasiLembur: RealisasiLemburItem[];
  setRealisasiLembur: React.Dispatch<React.SetStateAction<RealisasiLemburItem[]>>;
  realisasiGolongan?: RealisasiGolonganItem[];
  setRealisasiGolongan?: React.Dispatch<React.SetStateAction<RealisasiGolonganItem[]>>;
  alokasiBidang?: AlokasiBidangSection[];
  setAlokasiBidang?: React.Dispatch<React.SetStateAction<AlokasiBidangSection[]>>;
  realisasiBidang?: RealisasiBidangRow[];
  setRealisasiBidang?: React.Dispatch<React.SetStateAction<RealisasiBidangRow[]>>;
  isEditMode: boolean;
  currentUser?: CurrentUser | null;
}

export default function KeuanganSection({
  subTab,
  onSubTabChange,
  rencanaLembur,
  setRencanaLembur,
  realisasiLembur,
  setRealisasiLembur,
  realisasiGolongan,
  setRealisasiGolongan,
  alokasiBidang,
  setAlokasiBidang,
  realisasiBidang,
  setRealisasiBidang,
  isEditMode,
  currentUser
}: KeuanganSectionProps) {
  // Active sub-tab state (fallback to 'rencana-lembur')
  const validTabs = ['rencana-lembur', 'realisasi-lembur', 'alokasi-lembur-bidang', 'realisasi-lembur-bidang'];
  const currentSubTab = validTabs.includes(subTab) ? subTab : 'rencana-lembur';

  const handleTabClick = (tabId: string) => {
    if (onSubTabChange) {
      onSubTabChange(tabId);
    }
  };

  const navTabs = [
    {
      id: 'rencana-lembur',
      label: 'Rencana Lembur 2026',
      desc: 'Matriks Alokasi Unit Kerja',
      icon: CalendarClock,
      badge: `${rencanaLembur.length} Bidang`
    },
    {
      id: 'realisasi-lembur',
      label: 'Realisasi Anggaran Lembur',
      desc: 'Matriks Golongan & SP2D',
      icon: DollarSign,
      badge: `${realisasiLembur.length} SP2D`
    },
    {
      id: 'alokasi-lembur-bidang',
      label: 'Alokasi Lembur Per Bidang',
      desc: 'Rincian Tarif SBM & Jam',
      icon: Layers,
      badge: `Rp 107,4 M`
    },
    {
      id: 'realisasi-lembur-bidang',
      label: 'Realisasi Per Bidang',
      desc: 'Pilihan Bulan & Triwulan',
      icon: Calendar,
      badge: `Bulan & TW`
    }
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6" id="keuangan-section-root">
      
      {/* Top Header & Navigation Sub-Tabs */}
      <div className="bg-white rounded-2xl p-2 shadow-xs border border-slate-200" id="keuangan-subtab-navigation">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id)}
                className={`p-3.5 rounded-xl transition-all flex items-center space-x-3 text-left cursor-pointer ${
                  isActive 
                    ? 'bg-[#0A2540] text-white shadow-sm' 
                    : 'bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className={`p-2.5 rounded-lg shrink-0 ${
                  isActive ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-100 text-slate-500'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs sm:text-sm truncate">{tab.label}</span>
                    {tab.badge && (
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ml-1 shrink-0 ${
                        isActive ? 'bg-amber-300/20 text-amber-300' : 'bg-slate-200/80 text-slate-600'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <div className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                    {tab.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Tab 1: Rencana Lembur Kanwil DJPb Riau Tahun 2026 */}
      {currentSubTab === 'rencana-lembur' && (
        <div className="animate-in fade-in duration-150">
          <RencanaLemburView 
            rencanaLembur={rencanaLembur}
            setRencanaLembur={setRencanaLembur}
            isEditMode={isEditMode}
            currentUser={currentUser}
          />
        </div>
      )}

      {/* Sub-Tab 2: Realisasi Anggaran Lembur */}
      {currentSubTab === 'realisasi-lembur' && (
        <div className="animate-in fade-in duration-150">
          <RealisasiLemburView 
            realisasiLembur={realisasiLembur}
            setRealisasiLembur={setRealisasiLembur}
            realisasiGolongan={realisasiGolongan}
            setRealisasiGolongan={setRealisasiGolongan}
            rencanaLembur={rencanaLembur}
            isEditMode={isEditMode}
            currentUser={currentUser}
          />
        </div>
      )}

      {/* Sub-Tab 3: Alokasi Anggaran Lembur Per Bidang/Bagian TA 2026 */}
      {currentSubTab === 'alokasi-lembur-bidang' && (
        <div className="animate-in fade-in duration-150">
          <AlokasiLemburBidangView 
            alokasiBidang={alokasiBidang}
            setAlokasiBidang={setAlokasiBidang}
            isEditMode={isEditMode}
            currentUser={currentUser}
          />
        </div>
      )}

      {/* Sub-Tab 4: Realisasi Lembur Per Bidang (Bulan & Triwulan) */}
      {currentSubTab === 'realisasi-lembur-bidang' && (
        <div className="animate-in fade-in duration-150">
          <RealisasiLemburBidangView 
            realisasiBidang={realisasiBidang}
            setRealisasiBidang={setRealisasiBidang}
            isEditMode={isEditMode}
            currentUser={currentUser}
          />
        </div>
      )}

    </div>
  );
}

