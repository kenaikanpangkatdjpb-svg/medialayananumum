import React, { useState, useEffect } from 'react';
import { ExternalLink, Link2, Edit3, Check, X, Sparkles, FolderDown, ShieldCheck, FileText } from 'lucide-react';
import { safeLocalStorageSet } from '../lib/storage';
import { saveFirestoreDoc, subscribeFirestoreCollection } from '../lib/firebase';

export interface CatalogItem {
  id: string;
  title: string;
  code: string;
  category: string;
  description: string;
  hktManualUrl: string;
  skTimUrl: string;
}

const INITIAL_CATALOG: CatalogItem[] = [
  {
    id: 'wbk',
    title: 'WBK',
    code: 'WBK',
    category: 'Pembangunan ZI WBK/WBBM',
    description: 'Manual HKT dan SK Tim Pembangunan Wilayah Bebas dari Korupsi (WBK) Bagian Umum Kanwil DJPb Provinsi Riau.',
    hktManualUrl: 'https://kemenkeu.sharepoint.com/:f:/s/BagianUmumKanwilDJPbProvinsiRiau/Etg9-qfcdHROik_Tzdo65LABYtrENFGU0PMxYNZSAhFlSw?e=wLPRyJ',
    skTimUrl: 'https://kemenkeu.sharepoint.com/:f:/s/BagianUmumKanwilDJPbProvinsiRiau/Etg9-qfcdHROik_Tzdo65LABYtrENFGU0PMxYNZSAhFlSw?e=wLPRyJ'
  },
  {
    id: 'kenduri',
    title: 'KENDURI',
    code: 'KENDURI',
    category: 'Inovasi Layanan Publik',
    description: 'Kanal Edukasi dan Diskusi Perbendaharaan Internal (KENDURI) Kanwil DJPb Provinsi Riau.',
    hktManualUrl: 'https://kemenkeu.sharepoint.com/:f:/s/BagianUmumKanwilDJPbProvinsiRiau/Ej-aizSPwG5Npq4eyIqqQW8B5XucQcS_4hliNMYzy6hxHw?e=WQkIsG',
    skTimUrl: 'https://kemenkeu.sharepoint.com/:f:/s/BagianUmumKanwilDJPbProvinsiRiau/Ej-aizSPwG5Npq4eyIqqQW8B5XucQcS_4hliNMYzy6hxHw?e=WQkIsG'
  },
  {
    id: 'radio',
    title: 'RADIO',
    code: 'RADIO',
    category: 'Komunikasi & Edukasi',
    description: 'Radio Treasuria Kanwil DJPb Riau - Media Informasi & Edukasi Pengelolaan Keuangan Negara.',
    hktManualUrl: 'https://kemenkeu.sharepoint.com/:f:/s/BagianUmumKanwilDJPbProvinsiRiau/Eu1g11g2mppLgQJPa2H7fccBqv7xHifocnPGZ1yIALXCuQ?e=b0LLiD',
    skTimUrl: 'https://kemenkeu.sharepoint.com/:f:/s/BagianUmumKanwilDJPbProvinsiRiau/Eu1g11g2mppLgQJPa2H7fccBqv7xHifocnPGZ1yIALXCuQ?e=b0LLiD'
  },
  {
    id: 'abk',
    title: 'ABK',
    code: 'ABK',
    category: 'Manajemen Kepegawaian',
    description: 'Analisis Beban Kerja Pegawai, Pedoman Beban Kerja, dan Manual HKT Beban Kerja.',
    hktManualUrl: 'https://kemenkeu.sharepoint.com/:f:/s/BagianUmumKanwilDJPbProvinsiRiau/Eie6gBs5mnFMnTVODwkpW0cBJpQs8Sje42_XponrLvYERQ?e=jbNKfp',
    skTimUrl: 'https://kemenkeu.sharepoint.com/:f:/s/BagianUmumKanwilDJPbProvinsiRiau/Eie6gBs5mnFMnTVODwkpW0cBJpQs8Sje42_XponrLvYERQ?e=jbNKfp'
  },
  {
    id: 'pug',
    title: 'PUG',
    code: 'PUG',
    category: 'Pengarusutamaan Gender',
    description: 'Tim Pengarusutamaan Gender (PUG) dan Panduan Integrasi Gender dalam Pelayanan Perbendaharaan.',
    hktManualUrl: 'https://kemenkeu.sharepoint.com/:f:/s/BagianUmumKanwilDJPbProvinsiRiau/Ep6J8NZUichHiOUVQHeqxkEBOjkiLJFX5rF1rLuEWLT0wQ?e=VEKBoW',
    skTimUrl: 'https://kemenkeu.sharepoint.com/:f:/s/BagianUmumKanwilDJPbProvinsiRiau/Ep6J8NZUichHiOUVQHeqxkEBOjkiLJFX5rF1rLuEWLT0wQ?e=VEKBoW'
  },
  {
    id: 'skpl',
    title: 'SKPL',
    code: 'SKPL',
    category: 'Kepatuhan Internal',
    description: 'Sistem Kepatuhan Internal, Pengendalian Intern, dan Standardisasi Kepatuhan Layanan.',
    hktManualUrl: 'https://kemenkeu.sharepoint.com/:f:/s/BagianUmumKanwilDJPbProvinsiRiau/EhkDk6iaTPxAvgG4xf--LToBUfsatKOHrbpDEJLGyjwOAw?e=0Y8OLX',
    skTimUrl: 'https://kemenkeu.sharepoint.com/:f:/s/BagianUmumKanwilDJPbProvinsiRiau/EhkDk6iaTPxAvgG4xf--LToBUfsatKOHrbpDEJLGyjwOAw?e=0Y8OLX'
  },
  {
    id: 'bintal',
    title: 'BINTAL',
    code: 'BINTAL',
    category: 'Pembinaan Mental',
    description: 'Kegiatan Pembinaan Mental & Spiritual Pegawai Kanwil DJPb Riau beserta SK Pengurus.',
    hktManualUrl: 'https://kemenkeu.sharepoint.com/:f:/s/BagianUmumKanwilDJPbProvinsiRiau/Ep6J8NZUichHiOUVQHeqxkEBOjkiLJFX5rF1rLuEWLT0wQ?e=VEKBoW',
    skTimUrl: 'https://kemenkeu.sharepoint.com/:f:/s/BagianUmumKanwilDJPbProvinsiRiau/Ep6J8NZUichHiOUVQHeqxkEBOjkiLJFX5rF1rLuEWLT0wQ?e=VEKBoW'
  },
  {
    id: 'pengelola-kinerja',
    title: 'PENGELOLA KINERJA',
    code: 'PENGELOLA KINERJA',
    category: 'Manajemen Kinerja',
    description: 'Manual IKU, Matriks HKT Pengelola Kinerja, dan SK Tim Pengelola Kinerja Organisasi.',
    hktManualUrl: 'https://docs.google.com/spreadsheets/d/1gzinSCcnpmKXy1aawRCtK00jam-SCk_zEUkdrJrvRoc/edit?usp=sharing',
    skTimUrl: 'https://docs.google.com/spreadsheets/d/1gzinSCcnpmKXy1aawRCtK00jam-SCk_zEUkdrJrvRoc/edit?usp=sharing'
  },
  {
    id: 'bapor',
    title: 'BAPOR',
    code: 'BAPOR',
    category: 'Badan Pembina Olahraga',
    description: 'Badan Pembina Olahraga (BAPOR) Kanwil DJPb Riau, Jadwal Kegiatan Olahraga & SK Tim.',
    hktManualUrl: 'https://kemenkeu.sharepoint.com/:f:/s/BagianUmumKanwilDJPbProvinsiRiau/EhmfScnHStNEjIVcgAqJevcBH1nxQDZXwqTBWLG5owe7og?e=6pcBLp',
    skTimUrl: 'https://kemenkeu.sharepoint.com/:f:/s/BagianUmumKanwilDJPbProvinsiRiau/EhmfScnHStNEjIVcgAqJevcBH1nxQDZXwqTBWLG5owe7og?e=6pcBLp'
  },
  {
    id: 'cikpuan',
    title: 'CIKPUAN',
    code: 'CIKPUAN',
    category: 'Inovasi Daerah',
    description: 'Cikpuan (Cepat, Inovatif, Komunikatif, Profesional, Unggul, Akuntabel, dan Nyaman) - Inovasi Unggulan Riau.',
    hktManualUrl: 'https://kemenkeu.sharepoint.com/:f:/s/BagianUmumKanwilDJPbProvinsiRiau/EhXgNog-GO9FuG8ucpIeg9ABtMEA7UCn9VQg4HYAJkfscw?e=qOJpze',
    skTimUrl: 'https://kemenkeu.sharepoint.com/:f:/s/BagianUmumKanwilDJPbProvinsiRiau/EhXgNog-GO9FuG8ucpIeg9ABtMEA7UCn9VQg4HYAJkfscw?e=qOJpze'
  },
  {
    id: 'pas',
    title: 'PAS',
    code: 'PAS',
    category: 'Pengawasan & Pendampingan',
    description: 'Pendampingan Akselerasi Satker (PAS) - Program Pengawalan Pelaksanaan Anggaran DIPA Satker.',
    hktManualUrl: 'https://kemenkeu.sharepoint.com/:f:/s/BagianUmumKanwilDJPbProvinsiRiau/Elxl6e8cU71OqR2kqH0mOv4BBV1lYj8R66YHqLbMNcMZ9A?e=4o8FfK',
    skTimUrl: 'https://kemenkeu.sharepoint.com/:f:/s/BagianUmumKanwilDJPbProvinsiRiau/Elxl6e8cU71OqR2kqH0mOv4BBV1lYj8R66YHqLbMNcMZ9A?e=4o8FfK'
  },
  {
    id: 'sk-tim',
    title: 'SK TIM TERBARU',
    code: 'SK TIM TERBARU',
    category: 'Dokumen Regulasi Internal',
    description: 'Kumpulan SK Tim Kerja, Keputusan Kepala Kanwil DJPb Riau, dan Panduan HKT Terkini.',
    hktManualUrl: 'https://djpb.kemenkeu.go.id/kanwil/riau/id/sk-tim-terbaru.html',
    skTimUrl: 'https://djpb.kemenkeu.go.id/kanwil/riau/id/sk-tim-terbaru.html'
  }
];

interface KatalogIKUProps {
  isEditMode?: boolean;
}

export default function KatalogIKU({ isEditMode = false }: KatalogIKUProps) {
  const [items, setItems] = useState<CatalogItem[]>(() => {
    const saved = localStorage.getItem('melayu_katalog_iku');
    if (saved) {
      try {
        const parsed: CatalogItem[] = JSON.parse(saved);
        return INITIAL_CATALOG.map(initial => {
          const found = parsed.find(p => p.id === initial.id);
          if (!found) return initial;
          // If the found item uses legacy non-sharepoint links, upgrade to initial
          if (!found.hktManualUrl) {
            return { ...found, hktManualUrl: initial.hktManualUrl, skTimUrl: initial.skTimUrl };
          }
          return found;
        });
      } catch {
        return INITIAL_CATALOG;
      }
    }
    return INITIAL_CATALOG;
  });

  // Real-time Firestore sync for catalog items
  useEffect(() => {
    const unsub = subscribeFirestoreCollection<CatalogItem>('katalog_iku', INITIAL_CATALOG, (remoteItems) => {
      if (remoteItems && remoteItems.length > 0) {
        setItems(remoteItems);
      }
    });
    return () => unsub();
  }, []);

  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updated = items.map(item => item.id === editingItem.id ? editingItem : item);
    setItems(updated);
    safeLocalStorageSet('melayu_katalog_iku', JSON.stringify(updated));
    saveFirestoreDoc('katalog_iku', editingItem);
    setSelectedItem(editingItem);
    setEditingItem(null);
  };

  const handleItemClick = (item: CatalogItem) => {
    setSelectedItem(item);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8 shadow-xs space-y-6" id="katalog-iku-container">
      {/* Header matching screenshot */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h3 className="font-display font-black text-xl md:text-2xl text-slate-900 tracking-tight uppercase leading-snug">
            KATALOG IKU / KATALOG HKT
          </h3>
          <h4 className="font-display font-extrabold text-lg md:text-xl text-slate-800 tracking-tight uppercase">
            KANWIL DJPB PROVINSI RIAU
          </h4>
          <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center space-x-1.5">
            <span>Klik untuk melihat manual HKT dan SK Tim terbaru</span>
          </p>
        </div>

        {/* Treasury Logo branding top right */}
        <div className="flex items-center space-x-3 self-end sm:self-auto shrink-0 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/80">
          <div className="flex flex-col text-right">
            <span className="font-display font-black text-djpb-blue text-lg leading-none tracking-wider">DJPb</span>
            <span className="text-[8px] text-slate-400 font-mono font-bold tracking-widest uppercase mt-0.5">Treasury</span>
          </div>
          <div className="w-2.5 h-7 bg-amber-400 rounded-xs"></div>
        </div>
      </div>

      {/* Grid of dark blue button cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="katalog-iku-grid">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className="group relative bg-[#0B2E58] hover:bg-[#104783] text-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer flex items-center justify-center min-h-[90px] border border-blue-900/80 transform hover:-translate-y-0.5"
          >
            <div className="text-center space-y-1">
              <span className="font-display font-extrabold text-base sm:text-lg md:text-xl tracking-wider uppercase block text-white group-hover:text-amber-300 transition-colors">
                {item.title}
              </span>
              <span className="text-[10px] text-blue-200/80 font-mono opacity-0 group-hover:opacity-100 transition-opacity block">
                Manual HKT & SK Tim &rarr;
              </span>
            </div>

            {/* Subtle corner icon */}
            <ExternalLink className="w-3.5 h-3.5 text-blue-300/60 group-hover:text-amber-300 absolute top-3 right-3 transition-colors" />
          </button>
        ))}
      </div>

      {/* Detail / Link Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0">
            {/* Dark Blue Header */}
            <div className="bg-[#0B2E58] text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded">
                  {selectedItem.category}
                </span>
                <h3 className="font-display font-extrabold text-xl text-white mt-1">
                  Katalog {selectedItem.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-slate-700 text-xs">
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                {selectedItem.description}
              </p>

              {/* Document Link Action Buttons */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-display">
                  Tautan Berkas & Dokumen Resmi
                </span>

                <a
                  href={selectedItem.hktManualUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-djpb-blue font-bold rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center space-x-2.5">
                    <FileText className="w-4 h-4 text-djpb-blue shrink-0" />
                    <span>Lihat Manual HKT {selectedItem.title}</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-djpb-blue group-hover:translate-x-0.5 transition-transform" />
                </a>

                <a
                  href={selectedItem.skTimUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 font-bold rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center space-x-2.5">
                    <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Lihat SK Tim Terbaru {selectedItem.title}</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-amber-800 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>

              {/* Admin Edit Link Option */}
              {isEditMode && (
                <div className="pt-3 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={() => {
                      setEditingItem(selectedItem);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Edit Tautan URL Katalog</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Link Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-slate-800 text-sm">
                Edit Tautan Katalog {editingItem.title}
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Judul Katalog</label>
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kategori</label>
                <input
                  type="text"
                  value={editingItem.category}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deskripsi</label>
                <textarea
                  rows={2}
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">URL Manual HKT (Drive / Web)</label>
                <input
                  type="url"
                  value={editingItem.hktManualUrl}
                  onChange={(e) => setEditingItem({ ...editingItem, hktManualUrl: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">URL SK Tim Terbaru</label>
                <input
                  type="url"
                  value={editingItem.skTimUrl}
                  onChange={(e) => setEditingItem({ ...editingItem, skTimUrl: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer"
                >
                  Simpan Tautan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
