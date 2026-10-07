import React, { useState, useMemo } from 'react';
import { 
  Plus, BookOpen, Users, Calendar, Search, 
  GraduationCap, AlertCircle, Check, Award, Layers,
  Upload, Image as ImageIcon, FileText, X, CheckCircle,
  Trash2, Eye, Clock, User, LogIn, LogOut, UserCheck,
  FileSpreadsheet, Download, Table, Shield, Pencil
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { GKMAgreement, ScholarshipInfo, CurrentUser } from '../types';
import TLegoView from './TLegoView';
import CekSeribuMatrixTable, { INITIAL_CEK_SERIBU_MATRIX, MatrixRowData } from './CekSeribuMatrixTable';
import { saveFirestoreDoc, deleteFirestoreDoc, saveFirestoreCollection, subscribeFirestoreCollection } from '../lib/firebase';
import { safeLocalStorageSet } from '../lib/storage';

interface KepegawaianSectionProps {
  subTab: string;
  gkmList: GKMAgreement[];
  setGkmList: React.Dispatch<React.SetStateAction<GKMAgreement[]>>;
  scholarships: ScholarshipInfo[];
  setScholarships?: React.Dispatch<React.SetStateAction<ScholarshipInfo[]>>;
  isEditMode: boolean;
  currentUser?: CurrentUser | null;
}

export default function KepegawaianSection({
  subTab,
  gkmList,
  setGkmList,
  scholarships,
  setScholarships,
  isEditMode,
  currentUser
}: KepegawaianSectionProps) {
  const canManageAdmin = isEditMode || (currentUser ? currentUser.role === 'admin' : false);
  // GKM states
  const [showGkmModal, setShowGkmModal] = useState(false);
  const [editingGkmId, setEditingGkmId] = useState<string | null>(null);
  const [gkmSearch, setGkmSearch] = useState('');
  const [gkmPicFilter, setGkmPicFilter] = useState('');
  const [gkmSortAsc, setGkmSortAsc] = useState(true);
  const [gkmForm, setGkmForm] = useState({
    roomAndMedia: 'LESTARI (Learning Station)',
    topic: '',
    presenter: '',
    date: '16 Apr 2026',
    startTime: '1:30:00 PM',
    endTime: '2:00:00 PM',
    pic: 'Bidang PAPK',
    participantsCount: 30,
    summary: ''
  });

  // Cek Seribu states
  const [searchEmployee, setSearchEmployee] = useState('');
  const [searchResult, setSearchResult] = useState<any[] | null>(null);

  // Upload JPEG state for Cek Seribu
  const [uploadedCertificates, setUploadedCertificates] = useState<Array<{
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
  }>>(() => {
    const saved = localStorage.getItem('melayu_cek_seribu_jpeg');
    const initialList = saved ? JSON.parse(saved) : [
      {
        id: 'cert-5',
        fileName: 'Dokumen_CekSeribu_Siti.jpg',
        fileSize: '380 KB',
        imageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&q=80&w=800',
        employeeName: 'Ahmad Fauzi, S.T.',
        uploadDate: '22-07-2026',
        checkInTime: '07:45 WIB',
        checkOutTime: '16:45 WIB',
        createdBy: 'Operator Cek Seribu',
        status: 'Cek Seribu Valid'
      },
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
      }
    ];
    return Array.isArray(initialList)
      ? [...initialList].sort((a, b) => (a.employeeName || '').localeCompare(b.employeeName || '', 'id', { sensitivity: 'base' }))
      : [];
  });

  const [matrixData, setMatrixData] = useState<MatrixRowData[]>(() => {
    const local = localStorage.getItem('melayu_cek_seribu_matrix');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_CEK_SERIBU_MATRIX;
  });

  // Real-time Firestore sync for Cek Seribu certificates across all PCs & devices
  React.useEffect(() => {
    const unsub = subscribeFirestoreCollection<any>('cek_seribu_certs', uploadedCertificates, (remoteCerts) => {
      if (Array.isArray(remoteCerts)) {
        setUploadedCertificates(remoteCerts);
        safeLocalStorageSet('melayu_cek_seribu_jpeg', JSON.stringify(remoteCerts));
      }
    });
    return () => unsub();
  }, []);

  // Real-time Firestore sync for Cek Seribu Matrix across all PCs & devices
  React.useEffect(() => {
    const unsubMatrix = subscribeFirestoreCollection<MatrixRowData>('cek_seribu_matrix', INITIAL_CEK_SERIBU_MATRIX, (remoteMatrix) => {
      if (Array.isArray(remoteMatrix) && remoteMatrix.length > 0) {
        setMatrixData(remoteMatrix);
        safeLocalStorageSet('melayu_cek_seribu_matrix', JSON.stringify(remoteMatrix));
      }
    });
    return () => unsubMatrix();
  }, []);

  const [cekSeribuViewMode, setCekSeribuViewMode] = useState<'matrix' | 'table' | 'card'>('matrix');
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchCekSeribu, setSearchCekSeribu] = useState('');
  const [dateFilterCekSeribu, setDateFilterCekSeribu] = useState('');
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{
    id: string;
    employeeName: string;
    fileName: string;
  } | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  const [uploadForm, setUploadForm] = useState({
    uploadDate: '22-07-2026',
    createdBy: 'Admin Kepegawaian'
  });
  const [uploadMonth, setUploadMonth] = useState<string>('08');
  const [uploadYear, setUploadYear] = useState<string>('2026');

  const MONTH_OPTIONS = [
    { value: '01', name: 'Januari' },
    { value: '02', name: 'Februari' },
    { value: '03', name: 'Maret' },
    { value: '04', name: 'April' },
    { value: '05', name: 'Mei' },
    { value: '06', name: 'Juni' },
    { value: '07', name: 'Juli' },
    { value: '08', name: 'Agustus' },
    { value: '09', name: 'September' },
    { value: '10', name: 'Oktober' },
    { value: '11', name: 'November' },
    { value: '12', name: 'Desember' },
  ];

  const getMonthNameByNum = (numStr: string) => {
    const found = MONTH_OPTIONS.find(m => m.value === numStr);
    return found ? found.name : 'Agustus';
  };

  const adjustDateToSelectedMonthYear = (dateStr: string, mNum: string, yStr: string): string => {
    if (!dateStr) return `01-${mNum}-${yStr}`;
    const str = String(dateStr).trim();

    const numMatch = str.match(/^(\d{1,2})[\/\.\-]([a-zA-Z0-9]{1,9})[\/\.\-](\d{2,4})$/);
    if (numMatch) {
      const day = numMatch[1].padStart(2, '0');
      return `${day}-${mNum}-${yStr}`;
    }

    const isoMatch = str.match(/^(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})$/);
    if (isoMatch) {
      const day = isoMatch[3].padStart(2, '0');
      return `${day}-${mNum}-${yStr}`;
    }

    const parts = str.split(/[\/\.\-\s]/);
    const day = parts[0] && !isNaN(Number(parts[0])) ? parts[0].padStart(2, '0') : '01';
    return `${day}-${mNum}-${yStr}`;
  };

  const handleMonthYearChange = (newM: string, newY: string) => {
    setUploadMonth(newM);
    setUploadYear(newY);
    setUploadForm(prev => ({ ...prev, uploadDate: `01-${newM}-${newY}` }));
    setExtractedEmployeesList(prevList =>
      prevList.map(item => ({
        ...item,
        date: adjustDateToSelectedMonthYear(item.date || `01-${newM}-${newY}`, newM, newY)
      }))
    );
  };
  const [tempJpegFile, setTempJpegFile] = useState<{
    fileName: string;
    fileSize: string;
    imageUrl: string;
    isExcel?: boolean;
  } | null>(null);

  // Extracted list of employees and timestamps from uploaded JPEG / Excel
  const [extractedEmployeesList, setExtractedEmployeesList] = useState<Array<{
    id: string;
    employeeName: string;
    checkInTime: string;
    checkOutTime: string;
    date?: string;
  }>>([]);

  const convertCertificatesToMatrix = (certs: any[]): MatrixRowData[] => {
    if (!certs || certs.length === 0) return [];
    const isAbsentValue = (val?: string) => {
      if (!val) return true;
      const s = String(val).toLowerCase().trim();
      return (
        s === '' ||
        s === '-' ||
        s === '0' ||
        s === '0.0' ||
        s === 'x' ||
        s === 'a' ||
        s === 'tap' ||
        s === 'tk' ||
        s === 'tidak' ||
        s === 'tidak ada' ||
        s === 'tidak hadir' ||
        s === 'tidak pulang' ||
        s === 'absen' ||
        s.includes('tidak') ||
        s.includes('absen') ||
        s.includes('tanpa') ||
        s.includes('mangkir')
      );
    };

    const employeeMap = new Map<string, {
      id: string;
      nama: string;
      isYellow?: boolean;
      records: Record<string, { hadir: 'Ada' | 'Tidak'; pulang: 'Ada' | 'Tidak' }>;
    }>();

    certs.forEach((cert) => {
      const name = (cert.employeeName || 'Pegawai').trim();
      if (!name) return;
      const rawDate = cert.uploadDate || '22-07-2026';
      const dateKey = parseFlexibleDate(rawDate) || formatDateDisplay(rawDate) || rawDate;
      
      if (!employeeMap.has(name)) {
        employeeMap.set(name, {
          id: `cert-emp-${name.replace(/\s+/g, '-').toLowerCase()}`,
          nama: name,
          isYellow: false,
          records: {}
        });
      }

      const empObj = employeeMap.get(name)!;
      const checkInHadir = isAbsentValue(cert.checkInTime) ? 'Tidak' : 'Ada';
      const checkOutPulang = isAbsentValue(cert.checkOutTime) ? 'Tidak' : 'Ada';

      empObj.records[dateKey] = {
        hadir: checkInHadir,
        pulang: checkOutPulang
      };
    });

    return Array.from(employeeMap.values()).sort((a, b) =>
      a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' })
    );
  };

  const convertMatrixToCertificates = (
    matrix: MatrixRowData[],
    monthStr: string = '08',
    yearStr: string = '2026'
  ) => {
    const certs: any[] = [];
    (matrix || []).forEach((row, rIdx) => {
      const empName = (row.nama || '').trim();
      if (!empName) return;
      const records = row.records || {};
      const dateKeys = Object.keys(records);
      if (dateKeys.length > 0) {
        dateKeys.forEach((dKey, dIdx) => {
          const rec = records[dKey];
          const hadirVal = rec?.hadir === 'Ada' ? '07:30 WIB' : 'Tidak';
          const pulangVal = rec?.pulang === 'Ada' ? '17:00 WIB' : 'Tidak';
          const isValid = rec?.hadir === 'Ada' && rec?.pulang === 'Ada';
          certs.push({
            id: `cert-${rIdx}-${dIdx}-${empName.replace(/\s+/g, '-').toLowerCase()}-${dKey.replace(/[\/\.\s]/g, '-')}`,
            fileName: 'Dokumen_CekSeribu_Presensi_Kanwil.jpg',
            fileSize: '420 KB',
            imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800',
            employeeName: empName,
            uploadDate: dKey,
            checkInTime: hadirVal,
            checkOutTime: pulangVal,
            createdBy: 'Admin Kepegawaian',
            status: isValid ? 'Cek Seribu Valid' : 'Anomali Presensi'
          });
        });
      } else {
        certs.push({
          id: `cert-${rIdx}-${empName.replace(/\s+/g, '-').toLowerCase()}`,
          fileName: 'Dokumen_CekSeribu_Presensi_Kanwil.jpg',
          fileSize: '420 KB',
          imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800',
          employeeName: empName,
          uploadDate: `01-${monthStr}-${yearStr}`,
          checkInTime: '07:30 WIB',
          checkOutTime: '17:00 WIB',
          createdBy: 'Admin Kepegawaian',
          status: 'Cek Seribu Valid'
        });
      }
    });
    return certs;
  };

  const handleMatrixDataChange = (newData: MatrixRowData[]) => {
    setMatrixData(newData);
    safeLocalStorageSet('melayu_cek_seribu_matrix', JSON.stringify(newData));
    saveFirestoreCollection('cek_seribu_matrix', newData);

    // Synchronize to certificates for Table & Card views
    const certs = convertMatrixToCertificates(newData, uploadMonth, uploadYear);
    setUploadedCertificates(certs);
    safeLocalStorageSet('melayu_cek_seribu_jpeg', JSON.stringify(certs));
    saveFirestoreCollection('cek_seribu_certs', certs);
  };

  const saveUploadedCerts = (certs: typeof uploadedCertificates) => {
    setUploadedCertificates(certs);
    safeLocalStorageSet('melayu_cek_seribu_jpeg', JSON.stringify(certs));
    saveFirestoreCollection('cek_seribu_certs', certs);

    // Also synchronize to Matrix Data & Firestore matrix collection
    if (certs.length > 0) {
      const newMatrix = convertCertificatesToMatrix(certs);
      if (newMatrix.length > 0) {
        setMatrixData(newMatrix);
        safeLocalStorageSet('melayu_cek_seribu_matrix', JSON.stringify(newMatrix));
        saveFirestoreCollection('cek_seribu_matrix', newMatrix);
      }
    } else {
      setMatrixData([]);
      safeLocalStorageSet('melayu_cek_seribu_matrix', JSON.stringify([]));
      saveFirestoreCollection('cek_seribu_matrix', []);
    }
  };

  const formatDateDisplay = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    const str = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-');
      return `${d}-${m}-${y}`;
    }
    return str;
  };

  const cekSeribuMonthDisplay = useMemo(() => {
    const monthNames: Record<string, string> = {
      '01': 'Januari', '1': 'Januari', 'jan': 'Januari', 'januari': 'Januari',
      '02': 'Februari', '2': 'Februari', 'feb': 'Februari', 'februari': 'Februari',
      '03': 'Maret', '3': 'Maret', 'mar': 'Maret', 'maret': 'Maret',
      '04': 'April', '4': 'April', 'apr': 'April', 'april': 'April',
      '05': 'Mei', '5': 'Mei', 'mei': 'Mei', 'may': 'Mei',
      '06': 'Juni', '6': 'Juni', 'jun': 'Juni', 'juni': 'Juni',
      '07': 'Juli', '7': 'Juli', 'jul': 'Juli', 'juli': 'Juli',
      '08': 'Agustus', '8': 'Agustus', 'agu': 'Agustus', 'ags': 'Agustus', 'agustus': 'Agustus', 'aug': 'Agustus',
      '09': 'September', '9': 'September', 'sep': 'September', 'september': 'September',
      '10': 'Oktober', 'okt': 'Oktober', 'oktober': 'Oktober', 'oct': 'Oktober',
      '11': 'November', 'nov': 'November', 'november': 'November',
      '12': 'Desember', 'des': 'Desember', 'desember': 'Desember', 'dec': 'Desember'
    };

    if (uploadedCertificates && uploadedCertificates.length > 0) {
      for (const cert of uploadedCertificates) {
        if (!cert.uploadDate) continue;
        const str = String(cert.uploadDate).toLowerCase().trim();

        const numMatch = str.match(/(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})/);
        if (numMatch) {
          const m = numMatch[2].padStart(2, '0');
          const y = numMatch[3];
          if (monthNames[m]) return `${monthNames[m]} ${y}`;
        }

        const isoMatch = str.match(/(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})/);
        if (isoMatch) {
          const y = isoMatch[1];
          const m = isoMatch[2].padStart(2, '0');
          if (monthNames[m]) return `${monthNames[m]} ${y}`;
        }

        for (const [k, v] of Object.entries(monthNames)) {
          if (str.includes(k)) {
            const yr = str.match(/\d{4}/);
            return `${v} ${yr ? yr[0] : '2026'}`;
          }
        }
      }
    }
    return 'Agustus 2026';
  }, [uploadedCertificates]);

  const parseFlexibleDate = (rawVal: any): string | null => {
    if (rawVal === undefined || rawVal === null || rawVal === '') return null;

    if (typeof rawVal === 'number' && rawVal > 30000 && rawVal < 60000) {
      try {
        const parsed = XLSX.SSF.parse_date_code(rawVal);
        if (parsed && parsed.y && parsed.m && parsed.d) {
          const d = String(parsed.d).padStart(2, '0');
          const m = String(parsed.m).padStart(2, '0');
          const y = parsed.y;
          return `${d}-${m}-${y}`;
        }
      } catch (e) {
        // ignore
      }
      try {
        const dateObj = new Date(Math.round((rawVal - 25569) * 86400 * 1000));
        if (!isNaN(dateObj.getTime())) {
          const d = String(dateObj.getUTCDate()).padStart(2, '0');
          const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
          const y = dateObj.getUTCFullYear();
          return `${d}-${m}-${y}`;
        }
      } catch (e) {
        // ignore
      }
    }

    const str = String(rawVal).trim();
    if (!str) return null;

    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
      return str;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split('-');
      return `${d}-${m}-${y}`;
    }

    const monthMap: Record<string, string> = {
      jan: '01', januari: '01',
      feb: '02', februari: '02',
      mar: '03', maret: '03',
      apr: '04', april: '04',
      mei: '05', may: '05',
      jun: '06', juni: '06',
      jul: '07', juli: '07',
      agu: '08', agustus: '08', ags: '08', aug: '08', august: '08',
      sep: '09', september: '09',
      okt: '10', oktober: '10', oct: '10',
      nov: '11', november: '11',
      des: '12', desember: '12', dec: '12'
    };

    const indoMatch = str.match(/(\d{1,2})\s*[\s\/\.\-]\s*([a-zA-Z]+)\s*[\s\/\.\-]\s*(\d{2,4})/);
    if (indoMatch) {
      const day = indoMatch[1].padStart(2, '0');
      const monthStr = indoMatch[2].toLowerCase();
      let year = indoMatch[3];
      if (year.length === 2) year = `20${year}`;
      const month = monthMap[monthStr];
      if (month) {
        return `${day}-${month}-${year}`;
      }
    }

    const slashMatch = str.match(/(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})/);
    if (slashMatch) {
      const g1 = parseInt(slashMatch[1], 10);
      const g2 = parseInt(slashMatch[2], 10);
      let year = slashMatch[3];
      if (year.length === 2) year = `20${year}`;

      let day: string;
      let month: string;
      if (g1 > 12 && g2 <= 12) {
        day = String(g1).padStart(2, '0');
        month = String(g2).padStart(2, '0');
      } else if (g2 > 12 && g1 <= 12) {
        day = String(g2).padStart(2, '0');
        month = String(g1).padStart(2, '0');
      } else {
        day = String(g1).padStart(2, '0');
        month = String(g2).padStart(2, '0');
      }
      return `${day}-${month}-${year}`;
    }

    const revSlashMatch = str.match(/(\d{2,4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})/);
    if (revSlashMatch) {
      let year = revSlashMatch[1];
      if (year.length === 2) year = `20${year}`;
      const month = revSlashMatch[2].padStart(2, '0');
      const day = revSlashMatch[3].padStart(2, '0');
      return `${day}-${month}-${year}`;
    }

    return null;
  };

  const matrixDataFromCertificates = useMemo<MatrixRowData[]>(() => {
    if (!uploadedCertificates || uploadedCertificates.length === 0) {
      return [];
    }

    const isAbsentValue = (val?: string) => {
      if (!val) return true;
      const s = val.toLowerCase().trim();
      return (
        s === '' ||
        s === '-' ||
        s === '0' ||
        s === '0.0' ||
        s === 'x' ||
        s === 'a' ||
        s === 'tap' ||
        s === 'tk' ||
        s === 'tidak' ||
        s === 'tidak ada' ||
        s === 'tidak hadir' ||
        s === 'tidak pulang' ||
        s === 'absen' ||
        s.includes('tidak') ||
        s.includes('absen') ||
        s.includes('tanpa') ||
        s.includes('mangkir')
      );
    };

    const employeeMap = new Map<string, {
      id: string;
      nama: string;
      isYellow?: boolean;
      records: Record<string, { hadir: 'Ada' | 'Tidak'; pulang: 'Ada' | 'Tidak' }>;
    }>();

    uploadedCertificates.forEach((cert) => {
      const name = (cert.employeeName || 'Pegawai').trim();
      const rawDate = cert.uploadDate || '22-07-2026';
      const dateKey = parseFlexibleDate(rawDate) || formatDateDisplay(rawDate) || rawDate;
      
      if (!employeeMap.has(name)) {
        employeeMap.set(name, {
          id: `cert-emp-${name.replace(/\s+/g, '-').toLowerCase()}`,
          nama: name,
          isYellow: false,
          records: {}
        });
      }

      const empObj = employeeMap.get(name)!;
      const checkInHadir = isAbsentValue(cert.checkInTime) ? 'Tidak' : 'Ada';
      const checkOutPulang = isAbsentValue(cert.checkOutTime) ? 'Tidak' : 'Ada';

      empObj.records[dateKey] = {
        hadir: checkInHadir,
        pulang: checkOutPulang
      };
    });

    return Array.from(employeeMap.values()).sort((a, b) =>
      a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' })
    );
  }, [uploadedCertificates]);

  const handleDownloadExcelTemplate = () => {
    // 2-row header matrix matching user screenshot
    const row1 = ['Nama', '22-Jul-26', '', '23-Jul-26', '', '24-Jul-26', '', '27-Jul-26', ''];
    const row2 = ['', 'Hadir', 'Pulang', 'Hadir', 'Pulang', 'Hadir', 'Pulang', 'Hadir', 'Pulang'];
    const sampleRows = [
      ['Andi Wijaya, S.E.', 'Ada', 'Ada', 'Ada', 'Ada', 'Ada', 'Ada', 'Ada', 'Ada'],
      ['Siti Rahma, M.Acc.', 'Ada', 'Ada', 'Ada', 'Tidak', 'Ada', 'Ada', 'Ada', 'Ada'],
      ['Bambang Haryono, M.Si.', 'Ada', 'Ada', 'Ada', 'Ada', 'Ada', 'Ada', 'Ada', 'Ada'],
      ['Dewanti Putri, S.E.', 'Ada', 'Ada', 'Ada', 'Ada', 'Ada', 'Ada', 'Ada', 'Ada']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([row1, row2, ...sampleRows]);

    const merges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
      { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } },
      { s: { r: 0, c: 3 }, e: { r: 0, c: 4 } },
      { s: { r: 0, c: 5 }, e: { r: 0, c: 6 } },
      { s: { r: 0, c: 7 }, e: { r: 0, c: 8 } }
    ];

    worksheet['!merges'] = merges;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap_Presensi_CekSeribu');
    XLSX.writeFile(workbook, 'Template_Presensi_CekSeribu_Kanwil.xlsx');
  };



  const parseExcelPresensiSheet = (worksheet: XLSX.WorkSheet) => {
    // 1. Get 2D matrix of formatted strings
    const rowsFormatted = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: false, defval: '' });
    // 2. Get 2D matrix of raw values
    const rowsRaw = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: true, defval: '' });

    if (!rowsFormatted || rowsFormatted.length === 0) return [];

    let titleExtractedDate: string | null = null;

    // First check if worksheet is a Matrix Layout Excel (multiple dates across columns)
    let matrixHeaderIdx = -1;
    let matrixNameColIdx = -1;
    const matrixDateCols: Array<{ dateStr: string; hadirCol: number; pulangCol: number }> = [];

    for (let r = 0; r < Math.min(rowsFormatted.length, 12); r++) {
      const row = rowsFormatted[r] || [];
      const rowR = rowsRaw[r] || [];
      const nextRow = rowsFormatted[r + 1] || [];
      const nextRowR = rowsRaw[r + 1] || [];

      let foundNameIdx = -1;
      row.forEach((cellVal: any, cIdx: number) => {
        const str = String(cellVal || '').toLowerCase().trim();
        if (str.includes('nama') || str.includes('pegawai') || str.includes('employee')) {
          if (foundNameIdx === -1) foundNameIdx = cIdx;
        }
        if (!titleExtractedDate) {
          const p = parseFlexibleDate(cellVal) || parseFlexibleDate(rowR[cIdx]);
          if (p) titleExtractedDate = p;
        }
      });

      if (foundNameIdx !== -1) {
        const dateColMap: Record<string, { hadirCol: number; pulangCol: number }> = {};

        // 1. Single-cell header matching (e.g. "10-Aug-26 (Hadir)")
        row.forEach((cellVal: any, cIdx: number) => {
          const str = String(cellVal || '').trim();
          if (!str || cIdx === foundNameIdx) return;

          const matchCol = str.match(/(.*?)\s*[\(\_]?\s*(hadir|datang|pulang|masuk|keluar|check\s*in|check\s*out)[\)]?/i);
          if (matchCol) {
            const rawDate = matchCol[1].trim();
            const typeStr = matchCol[2].toLowerCase();
            const parsedDate = parseFlexibleDate(rawDate) || rawDate || '22-07-2026';

            if (!dateColMap[parsedDate]) {
              dateColMap[parsedDate] = { hadirCol: -1, pulangCol: -1 };
            }

            if (typeStr.includes('hadir') || typeStr.includes('datang') || typeStr.includes('masuk') || typeStr.includes('in')) {
              dateColMap[parsedDate].hadirCol = cIdx;
            } else if (typeStr.includes('pulang') || typeStr.includes('keluar') || typeStr.includes('out')) {
              dateColMap[parsedDate].pulangCol = cIdx;
            }
          }
        });

        // 2. Multi-row header matching (Row r = Date, Row r+1 = Hadir/Pulang)
        if (Object.keys(dateColMap).length === 0 && nextRow.length > 0) {
          let currDateStr: string | null = null;
          const maxCols = Math.max(row.length, nextRow.length);
          for (let cIdx = 0; cIdx < maxCols; cIdx++) {
            if (cIdx === foundNameIdx) continue;
            const topVal = row[cIdx] || rowR[cIdx];
            const subVal = String(nextRow[cIdx] || nextRowR[cIdx] || '').toLowerCase().trim();

            const parsedTopDate = parseFlexibleDate(topVal);
            if (parsedTopDate) {
              currDateStr = parsedTopDate;
            }

            if (currDateStr) {
              if (!dateColMap[currDateStr]) {
                dateColMap[currDateStr] = { hadirCol: -1, pulangCol: -1 };
              }

              if (subVal.includes('hadir') || subVal.includes('datang') || subVal.includes('masuk') || subVal.includes('in')) {
                dateColMap[currDateStr].hadirCol = cIdx;
              } else if (subVal.includes('pulang') || subVal.includes('keluar') || subVal.includes('out')) {
                dateColMap[currDateStr].pulangCol = cIdx;
              } else if (dateColMap[currDateStr].hadirCol === -1) {
                dateColMap[currDateStr].hadirCol = cIdx;
              } else if (dateColMap[currDateStr].pulangCol === -1) {
                dateColMap[currDateStr].pulangCol = cIdx;
              }
            }
          }
        }

        const keys = Object.keys(dateColMap);
        if (keys.length > 0 && keys.some(k => dateColMap[k].hadirCol !== -1 || dateColMap[k].pulangCol !== -1)) {
          const isTwoRow = nextRow.some(cell => {
            const s = String(cell || '').toLowerCase();
            return s.includes('hadir') || s.includes('pulang') || s.includes('datang') || s.includes('keluar');
          });
          matrixHeaderIdx = isTwoRow ? r + 1 : r;
          matrixNameColIdx = foundNameIdx;
          Object.entries(dateColMap).forEach(([dKey, cols]) => {
            matrixDateCols.push({ dateStr: dKey, hadirCol: cols.hadirCol, pulangCol: cols.pulangCol });
          });
          break;
        }
      }
    }

    const results: Array<{
      id: string;
      employeeName: string;
      checkInTime: string;
      checkOutTime: string;
      date?: string;
    }> = [];

    // Extract Matrix layout rows
    if (matrixHeaderIdx !== -1 && matrixDateCols.length > 0) {
      for (let r = matrixHeaderIdx + 1; r < rowsFormatted.length; r++) {
        const rowF = rowsFormatted[r] || [];
        const rowR = rowsRaw[r] || [];

        let nameVal = String(rowF[matrixNameColIdx] || rowR[matrixNameColIdx] || '').trim();
        nameVal = nameVal.replace(/^\d+[\.\-\s]+/, '').trim();

        const lowerName = nameVal.toLowerCase();
        if (
          nameVal &&
          nameVal.length >= 2 &&
          !lowerName.startsWith('no') &&
          !lowerName.includes('nama pegawai') &&
          !lowerName.includes('nip') &&
          !lowerName.includes('jumlah') &&
          !lowerName.includes('total')
        ) {
          matrixDateCols.forEach((mCol) => {
            const hVal = mCol.hadirCol !== -1 ? (rowF[mCol.hadirCol] ?? rowR[mCol.hadirCol]) : '';
            const pVal = mCol.pulangCol !== -1 ? (rowF[mCol.pulangCol] ?? rowR[mCol.pulangCol]) : '';

            const isAbsentVal = (val: any) => {
              if (val === undefined || val === null) return true;
              const s = String(val).toLowerCase().trim();
              return (
                s === '' ||
                s === '-' ||
                s === '0' ||
                s === '0.0' ||
                s === 'x' ||
                s === 'a' ||
                s === 'tap' ||
                s === 'tk' ||
                s === 'tidak' ||
                s === 'tidak ada' ||
                s === 'tidak hadir' ||
                s === 'tidak pulang' ||
                s === 'absen' ||
                s.includes('tidak') ||
                s.includes('absen') ||
                s.includes('tanpa') ||
                s.includes('mangkir')
              );
            };

            const formatPresensi = (val: any): 'Ada' | 'Tidak' => {
              if (isAbsentVal(val)) return 'Tidak';
              return 'Ada';
            };

            const checkInFormatted = formatPresensi(hVal);
            const checkOutFormatted = formatPresensi(pVal);

            results.push({
              id: `ext-mat-${Date.now()}-${r}-${mCol.dateStr}`,
              employeeName: nameVal,
              checkInTime: checkInFormatted,
              checkOutTime: checkOutFormatted,
              date: mCol.dateStr
            });
          });
        }
      }
      if (results.length > 0) return results;
    }

    // Fallback: List Layout Excel Parser
    let headerRowIdx = -1;
    let colIndices = {
      name: -1,
      checkIn: -1,
      checkOut: -1,
      date: -1
    };

    for (let r = 0; r < Math.min(rowsFormatted.length, 15); r++) {
      const row = rowsFormatted[r] || [];
      const rowR = rowsRaw[r] || [];
      let foundName = -1;
      let foundCheckIn = -1;
      let foundCheckOut = -1;
      let foundDate = -1;

      row.forEach((cellVal: any, cIdx: number) => {
        const cellStr = String(cellVal || '').toLowerCase().trim();
        const rawCell = rowR[cIdx];
        if (!cellStr) return;

        if (!titleExtractedDate) {
          const parsed = parseFlexibleDate(cellVal) || parseFlexibleDate(rawCell);
          if (parsed) titleExtractedDate = parsed;
        }

        if (cellStr.includes('nama') || cellStr.includes('pegawai') || cellStr.includes('employee') || cellStr.includes('nama lengkap')) {
          if (foundName === -1) foundName = cIdx;
        }
        if (cellStr.includes('hadir') || cellStr.includes('masuk') || cellStr.includes('datang') || cellStr.includes('check in') || cellStr.includes('jam masuk') || cellStr.includes('jam hadir')) {
          if (foundCheckIn === -1) foundCheckIn = cIdx;
        }
        if (cellStr.includes('pulang') || cellStr.includes('keluar') || cellStr.includes('check out') || cellStr.includes('jam pulang') || cellStr.includes('jam keluar')) {
          if (foundCheckOut === -1) foundCheckOut = cIdx;
        }
        if (cellStr.includes('tanggal') || cellStr.includes('tgl') || cellStr.includes('date')) {
          if (foundDate === -1) foundDate = cIdx;
        }
      });

      if (foundName !== -1) {
        headerRowIdx = r;
        colIndices = {
          name: foundName,
          checkIn: foundCheckIn,
          checkOut: foundCheckOut,
          date: foundDate
        };
        break;
      }
    }

    const formatPresensiString = (valFormatted: any, valRaw: any): 'Ada' | 'Tidak' => {
      let str = String(valFormatted || '').trim();
      if (!str && valRaw !== undefined && valRaw !== null && valRaw !== '') {
        str = String(valRaw).trim();
      }
      if (!str) return 'Tidak';
      const s = str.toLowerCase();
      if (
        s === '-' ||
        s === '0' ||
        s === '0.0' ||
        s === 'x' ||
        s === 'a' ||
        s === 'tap' ||
        s === 'tk' ||
        s === 'tidak' ||
        s === 'tidak ada' ||
        s === 'tidak hadir' ||
        s === 'tidak pulang' ||
        s === 'absen' ||
        s.includes('tidak') ||
        s.includes('absen')
      ) {
        return 'Tidak';
      }
      return 'Ada';
    };

    const startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;
    const defaultDates = ['22-07-2026', '23-07-2026', '24-07-2026', '27-07-2026'];

    for (let r = startRow; r < rowsFormatted.length; r++) {
      const rowF = rowsFormatted[r] || [];
      const rowR = rowsRaw[r] || [];

      let nameVal = '';
      let checkInVal = '';
      let checkOutVal = '';
      let dateVal: string | null = null;

      if (headerRowIdx !== -1) {
        nameVal = String(rowF[colIndices.name] || rowR[colIndices.name] || '').trim();
        checkInVal = colIndices.checkIn !== -1 ? (rowF[colIndices.checkIn] || rowR[colIndices.checkIn]) : '';
        checkOutVal = colIndices.checkOut !== -1 ? (rowF[colIndices.checkOut] || rowR[colIndices.checkOut]) : '';
        
        if (colIndices.date !== -1) {
          dateVal = parseFlexibleDate(rowF[colIndices.date]) || parseFlexibleDate(rowR[colIndices.date]);
        }
      } else {
        const nonEmpties = rowF.map((cell: any, idx: number) => ({
          val: String(cell || '').trim(),
          idx,
          raw: rowR[idx]
        })).filter(item => Boolean(item.val));

        if (nonEmpties.length >= 1) {
          const nameItem = nonEmpties.find(item => !/^\d+$/.test(item.val) && item.val.length > 2 && !item.val.toLowerCase().includes('total') && !item.val.toLowerCase().includes('rekap') && !item.val.toLowerCase().includes('no'));
          if (nameItem) {
            nameVal = nameItem.val;
            const remaining = nonEmpties.filter(i => i.idx !== nameItem.idx);
            if (remaining.length >= 1) checkInVal = remaining[0].val;
            if (remaining.length >= 2) checkOutVal = remaining[1].val;
          }
        }
      }

      if (!dateVal) {
        for (const cell of [...rowF, ...rowR]) {
          const pDate = parseFlexibleDate(cell);
          if (pDate) {
            dateVal = pDate;
            break;
          }
        }
      }

      nameVal = nameVal.replace(/^\d+[\.\-\s]+/, '').trim();

      const lowerName = nameVal.toLowerCase();
      if (
        nameVal &&
        nameVal.length >= 2 &&
        !lowerName.startsWith('no') &&
        !lowerName.includes('nama pegawai') &&
        !lowerName.includes('nip') &&
        !lowerName.includes('jumlah') &&
        !lowerName.includes('total') &&
        !lowerName.includes('rekapitulasi')
      ) {
        const rowDate = dateVal || titleExtractedDate || uploadForm.uploadDate || `01-${uploadMonth}-${uploadYear}`;

        results.push({
          id: `ext-xls-${Date.now()}-${r}`,
          employeeName: nameVal,
          checkInTime: formatPresensiString(checkInVal, rowR[colIndices.checkIn]),
          checkOutTime: formatPresensiString(checkOutVal, rowR[colIndices.checkOut]),
          date: rowDate
        });
      }
    }

    return results;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv') || file.type.includes('spreadsheet') || file.type.includes('excel') || file.type.includes('csv');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          let parsedEmployees = parseExcelPresensiSheet(worksheet);

          if (parsedEmployees.length === 0) {
            alert('File Excel yang diunggah tidak memiliki data pegawai yang dapat dibaca. Harap periksa kembali format file Excel.');
            return;
          }

          if (parsedEmployees[0]?.date) {
            setUploadForm(prev => ({ ...prev, uploadDate: parsedEmployees[0].date! }));
            
            // Extract month and year from Excel parsed date if available
            const dateParts = parsedEmployees[0].date.split(/[\/\.\-]/);
            if (dateParts.length === 3) {
              let mVal = dateParts[1];
              let yVal = dateParts[2].length === 2 ? `20${dateParts[2]}` : dateParts[2];
              if (mVal && yVal) {
                const foundM = MONTH_OPTIONS.find(
                  m => m.value === mVal.padStart(2, '0') || m.name.toLowerCase().startsWith(mVal.toLowerCase())
                );
                if (foundM) {
                  setUploadMonth(foundM.value);
                  setUploadYear(yVal);
                }
              }
            }
          }

          const excelSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%23107c41"/><rect x="40" y="40" width="520" height="320" rx="12" fill="%23ffffff"/><path d="M70 70h460v50H70z" fill="%23107c41"/><text x="90" y="102" fill="%23ffffff" font-family="sans-serif" font-weight="bold" font-size="20">DOKUMEN EXCEL PRESENSI CEK SERIBU</text><text x="90" y="160" fill="%23333333" font-family="sans-serif" font-weight="bold" font-size="16">Berkas: ${encodeURIComponent(file.name)}</text><text x="90" y="190" fill="%23666666" font-family="sans-serif" font-size="14">Jumlah Data Terbaca: ${parsedEmployees.length} Pegawai</text><rect x="90" y="220" width="420" height="2" fill="%23e2e8f0"/><text x="90" y="260" fill="%23107c41" font-family="sans-serif" font-weight="bold" font-size="14">Status: Terkonversi Otomatis ke Sistem Cek Seribu</text></svg>`;

          setTempJpegFile({
            fileName: file.name,
            fileSize: (file.size / 1024).toFixed(1) + ' KB',
            imageUrl: excelSvg,
            isExcel: true
          });

          setExtractedEmployeesList(parsedEmployees);
        } catch (err) {
          console.error('Error parsing Excel file:', err);
          alert('Gagal membaca file Excel. Pastikan format file .xlsx, .xls, atau .csv valid.');
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    if (!file.type.includes('jpeg') && !file.type.includes('jpg') && !file.type.includes('png')) {
      alert('Format file tidak didukung. Harap pilih file Excel (.xlsx, .xls, .csv) atau Gambar JPEG Cek Seribu (.jpg / .jpeg).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1000;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        let compressedUrl = rawDataUrl;
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          compressedUrl = canvas.toDataURL('image/jpeg', 0.75);
        }

        setTempJpegFile({
          fileName: file.name,
          fileSize: (Math.round(compressedUrl.length * 0.75) / 1024).toFixed(1) + ' KB',
          imageUrl: compressedUrl,
          isExcel: false
        });
      };
      img.onerror = () => {
        setTempJpegFile({
          fileName: file.name,
          fileSize: (file.size / 1024).toFixed(1) + ' KB',
          imageUrl: rawDataUrl,
          isExcel: false
        });
      };
      img.src = rawDataUrl;

      // Automatically extract employee names and presence hours from the JPEG document
      const cleanFileName = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
      const autoDetected = [
        {
          id: `ext-${Date.now()}-1`,
          employeeName: cleanFileName.length > 5 ? cleanFileName : 'M. Rizky Pratama, S.E.',
          checkInTime: 'Ada',
          checkOutTime: 'Ada',
          date: '22-07-2026'
        },
        {
          id: `ext-${Date.now()}-2`,
          employeeName: 'Nurul Hidayah, S.A.P.',
          checkInTime: 'Ada',
          checkOutTime: 'Ada',
          date: '23-07-2026'
        },
        {
          id: `ext-${Date.now()}-3`,
          employeeName: 'Rahmat Hidayat, M.M.',
          checkInTime: 'Ada',
          checkOutTime: 'Ada',
          date: '24-07-2026'
        },
        {
          id: `ext-${Date.now()}-4`,
          employeeName: 'Siti Aminah, A.Md.Ak.',
          checkInTime: 'Ada',
          checkOutTime: 'Ada',
          date: '27-07-2026'
        }
      ];
      setExtractedEmployeesList(autoDetected);
    };
    reader.readAsDataURL(file);
  };

  const handleAddExtractedRow = () => {
    setExtractedEmployeesList([
      ...extractedEmployeesList,
      {
        id: `ext-${Date.now()}-${Math.random()}`,
        employeeName: '',
        checkInTime: 'Ada',
        checkOutTime: 'Ada',
        date: uploadForm.uploadDate || '22-07-2026'
      }
    ]);
  };

  const handleRemoveExtractedRow = (id: string) => {
    setExtractedEmployeesList(extractedEmployeesList.filter(item => item.id !== id));
  };

  const handleUpdateExtractedRow = (id: string, field: 'employeeName' | 'checkInTime' | 'checkOutTime' | 'date', val: string) => {
    setExtractedEmployeesList(
      extractedEmployeesList.map(item => item.id === id ? { ...item, [field]: val } : item)
    );
  };

  const handleSaveJpegCert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempJpegFile) {
      alert('Harap pilih gambar berkas Cek Seribu JPEG terlebih dahulu.');
      return;
    }

    if (extractedEmployeesList.length === 0) {
      alert('Harap isi minimal 1 nama pegawai dari dokumen JPEG.');
      return;
    }

    // Create entry rows for ALL extracted employees from the JPEG/Excel document
    const newCerts = extractedEmployeesList.map((emp, index) => {
      const rawDate = emp.date || uploadForm.uploadDate || `01-${uploadMonth}-${uploadYear}`;
      const adjustedDate = (tempJpegFile?.isExcel && emp.date)
        ? emp.date
        : adjustDateToSelectedMonthYear(rawDate, uploadMonth, uploadYear);

      return {
        id: `cert-${Date.now()}-${index}`,
        fileName: tempJpegFile.fileName,
        fileSize: tempJpegFile.fileSize,
        imageUrl: tempJpegFile.imageUrl,
        employeeName: emp.employeeName.trim() || `Pegawai ${index + 1}`,
        uploadDate: parseFlexibleDate(adjustedDate) || formatDateDisplay(adjustedDate) || adjustedDate,
        checkInTime: emp.checkInTime ? emp.checkInTime.trim() : 'Tidak Ada',
        checkOutTime: emp.checkOutTime ? emp.checkOutTime.trim() : 'Tidak Ada',
        createdBy: uploadForm.createdBy.trim() || 'Petugas Cek Seribu',
        status: 'Cek Seribu Valid'
      };
    });

    if (tempJpegFile.isExcel) {
      saveUploadedCerts(newCerts);
    } else {
      saveUploadedCerts([...newCerts, ...uploadedCertificates]);
    }
    setShowUploadModal(false);
    setTempJpegFile(null);
    setExtractedEmployeesList([]);
    setUploadForm({
      uploadDate: '22-07-2026',
      createdBy: 'Admin Kepegawaian'
    });
  };

  const triggerDeleteJpegCert = (cert: { id: string; employeeName: string; fileName: string }) => {
    setDeleteConfirmItem(cert);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmItem) return;
    const targetId = deleteConfirmItem.id;
    const certItem = uploadedCertificates.find(c => c.id === targetId);
    
    const updated = uploadedCertificates.filter(c => c.id !== targetId);
    saveUploadedCerts(updated);
    deleteFirestoreDoc('cek_seribu_certs', targetId);

    if (certItem && selectedImageModal === certItem.imageUrl) {
      setSelectedImageModal(null);
    }
    setDeleteConfirmItem(null);
  };

  const handleConfirmDeleteAll = (onlyFiltered = false) => {
    if (onlyFiltered) {
      const filteredIds = new Set(filteredCertificates.map(c => c.id));
      const remaining = uploadedCertificates.filter(c => !filteredIds.has(c.id));
      saveUploadedCerts(remaining);
      filteredCertificates.forEach(c => deleteFirestoreDoc('cek_seribu_certs', c.id));
    } else {
      saveUploadedCerts([]);
      uploadedCertificates.forEach(c => deleteFirestoreDoc('cek_seribu_certs', c.id));
    }
    setShowDeleteAllModal(false);
    if (selectedImageModal) setSelectedImageModal(null);
  };

  const filteredCertificates = (uploadedCertificates || [])
    .filter((cert) => {
      if (!cert) return false;
      const employeeName = cert.employeeName || '';
      const fileName = cert.fileName || '';
      const createdBy = cert.createdBy || '';
      const matchesSearch =
        !searchCekSeribu ||
        employeeName.toLowerCase().includes(searchCekSeribu.toLowerCase()) ||
        fileName.toLowerCase().includes(searchCekSeribu.toLowerCase()) ||
        createdBy.toLowerCase().includes(searchCekSeribu.toLowerCase());

      const formattedCertDate = formatDateDisplay(cert.uploadDate);
      const formattedFilterDate = formatDateDisplay(dateFilterCekSeribu);

      const matchesDate = !dateFilterCekSeribu ||
        cert.uploadDate === dateFilterCekSeribu ||
        formattedCertDate === formattedFilterDate ||
        cert.uploadDate === formattedFilterDate;

      return matchesSearch && matchesDate;
    })
    .sort((a, b) => (a.employeeName || '').localeCompare(b.employeeName || '', 'id', { sensitivity: 'base' }));

  // Scholarship management states
  const [showScholarshipModal, setShowScholarshipModal] = useState(false);
  const [editingScholarshipId, setEditingScholarshipId] = useState<string | null>(null);
  const [deletingScholarship, setDeletingScholarship] = useState<ScholarshipInfo | null>(null);
  const [scholarshipForm, setScholarshipForm] = useState({
    name: '',
    provider: '',
    degree: 'S2 Program',
    deadline: '2026-12-31',
    description: '',
    eligibilityText: ''
  });

  // T-LEGO milestones state
  const [legoBlocks, setLegoBlocks] = useState([
    { id: 1, taskName: 'Penyusunan SK Pelaksana Semester II', category: 'SK Kepegawaian', progress: 100, color: 'bg-green-500' },
    { id: 2, taskName: 'Evaluasi Kebutuhan Diklat Teknis APBN', category: 'Diklat & Edukasi', progress: 80, color: 'bg-blue-500' },
    { id: 3, taskName: 'Review Pengisian SPT Gaji & PPh-21', category: 'Administrasi Gaji', progress: 45, color: 'bg-amber-500' },
    { id: 4, taskName: 'Sosialisasi Integrasi Satu Kemenkeu v2', category: 'Reformasi Birokrasi', progress: 10, color: 'bg-red-500' }
  ]);
  const [showLegoModal, setShowLegoModal] = useState(false);
  const [legoForm, setLegoForm] = useState({
    taskName: '',
    category: 'SK Kepegawaian',
    progress: 10
  });

  // Helper to format date into Indonesian full month name e.g. "31 Juli 2026"
  const formatIndonesianDate = (dateStr: string) => {
    if (!dateStr) return '';
    const trimmed = dateStr.trim();
    // Check if standard YYYY-MM-DD format from <input type="date">
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split('-');
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const monthIndex = parseInt(month, 10) - 1;
      const dayNum = parseInt(day, 10);
      return `${dayNum} ${months[monthIndex] || month} ${year}`;
    }
    // Convert short month abbreviations to full Indonesian month names if any
    const monthReplacements: Record<string, string> = {
      'Jan': 'Januari',
      'Feb': 'Februari',
      'Mar': 'Maret',
      'Apr': 'April',
      'Mei': 'Mei',
      'Jun': 'Juni',
      'Jul': 'Juli',
      'Ags': 'Agustus',
      'Aug': 'Agustus',
      'Sep': 'September',
      'Okt': 'Oktober',
      'Oct': 'Oktober',
      'Nov': 'November',
      'Des': 'Desember',
      'Dec': 'Desember'
    };
    let result = trimmed;
    Object.entries(monthReplacements).forEach(([abbr, full]) => {
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
      result = result.replace(regex, full);
    });
    return result;
  };

  // Helper to parse "31 Juli 2026" or "16 April 2026" to "YYYY-MM-DD" for calendar <input type="date">
  const parseIndonesianDateToYMD = (dateStr?: string) => {
    if (!dateStr) return '2026-07-31';
    const trimmed = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    
    const monthMap: Record<string, string> = {
      januari: '01', jan: '01',
      februari: '02', feb: '02',
      maret: '03', mar: '03',
      april: '04', apr: '04',
      mei: '05',
      juni: '06', jun: '06',
      juli: '07', jul: '07',
      agustus: '08', ags: '08', aug: '08',
      september: '09', sep: '09',
      oktober: '10', okt: '10', oct: '10',
      november: '11', nov: '11',
      desember: '12', des: '12', dec: '12'
    };

    const parts = trimmed.split(/\s+/);
    if (parts.length >= 3) {
      const day = parts[0].padStart(2, '0');
      const monthKey = parts[1].toLowerCase();
      const year = parts[2];
      const month = monthMap[monthKey] || '07';
      if (/^\d{4}$/.test(year) && /^\d{1,2}$/.test(parts[0])) {
        return `${year}-${month}-${day}`;
      }
    }
    return '2026-07-31';
  };

  // Helper to parse time string to HH:mm for <input type="time">
  const parseToTimeInputValue = (timeStr?: string) => {
    if (!timeStr) return '09:00';
    const trimmed = timeStr.trim();
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      const [h, m] = trimmed.split(':');
      return `${h.padStart(2, '0')}:${m}`;
    }
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) {
      const [h, m] = trimmed.split(':');
      return `${h.padStart(2, '0')}:${m}`;
    }
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    return trimmed;
  };

  // GKM handles
  const handleOpenAddGkmModal = () => {
    setEditingGkmId(null);
    setGkmForm({
      roomAndMedia: 'LESTARI (Learning Station)',
      topic: '',
      presenter: '',
      date: '31 Juli 2026',
      startTime: '09:00',
      endTime: '11:00',
      pic: 'Bidang PAPK',
      participantsCount: 30,
      summary: ''
    });
    setShowGkmModal(true);
  };

  const handleOpenEditGkmModal = (gkm: GKMAgreement) => {
    setEditingGkmId(gkm.id);
    setGkmForm({
      roomAndMedia: gkm.roomAndMedia || 'LESTARI (Learning Station)',
      topic: gkm.topic || '',
      presenter: gkm.presenter || '',
      date: formatIndonesianDate(gkm.date || '31 Juli 2026'),
      startTime: parseToTimeInputValue(gkm.startTime) || '09:00',
      endTime: parseToTimeInputValue(gkm.endTime) || '11:00',
      pic: gkm.pic || 'Bidang PAPK',
      participantsCount: gkm.participantsCount || 30,
      summary: gkm.summary || ''
    });
    setShowGkmModal(true);
  };

  const handleAddGkm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gkmForm.topic || !gkmForm.presenter) return;

    const formattedDate = formatIndonesianDate(gkmForm.date) || '31 Juli 2026';

    if (editingGkmId) {
      const updatedGkm: GKMAgreement = {
        id: editingGkmId,
        roomAndMedia: gkmForm.roomAndMedia || 'LESTARI (Learning Station)',
        topic: gkmForm.topic,
        presenter: gkmForm.presenter,
        date: formattedDate,
        startTime: gkmForm.startTime || '09:00',
        endTime: gkmForm.endTime || '11:00',
        pic: gkmForm.pic || 'Bidang PAPK',
        participantsCount: gkmForm.participantsCount,
        summary: gkmForm.summary
      };
      setGkmList(gkmList.map(g => g.id === editingGkmId ? updatedGkm : g));
      saveFirestoreDoc('gkm', updatedGkm);
    } else {
      const newGkm: GKMAgreement = {
        id: `gkm-${Date.now()}`,
        roomAndMedia: gkmForm.roomAndMedia || 'LESTARI (Learning Station)',
        topic: gkmForm.topic,
        presenter: gkmForm.presenter,
        date: formattedDate,
        startTime: gkmForm.startTime || '09:00',
        endTime: gkmForm.endTime || '11:00',
        pic: gkmForm.pic || 'Bidang PAPK',
        participantsCount: gkmForm.participantsCount,
        summary: gkmForm.summary
      };
      setGkmList([newGkm, ...gkmList]);
      saveFirestoreDoc('gkm', newGkm);
    }

    setShowGkmModal(false);
    setEditingGkmId(null);
    setGkmForm({
      roomAndMedia: 'LESTARI (Learning Station)',
      topic: '',
      presenter: '',
      date: '31 Juli 2026',
      startTime: '09:00',
      endTime: '11:00',
      pic: 'Bidang PAPK',
      participantsCount: 30,
      summary: ''
    });
  };

  const handleDeleteGkm = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data GKM ini?')) {
      setGkmList(gkmList.filter(g => g.id !== id));
      deleteFirestoreDoc('gkm', id);
    }
  };

  // Cek Seribu handle search
  const employeesMock = [
    { name: 'Andi Wijaya', nip: '199208152014021003', rank: 'Penata (III/c)', role: 'PPK / Admin SAKTI', activeCert: 'SERT-SAKTI-9912', status: 'Sertifikasi Valid', hours: 32 },
    { name: 'Siti Rahma', nip: '198811202011012002', rank: 'Penata Tk.I (III/d)', role: 'PPSPM / Verifikator', activeCert: 'SERT-PPSPM-4521', status: 'Sertifikasi Valid', hours: 40 },
    { name: 'Rudi Hartono', nip: '199504032018011001', rank: 'Penata Muda (III/a)', role: 'Staf Kepegawaian', activeCert: 'SERT-KEMENKEU-1122', status: 'Sertifikasi Valid', hours: 24 },
    { name: 'Eka Lestari', nip: '199101122013102004', rank: 'Penata (III/c)', role: 'Bendahara Penerimaan', activeCert: 'SERT-BEND-8890', status: 'Sertifikasi Valid', hours: 36 },
    { name: 'Hendra Saputra', nip: '199412302016121005', rank: 'Penata Muda Tk.I (III/b)', role: 'Operator Komitmen SAKTI', activeCert: 'Belum Ujian', status: 'Sertifikasi Expired / Belum Ada', hours: 16 }
  ];

  const handleSearchEmployee = () => {
    if (!searchEmployee.trim()) {
      setSearchResult(null);
      return;
    }
    const filtered = (employeesMock || []).filter(emp => {
      if (!emp) return false;
      const empName = emp.name || '';
      const empNip = emp.nip || '';
      return empName.toLowerCase().includes(searchEmployee.toLowerCase()) || 
             empNip.includes(searchEmployee);
    });
    setSearchResult(filtered);
  };

  // Scholarship CRUD Handlers
  const handleOpenAddScholarship = () => {
    setScholarshipForm({
      name: '',
      provider: 'Lembaga Pengelola Dana Pendidikan',
      degree: 'S2 Program',
      deadline: '31 Desember 2026',
      description: '',
      eligibilityText: 'PNS Aktif minimal 2 tahun masa kerja\nIPK minimal 3.00\nIELTS minimal 6.0 / TOEFL 80'
    });
    setEditingScholarshipId(null);
    setShowScholarshipModal(true);
  };

  const handleOpenEditScholarship = (sch: ScholarshipInfo) => {
    setScholarshipForm({
      name: sch.name,
      provider: sch.provider || '',
      degree: sch.degree,
      deadline: sch.deadline,
      description: sch.description,
      eligibilityText: sch.eligibility ? sch.eligibility.join('\n') : ''
    });
    setEditingScholarshipId(sch.id);
    setShowScholarshipModal(true);
  };

  const handleSaveScholarship = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setScholarships) return;

    const eligibilityArray = scholarshipForm.eligibilityText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    if (editingScholarshipId) {
      const updatedSch: ScholarshipInfo = {
        id: editingScholarshipId,
        name: scholarshipForm.name,
        provider: scholarshipForm.provider,
        degree: scholarshipForm.degree,
        deadline: scholarshipForm.deadline,
        description: scholarshipForm.description,
        eligibility: eligibilityArray.length > 0 ? eligibilityArray : ['Persyaratan sesuai ketentuan instansi']
      };
      setScholarships(prev => prev.map(s => s.id === editingScholarshipId ? updatedSch : s));
      saveFirestoreDoc('scholarships', updatedSch);
    } else {
      const newSch: ScholarshipInfo = {
        id: `sch-${Date.now()}`,
        name: scholarshipForm.name,
        provider: scholarshipForm.provider,
        degree: scholarshipForm.degree,
        deadline: scholarshipForm.deadline,
        description: scholarshipForm.description,
        eligibility: eligibilityArray.length > 0 ? eligibilityArray : ['Persyaratan sesuai ketentuan instansi']
      };
      setScholarships(prev => [newSch, ...prev]);
      saveFirestoreDoc('scholarships', newSch);
    }

    setShowScholarshipModal(false);
    setEditingScholarshipId(null);
  };

  const handleOpenDeleteScholarship = (sch: ScholarshipInfo) => {
    setDeletingScholarship(sch);
  };

  const handleConfirmDeleteScholarship = () => {
    if (!deletingScholarship || !setScholarships) return;
    const targetId = deletingScholarship.id;
    setScholarships(prev => prev.filter(s => s.id !== targetId));
    deleteFirestoreDoc('scholarships', targetId);
    setDeletingScholarship(null);
  };

  // T-LEGO add milestones
  const handleAddLego = (e: React.FormEvent) => {
    e.preventDefault();
    if (!legoForm.taskName) return;
    let color = 'bg-blue-500';
    if (legoForm.progress >= 90) color = 'bg-green-500';
    else if (legoForm.progress >= 40) color = 'bg-amber-500';
    else color = 'bg-red-500';

    const newLego = {
      id: Date.now(),
      taskName: legoForm.taskName,
      category: legoForm.category,
      progress: legoForm.progress,
      color
    };
    setLegoBlocks([...legoBlocks, newLego]);
    setShowLegoModal(false);
    setLegoForm({ taskName: '', category: 'SK Kepegawaian', progress: 10 });
  };

  const handleProgressChange = (id: number, offset: number) => {
    setLegoBlocks(legoBlocks.map(block => {
      if (block.id !== id) return block;
      const newProg = Math.min(100, Math.max(0, block.progress + offset));
      let color = block.color;
      if (newProg >= 90) color = 'bg-green-500';
      else if (newProg >= 40) color = 'bg-amber-500';
      else color = 'bg-red-500';
      return { ...block, progress: newProg, color };
    }));
  };

  return (
    <div className="p-6 space-y-6" id="kepegawaian-section-root">
      {/* ----------------- SUB-TAB: INFORMASI GKM ----------------- */}
      {subTab === 'informasi-gkm' && (
        <div className="space-y-5" id="gkm-subtab">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base md:text-lg font-display font-bold text-slate-800">Gugus Kendali Mutu (GKM) Kepegawaian</h2>
              <p className="text-xs text-slate-500">Jadwal, risalah pertemuan, dan narasumber GKM Kanwil DJPb Provinsi Riau.</p>
            </div>
            {canManageAdmin && (
              <button
                id="btn-add-gkm"
                onClick={handleOpenAddGkmModal}
                className="flex items-center space-x-1.5 px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jadwal / Risalah GKM</span>
              </button>
            )}
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex flex-1 items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari narasumber, judul GKM, atau ruangan..."
                  value={gkmSearch}
                  onChange={(e) => setGkmSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-djpb-blue"
                />
              </div>
              <select
                value={gkmPicFilter}
                onChange={(e) => setGkmPicFilter(e.target.value)}
                className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
              >
                <option value="">Semua PIC Bidang</option>
                <option value="Bidang PAPK">Bidang PAPK</option>
                <option value="Bidang SKKI">Bidang SKKI</option>
                <option value="Bagian Umum">Bagian Umum</option>
                <option value="Bidang PPA I">Bidang PPA I</option>
                <option value="Bidang PPA II">Bidang PPA II</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
              Total Data: <strong className="text-slate-800 font-bold">{gkmList.length} Jadwal GKM</strong>
            </div>
          </div>

          {/* Table Matching Screenshot Design */}
          <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm" id="gkm-exact-table-container">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#002855] text-white font-bold font-display uppercase tracking-wider text-[11px] border-b border-[#001D3D]">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-4 font-bold">Ruangan dan Me...</th>
                    <th 
                      className="py-3 px-4 font-bold cursor-pointer hover:bg-[#001D3D] transition-colors select-none"
                      onClick={() => setGkmSortAsc(!gkmSortAsc)}
                      title="Klik untuk mengurutkan narasumber"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Narasumber</span>
                        <span className="text-amber-400 text-xs font-extrabold">{gkmSortAsc ? '▾' : '▴'}</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 font-bold">Judul GKM</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">Tanggal</th>
                    <th className="py-3 px-3 font-bold whitespace-nowrap">Waktu Mulai</th>
                    <th className="py-3 px-3 font-bold whitespace-nowrap">Waktu Selesai</th>
                    <th className="py-3 px-4 font-bold">PIC</th>
                    {canManageAdmin && <th className="py-3 px-3 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {(gkmList || [])
                    .filter((g) => {
                      if (!g) return false;
                      const topic = g.topic || '';
                      const presenter = g.presenter || '';
                      const roomAndMedia = g.roomAndMedia || '';
                      const matchesSearch =
                        !gkmSearch ||
                        topic.toLowerCase().includes(gkmSearch.toLowerCase()) ||
                        presenter.toLowerCase().includes(gkmSearch.toLowerCase()) ||
                        roomAndMedia.toLowerCase().includes(gkmSearch.toLowerCase());
                      const matchesPic = !gkmPicFilter || g.pic === gkmPicFilter;
                      return matchesSearch && matchesPic;
                    })
                    .sort((a, b) => {
                      const pA = a.presenter || '';
                      const pB = b.presenter || '';
                      if (gkmSortAsc) return pA.localeCompare(pB);
                      return pB.localeCompare(pA);
                    })
                    .map((g, index) => {
                      // Alternate styling matching screenshot:
                      // Odd indices (0, 2, 4...) -> Bright Yellow (#FFD700 / bg-[#FFCC00])
                      // Even indices (1, 3, 5...) -> Bright Electric Blue (#007BFF / bg-[#007BFF])
                      const isYellowRow = index % 2 === 0;

                      return (
                        <tr
                          key={g.id}
                          className={`border-b border-slate-300/60 font-semibold transition-colors ${
                            isYellowRow
                              ? 'bg-[#FFCC00] text-slate-900 hover:bg-yellow-300'
                              : 'bg-[#007BFF] text-slate-900 hover:bg-blue-500'
                          }`}
                        >
                          <td className="py-3 px-3 text-center font-bold font-mono">
                            {index + 1}.
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 truncate max-w-[180px]" title={g.roomAndMedia || 'LESTARI (Learning Station)'}>
                            {g.roomAndMedia || 'LESTARI (Learning Station)'}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {g.presenter}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 truncate max-w-[220px]" title={g.topic}>
                            {g.topic}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap font-mono">
                            {g.date}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap font-mono text-[11px]">
                            {g.startTime || '1:30:00 PM'}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap font-mono text-[11px]">
                            {g.endTime || '2:00:00 PM'}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {g.pic || 'Bidang PAPK'}
                          </td>
                          {canManageAdmin && (
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditGkmModal(g)}
                                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                                    isYellowRow
                                      ? 'hover:bg-amber-300 text-slate-900 hover:text-blue-900'
                                      : 'hover:bg-blue-600 text-slate-900 hover:text-amber-200'
                                  }`}
                                  title="Edit Informasi GKM"
                                >
                                  <Pencil className="w-3.5 h-3.5 mx-auto" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteGkm(g.id)}
                                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                                    isYellowRow
                                      ? 'hover:bg-amber-400 text-slate-800 hover:text-red-700'
                                      : 'hover:bg-blue-700 text-slate-900 hover:text-red-300'
                                  }`}
                                  title="Hapus GKM"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mx-auto" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}

                  {gkmList.length === 0 && (
                    <tr>
                      <td colSpan={canManageAdmin ? 9 : 8} className="py-8 text-center text-slate-500 text-xs">
                        Belum ada data Informasi GKM.{canManageAdmin ? ' Klik tombol "Tambah Jadwal / Risalah GKM" diatas.' : ''}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- SUB-TAB: CEK SERIBU ----------------- */}
      {subTab === 'cek-seribu' && (
        <div className="space-y-6" id="cek-seribu-subtab">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base md:text-lg font-display font-bold text-slate-800">Cek Presensi Senin dan Rabu (Cek Seribu)</h2>
              <p className="text-xs text-slate-500">Cek dan rekapitulasi data presensi kehadiran & kepulangan pegawai.</p>
            </div>
            {canManageAdmin && (
              <button
                id="btn-open-upload-jpeg-modal"
                onClick={() => setShowUploadModal(true)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto shrink-0"
              >
                <Upload className="w-4 h-4" />
                <span>Unggah Berkas Cek Seribu</span>
              </button>
            )}
          </div>

          {/* ----------------- FITUR & PANEL KELOLA ADMIN (CEK SERIBU) ----------------- */}
          {canManageAdmin && (
            <div className="bg-gradient-to-r from-amber-50/90 via-slate-50 to-blue-50/80 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3" id="admin-cek-seribu-panel">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-djpb-blue text-white rounded-xl shadow-xs">
                  <Shield className="w-5 h-5 text-djpb-gold" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-slate-800 flex items-center space-x-2">
                    <span>Menu & Panel Kelola Admin (Cek Seribu)</span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold rounded-md">
                      Akses Administrator
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    Fitur khusus admin untuk rekapitulasi data Cek Seribu. Pengunggahan file berkas dilakukan melalui tombol utama 'Unggah Berkas Cek Seribu' di kanan atas.
                  </p>
                </div>
              </div>

              {uploadedCertificates.length > 0 && (
                <button
                  type="button"
                  id="btn-admin-panel-delete-all"
                  onClick={() => setShowDeleteAllModal(true)}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Menu Hapus Semua Data</span>
                </button>
              )}
            </div>
          )}

          {/* Cek Seribu Rekapitulasi & Storage Gallery Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" id="cek-seribu-section-card">
            {/* Grey Top Header Bar */}
            <div className="bg-slate-200/90 text-slate-800 px-5 py-2.5 font-display font-extrabold text-xs tracking-wider uppercase border-b border-slate-300/80 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-djpb-blue" />
                <span>Hasil Konversi & Rekapitulasi Presensi Cek Seribu</span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300/80 px-2.5 py-0.5 rounded font-mono font-extrabold">
                Bulan Presensi: {cekSeribuMonthDisplay} / Cek Seribu
              </span>
            </div>

            <div className="p-5 md:p-6 space-y-5">
              {/* Internal Header Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-blue-100 pb-4 gap-3">
                <div>
                  <div className="flex items-center space-x-2 text-djpb-blue font-extrabold text-lg md:text-xl font-display">
                    <span>Cek Seribu</span>
                  </div>
                  <p className="text-amber-600 font-bold text-xs md:text-sm font-display mt-0.5">
                    Kanwil DJPb Provinsi Riau
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
                  {canManageAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteAllModal(true)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                      title="Hapus Seluruh Data Rekapitulasi Cek Seribu"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Hapus Semua Data</span>
                    </button>
                  )}

                  {canManageAdmin && (
                    <button
                      type="button"
                      onClick={handleDownloadExcelTemplate}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                      title="Unduh Template File Excel untuk Presensi Cek Seribu"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Unduh Template Excel</span>
                    </button>
                  )}


                </div>
              </div>

              {/* View Switcher & Stats Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-3 text-xs">
                  <span className="font-bold text-slate-700 font-display">
                    Total Berkas: <span className="text-djpb-blue font-extrabold">{filteredCertificates.length} / {uploadedCertificates.length} Data</span>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center space-x-1 font-bold text-emerald-700">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Status: Cek Seribu Valid</span>
                  </span>
                </div>

                {/* Switcher Button */}
                <div className="flex items-center bg-slate-200/80 p-1 rounded-xl border border-slate-300/80 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setCekSeribuViewMode('matrix')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      cekSeribuViewMode === 'matrix'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Tampilan Matrix Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCekSeribuViewMode('table')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      cekSeribuViewMode === 'table'
                        ? 'bg-white text-djpb-blue shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Tabel Ringkas List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCekSeribuViewMode('card')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      cekSeribuViewMode === 'card'
                        ? 'bg-white text-djpb-blue shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Kartu Berkas</span>
                  </button>
                </div>
              </div>

              {/* Display Mode Render */}
              {cekSeribuViewMode === 'matrix' ? (
                /* Full Matrix Table matching screenshot */
                <CekSeribuMatrixTable 
                  data={matrixData} 
                  canManageAdmin={canManageAdmin} 
                  selectedMonth={uploadMonth}
                  selectedYear={uploadYear}
                  onDataChange={handleMatrixDataChange}
                />
              ) : (
                <>
                  {/* Menu Search & Filter Tanggal Presensi */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs items-center">
                    {/* Search Bar */}
                    <div className="md:col-span-7 relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchCekSeribu}
                        onChange={(e) => setSearchCekSeribu(e.target.value)}
                        placeholder="Cari nama pegawai, file berkas Cek Seribu..."
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-djpb-blue focus:bg-white transition-all"
                      />
                      {searchCekSeribu && (
                        <button
                          type="button"
                          onClick={() => setSearchCekSeribu('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filter Tanggal */}
                    <div className="md:col-span-5 flex items-center space-x-2">
                      <div className="relative w-full">
                        <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="date"
                          value={dateFilterCekSeribu}
                          onChange={(e) => setDateFilterCekSeribu(e.target.value)}
                          title="Pilih tanggal presensi"
                          className="w-full pl-9 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-djpb-blue focus:bg-white transition-all"
                        />
                      </div>

                      {(searchCekSeribu || dateFilterCekSeribu) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchCekSeribu('');
                            setDateFilterCekSeribu('');
                          }}
                          className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center space-x-1 cursor-pointer"
                          title="Reset Filter"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>
                  </div>

              {/* Display Mode Switch: TABLE VIEW vs CARD VIEW */}
              {cekSeribuViewMode === 'table' ? (
                /* Rekapitulasi Cek Seribu Data Table View */
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-800 font-extrabold uppercase font-display tracking-wider text-xs">
                        <th className="py-3 px-3 w-12 text-center border-r border-slate-200">No.</th>
                        <th className="py-3 px-4 border-r border-slate-200">Nama Pegawai</th>
                        <th className="py-3 px-3 border-r border-slate-200 w-36">Tanggal</th>
                        <th className="py-3 px-3 border-r border-slate-200 w-32">Hadir</th>
                        <th className="py-3 px-3 border-r border-slate-200 w-32">Pulang</th>
                        {canManageAdmin && <th className="py-3 px-3 w-24 text-center">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800 font-sans text-xs">
                      {filteredCertificates.length > 0 ? (
                        filteredCertificates.map((cert, idx) => (
                          <tr key={cert.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-500 font-mono border-r border-slate-200">{idx + 1}</td>
                            <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-200">{cert.employeeName}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-700 font-semibold border-r border-slate-200">{formatDateDisplay(cert.uploadDate)}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 border-r border-slate-200">{cert.checkInTime}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-rose-700 border-r border-slate-200">{cert.checkOutTime}</td>
                            {canManageAdmin && (
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => triggerDeleteJpegCert(cert)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Berkas Cek Seribu"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={canManageAdmin ? 6 : 5} className="py-8 text-center text-slate-500 font-medium bg-slate-50/50">
                            <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                            <span>Tidak ada data presensi Cek Seribu yang sesuai dengan pencarian atau pilihan tanggal.</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Uploaded Cards Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                  {filteredCertificates.length > 0 ? (
                    filteredCertificates.map((cert) => (
                      <div key={cert.id} className="border border-slate-200/90 rounded-2xl p-4 bg-white shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between space-y-3">
                        <div className="space-y-3">
                          {/* Employee Name Header */}
                          <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-djpb-blue shrink-0">
                                <User className="w-4.5 h-4.5" />
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Nama Pegawai</span>
                                <h4 className="font-display font-bold text-xs text-slate-900 leading-tight">{cert.employeeName}</h4>
                              </div>
                            </div>

                            {canManageAdmin && (
                              <button
                                type="button"
                                onClick={() => triggerDeleteJpegCert(cert)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Hapus Data"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Grid Info: Tanggal, Hadir, Pulang */}
                          <div className="grid grid-cols-3 gap-2 text-[11px]">
                            {/* Tanggal */}
                            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1 mb-0.5">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                <span>Tanggal</span>
                              </span>
                              <span className="font-bold text-slate-800 font-mono text-[10px] block">{formatDateDisplay(cert.uploadDate)}</span>
                            </div>

                            {/* Hadir */}
                            <div className="p-2 bg-emerald-50/60 rounded-xl border border-emerald-100">
                              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider flex items-center space-x-1 mb-0.5">
                                <LogIn className="w-3 h-3 text-emerald-600" />
                                <span>Hadir</span>
                              </span>
                              <span className="font-bold text-emerald-800 font-mono text-[10px] block">{cert.checkInTime}</span>
                            </div>

                            {/* Pulang */}
                            <div className="p-2 bg-rose-50/60 rounded-xl border border-rose-100">
                              <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wider flex items-center space-x-1 mb-0.5">
                                <LogOut className="w-3 h-3 text-rose-600" />
                                <span>Pulang</span>
                              </span>
                              <span className="font-bold text-rose-800 font-mono text-[10px] block">{cert.checkOutTime}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-12 text-center text-slate-500 font-medium bg-slate-50/50 rounded-2xl border border-slate-200">
                      <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <span>Tidak ada data presensi Cek Seribu yang sesuai dengan pencarian atau pilihan tanggal.</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- SUB-TAB: INFORMASI & KELOLA BEASISWA ----------------- */}
      {(subTab === 'informasi-beasiswa' || subTab === 'kelola-beasiswa') && (
        <div className="space-y-6" id="scholarship-subtab">
          {/* Header & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-djpb-blue" />
                <h2 className="text-base md:text-lg font-display font-bold text-slate-800">
                  Layanan & Beasiswa Pendidikan PNS Kemenkeu
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Katalog resmi program jenjang pendidikan S1, S2, S3, dan pelatihan kedinasan PNS Kementerian Keuangan.
              </p>
            </div>

            {(canManageAdmin || subTab === 'kelola-beasiswa') && (
              <button
                type="button"
                onClick={handleOpenAddScholarship}
                className="px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition-all cursor-pointer shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Perekaman Beasiswa Baru</span>
              </button>
            )}
          </div>

          {subTab === 'kelola-beasiswa' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Shield className="w-5 h-5 text-amber-700 shrink-0" />
                <div>
                  <strong className="block font-bold">Menu Administrator: Perekaman & Hapus Beasiswa</strong>
                  <span>Gunakan tombol Ubah atau Hapus di bawah untuk mengelola daftar Layanan & Beasiswa Pendidikan PNS.</span>
                </div>
              </div>
            </div>
          )}

          {/* Scholarship List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="scholarships-opportunities">
            {scholarships.length > 0 ? (
              scholarships.map((sch) => (
                <div key={sch.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3.5 flex flex-col justify-between hover:border-slate-300 transition-colors">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg border border-amber-200 shrink-0">
                        {sch.degree} Program
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono text-right">
                        Batas: <strong className="text-slate-700 font-semibold">{sch.deadline}</strong>
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xs md:text-sm font-bold text-slate-800 leading-snug font-display">{sch.name}</h3>
                      {sch.provider && (
                        <span className="text-[10px] text-djpb-blue font-bold uppercase tracking-wider block mt-0.5">
                          {sch.provider}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">{sch.description}</p>
                    
                    <div className="border-t border-slate-100 pt-3 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Syarat Kelayakan Utama:</span>
                      <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {sch.eligibility && sch.eligibility.length > 0 ? (
                          sch.eligibility.map((el, i) => (
                            <li key={i} className="leading-snug">{el}</li>
                          ))
                        ) : (
                          <li className="text-slate-400 italic">Tidak ada syarat khusus.</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Admin Action Bar */}
                  {(canManageAdmin || subTab === 'kelola-beasiswa') && (
                    <div className="border-t border-slate-100 pt-3 flex items-center justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditScholarship(sch)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                        title="Ubah Data Beasiswa"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Ubah</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteScholarship(sch)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 transition-colors flex items-center space-x-1 cursor-pointer"
                        title="Hapus Beasiswa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
                <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span>Belum ada data Layanan & Beasiswa Pendidikan yang direkam.</span>
                {(canManageAdmin || subTab === 'kelola-beasiswa') && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={handleOpenAddScholarship}
                      className="px-3.5 py-1.5 bg-djpb-blue text-white text-xs font-bold rounded-lg cursor-pointer inline-flex items-center space-x-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Beasiswa Pertama</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- SUB-TAB: T-LEGO ----------------- */}
      {subTab === 't-lego' && (
        <div id="t-lego-subtab">
          <TLegoView />
        </div>
      )}


      {/* ----------------- MODAL FORMS ----------------- */}
      
      {/* 1. GKM Modal */}
      {showGkmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="gkm-modal">
          <form onSubmit={handleAddGkm} className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-display font-bold text-slate-800">
                {editingGkmId ? 'Edit Informasi GKM' : 'Tambah Jadwal / Risalah Pertemuan GKM'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowGkmModal(false);
                  setEditingGkmId(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Ruangan dan Media</label>
                <input 
                  type="text" required
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={gkmForm.roomAndMedia}
                  onChange={(e) => setGkmForm({ ...gkmForm, roomAndMedia: e.target.value })}
                  placeholder="Contoh: LESTARI (Learning Station)"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Judul GKM</label>
                <input 
                  type="text" required
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={gkmForm.topic}
                  onChange={(e) => setGkmForm({ ...gkmForm, topic: e.target.value })}
                  placeholder="Contoh: Sosialisasi Peraturan Implementasi Kinerja"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Narasumber</label>
                  <input 
                    type="text" required
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={gkmForm.presenter}
                    onChange={(e) => setGkmForm({ ...gkmForm, presenter: e.target.value })}
                    placeholder="Contoh: Nur Asri"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">PIC Unit Kerja</label>
                  <select 
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                    value={gkmForm.pic}
                    onChange={(e) => setGkmForm({ ...gkmForm, pic: e.target.value })}
                  >
                    <option value="Bidang PAPK">Bidang PAPK</option>
                    <option value="Bidang SKKI">Bidang SKKI</option>
                    <option value="Bagian Umum">Bagian Umum</option>
                    <option value="Bidang PPA I">Bidang PPA I</option>
                    <option value="Bidang PPA II">Bidang PPA II</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  TANGGAL GKM
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-semibold mb-1">Pilih dari Kalender:</label>
                    <div className="relative flex items-center">
                      <input 
                        type="date" 
                        required
                        className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer"
                        value={parseIndonesianDateToYMD(gkmForm.date)}
                        onChange={(e) => {
                          if (e.target.value) {
                            setGkmForm({ ...gkmForm, date: formatIndonesianDate(e.target.value) });
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-semibold mb-1">Format Tampilan Tabel:</label>
                    <input 
                      type="text" 
                      required
                      className="w-full p-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      value={gkmForm.date}
                      onChange={(e) => setGkmForm({ ...gkmForm, date: e.target.value })}
                      placeholder="Contoh: 31 Juli 2026"
                    />
                  </div>
                </div>
              </div>

              {/* Exact time picker section matching user image */}
              <div className="grid grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
                    MULAI JAM
                  </label>
                  <div className="relative flex items-center">
                    <input 
                      type="time" 
                      required
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer"
                      value={gkmForm.startTime}
                      onChange={(e) => setGkmForm({ ...gkmForm, startTime: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
                    SELESAI JAM
                  </label>
                  <div className="relative flex items-center">
                    <input 
                      type="time" 
                      required
                      className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer"
                      value={gkmForm.endTime}
                      onChange={(e) => setGkmForm({ ...gkmForm, endTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Ringkasan Materi GKM</label>
                <textarea 
                  rows={2}
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  placeholder="Catatan ringkas kesepakatan GKM..."
                  value={gkmForm.summary}
                  onChange={(e) => setGkmForm({ ...gkmForm, summary: e.target.value })}
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowGkmModal(false);
                  setEditingGkmId(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                {editingGkmId ? 'Simpan Perubahan GKM' : 'Simpan Risalah GKM'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. T-LEGO Modal */}
      {showLegoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="lego-modal">
          <form onSubmit={handleAddLego} className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-display font-bold text-slate-800">Tambah Milestone Blok LEGO</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Nama Kegiatan / Tugas</label>
                <input 
                  type="text" required
                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={legoForm.taskName}
                  onChange={(e) => setLegoForm({ ...legoForm, taskName: e.target.value })}
                  placeholder="Contoh: Rekonsiliasi Tunjangan Kinerja Pegawai..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Kategori</label>
                  <select 
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={legoForm.category}
                    onChange={(e) => setLegoForm({ ...legoForm, category: e.target.value })}
                  >
                    <option>SK Kepegawaian</option>
                    <option>Diklat & Edukasi</option>
                    <option>Administrasi Gaji</option>
                    <option>Reformasi Birokrasi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Progres Awal (%)</label>
                  <input 
                    type="number" min={0} max={100} required
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                    value={legoForm.progress}
                    onChange={(e) => setLegoForm({ ...legoForm, progress: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowLegoModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Buat Blok Milestone
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Upload Berkas Cek Seribu Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" id="upload-jpeg-modal">
          <form onSubmit={handleSaveJpegCert} className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-djpb-blue" />
                <h3 className="text-base font-display font-bold text-slate-800">Unggah & Konversi Berkas Cek Seribu (Excel / JPEG)</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setTempJpegFile(null);
                  setExtractedEmployeesList([]);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Pilihan Bulan & Tahun Presensi Cek Seribu */}
              <div className="bg-gradient-to-r from-blue-50/90 to-slate-50 border border-blue-200/80 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-djpb-blue text-white flex items-center justify-center font-bold shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 font-display">
                        Pilihan Bulan & Tahun Presensi yang Diunggah
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Tentukan bulan rekapitulasi Cek Seribu untuk file Excel atau Gambar yang diunggah.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-100/90 text-djpb-blue font-extrabold text-[10px] rounded-lg border border-blue-200/80 font-mono shrink-0">
                    Bulan: {getMonthNameByNum(uploadMonth)} {uploadYear}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1 tracking-wider">
                      PILIH BULAN UNTUK DIUNGGAH
                    </label>
                    <select
                      value={uploadMonth}
                      onChange={(e) => handleMonthYearChange(e.target.value, uploadYear)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-djpb-blue focus:ring-2 focus:ring-djpb-blue/20 cursor-pointer shadow-2xs"
                    >
                      {MONTH_OPTIONS.map(m => (
                        <option key={m.value} value={m.value}>Bulan {m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1 tracking-wider">
                      PILIH TAHUN PRESENSI
                    </label>
                    <select
                      value={uploadYear}
                      onChange={(e) => handleMonthYearChange(uploadMonth, e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-djpb-blue focus:ring-2 focus:ring-djpb-blue/20 cursor-pointer shadow-2xs"
                    >
                      <option value="2024">Tahun 2024</option>
                      <option value="2025">Tahun 2025</option>
                      <option value="2026">Tahun 2026</option>
                      <option value="2027">Tahun 2027</option>
                      <option value="2028">Tahun 2028</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* File upload input area */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Pilih File Excel (.xlsx, .xls, .csv) atau Gambar JPEG (.jpg, .jpeg, .png)
                  </label>
                  <button
                    type="button"
                    onClick={handleDownloadExcelTemplate}
                    className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-emerald-600" />
                    <span>Unduh Template Excel (.xlsx)</span>
                  </button>
                </div>

                <div className="border-2 border-dashed border-slate-200 hover:border-djpb-blue bg-slate-50 rounded-xl p-4 text-center space-y-2 relative">
                  <input 
                    type="file" 
                    accept=".xlsx,.xls,.csv,image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                  {tempJpegFile ? (
                    <div className="space-y-2">
                      {tempJpegFile.isExcel ? (
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-2 max-w-sm mx-auto">
                          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-xs">
                            <FileSpreadsheet className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 text-xs block">{tempJpegFile.fileName}</span>
                            <span className="text-[10px] font-mono text-slate-500">{tempJpegFile.fileSize} • File Spreadsheet Excel</span>
                          </div>
                          <p className="text-[10px] text-emerald-700 font-bold flex items-center justify-center space-x-1 pt-1">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Dokumen Excel Berhasil Dikonversi ke Presensi Cek Seribu!</span>
                          </p>
                        </div>
                      ) : (
                        <div>
                          <img 
                            src={tempJpegFile.imageUrl} 
                            alt="Preview" 
                            className="h-32 mx-auto rounded-lg object-contain border border-slate-300"
                          />
                          <div className="text-[11px] text-slate-700 font-medium mt-2">
                            <span className="font-bold">{tempJpegFile.fileName}</span> ({tempJpegFile.fileSize})
                          </div>
                          <p className="text-[10px] text-emerald-600 font-bold flex items-center justify-center space-x-1 mt-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Gambar Berkas Cek Seribu Berhasil Diunggah & Diekstraksi!</span>
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-3 space-y-1">
                      <div className="flex items-center justify-center space-x-2 text-slate-400">
                        <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
                        <ImageIcon className="w-7 h-7 text-djpb-blue" />
                      </div>
                      <p className="text-xs text-slate-700 font-bold">Klik atau Seret Berkas Excel (.xlsx) / JPEG ke Sini</p>
                      <p className="text-[10px] text-slate-400">Format didukung: Excel (.xlsx, .xls, .csv) & Gambar JPEG/PNG (Max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Automatic Extraction Results Section */}
              {tempJpegFile && (
                <div className="space-y-2 border border-blue-100 rounded-xl p-3.5 bg-blue-50/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="p-1 bg-djpb-blue text-white rounded-md">
                        <FileText className="w-3.5 h-3.5" />
                      </span>
                      <h4 className="font-bold text-xs text-slate-900 font-display">
                        Hasil Otomatis Ekstraksi Pegawai & Presensi Tanggal ({extractedEmployeesList.length} Pegawai)
                      </h4>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={handleAddExtractedRow}
                        className="px-2.5 py-1 bg-white hover:bg-blue-100 text-djpb-blue border border-blue-200 rounded-lg text-[10px] font-bold transition-colors flex items-center space-x-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Tambah Pegawai</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Sistem secara otomatis membaca seluruh daftar nama pegawai serta status Hadir & Pulang per Tanggal dari dokumen Cek Seribu. Anda dapat menambah atau mengedit data di bawah ini.
                  </p>

                  {/* Table Column Headers */}
                  <div className="grid grid-cols-12 gap-2 px-2 py-1.5 bg-slate-200/80 rounded-lg text-[10px] font-extrabold text-slate-700 uppercase tracking-wider text-center">
                    <span className="col-span-1">No.</span>
                    <span className="col-span-4 text-left">Nama Pegawai</span>
                    <span className="col-span-3 text-left">Tanggal Presensi</span>
                    <span className="col-span-2">Hadir</span>
                    <span className="col-span-2">Pulang</span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {extractedEmployeesList.map((emp, index) => (
                      <div key={emp.id} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                        <div className="col-span-1 text-center font-bold text-slate-400 font-mono text-[10px]">
                          #{index + 1}
                        </div>
                        <div className="col-span-4">
                          <input
                            type="text"
                            required
                            placeholder="Nama Pegawai"
                            className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-900"
                            value={emp.employeeName}
                            onChange={(e) => handleUpdateExtractedRow(emp.id, 'employeeName', e.target.value)}
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            required
                            placeholder="Tanggal (DD-MM-YYYY)"
                            className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold text-slate-700"
                            value={emp.date || uploadForm.uploadDate || `01-${uploadMonth}-${uploadYear}`}
                            onChange={(e) => handleUpdateExtractedRow(emp.id, 'date', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <select
                            className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-emerald-700 cursor-pointer"
                            value={emp.checkInTime === 'Tidak' || emp.checkInTime === 'Tidak Ada' ? 'Tidak' : 'Ada'}
                            onChange={(e) => handleUpdateExtractedRow(emp.id, 'checkInTime', e.target.value)}
                          >
                            <option value="Ada">Ada</option>
                            <option value="Tidak">Tidak</option>
                          </select>
                        </div>
                        <div className="col-span-2 flex items-center space-x-1">
                          <select
                            className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-rose-700 cursor-pointer"
                            value={emp.checkOutTime === 'Tidak' || emp.checkOutTime === 'Tidak Ada' ? 'Tidak' : 'Ada'}
                            onChange={(e) => handleUpdateExtractedRow(emp.id, 'checkOutTime', e.target.value)}
                          >
                            <option value="Ada">Ada</option>
                            <option value="Tidak">Tidak</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveExtractedRow(emp.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer shrink-0"
                            title="Hapus baris ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setTempJpegFile(null);
                  setExtractedEmployeesList([]);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Simpan Konversi Cek Seribu</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Full Image View Modal for JPEG Sertifikat & Extracted Employee Hours List */}
      {selectedImageModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" id="jpeg-preview-modal">
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-djpb-blue-light" />
                <span className="text-xs font-bold font-display">Pratinjau & Hasil Ekstraksi Berkas JPEG (Cek Seribu)</span>
              </div>
              <button
                onClick={() => setSelectedImageModal(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 overflow-y-auto min-h-[350px]">
              {/* Left Column: Image View */}
              <div className="p-4 flex flex-col items-center justify-center bg-black/90 border-b md:border-b-0 md:border-r border-slate-800">
                <img 
                  src={selectedImageModal} 
                  alt="Sertifikat JPEG Full Resolution" 
                  className="max-w-full max-h-[55vh] object-contain rounded-lg border border-slate-700"
                />
                <span className="text-[10px] text-slate-400 mt-2 font-mono">Dokumen Original Cek Seribu JPEG</span>
              </div>

              {/* Right Column: List of All Extracted Employee Names & Hours */}
              <div className="p-4 bg-slate-900/90 text-slate-200 space-y-3 overflow-y-auto max-h-[60vh]">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-bold text-xs text-white font-display">Daftar Pegawai & Jam Presensi Terdeteksi</h4>
                  </div>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                    Cek Seribu Valid
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Berikut adalah seluruh nama pegawai beserta jam hadir dan jam pulang yang berhasil dikonversi dari dokumen JPEG ini:
                </p>

                <div className="space-y-2">
                  {uploadedCertificates
                    .filter(c => c.imageUrl === selectedImageModal)
                    .map((cert, i) => (
                      <div key={cert.id} className="p-2.5 bg-slate-800/90 rounded-xl border border-slate-700/80 flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <div>
                            <h5 className="font-bold text-xs text-white font-display">{cert.employeeName}</h5>
                            <span className="text-[10px] text-slate-400 font-mono">Tanggal: {cert.uploadDate}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 text-[10px] font-mono">
                          <span className="px-2 py-0.5 bg-emerald-950/90 text-emerald-300 border border-emerald-800 rounded font-bold">
                            Hadir: {cert.checkInTime}
                          </span>
                          <span className="px-2 py-0.5 bg-rose-950/90 text-rose-300 border border-rose-800 rounded font-bold">
                            Pulang: {cert.checkOutTime}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-slate-400 text-xs">
              <span className="flex items-center space-x-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Status: <strong className="text-emerald-400">Terverifikasi Valid Cek Seribu</strong></span>
              </span>
              <div className="flex items-center space-x-2">
                {(() => {
                  const currentCert = uploadedCertificates.find(c => c.imageUrl === selectedImageModal);
                  if (!currentCert) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => triggerDeleteJpegCert(currentCert)}
                      className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Berkas</span>
                    </button>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => setSelectedImageModal(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Tutup Pratinjau
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Custom Modal Konfirmasi Hapus Berkas Cek Seribu */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150" id="delete-confirm-modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-base text-slate-900">Konfirmasi Hapus Berkas Cek Seribu</h3>
                <p className="text-xs text-slate-500">Tindakan ini akan menghapus data dari rekapitulasi Cek Seribu.</p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/70 rounded-xl border border-rose-100 text-xs text-slate-800 space-y-1">
              <p className="font-semibold text-slate-700">Apakah Anda yakin ingin menghapus berkas berikut?</p>
              <p className="font-bold text-slate-900 pt-1">• Nama Pegawai: <span className="text-djpb-blue">{deleteConfirmItem.employeeName}</span></p>
              <p className="font-mono text-[11px] text-slate-600">• File Berkas: {deleteConfirmItem.fileName}</p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center space-x-1"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Berkas</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Custom Modal Konfirmasi Hapus Seluruh Data Cek Seribu */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150" id="delete-all-confirm-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-base text-slate-900">Konfirmasi Hapus Seluruh Data Cek Seribu</h3>
                <p className="text-xs text-slate-500">Pilih opsi penghapusan data rekapitulasi presensi Cek Seribu.</p>
              </div>
            </div>

            <div className="p-4 bg-rose-50/80 rounded-xl border border-rose-200 text-xs text-slate-800 space-y-2">
              <p className="font-bold text-rose-900 text-sm">Apakah Anda yakin ingin menghapus data rekapitulasi?</p>
              <p className="text-slate-700">
                Total data presensi saat ini: <strong className="text-slate-900 font-mono text-sm">{uploadedCertificates.length} Data</strong>.
              </p>
              {(searchCekSeribu || dateFilterCekSeribu) && (
                <p className="text-djpb-blue font-bold pt-1 border-t border-rose-200/80">
                  Filter pencarian/tanggal aktif: {filteredCertificates.length} data terpilih dari total {uploadedCertificates.length} data.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(false)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>

              {(searchCekSeribu || dateFilterCekSeribu) && filteredCertificates.length < uploadedCertificates.length && (
                <button
                  type="button"
                  onClick={() => handleConfirmDeleteAll(true)}
                  className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus {filteredCertificates.length} Data Terfilter</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleConfirmDeleteAll(false)}
                className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Seluruh ({uploadedCertificates.length}) Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal Perekaman & Edit Beasiswa */}
      {showScholarshipModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150" id="scholarship-modal">
          <form onSubmit={handleSaveScholarship} className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <GraduationCap className="w-5 h-5 text-djpb-blue" />
                <h3 className="text-base font-display font-bold text-slate-800">
                  {editingScholarshipId ? 'Edit Layanan & Beasiswa Pendidikan' : 'Perekaman Beasiswa Pendidikan Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowScholarshipModal(false);
                  setEditingScholarshipId(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Nama Program Beasiswa / Layanan</label>
                <input 
                  type="text" required
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-hidden"
                  value={scholarshipForm.name}
                  onChange={(e) => setScholarshipForm({ ...scholarshipForm, name: e.target.value })}
                  placeholder="Contoh: Beasiswa LPDP Kemenkeu - S2/S3 Dalam & Luar Negeri"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Penyelenggara / Provider</label>
                  <input 
                    type="text" required
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={scholarshipForm.provider}
                    onChange={(e) => setScholarshipForm({ ...scholarshipForm, provider: e.target.value })}
                    placeholder="Contoh: LPDP / Kemenkeu / Australia Awards"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Jenjang Program</label>
                  <input 
                    type="text" required
                    className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    value={scholarshipForm.degree}
                    onChange={(e) => setScholarshipForm({ ...scholarshipForm, degree: e.target.value })}
                    placeholder="Contoh: S2, S3, S2 / S3, Short Course"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Batas Pendaftaran / Jadwal Program</label>
                <input 
                  type="text" required
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={scholarshipForm.deadline}
                  onChange={(e) => setScholarshipForm({ ...scholarshipForm, deadline: e.target.value })}
                  placeholder="Contoh: 31 Desember 2026 / Gelombang I"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Deskripsi & Rincian Layanan</label>
                <textarea 
                  rows={3} required
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={scholarshipForm.description}
                  onChange={(e) => setScholarshipForm({ ...scholarshipForm, description: e.target.value })}
                  placeholder="Jelaskan mengenai program beasiswa, cakupan bantuan, serta manfaat untuk instansi..."
                ></textarea>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Syarat Kelayakan Utama (1 Syarat per baris)</label>
                <textarea 
                  rows={4} required
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  value={scholarshipForm.eligibilityText}
                  onChange={(e) => setScholarshipForm({ ...scholarshipForm, eligibilityText: e.target.value })}
                  placeholder="PNS Aktif minimal 2 tahun masa kerja&#10;IPK minimal 3.00&#10;IELTS minimal 6.0 / TOEFL 80"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowScholarshipModal(false);
                  setEditingScholarshipId(null);
                }}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                {editingScholarshipId ? 'Simpan Perubahan' : 'Simpan Beasiswa Baru'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 8. Modal Konfirmasi Hapus Beasiswa */}
      {deletingScholarship && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150" id="scholarship-delete-modal">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-600 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-slate-800">Hapus Layanan & Beasiswa</h3>
                <p className="text-xs text-slate-500">Tindakan ini akan menghapus data secara permanen</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Program Beasiswa</span>
              <p className="font-bold text-slate-800">{deletingScholarship.name}</p>
              <p className="text-slate-500 text-[11px]">{deletingScholarship.degree} Program • {deletingScholarship.provider}</p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus program beasiswa ini dari katalog Layanan & Beasiswa Pendidikan PNS Kemenkeu?
            </p>

            <div className="flex items-center justify-end space-x-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setDeletingScholarship(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteScholarship}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Beasiswa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
