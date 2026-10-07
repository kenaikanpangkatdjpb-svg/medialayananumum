# MELAYU - Dashboard Integrasi Layanan Umum Kanwil DJPb Provinsi Riau

**MELAYU** (Manajemen Elektronik Layanan dan Administrasi Terpadu) adalah platform dashboard terpadu internal Kanwil Direktorat Jenderal Perbendaharaan Provinsi Riau untuk pengelolaan layanan umum, peminjaman sarana & prasarana, monitoring kinerja, dan evaluasi kepatuhan secara real-time.

---

## 🚀 Fitur Utama

- **Peminjaman Sarana & Prasarana**:
  - Peminjaman Ruang Rapat & Aula (Dukungan Cek Jadwal & Unduh Bukti Reservasi)
  - Peminjaman Barang & Aset Kantor
  - Peminjaman Kendaraan Dinas Operasional
- **Subbagian Kepegawaian**:
  - Cek Seribu (Matriks Presensi & Rekapitulasi Kehadiran)
  - Monitoring Sertifikasi & Kompetensi Pegawai
- **Subbagian Penilaian Kinerja**:
  - Monitoring Capaian IKI & HKT
  - Monitoring Beban Kerja (ABK)
  - Monitoring Disiplin & Presensi (DAMS)
- **Monitoring Pengisian Employee Advocacy (EA)**:
  - Upload data dari Excel
  - Rekapitulasi kepatuhan per edisi
  - Notifikasi salin daftar pegawai yang belum mengisi
- **Sistem Role & Hak Akses (Multi-Role)**:
  - **Administrator**: Akses penuh untuk manajemen user, upload data, reset data, dan pengaturan sistem.
  - **Pegawai**: Akses layanan internal, pengajuan peminjaman, dan monitoring personal.
  - **KPPN**: Akses khusus pemantauan mitra kerja (Monitoring Kinerja, Monitoring ABK, Monitoring DAMS, Cek Seribu, dan Monitoring EA).

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling & UI**: Tailwind CSS v4, Lucide React, Motion
- **Chart & Data**: Recharts, SheetJS (XLSX)
- **Database & Cloud Storage**: Firebase Firestore & Firebase Auth

---

## 📦 Panduan Instalasi & Menjalankan di Lokal / GitHub

### 1. Clone Repositori
```bash
git clone https://github.com/username-anda/melayu-dashboard.git
cd melayu-dashboard
```

### 2. Install Dependensi
Pastikan Anda sudah menginstal **Node.js (versi 18 ke atas)** dan npm:
```bash
npm install
```

### 3. Konfigurasi Environment Variable
Salin file konfigurasi contoh:
```bash
cp .env.example .env
```
Isi variabel konfigurasi di `.env` (jika menggunakan fitur Gemini API atau Firebase kustom).

### 4. Menjalankan Server Development
```bash
npm run dev
```
Buka browser pada alamat `http://localhost:3000` (atau port yang tertera pada terminal).

### 5. Build untuk Produksi
```bash
npm run build
```
Hasil build produksi akan tersimpan di folder `dist/`.

---

## 🔐 Akun Default untuk Pengujian

| Role | Username | Password | Keterangan |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `123` | Akses penuh & Mode Edit |
| **Pegawai** | `umum` / `user` | `123` | Akses Pegawai Kanwil |
| **KPPN** | `kppn` | `123` | Akses Khusus Mitra KPPN |

---

## 📄 Lisensi
Dikembangkan untuk Kanwil Ditjen Perbendaharaan Provinsi Riau.
