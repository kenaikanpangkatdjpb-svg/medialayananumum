import React, { useState } from 'react';
import { Search, Plus, UserPlus, Edit3, X, Check, ShieldAlert, UserCheck, Key, Shield, Trash2, Lock, Upload, Image as ImageIcon, RotateCcw, CheckCircle2, Building, Building2, Sparkles, FileImage, Camera, Crown } from 'lucide-react';
import { UserAccount, CurrentUser } from '../types';
import KemenkeuLogo from './KemenkeuLogo';
import { saveUserToFirestore, deleteUserFromFirestore, saveAppSettingsToFirestore } from '../lib/firebase';
import { compressImage, safeLocalStorageSet } from '../lib/storage';

const DEFAULT_KANWIL_IMAGE = 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1600&q=80';

interface UserManagementSectionProps {
  users: UserAccount[];
  setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  isEditMode: boolean;
  currentUser: CurrentUser;
}

export default function UserManagementSection({
  users,
  setUsers,
  isEditMode,
  currentUser
}: UserManagementSectionProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'logo' | 'banner'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('Semua Role');
  const [statusFilter, setStatusFilter] = useState<string>('Semua Status');

  // Logo Upload State
  const [previewLogo, setPreviewLogo] = useState<string | null>(() => localStorage.getItem('app_custom_logo'));
  const [logoSaveStatus, setLogoSaveStatus] = useState<string | null>(null);

  // Banner Upload State
  const [previewBanner, setPreviewBanner] = useState<string>(
    () => localStorage.getItem('melayu_hero_bg_image') || DEFAULT_KANWIL_IMAGE
  );
  const [bannerSaveStatus, setBannerSaveStatus] = useState<string | null>(null);
  const [bannerUrlInput, setBannerUrlInput] = useState<string>('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserAccount | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<UserAccount, 'id'>>({
    employeeId: '',
    fullName: '',
    username: '',
    password: '',
    role: 'KANWIL',
    status: 'Aktif'
  });

  // Handle Logo Upload File Selection
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 400, 400, 0.85);
        setPreviewLogo(compressed);
      } catch (err) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewLogo(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSaveLogo = () => {
    if (previewLogo) {
      safeLocalStorageSet('app_custom_logo', previewLogo);
      saveAppSettingsToFirestore({ logoUrl: previewLogo });
    } else {
      localStorage.removeItem('app_custom_logo');
      saveAppSettingsToFirestore({ logoUrl: null });
    }
    window.dispatchEvent(new Event('app_logo_updated'));
    setLogoSaveStatus('Logo instansi berhasil diperbarui dan disinkronkan ke seluruh perangkat (PC & HP)!');
    setTimeout(() => setLogoSaveStatus(null), 4500);
  };

  const handleResetLogo = () => {
    setPreviewLogo(null);
    localStorage.removeItem('app_custom_logo');
    saveAppSettingsToFirestore({ logoUrl: null });
    window.dispatchEvent(new Event('app_logo_updated'));
    setLogoSaveStatus('Logo berhasil dikembalikan ke standar Logo Kementerian Keuangan RI.');
    setTimeout(() => setLogoSaveStatus(null), 4500);
  };

  // Handle Banner Upload File Selection
  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 1600, 700, 0.75);
        setPreviewBanner(compressed);
      } catch (err) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            setPreviewBanner(reader.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleApplyBannerUrl = () => {
    if (bannerUrlInput.trim()) {
      setPreviewBanner(bannerUrlInput.trim());
      setBannerUrlInput('');
    }
  };

  const handleSaveBanner = () => {
    if (previewBanner) {
      safeLocalStorageSet('melayu_hero_bg_image', previewBanner);
      saveAppSettingsToFirestore({ bannerUrl: previewBanner });
      window.dispatchEvent(new Event('app_banner_updated'));
      setBannerSaveStatus('Gambar banner header berhasil disimpan & disinkronkan ke seluruh sistem!');
      setTimeout(() => setBannerSaveStatus(null), 4500);
    }
  };

  const handleResetBanner = () => {
    setPreviewBanner(DEFAULT_KANWIL_IMAGE);
    localStorage.removeItem('melayu_hero_bg_image');
    saveAppSettingsToFirestore({ bannerUrl: DEFAULT_KANWIL_IMAGE });
    window.dispatchEvent(new Event('app_banner_updated'));
    setBannerSaveStatus('Gambar banner berhasil dikembalikan ke tampilan default Kanwil DJPb Riau.');
    setTimeout(() => setBannerSaveStatus(null), 4500);
  };

  // Filter users based on search, role, status
  const filteredUsers = (users || []).filter(user => {
    if (!user) return false;
    const fullName = user.fullName || '';
    const username = user.username || '';
    const employeeId = user.employeeId || '';
    
    const matchesSearch = 
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employeeId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'Semua Role' || user.role === roleFilter || (roleFilter === 'KANWIL' && user.role === 'Pegawai');
    const matchesStatus = statusFilter === 'Semua Status' || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleOpenAddModal = () => {
    // Auto generate ID
    const nextNum = users.length + 1;
    const nextId = `KANWIL-${String(nextNum).padStart(3, '0')}`;

    setEditingUser(null);
    setFormData({
      employeeId: nextId,
      fullName: '',
      username: '',
      password: 'user123',
      role: 'KANWIL',
      status: 'Aktif'
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (user: UserAccount) => {
    setEditingUser(user);
    setFormData({
      employeeId: user.employeeId,
      fullName: user.fullName,
      username: user.username,
      password: user.password || '••••••',
      role: user.role === 'Pegawai' ? 'KANWIL' : user.role,
      status: user.status
    });
    setShowModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.username.trim() || !formData.employeeId.trim()) {
      alert('Mohon lengkapi ID Pegawai, Nama Pegawai, dan Username.');
      return;
    }

    if (editingUser) {
      // Update existing
      const updated = { ...formData, id: editingUser.id };
      setUsers(users.map(u => u.id === editingUser.id ? updated : u));
      saveUserToFirestore(updated).catch(err => console.error('Error saving user to Firestore:', err));
    } else {
      // Create new
      const newUser: UserAccount = {
        id: formData.employeeId,
        ...formData
      };
      setUsers([...users, newUser]);
      saveUserToFirestore(newUser).catch(err => console.error('Error saving new user to Firestore:', err));
    }

    setShowModal(false);
  };

  const handleOpenDeleteUser = (user: UserAccount) => {
    setDeleteError(null);
    setDeletingUser(user);
  };

  const handleConfirmDeleteUser = () => {
    if (!deletingUser) return;
    if (currentUser && deletingUser.username.toLowerCase() === currentUser.username.toLowerCase()) {
      setDeleteError('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif login.');
      return;
    }
    const targetId = deletingUser.id;
    setUsers(users.filter(u => u.id !== targetId));
    deleteUserFromFirestore(targetId).catch(err => console.error('Error deleting user from Firestore:', err));
    setDeletingUser(null);
    setShowModal(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50 min-h-full" id="user-management-section">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-djpb-blue text-white rounded-xl shadow-xs">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-display font-bold text-slate-800">
                Pengelolaan Akses Admin & Branding
              </h1>
              <p className="text-xs text-slate-500">
                Pengelolaan kredensial akun user, peranan (Administrator, Pegawai), upload logo resmi instansi, serta kustomisasi banner header.
              </p>
            </div>
          </div>
        </div>

        {activeTab === 'users' && (
          <button
            id="btn-add-new-user"
            onClick={handleOpenAddModal}
            className="flex items-center space-x-2 px-4 py-2.5 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah User Baru</span>
          </button>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-200/60 p-1.5 rounded-2xl border border-slate-200/80 w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-white text-djpb-blue shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Daftar User & Akses</span>
          <span className="ml-1.5 bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-600 border border-slate-200">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('logo')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'logo'
              ? 'bg-white text-djpb-blue shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Upload Logo Instansi</span>
          {previewLogo && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('banner')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'banner'
              ? 'bg-white text-djpb-blue shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Camera className="w-4 h-4 text-amber-600" />
          <span>Upload Banner Header (Admin)</span>
          {previewBanner && previewBanner !== DEFAULT_KANWIL_IMAGE && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          )}
        </button>
      </div>

      {/* TAB 1: MANAJEMEN USER */}
      {activeTab === 'users' && (
        <>
          {/* Action Toolbar for User Management */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mr-1">Menu Aksi User:</span>
              <button
                type="button"
                id="btn-action-add-user"
                onClick={handleOpenAddModal}
                className="px-3.5 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Tambah User Baru</span>
              </button>
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                <span>Edit Akses & Role</span>
              </div>
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Hapus Akun User</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Klik tombol <strong className="text-blue-600 font-semibold">Edit Akses</strong> atau <strong className="text-rose-600 font-semibold">Hapus</strong> pada tabel di bawah untuk kelola tiap user.
            </p>
          </div>

          {/* Top Filter Bar (matching user interface design) */}
          <div className="bg-slate-100/80 p-3 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-search-user"
                  type="text"
                  placeholder="Cari nama/username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-djpb-blue/30 focus:border-djpb-blue transition-all"
                />
              </div>

              {/* Role Filter Dropdown */}
              <select
                id="select-role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-djpb-blue/30 transition-all cursor-pointer"
              >
                <option value="Semua Role">Semua Role</option>
                <option value="Administrator">Administrator</option>
                <option value="KANWIL">KANWIL</option>
                <option value="KPPN">KPPN</option>
              </select>

              {/* Status Filter Dropdown */}
              <select
                id="select-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-djpb-blue/30 transition-all cursor-pointer"
              >
                <option value="Semua Status">Semua Status</option>
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium self-end md:self-auto">
              Menampilkan <strong className="text-slate-800">{filteredUsers.length}</strong> dari <strong className="text-slate-800">{users.length}</strong> user
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="user-management-table">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 font-semibold">ID PEGAWAI</th>
                    <th className="py-3.5 px-4 font-semibold">NAMA PEGAWAI</th>
                    <th className="py-3.5 px-4 font-semibold">USERNAME</th>
                    <th className="py-3.5 px-4 font-semibold">PASSWORD</th>
                    <th className="py-3.5 px-4 font-semibold">ROLE</th>
                    <th className="py-3.5 px-4 font-semibold">STATUS</th>
                    <th className="py-3.5 px-4 font-semibold text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* ID Pegawai */}
                      <td className="py-3.5 px-4 font-mono text-slate-400 font-medium text-xs">
                        {user.employeeId}
                      </td>

                      {/* Nama Pegawai */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 uppercase tracking-wide">
                        {user.fullName}
                      </td>

                      {/* Username */}
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {user.username}
                      </td>

                      {/* Password */}
                      <td className="py-3.5 px-4 font-bold tracking-widest text-slate-800">
                        ••••••
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          user.role === 'Administrator'
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : user.role === 'KPPN'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-600 border border-blue-200'
                        }`}>
                          {user.role === 'KPPN' && <Building2 className="w-3 h-3 text-emerald-600" />}
                          {user.role === 'Administrator' && <Crown className="w-3 h-3 text-rose-500" />}
                          {(user.role === 'KANWIL' || user.role === 'Pegawai') && <UserCheck className="w-3 h-3 text-blue-500" />}
                          <span>{user.role === 'Pegawai' ? 'KANWIL' : user.role}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          user.status === 'Aktif'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {user.status}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            id={`btn-edit-user-${user.id}`}
                            onClick={() => handleOpenEditModal(user)}
                            className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Akses</span>
                          </button>
                          {user.username.toLowerCase() !== 'admin' && (
                            <button
                              id={`btn-delete-user-${user.id}`}
                              onClick={() => handleOpenDeleteUser(user)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              title="Hapus Akun User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400 text-xs italic">
                        Tidak ada data pegawai/user yang sesuai dengan kata kunci atau filter pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: UPLOAD LOGO INSTANSI */}
      {activeTab === 'logo' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Notification Alert */}
          {logoSaveStatus && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold">{logoSaveStatus}</span>
              </div>
              <button
                onClick={() => setLogoSaveStatus(null)}
                className="text-emerald-500 hover:text-emerald-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Upload Form Box */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div>
                <div className="flex items-center space-x-2 text-djpb-blue mb-1">
                  <ImageIcon className="w-5 h-5" />
                  <h2 className="font-display font-bold text-base text-slate-800">
                    Upload File Logo Baru
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Pilih gambar logo resmi instansi/kementerian (.png, .jpg, .svg, .webp). Logo baru akan diterapkan secara otomatis pada Header, Login, dan KOP dokumen.
                </p>
              </div>

              {/* Upload Dropzone */}
              <div className="relative border-2 border-dashed border-slate-300 hover:border-djpb-blue rounded-2xl p-6 bg-slate-50 hover:bg-blue-50/30 transition-all text-center flex flex-col items-center justify-center space-y-3 cursor-pointer group">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                  onChange={handleLogoFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />

                <div className="w-14 h-14 bg-blue-100 text-djpb-blue rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-700">
                    Klik atau Seret File Gambar Logo ke Sini
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Format disarankan: PNG Transparan atau SVG (Maks. 5MB)
                  </p>
                </div>

                <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-djpb-blue shadow-2xs">
                  Pilih File Gambar
                </div>
              </div>

              {/* Info Specifications */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                <div className="font-bold text-slate-700 flex items-center space-x-1.5">
                  <FileImage className="w-4 h-4 text-djpb-blue" />
                  <span>Spesifikasi Logo Ideal:</span>
                </div>
                <ul className="list-disc list-inside text-slate-500 space-y-1 text-[11px]">
                  <li>Resolusi disarankan min. 500 x 500 piksel</li>
                  <li>Latar belakang transparan (PNG/SVG) untuk tampilan terbaik</li>
                  <li>Proporsi simetris atau rasio 1:1</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveLogo}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan & Terapkan Logo</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetLogo}
                  title="Kembalikan ke Logo Default"
                  className="flex items-center justify-center space-x-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>
            </div>

            {/* Right Live Preview Box */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div>
                <div className="flex items-center space-x-2 text-djpb-blue mb-1">
                  <Sparkles className="w-5 h-5" />
                  <h2 className="font-display font-bold text-base text-slate-800">
                    Live Preview Tampilan Logo Sistem
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Pratinjau langsung bagaimana logo Anda akan terlihat di berbagai komponen aplikasi Melayu:
                </p>
              </div>

              {/* Preview 1: Header Bar */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  1. Tampilan Header Utama Dashboard
                </span>
                <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center space-x-3">
                    <div className="p-1 bg-slate-50 rounded-lg border border-slate-200">
                      <KemenkeuLogo className="w-8 h-8" customSrc={previewLogo || undefined} />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-xs text-slate-800">
                        DASHBOARD MEDIA LAYANAN UMUM (MELAYU)
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Kanwil DJPb Provinsi Riau
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-50 text-djpb-blue text-[10px] font-bold rounded-full border border-blue-100">
                    Status: Active Header
                  </span>
                </div>
              </div>

              {/* Preview 2: Login Header */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  2. Tampilan Halaman Login System
                </span>
                <div className="bg-gradient-to-br from-djpb-blue via-blue-700 to-djpb-blue-dark p-6 rounded-2xl flex flex-col items-center justify-center text-center text-white space-y-2 shadow-xs">
                  <div className="p-2 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-xs">
                    <KemenkeuLogo className="w-14 h-14" customSrc={previewLogo || undefined} />
                  </div>
                  <h4 className="font-bold text-xs tracking-wider uppercase text-amber-300">
                    KEMENTERIAN KEUANGAN RI
                  </h4>
                  <p className="text-[11px] text-slate-300 max-w-sm">
                    PORTAL LAYANAN TERPADU ELEKTRONIK DITJEN PERBENDAHARAAN
                  </p>
                </div>
              </div>

              {/* Preview 3: Document KOP */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  3. Tampilan KOP Surat Permintaan Barang Persediaan
                </span>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center space-x-4">
                  <div className="w-14 h-14 shrink-0 flex items-center justify-center border border-slate-200 bg-white rounded-lg p-1">
                    <KemenkeuLogo className="w-full h-full" customSrc={previewLogo || undefined} />
                  </div>
                  <div className="text-left text-slate-800 space-y-0.5">
                    <h5 className="font-bold text-xs">KEMENTERIAN KEUANGAN REPUBLIK INDONESIA</h5>
                    <p className="text-[10px] font-semibold text-slate-600">DIREKTORAT JENDERAL PERBENDAHARAAN</p>
                    <p className="text-[10px] text-slate-500">KANTOR WILAYAH PROVINSI RIAU</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: UPLOAD BANNER HEADER (ADMIN) */}
      {activeTab === 'banner' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Notification Alert */}
          {bannerSaveStatus && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold">{bannerSaveStatus}</span>
              </div>
              <button
                onClick={() => setBannerSaveStatus(null)}
                className="text-emerald-500 hover:text-emerald-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Form Column */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div>
                <div className="flex items-center space-x-2 text-djpb-blue mb-1">
                  <Camera className="w-5 h-5 text-amber-600" />
                  <h2 className="font-display font-bold text-base text-slate-800">
                    Upload Gambar Banner Header (Admin)
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Kelola dan perbarui foto / gambar background header Media Layanan Umum (MELAYU) Kanwil DJPb Provinsi Riau.
                </p>
              </div>

              {/* Option 1: File Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                  <Upload className="w-4 h-4 text-djpb-blue" />
                  <span>Opsi 1: Upload File Gambar Dari Perangkat</span>
                </label>
                <div className="relative border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-5 bg-slate-50 hover:bg-amber-50/20 transition-all text-center flex flex-col items-center justify-center space-y-2 cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />

                  <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
                    <ImageIcon className="w-6 h-6" />
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-700">
                      Klik atau Seret Gambar Banner ke Sini
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      JPG, PNG, WEBP (Maksimal 8MB)
                    </p>
                  </div>

                  <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-amber-800 shadow-2xs">
                    Pilih File Gambar
                  </div>
                </div>
              </div>

              {/* Option 2: URL Image */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                  <FileImage className="w-4 h-4 text-djpb-blue" />
                  <span>Opsi 2: Tempelkan Link / URL Gambar Online</span>
                </label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={bannerUrlInput}
                    onChange={(e) => setBannerUrlInput(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-djpb-blue bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={handleApplyBannerUrl}
                    disabled={!bannerUrlInput.trim()}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Gunakan
                  </button>
                </div>
              </div>

              {/* Specifications Info Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                <div className="font-bold text-slate-700 flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Spesifikasi Banner Ideal:</span>
                </div>
                <ul className="list-disc list-inside text-slate-500 space-y-1 text-[11px]">
                  <li>Rasio landscape disarankan (16:9 atau panorama)</li>
                  <li>Resolusi disarankan min. 1600 x 600 piksel</li>
                  <li>Foto gedung kantor, lanskap instansi, atau visual dinas</li>
                </ul>
              </div>

              {/* Save & Reset Action Buttons */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveBanner}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan & Terapkan Banner</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetBanner}
                  title="Kembalikan ke Gambar Default"
                  className="flex items-center justify-center space-x-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>
            </div>

            {/* Right Live Preview Box */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div>
                <div className="flex items-center space-x-2 text-djpb-blue mb-1">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h2 className="font-display font-bold text-base text-slate-800">
                    Live Preview Header Dashboard (MELAYU)
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Pratinjau tampilan banner header utama yang akan terlihat oleh seluruh pegawai pada Halaman Utama / Beranda:
                </p>
              </div>

              {/* Banner Preview Card mimicking WelcomeView Hero Header */}
              <div className="relative h-64 sm:h-72 rounded-2xl overflow-hidden border border-slate-300 bg-slate-950 shadow-lg flex flex-col justify-between p-5">
                <img
                  src={previewBanner}
                  alt="Live Preview Banner Header"
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#030d22] via-[#08182d]/90 to-[#08182d]/35"></div>

                {/* Top Badge */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="bg-amber-400 text-slate-950 font-black px-3 py-1 rounded-full text-[10px] flex items-center space-x-1 shadow-md">
                    <Crown className="w-3 h-3 text-slate-950" />
                    <span>Media Layanan Umum • Kanwil DJPb Prov. Riau</span>
                  </span>
                  <span className="bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-md">
                    LIVE SYSTEM
                  </span>
                </div>

                {/* Bottom Title Content */}
                <div className="relative z-10 space-y-2">
                  <h3 className="text-white font-black text-lg sm:text-xl uppercase tracking-tight leading-tight">
                    SELAMAT DATANG DI MEDIA LAYANAN UMUM (MELAYU)
                  </h3>
                  <p className="text-slate-300 text-xs line-clamp-2 max-w-xl">
                    Portal Layanan Terpadu Bagian Umum Kanwil Ditjen Perbendaharaan Provinsi Riau.
                  </p>
                </div>
              </div>

              <div className="bg-amber-50/80 border border-amber-200/90 p-4 rounded-xl text-xs text-amber-900 space-y-1">
                <p className="font-bold flex items-center space-x-1.5">
                  <span>💡 Informasi Penerapan Banner:</span>
                </p>
                <p className="text-[11px] text-amber-800/90 leading-relaxed">
                  Setelah menekan tombol <strong>"Simpan & Terapkan Banner"</strong>, banner header ini akan langsung aktif di layar Beranda / Selamat Datang untuk seluruh pengguna sistem MELAYU.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit / Add User */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-djpb-blue to-djpb-blue-light text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-djpb-gold" />
                <h3 className="text-sm font-display font-bold">
                  {editingUser ? 'Edit Hak Akses User' : 'Tambah User Baru'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveUser} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* ID Pegawai */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    ID PEGAWAI <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="Contoh: PEG-010"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-djpb-blue/30 focus:border-djpb-blue outline-none transition-all"
                  />
                </div>

                {/* Username */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    USERNAME <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Username login"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-djpb-blue/30 focus:border-djpb-blue outline-none transition-all"
                  />
                </div>
              </div>

              {/* Nama Lengkap Pegawai */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  NAMA PEGAWAI <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value.toUpperCase() })}
                  placeholder="Nama Lengkap Pegawai"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-djpb-blue/30 focus:border-djpb-blue outline-none transition-all"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  PASSWORD AKUN
                </label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Password untuk login"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-djpb-blue/30 focus:border-djpb-blue outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Role */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    ROLE / HAK AKSES
                  </label>
                  <select
                    value={formData.role === 'Pegawai' ? 'KANWIL' : formData.role}
                    onChange={(e) => {
                      const newRole = e.target.value as 'Administrator' | 'KANWIL' | 'KPPN';
                      let newId = formData.employeeId;
                      // Auto-update prefix if creating a new user and using standard default IDs
                      if (!editingUser && (formData.employeeId.startsWith('KANWIL-') || formData.employeeId.startsWith('PEG-') || formData.employeeId.startsWith('KPPN-') || formData.employeeId.startsWith('ADM-'))) {
                        const count = users.filter(u => u.role === newRole || (newRole === 'KANWIL' && u.role === 'Pegawai')).length + 1;
                        const prefix = newRole === 'KPPN' ? 'KPPN' : (newRole === 'Administrator' ? 'ADM' : 'KANWIL');
                        newId = `${prefix}-${String(count).padStart(3, '0')}`;
                      }
                      setFormData({ ...formData, role: newRole, employeeId: newId });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-djpb-blue/30 outline-none cursor-pointer"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="KANWIL">KANWIL</option>
                    <option value="KPPN">KPPN</option>
                  </select>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    STATUS AKSES
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-djpb-blue/30 outline-none cursor-pointer"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              {/* Role Scope Information Box */}
              <div className={`p-2.5 rounded-xl border text-[11px] leading-relaxed transition-all ${
                formData.role === 'KPPN'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : formData.role === 'Administrator'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}>
                <div className="font-bold flex items-center space-x-1.5 mb-0.5">
                  {formData.role === 'KPPN' && (
                    <>
                      <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Hak Akses Mitra Satker KPPN:</span>
                    </>
                  )}
                  {formData.role === 'Administrator' && (
                    <>
                      <Crown className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Hak Akses Administrator:</span>
                    </>
                  )}
                  {(formData.role === 'KANWIL' || formData.role === 'Pegawai') && (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Hak Akses KANWIL:</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] opacity-90 leading-normal">
                  {formData.role === 'KPPN' && 'Akses langsung modul Cek Seribu Kepegawaian, Monitoring Kinerja, Monitoring ABK, Monitoring DAMS, dan Monitoring Employee Advocacy (EA).'}
                  {formData.role === 'Administrator' && 'Akses menyeluruh semua menu, manajemen pengguna/akun, persetujuan formulir, serta penyesuaian logo dan banner aplikasi.'}
                  {(formData.role === 'KANWIL' || formData.role === 'Pegawai') && 'Akses standar layanan internal Bagian Umum & Kepegawaian Kanwil DJPb (Peminjaman Ruangan/Kendaraan, Permintaan Barang, GKM, Lembur, dsb).'}
                </p>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {editingUser ? (
                  <button
                    type="button"
                    onClick={() => handleOpenDeleteUser(editingUser)}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus User</span>
                  </button>
                ) : <div />}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Simpan Akses
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus User */}
      {deletingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150" id="user-delete-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-600 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-slate-800">Hapus Akun User</h3>
                <p className="text-xs text-slate-500">Konfirmasi penghapusan hak akses pegawai</p>
              </div>
            </div>

            {deleteError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Detail Akun</span>
              <p className="font-bold text-slate-800">{deletingUser.fullName}</p>
              <p className="text-slate-600 text-[11px] font-mono">ID: {deletingUser.employeeId} • Username: {deletingUser.username} • Role: {deletingUser.role}</p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun pegawai ini? User tidak akan lagi dapat login ke dalam sistem Melayu.
            </p>

            <div className="flex items-center justify-end space-x-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  setDeletingUser(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus User</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
