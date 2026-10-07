/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import RunningTextBanner from './components/RunningTextBanner';
import Sidebar from './components/Sidebar';
import WelcomeView from './components/WelcomeView';
import TurtSection from './components/TurtSection';
import KepegawaianSection from './components/KepegawaianSection';
import KinerjaSection from './components/KinerjaSection';
import KeuanganSection from './components/KeuanganSection';
import InformasiSection from './components/InformasiSection';
import UserManagementSection from './components/UserManagementSection';
import LaporanTurtSection from './components/LaporanTurtSection';
import LoginView from './components/LoginView';

import {
  RoomBooking, ItemBooking, VehicleBooking,
  FacilityFeedback, MonthlyNeed, GKMAgreement,
  ScholarshipInfo, PerformanceMetric, WorkloadMetric,
  RealizationProgress, VisitorLog, SecurityShift, SecurityRosterItem,
  CurrentUser, UserAccount, ActivityGalleryItem,
  RencanaLemburRow, RealisasiLemburItem, RealisasiGolonganItem, LemburUploadedFile,
  AlokasiBidangSection, RealisasiBidangRow
} from './types';

import {
  INITIAL_ROOM_BOOKINGS,
  INITIAL_ITEM_BOOKINGS,
  INITIAL_VEHICLE_BOOKINGS,
  INITIAL_FACILITY_FEEDBACK,
  INITIAL_MONTHLY_NEEDS,
  INITIAL_GKM_AGREEMENTS,
  INITIAL_SCHOLARSHIPS,
  INITIAL_PERFORMANCE_METRICS,
  INITIAL_WORKLOAD_METRICS,
  INITIAL_REALIZATION_PROGRESS,
  INITIAL_VISITOR_LOGS,
  INITIAL_SECURITY_SHIFTS,
  INITIAL_SECURITY_ROSTER,
  INITIAL_USERS,
  INITIAL_ACTIVITY_GALLERY,
  INITIAL_RENCANA_LEMBUR_2026,
  INITIAL_REALISASI_LEMBUR,
  INITIAL_REALISASI_GOLONGAN_2026,
  INITIAL_LEMBUR_UPLOADED_FILES,
  INITIAL_ALOKASI_BIDANG_2026,
  INITIAL_REALISASI_BIDANG_2026
} from './mockData';
import { deduplicateRoster, sortRosterChronologically, normalizeDateKey, alignOctoberRosterToPattern, ensureTwoGuardsForMorningShift } from './components/SecurityGuardSection';
import { getUsersFromFirestore, subscribeFirestoreCollection, saveFirestoreCollection, deleteFirestoreDoc, subscribeAppSettings } from './lib/firebase';
import {
  safeLocalStorageSet,
  safeLocalStorageGet,
  safeSessionStorageSet,
  safeSessionStorageGet,
  safeSessionStorageRemove
} from './lib/storage';

function safeParse<T>(key: string, fallback: T): T {
  return safeLocalStorageGet<T>(key, fallback);
}

export default function App() {
  // User Session State (Hanya aktif selama sesi browser; saat keluar/menutup browser, aplikasi otomatis tertutup & kembali ke login)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    // Bersihkan sesi lama dari localStorage agar tidak tertinggal permanen di perangkat
    try {
      localStorage.removeItem('melayu_current_user');
    } catch {}
    return safeSessionStorageGet<CurrentUser | null>('melayu_current_user', null);
  });

  // Navigation & Sidebar State (menggunakan sessionStorage agar saat browser dibuka kembali selalu dari awal)
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      localStorage.removeItem('melayu_active_tab');
    } catch {}
    return safeSessionStorageGet<string>('melayu_active_tab', 'selamat-datang');
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return safeParse<boolean>('melayu_sidebar_collapsed', false);
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    safeLocalStorageSet('melayu_sidebar_collapsed', JSON.stringify(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Edit Mode State
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  const KPPN_ALLOWED_TABS = ['monitoring-kinerja', 'monitoring-abk', 'monitoring-dams', 'cek-seribu', 'monitoring-ea'];

  // Sync user state to session storage and guard Edit Mode and KPPN allowed tabs
  useEffect(() => {
    if (currentUser) {
      safeSessionStorageSet('melayu_current_user', JSON.stringify(currentUser));
      // Selalu pastikan localStorage bersih dari data login pengguna
      try {
        localStorage.removeItem('melayu_current_user');
      } catch {}

      if (currentUser.role !== 'admin') {
        setIsEditMode(false);
      }
      if (currentUser.role === 'kppn' && !KPPN_ALLOWED_TABS.includes(activeTab)) {
        setActiveTab('monitoring-kinerja');
        safeSessionStorageSet('melayu_active_tab', 'monitoring-kinerja');
      }
    } else {
      safeSessionStorageRemove('melayu_current_user');
      safeSessionStorageRemove('melayu_active_tab');
      try {
        localStorage.removeItem('melayu_current_user');
        localStorage.removeItem('melayu_active_tab');
      } catch {}
      setIsEditMode(false);
    }
  }, [currentUser, activeTab]);

  useEffect(() => {
    if (activeTab) {
      safeSessionStorageSet('melayu_active_tab', activeTab);
    }
  }, [activeTab]);

  // Pastikan data sesi lama di localStorage tetap terhapus saat berpindah halaman atau menutup jendela
  useEffect(() => {
    const handleCleanup = () => {
      try {
        localStorage.removeItem('melayu_current_user');
        localStorage.removeItem('melayu_active_tab');
      } catch {}
    };
    window.addEventListener('pagehide', handleCleanup);
    return () => window.removeEventListener('pagehide', handleCleanup);
  }, []);

  const handleLoginSuccess = (user: CurrentUser) => {
    setCurrentUser(user);
    const initialTab = user.role === 'kppn' ? 'monitoring-kinerja' : 'selamat-datang';
    setActiveTab(initialTab);
    safeSessionStorageSet('melayu_active_tab', initialTab);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('selamat-datang');
    safeSessionStorageRemove('melayu_current_user');
    safeSessionStorageSet('melayu_active_tab', 'selamat-datang');
    try {
      localStorage.removeItem('melayu_current_user');
      localStorage.removeItem('melayu_active_tab');
    } catch {}
  };

  // Core Persistent States (with LocalStorage backing)
  const [roomBookings, setRoomBookings] = useState<RoomBooking[]>(() => {
    const raw = safeParse<RoomBooking[]>('melayu_rooms', INITIAL_ROOM_BOOKINGS);
    return raw.map(b => b.statusNote === 'Disetujui oleh Admin Subbag Rumah Tangga - Kunci ruangan siap diambil' ? { ...b, statusNote: 'Disetujui oleh Admin Subbag Rumah Tangga' } : b);
  });

  const [itemBookings, setItemBookings] = useState<ItemBooking[]>(() => {
    return safeParse<ItemBooking[]>('melayu_items', INITIAL_ITEM_BOOKINGS);
  });

  const [vehicleBookings, setVehicleBookings] = useState<VehicleBooking[]>(() => {
    return safeParse<VehicleBooking[]>('melayu_vehicles', INITIAL_VEHICLE_BOOKINGS);
  });

  const [feedbacks, setFeedbacks] = useState<FacilityFeedback[]>(() => {
    return safeParse<FacilityFeedback[]>('melayu_feedbacks', INITIAL_FACILITY_FEEDBACK);
  });

  const [needs, setNeeds] = useState<MonthlyNeed[]>(() => {
    return safeParse<MonthlyNeed[]>('melayu_needs', INITIAL_MONTHLY_NEEDS);
  });

  const [gkmList, setGkmList] = useState<GKMAgreement[]>(() => {
    return safeParse<GKMAgreement[]>('melayu_gkm', INITIAL_GKM_AGREEMENTS);
  });

  const [realizations, setRealizations] = useState<RealizationProgress[]>(() => {
    return safeParse<RealizationProgress[]>('melayu_realizations', INITIAL_REALIZATION_PROGRESS);
  });

  const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>(() => {
    return safeParse<VisitorLog[]>('melayu_visitors', INITIAL_VISITOR_LOGS);
  });

  const [usersList, setUsersList] = useState<UserAccount[]>(() => {
    return safeParse<UserAccount[]>('melayu_users', INITIAL_USERS);
  });

  // Security shifts state with local storage persistence
  const [securityShifts, setSecurityShifts] = useState<SecurityShift[]>(() => {
    return safeParse<SecurityShift[]>('melayu_security_shifts', INITIAL_SECURITY_SHIFTS);
  });

  // Security roster state (individual per-guard schedule) with local storage persistence
  const [securityRoster, setSecurityRoster] = useState<SecurityRosterItem[]>(() => {
    const parsed = safeParse<SecurityRosterItem[]>('melayu_security_roster', INITIAL_SECURITY_ROSTER);
    const source = Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SECURITY_ROSTER;
    const clean = deduplicateRoster(source);
    const hasOctober = clean.some(item => 
      (item?.dateStr || '').toLowerCase().includes('oktober') || normalizeDateKey(item?.dateStr || '').startsWith('2026-10')
    );
    const filtered = hasOctober
      ? clean.filter(item => 
          !(item?.dateStr || '').toLowerCase().includes('agustus') && !normalizeDateKey(item?.dateStr || '').startsWith('2026-08')
        )
      : clean;
    const aligned = hasOctober ? alignOctoberRosterToPattern(filtered) : filtered;
    return sortRosterChronologically(aligned);
  });

  const [scholarships, setScholarships] = useState<ScholarshipInfo[]>(() => {
    return safeParse<ScholarshipInfo[]>('melayu_scholarships', INITIAL_SCHOLARSHIPS);
  });

  const [galleryItems, setGalleryItems] = useState<ActivityGalleryItem[]>(() => {
    const parsed = safeParse<ActivityGalleryItem[]>('melayu_activity_gallery', INITIAL_ACTIVITY_GALLERY);
    return Array.isArray(parsed) ? parsed : INITIAL_ACTIVITY_GALLERY;
  });

  // Rencana Lembur 2026, Realisasi Lembur, and Uploaded Files States
  const [rencanaLembur, setRencanaLembur] = useState<RencanaLemburRow[]>(() => {
    return safeParse<RencanaLemburRow[]>('melayu_rencana_lembur_2026', INITIAL_RENCANA_LEMBUR_2026);
  });

  const [realisasiLembur, setRealisasiLembur] = useState<RealisasiLemburItem[]>(() => {
    return safeParse<RealisasiLemburItem[]>('melayu_realisasi_lembur_2026', INITIAL_REALISASI_LEMBUR);
  });

  const [realisasiGolongan, setRealisasiGolongan] = useState<RealisasiGolonganItem[]>(() => {
    return safeParse<RealisasiGolonganItem[]>('melayu_realisasi_golongan_2026', INITIAL_REALISASI_GOLONGAN_2026);
  });

  const [alokasiBidang, setAlokasiBidang] = useState<AlokasiBidangSection[]>(() => {
    return safeParse<AlokasiBidangSection[]>('melayu_alokasi_bidang_2026', INITIAL_ALOKASI_BIDANG_2026);
  });

  const [realisasiBidang, setRealisasiBidang] = useState<RealisasiBidangRow[]>(() => {
    return safeParse<RealisasiBidangRow[]>('melayu_realisasi_bidang_2026', INITIAL_REALISASI_BIDANG_2026);
  });

  const [lemburFiles, setLemburFiles] = useState<LemburUploadedFile[]>(() => {
    return safeParse<LemburUploadedFile[]>('melayu_lembur_uploaded_files', INITIAL_LEMBUR_UPLOADED_FILES);
  });

  const performanceMetrics: PerformanceMetric[] = INITIAL_PERFORMANCE_METRICS;
  const workloadMetrics: WorkloadMetric[] = INITIAL_WORKLOAD_METRICS;

  // Real-time sync with Firebase Firestore on mount across all devices (Handphone <-> PC)
  useEffect(() => {
    const unsubRooms = subscribeFirestoreCollection<RoomBooking>('rooms', INITIAL_ROOM_BOOKINGS, (data) => {
      const normalized = (data || []).map(b => 
        b.statusNote === 'Disetujui oleh Admin Subbag Rumah Tangga - Kunci ruangan siap diambil' 
          ? { ...b, statusNote: 'Disetujui oleh Admin Subbag Rumah Tangga' } 
          : b
      );
      setRoomBookings(normalized);
    });
    const unsubItems = subscribeFirestoreCollection<ItemBooking>('items', INITIAL_ITEM_BOOKINGS, setItemBookings);
    const unsubVehicles = subscribeFirestoreCollection<VehicleBooking>('vehicles', INITIAL_VEHICLE_BOOKINGS, setVehicleBookings);
    const unsubFeedbacks = subscribeFirestoreCollection<FacilityFeedback>('feedbacks', INITIAL_FACILITY_FEEDBACK, setFeedbacks);
    const unsubNeeds = subscribeFirestoreCollection<MonthlyNeed>('needs', INITIAL_MONTHLY_NEEDS, setNeeds);
    const unsubGkm = subscribeFirestoreCollection<GKMAgreement>('gkm', INITIAL_GKM_AGREEMENTS, setGkmList);
    const unsubRealizations = subscribeFirestoreCollection<RealizationProgress>('realizations', INITIAL_REALIZATION_PROGRESS, setRealizations);
    const unsubVisitors = subscribeFirestoreCollection<VisitorLog>('visitors', INITIAL_VISITOR_LOGS, setVisitorLogs);
    const unsubShifts = subscribeFirestoreCollection<SecurityShift>('security_shifts', INITIAL_SECURITY_SHIFTS, setSecurityShifts);
    const unsubRoster = subscribeFirestoreCollection<SecurityRosterItem>(
      'security_roster', 
      INITIAL_SECURITY_ROSTER, 
      (data) => {
        if (Array.isArray(data) && data.length > 0) {
          const cleanData = deduplicateRoster(data);
          
          // Purge any rogue August items when October schedule is active
          const hasOctober = cleanData.some(item => 
            (item?.dateStr || '').toLowerCase().includes('oktober') || normalizeDateKey(item?.dateStr || '').startsWith('2026-10')
          );
          const filtered = hasOctober
            ? cleanData.filter(item => 
                !(item?.dateStr || '').toLowerCase().includes('agustus') && !normalizeDateKey(item?.dateStr || '').startsWith('2026-08')
              )
            : cleanData;

          // Pastikan Jam Hadir / Shift Mulai Jumat/ 2 Oktober s.d. Sabtu/ 31 Oktober 2026 sama polanya dengan Kamis/ 1 Oktober 2026:
          // 2 petugas Pagi (06.00/18.00), 2 petugas Malam (18.00/06.00), 1 petugas Rumdin (18.00/06.00), 1 petugas Libur (-)
          const aligned = hasOctober ? alignOctoberRosterToPattern(filtered) : filtered;

          // Sort strictly chronologically by Hari, Tanggal, dan Jam!
          const sorted = sortRosterChronologically(aligned);
          setSecurityRoster(sorted);
        }
      }
    );
    const unsubUsers = subscribeFirestoreCollection<UserAccount>('users', INITIAL_USERS, setUsersList);
    const unsubScholarships = subscribeFirestoreCollection<ScholarshipInfo>('scholarships', INITIAL_SCHOLARSHIPS, setScholarships);
    const unsubGallery = subscribeFirestoreCollection<ActivityGalleryItem>('activity_gallery', INITIAL_ACTIVITY_GALLERY, setGalleryItems);
    const unsubRencanaLembur = subscribeFirestoreCollection<RencanaLemburRow>('rencana_lembur_2026', INITIAL_RENCANA_LEMBUR_2026, setRencanaLembur);
    const unsubRealisasiLembur = subscribeFirestoreCollection<RealisasiLemburItem>('realisasi_lembur_2026', INITIAL_REALISASI_LEMBUR, setRealisasiLembur);
    const unsubRealisasiGolongan = subscribeFirestoreCollection<RealisasiGolonganItem>('realisasi_golongan_2026', INITIAL_REALISASI_GOLONGAN_2026, setRealisasiGolongan);
    const unsubAlokasiBidang = subscribeFirestoreCollection<AlokasiBidangSection>('alokasi_bidang_2026', INITIAL_ALOKASI_BIDANG_2026, setAlokasiBidang);
    const unsubRealisasiBidang = subscribeFirestoreCollection<RealisasiBidangRow>('realisasi_bidang_2026', INITIAL_REALISASI_BIDANG_2026, setRealisasiBidang);
    const unsubLemburFiles = subscribeFirestoreCollection<LemburUploadedFile>('lembur_uploaded_files', INITIAL_LEMBUR_UPLOADED_FILES, setLemburFiles);
    const unsubSettings = subscribeAppSettings();

    return () => {
      unsubRooms();
      unsubItems();
      unsubVehicles();
      unsubFeedbacks();
      unsubNeeds();
      unsubGkm();
      unsubRealizations();
      unsubVisitors();
      unsubShifts();
      unsubRoster();
      unsubUsers();
      unsubScholarships();
      unsubGallery();
      unsubRencanaLembur();
      unsubRealisasiLembur();
      unsubRealisasiGolongan();
      unsubAlokasiBidang();
      unsubRealisasiBidang();
      unsubLemburFiles();
      unsubSettings();
    };
  }, []);

  // Sync state to local storage
  useEffect(() => {
    safeLocalStorageSet('melayu_scholarships', JSON.stringify(scholarships));
  }, [scholarships]);

  useEffect(() => {
    safeLocalStorageSet('melayu_activity_gallery', JSON.stringify(galleryItems));
  }, [galleryItems]);

  useEffect(() => {
    safeLocalStorageSet('melayu_rencana_lembur_2026', JSON.stringify(rencanaLembur));
  }, [rencanaLembur]);

  useEffect(() => {
    safeLocalStorageSet('melayu_realisasi_lembur_2026', JSON.stringify(realisasiLembur));
  }, [realisasiLembur]);

  useEffect(() => {
    safeLocalStorageSet('melayu_alokasi_bidang_2026', JSON.stringify(alokasiBidang));
  }, [alokasiBidang]);

  useEffect(() => {
    safeLocalStorageSet('melayu_lembur_uploaded_files', JSON.stringify(lemburFiles));
  }, [lemburFiles]);

  useEffect(() => {
    safeLocalStorageSet('melayu_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    safeLocalStorageSet('melayu_rooms', JSON.stringify(roomBookings));
  }, [roomBookings]);

  useEffect(() => {
    safeLocalStorageSet('melayu_items', JSON.stringify(itemBookings));
  }, [itemBookings]);

  useEffect(() => {
    safeLocalStorageSet('melayu_vehicles', JSON.stringify(vehicleBookings));
  }, [vehicleBookings]);

  useEffect(() => {
    safeLocalStorageSet('melayu_feedbacks', JSON.stringify(feedbacks));
  }, [feedbacks]);

  useEffect(() => {
    safeLocalStorageSet('melayu_needs', JSON.stringify(needs));
  }, [needs]);

  useEffect(() => {
    safeLocalStorageSet('melayu_gkm', JSON.stringify(gkmList));
  }, [gkmList]);

  useEffect(() => {
    safeLocalStorageSet('melayu_realizations', JSON.stringify(realizations));
  }, [realizations]);

  useEffect(() => {
    safeLocalStorageSet('melayu_visitors', JSON.stringify(visitorLogs));
  }, [visitorLogs]);

  useEffect(() => {
    safeLocalStorageSet('melayu_security_shifts', JSON.stringify(securityShifts));
  }, [securityShifts]);

  useEffect(() => {
    safeLocalStorageSet('melayu_security_roster', JSON.stringify(securityRoster));
  }, [securityRoster]);

  useEffect(() => {
    safeLocalStorageSet('melayu_users', JSON.stringify(usersList));
  }, [usersList]);

  // Reset Handler
  const handleResetData = () => {
    if (confirm('Apakah Anda yakin ingin menyetel ulang seluruh data dashboard ke pengaturan awal?')) {
      localStorage.removeItem('melayu_rooms');
      localStorage.removeItem('melayu_items');
      localStorage.removeItem('melayu_vehicles');
      localStorage.removeItem('melayu_feedbacks');
      localStorage.removeItem('melayu_needs');
      localStorage.removeItem('melayu_gkm');
      localStorage.removeItem('melayu_realizations');
      localStorage.removeItem('melayu_visitors');
      localStorage.removeItem('melayu_users');
      localStorage.removeItem('melayu_activity_gallery');

      setRoomBookings(INITIAL_ROOM_BOOKINGS);
      setItemBookings(INITIAL_ITEM_BOOKINGS);
      setVehicleBookings(INITIAL_VEHICLE_BOOKINGS);
      setFeedbacks(INITIAL_FACILITY_FEEDBACK);
      setNeeds(INITIAL_MONTHLY_NEEDS);
      setGkmList(INITIAL_GKM_AGREEMENTS);
      setRealizations(INITIAL_REALIZATION_PROGRESS);
      setVisitorLogs(INITIAL_VISITOR_LOGS);
      setUsersList(INITIAL_USERS);
      setGalleryItems(INITIAL_ACTIVITY_GALLERY);
      setActiveTab('selamat-datang');
      setIsEditMode(false);
    }
  };

  const handleToggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  // Helper to determine the section layout category
  const renderMainContent = () => {
    switch (activeTab) {
      case 'selamat-datang':
        return (
          <WelcomeView 
            roomBookings={roomBookings}
            vehicleBookings={vehicleBookings}
            itemBookings={itemBookings}
            galleryItems={galleryItems}
            setGalleryItems={setGalleryItems}
            onSaveGalleryToFirebase={(items) => saveFirestoreCollection('activity_gallery', items)}
            onDeleteGalleryFromFirebase={(id) => deleteFirestoreDoc('activity_gallery', id)}
            onNavigateToTab={(tabId) => setActiveTab(tabId)}
            currentUser={currentUser}
            onLogout={handleLogout}
            isEditMode={isEditMode}
          />
        );

      case 'peminjaman-ruangan':
      case 'persetujuan-ruangan':
      case 'peminjaman-barang':
      case 'peminjaman-kendaraan':
      case 'persetujuan-kendaraan':
      case 'feedback-sarpras':
      case 'rencana-kebutuhan':
        return (
          <TurtSection 
            subTab={activeTab}
            roomBookings={roomBookings}
            setRoomBookings={setRoomBookings}
            itemBookings={itemBookings}
            setItemBookings={setItemBookings}
            vehicleBookings={vehicleBookings}
            setVehicleBookings={setVehicleBookings}
            feedbacks={feedbacks}
            setFeedbacks={setFeedbacks}
            needs={needs}
            setNeeds={setNeeds}
            isEditMode={isEditMode}
            onToggleEditMode={handleToggleEditMode}
            currentUser={currentUser}
            onNavigateToTab={(tabId) => setActiveTab(tabId)}
          />
        );

      case 'laporan-turt':
      case 'laporan-ruangan':
      case 'laporan-barang':
      case 'laporan-kendaraan':
      case 'laporan-feedback':
      case 'laporan-persediaan':
        return (
          <LaporanTurtSection 
            subTab={activeTab}
            roomBookings={roomBookings}
            itemBookings={itemBookings}
            vehicleBookings={vehicleBookings}
            feedbacks={feedbacks}
            needs={needs}
            currentUser={currentUser}
            onNavigateToTab={(tabId) => setActiveTab(tabId)}
          />
        );

      case 'informasi-gkm':
      case 'cek-seribu':
      case 'informasi-beasiswa':
      case 'kelola-beasiswa':
      case 't-lego':
        return (
          <KepegawaianSection 
            subTab={activeTab}
            gkmList={gkmList}
            setGkmList={setGkmList}
            scholarships={scholarships}
            setScholarships={setScholarships}
            isEditMode={isEditMode}
            currentUser={currentUser}
          />
        );

      case 'monitoring-kinerja':
      case 'monitoring-abk':
      case 'monitoring-dams':
      case 'katalog-hkt':
      case 'feedback-kinerja':
        return (
          <KinerjaSection 
            subTab={activeTab}
            performanceMetrics={performanceMetrics}
            workloadMetrics={workloadMetrics}
            isEditMode={isEditMode}
            currentUser={currentUser}
          />
        );

      case 'rencana-lembur':
      case 'realisasi-lembur':
      case 'alokasi-lembur-bidang':
      case 'realisasi-lembur-bidang':
        return (
          <KeuanganSection 
            subTab={activeTab}
            onSubTabChange={(tabId) => setActiveTab(tabId)}
            rencanaLembur={rencanaLembur}
            setRencanaLembur={setRencanaLembur}
            realisasiLembur={realisasiLembur}
            setRealisasiLembur={setRealisasiLembur}
            realisasiGolongan={realisasiGolongan}
            setRealisasiGolongan={setRealisasiGolongan}
            alokasiBidang={alokasiBidang}
            setAlokasiBidang={setAlokasiBidang}
            realisasiBidang={realisasiBidang}
            setRealisasiBidang={setRealisasiBidang}
            isEditMode={isEditMode}
            currentUser={currentUser}
          />
        );

      case 'pengawasan-penjagaan':
      case 'rencana-pengadaan':
      case 'monitoring-ea':
      case 'employee-advocacy':
        return (
          <InformasiSection 
            subTab={activeTab}
            visitorLogs={visitorLogs}
            setVisitorLogs={setVisitorLogs}
            securityShifts={securityShifts}
            setSecurityShifts={setSecurityShifts}
            securityRoster={securityRoster}
            setSecurityRoster={setSecurityRoster}
            isEditMode={isEditMode}
            currentUser={currentUser}
          />
        );

      case 'manajemen-user':
        return (
          <UserManagementSection 
            users={usersList}
            setUsers={setUsersList}
            isEditMode={isEditMode}
            currentUser={currentUser}
          />
        );

      default:
        return (
          <div className="p-8 text-center" id="page-not-found">
            <h3 className="text-sm font-semibold text-slate-500">Halaman tidak ditemukan</h3>
          </div>
        );
    }
  };

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800" id="melayu-app-root">
      {/* 1. Header Bar */}
      <Header 
        onReset={handleResetData}
        isEditMode={isEditMode}
        onToggleEditMode={handleToggleEditMode}
        currentUser={currentUser}
        onLogout={handleLogout}
        onToggleSidebar={() => {
          if (window.innerWidth < 768) {
            setIsMobileSidebarOpen(!isMobileSidebarOpen);
          } else {
            setIsSidebarCollapsed(!isSidebarCollapsed);
          }
        }}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* Running Text Banner */}
      <RunningTextBanner />

      {/* Edit Mode Alert Bar */}
      {isEditMode && (
        <div className="bg-amber-500 text-white text-xs font-semibold py-1.5 px-6 text-center shrink-0 flex items-center justify-center space-x-2 animate-in slide-in-from-top duration-200" id="edit-mode-alert">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
          <span>Anda berada dalam Mode Edit (Administrator). Anda dapat menyetujui, menolak, atau membatalkan berbagai pengajuan berkas.</span>
        </div>
      )}

      {/* 2. Main Body with Sidebar & Content Panel */}
      <div className="flex-1 flex flex-col md:flex-row relative" id="app-body-layout">
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          onLogout={handleLogout}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          setIsMobileOpen={setIsMobileSidebarOpen}
        />

        {/* Content Viewer (scrollable area) */}
        <main className="flex-1 h-[calc(100dvh-3.5rem)] overflow-y-auto min-w-0 transition-all duration-300 pb-safe" id="app-content-viewer">
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
}
