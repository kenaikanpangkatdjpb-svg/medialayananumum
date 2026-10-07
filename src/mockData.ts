import {
  RoomBooking,
  ItemBooking,
  VehicleBooking,
  FacilityFeedback,
  KinerjaFeedbackItem,
  MonthlyNeed,
  GKMAgreement,
  ScholarshipInfo,
  PerformanceMetric,
  WorkloadMetric,
  RealizationProgress,
  VisitorLog,
  SecurityShift,
  SecurityRosterItem,
  UserAccount,
  ActivityGalleryItem,
  RencanaLemburRow,
  RealisasiLemburItem,
  RealisasiGolonganItem,
  LemburUploadedFile,
  AlokasiBidangSection,
  AlokasiBidangDetailItem,
  RealisasiBidangRow
} from './types';

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getRelativeDateStr = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TODAY_STR = getTodayStr();
const YESTERDAY_STR = getRelativeDateStr(-1);
const TOMORROW_STR = getRelativeDateStr(1);

export const INITIAL_ROOM_BOOKINGS: RoomBooking[] = [
  {
    id: 'room-1',
    roomName: 'Aula Lancang Kuning',
    bookerName: 'Andi Wijaya',
    division: 'Bagian Umum',
    date: TODAY_STR,
    startTime: '08:30',
    endTime: '12:00',
    purpose: 'Rapat Koordinasi Wilayah Pelaksanaan Anggaran',
    equipmentNeeded: 'Sound System, Mic Wireless (2 pcs), Proyektor, Layar LED',
    status: 'Disetujui'
  },
  {
    id: 'room-2',
    roomName: 'Aula Zapin',
    bookerName: 'Siti Rahma',
    division: 'Bidang PPA I',
    date: TODAY_STR,
    startTime: '13:30',
    endTime: '15:30',
    purpose: 'Asistensi Penyusunan LKPD Pemerintah Daerah',
    equipmentNeeded: 'Proyektor Epson & Sound System',
    status: 'Disetujui'
  },
  {
    id: 'room-3',
    roomName: 'Soleram',
    bookerName: 'Rudi Hartono',
    division: 'Bidang SKKI',
    date: TOMORROW_STR,
    startTime: '09:00',
    endTime: '11:00',
    purpose: 'Review Internal Penilaian Kinerja Triwulan II',
    equipmentNeeded: 'Zoom Hybrid PC, Sound System, Mic Wireless',
    status: 'Pending'
  },
  {
    id: 'room-4',
    roomName: 'Gurindam',
    bookerName: 'Eka Lestari',
    division: 'Bidang PAPK',
    date: YESTERDAY_STR,
    startTime: '10:00',
    endTime: '11:30',
    purpose: 'Sharing Session Penggunaan Aplikasi SAKTI (Kemarin)',
    equipmentNeeded: 'Proyektor & Pointer Laser',
    status: 'Disetujui'
  }
];

export const INITIAL_ITEM_BOOKINGS: ItemBooking[] = [
  {
    id: 'item-1',
    itemName: 'Proyektor Epson 4K',
    bookerName: 'Andi Wijaya',
    division: 'Bagian Umum',
    date: TODAY_STR,
    quantity: 1,
    status: 'Dipinjam',
    statusNote: 'Barang siap diambil di Subbag Rumah Tangga.'
  },
  {
    id: 'item-2',
    itemName: 'Sound System Portable 100W',
    bookerName: 'Dewi Lestari',
    division: 'Bidang PAPK',
    date: TODAY_STR,
    quantity: 1,
    status: 'Dipinjam',
    statusNote: 'Barang siap diambil di Subbag Rumah Tangga.'
  },
  {
    id: 'item-3',
    itemName: 'Pointer Presentasi Logitech',
    bookerName: 'Siti Rahma',
    division: 'Bidang PPA I',
    date: YESTERDAY_STR,
    quantity: 1,
    status: 'Kembali',
    statusNote: 'Barang Sudah Dikembalikan.'
  },
  {
    id: 'item-4',
    itemName: 'Laptop Dinas Dell Latitude',
    bookerName: 'Hendra Saputra',
    division: 'Bidang PAPK',
    date: TOMORROW_STR,
    quantity: 2,
    status: 'Pending',
    statusNote: 'Menunggu Persetujuan Admin'
  }
];

export const INITIAL_VEHICLE_BOOKINGS: VehicleBooking[] = [
  {
    id: 'v-1',
    vehicleName: 'Toyota Kijang Innova BM 1679 T',
    plateNumber: 'BM 1679 T',
    driverName: 'Dengan Supir',
    driverOption: 'Dengan Supir',
    bookerName: 'Kepala Kanwil',
    destination: 'Kantor Gubernur Riau, Pekanbaru',
    date: TODAY_STR,
    startTime: '08:30',
    endTime: '12:00',
    durationDays: 1,
    status: 'Disetujui'
  },
  {
    id: 'v-2',
    vehicleName: 'Toyota Kijang Innova Reborn B 1932 PQS',
    plateNumber: 'B 1932 PQS',
    driverName: 'Dengan Supir',
    driverOption: 'Dengan Supir',
    bookerName: 'Tim PPA II',
    destination: 'KPPN Pekanbaru',
    date: TODAY_STR,
    startTime: '13:30',
    endTime: '17:00',
    durationDays: 1,
    status: 'Disetujui'
  },
  {
    id: 'v-3',
    vehicleName: 'Wuling Cortez BM 1888 T',
    plateNumber: 'BM 1888 T',
    driverName: 'Dengan Supir',
    driverOption: 'Dengan Supir',
    bookerName: 'Kabid PAPK',
    destination: 'Dinas Pengelola Keuangan Kabupaten Kampar',
    date: TOMORROW_STR,
    startTime: '08:00',
    endTime: '16:00',
    durationDays: 2,
    status: 'Pending'
  }
];

export const INITIAL_FACILITY_FEEDBACK: FacilityFeedback[] = [
  {
    id: 'f-1',
    category: 'AC',
    reporterName: 'Supriadi',
    reporterDivision: 'Bidang PPA II',
    description: 'AC di Ruang Rapat Melati kurang dingin, mohon dicek freonnya.',
    rating: 2,
    date: '2026-07-14',
    status: 'In Progress'
  },
  {
    id: 'f-2',
    category: 'Kebersihan',
    reporterName: 'Wulan',
    reporterDivision: 'Bidang PAPK',
    description: 'Tempat sampah di toilet lantai 2 sudah penuh dan belum dikosongkan.',
    rating: 3,
    date: '2026-07-14',
    status: 'Resolved'
  },
  {
    id: 'f-3',
    category: 'IT / Jaringan',
    reporterName: 'Rian',
    reporterDivision: 'Bidang SKKI',
    description: 'Koneksi internet Wi-Fi Kanwil-Public sering disconnect di pojok ruangan.',
    rating: 2,
    date: '2026-07-13',
    status: 'Open'
  },
  {
    id: 'f-4',
    category: 'Ruangan',
    reporterName: 'Aris',
    reporterDivision: 'Bagian Umum',
    description: 'Engsel pintu masuk Aula Lancang Kuning berbunyi derit keras saat dibuka.',
    rating: 4,
    date: '2026-07-12',
    status: 'Resolved'
  }
];

export const INITIAL_KINERJA_FEEDBACK: KinerjaFeedbackItem[] = [
  {
    id: 'kfb-1',
    no: 1,
    workspaceName: 'Dashboard Integrasi Layanan Kinerja',
    feedbackText: 'DILAN merupakan inovasi yang memberikan nilai tambah dalam efisiensi dan transparansi layanan kinerja di Kanwil DJPb Provinsi Riau.',
    date: '26 Juni 2026',
    authorName: 'Rahmat Hidayat',
    authorDivision: 'Bidang SKKI',
    rating: 5,
    status: 'Selesai',
    tindakLanjut: 'Terima kasih atas apresiasinya. Sistem DILAN terus dimonitor dan dikembangkan untuk pembaruan fitur analitik capaian IKU.',
    tindakLanjutBy: 'Tim Pengelola Kinerja Kanwil',
    tindakLanjutDate: '27 Juni 2026'
  },
  {
    id: 'kfb-2',
    no: 2,
    workspaceName: 'Dashboard Integrasi Layanan Kinerja',
    feedbackText: 'Dengan adanya Dashboard Integrasi Layanan Kinerja (DILAN), koordinasi antar bidang menjadi jauh lebih cepat dan terukur.',
    date: '24 Juni 2026',
    authorName: 'Dewi Lestari',
    authorDivision: 'Bidang PAPK',
    rating: 5,
    status: 'Selesai',
    tindakLanjut: 'Telah disosialisasikan tata cara pemanfaatan dashboard terintegrasi dalam GKM lingkup Kanwil Riau.',
    tindakLanjutBy: 'Subbagian Penilaian Kinerja',
    tindakLanjutDate: '25 Juni 2026'
  },
  {
    id: 'kfb-3',
    no: 3,
    workspaceName: 'Dashboard Integrasi Layanan Kinerja',
    feedbackText: 'DILAN memberikan kemudahan dalam memperoleh data capaian kinerja dan evaluasi secara terpusat.',
    date: '24 Juni 2026',
    authorName: 'Budi Santoso',
    authorDivision: 'Bidang PPA I',
    rating: 5,
    status: 'Dalam Proses',
    tindakLanjut: 'Sedang disiapkan integrasi tambahan data realisasi anggaran triwulan berjalan agar otomatis sinkron.',
    tindakLanjutBy: 'Admin Kinerja',
    tindakLanjutDate: '26 Juni 2026'
  },
  {
    id: 'kfb-4',
    no: 4,
    workspaceName: 'Dashboard Integrasi Layanan Kinerja',
    feedbackText: 'Tampilan dashboard sederhana, informatif, dan sangat membantu pegawai dalam memantau target IKU dan tugas.',
    date: '22 Juni 2026',
    authorName: 'Siti Rahmawati',
    authorDivision: 'Bidang PPA II',
    rating: 4,
    status: 'Selesai',
    tindakLanjut: 'Desain visual UI/UX telah dioptimalkan agar responsif pada berbagai ukuran layar monitor kerja.',
    tindakLanjutBy: 'Tim IT & Kinerja',
    tindakLanjutDate: '23 Juni 2026'
  },
  {
    id: 'kfb-5',
    no: 5,
    workspaceName: 'Dashboard Integrasi Layanan Kinerja',
    feedbackText: 'Dashboard Integrasi Layanan Kinerja sangat memudahkan pelaporan dan transparansi informasi di lingkungan Kanwil.',
    date: '22 Juni 2026',
    authorName: 'Ahmad Fauzi',
    authorDivision: 'Bagian Umum',
    rating: 5,
    status: 'Belum Ditindaklanjuti'
  }
];

export const INITIAL_MONTHLY_NEEDS: MonthlyNeed[] = [
  {
    id: 'need-1',
    itemName: 'Kertas HVS A4 80gr Sinar Dunia',
    category: 'ATK',
    quantity: 30,
    unit: 'Rim',
    estimatedPrice: 55000,
    urgency: 'Tinggi',
    status: 'Disetujui'
  },
  {
    id: 'need-2',
    itemName: 'Tinta Printer Epson L3110 Black original',
    category: 'ATK',
    quantity: 10,
    unit: 'Botol',
    estimatedPrice: 110000,
    urgency: 'Tinggi',
    status: 'Disetujui'
  },
  {
    id: 'need-3',
    itemName: 'Air Mineral Gelas AXO 240ml',
    category: 'Konsumsi',
    quantity: 25,
    unit: 'Dus',
    estimatedPrice: 28000,
    urgency: 'Sedang',
    status: 'Diusulkan'
  },
  {
    id: 'need-4',
    itemName: 'Kabel HDMI Gold Plated 5 Meter',
    category: 'Sarpras',
    quantity: 3,
    unit: 'Pcs',
    estimatedPrice: 125000,
    urgency: 'Rendah',
    status: 'Diusulkan'
  }
];

export const INITIAL_GKM_AGREEMENTS: GKMAgreement[] = [
  {
    id: 'gkm-1',
    roomAndMedia: 'LESTARI (Learning Station)',
    presenter: 'Nur Asri',
    topic: 'Sosialisasi Peraturan Implementasi Kinerja',
    date: '16 April 2026',
    startTime: '1:30:00 PM',
    endTime: '2:00:00 PM',
    pic: 'Bidang PAPK',
    participantsCount: 42,
    summary: 'Sosialisasi Peraturan Implementasi Kinerja Pegawai di lingkungan Kanwil DJPb Riau.'
  },
  {
    id: 'gkm-2',
    roomAndMedia: 'LESTARI (Learning Station)',
    presenter: 'Karno Pandu dan Dewi',
    topic: 'Peran penting inovasi di DJPb',
    date: '8 Juli 2026',
    startTime: '9:00:00 AM',
    endTime: '10:00:00 AM',
    pic: 'Bidang SKKI',
    participantsCount: 50,
    summary: 'Diskusi peran penting inovasi dan efisiensi tata kelola di DJPb.'
  },
  {
    id: 'gkm-3',
    roomAndMedia: 'LESTARI (Learning Station)',
    presenter: 'Ahmad Nauval dan Tim',
    topic: 'Layanan Umum Melalui Digitalisasi',
    date: '1 Juli 2026',
    startTime: '3:00:00 PM',
    endTime: '4:00:00 PM',
    pic: 'Bagian Umum',
    participantsCount: 38,
    summary: 'Pemaparan portal media layanan umum berbasis digital di Kanwil DJPb Riau.'
  }
];

export const INITIAL_SCHOLARSHIPS: ScholarshipInfo[] = [
  {
    id: 'sch-1',
    name: 'Beasiswa LPDP Kemenkeu - S2/S3 Dalam & Luar Negeri',
    provider: 'Lembaga Pengelola Dana Pendidikan',
    degree: 'S2',
    deadline: '2026-08-31',
    description: 'Program beasiswa penuh untuk PNS Kementerian Keuangan guna menempuh studi lanjut di universitas unggulan dunia.',
    eligibility: ['PNS Aktif minimal 2 tahun masa kerja', 'IPK minimal 3.00', 'TOEFL iBT 80 atau IELTS 6.5', 'Usia maksimal 37 tahun']
  },
  {
    id: 'sch-2',
    name: 'STIS (AAS) Australia Awards Scholarship',
    provider: 'Pemerintah Australia',
    degree: 'S2',
    deadline: '2026-09-15',
    description: 'Beasiswa dari Pemerintah Australia untuk pembangunan kapasitas SDM di bidang kebijakan publik, ekonomi keuangan, dan digitalisasi sektor publik.',
    eligibility: ['PNS Kemenkeu bidang terkait', 'IELTS minimal 6.0', 'Proposal riset / rencana kontribusi bagi instansi']
  }
];

export const INITIAL_PERFORMANCE_METRICS: PerformanceMetric[] = [
  { month: 'Jan', target: 92, realization: 94.5, gkmScore: 90 },
  { month: 'Feb', target: 92, realization: 93.8, gkmScore: 92 },
  { month: 'Mar', target: 92, realization: 95.2, gkmScore: 95 },
  { month: 'Apr', target: 94, realization: 94.1, gkmScore: 91 },
  { month: 'May', target: 94, realization: 96.0, gkmScore: 93 },
  { month: 'Jun', target: 94, realization: 97.4, gkmScore: 96 },
  { month: 'Jul', target: 95, realization: 96.8, gkmScore: 94 }
];

export const INITIAL_WORKLOAD_METRICS: WorkloadMetric[] = [
  { division: 'Bagian Umum', employeeCount: 12, activeTasks: 48, loadPercentage: 85 },
  { division: 'Bidang PPA I', employeeCount: 8, activeTasks: 32, loadPercentage: 78 },
  { division: 'Bidang PPA II', employeeCount: 9, activeTasks: 35, loadPercentage: 81 },
  { division: 'Bidang PAPK', employeeCount: 10, activeTasks: 42, loadPercentage: 88 },
  { division: 'Bidang SKKI', employeeCount: 6, activeTasks: 18, loadPercentage: 65 }
];

export const INITIAL_REALIZATION_PROGRESS: RealizationProgress[] = [
  { category: 'Belanja Pegawai', allocated: 8500000000, realized: 4675000000 },
  { category: 'Belanja Barang Operasional', allocated: 4200000000, realized: 2310000000 },
  { category: 'Belanja Barang Non-Operasional', allocated: 1800000000, realized: 980000000 },
  { category: 'Belanja Modal', allocated: 1200000000, realized: 450000000 }
];

export const INITIAL_VISITOR_LOGS: VisitorLog[] = [
  {
    id: 'vis-1',
    name: 'M. Yusuf',
    institution: 'BPKAD Provinsi Riau',
    purpose: 'Konsolidasi LKPD Unaudited',
    visitDate: '2026-07-15',
    visitTime: '09:15',
    destinationDivision: 'Bidang PAPK',
    keyCardNumber: 'CARD-04'
  },
  {
    id: 'vis-2',
    name: 'Siti Aminah',
    institution: 'KPPN Pekanbaru',
    purpose: 'Penyerahan Laporan Kepatuhan Internal',
    visitDate: '2026-07-15',
    visitTime: '10:30',
    destinationDivision: 'Bidang SKKI',
    keyCardNumber: 'CARD-12'
  }
];

export const INITIAL_SECURITY_SHIFTS: SecurityShift[] = [
  { day: 'Senin', shiftMorning: 'ARIEF / ROBBY', shiftEvening: 'ADITYA / ERWIN', shiftNight: 'RATMANSYAH / DIAN ARI' },
  { day: 'Selasa', shiftMorning: 'ROBBY / DIAN ARI', shiftEvening: 'ERWIN / RATMANSYAH', shiftNight: 'ARIEF / ADITYA' },
  { day: 'Rabu', shiftMorning: 'DIAN ARI / ADITYA', shiftEvening: 'RATMANSYAH / ARIEF', shiftNight: 'ROBBY / ERWIN' },
  { day: 'Kamis', shiftMorning: 'ADITYA / ERWIN', shiftEvening: 'ARIEF / ROBBY', shiftNight: 'DIAN ARI / RATMANSYAH' },
  { day: 'Jumat', shiftMorning: 'ERWIN / RATMANSYAH', shiftEvening: 'ROBBY / DIAN ARI', shiftNight: 'ADITYA / ARIEF' },
  { day: 'Sabtu', shiftMorning: 'RATMANSYAH / ARIEF', shiftEvening: 'DIAN ARI / ADITYA', shiftNight: 'ERWIN / ROBBY' },
  { day: 'Minggu', shiftMorning: 'ARIEF / ADITYA', shiftEvening: 'ERWIN / RATMANSYAH', shiftNight: 'ROBBY / DIAN ARI' }
];

const DAYS_OF_WEEK = ['SABTU', 'MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'];

// 6-day rotation patterns for security guard shifts:
// Position 1: KANWIL DJPB (06.00/18.00)
// Position 2: KANWIL DJPB (06.00/18.00)
// Position 3: KANWIL DJPB (18.00/06.00)
// Position 4: KANWIL DJPB (18.00/06.00)
// Position 5: RUMAH DINAS (18.00/06.00)
// Position 6: LIBUR (-)
const ROTATION_PATTERNS = [
  ['ARIEF', 'ROBBY', 'ADITYA', 'ERWIN', 'RATMANSYAH', 'DIAN ARI'],
  ['ROBBY', 'DIAN ARI', 'ERWIN', 'RATMANSYAH', 'ARIEF', 'ADITYA'],
  ['DIAN ARI', 'ADITYA', 'RATMANSYAH', 'ARIEF', 'ROBBY', 'ERWIN'],
  ['ADITYA', 'ERWIN', 'ARIEF', 'ROBBY', 'DIAN ARI', 'RATMANSYAH'],
  ['ERWIN', 'RATMANSYAH', 'ROBBY', 'DIAN ARI', 'ADITYA', 'ARIEF'],
  ['RATMANSYAH', 'ARIEF', 'DIAN ARI', 'ADITYA', 'ERWIN', 'ROBBY'],
];

const ID_DAY_NAMES = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

export function generateOctoberSecurityRoster(): SecurityRosterItem[] {
  const roster: SecurityRosterItem[] = [];
  let idCounter = 1;

  for (let day = 1; day <= 31; day++) {
    // 2026-10-01 is a Thursday (KAMIS)
    const d = new Date(2026, 9, day);
    const dayOfWeek = ID_DAY_NAMES[d.getDay()];
    const dateStr = `${dayOfWeek}/ ${day} Oktober 2026`;
    const pattern = ROTATION_PATTERNS[(day - 1) % 6];

    roster.push(
      { id: `ros-${String(idCounter).padStart(3, '0')}`, orderIndex: idCounter - 1, name: pattern[0], dateStr, location: 'KANWIL DJPB', hours: '06.00/18.00' },
      { id: `ros-${String(idCounter + 1).padStart(3, '0')}`, orderIndex: idCounter, name: pattern[1], dateStr, location: 'KANWIL DJPB', hours: '06.00/18.00' },
      { id: `ros-${String(idCounter + 2).padStart(3, '0')}`, orderIndex: idCounter + 1, name: pattern[2], dateStr, location: 'KANWIL DJPB', hours: '18.00/06.00' },
      { id: `ros-${String(idCounter + 3).padStart(3, '0')}`, orderIndex: idCounter + 2, name: pattern[3], dateStr, location: 'KANWIL DJPB', hours: '18.00/06.00' },
      { id: `ros-${String(idCounter + 4).padStart(3, '0')}`, orderIndex: idCounter + 3, name: pattern[4], dateStr, location: 'RUMAH DINAS', hours: '18.00/06.00' },
      { id: `ros-${String(idCounter + 5).padStart(3, '0')}`, orderIndex: idCounter + 4, name: pattern[5], dateStr, location: 'LIBUR', hours: '-' }
    );
    idCounter += 6;
  }

  return roster;
}

export function generateAugustSecurityRoster(): SecurityRosterItem[] {
  const roster: SecurityRosterItem[] = [];
  let idCounter = 1;

  for (let day = 1; day <= 31; day++) {
    const dayOfWeek = DAYS_OF_WEEK[(day - 1) % 7];
    const dateStr = `${dayOfWeek}/ ${day} Agustus 2026`;
    const pattern = ROTATION_PATTERNS[(day - 1) % 6];

    roster.push(
      { id: `ros-aug-${String(idCounter).padStart(3, '0')}`, orderIndex: idCounter - 1, name: pattern[0], dateStr, location: 'KANWIL DJPB', hours: '06.00/18.00' },
      { id: `ros-aug-${String(idCounter + 1).padStart(3, '0')}`, orderIndex: idCounter, name: pattern[1], dateStr, location: 'KANWIL DJPB', hours: '06.00/18.00' },
      { id: `ros-aug-${String(idCounter + 2).padStart(3, '0')}`, orderIndex: idCounter + 1, name: pattern[2], dateStr, location: 'KANWIL DJPB', hours: '18.00/06.00' },
      { id: `ros-aug-${String(idCounter + 3).padStart(3, '0')}`, orderIndex: idCounter + 2, name: pattern[3], dateStr, location: 'KANWIL DJPB', hours: '18.00/06.00' },
      { id: `ros-aug-${String(idCounter + 4).padStart(3, '0')}`, orderIndex: idCounter + 3, name: pattern[4], dateStr, location: 'RUMAH DINAS', hours: '18.00/06.00' },
      { id: `ros-aug-${String(idCounter + 5).padStart(3, '0')}`, orderIndex: idCounter + 4, name: pattern[5], dateStr, location: 'LIBUR', hours: '-' }
    );
    idCounter += 6;
  }

  return roster;
}

export const INITIAL_SECURITY_ROSTER: SecurityRosterItem[] = generateOctoberSecurityRoster();

export const INITIAL_USERS: UserAccount[] = [
  { id: 'ADM-001', employeeId: 'ADM-001', fullName: 'Administrator Bagian Umum', username: 'admin', password: '123', role: 'Administrator', status: 'Aktif' },
  { id: 'UMUM-001', employeeId: 'UMUM-001', fullName: 'Pegawai Bagian Umum', username: 'umum', password: '123', role: 'Pegawai', status: 'Aktif' },
  { id: 'USER-001', employeeId: 'USER-001', fullName: 'User Pegawai Kanwil', username: 'user', password: '123', role: 'Pegawai', status: 'Aktif' },
  { id: 'KPPN-001', employeeId: 'KPPN-001', fullName: 'Mitra KPPN Riau', username: 'kppn', password: '123', role: 'KPPN', status: 'Aktif' },
  { id: 'PEG-001', employeeId: 'PEG-001', fullName: 'DWI SUPRIYONO', username: 'dwi', password: 'dwi123', role: 'Administrator', status: 'Aktif' },
  { id: 'PEG-002', employeeId: 'PEG-002', fullName: 'SEPTINA PUSPA PRABOWO', username: 'septina', password: 'septina123', role: 'Pegawai', status: 'Aktif' },
  { id: 'PEG-003', employeeId: 'PEG-003', fullName: 'ABDUL AZIZ KUSBIANTORO', username: 'aziz', password: 'user123', role: 'Pegawai', status: 'Aktif' },
  { id: 'PEG-004', employeeId: 'PEG-004', fullName: 'ANDHI WIBOWO', username: 'andhi', password: 'user123', role: 'Pegawai', status: 'Aktif' },
  { id: 'PEG-005', employeeId: 'PEG-005', fullName: 'BUDI SANTOSO', username: 'budi', password: 'user123', role: 'Pegawai', status: 'Aktif' },
  { id: 'PEG-006', employeeId: 'PEG-006', fullName: 'SITI AMINAH', username: 'siti', password: 'user123', role: 'Pegawai', status: 'Aktif' },
  { id: 'PEG-007', employeeId: 'PEG-007', fullName: 'HENDRA WIJAYA', username: 'hendra', password: 'user123', role: 'Pegawai', status: 'Aktif' },
  { id: 'PEG-008', employeeId: 'PEG-008', fullName: 'RINA WATI', username: 'rina', password: 'user123', role: 'Pegawai', status: 'Aktif' },
  { id: 'PEG-009', employeeId: 'PEG-009', fullName: 'AHMAD FAUZI', username: 'ahmad', password: 'user123', role: 'Pegawai', status: 'Aktif' },
];

export const INITIAL_ACTIVITY_GALLERY: ActivityGalleryItem[] = [
  {
    id: 'act-001',
    title: 'Rapat Koordinasi Daerah (RAKORDA) Pelaksanaan Anggaran Kanwil DJPb Riau TA 2026',
    date: '2026-08-10',
    division: 'Bidang PPA I & Bagian Umum',
    mediaType: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&w=1200&q=80',
    additionalPhotos: [
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80'
    ],
    category: 'Rapat & Forum',
    narration: 'Kanwil Ditjen Perbendaharaan Provinsi Riau menyelenggarakan Rapat Koordinasi Daerah (RAKORDA) Pelaksanaan Anggaran Semester I Tahun 2026 di Aula Lancang Kuning. Acara dihadiri oleh seluruh pimpinan Satker mitra kerja dan KPPN se-wilayah Riau guna memperkuat sinergi akselerasi belanja negara yang akuntabel, tepat sasaran, serta berdaya dorong optimal bagi pertumbuhan ekonomi daerah.',
    authorName: 'Tim Humas & TI Kanwil DJPb Riau',
    createdAt: '2026-08-10T14:30:00Z',
    location: 'Aula Lancang Kuning, Kanwil DJPb Prov. Riau',
    tags: ['Rakorda', 'IKPA', 'Perbendaharaan', 'APBN']
  },
  {
    id: 'act-002',
    title: 'Gugus Kendali Mutu (GKM) Internalisasi Budaya Kerja BerAKHLAK & Zona Integritas WBBM',
    date: '2026-08-08',
    division: 'Subbagian Kepegawaian & SKKI',
    mediaType: 'video',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80',
    category: 'GKM Kepegawaian',
    narration: 'Kegiatan rutin Gugus Kendali Mutu (GKM) yang diinisiasi oleh Subbagian Kepegawaian dan Tim Pembangunan ZI-WBBM. Mengusung tema "Penguatan Integritas dan Pelayanan Prima", kegiatan ini mempertegas komitmen seluruh pejabat dan pegawai dalam menerapkan nilai-nilai BerAKHLAK serta menolak gratifikasi dalam seluruh rantai layanan publik.',
    authorName: 'Septina Puspa Prabowo',
    createdAt: '2026-08-08T10:15:00Z',
    location: 'Ruang Rapat Zapin & Media Zoom Hybrid',
    tags: ['GKM', 'BerAKHLAK', 'WBBM', 'Kepegawaian']
  },
  {
    id: 'act-003',
    title: 'Sosialisasi Digitalisasi Pembayaran & Penguatan Kartu Kredit Pemerintah (KKP) Domestik',
    date: '2026-08-04',
    division: 'Bidang PPA II & KPPN Pekanbaru',
    mediaType: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80',
    category: 'Sosialisasi & Edukasi',
    narration: 'Bimbingan teknis dan sosialisasi implementasi KKP Domestik serta optimalisasi platform Digipay Satu bersama Pejabat Pembuat Komitmen (PPK) dan Bendahara Pengeluaran satuan kerja kementerian/lembaga. Langkah ini mempercepat modernisasi transaksi non-tunai pemerintah dan memberdayakan UMKM lokal.',
    authorName: 'Bidang PPA II',
    createdAt: '2026-08-04T16:00:00Z',
    location: 'Hotel Pangeran Pekanbaru',
    tags: ['KKP', 'Digipay', 'Digitalisasi', 'Cashless']
  },
  {
    id: 'act-004',
    title: 'Bakti Sosial & Santunan Peduli Kemenkeu Satu Riau Menyambut Hari Kemerdekaan RI',
    date: '2026-08-02',
    division: 'Dharma Wanita Persatuan (DWP) & Bagian Umum',
    mediaType: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80',
    category: 'Bakti Sosial & Dharma Wanita',
    narration: 'Dalam rangka memeriahkan peringatan Kemerdekaan Republik Indonesia, DWP Kanwil DJPb Provinsi Riau menggelar aksi kepedulian sosial berupa penyerahan puluhan paket sembako dan perlengkapan sekolah bagi anak-anak di panti asuhan serta warga sekitar, sebagai wujud nyata bakti sosial Kemenkeu Mengabdi.',
    authorName: 'Pengurus DWP DJPb Riau',
    createdAt: '2026-08-02T11:45:00Z',
    location: 'Panti Asuhan Fajar Harapan, Pekanbaru',
    tags: ['Bakti Sosial', 'DWP', 'Kemenkeu Mengabdi', 'HUT RI']
  },
  {
    id: 'act-005',
    title: 'Senam Kebugaran Jasmani Bersama & Turnamen Olahraga Insan Perbendaharaan Riau',
    date: '2026-07-31',
    division: 'Bapor DJPb Riau & Bagian Umum',
    mediaType: 'video',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1200&q=80',
    category: 'Olahraga & Seni',
    narration: 'Guna menjaga kesehatan raga, semangat kerja, dan keakraban antar pegawai, Kanwil DJPb Riau menggelar senam kesegaran jasmani bersama yang diikuti antusias oleh seluruh staf dan pejabat struktural di lapangan terbuka kantor, dirangkaikan dengan laga persahabatan tenis meja dan bulutangkis.',
    authorName: 'Tim Bapor Kanwil DJPb Riau',
    createdAt: '2026-07-31T08:30:00Z',
    location: 'Halaman & Lapangan Kanwil DJPb Riau',
    tags: ['Senam Sehat', 'Olahraga', 'WorkLifeBalance', 'Kebersamaan']
  },
  {
    id: 'act-006',
    title: 'Kunjungan Kerja Edukatif & Pembinaan Pengelolaan Keuangan Desa di Kabupaten Kampar',
    date: '2026-07-25',
    division: 'Bidang PAPK & Tim Monev Desa',
    mediaType: 'photo',
    mediaUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80',
    category: 'Kunjungan Kerja',
    narration: 'Tim Monitoring dan Evaluasi Penyaluran Transfer ke Daerah (TKD) Kanwil DJPb Riau melakukan kunjungan kerja lapangan dan asistensi pengelolaan Dana Desa kepada perangkat desa di Kabupaten Kampar untuk memastikan transparansi realisasi dan ketepatan pemanfaatan dana bagi kesejahteraan masyarakat.',
    authorName: 'Bidang PAPK',
    createdAt: '2026-07-25T15:20:00Z',
    location: 'Kantor Bupati Kampar & Balai Desa Mitra',
    tags: ['TKD', 'Dana Desa', 'Kunjungan Kerja', 'Monev']
  }
];


export const INITIAL_DAMS_TASKS = [
  {
    id: 'dams-1',
    no: 1,
    perihal: 'Penyusunan Laporan Kinerja Bulanan Kanwil',
    uraian: 'Pengumpulan data capaian IKU dan matriks capaian kinerja Kanwil DJPb Riau.',
    output: 'Dokumen Laporan Kinerja',
    pj: 'Subbagian Penilaian Kinerja',
    deadline: 'Agustus 2026',
    status: 'Selesai' as const
  },
  {
    id: 'dams-2',
    no: 2,
    perihal: 'Rekonsiliasi Beban Kerja Triwulanan',
    uraian: 'Verifikasi pemenuhan target ABK dan perhitungan formasi kebutuhan pegawai.',
    output: 'Matriks Formasi Pegawai',
    pj: 'Subbagian Kepegawaian',
    deadline: 'Agustus 2026',
    status: 'On Progress' as const
  },
  {
    id: 'dams-3',
    no: 3,
    perihal: 'Penyusunan Bahan Rapat DAMS Pimpinan',
    uraian: 'Penyiapan slide materi dan kompilasi kendala strategis unit eselon III.',
    output: 'Bahan Tayang Paparan',
    pj: 'Bidang SKKI',
    deadline: 'Agustus 2026',
    status: 'On Progress' as const
  }
];

export const INITIAL_PROCUREMENTS = [
  { id: 1, item: 'PC Workstation Core i7 KPPN Riau', qty: 15, estimatedBudget: 225000000, targetMonth: 'Agustus 2026', progress: 100, status: 'Selesai' },
  { id: 2, item: 'Kursi Rapat Aula Lancang Kuning Ergonomis', qty: 120, estimatedBudget: 180000000, targetMonth: 'September 2026', progress: 40, status: 'Proses Lelang' },
  { id: 3, item: 'Renovasi Interior Lobi Pelayanan Digital', qty: 1, estimatedBudget: 350000000, targetMonth: 'Oktober 2026', progress: 10, status: 'Persiapan Dokumen' },
  { id: 4, item: 'Pengadaan AC Standing Floor 5 PK', qty: 4, estimatedBudget: 120000000, targetMonth: 'November 2026', progress: 0, status: 'Direncanakan' }
];

export const INITIAL_CEK_SERIBU_CERTS = [
  {
    id: 'cert-1',
    fileName: 'Dokumen_CekSeribu_Presensi_Kanwil.jpg',
    fileSize: '420 KB',
    imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800',
    employeeName: 'Andi Wijaya, S.E.',
    uploadDate: '22-07-2026',
    checkInTime: '07:25 WIB',
    checkOutTime: '17:05 WIB',
    createdBy: 'Admin Kepegawaian',
    status: 'Cek Seribu Valid'
  },
  {
    id: 'cert-2',
    fileName: 'Dokumen_CekSeribu_Presensi_Kanwil.jpg',
    fileSize: '420 KB',
    imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800',
    employeeName: 'Siti Rahma, M.Acc.',
    uploadDate: '23-07-2026',
    checkInTime: '07:30 WIB',
    checkOutTime: '17:00 WIB',
    createdBy: 'Admin Kepegawaian',
    status: 'Cek Seribu Valid'
  },
  {
    id: 'cert-3',
    fileName: 'Dokumen_CekSeribu_Presensi_Kanwil.jpg',
    fileSize: '420 KB',
    imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800',
    employeeName: 'Bambang Haryono, M.Si.',
    uploadDate: '24-07-2026',
    checkInTime: '07:28 WIB',
    checkOutTime: '17:10 WIB',
    createdBy: 'Admin Kepegawaian',
    status: 'Cek Seribu Valid'
  },
  {
    id: 'cert-4',
    fileName: 'Dokumen_CekSeribu_Presensi_Kanwil.jpg',
    fileSize: '420 KB',
    imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800',
    employeeName: 'Dewanti Putri, S.E.',
    uploadDate: '27-07-2026',
    checkInTime: '07:35 WIB',
    checkOutTime: '16:55 WIB',
    createdBy: 'Admin Kepegawaian',
    status: 'Cek Seribu Valid'
  }
];

// Helper to convert formatted currency
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
}

// Helper to format IDR without currency symbol (e.g. 447.000)
export function formatNumberIDR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  if (amount === 0) return '0';
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0
  }).format(amount);
}

// ==========================================
// RENCANA LEMBUR KANWIL DJPB RIAU TAHUN 2026
// (Berdasarkan Dokumen Subbagian Keuangan 2026)
// ==========================================
export const INITIAL_RENCANA_LEMBUR_2026: RencanaLemburRow[] = [
  {
    id: 'lembur-kakanwil',
    bidang: 'Kakanwil',
    namaLengkap: 'Pimpinan / Kepala Kanwil DJPb Riau',
    jan: 0,
    feb: 0,
    mar: 0,
    apr: 447000,
    mei: 447000,
    jun: 447000,
    jul: 447000,
    agu: 447000,
    sep: 447000,
    okt: 256000,
    nov: null,
    des: null,
    total: 2938000,
    alokasi2026: 2938000,
    highlightMonths: ['jul', 'agu', 'sep']
  },
  {
    id: 'lembur-umum',
    bidang: 'Umum',
    namaLengkap: 'Bagian Umum Kanwil DJPb Riau',
    jan: 5901000,
    feb: 2139000,
    mar: 5012000,
    apr: 3809000,
    mei: 1071200,
    jun: 1071200,
    jul: 2000000,
    agu: 1023600,
    sep: 2225000,
    okt: 2225000,
    nov: null,
    des: null,
    total: 26477000,
    alokasi2026: 26702000,
    highlightMonths: ['agu', 'sep']
  },
  {
    id: 'lembur-pai',
    bidang: 'PA I',
    namaLengkap: 'Bidang Pembinaan Pelaksanaan Anggaran I',
    jan: 0,
    feb: 2068000,
    mar: 3178000,
    apr: 2445000,
    mei: 4890000,
    jun: 2445000,
    jul: 3042000,
    agu: 2181000,
    sep: 1773000,
    okt: 0,
    nov: null,
    des: null,
    total: 22022000,
    alokasi2026: 22022000,
    highlightMonths: ['jul', 'agu', 'sep']
  },
  {
    id: 'lembur-ppaii',
    bidang: 'PPA II',
    namaLengkap: 'Bidang Pembinaan Pelaksanaan Anggaran II',
    jan: 1071200,
    feb: 3213600,
    mar: 1071200,
    apr: 2142400,
    mei: 2142400,
    jun: 1071200,
    jul: 3213600,
    agu: 3213600,
    sep: 2142400,
    okt: 2142400,
    nov: null,
    des: null,
    total: 21424000,
    alokasi2026: 21424000,
    highlightMonths: ['agu', 'sep']
  },
  {
    id: 'lembur-papk',
    bidang: 'PAPK',
    namaLengkap: 'Bidang Pembinaan Akuntansi dan Pelaporan Keuangan',
    jan: 107000,
    feb: 1266000,
    mar: 1323000,
    apr: 2356000,
    mei: 1058000,
    jun: 1400000,
    jul: 2596000,
    agu: 2343000,
    sep: 1723000,
    okt: 1854000,
    nov: 1074000,
    des: 963000,
    total: 18063000,
    alokasi2026: 17382000,
    highlightMonths: ['agu', 'sep']
  },
  {
    id: 'lembur-skki',
    bidang: 'SKKI',
    namaLengkap: 'Bidang Supervisi KPPN dan Kepatuhan Internal',
    jan: 4336000,
    feb: 431000,
    mar: 681000,
    apr: 2594000,
    mei: 681000,
    jun: 2702000,
    jul: 3365000,
    agu: 454000,
    sep: 681000,
    okt: 232000,
    nov: null,
    des: null,
    total: 16157000,
    alokasi2026: 16978000,
    highlightMonths: ['agu', 'sep']
  }
];

// ==========================================
// REALISASI ANGGARAN LEMBUR KANWIL DJPB RIAU
// ==========================================
export const INITIAL_REALISASI_LEMBUR: RealisasiLemburItem[] = [
  {
    id: 'real-lbr-01',
    bidang: 'Bagian Umum',
    bulan: 'Januari 2026',
    nomorSP2D: '26019010001238',
    tanggalSP2D: '05 Februari 2026',
    uraian: 'Pembayaran Uang Lembur dan Uang Makan Lembur Bagian Umum Kanwil DJPb Riau Bulan Januari 2026',
    jumlahPenerima: 14,
    jumlahJam: 132,
    uangLembur: 4250000,
    uangMakanLembur: 1651000,
    totalRealisasi: 5901000,
    status: 'Selesai Dibayar',
    lampiranName: 'SP2D_Lembur_Umum_Jan2026.pdf',
    lampiranSize: '1.2 MB',
    createdBy: 'Bendahara Pengeluaran'
  },
  {
    id: 'real-lbr-02',
    bidang: 'Bidang SKKI',
    bulan: 'Januari 2026',
    nomorSP2D: '26019010001245',
    tanggalSP2D: '06 Februari 2026',
    uraian: 'Pembayaran Uang Lembur Evaluasi Kepatuhan Internal Awal Tahun Bulan Januari 2026',
    jumlahPenerima: 9,
    jumlahJam: 98,
    uangLembur: 3120000,
    uangMakanLembur: 1216000,
    totalRealisasi: 4336000,
    status: 'Selesai Dibayar',
    lampiranName: 'SP2D_Lembur_SKKI_Jan2026.pdf',
    lampiranSize: '950 KB',
    createdBy: 'Bendahara Pengeluaran'
  },
  {
    id: 'real-lbr-03',
    bidang: 'Bidang PPA II',
    bulan: 'Januari 2026',
    nomorSP2D: '26019010001250',
    tanggalSP2D: '06 Februari 2026',
    uraian: 'Pembayaran Lembur Rekonsiliasi Penyaluran DAK Fisik & Dana Desa Bulan Januari 2026',
    jumlahPenerima: 4,
    jumlahJam: 24,
    uangLembur: 771200,
    uangMakanLembur: 300000,
    totalRealisasi: 1071200,
    status: 'Selesai Dibayar',
    lampiranName: 'SP2D_PPA2_Jan2026.pdf',
    lampiranSize: '820 KB',
    createdBy: 'Bendahara Pengeluaran'
  },
  {
    id: 'real-lbr-04',
    bidang: 'Bidang PAPK',
    bulan: 'Januari 2026',
    nomorSP2D: '26019010001255',
    tanggalSP2D: '09 Februari 2026',
    uraian: 'Pembayaran Uang Lembur Monitoring Penyusunan LKPP Awal 2026',
    jumlahPenerima: 1,
    jumlahJam: 3,
    uangLembur: 77000,
    uangMakanLembur: 30000,
    totalRealisasi: 107000,
    status: 'Selesai Dibayar',
    lampiranName: 'SP2D_PAPK_Jan2026.pdf',
    lampiranSize: '650 KB',
    createdBy: 'Bendahara Pengeluaran'
  },
  {
    id: 'real-lbr-05',
    bidang: 'Bidang PPA I',
    bulan: 'Februari 2026',
    nomorSP2D: '26019010002110',
    tanggalSP2D: '04 Maret 2026',
    uraian: 'Pembayaran Uang Lembur Percepatan Evaluasi Kinerja Anggaran K/L Bulan Februari 2026',
    jumlahPenerima: 6,
    jumlahJam: 46,
    uangLembur: 1488000,
    uangMakanLembur: 580000,
    totalRealisasi: 2068000,
    status: 'Selesai Dibayar',
    lampiranName: 'SP2D_Lembur_PPA1_Feb2026.pdf',
    lampiranSize: '1.1 MB',
    createdBy: 'Bendahara Pengeluaran'
  },
  {
    id: 'real-lbr-06',
    bidang: 'Bidang PPA II',
    bulan: 'Februari 2026',
    nomorSP2D: '26019010002118',
    tanggalSP2D: '05 Maret 2026',
    uraian: 'Pembayaran Uang Lembur Monev TKD dan Alokasi Transfer Daerah Februari 2026',
    jumlahPenerima: 8,
    jumlahJam: 72,
    uangLembur: 2313600,
    uangMakanLembur: 900000,
    totalRealisasi: 3213600,
    status: 'Selesai Dibayar',
    lampiranName: 'SP2D_Lembur_PPA2_Feb2026.pdf',
    lampiranSize: '980 KB',
    createdBy: 'Bendahara Pengeluaran'
  },
  {
    id: 'real-lbr-07',
    bidang: 'Bagian Umum',
    bulan: 'Maret 2026',
    nomorSP2D: '26019010003055',
    tanggalSP2D: '06 April 2026',
    uraian: 'Pembayaran Lembur Rekapitulasi Laporan Keuangan TW I dan Pengadaan Bagian Umum',
    jumlahPenerima: 12,
    jumlahJam: 112,
    uangLembur: 3612000,
    uangMakanLembur: 1400000,
    totalRealisasi: 5012000,
    status: 'Selesai Dibayar',
    lampiranName: 'SP2D_Umum_Mar2026.pdf',
    lampiranSize: '1.4 MB',
    createdBy: 'Bendahara Pengeluaran'
  },
  {
    id: 'real-lbr-08',
    bidang: 'Bidang PPA I',
    bulan: 'Mei 2026',
    nomorSP2D: '26019010005120',
    tanggalSP2D: '05 Juni 2026',
    uraian: 'Pembayaran Lembur Penyusunan Kajian Fiskal Regional (KFR) Triwulan I & Mid-Year Review 2026',
    jumlahPenerima: 11,
    jumlahJam: 110,
    uangLembur: 3520000,
    uangMakanLembur: 1370000,
    totalRealisasi: 4890000,
    status: 'Selesai Dibayar',
    lampiranName: 'SP2D_KFR_Mei2026.pdf',
    lampiranSize: '1.3 MB',
    createdBy: 'Bendahara Pengeluaran'
  },
  {
    id: 'real-lbr-09',
    bidang: 'Bidang SKKI',
    bulan: 'Juni 2026',
    nomorSP2D: '26019010006090',
    tanggalSP2D: '03 Juli 2026',
    uraian: 'Pembayaran Uang Lembur Penilaian Maturitas SPIP & Audit Internal Semester I',
    jumlahPenerima: 7,
    jumlahJam: 61,
    uangLembur: 1952000,
    uangMakanLembur: 750000,
    totalRealisasi: 2702000,
    status: 'Selesai Dibayar',
    lampiranName: 'SP2D_SKKI_Jun2026.pdf',
    lampiranSize: '890 KB',
    createdBy: 'Bendahara Pengeluaran'
  },
  {
    id: 'real-lbr-10',
    bidang: 'Bidang PAPK',
    bulan: 'Juli 2026',
    nomorSP2D: '26019010007015',
    tanggalSP2D: '04 Agustus 2026',
    uraian: 'Pembayaran Uang Lembur Penyusunan Laporan Keuangan Semester I Kanwil DJPb Riau Tahun 2026',
    jumlahPenerima: 6,
    jumlahJam: 58,
    uangLembur: 1876000,
    uangMakanLembur: 720000,
    totalRealisasi: 2596000,
    status: 'Selesai Dibayar',
    lampiranName: 'SP2D_PAPK_Jul2026.pdf',
    lampiranSize: '1.2 MB',
    createdBy: 'Bendahara Pengeluaran'
  },
  {
    id: 'real-lbr-11',
    bidang: 'Kakanwil',
    bulan: 'Juli 2026',
    nomorSP2D: '26019010007022',
    tanggalSP2D: '05 Agustus 2026',
    uraian: 'Pembayaran Lembur Pengawalan Kegiatan Pimpinan & Koordinasi Forkopimda Bulan Juli 2026',
    jumlahPenerima: 2,
    jumlahJam: 10,
    uangLembur: 327000,
    uangMakanLembur: 120000,
    totalRealisasi: 447000,
    status: 'Selesai Dibayar',
    lampiranName: 'SP2D_Kakanwil_Jul2026.pdf',
    lampiranSize: '750 KB',
    createdBy: 'Bendahara Pengeluaran'
  },
  {
    id: 'real-lbr-12',
    bidang: 'Bidang PPA I',
    bulan: 'Juli 2026',
    nomorSP2D: '26019010007040',
    tanggalSP2D: '06 Agustus 2026',
    uraian: 'Pembayaran Uang Lembur Monitoring Evaluasi Belanja K/L Semester I 2026',
    jumlahPenerima: 7,
    jumlahJam: 68,
    uangLembur: 2192000,
    uangMakanLembur: 850000,
    totalRealisasi: 3042000,
    status: 'Selesai Dibayar',
    lampiranName: 'SP2D_PPA1_Jul2026.pdf',
    lampiranSize: '1.0 MB',
    createdBy: 'Bendahara Pengeluaran'
  }
];

// ==========================================
// DAFTAR FILE & DOKUMEN UPLOAD LEMBUR
// ==========================================
export const INITIAL_LEMBUR_UPLOADED_FILES: LemburUploadedFile[] = [
  {
    id: 'fl-lbr-01',
    fileName: 'Rencana_Lembur_Kanwil_DJPb_Riau_Tahun_2026_Final.xlsx',
    fileSize: '425 KB',
    fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    kategori: 'File Rencana Excel Lembur 2026',
    bidang: 'Semua Bidang / Bagian',
    bulan: 'Tahun 2026',
    tahun: 2026,
    keterangan: 'Matriks alokasi rencana lembur per unit bidang/bagian tahun anggaran 2026 disetujui KPA.',
    uploadedBy: 'Subbagian Keuangan',
    uploadedAt: '12 Januari 2026 09:30 WIB'
  },
  {
    id: 'fl-lbr-02',
    fileName: 'SPL_Lembur_LK_Semester_I_PAPK_2026.pdf',
    fileSize: '1.8 MB',
    fileType: 'application/pdf',
    kategori: 'Surat Perintah Lembur (SPL)',
    bidang: 'Bidang PAPK',
    bulan: 'Juli',
    tahun: 2026,
    keterangan: 'Surat Perintah Lembur (SPL) Penyusunan Laporan Keuangan Semester I Kanwil DJPb Riau Tahun 2026.',
    uploadedBy: 'Operator PAPK',
    uploadedAt: '24 Juli 2026 14:15 WIB'
  },
  {
    id: 'fl-lbr-03',
    fileName: 'Daftar_Hadir_Absensi_Lembur_KFR_PPA1_Mei2026.pdf',
    fileSize: '2.1 MB',
    fileType: 'application/pdf',
    kategori: 'Daftar Hadir & Absensi Lembur',
    bidang: 'Bidang PPA I',
    bulan: 'Mei',
    tahun: 2026,
    keterangan: 'Rekapitulasi presensi finger print dan tanda tangan lembur penyusunan KFR Mei 2026.',
    uploadedBy: 'Admin PPA I',
    uploadedAt: '28 Mei 2026 17:00 WIB'
  },
  {
    id: 'fl-lbr-04',
    fileName: 'Rekap_SP2D_Realisasi_Lembur_Semester_I_2026.pdf',
    fileSize: '3.4 MB',
    fileType: 'application/pdf',
    kategori: 'Rekap Realisasi SP2D Lembur',
    bidang: 'Semua Bidang / Bagian',
    bulan: 'Semester I',
    tahun: 2026,
    keterangan: 'Laporan rekapitulasi pencairan SP2D uang lembur dan uang makan lembur periode Jan-Jun 2026.',
    uploadedBy: 'Bendahara Pengeluaran',
    uploadedAt: '08 Juli 2026 11:20 WIB'
  }
];

// =========================================================================
// REALISASI ANGGARAN LEMBUR TA 2026 (FORMAT TABEL GOLONGAN SESUAI DOKUMEN)
// =========================================================================
export const INITIAL_REALISASI_GOLONGAN_2026: RealisasiGolonganItem[] = [
  {
    id: 'gol-2',
    golongan: 'Golongan II',
    jan: { lembur: null, makanLembur: null },
    feb: { lembur: 3576000, makanLembur: 945000 },
    mar: { lembur: 2928000, makanLembur: 700000 },
    apr: { lembur: 3264000, makanLembur: 805000 },
    mei: { lembur: 3696000, makanLembur: 945000 },
    jun: { lembur: 3864000, makanLembur: 805000 },
    jul: { lembur: 2592000, makanLembur: 595000 },
    agu: { lembur: 5544000, makanLembur: 1295000 },
    sep: { lembur: null, makanLembur: null },
    okt: { lembur: null, makanLembur: null },
    nov: { lembur: null, makanLembur: null },
    des: { lembur: null, makanLembur: null }
  },
  {
    id: 'gol-3',
    golongan: 'Golongan III',
    jan: { lembur: null, makanLembur: null },
    feb: { lembur: 5490000, makanLembur: 1443000 },
    mar: { lembur: 5040000, makanLembur: 1110000 },
    apr: { lembur: 5040000, makanLembur: 999000 },
    mei: { lembur: 4290000, makanLembur: 888000 },
    jun: { lembur: 8820000, makanLembur: 1776000 },
    jul: { lembur: 4260000, makanLembur: 851000 },
    agu: { lembur: 3690000, makanLembur: 814000 },
    sep: { lembur: null, makanLembur: null },
    okt: { lembur: null, makanLembur: null },
    nov: { lembur: null, makanLembur: null },
    des: { lembur: null, makanLembur: null }
  },
  {
    id: 'gol-4',
    golongan: 'Golongan IV',
    jan: { lembur: null, makanLembur: null },
    feb: { lembur: 1224000, makanLembur: 287000 },
    mar: { lembur: 1728000, makanLembur: 328000 },
    apr: { lembur: 828000, makanLembur: 246000 },
    mei: { lembur: 1008000, makanLembur: 287000 },
    jun: { lembur: 1584000, makanLembur: 410000 },
    jul: { lembur: 864000, makanLembur: 287000 },
    agu: { lembur: 720000, makanLembur: 205000 },
    sep: { lembur: null, makanLembur: null },
    okt: { lembur: null, makanLembur: null },
    nov: { lembur: null, makanLembur: null },
    des: { lembur: null, makanLembur: null }
  }
];

// =========================================================================
// ALOKASI ANGGARAN LEMBUR PER BIDANG/BAGIAN TA 2026 (SESUAI DOKUMEN RESMI)
// =========================================================================
export const INITIAL_ALOKASI_BIDANG_2026: AlokasiBidangSection[] = [
  {
    id: 'alokasi-kakanwil',
    no: 1,
    bidang: 'Kakanwil',
    totalBiaya: 2938000,
    details: [
      {
        id: 'det-kw-1',
        detail: 'Uang Lembur Golongan IV [1 ORG x 2 JAM x 26 HR]',
        vol: 52,
        hargaSatuan: 36000,
        jumlahBiaya: 1872000,
        golongan: 'Golongan IV',
        jenis: 'Lembur'
      },
      {
        id: 'det-kw-2',
        detail: 'Uang Makan Lembur Golongan IV [1 ORG x 1 FREK x 26 HR]',
        vol: 26,
        hargaSatuan: 41000,
        jumlahBiaya: 1066000,
        golongan: 'Golongan IV',
        jenis: 'Makan Lembur'
      }
    ]
  },
  {
    id: 'alokasi-pa1',
    no: 2,
    bidang: 'PA I',
    totalBiaya: 22022000,
    details: [
      {
        id: 'det-pa1-1',
        detail: 'Uang Lembur Golongan II [3 ORG x 2 JAM x 26 HR]',
        vol: 156,
        hargaSatuan: 24000,
        jumlahBiaya: 3744000,
        golongan: 'Golongan II',
        jenis: 'Lembur'
      },
      {
        id: 'det-pa1-2',
        detail: 'Uang Lembur Golongan III [5 ORG x 2 JAM x 26 HR]',
        vol: 260,
        hargaSatuan: 30000,
        jumlahBiaya: 7800000,
        golongan: 'Golongan III',
        jenis: 'Lembur'
      },
      {
        id: 'det-pa1-3',
        detail: 'Uang Lembur Golongan IV [1 ORG x 2 JAM x 26 HR]',
        vol: 52,
        hargaSatuan: 36000,
        jumlahBiaya: 1872000,
        golongan: 'Golongan IV',
        jenis: 'Lembur'
      },
      {
        id: 'det-pa1-4',
        detail: 'Uang Makan Lembur Golongan II [3 ORG x 1 FREK x 26 HR]',
        vol: 78,
        hargaSatuan: 35000,
        jumlahBiaya: 2730000,
        golongan: 'Golongan II',
        jenis: 'Makan Lembur'
      },
      {
        id: 'det-pa1-5',
        detail: 'Uang Makan Lembur Golongan III [5 ORG x 1 FREK x 26 HR]',
        vol: 130,
        hargaSatuan: 37000,
        jumlahBiaya: 4810000,
        golongan: 'Golongan III',
        jenis: 'Makan Lembur'
      },
      {
        id: 'det-pa1-6',
        detail: 'Uang Makan Lembur Golongan IV [1 ORG x 1 FREK x 26 HR]',
        vol: 26,
        hargaSatuan: 41000,
        jumlahBiaya: 1066000,
        golongan: 'Golongan IV',
        jenis: 'Makan Lembur'
      }
    ]
  },
  {
    id: 'alokasi-pa2',
    no: 3,
    bidang: 'PA II',
    totalBiaya: 21424000,
    details: [
      {
        id: 'det-pa2-1',
        detail: 'Uang Lembur Golongan III [5 ORG x 2 JAM x 26 HR]',
        vol: 260,
        hargaSatuan: 30000,
        jumlahBiaya: 7800000,
        golongan: 'Golongan III',
        jenis: 'Lembur'
      },
      {
        id: 'det-pa2-2',
        detail: 'Uang Lembur Golongan IV [3 ORG x 2 JAM x 26 HR]',
        vol: 156,
        hargaSatuan: 36000,
        jumlahBiaya: 5616000,
        golongan: 'Golongan IV',
        jenis: 'Lembur'
      },
      {
        id: 'det-pa2-3',
        detail: 'Uang Makan Lembur Golongan III [5 ORG x 1 FREK x 26 HR]',
        vol: 130,
        hargaSatuan: 37000,
        jumlahBiaya: 4810000,
        golongan: 'Golongan III',
        jenis: 'Makan Lembur'
      },
      {
        id: 'det-pa2-4',
        detail: 'Uang Makan Lembur Golongan IV [3 ORG x 1 FREK x 26 HR]',
        vol: 78,
        hargaSatuan: 41000,
        jumlahBiaya: 3198000,
        golongan: 'Golongan IV',
        jenis: 'Makan Lembur'
      }
    ]
  },
  {
    id: 'alokasi-papk',
    no: 4,
    bidang: 'PAPK',
    totalBiaya: 17382000,
    details: [
      {
        id: 'det-papk-1',
        detail: 'Uang Lembur Golongan II [3 ORG x 2 JAM x 26 HR]',
        vol: 156,
        hargaSatuan: 24000,
        jumlahBiaya: 3744000,
        golongan: 'Golongan II',
        jenis: 'Lembur'
      },
      {
        id: 'det-papk-2',
        detail: 'Uang Lembur Golongan III [2 ORG x 2 JAM x 26 HR]',
        vol: 104,
        hargaSatuan: 30000,
        jumlahBiaya: 3120000,
        golongan: 'Golongan III',
        jenis: 'Lembur'
      },
      {
        id: 'det-papk-3',
        detail: 'Uang Lembur Golongan IV [1 ORG x 2 JAM x 26 HR]',
        vol: 52,
        hargaSatuan: 36000,
        jumlahBiaya: 1872000,
        golongan: 'Golongan IV',
        jenis: 'Lembur'
      },
      {
        id: 'det-papk-4',
        detail: 'Uang Lembur Golongan IV [1 ORG x 2 JAM x 19 HR]',
        vol: 38,
        hargaSatuan: 36000,
        jumlahBiaya: 1368000,
        golongan: 'Golongan IV',
        jenis: 'Lembur'
      },
      {
        id: 'det-papk-5',
        detail: 'Uang Makan Lembur Golongan II [3 ORG x 1 FREK x 26 HR]',
        vol: 78,
        hargaSatuan: 35000,
        jumlahBiaya: 2730000,
        golongan: 'Golongan II',
        jenis: 'Makan Lembur'
      },
      {
        id: 'det-papk-6',
        detail: 'Uang Makan Lembur Golongan III [2 ORG x 1 FREK x 26 HR]',
        vol: 52,
        hargaSatuan: 37000,
        jumlahBiaya: 1924000,
        golongan: 'Golongan III',
        jenis: 'Makan Lembur'
      },
      {
        id: 'det-papk-7',
        detail: 'Uang Makan Lembur Golongan IV [1 ORG x 1 FREK x 26 HR]',
        vol: 26,
        hargaSatuan: 41000,
        jumlahBiaya: 1066000,
        golongan: 'Golongan IV',
        jenis: 'Makan Lembur'
      },
      {
        id: 'det-papk-8',
        detail: 'Uang Makan Lembur Golongan IV [1 ORG x 1 FREK x 19 HR]',
        vol: 38,
        hargaSatuan: 41000,
        jumlahBiaya: 1558000,
        golongan: 'Golongan IV',
        jenis: 'Makan Lembur'
      }
    ]
  },
  {
    id: 'alokasi-skki',
    no: 5,
    bidang: 'SKKI',
    totalBiaya: 16978000,
    details: [
      {
        id: 'det-skki-1',
        detail: 'Uang Lembur Golongan II [3 ORG x 2 JAM x 26 HR]',
        vol: 156,
        hargaSatuan: 24000,
        jumlahBiaya: 3744000,
        golongan: 'Golongan II',
        jenis: 'Lembur'
      },
      {
        id: 'det-skki-2',
        detail: 'Uang Lembur Golongan III [3 ORG x 2 JAM x 26 HR]',
        vol: 156,
        hargaSatuan: 30000,
        jumlahBiaya: 4680000,
        golongan: 'Golongan III',
        jenis: 'Lembur'
      },
      {
        id: 'det-skki-3',
        detail: 'Uang Lembur Golongan IV [1 ORG x 2 JAM x 26 HR]',
        vol: 52,
        hargaSatuan: 36000,
        jumlahBiaya: 1872000,
        golongan: 'Golongan IV',
        jenis: 'Lembur'
      },
      {
        id: 'det-skki-4',
        detail: 'Uang Makan Lembur Golongan II [3 ORG x 1 FREK x 26 HR]',
        vol: 78,
        hargaSatuan: 35000,
        jumlahBiaya: 2730000,
        golongan: 'Golongan II',
        jenis: 'Makan Lembur'
      },
      {
        id: 'det-skki-5',
        detail: 'Uang Makan Lembur Golongan III [3 ORG x 1 FREK x 26 HR]',
        vol: 78,
        hargaSatuan: 37000,
        jumlahBiaya: 2886000,
        golongan: 'Golongan III',
        jenis: 'Makan Lembur'
      },
      {
        id: 'det-skki-6',
        detail: 'Uang Makan Lembur Golongan IV [1 ORG x 1 FREK x 26 HR]',
        vol: 26,
        hargaSatuan: 41000,
        jumlahBiaya: 1066000,
        golongan: 'Golongan IV',
        jenis: 'Makan Lembur'
      }
    ]
  },
  {
    id: 'alokasi-umum',
    no: 6,
    bidang: 'UMUM',
    totalBiaya: 26702000,
    details: [
      {
        id: 'det-umum-1',
        detail: 'Uang Lembur Golongan II [4 ORG x 2 JAM x 26 HR]',
        vol: 208,
        hargaSatuan: 24000,
        jumlahBiaya: 4992000,
        golongan: 'Golongan II',
        jenis: 'Lembur'
      },
      {
        id: 'det-umum-2',
        detail: 'Uang Lembur Golongan III [6 ORG x 2 JAM x 26 HR]',
        vol: 312,
        hargaSatuan: 30000,
        jumlahBiaya: 9360000,
        golongan: 'Golongan III',
        jenis: 'Lembur'
      },
      {
        id: 'det-umum-3',
        detail: 'Uang Lembur Golongan IV [1 ORG x 2 JAM x 26 HR]',
        vol: 52,
        hargaSatuan: 36000,
        jumlahBiaya: 1872000,
        golongan: 'Golongan IV',
        jenis: 'Lembur'
      },
      {
        id: 'det-umum-4',
        detail: 'Uang Makan Lembur Golongan II [4 ORG x 1 FREK x 26 HR]',
        vol: 104,
        hargaSatuan: 35000,
        jumlahBiaya: 3640000,
        golongan: 'Golongan II',
        jenis: 'Makan Lembur'
      },
      {
        id: 'det-umum-5',
        detail: 'Uang Makan Lembur Golongan III [6 ORG x 1 FREK x 26 HR]',
        vol: 156,
        hargaSatuan: 37000,
        jumlahBiaya: 5772000,
        golongan: 'Golongan III',
        jenis: 'Makan Lembur'
      },
      {
        id: 'det-umum-6',
        detail: 'Uang Makan Lembur Golongan IV [1 ORG x 1 FREK x 26 HR]',
        vol: 26,
        hargaSatuan: 41000,
        jumlahBiaya: 1066000,
        golongan: 'Golongan IV',
        jenis: 'Makan Lembur'
      }
    ]
  }
];

// =========================================================================
// REALISASI ANGGARAN LEMBUR PER BIDANG/BAGIAN (BULANAN & TRIWULAN) TA 2026
// =========================================================================
export const INITIAL_REALISASI_BIDANG_2026: RealisasiBidangRow[] = [
  {
    id: 'real-bidang-kakanwil',
    no: 1,
    bidang: 'Kakanwil',
    jan: 0,
    feb: 0,
    mar: 0,
    apr: 411000,
    mei: 226000,
    jun: 298000,
    jul: 298000,
    agu: 0,
    sep: 0,
    okt: 0,
    nov: 0,
    des: 0
  },
  {
    id: 'real-bidang-umum',
    no: 2,
    bidang: 'Umum',
    jan: 5901000,
    feb: 2139000,
    mar: 5012000,
    apr: 3809000,
    mei: 3292000,
    jun: 2341000,
    jul: 1896000,
    agu: 0,
    sep: 0,
    okt: 0,
    nov: 0,
    des: 0
  },
  {
    id: 'real-bidang-pa1',
    no: 3,
    bidang: 'PA I',
    jan: 0,
    feb: 2068000,
    mar: 3178000,
    apr: 1357000,
    mei: 4646000,
    jun: 3399000,
    jul: 2436000,
    agu: 0,
    sep: 0,
    okt: 0,
    nov: 0,
    des: 0
  },
  {
    id: 'real-bidang-pa2',
    no: 4,
    bidang: 'PA II',
    jan: 2958000,
    feb: 5583000,
    mar: 988000,
    apr: 1192000,
    mei: 4594000,
    jun: 1580000,
    jul: 1566000,
    agu: 0,
    sep: 0,
    okt: 0,
    nov: 0,
    des: 0
  },
  {
    id: 'real-bidang-papk',
    no: 5,
    bidang: 'PAPK',
    jan: 107000,
    feb: 1266000,
    mar: 1323000,
    apr: 2335000,
    mei: 1269000,
    jun: 515000,
    jul: 2680000,
    agu: 0,
    sep: 0,
    okt: 0,
    nov: 0,
    des: 0
  },
  {
    id: 'real-bidang-skki',
    no: 6,
    bidang: 'SKKI',
    jan: 3999000,
    feb: 778000,
    mar: 681000,
    apr: 2010000,
    mei: 3232000,
    jun: 1316000,
    jul: 3392000,
    agu: 0,
    sep: 0,
    okt: 0,
    nov: 0,
    des: 0
  }
];




