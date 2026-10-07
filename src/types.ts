export interface RoomBooking {
  id: string;
  roomName: string;
  bookerName: string;
  division: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  equipmentNeeded?: string;
  status: 'Disetujui' | 'Pending' | 'Ditolak';
  statusNote?: string;
}

export interface ItemBooking {
  id: string;
  itemName: string;
  bookerName: string;
  division: string;
  date: string;
  quantity: number;
  status: 'Dipinjam' | 'Kembali' | 'Pending' | 'Ditolak';
  statusNote?: string;
}

export interface VehicleBooking {
  id: string;
  vehicleName: string;
  plateNumber: string;
  driverName: string;
  driverOption?: 'Dengan Supir' | 'Tanpa Supir';
  bookerName: string;
  division?: string;
  destination: string;
  date: string;
  startTime?: string;
  endTime?: string;
  durationDays: number;
  status: 'Pending' | 'Disetujui' | 'Ditolak' | 'Selesai';
  statusNote?: string;
}

export interface FacilityFeedback {
  id: string;
  category: 'Ruangan' | 'AC' | 'Kebersihan' | 'IT / Jaringan' | 'Lainnya';
  reporterName: string;
  reporterDivision: string;
  description: string;
  rating?: number;
  date: string;
  status: 'Open' | 'In Progress' | 'Resolved';
}

export interface KinerjaFeedbackItem {
  id: string;
  no: number;
  workspaceName: string;
  feedbackText: string;
  date: string;
  authorName?: string;
  authorDivision?: string;
  rating?: number;
  status?: 'Belum Ditindaklanjuti' | 'Dalam Proses' | 'Selesai' | 'Ditolak' | string;
  tindakLanjut?: string;
  tindakLanjutBy?: string;
  tindakLanjutDate?: string;
}

export interface MonthlyNeed {
  id: string;
  itemName: string;
  category: 'ATK' | 'Konsumsi' | 'Sarpras' | 'Lain-lain';
  quantity: number;
  unit: string;
  estimatedPrice: number;
  urgency: 'Tinggi' | 'Sedang' | 'Rendah';
  status: 'Diusulkan' | 'Disetujui' | 'Dibatalkan';
}

export interface GKMAgreement {
  id: string;
  roomAndMedia?: string;
  topic: string;
  presenter: string;
  date: string;
  startTime?: string;
  endTime?: string;
  pic?: string;
  participantsCount?: number;
  summary?: string;
  attachmentUrl?: string;
}

export interface ScholarshipInfo {
  id: string;
  name: string;
  provider: string;
  degree: 'S1' | 'S2' | 'S3' | 'Short Course' | string;
  deadline: string;
  description: string;
  eligibility: string[];
}

export interface PerformanceMetric {
  month: string;
  target: number;
  realization: number;
  gkmScore: number;
}

export interface WorkloadMetric {
  division: string;
  employeeCount: number;
  activeTasks: number;
  loadPercentage: number;
}

export interface RealizationProgress {
  id?: string;
  category: string;
  allocated: number;
  realized: number;
}

export interface VisitorLog {
  id: string;
  name: string;
  institution: string;
  purpose: string;
  visitDate: string;
  visitTime: string;
  destinationDivision: string;
  keyCardNumber?: string;
}

export interface SecurityShift {
  id?: string;
  day: string;
  shiftMorning: string;
  shiftEvening: string;
  shiftNight: string;
}

export interface SecurityRosterItem {
  id: string;
  orderIndex?: number;
  name: string;
  dateStr: string;
  location: 'KANWIL DJPB' | 'RUMAH DINAS' | 'LIBUR' | string;
  hours: string;
}

export interface ActivityGalleryItem {
  id: string;
  title: string;
  date: string;
  division: string;
  mediaType: 'photo' | 'video';
  mediaUrl: string;
  additionalPhotos?: string[];
  thumbnailUrl?: string;
  narration: string;
  category: 'Rapat & Forum' | 'Sosialisasi & Edukasi' | 'GKM Kepegawaian' | 'Bakti Sosial & Dharma Wanita' | 'Kunjungan Kerja' | 'Olahraga & Seni' | 'Inovasi & Apresiasi' | string;
  authorName: string;
  createdAt: string;
  location?: string;
  tags?: string[];
}

export interface CurrentUser {
  username: string;
  fullName: string;
  role: 'admin' | 'user' | 'kppn';
  division: string;
}

export interface UserAccount {
  id: string;
  employeeId: string;
  fullName: string;
  username: string;
  password?: string;
  role: 'Administrator' | 'Pegawai' | 'KANWIL' | 'KPPN';
  status: 'Aktif' | 'Nonaktif';
}

export interface DamsTask {
  id?: string;
  no: number;
  perihal: string;
  uraian: string;
  output: string;
  pj: string;
  deadline: string;
  status: 'Selesai' | 'On Progress';
}

export interface ProcurementPlan {
  id: number | string;
  item: string;
  qty: number;
  estimatedBudget: number;
  targetMonth: string;
  progress: number;
  status: string;
}

export interface CekSeribuCert {
  id: string;
  fileName: string;
  fileSize: string;
  imageUrl: string;
  employeeName: string;
  uploadDate: string;
  checkInTime: string;
  checkOutTime: string;
  createdBy: string;
  status: string;
}

export interface CatalogItem {
  id: string;
  title: string;
  code: string;
  category: string;
  description: string;
  hktManualUrl?: string;
  skTimUrl?: string;
}

export interface RencanaLemburRow {
  id: string;
  bidang: string;
  namaLengkap: string;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  mei: number;
  jun: number;
  jul: number;
  agu: number;
  sep: number;
  okt: number;
  nov: number | null;
  des: number | null;
  total: number;
  alokasi2026: number;
  highlightMonths?: string[];
}

export interface RealisasiGolonganMonthData {
  lembur: number | null;
  makanLembur: number | null;
}

export interface RealisasiGolonganItem {
  id: string; // 'gol-2', 'gol-3', 'gol-4'
  golongan: string; // 'Golongan II', 'Golongan III', 'Golongan IV'
  jan: RealisasiGolonganMonthData;
  feb: RealisasiGolonganMonthData;
  mar: RealisasiGolonganMonthData;
  apr: RealisasiGolonganMonthData;
  mei: RealisasiGolonganMonthData;
  jun: RealisasiGolonganMonthData;
  jul: RealisasiGolonganMonthData;
  agu: RealisasiGolonganMonthData;
  sep: RealisasiGolonganMonthData;
  okt: RealisasiGolonganMonthData;
  nov: RealisasiGolonganMonthData;
  des: RealisasiGolonganMonthData;
}

export interface RealisasiLemburItem {
  id: string;
  bidang: string;
  bulan: string;
  nomorSP2D: string;
  tanggalSP2D: string;
  uraian: string;
  jumlahPenerima: number;
  jumlahJam: number;
  uangLembur: number;
  uangMakanLembur: number;
  totalRealisasi: number;
  status: 'Selesai Dibayar' | 'Proses SP2D' | 'Pengajuan SPM' | string;
  lampiranUrl?: string;
  lampiranName?: string;
  lampiranSize?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface AlokasiBidangDetailItem {
  id: string;
  detail: string;
  vol: number;
  hargaSatuan: number;
  jumlahBiaya: number;
  golongan?: 'Golongan II' | 'Golongan III' | 'Golongan IV' | string;
  jenis?: 'Lembur' | 'Makan Lembur' | string;
}

export interface AlokasiBidangSection {
  id: string;
  no: number;
  bidang: string;
  totalBiaya: number;
  details: AlokasiBidangDetailItem[];
}

export interface LemburUploadedFile {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  fileUrl?: string;
  kategori: 'Surat Perintah Lembur (SPL)' | 'Daftar Hadir & Absensi Lembur' | 'Rekap Realisasi SP2D Lembur' | 'File Rencana Excel Lembur 2026' | 'Lainnya' | string;
  bidang: string;
  bulan: string;
  tahun: number;
  keterangan?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface RealisasiBidangRow {
  id: string;
  no?: number;
  bidang: string;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  mei: number;
  jun: number;
  jul: number;
  agu: number;
  sep: number;
  okt: number;
  nov: number;
  des: number;
}


