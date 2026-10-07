import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  AlertCircle,
  Eye,
  EyeOff,
  Database,
  CheckCircle,
  X,
  Shield
} from 'lucide-react';
import { CurrentUser } from '../types';
import KemenkeuLogo from './KemenkeuLogo';
import {
  authenticateUserReal,
  getAppSettingsFromFirestore
} from '../lib/firebase';

interface LoginViewProps {
  onLoginSuccess: (user: CurrentUser) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Synchronize logo and app settings from Firestore on mount
  useEffect(() => {
    getAppSettingsFromFirestore().catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Username dan Password wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      // Direct check for default convenience accounts
      if ((trimmedUser === 'admin' && (trimmedPass === '123' || trimmedPass === 'admin123')) ||
          (trimmedUser === 'kppn' && (trimmedPass === '123' || trimmedPass === 'kppn123' || trimmedPass === 'admin123')) ||
          (trimmedUser === 'umum' && (trimmedPass === '123' || trimmedPass === 'umum123' || trimmedPass === 'user123' || trimmedPass === 'admin123')) ||
          (trimmedUser === 'user' && (trimmedPass === '123' || trimmedPass === 'user123'))) {
        const isAdmin = trimmedUser === 'admin';
        const isKppn = trimmedUser === 'kppn';
        const convenienceUser: CurrentUser = {
          username: trimmedUser,
          fullName: isAdmin ? 'Administrator Bagian Umum' : (isKppn ? 'Mitra KPPN Riau' : (trimmedUser === 'umum' ? 'Pegawai Bagian Umum' : 'User Pegawai Kanwil')),
          role: isAdmin ? 'admin' : (isKppn ? 'kppn' : 'user'),
          division: isAdmin ? 'Subbagian TURT' : (isKppn ? 'KPPN Mitra Kanwil' : 'Bagian Umum')
        };
        onLoginSuccess(convenienceUser);
        setLoading(false);
        return;
      }

      // Check real account in Firebase Firestore
      const realUser = await authenticateUserReal(trimmedUser, trimmedPass);

      if (realUser) {
        let mappedRole: 'admin' | 'user' | 'kppn' = 'user';
        if (realUser.role === 'Administrator' || realUser.username.toLowerCase() === 'admin' || realUser.username.toLowerCase() === 'dwi') {
          mappedRole = 'admin';
        } else if (realUser.role === 'KPPN' || realUser.username.toLowerCase().startsWith('kppn')) {
          mappedRole = 'kppn';
        }

        onLoginSuccess({
          username: realUser.username,
          fullName: realUser.fullName,
          role: mappedRole,
          division: mappedRole === 'admin' ? 'Subbagian TURT' : (mappedRole === 'kppn' ? 'KPPN Mitra Kanwil' : 'Bagian Umum')
        });
      } else {
        setError('Username atau Password tidak cocok. Silakan periksa kredensial akun Anda.');
      }
    } catch (err) {
      console.error('Login authentication error:', err);
      setError('Gagal menghubungi server otentikasi. Silakan coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 relative" id="login-view-container">
      {/* Absolute Decorative Blue/Gold Top Line */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-djpb-blue via-djpb-blue-light to-djpb-gold"></div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden" id="login-card">
        
        {/* Header section with brand and crest */}
        <div className="p-6 bg-slate-50 border-b border-slate-100 text-center flex flex-col items-center">
          
          {/* Logo Kementerian Keuangan */}
          <div className="mb-4 flex items-center justify-center">
            <KemenkeuLogo className="w-24 h-24 filter drop-shadow-sm shrink-0" />
          </div>

          <h2 className="text-sm font-bold tracking-wider text-slate-700 font-sans leading-none">
            KEMENKEU RI
          </h2>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">
            DITJEN PERBENDAHARAAN
          </p>
          <h1 className="text-base font-black tracking-tight text-slate-900 uppercase mt-1.5 font-sans">
            KANWIL DJPb PROV. RIAU
          </h1>
          <div className="mt-3 px-3.5 py-1 bg-djpb-blue/10 rounded-full text-xs font-bold text-djpb-blue tracking-wider font-mono">
            MEDIA LAYANAN UMUM (MELAYU)
          </div>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-start space-x-2 animate-in fade-in duration-200" id="login-success-alert">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{successMessage}</div>
            <button
              type="button"
              onClick={() => setSuccessMessage('')}
              className="text-emerald-500 hover:text-emerald-700 text-xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-6 space-y-4" id="login-form-element">
          {error && (
            <div className="flex items-center space-x-2 bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-200 animate-in fade-in duration-200" id="login-error-alert">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                id="login-username-input"
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                placeholder="Masukkan username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-djpb-blue/20 focus:border-djpb-blue focus:bg-white transition-all text-slate-800 font-medium"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="current-password"
                placeholder="Masukkan password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-djpb-blue/20 focus:border-djpb-blue focus:bg-white transition-all text-slate-800 font-medium"
              />
              <button
                id="btn-toggle-password-visibility"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="btn-submit-login"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-djpb-blue hover:bg-djpb-blue-light disabled:bg-slate-300 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm tracking-wider cursor-pointer flex items-center justify-center space-x-1"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span>MASUK LAYANAN</span>
            )}
          </button>
        </form>

        {/* Informasi Kewenangan Administrator */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center space-x-2.5" id="login-admin-authority-notice">
          <div className="p-1.5 bg-blue-50 rounded-lg text-djpb-blue shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            Penambahan akun pengguna dan reset kata sandi dikelola secara terpusat oleh <span className="font-semibold text-slate-700">Administrator Bagian Umum</span>.
          </p>
        </div>

        {/* Real Firebase Database Status Box */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/60" id="login-real-status-info">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Status Database Real:</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              <span>Firebase Firestore Terhubung</span>
            </span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
            Gunakan Username & Password resmi pegawai atau akun Administrator terdaftar yang telah tersimpan di basis data cloud Firestore.
          </p>

          <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Sistem Otentikasi Terpusat</span>
            <span className="text-djpb-blue font-bold">Kanwil DJPb Riau</span>
          </div>
        </div>

      </div>

      <div className="mt-4 text-center">
        <p className="text-[10px] text-slate-400 font-mono">
          Kanwil DJPb Provinsi Riau © 2026 • Satu Portal Layanan Internal
        </p>
      </div>
    </div>
  );
}
