import React, { useState } from 'react';
import { BookOpen, FileText, CheckCircle, HelpCircle, X, Download, Play, Award, ChevronRight, Layers, ExternalLink } from 'lucide-react';

interface TLegoModule {
  id: number;
  title: string;
  subtitle: string;
  color: string;
  gradient: string;
  description: string;
  pages: number;
  downloadUrl: string;
}

const MODULES_DATA: TLegoModule[] = [
  {
    id: 1,
    title: 'Modul Pengelolaan Keuangan Negara',
    subtitle: 'Modul 1',
    color: 'bg-blue-600',
    gradient: 'from-blue-700 via-blue-800 to-indigo-900',
    description: 'Dasar-dasar pengelolaan keuangan negara, APBN, asas-asas perbendaharaan, dan tata kelola keuangan pemerintahan.',
    pages: 45,
    downloadUrl: 'https://kemenkeu.sharepoint.com/:b:/s/BagianUmumKanwilDJPbProvinsiRiau/IQCuUJiOWP8oS5gGTgg7ySmTAee6Vcq4RRg3tUEbVmqNORU?e=QKgBTd'
  },
  {
    id: 2,
    title: 'Modul Pelaksanaan Anggaran',
    subtitle: 'Modul 2',
    color: 'bg-rose-800',
    gradient: 'from-rose-800 via-red-900 to-pink-950',
    description: 'Mekanisme DIPA, pembayaran tagihan, penerbitan SPM/SP2D, serta tata cara pelaksanaan anggaran belanja negara.',
    pages: 52,
    downloadUrl: 'https://kemenkeu.sharepoint.com/:b:/s/BagianUmumKanwilDJPbProvinsiRiau/IQDkn4GnKdZLSZO8-INbGho5AbZ4vwVJIwFtzbbmzvzwcLg?e=fgjc9C'
  },
  {
    id: 3,
    title: 'Modul Pengelolaan Kas',
    subtitle: 'Modul 3',
    color: 'bg-emerald-700',
    gradient: 'from-emerald-700 via-green-800 to-teal-900',
    description: 'Pengelolaan Kas Negara, Rekening Milik Kementerian/Lembaga, Manajemen Likuiditas, dan perencanaan kas harian.',
    pages: 38,
    downloadUrl: 'https://kemenkeu.sharepoint.com/:b:/s/BagianUmumKanwilDJPbProvinsiRiau/IQBQ3aK3CzghQrHaoVLCFnBsAZ-dZBn6mRUGHfoEkGlH4us?e=c1q9H8'
  },
  {
    id: 4,
    title: 'Modul Akuntansi dan Pertanggungjawaban Keuangan',
    subtitle: 'Modul 4',
    color: 'bg-amber-600',
    gradient: 'from-amber-600 via-yellow-700 to-amber-900',
    description: 'Sistem akuntansi pemerintah pusat (SAPP), konsolidasi Laporan Keuangan, pelaporan SAIBA/SPAN, dan LKPP.',
    pages: 60,
    downloadUrl: 'https://kemenkeu.sharepoint.com/:b:/s/BagianUmumKanwilDJPbProvinsiRiau/IQAf8SM0s2flR7KlxPfSz_4BAVEvp33LTn1e5nCxt1W5Qm4?e=rIhPI0'
  },
  {
    id: 5,
    title: 'Modul Sistem Informasi dan Teknologi',
    subtitle: 'Modul 5',
    color: 'bg-slate-700',
    gradient: 'from-slate-700 via-gray-800 to-slate-900',
    description: 'Teknologi perbendaharaan, keamanan data SAKTI, integrasi SPAN, dan transformasi digital layanan DJPb.',
    pages: 42,
    downloadUrl: 'https://kemenkeu.sharepoint.com/:b:/s/BagianUmumKanwilDJPbProvinsiRiau/IQCiSjwZsP5_TIGhikpwp0ZnAb89CFCN_2N9ql9u5gJMG0I?e=XSI7yz'
  },
  {
    id: 6,
    title: 'Modul Special Mission',
    subtitle: 'Modul 6',
    color: 'bg-pink-600',
    gradient: 'from-pink-600 via-rose-600 to-fuchsia-900',
    description: 'Penugasan khusus perbendaharaan, dukungan dana transfer daerah, pembiayaan investasi, dan pemberdayaan UMKM.',
    pages: 35,
    downloadUrl: 'https://kemenkeu.sharepoint.com/:b:/s/BagianUmumKanwilDJPbProvinsiRiau/IQAjpnhH2R2_TrxPZhyw89IxAfts0_iOtamqZ_kJKMZvEFU?e=ooyPhv'
  }
];

interface QuizItem {
  id: number;
  title: string;
  questionsCount: number;
  duration: string;
  questions: {
    question: string;
    options: string[];
    answer: number;
  }[];
}

const LATIHAN_SOAL_DATA = [
  { id: 1, title: 'Latihan Soal 1', desc: 'Latihan Dasar Pengelolaan Keuangan Negara & DIPA' },
  { id: 2, title: 'Latihan Soal 2', desc: 'Latihan Pelaksanaan Anggaran & Penerbitan SPM/SP2D' },
  { id: 3, title: 'Latihan Soal 3', desc: 'Latihan Pengelolaan Kas & Akuntansi Perbendaharaan' },
];

const KUIS_DATA: QuizItem[] = [
  {
    id: 1,
    title: 'Kuis 1',
    questionsCount: 5,
    duration: '10 Menit',
    questions: [
      {
        question: 'Siapakah Pengelola Keuangan Negara tertinggi di Indonesia sesuai UU No. 17 Tahun 2003?',
        options: ['Presiden', 'Menteri Keuangan', 'Kepala BPK', 'Direktur Jenderal Perbendaharaan'],
        answer: 0
      },
      {
        question: 'Dokumen yang dijadikan pedoman oleh Pengguna Anggaran dalam melaksanakan kegiatan adalah...',
        options: ['DIPA', 'RKA-KL', 'SP2D', 'SPM'],
        answer: 0
      },
      {
        question: 'Asas perbendaharaan yang menyatakan bahwa semua penerimaan dan pengeluaran harus tercantum dalam APBN adalah...',
        options: ['Asas Spesialitas', 'Asas Universalitas', 'Asas Tahunan', 'Asas Akuntabilitas'],
        answer: 1
      },
      {
        question: 'Tahun anggaran APBN di Indonesia berlaku selama...',
        options: ['1 Januari - 31 Desember', '1 April - 31 Maret', '1 Juli - 30 Juni', '1 Oktober - 30 September'],
        answer: 0
      },
      {
        question: 'Kantor Pelayanan Perbendaharaan Negara (KPPN) bertindak sebagai...',
        options: ['Kuasa BUN di Daerah', 'Pengguna Anggaran', 'Auditor Eksternal', 'Pengawas Pasar Modal'],
        answer: 0
      }
    ]
  },
  {
    id: 2,
    title: 'Kuis 2',
    questionsCount: 5,
    duration: '10 Menit',
    questions: [
      {
        question: 'Surat Perintah Membayar (SPM) diterbitkan oleh...',
        options: ['Pejabat Penandatangan SPM (PPSPM)', 'KPPN', 'Bank Persepsi', 'BPK'],
        answer: 0
      },
      {
        question: 'Surat Perintah Pencairan Dana (SP2D) diterbitkan oleh...',
        options: ['Kuasa BUN (KPPN)', 'PPSPM Satker', 'PPK Satker', 'Bendahara Pengeluaran'],
        answer: 0
      },
      {
        question: 'Batas akhir penyampaian LPJ Bendahara Pengeluaran ke KPPN adalah tanggal...',
        options: ['10 bulan berikutnya', '15 bulan berikutnya', '20 bulan berikutnya', 'Akhir bulan berjalan'],
        answer: 0
      },
      {
        question: 'Uang Persediaan (UP) diberikan kepada satker untuk membiayai...',
        options: ['Operasional sehari-hari satker', 'Gaji pegawai negeri', 'Pembangunan gedung baru', 'Pembelian kendaraan dinas utama'],
        answer: 0
      },
      {
        question: 'Aplikasi resmi Kementerian Keuangan yang digunakan satker dalam pelaksanaan anggaran adalah...',
        options: ['SAKTI', 'SPAN', 'SIMPONI', 'SPOIN'],
        answer: 0
      }
    ]
  },
  {
    id: 3,
    title: 'Kuis 3',
    questionsCount: 5,
    duration: '10 Menit',
    questions: [
      {
        question: 'Sistem Kas Tunggal yang diterapkan di Indonesia dikenal dengan istilah...',
        options: ['Treasury Single Account (TSA)', 'Single Window System', 'Integrated Treasury System', 'Cash Pooling Account'],
        answer: 0
      },
      {
        question: 'Laporan keuangan pemerintah disusun berdasarkan standar akuntansi pemerintahan (SAP) yang berbasis...',
        options: ['Akrual', 'Kas', 'Modified Cash', 'Nilai Wajar'],
        answer: 0
      },
      {
        question: 'Penerimaan Negara Bukan Pajak (PNBP) dikelola oleh...',
        options: ['Kementerian/Lembaga terkait dan Kemenkeu', 'Hanya Bank Indonesia', 'BPK', 'DPR'],
        answer: 0
      },
      {
        question: 'Sistem SPAN merupakan singkatan dari...',
        options: [
          'Sistem Perbendaharaan dan Anggaran Negara',
          'Sistem Pengawasan Anggaran Nasional',
          'Sistem Pelaksanaan Anggaran Negara',
          'Sistem Pengelolaan Aset Negara'
        ],
        answer: 0
      },
      {
        question: 'Kanwil DJPb bertindak sebagai pembina akuntansi dan pelaporan keuangan tingkat...',
        options: ['Wilayah / Regional', 'Pusat', 'Kabupaten / Kota', 'Satker Khusus'],
        answer: 0
      }
    ]
  }
];

export default function TLegoView() {
  const [selectedModule, setSelectedModule] = useState<TLegoModule | null>(null);
  const [selectedLatihan, setSelectedLatihan] = useState<typeof LATIHAN_SOAL_DATA[0] | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizItem | null>(null);

  // Quiz interactive state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const handleStartQuiz = (quiz: QuizItem) => {
    setSelectedQuiz(quiz);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setQuizSubmitted(false);
  };

  const handleSelectAnswer = (qIndex: number, optionIndex: number) => {
    if (quizSubmitted) return;
    setUserAnswers(prev => ({ ...prev, [qIndex]: optionIndex }));
  };

  const handleCalculateScore = () => {
    if (!selectedQuiz) return 0;
    let correct = 0;
    selectedQuiz.questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.answer) correct++;
    });
    return Math.round((correct / selectedQuiz.questions.length) * 100);
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen p-3 md:p-6 rounded-2xl border border-slate-200/80 shadow-2xs font-sans">
      {/* Container matching screenshot styling */}
      <div className="max-w-6xl mx-auto space-y-10 py-2">
        
        {/* Main Title Header */}
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            Treasury Learning On The Go (TLEGO)
          </h1>
        </div>

        {/* SECTION 1: 6 MODULE COVERS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 md:gap-4 items-stretch">
          {MODULES_DATA.map((mod) => (
            <div 
              key={mod.id} 
              onClick={() => setSelectedModule(mod)}
              className="group flex flex-col items-center cursor-pointer transition-transform duration-200 hover:-translate-y-1"
            >
              {/* Module Cover Art Container */}
              <div className={`w-full aspect-[3/4.2] rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 relative bg-gradient-to-b ${mod.gradient} p-2.5 flex flex-col justify-between border border-white/20`}>
                
                {/* Background Artwork Patterns & Foliage Motifs */}
                <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white blur-xl"></div>
                  <div className="absolute -left-6 -bottom-6 w-28 h-28 rounded-full bg-amber-400 blur-xl"></div>
                  <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]"></div>
                </div>

                {/* Top Bar Logo / Header */}
                <div className="relative z-10 flex items-center justify-between text-white/90">
                  <div className="flex items-center space-x-1">
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-400/90 flex items-center justify-center text-[7px] font-black text-slate-900">
                      ★
                    </div>
                    <span className="text-[7px] font-bold tracking-wider uppercase opacity-90">DJPb</span>
                  </div>
                  <span className="text-[7px] font-bold px-1 py-0.2 bg-white/20 backdrop-blur-xs rounded text-white">
                    2026
                  </span>
                </div>

                {/* Center Title Card Area */}
                <div className="relative z-10 my-auto text-center space-y-1.5 px-1 py-2 bg-black/25 backdrop-blur-xs rounded-md border border-white/10">
                  <span className="inline-block text-[8px] font-extrabold text-amber-300 uppercase tracking-wider px-1 bg-amber-950/60 rounded">
                    Modul
                  </span>
                  <h3 className="text-[10px] sm:text-[11px] font-extrabold text-white leading-tight font-display drop-shadow-xs">
                    {mod.title.replace('Modul ', '')}
                  </h3>
                  <p className="text-[7px] text-white/80 line-clamp-2 italic font-sans">
                    Kanwil DJPb Provinsi Riau
                  </p>
                </div>

                {/* Bottom Graphic & Photos Representation */}
                <div className="relative z-10 pt-1 border-t border-white/15 flex items-end justify-between">
                  <div className="flex -space-x-1">
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-300 border border-white text-[6px] flex items-center justify-center font-bold text-slate-900">
                      I
                    </div>
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-300 border border-white text-[6px] flex items-center justify-center font-bold text-slate-900">
                      II
                    </div>
                  </div>
                  <span className="text-[7px] text-amber-300 font-extrabold tracking-tight">
                    TLEGO
                  </span>
                </div>
              </div>

              {/* Subtitle label below cover matching image ("Modul 1", "Modul 2", etc.) */}
              <div className="mt-2.5 text-center">
                <span className="text-xs font-extrabold text-slate-900 tracking-tight">
                  {mod.subtitle}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* SECTION 2: LATIHAN SOAL ROW */}
        <div className="pt-4 border-t border-slate-200/80">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {LATIHAN_SOAL_DATA.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedLatihan(item)}
                className="flex items-center justify-center space-x-3 group cursor-pointer p-3 rounded-xl hover:bg-slate-100/80 transition-all duration-200"
              >
                {/* Custom Notebook + Pencil Icon matching screenshot */}
                <div className="relative shrink-0 w-12 h-14 bg-slate-50 rounded-lg border-2 border-slate-800 shadow-xs flex flex-col p-1.5 transform group-hover:scale-105 transition-transform">
                  {/* Spiral Ring at Top */}
                  <div className="absolute -top-1.5 inset-x-1 flex justify-between px-1">
                    <div className="w-1.5 h-2.5 bg-slate-700 rounded-sm"></div>
                    <div className="w-1.5 h-2.5 bg-slate-700 rounded-sm"></div>
                    <div className="w-1.5 h-2.5 bg-slate-700 rounded-sm"></div>
                  </div>
                  {/* Lines on page */}
                  <div className="mt-1 space-y-1 border-t border-slate-300 pt-1">
                    <div className="h-0.5 bg-slate-300 rounded w-full"></div>
                    <div className="h-0.5 bg-slate-300 rounded w-3/4"></div>
                    <div className="h-0.5 bg-slate-300 rounded w-5/6"></div>
                  </div>
                  {/* Pencil overlay */}
                  <div className="absolute right-0 bottom-1 w-8 h-2 bg-amber-400 border border-slate-800 transform -rotate-45 rounded-xs flex items-center justify-end px-0.5">
                    <div className="w-1.5 h-1.5 bg-red-400 rounded-xs"></div>
                  </div>
                </div>

                {/* Label text next to icon */}
                <span className="text-base font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: KUIS ROW */}
        <div className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {KUIS_DATA.map((quiz) => (
              <div
                key={quiz.id}
                onClick={() => handleStartQuiz(quiz)}
                className="flex flex-col items-center group cursor-pointer"
              >
                {/* Circular Badge Icon matching screenshot */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-cyan-400 p-1 shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center p-2.5">
                    {/* Cyan notebook with red/yellow pencil */}
                    <div className="relative w-8 h-9 bg-cyan-400 rounded border-2 border-slate-800 flex flex-col justify-center items-center shadow-2xs">
                      <div className="w-5 h-0.5 bg-white mb-1"></div>
                      <div className="w-5 h-0.5 bg-white mb-1"></div>
                      <div className="w-3 h-0.5 bg-white"></div>
                      {/* Pencil diagonally */}
                      <div className="absolute -right-1 bottom-0 w-7 h-2 bg-amber-400 border border-slate-900 transform -rotate-45 rounded-xs"></div>
                    </div>
                  </div>
                </div>

                {/* Subtitle label centered below icon */}
                <span className="mt-3 text-base font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {quiz.title}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ---------------- MODAL 1: MODULE DETAIL VIEWER ---------------- */}
      {selectedModule && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 border border-slate-100">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl ${selectedModule.color} text-white flex items-center justify-center font-bold text-sm shadow-xs`}>
                  M{selectedModule.id}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{selectedModule.subtitle}</span>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{selectedModule.title}</h3>
                </div>
              </div>
              <button 
                onClick={() => setSelectedModule(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                {selectedModule.description}
              </p>

              {selectedModule.downloadUrl && selectedModule.downloadUrl !== '#' && (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-emerald-900 font-bold">
                    <span className="flex items-center space-x-1.5 text-xs">
                      <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Link Tautan SharePoint Kemenkeu</span>
                    </span>
                    <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded font-mono font-semibold">SharePoint</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Modul ini dapat diakses dan diunduh langsung melalui repositori SharePoint Bagian Umum Kanwil DJPb Provinsi Riau.
                  </p>
                  <a
                    href={selectedModule.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Buka Modul di SharePoint Kemenkeu</span>
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedModule(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
              {selectedModule.downloadUrl && selectedModule.downloadUrl !== '#' ? (
                <a
                  href={selectedModule.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Buka / Unduh (SharePoint)</span>
                </a>
              ) : (
                <button
                  onClick={() => alert(`Mengunduh ${selectedModule.title}...`)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Modul (PDF)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL 2: LATIHAN SOAL MODAL ---------------- */}
      {selectedLatihan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{selectedLatihan.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedLatihan(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">{selectedLatihan.desc}</p>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-800 block">Materi Pembahasan:</span>
                <ul className="list-disc list-inside text-slate-600 space-y-1 pl-1">
                  <li>Latihan pemahaman konsep dasar perbendaharaan</li>
                  <li>Studi kasus pelaksanaan DIPA & SP2D</li>
                  <li>Simulasi penyusunan laporan keuangan satker</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedLatihan(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  alert(`Membuka ${selectedLatihan.title}...`);
                  setSelectedLatihan(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 shadow-xs"
              >
                <Play className="w-4 h-4" />
                <span>Mulai Latihan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL 3: INTERACTIVE KUIS MODAL ---------------- */}
      {selectedQuiz && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedQuiz.title} - Evaluasi Pembelajaran</h3>
                  <p className="text-[10px] text-slate-500">Durasi: {selectedQuiz.duration} • Total {selectedQuiz.questionsCount} Soal</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedQuiz(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!quizSubmitted ? (
              /* Question Step */
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Soal {currentQuestionIndex + 1} dari {selectedQuiz.questions.length}</span>
                  <div className="flex space-x-1">
                    {selectedQuiz.questions.map((_, idx) => (
                      <div 
                        key={idx}
                        className={`w-2.5 h-2.5 rounded-full ${
                          currentQuestionIndex === idx 
                            ? 'bg-blue-600' 
                            : userAnswers[idx] !== undefined 
                            ? 'bg-emerald-500' 
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-800 leading-relaxed">
                    {selectedQuiz.questions[currentQuestionIndex].question}
                  </p>
                </div>

                <div className="space-y-2">
                  {selectedQuiz.questions[currentQuestionIndex].options.map((opt, optionIdx) => {
                    const isSelected = userAnswers[currentQuestionIndex] === optionIdx;
                    return (
                      <button
                        key={optionIdx}
                        onClick={() => handleSelectAnswer(currentQuestionIndex, optionIdx)}
                        className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span>{String.fromCharCode(65 + optionIdx)}. {opt}</span>
                        {isSelected && <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
                  >
                    Sebelumnya
                  </button>

                  {currentQuestionIndex < selectedQuiz.questions.length - 1 ? (
                    <button
                      disabled={userAnswers[currentQuestionIndex] === undefined}
                      onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Selanjutnya</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      disabled={Object.keys(userAnswers).length < selectedQuiz.questions.length}
                      onClick={() => setQuizSubmitted(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center space-x-1 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Selesai & Kumpulkan</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Result Summary Step */
              <div className="text-center space-y-4 py-2 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-black">
                  {handleCalculateScore()}%
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">Kuis Selesai!</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Skor Anda: <span className="font-bold text-slate-800">{handleCalculateScore()} / 100</span>
                  </p>
                </div>

                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs">
                  {handleCalculateScore() >= 80 ? (
                    <p className="font-semibold">Sangat Baik! Anda telah menguasai materi {selectedQuiz.title} dengan memuaskan.</p>
                  ) : (
                    <p className="font-semibold">Bagus! Anda dapat mengulang kuis atau membaca kembali modul terkait untuk pemahaman yang lebih baik.</p>
                  )}
                </div>

                <div className="flex justify-center space-x-2 pt-2">
                  <button
                    onClick={() => handleStartQuiz(selectedQuiz)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
                  >
                    Ulangi Kuis
                  </button>
                  <button
                    onClick={() => setSelectedQuiz(null)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
