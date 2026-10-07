import React, { useState, useEffect } from 'react';
import { 
  Clock, Sparkles, Building, User, HelpCircle, Car, Package, 
  Layers, ArrowUpRight, TrendingUp, X, LayoutDashboard, Calendar,
  ExternalLink, FileSpreadsheet, FolderHeart, Check, Crown, ShieldCheck, PlusCircle, Filter, DollarSign
} from 'lucide-react';
import { RoomBooking, VehicleBooking, ItemBooking, CurrentUser, ActivityGalleryItem } from '../types';
import ActivityGallerySection from './ActivityGallerySection';

interface WelcomeViewProps {
  roomBookings: RoomBooking[];
  vehicleBookings: VehicleBooking[];
  itemBookings?: ItemBooking[];
  galleryItems?: ActivityGalleryItem[];
  setGalleryItems?: React.Dispatch<React.SetStateAction<ActivityGalleryItem[]>>;
  onSaveGalleryToFirebase?: (items: ActivityGalleryItem[]) => void;
  onDeleteGalleryFromFirebase?: (id: string) => void;
  onNavigateToTab: (tabId: string) => void;
  currentUser?: CurrentUser;
  onLogout?: () => void;
  isEditMode?: boolean;
}

// Default Kanwil DJPb Riau background building image preset
const DEFAULT_KANWIL_IMAGE = 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1600&q=80';

// Component for Jadwal Manajemen Kinerja
function JadwalManajemenKinerjaCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" id="jadwal-manajemen-kinerja-card">
      {/* Grey Header Bar */}
      <div className="bg-slate-200/90 text-slate-800 px-5 py-2.5 font-display font-extrabold text-xs tracking-wider uppercase border-b border-slate-300/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-djpb-blue" />
          <span>Jadwal Manajemen Kinerja</span>
        </div>
        <span className="text-[10px] bg-slate-300 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">Triwulan III Tahun 2026</span>
      </div>

      <div className="p-5 md:p-6 space-y-4">
        {/* Internal Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-blue-100 pb-4 gap-3">
          <div>
            <div className="flex items-center space-x-2 text-djpb-blue font-extrabold text-lg md:text-xl font-display">
              <span>Pelaksanaan Manajemen Kinerja Organisasi Triwulan III Tahun 2026</span>
            </div>
            <p className="text-amber-600 font-bold text-xs md:text-sm font-display mt-0.5">
              Kanwil DJPb Provinsi Riau
            </p>
          </div>
          
          <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
            <a
              href="https://docs.google.com/spreadsheets/d/1gzinSCcnpmKXy1aawRCtK00jam-SCk_zEUkdrJrvRoc/edit?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center space-x-1.5 shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Spreadsheet Subbagian Penilaian Kinerja</span>
              <ExternalLink className="w-3 h-3" />
            </a>

          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#2B5282] text-white font-bold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 w-12 text-center border-r border-blue-800">No.</th>
                <th className="py-2.5 px-4 border-r border-blue-800">Kegiatan / Agenda Pelaksanaan Kinerja Organisasi</th>
                <th className="py-2.5 px-4 w-72 md:w-80">Batas Waktu Pelaksanaan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 font-sans text-[11px]">
              {/* 1 */}
              <tr className="hover:bg-blue-50/40 transition-colors">
                <td className="py-3 px-3 text-center font-bold text-slate-500 font-mono align-top pt-3">1</td>
                <td className="py-3 px-4 space-y-1.5 border-r border-slate-100">
                  <div className="font-bold text-slate-900 text-xs md:text-sm">
                    Merekam Realisasi IKU Organisasi TW III Tahun 2026 pada Aplikasi Satu Kemenkeu dan Intense
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      Satu Kemenkeu
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Intense DJPb
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 align-top pt-3">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-bold font-mono text-xs">Paling lambat 14 Oktober 2026</span>
                  </div>
                </td>
              </tr>

              {/* 2 */}
              <tr className="bg-slate-50/50 hover:bg-blue-50/40 transition-colors">
                <td className="py-3 px-3 text-center font-bold text-slate-500 font-mono align-top pt-3">2</td>
                <td className="py-3 px-4 space-y-1.5 border-r border-slate-100">
                  <div className="font-bold text-slate-900 text-xs md:text-sm">
                    Menyusun dan menyampaikan Laporan Kinerja UPK TW III Tahun 2026 (NKO, LCK, Raw Data, IS, Data Dukung)
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="text-slate-500 font-medium">Komponen:</span>
                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-medium">NKO</span>
                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-medium">LCK</span>
                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-medium">Raw Data</span>
                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-medium">IS</span>
                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-medium">Data Dukung</span>
                  </div>
                </td>
                <td className="py-3 px-4 align-top pt-3">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-bold font-mono text-xs">Paling lambat 14 Oktober 2026</span>
                  </div>
                </td>
              </tr>

              {/* 3 */}
              <tr className="hover:bg-blue-50/40 transition-colors">
                <td className="py-3 px-3 text-center font-bold text-slate-500 font-mono align-top pt-3">3</td>
                <td className="py-3 px-4 border-r border-slate-100">
                  <div className="font-bold text-slate-900 text-xs md:text-sm">Reviu PK</div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Reviu Perjanjian Kinerja Triwulan III Tahun 2026</p>
                </td>
                <td className="py-3 px-4 align-top pt-3">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-bold font-mono text-xs">Paling lambat 16 Oktober 2026</span>
                  </div>
                </td>
              </tr>

              {/* 4 */}
              <tr className="bg-slate-50/50 hover:bg-blue-50/40 transition-colors">
                <td className="py-3 px-3 text-center font-bold text-slate-500 font-mono align-top pt-3">4</td>
                <td className="py-3 px-4 space-y-1 border-r border-slate-100">
                  <div className="font-bold text-slate-900 text-xs md:text-sm">Reviu K3</div>
                  <p className="text-[10px] text-slate-500">Reviu Kerangka Kerja Kinerja</p>
                </td>
                <td className="py-3 px-4 align-top pt-2.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800 border border-slate-300 w-18 text-center shrink-0">
                        Sebelum:
                      </span>
                      <span className="font-bold text-amber-800 font-mono text-xs">
                        Paling lambat 26 Oktober 2026
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 w-18 text-center shrink-0">
                        Sesudah:
                      </span>
                      <span className="font-bold text-amber-800 font-mono text-xs">
                        Paling lambat 21 Oktober 2026
                      </span>
                    </div>
                  </div>
                </td>
              </tr>

              {/* 5 */}
              <tr className="hover:bg-blue-50/40 transition-colors">
                <td className="py-3 px-3 text-center font-bold text-slate-500 font-mono align-top pt-3">5</td>
                <td className="py-3 px-4 border-r border-slate-100">
                  <div className="font-bold text-slate-900 text-xs md:text-sm">Validasi Realisasi IKU Organisasi Triwulan III Tahun 2026</div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Validasi capaian Indikator Kinerja Utama Organisasi</p>
                </td>
                <td className="py-3 px-4 align-top pt-3">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-bold font-mono text-xs">Paling lambat 23 Oktober 2026</span>
                  </div>
                </td>
              </tr>

              {/* 6 */}
              <tr className="bg-slate-50/50 hover:bg-blue-50/40 transition-colors">
                <td className="py-3 px-3 text-center font-bold text-slate-500 font-mono align-top pt-3">6</td>
                <td className="py-3 px-4 border-r border-slate-100">
                  <div className="font-bold text-slate-900 text-xs md:text-sm">Penetapan SKEP NKO</div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Penetapan Surat Keputusan Nilai Kinerja Organisasi</p>
                </td>
                <td className="py-3 px-4 align-top pt-3">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-bold font-mono text-xs">Paling lambat 30 Oktober 2026</span>
                  </div>
                </td>
              </tr>

              {/* 7 */}
              <tr className="hover:bg-blue-50/40 transition-colors">
                <td className="py-3 px-3 text-center font-bold text-slate-500 font-mono align-top pt-3">7</td>
                <td className="py-3 px-4 space-y-1.5 border-r border-slate-100">
                  <div className="font-bold text-slate-900 text-xs md:text-sm">Unggah Dokumen Kinerja (Intense)</div>
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Aplikasi Intense DJPb
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 align-top pt-3">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-bold font-mono text-xs">Paling lambat 30 Oktober 2026</span>
                  </div>
                </td>
              </tr>

              {/* 8 */}
              <tr className="bg-slate-50/50 hover:bg-blue-50/40 transition-colors">
                <td className="py-3 px-3 text-center font-bold text-slate-500 font-mono align-top pt-3">8</td>
                <td className="py-3 px-4 border-r border-slate-100">
                  <div className="font-bold text-slate-900 text-xs md:text-sm">Menyampaikan Langkah-Langkah Peningkatan Kualitas Manajemen Kinerja (LLPKMK)</div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Penyampaian dokumen LLPKMK TW III Tahun 2026 pada Aplikasi Satu Kemenkeu dan Intense DJPb
                  </p>
                </td>
                <td className="py-3 px-4 align-top pt-3">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-bold font-mono text-xs">Paling lambat 30 Oktober 2026</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="bg-blue-50/80 border border-blue-100 rounded-lg p-2.5 text-[10px] text-blue-900 space-y-0.5">
          <p className="font-bold">Catatan Pelaksanaan:</p>
          <p className="leading-tight text-slate-700">
            Seluruh tahapan pelaksanaan manajemen kinerja organisasi Triwulan III Tahun 2026 diharapkan dapat diselesaikan tepat waktu sesuai batas waktu yang telah ditetapkan di atas.
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span className="font-medium text-slate-600">Total 8 Agenda Pelaksanaan Kinerja Organisasi TW III</span>
          <span className="font-mono text-slate-500">1 - 8 / 8</span>
        </div>
      </div>
    </div>
  );
}

export default function WelcomeView({ 
  roomBookings, 
  vehicleBookings, 
  itemBookings = [], 
  galleryItems = [],
  setGalleryItems = () => {},
  onSaveGalleryToFirebase,
  onDeleteGalleryFromFirebase,
  onNavigateToTab, 
  currentUser, 
  isEditMode = false 
}: WelcomeViewProps) {
  // Hero Background Image state saved in localStorage
  const [heroBgImage, setHeroBgImage] = useState<string>(() => {
    return localStorage.getItem('melayu_hero_bg_image') || DEFAULT_KANWIL_IMAGE;
  });

  // Agenda Filter State
  const [agendaFilter, setAgendaFilter] = useState<'all' | 'room' | 'vehicle' | 'item'>('all');

  // Selected Agenda Item for Modal Detail
  const [selectedAgenda, setSelectedAgenda] = useState<{
    type: 'room' | 'vehicle' | 'item';
    title: string;
    subTitle: string;
    booker: string;
    division: string;
    time: string;
    details: string;
  } | null>(null);

  // Realtime clock state
  const [nowTime, setNowTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNowTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for banner update events from User Management
  useEffect(() => {
    const handleBannerChange = () => {
      const savedBanner = localStorage.getItem('melayu_hero_bg_image');
      setHeroBgImage(savedBanner || DEFAULT_KANWIL_IMAGE);
    };
    window.addEventListener('app_banner_updated', handleBannerChange);
    return () => window.removeEventListener('app_banner_updated', handleBannerChange);
  }, []);

  // Active bookings for TODAY only (excluding previous days)
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getTodayStr();

  const isTodayBooking = (dateStr: string, durationDays: number = 1) => {
    if (!dateStr) return false;
    if (dateStr === todayStr) return true;
    if (dateStr < todayStr && durationDays > 1) {
      try {
        const start = new Date(dateStr);
        const end = new Date(start);
        end.setDate(start.getDate() + (durationDays - 1));
        const endStr = end.toISOString().split('T')[0];
        return todayStr >= dateStr && todayStr <= endStr;
      } catch {
        return false;
      }
    }
    return false;
  };

  const approvedRooms = (roomBookings || []).filter(b => b && b.status === 'Disetujui' && isTodayBooking(b.date));
  const approvedVehicles = (vehicleBookings || []).filter(v => v && v.status === 'Disetujui' && isTodayBooking(v.date, v.durationDays));
  const approvedItems = (itemBookings || []).filter(i => i && (i.status === 'Dipinjam' || (i.status as string) === 'Disetujui') && isTodayBooking(i.date));

  const totalTodayAgendas = approvedRooms.length + approvedVehicles.length + approvedItems.length;

  // Quick launch services
  const quickServices = [
    {
      id: 'peminjaman-ruangan',
      title: 'Peminjaman Ruangan & Aula',
      desc: 'Aula Lancang Kuning, Zapin, Soleram & Gurindam',
      icon: Building,
      color: 'bg-blue-50 text-djpb-blue border-blue-200',
      badge: `${roomBookings.filter(r => r.status === 'Disetujui').length} Disetujui`,
      badgeColor: 'bg-green-100 text-green-700'
    },
    {
      id: 'peminjaman-kendaraan',
      title: 'Peminjaman Kendaraan Dinas',
      desc: 'Booking Toyota Innova, Fortuner, Cortez & Driver',
      icon: Car,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      badge: `${vehicleBookings.filter(v => v.status === 'Disetujui').length} Piket Ready`,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      id: 'peminjaman-barang',
      title: 'Peminjaman Barang Bagian Umum',
      desc: 'Proyektor, Sound System, Laptop & Inventaris',
      icon: Package,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badge: 'Stok Tersedia',
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      id: 'feedback-sarpras',
      title: 'Feedback Sarpras & Layanan',
      desc: 'Pelaporan AC, Listrik, Kebersihan & Fasilitas',
      icon: Layers,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      badge: 'Respon Fast 24/7',
      badgeColor: 'bg-purple-100 text-purple-800'
    },
    {
      id: 'informasi-gkm',
      title: 'Informasi GKM & Kepegawaian',
      desc: 'Jadwal Penilaian Kinerja, Evaluasi & SDM',
      icon: User,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      badge: 'Update Terbaru',
      badgeColor: 'bg-indigo-100 text-indigo-800'
    },
    {
      id: 'katalog-hkt',
      title: 'Katalog IKU / Katalog HKT',
      desc: 'Manual HKT, SK Tim, & IKU Kanwil DJPb Provinsi Riau',
      icon: FolderHeart,
      color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      badge: 'Manual & SK Tim',
      badgeColor: 'bg-cyan-100 text-cyan-800'
    },
    {
      id: 'realisasi-lembur',
      title: 'Realisasi Anggaran Lembur',
      desc: 'Matriks Realisasi Golongan & Belanja Lembur TA 2026',
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badge: 'TA 2026',
      badgeColor: 'bg-emerald-100 text-emerald-800'
    }
  ];

  return (
    <div className="p-4 md:p-6 space-y-6" id="welcome-view-main">
      {/* 1. Real-time Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200/80 rounded-xl p-3 px-4 shadow-xs text-xs text-slate-600 gap-2">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="font-semibold text-slate-800">Status Operasional Layanan:</span>
          <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] border border-emerald-200">Normal (Online)</span>
        </div>
        <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-500">
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
          <span>{nowTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span className="font-bold text-slate-800">{nowTime.toLocaleTimeString('id-ID')} WIB</span>
        </div>
      </div>

      {/* 2. Modern & Attractive Hero Card with Melayu Riau Architecture & Custom Admin Upload Image */}
      <div 
        className="relative bg-[#030d20] text-white rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden border border-amber-500/40 min-h-[300px] flex flex-col justify-between"
        id="melayu-welcome-hero"
      >
        {/* Background Custom Uploaded Image or Default Kanwil DJPb Riau Image */}
        {heroBgImage && (
          <img 
            src={heroBgImage} 
            alt="Kanwil DJPb Provinsi Riau Background Header" 
            className="absolute inset-0 w-full h-full object-cover object-right md:object-center z-0 opacity-85 transition-all duration-300"
            referrerPolicy="no-referrer"
          />
        )}

        {/* Ambient Overlay Gradient for High Contrast Readability on Left Side */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#030d22] via-[#08182d]/95 to-[#08182d]/35 z-1 pointer-events-none"></div>

        {/* Hero Content Section */}
        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
          <div className="space-y-4 max-w-3xl">
            {/* Header Badges matching uploaded reference image */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="bg-amber-400 text-slate-950 font-black px-3.5 py-1 rounded-full text-[11px] flex items-center space-x-1.5 shadow-md">
                <Crown className="w-3.5 h-3.5 text-slate-950" />
                <span>Media Layanan Umum • Kanwil DJPb Prov. Riau</span>
              </span>
              <span className="border border-emerald-500/80 bg-emerald-950/60 text-emerald-300 font-mono font-bold px-3 py-1 rounded-full text-[10px] flex items-center space-x-1 backdrop-blur-md shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>SISTEM ONLINE | NORMAL</span>
              </span>
            </div>

            {/* Main Title matching reference image typography */}
            <div>
              <h2 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight text-white leading-tight uppercase drop-shadow-md">
                <span className="block">SELAMAT DATANG DI</span>
                <span className="block">MEDIA LAYANAN UMUM</span>
                <span className="block text-amber-400 drop-shadow-[0_2px_10px_rgba(245,158,11,0.7)]">(MELAYU)</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-100 leading-relaxed max-w-2xl mt-3 font-sans font-medium drop-shadow-xs">
                Portal Layanan Digital Kanwil DJPb Provinsi Riau yang menyediakan informasi Layanan Subbagian TURT, Subbagian Kepegawaian, Subbagian Penilaian Kinerja, Subbagian Keuangan
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Jadwal Manajemen Kinerja Section */}
      <JadwalManajemenKinerjaCard />

      {/* 4. PROMINENT AUTOMATIC SECTION: AGENDA & KEGIATAN HARI INI */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 md:p-6 shadow-sm space-y-5" id="agenda-hari-ini-container">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-100 pb-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl border border-amber-200 shadow-2xs">
                <Clock className="w-5 h-5 text-amber-700 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-display font-black text-slate-800 text-sm md:text-base tracking-wider uppercase">
                    AGENDA & KEGIATAN HARI INI
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    AUTOMATIC SYNC
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Jadwal otomatis kegiatan rapat, peminjaman ruangan, kendaraan dinas, dan inventaris aktif hari ini.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <span className="bg-slate-100 text-slate-700 font-mono text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-djpb-blue" />
              <span>{nowTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </span>

            <button
              onClick={() => onNavigateToTab('peminjaman-ruangan')}
              className="px-3.5 py-1.5 bg-djpb-blue hover:bg-djpb-blue-light text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Buat Agenda Baru</span>
            </button>
          </div>
        </div>

        {/* Filter Pills Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAgendaFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                agendaFilter === 'all' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Semua Agenda</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${agendaFilter === 'all' ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'}`}>
                {totalTodayAgendas}
              </span>
            </button>

            <button
              onClick={() => setAgendaFilter('room')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                agendaFilter === 'room' 
                  ? 'bg-djpb-blue text-white shadow-xs' 
                  : 'bg-blue-50 text-djpb-blue hover:bg-blue-100'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Rapat Ruangan</span>
              <span className="px-1.5 py-0.2 text-[10px] bg-white/20 rounded-full font-mono">
                {approvedRooms.length}
              </span>
            </button>

            <button
              onClick={() => setAgendaFilter('vehicle')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                agendaFilter === 'vehicle' 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Kendaraan Dinas</span>
              <span className="px-1.5 py-0.2 text-[10px] bg-white/20 rounded-full font-mono">
                {approvedVehicles.length}
              </span>
            </button>

            <button
              onClick={() => setAgendaFilter('item')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                agendaFilter === 'item' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Inventaris Barang</span>
              <span className="px-1.5 py-0.2 text-[10px] bg-white/20 rounded-full font-mono">
                {approvedItems.length}
              </span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-medium">
            Status: <span className="text-emerald-600 font-bold">Terverifikasi Penanggung Jawab</span>
          </span>
        </div>

        {/* Agenda Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="agenda-items-list">
          {totalTodayAgendas === 0 ? (
            <div className="col-span-full py-10 text-center text-slate-400 text-xs space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">Belum ada agenda rapat atau peminjaman disetujui untuk hari ini.</p>
              <p className="text-[10px] text-slate-400">Gunakan tombol "+ Buat Agenda Baru" untuk mengajukan ruangan, kendaraan, atau barang.</p>
            </div>
          ) : (
            <>
              {/* ROOM BOOKINGS */}
              {(agendaFilter === 'all' || agendaFilter === 'room') && approvedRooms.map((booking) => (
                <div 
                  key={booking.id} 
                  onClick={() => setSelectedAgenda({
                    type: 'room',
                    title: `Kegiatan: ${booking.roomName}`,
                    subTitle: booking.purpose,
                    booker: booking.bookerName,
                    division: booking.division,
                    time: `${booking.startTime} - ${booking.endTime}`,
                    details: `Peminjaman ruangan ${booking.roomName} oleh ${booking.bookerName} dari ${booking.division} untuk kegiatan "${booking.purpose}".${booking.equipmentNeeded ? ` Perlengkapan/Kebutuhan: ${booking.equipmentNeeded}` : ''}`
                  })}
                  className="p-4 bg-gradient-to-br from-blue-50/80 to-indigo-50/30 hover:from-blue-100/80 hover:to-indigo-100/40 border border-blue-200/80 rounded-2xl space-y-3 transition-all cursor-pointer group hover:shadow-md relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-2 h-full bg-djpb-blue"></div>
                  
                  <div className="flex items-center justify-between text-xs text-djpb-blue font-bold">
                    <span className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-blue-100 shadow-2xs">
                      <Building className="w-3.5 h-3.5 text-djpb-blue" />
                      <span>{booking.roomName}</span>
                    </span>
                    <span className="font-mono text-slate-700 bg-white px-2.5 py-0.5 rounded-lg border border-blue-100 text-[10px] font-bold">
                      {booking.startTime} - {booking.endTime}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-800 group-hover:text-djpb-blue transition-colors line-clamp-2 leading-snug">
                    {booking.purpose}
                  </p>

                  <div className="text-[10px] text-slate-500 pt-2 border-t border-blue-100 flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span className="font-medium">{booking.bookerName} ({booking.division})</span>
                    </span>
                    <span className="text-[10px] text-djpb-blue font-extrabold group-hover:underline flex items-center">
                      Detail &rarr;
                    </span>
                  </div>
                </div>
              ))}

              {/* VEHICLE BOOKINGS */}
              {(agendaFilter === 'all' || agendaFilter === 'vehicle') && approvedVehicles.map((vehicle) => (
                <div 
                  key={vehicle.id} 
                  onClick={() => setSelectedAgenda({
                    type: 'vehicle',
                    title: `Perjalanan Dinas: ${vehicle.vehicleName}`,
                    subTitle: vehicle.destination,
                    booker: vehicle.bookerName,
                    division: 'Penugasan Perjalanan Dinas',
                    time: `${vehicle.startTime || '08:00'} - ${vehicle.endTime || '16:00'} WIB (${vehicle.driverOption || (vehicle.driverName?.includes('Tanpa') ? 'Tanpa Supir' : 'Dengan Supir')})`,
                    details: `Peminjaman kendaraan dinas ${vehicle.vehicleName} (${vehicle.plateNumber}) [${vehicle.driverOption || (vehicle.driverName?.includes('Tanpa') ? 'Tanpa Supir' : 'Dengan Supir')}]. Jam Operasional: ${vehicle.startTime || '08:00'} - ${vehicle.endTime || '16:00'} WIB. Tujuan perjalanan: ${vehicle.destination}.`
                  })}
                  className="p-4 bg-gradient-to-br from-amber-50/80 to-orange-50/30 hover:from-amber-100/80 hover:to-orange-100/40 border border-amber-200/80 rounded-2xl space-y-3 transition-all cursor-pointer group hover:shadow-md relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-2 h-full bg-amber-500"></div>

                  <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
                    <span className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-amber-100 shadow-2xs">
                      <Car className="w-3.5 h-3.5 text-amber-700" />
                      <span>{vehicle.vehicleName}</span>
                    </span>
                    <span className="font-mono text-slate-700 bg-white px-2.5 py-0.5 rounded-lg border border-amber-100 text-[10px] font-bold">
                      {vehicle.driverOption || (vehicle.driverName?.includes('Tanpa') ? 'Tanpa Supir' : 'Dengan Supir')}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800 group-hover:text-amber-900 transition-colors line-clamp-2 leading-snug">
                      Tujuan: {vehicle.destination}
                    </p>
                    <div className="text-[10px] text-amber-800 font-mono flex items-center space-x-1 font-semibold">
                      <Clock className="w-3 h-3 text-amber-700" />
                      <span>{vehicle.startTime || '08:00'} - {vehicle.endTime || '16:00'} WIB</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 pt-2 border-t border-amber-100 flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span className="font-medium">Pemohon: {vehicle.bookerName}</span>
                    </span>
                    <span className="text-[10px] text-amber-800 font-extrabold group-hover:underline flex items-center">
                      Detail &rarr;
                    </span>
                  </div>
                </div>
              ))}

              {/* ITEM BOOKINGS */}
              {(agendaFilter === 'all' || agendaFilter === 'item') && approvedItems.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedAgenda({
                    type: 'item',
                    title: `Inventaris: ${item.itemName}`,
                    subTitle: `Jumlah: ${item.quantity} Unit`,
                    booker: item.bookerName,
                    division: item.division,
                    time: `Status: ${item.status}`,
                    details: `Peminjaman barang inventaris Bagian Umum: ${item.itemName} (${item.quantity} unit) oleh ${item.bookerName} (${item.division}). ${item.statusNote ? 'Catatan: ' + item.statusNote : ''}`
                  })}
                  className="p-4 bg-gradient-to-br from-emerald-50/80 to-teal-50/30 hover:from-emerald-100/80 hover:to-teal-100/40 border border-emerald-200/80 rounded-2xl space-y-3 transition-all cursor-pointer group hover:shadow-md relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>

                  <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
                    <span className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-emerald-100 shadow-2xs">
                      <Package className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{item.itemName}</span>
                    </span>
                    <span className="font-mono text-emerald-800 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-100 text-[10px] font-bold">
                      {item.quantity} Unit
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 transition-colors line-clamp-2 leading-snug">
                    {item.statusNote || 'Dipinjam untuk kegiatan operasional'}
                  </p>

                  <div className="text-[10px] text-slate-500 pt-2 border-t border-emerald-100 flex items-center justify-between">
                    <span className="flex items-center space-x-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span className="font-medium">{item.bookerName} ({item.division})</span>
                    </span>
                    <span className="text-[10px] text-emerald-800 font-extrabold group-hover:underline flex items-center">
                      Detail &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* 5. PROMINENT SECTION: GALERI KEGIATAN (FOTO, VIDEO & NARASI KEGIATAN) */}
      <ActivityGallerySection
        galleryItems={galleryItems}
        setGalleryItems={setGalleryItems}
        onSaveToFirebase={onSaveGalleryToFirebase}
        onDeleteFromFirebase={onDeleteGalleryFromFirebase}
        currentUser={currentUser}
        isEditMode={isEditMode}
      />

      {/* Agenda Detail Modal */}
      {selectedAgenda && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="agenda-detail-modal">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 relative">
            <button 
              onClick={() => setSelectedAgenda(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className={`p-2.5 rounded-xl ${
                selectedAgenda.type === 'room' 
                  ? 'bg-blue-50 text-djpb-blue' 
                  : selectedAgenda.type === 'vehicle' 
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}>
                {selectedAgenda.type === 'room' && <Building className="w-5 h-5" />}
                {selectedAgenda.type === 'vehicle' && <Car className="w-5 h-5" />}
                {selectedAgenda.type === 'item' && <Package className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-display font-bold text-slate-800 text-sm">{selectedAgenda.title}</h4>
                <p className="text-[10px] text-slate-500 font-mono font-medium">{selectedAgenda.time}</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-2">
              <p className="font-medium leading-relaxed">{selectedAgenda.details}</p>
              <div className="border-t border-slate-200/60 pt-2 flex items-center justify-between text-[11px] text-slate-500 font-sans">
                <span>Pemohon: <strong className="text-slate-800">{selectedAgenda.booker}</strong></span>
                <span>Unit: <strong className="text-slate-800">{selectedAgenda.division}</strong></span>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setSelectedAgenda(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  let targetTab = 'peminjaman-ruangan';
                  if (selectedAgenda.type === 'vehicle') targetTab = 'peminjaman-kendaraan';
                  if (selectedAgenda.type === 'item') targetTab = 'peminjaman-barang';
                  setSelectedAgenda(null);
                  onNavigateToTab(targetTab);
                }}
                className="px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Buka Menu Pengelolaan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Real-time Timestamp Footer */}
      <div 
        className="text-[10px] text-slate-400 flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 pt-4"
        id="looker-studio-footer"
      >
        <span>Data Terakhir Diperbarui: {nowTime.toLocaleDateString('id-ID')} {nowTime.toLocaleTimeString('id-ID')}</span>
        <div className="flex items-center space-x-2 mt-1 sm:mt-0">
          <a href="#" className="hover:underline">Kebijakan Privasi Kemenkeu</a>
          <span>|</span>
          <span>Kanwil DJPb Provinsi Riau © 2026</span>
        </div>
      </div>
    </div>
  );
}

