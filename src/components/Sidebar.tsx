import React, { useState } from 'react';
import {
  Calendar, Package, Car, MessageSquare, Calculator,
  BookOpen, Search, GraduationCap, Layers, BarChart2,
  Users, Clock, FolderHeart, ThumbsUp, TrendingUp, Shield,
  ShoppingCart, LayoutDashboard, Menu, X, ChevronRight, ChevronLeft,
  MoreVertical, CalendarCheck, UserPlus, Home, PanelLeftClose, PanelLeftOpen, PhoneCall, UserCheck, FileText, LogOut,
  CalendarClock, DollarSign, UploadCloud, FileSpreadsheet, Share2
} from 'lucide-react';
import { CurrentUser } from '../types';
import KemenkeuLogo from './KemenkeuLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  currentUser: CurrentUser;
  onLogout?: () => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  currentUser,
  onLogout,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const collapsed = isCollapsed !== undefined ? isCollapsed : internalCollapsed;
  const setCollapsed = (val: boolean) => {
    if (setIsCollapsed) setIsCollapsed(val);
    else setInternalCollapsed(val);
  };

  const mobileOpen = isMobileOpen !== undefined ? isMobileOpen : internalMobileOpen;
  const setMobileOpen = (val: boolean) => {
    if (setIsMobileOpen) setIsMobileOpen(val);
    else setInternalMobileOpen(val);
  };

  // Dynamic menu sections based on role
  const sections: MenuSection[] = currentUser?.role === 'kppn' ? [
    {
      title: 'SUBBAGIAN KEPEGAWAIAN',
      items: [
        { id: 'cek-seribu', label: 'Cek Seribu', icon: Search },
      ]
    },
    {
      title: 'SUBBAGIAN PENILAIAN KINERJA',
      items: [
        { id: 'monitoring-kinerja', label: 'Monitoring Kinerja', icon: BarChart2 },
        { id: 'monitoring-abk', label: 'Monitoring ABK', icon: Users },
        { id: 'monitoring-dams', label: 'Monitoring DAMS', icon: Clock },
      ]
    },
    {
      title: 'INFORMASI',
      items: [
        { id: 'monitoring-ea', label: 'Monitoring Pengisian Employee Advocacy', icon: Share2 },
        { id: 'logout', label: 'Logout / Keluar KPPN', icon: LogOut },
      ]
    }
  ] : currentUser?.role === 'user' ? [
    {
      title: 'SUBBAGIAN TURT',
      items: [
        { id: 'peminjaman-ruangan', label: 'Peminjaman Ruangan', icon: Home },
        { id: 'peminjaman-barang', label: 'Peminjaman Barang Bagian Umum', icon: Package },
        { id: 'peminjaman-kendaraan', label: 'Peminjaman Kendaraan Dinas', icon: Car },
        { id: 'feedback-sarpras', label: 'Feedback Sarana Prasarana', icon: Layers },
        { id: 'rencana-kebutuhan', label: 'Permintaan Barang Persediaan', icon: CalendarCheck },
      ]
    },
    {
      title: 'SUBBAGIAN KEPEGAWAIAN',
      items: [
        { id: 'informasi-gkm', label: 'Informasi GKM', icon: UserPlus },
        { id: 'cek-seribu', label: 'Cek Seribu', icon: Search },
        { id: 'informasi-beasiswa', label: 'Informasi Beasiswa', icon: GraduationCap },
        { id: 't-lego', label: 'T-LEGO', icon: Layers },
      ]
    },
    {
      title: 'SUBBAGIAN PENILAIAN KINERJA',
      items: [
        { id: 'monitoring-kinerja', label: 'Monitoring Kinerja', icon: BarChart2 },
        { id: 'monitoring-abk', label: 'Monitoring ABK', icon: Users },
        { id: 'monitoring-dams', label: 'Monitoring DAMS', icon: Clock },
        { id: 'katalog-hkt', label: 'Katalog IKU / Katalog HKT', icon: FolderHeart },
        { id: 'feedback-kinerja', label: 'Feedback Layanan Kinerja', icon: ThumbsUp },
      ]
    },
    {
      title: 'SUBBAGIAN KEUANGAN',
      items: [
        { id: 'rencana-lembur', label: 'Rencana Lembur Tahun 2026', icon: CalendarClock },
        { id: 'realisasi-lembur', label: 'Realisasi Anggaran Lembur', icon: DollarSign },
        { id: 'alokasi-lembur-bidang', label: 'Alokasi Anggaran Lembur Per Bidang/Bagian TA 2026', icon: Layers },
        { id: 'realisasi-lembur-bidang', label: 'Realisasi Lembur Per Bidang (Bulan & Triwulan)', icon: Calendar },
      ]
    },
    {
      title: 'INFORMASI',
      items: [
        { id: 'monitoring-ea', label: 'Monitoring Pengisian Employee Advocacy', icon: Share2 },
        { id: 'pengawasan-penjagaan', label: 'Pengawasan Penjagaan Keamanan', icon: Shield },
        { id: 'rencana-pengadaan', label: 'Rencana Pengadaan Barang', icon: ShoppingCart },
        { id: 'logout', label: 'Logout / Keluar Pegawai', icon: LogOut },
      ]
    }
  ] : [
    {
      title: 'SUBBAGIAN TURT',
      items: [
        { id: 'peminjaman-ruangan', label: 'Peminjaman Ruangan', icon: Home },
        { id: 'peminjaman-barang', label: 'Peminjaman Barang Bagian Umum', icon: Package },
        { id: 'peminjaman-kendaraan', label: 'Peminjaman Kendaraan Dinas', icon: Car },
        { id: 'feedback-sarpras', label: 'Feedback Sarana Prasarana', icon: Layers },
        { id: 'rencana-kebutuhan', label: 'Permintaan Barang Persediaan', icon: CalendarCheck },
      ]
    },
    {
      title: 'SUBBAGIAN KEPEGAWAIAN',
      items: [
        { id: 'informasi-gkm', label: 'Informasi GKM', icon: UserPlus },
        { id: 'cek-seribu', label: 'Cek Seribu', icon: Search },
        { id: 'informasi-beasiswa', label: 'Informasi Beasiswa', icon: GraduationCap },
        { id: 't-lego', label: 'T-LEGO', icon: Layers },
      ]
    },
    {
      title: 'SUBBAGIAN PENILAIAN KINERJA',
      items: [
        { id: 'monitoring-kinerja', label: 'Monitoring Kinerja', icon: BarChart2 },
        { id: 'monitoring-abk', label: 'Monitoring ABK', icon: Users },
        { id: 'monitoring-dams', label: 'Monitoring DAMS', icon: Clock },
        { id: 'katalog-hkt', label: 'Katalog IKU / Katalog HKT', icon: FolderHeart },
        { id: 'feedback-kinerja', label: 'Feedback Layanan Kinerja', icon: ThumbsUp },
      ]
    },
    {
      title: 'SUBBAGIAN KEUANGAN',
      items: [
        { id: 'rencana-lembur', label: 'Rencana Lembur Tahun 2026', icon: CalendarClock },
        { id: 'realisasi-lembur', label: 'Realisasi Anggaran Lembur', icon: DollarSign },
        { id: 'alokasi-lembur-bidang', label: 'Alokasi Anggaran Lembur Per Bidang/Bagian TA 2026', icon: Layers },
        { id: 'realisasi-lembur-bidang', label: 'Realisasi Lembur Per Bidang (Bulan & Triwulan)', icon: Calendar },
      ]
    },
    {
      title: 'INFORMASI',
      items: [
        { id: 'monitoring-ea', label: 'Monitoring Pengisian Employee Advocacy', icon: Share2 },
        { id: 'pengawasan-penjagaan', label: 'Pengawasan Penjagaan Keamanan', icon: Shield },
        { id: 'rencana-pengadaan', label: 'Rencana Pengadaan Barang', icon: ShoppingCart },
      ]
    },
    {
      title: 'LAPORAN TURT',
      items: [
        { id: 'laporan-turt', label: 'Laporan TURT', icon: FileSpreadsheet },
      ]
    },
    {
      title: 'PENGELOLAAN AKSES ADMIN',
      items: [
        { id: 'manajemen-user', label: 'Manajemen User & Hak Akses', icon: UserCheck },
        { id: 'logout', label: 'Logout / Keluar Admin', icon: LogOut },
      ]
    }
  ];

  // Filter items based on search term
  const filteredSections = sections.map(section => {
    const items = section.items.filter(item =>
      item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return { ...section, items };
  }).filter(section => section.items.length > 0);

  const handleItemClick = (id: string) => {
    if (id === 'logout') {
      if (onLogout) {
        onLogout();
      }
    } else {
      setActiveTab(id);
    }
    setMobileOpen(false);
  };

  const renderNavList = (isMobileDrawer = false) => {
    const isWelcomeSelected = activeTab === 'selamat-datang';
    const isMini = collapsed && !isMobileDrawer;

    return (
      <div className={`flex flex-col h-full bg-slate-50 text-slate-700 select-none overflow-y-auto ${isMini ? 'p-2 space-y-3' : 'p-4'}`} id="sidebar-nav-container">
        
        {/* Header Toggle inside Sidebar Desktop */}
        {!isMobileDrawer && (
          <div className={`flex items-center justify-between pb-3 border-b border-slate-200 ${isMini ? 'flex-col space-y-2 pb-2' : 'mb-3'}`}>
            {!isMini && (
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-display">
                MENU UTAMA
              </span>
            )}
            <button
              id="btn-sidebar-collapse-desktop"
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 text-slate-500 hover:text-djpb-blue hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer flex items-center justify-center"
              title={collapsed ? "Tampilkan Sidebar Lengkap" : "Sembunyikan Sidebar"}
            >
              {collapsed ? <ChevronRight className="w-5 h-5 text-djpb-blue" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>
        )}

        {/* Mobile Drawer Header */}
        {isMobileDrawer && (
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <div className="flex items-center space-x-2.5">
              <KemenkeuLogo className="w-6 h-6 shrink-0" />
              <span className="font-display font-bold text-slate-800 text-xs sm:text-sm">Navigasi MELAYU</span>
            </div>
            <button
              id="btn-close-mobile-drawer"
              onClick={() => setMobileOpen(false)}
              className="p-1.5 text-slate-500 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Search Input */}
        <div className={isMini ? 'mb-1 flex justify-center' : 'mb-4'} id="sidebar-search-box">
          {isMini ? (
            <button
              onClick={() => setCollapsed(false)}
              className="p-2 bg-white border border-slate-200 hover:border-djpb-blue rounded-xl text-slate-500 hover:text-djpb-blue transition-colors cursor-pointer shadow-xs"
              title="Cari Layanan (Klik untuk membuka)"
            >
              <Search className="h-4 w-4" />
            </button>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                id="sidebar-search-input"
                type="text"
                placeholder="Cari Layanan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-djpb-blue/10 focus:border-djpb-blue transition-all shadow-xs"
              />
            </div>
          )}
        </div>

        {/* Dashboard Melayu (Selamat Datang) Card - Hidden for KPPN */}
        {currentUser?.role !== 'kppn' && (
          <div className={isMini ? 'mb-2 flex justify-center' : 'mb-4'} id="sidebar-welcome-button-container">
            <button
              id="btn-nav-selamat-datang"
              onClick={() => handleItemClick('selamat-datang')}
              title="DASHBOARD MELAYU"
              className={`transition-all cursor-pointer ${
                isMini
                  ? `p-2.5 rounded-xl border flex items-center justify-center ${
                      isWelcomeSelected
                        ? 'bg-djpb-blue text-white border-djpb-blue shadow-md'
                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
                    }`
                  : `w-full flex items-center justify-between p-3.5 rounded-xl border ${
                      isWelcomeSelected
                        ? 'bg-white border-djpb-blue text-djpb-blue ring-3 ring-djpb-blue/5 shadow-md font-bold'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
                    }`
              }`}
            >
              {isMini ? (
                <LayoutDashboard className={`w-5 h-5 ${isWelcomeSelected ? 'text-white' : 'text-slate-700'}`} />
              ) : (
                <>
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <LayoutDashboard className={`w-5 h-5 shrink-0 ${isWelcomeSelected ? 'text-djpb-blue' : 'text-slate-700'}`} />
                    <span className="text-xs font-bold uppercase tracking-wider font-sans truncate">
                      DASHBOARD MELAYU
                    </span>
                  </div>
                  <MoreVertical className="w-4 h-4 text-slate-400 shrink-0" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Sections List */}
        <nav className="space-y-6 flex-1" id="sidebar-nav-list">
          {filteredSections.map((section, sIdx) => (
            <div key={sIdx} className={isMini ? 'space-y-2' : 'space-y-3'} id={`sidebar-section-${sIdx}`}>
              {/* Section Header */}
              {isMini ? (
                <div className="w-full h-px bg-slate-200 my-2" title={section.title}></div>
              ) : (
                <h3 className="text-center font-black text-slate-800 text-[10.5px] uppercase tracking-wider font-sans">
                  {section.title}
                </h3>
              )}

              <div className={isMini ? 'space-y-1.5 flex flex-col items-center' : 'space-y-2.5'}>
                {section.items.map((item) => {
                  const IconComponent = item.icon;
                  const isSelected = activeTab === item.id;
                  const isLogout = item.id === 'logout';

                  if (isMini) {
                    return (
                      <button
                        key={item.id}
                        id={`btn-nav-item-${item.id}`}
                        onClick={() => handleItemClick(item.id)}
                        title={`${section.title}: ${item.label}`}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer relative ${
                          isLogout
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200 shadow-xs'
                            : isSelected
                            ? 'bg-djpb-blue text-white border-djpb-blue shadow-md'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
                        }`}
                      >
                        <IconComponent className={`w-5 h-5 ${isLogout ? 'text-rose-600' : isSelected ? 'text-white' : 'text-slate-700'}`} />
                      </button>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      id={`btn-nav-item-${item.id}`}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isLogout
                          ? 'bg-rose-50 hover:bg-rose-100/80 border-rose-200 text-rose-700 font-bold shadow-xs'
                          : isSelected
                          ? 'bg-white border-djpb-blue text-djpb-blue ring-3 ring-djpb-blue/5 shadow-md font-bold'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <IconComponent className={`w-5 h-5 shrink-0 ${isLogout ? 'text-rose-600' : isSelected ? 'text-djpb-blue' : 'text-slate-700'}`} />
                        <span className="text-xs font-bold tracking-tight font-sans text-left truncate leading-tight">
                          {item.label}
                        </span>
                      </div>
                      <MoreVertical className={`w-4 h-4 shrink-0 ${isLogout ? 'text-rose-400' : 'text-slate-400'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredSections.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-xl shadow-xs" id="sidebar-empty-state">
              {isMini ? '?' : 'Tidak menemukan layanan'}
            </div>
          )}
        </nav>

        {/* Footer Branding */}
        <div className={`mt-6 pt-3 border-t border-slate-200 text-[10px] text-slate-400 font-mono text-center shrink-0 ${isMini ? 'px-0 text-[8px]' : ''}`} id="sidebar-footer">
          {isMini ? 'MELAYU' : `MELAYU App v1.0.0 • ${currentUser.fullName}`}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile Header Toggle Bar */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-xs sticky top-14 z-30" id="mobile-sidebar-toggle-bar">
        <button
          id="btn-mobile-menu"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors cursor-pointer flex items-center space-x-1.5 border border-slate-200"
        >
          {mobileOpen ? <X className="w-5 h-5 text-red-500" /> : <Menu className="w-5 h-5 text-djpb-blue" />}
          <span className="text-xs font-bold">Menu</span>
        </button>
        
        <span className="text-xs font-bold text-slate-800 font-sans tracking-tight truncate max-w-[180px]">
          {sections.flatMap(s => s.items).find(i => i.id === activeTab)?.label || 'DASHBOARD MELAYU'}
        </span>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 text-slate-500 hover:text-djpb-blue rounded-lg text-xs font-semibold"
          title="Toggle Tampilan Sidebar Desktop"
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Desktop Sidebar (Hideable / Collapsible) */}
      <aside 
        className={`hidden md:block border-r border-slate-200 bg-slate-50 shrink-0 h-[calc(100dvh-3.5rem)] sticky top-14 overflow-y-auto transition-all duration-300 ease-in-out ${
          collapsed ? 'w-16' : 'w-72'
        }`} 
        id="desktop-sidebar"
      >
        {renderNavList(false)}
      </aside>

      {/* Mobile Sidebar Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" id="mobile-sidebar-drawer-overlay">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" 
            onClick={() => setMobileOpen(false)}
          ></div>
          <aside className="relative w-80 max-w-[85vw] bg-slate-50 h-[100dvh] shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200 pt-safe pb-safe" id="mobile-sidebar-drawer">
            {renderNavList(true)}
          </aside>
        </div>
      )}
    </>
  );
}
