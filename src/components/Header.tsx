import React, { useState } from 'react';
import { RotateCcw, Share2, Edit3, MoreVertical, Check, Copy, ExternalLink, LogOut, Shield, Bell, Sparkles, PanelLeft, Building2 } from 'lucide-react';
import { CurrentUser } from '../types';
import KemenkeuLogo from './KemenkeuLogo';

interface HeaderProps {
  onReset: () => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  currentUser: CurrentUser;
  onLogout: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export default function Header({ 
  onReset, 
  isEditMode, 
  onToggleEditMode, 
  currentUser, 
  onLogout,
  onToggleSidebar,
  isSidebarCollapsed
}: HeaderProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [copied, setCopied] = useState(false);

  const notifications = [
    { id: 'n0', title: '🔒 Pengingat Keamanan Sesi', time: 'Sekarang', type: 'security', desc: `Halo ${currentUser.fullName}, jangan lupa selalu klik tombol Logout saat selesai bekerja terutama di PC bersama.` },
    { id: 'n1', title: 'Permohonan Aula Lancang Kuning', time: '10m lalu', type: 'room', desc: 'Permohonan dari Bidang PPA I menunggu persetujuan.' },
    { id: 'n2', title: 'Kendaraan Dinas Toyota Fortuner', time: '45m lalu', type: 'vehicle', desc: 'Peminjaman disetujui untuk perjalanan dinas.' },
    { id: 'n3', title: 'Aduan AC Ruang Melati', time: '2j lalu', type: 'feedback', desc: 'Status diperbarui menjadi Dalam Penanganan.' }
  ];

  const shareUrl = window.location.href;

  const handleToggleEdit = () => {
    if (currentUser.role !== 'admin') {
      setShowAccessDenied(true);
      return;
    }
    onToggleEditMode();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-6 sticky top-0 z-40 shadow-xs" id="app-header">
      {/* Left side: Sidebar Toggle, Logo & Title */}
      <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1 mr-2">
        {onToggleSidebar && (
          <button
            id="btn-sidebar-toggle-header"
            onClick={onToggleSidebar}
            className="p-1.5 text-slate-600 hover:text-djpb-blue hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
            title={isSidebarCollapsed ? "Tampilkan Sidebar" : "Sembunyikan Sidebar"}
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center space-x-2 shrink-0" id="header-logo-container">
          <KemenkeuLogo className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-xs shrink-0" />
        </div>
        <h1 className="font-display font-semibold text-xs sm:text-sm md:text-base tracking-tight text-slate-800 truncate" id="header-title">
          DASHBOARD MEDIA LAYANAN UMUM (MELAYU)
        </h1>
      </div>

      {/* Right side Actions */}
      <div className="flex items-center space-x-1 sm:space-x-2 shrink-0" id="header-actions">
        {/* Notifications Bell */}
        <div className="relative">
          <button
            id="btn-notifications-toggle"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 text-slate-500 hover:text-djpb-blue hover:bg-slate-50 rounded-lg transition-colors relative cursor-pointer"
            title="Notifikasi Sistem"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white animate-pulse"></span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3 space-y-2 animate-in fade-in zoom-in-95 duration-150" id="notifications-popover">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 font-display flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-djpb-gold" />
                  <span>Notifikasi Layanan</span>
                </span>
                <span className="text-[10px] font-semibold text-djpb-blue bg-blue-50 px-2 py-0.5 rounded-full">3 Baru</span>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2 bg-slate-50 hover:bg-slate-100/80 rounded-lg transition-colors text-left text-xs cursor-pointer">
                    <div className="flex items-center justify-between font-semibold text-slate-800 text-[11px]">
                      <span>{n.title}</span>
                      <span className="text-[9px] text-slate-400 font-normal">{n.time}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{n.desc}</p>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setShowNotifications(false)}
                className="w-full text-center text-[10px] font-semibold text-djpb-blue hover:underline pt-1 block"
              >
                Tutup Notifikasi
              </button>
            </div>
          )}
        </div>

        {/* User Profile Info & Logout */}
        <div className="flex items-center space-x-2 border-r border-slate-200 pr-3 mr-1" id="user-profile-badge">
          <div className={`p-1.5 rounded-full ${
            currentUser.role === 'admin' 
              ? 'bg-amber-100 text-amber-700' 
              : currentUser.role === 'kppn'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-blue-100 text-djpb-blue'
          }`} title={`Masuk sebagai ${currentUser.role === 'admin' ? 'Administrator' : currentUser.role === 'kppn' ? 'KPPN' : 'KANWIL'}`}>
            {currentUser.role === 'admin' ? (
              <Shield className="w-4 h-4" />
            ) : currentUser.role === 'kppn' ? (
              <Building2 className="w-4 h-4" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            )}
          </div>
          <div className="hidden md:flex flex-col text-left select-none">
            <span className="text-xs font-bold text-slate-700 leading-none truncate max-w-[120px]">{currentUser.fullName}</span>
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              {currentUser.role === 'admin' ? 'Administrator' : currentUser.role === 'kppn' ? 'Mitra KPPN' : 'KANWIL'}
            </span>
          </div>
          <button
            id="btn-logout-header"
            onClick={onLogout}
            className="flex items-center space-x-1 px-2 py-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-all cursor-pointer ml-1"
            title="Keluar dari Aplikasi (Logout)"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px] font-semibold">Logout</span>
          </button>
        </div>

        {/* Reset Button */}
        <button
          id="btn-reset-data"
          onClick={onReset}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          title="Reset semua data ke pengaturan awal"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        {/* Share Button */}
        <button
          id="btn-share-dashboard"
          onClick={() => setShowShareModal(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Bagikan</span>
        </button>

        {/* Edit Button */}
        <button
          id="btn-toggle-edit"
          onClick={handleToggleEdit}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            isEditMode
              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
              : 'bg-djpb-blue hover:bg-djpb-blue-light text-white shadow-xs'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{isEditMode ? 'Selesai Edit' : 'Edit'}</span>
        </button>

        {/* Options */}
        <button 
          id="btn-header-more"
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Share Modal Dialog */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="share-modal-overlay">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150" id="share-modal-content">
            <h3 className="text-lg font-display font-semibold text-slate-800 mb-2">
              Bagikan Dashboard Integrasi
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Salin tautan di bawah ini untuk membagikan tampilan dashboard ini kepada rekan kerja atau satuan kerja lainnya.
            </p>

            <div className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-6">
              <span className="text-xs text-slate-600 font-mono truncate flex-1">
                {shareUrl}
              </span>
              <button
                id="btn-copy-share"
                onClick={handleCopyLink}
                className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-600 transition-colors cursor-pointer"
                title="Salin Tautan"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                id="btn-close-share"
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <a
                id="link-open-new-tab"
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
              >
                <span>Buka di Tab Baru</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Access Denied Modal Dialog */}
      {showAccessDenied && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="access-denied-modal-overlay">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150 text-center" id="access-denied-modal-content">
            <div className="mx-auto w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6" />
            </div>
            
            <h3 className="text-base font-display font-bold text-slate-800 mb-1">
              Akses Khusus Administrator
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Anda saat ini login sebagai <strong className="text-slate-700">{currentUser.fullName}</strong> dengan hak akses <strong className="text-djpb-blue uppercase">{currentUser.role}</strong>. Mode Edit hanya dapat diakses oleh akun Administrator.
            </p>

            <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-2">
              <button
                id="btn-close-access-denied"
                onClick={() => setShowAccessDenied(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Tetap Sebagai Pegawai
              </button>
              <button
                id="btn-switch-to-admin"
                onClick={() => {
                  setShowAccessDenied(false);
                  onLogout();
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Ganti Akun Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
