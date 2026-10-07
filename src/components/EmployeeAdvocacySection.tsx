import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, CheckCircle2, XCircle, Search, Download, Upload, 
  Plus, Trash2, Edit3, Share2, Copy, Printer, Check, X,
  FileSpreadsheet, Filter, RefreshCw, AlertCircle, Sparkles, ChevronDown,
  FileText, ExternalLink, Loader2, FileDown, Info, ZoomIn, ZoomOut, ArrowUpDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { CurrentUser } from '../types';
import { 
  EmployeeAdvocacyItem, 
  INITIAL_EMPLOYEE_ADVOCACY, 
  INITIAL_EA_EDITIONS,
  STANDARD_EA_EDITIONS,
  isValidEmployeeAdvocacyName,
  normalizeEmployeeName,
  sanitizeEmployeeRecords
} from '../data/employeeAdvocacyData';
import { 
  saveFirestoreDoc, 
  deleteFirestoreDoc, 
  subscribeFirestoreCollection 
} from '../lib/firebase';
import { safeLocalStorageSet, safeLocalStorageGet } from '../lib/storage';
import KemenkeuLogo, { KEMENKEU_LOGO_SVG_HTML } from './KemenkeuLogo';
import { exportElementToPdf, createPdfFromElement, printDocumentElement } from '../lib/pdfExport';

interface EmployeeAdvocacySectionProps {
  currentUser?: CurrentUser | null;
  isEditMode?: boolean;
}

interface ConfirmModalState {
  show: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant: 'danger' | 'warning' | 'primary';
  action: () => void;
}

export default function EmployeeAdvocacySection({
  currentUser,
  isEditMode = false
}: EmployeeAdvocacySectionProps) {
  const isAdmin = isEditMode || currentUser?.role === 'admin' || (currentUser?.role as string) === 'Administrator';

  // Active Edition State
  const [editions, setEditions] = useState<string[]>(() => {
    return safeLocalStorageGet<string[]>('melayu_ea_editions', INITIAL_EA_EDITIONS);
  });
  const [selectedEdition, setSelectedEdition] = useState<string>('EA 08');

  // Main Records State (automatically purged of filter metadata rows)
  const [records, setRecords] = useState<EmployeeAdvocacyItem[]>(() => {
    const stored = safeLocalStorageGet<EmployeeAdvocacyItem[]>('melayu_ea_records', INITIAL_EMPLOYEE_ADVOCACY);
    return sanitizeEmployeeRecords(stored).clean;
  });

  // Selected IDs for Bulk Actions (Admin Only)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const deleteMenuRef = useRef<HTMLDivElement>(null);

  // In-App Confirmation Modal State (Reliable in iframes)
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    show: false,
    title: '',
    message: '',
    confirmLabel: 'Hapus',
    confirmVariant: 'danger',
    action: () => {}
  });

  // Print & PDF Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isGeneratingPdfPreview, setIsGeneratingPdfPreview] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [activePrintViewTab, setActivePrintViewTab] = useState<'document' | 'pdf'>('document');
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const pdfIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Sync with Firestore on mount with automated data sanitation
  useEffect(() => {
    const unsub = subscribeFirestoreCollection<EmployeeAdvocacyItem>(
      'employee_advocacy',
      INITIAL_EMPLOYEE_ADVOCACY,
      (firestoreData) => {
        if (firestoreData && firestoreData.length > 0) {
          const { clean, removed } = sanitizeEmployeeRecords(firestoreData);
          setRecords(clean);
          
          // Auto-discover any distinct editions present in records so they appear at top
          const docEditions = Array.from(new Set(clean.map(r => r.edition).filter(Boolean))) as string[];
          if (docEditions.length > 0) {
            setEditions(prev => {
              const combined = Array.from(new Set([...docEditions, ...prev]));
              return combined;
            });
          }

          // Actively purge any invalid metadata / filter text documents from Firestore
          if (removed.length > 0) {
            removed.forEach(item => {
              if (item?.id) {
                deleteFirestoreDoc('employee_advocacy', item.id);
              }
            });
          }
        }
      }
    );
    return () => unsub();
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    safeLocalStorageSet('melayu_ea_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    safeLocalStorageSet('melayu_ea_editions', JSON.stringify(editions));
  }, [editions]);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'All' | 'Sudah' | 'Belum'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Modals & Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNewEditionModal, setShowNewEditionModal] = useState(false);
  const [newEditionName, setNewEditionName] = useState('');
  const [editingItem, setEditingItem] = useState<EmployeeAdvocacyItem | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    status: 'Belum' as 'Sudah' | 'Belum'
  });

  // Excel Import & Modal state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  const [excelPreviewData, setExcelPreviewData] = useState<EmployeeAdvocacyItem[]>([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [uploadTargetEdition, setUploadTargetEdition] = useState(selectedEdition);
  const [uploadMode, setUploadMode] = useState<'replace' | 'merge'>('replace');

  // Print state
  const [isPrinting, setIsPrinting] = useState(false);

  // Sorting state for employee names (default A-Z)
  const [nameSortOrder, setNameSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter records for current edition - automatically sorted alphabetically (A-Z)
  const currentEditionRecords = [...records]
    .filter(r => (r.edition || 'EA 08') === selectedEdition)
    .sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));

  // Statistics
  const totalCount = currentEditionRecords.length;
  const sudahCount = currentEditionRecords.filter(r => r.status === 'Sudah').length;
  const belumCount = currentEditionRecords.filter(r => r.status === 'Belum').length;
  const complianceRate = totalCount > 0 ? Math.round((sudahCount / totalCount) * 100) : 0;

  // Filtered Display List with dynamic alphabetical sort
  const filteredRecords = currentEditionRecords
    .filter(r => {
      const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
      const matchesSearch = !searchQuery.trim() || r.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, 'id', { sensitivity: 'base' });
      return nameSortOrder === 'asc' ? cmp : -cmp;
    });

  // Toggle Status for a Person
  const handleToggleStatus = (item: EmployeeAdvocacyItem) => {
    const newStatus: 'Sudah' | 'Belum' = item.status === 'Sudah' ? 'Belum' : 'Sudah';
    const updated = records.map(r => {
      if (r.id === item.id) {
        return { ...r, status: newStatus, updatedAt: new Date().toISOString() };
      }
      return r;
    });
    setRecords(updated);
    saveFirestoreDoc('employee_advocacy', { ...item, status: newStatus, updatedAt: new Date().toISOString() });
    
    showNotice(`Status untuk ${item.name} berhasil diubah menjadi "${newStatus}"`);
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Add / Edit Employee
  const handleOpenAdd = () => {
    setEditingItem(null);
    setEmployeeForm({ name: '', status: 'Belum' });
    setShowAddModal(true);
  };

  const handleOpenEdit = (item: EmployeeAdvocacyItem) => {
    setEditingItem(item);
    setEmployeeForm({ name: item.name, status: item.status });
    setShowAddModal(true);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = employeeForm.name.trim();
    if (!cleanName) return;

    if (!isValidEmployeeAdvocacyName(cleanName)) {
      showNotice('Nama pegawai tidak valid atau mengandung teks filter/sistem.');
      return;
    }

    if (editingItem) {
      const updated = records.map(r => {
        if (r.id === editingItem.id) {
          return { ...r, name: cleanName, status: employeeForm.status, updatedAt: new Date().toISOString() };
        }
        return r;
      });
      setRecords(updated);
      saveFirestoreDoc('employee_advocacy', {
        ...editingItem,
        name: cleanName,
        status: employeeForm.status,
        updatedAt: new Date().toISOString()
      });
      showNotice(`Data pegawai ${cleanName} berhasil diperbarui.`);
    } else {
      const newItem: EmployeeAdvocacyItem = {
        id: `ea-${Date.now()}`,
        name: cleanName,
        status: employeeForm.status,
        edition: selectedEdition,
        updatedAt: new Date().toISOString()
      };
      setRecords([...records, newItem]);
      saveFirestoreDoc('employee_advocacy', newItem);
      showNotice(`Pegawai ${cleanName} berhasil ditambahkan ke daftar ${selectedEdition}.`);
    }

    setShowAddModal(false);
  };

  // Click outside to close delete menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deleteMenuRef.current && !deleteMenuRef.current.contains(event.target as Node)) {
        setShowDeleteMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset selections when edition changes
  useEffect(() => {
    setSelectedIds([]);
  }, [selectedEdition]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length && filteredRecords.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map(r => r.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteEmployee = (item: EmployeeAdvocacyItem) => {
    setConfirmModal({
      show: true,
      title: 'Hapus Data Pegawai',
      message: `Apakah Anda yakin ingin menghapus "${item.name}" dari daftar monitoring ${selectedEdition}? Data yang dihapus tidak dapat dipulihkan.`,
      confirmLabel: 'Ya, Hapus Pegawai',
      confirmVariant: 'danger',
      action: () => {
        const updated = records.filter(r => r.id !== item.id);
        setRecords(updated);
        setSelectedIds(prev => prev.filter(id => id !== item.id));
        deleteFirestoreDoc('employee_advocacy', item.id);
        setConfirmModal(prev => ({ ...prev, show: false }));
        showNotice(`Pegawai ${item.name} berhasil dihapus.`);
      }
    });
  };

  // Bulk Delete Selected Employees
  const handleBulkDeleteSelected = () => {
    if (selectedIds.length === 0) {
      showNotice('Silakan centang/pilih pegawai di tabel terlebih dahulu untuk menghapus.');
      setShowDeleteMenu(false);
      return;
    }

    setShowDeleteMenu(false);
    setConfirmModal({
      show: true,
      title: 'Hapus Pegawai Terpilih',
      message: `Apakah Anda yakin ingin menghapus ${selectedIds.length} pegawai yang dipilih dari daftar "${selectedEdition}"? Data yang dihapus tidak dapat dipulihkan.`,
      confirmLabel: `Ya, Hapus (${selectedIds.length}) Pegawai`,
      confirmVariant: 'danger',
      action: () => {
        const idsToDelete = new Set(selectedIds);
        const updated = records.filter(r => !idsToDelete.has(r.id));
        setRecords(updated);
        
        selectedIds.forEach(id => {
          deleteFirestoreDoc('employee_advocacy', id);
        });

        showNotice(`Berhasil menghapus ${selectedIds.length} data pegawai terpilih.`);
        setSelectedIds([]);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  // Clear All Data for Current Edition
  const handleClearCurrentEdition = () => {
    setShowDeleteMenu(false);
    if (currentEditionRecords.length === 0) {
      showNotice(`Daftar data untuk ${selectedEdition} sudah kosong.`);
      return;
    }

    setConfirmModal({
      show: true,
      title: `Kosongkan Data ${selectedEdition}`,
      message: `PERINGATAN: Anda akan menghapus SEMUA (${currentEditionRecords.length}) data pegawai pada edisi "${selectedEdition}". Apakah Anda yakin ingin melanjutkan?`,
      confirmLabel: `Ya, Kosongkan (${currentEditionRecords.length}) Data`,
      confirmVariant: 'danger',
      action: () => {
        const idsToDelete = currentEditionRecords.map(r => r.id);
        const otherEditions = records.filter(r => (r.edition || 'EA 08') !== selectedEdition);
        setRecords(otherEditions);

        idsToDelete.forEach(id => {
          deleteFirestoreDoc('employee_advocacy', id);
        });

        setSelectedIds([]);
        setConfirmModal(prev => ({ ...prev, show: false }));
        showNotice(`Semua data pegawai untuk edisi "${selectedEdition}" telah dikosongkan.`);
      }
    });
  };

  // Delete Entire Edition (Tab and its data)
  const handleDeleteEdition = (targetEd: string) => {
    setShowDeleteMenu(false);
    if (editions.length <= 1) {
      showNotice('Tidak dapat menghapus edisi terakhir. Minimal harus ada 1 edisi aktif.');
      return;
    }

    setConfirmModal({
      show: true,
      title: `Hapus Edisi ${targetEd}`,
      message: `Apakah Anda yakin ingin menghapus seluruh edisi "${targetEd}" beserta semua data pegawai di dalamnya?`,
      confirmLabel: `Ya, Hapus Edisi ${targetEd}`,
      confirmVariant: 'danger',
      action: () => {
        const newEditions = editions.filter(ed => ed !== targetEd);
        setEditions(newEditions);

        const itemsToDelete = records.filter(r => (r.edition || 'EA 08') === targetEd);
        const remainingRecords = records.filter(r => (r.edition || 'EA 08') !== targetEd);
        setRecords(remainingRecords);

        itemsToDelete.forEach(item => {
          deleteFirestoreDoc('employee_advocacy', item.id);
        });

        if (selectedEdition === targetEd) {
          setSelectedEdition(newEditions[0]);
        }

        setSelectedIds([]);
        setConfirmModal(prev => ({ ...prev, show: false }));
        showNotice(`Edisi "${targetEd}" dan seluruh datanya berhasil dihapus.`);
      }
    });
  };

  // Add New Edition
  const handleAddNewEdition = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newEditionName.trim().toUpperCase();
    if (!trimmed) return;

    if (editions.includes(trimmed)) {
      showNotice(`Edisi "${trimmed}" sudah ada.`);
      return;
    }

    // Clone existing list names with status 'Belum'
    const newEditionsList = [trimmed, ...editions];
    setEditions(newEditionsList);

    // Create default records for new edition based on existing unique employee names
    const uniqueNames = Array.from(new Set(records.map(r => r.name)));
    const newRecordsForEdition: EmployeeAdvocacyItem[] = (uniqueNames.length > 0 ? uniqueNames : INITIAL_EMPLOYEE_ADVOCACY.map(i => i.name)).map((name, idx) => ({
      id: `ea-${trimmed.replace(/\s+/g, '').toLowerCase()}-${idx + 1}-${Date.now()}`,
      name,
      status: 'Belum',
      edition: trimmed,
      updatedAt: new Date().toISOString()
    }));

    const combined = [...records, ...newRecordsForEdition];
    setRecords(combined);
    newRecordsForEdition.forEach(item => saveFirestoreDoc('employee_advocacy', item));

    setSelectedEdition(trimmed);
    setNewEditionName('');
    setShowNewEditionModal(false);
    showNotice(`Edisi baru "${trimmed}" berhasil dibuat dengan ${newRecordsForEdition.length} pegawai.`);
  };

  // Reset to Default
  const handleResetToDefault = () => {
    setShowDeleteMenu(false);
    setConfirmModal({
      show: true,
      title: 'Reset ke Data Awal',
      message: `Kembalikan data monitoring Employee Advocacy ${selectedEdition} ke daftar default awal (89 Pegawai Kanwil DJPb Riau)?`,
      confirmLabel: 'Ya, Reset Data',
      confirmVariant: 'warning',
      action: () => {
        const otherEditions = records.filter(r => (r.edition || 'EA 08') !== selectedEdition);
        const resetItems: EmployeeAdvocacyItem[] = INITIAL_EMPLOYEE_ADVOCACY.map(item => ({
          ...item,
          id: `ea-${selectedEdition.replace(/\s+/g, '').toLowerCase()}-${item.id}`,
          edition: selectedEdition,
          status: 'Belum',
          updatedAt: new Date().toISOString()
        }));

        const resetList = [...resetItems, ...otherEditions];
        setRecords(resetList);
        resetItems.forEach(item => saveFirestoreDoc('employee_advocacy', item));
        setSelectedIds([]);
        setConfirmModal(prev => ({ ...prev, show: false }));
        showNotice(`Data ${selectedEdition} berhasil dikembalikan ke 89 data pegawai awal.`);
      }
    });
  };

  // Bersihkan Duplikasi Pegawai
  const handleCleanDuplicates = () => {
    setShowDeleteMenu(false);
    const { clean, removed } = sanitizeEmployeeRecords(records);
    if (removed.length > 0) {
      setRecords(clean);
      removed.forEach(item => {
        if (item?.id) {
          deleteFirestoreDoc('employee_advocacy', item.id);
        }
      });
      showNotice(`BERHASIL! Sebanyak ${removed.length} data duplikasi pegawai telah dibersihkan.`);
    } else {
      showNotice(`Data pegawai sudah bersih, tidak ditemukan duplikasi.`);
    }
  };

  // Bulk Mark All as Sudah / Belum
  const handleBulkSetStatus = (targetStatus: 'Sudah' | 'Belum') => {
    setConfirmModal({
      show: true,
      title: `Tandai Semua "${targetStatus}"`,
      message: `Ubah SEMUA ${currentEditionRecords.length} pegawai pada edisi "${selectedEdition}" menjadi "${targetStatus}"?`,
      confirmLabel: `Tandai Semua "${targetStatus}"`,
      confirmVariant: targetStatus === 'Sudah' ? 'primary' : 'warning',
      action: () => {
        const updated = records.map(r => {
          if ((r.edition || 'EA 08') === selectedEdition) {
            return { ...r, status: targetStatus, updatedAt: new Date().toISOString() };
          }
          return r;
        });
        setRecords(updated);
        updated.filter(r => (r.edition || 'EA 08') === selectedEdition).forEach(item => {
          saveFirestoreDoc('employee_advocacy', item);
        });
        setConfirmModal(prev => ({ ...prev, show: false }));
        showNotice(`Semua pegawai di ${selectedEdition} ditandai "${targetStatus}".`);
      }
    });
  };

  // Copy Belum List for WhatsApp/Telegram broadcast
  const handleCopyBelumList = () => {
    const belumList = currentEditionRecords.filter(r => r.status === 'Belum');
    if (belumList.length === 0) {
      alert('Semua pegawai telah mengisi Employee Advocacy!');
      return;
    }

    const dateStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    let message = `📢 *PENGINGAT PENGISIAN EMPLOYEE ADVOCACY (${selectedEdition})*\n`;
    message += `*Kanwil DJPb Provinsi Riau*\n`;
    message += `📅 Per ${dateStr}\n\n`;
    message += `Yth. Bapak/Ibu, berikut daftar pegawai yang *BELUM* mengisi ${selectedEdition} (${belumList.length} orang):\n\n`;

    belumList.forEach((item, idx) => {
      message += `${idx + 1}. ${item.name}\n`;
    });

    message += `\nMohon dapat segera melakukan pengisian dan konfirmasi. Terima kasih atas partisipasi aktif Bapak/Ibu. 🙏✨`;

    navigator.clipboard.writeText(message).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 3000);
      showNotice(`Daftar ${belumList.length} pegawai yang belum mengisi berhasil disalin ke clipboard!`);
    }).catch(err => {
      console.error('Clipboard error:', err);
      alert('Gagal menyalin ke clipboard.');
    });
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    const exportRows = currentEditionRecords.map((item, idx) => ({
      'No': idx + 1,
      'Nama': item.name,
      [selectedEdition]: item.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    
    // Auto column width
    ws['!cols'] = [
      { wch: 6 },
      { wch: 45 },
      { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Monitoring ${selectedEdition}`);
    XLSX.writeFile(wb, `Monitoring_Pengisian_Employee_Advocacy_${selectedEdition.replace(/\s+/g, '_')}_Kanwil_DJPb_Riau.xlsx`);
    showNotice(`File Excel ${selectedEdition} berhasil diunduh.`);
  };

  // Download Excel Template
  const handleDownloadTemplate = () => {
    const sampleRows = [
      { 'Nama': 'Abil Fikri Audia S.M.', [selectedEdition]: 'Belum' },
      { 'Nama': 'Achmad Djunaidi', [selectedEdition]: 'Sudah' },
      { 'Nama': 'Ade Wahyu Susanto S.S.T. Ak. M.E.', [selectedEdition]: 'Belum' },
      { 'Nama': 'Adnan Wimbyarto S.E. M.M.', [selectedEdition]: 'Sudah' }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    ws['!cols'] = [{ wch: 40 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template EA');
    XLSX.writeFile(wb, `Template_Monitoring_${selectedEdition.replace(/\s+/g, '_')}.xlsx`);
  };

  // Handle Excel File Parsing (from file input or drag-and-drop)
  const processExcelFile = (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

        if (!rawRows || rawRows.length < 2) {
          alert('File Excel kosong atau tidak memiliki data.');
          return;
        }

        // 1. Detect edition from filename, sheet names, header row or fallback
        let detectedEdition = uploadTargetEdition || selectedEdition;

        // Check filename (e.g. "Monitoring EA 09.xlsx", "EA 10.xlsx", "EA09.xlsx", "EA_02")
        const fileNameMatch = file.name.match(/EA\s*[-_]?\s*0?(\d+)/i);
        if (fileNameMatch) {
          const num = parseInt(fileNameMatch[1], 10);
          detectedEdition = num < 10 ? `EA 0${num}` : `EA ${num}`;
        } else {
          // Check sheet names
          for (const sName of wb.SheetNames) {
            const sheetMatch = sName.match(/EA\s*[-_]?\s*0?(\d+)/i);
            if (sheetMatch) {
              const num = parseInt(sheetMatch[1], 10);
              detectedEdition = num < 10 ? `EA 0${num}` : `EA ${num}`;
              break;
            }
          }
        }

        // Check header row if still not detected or to confirm
        const headerRow = rawRows[0] || [];
        for (const col of headerRow) {
          const str = String(col || '').trim();
          const colMatch = str.match(/EA\s*[-_]?\s*0?(\d+)/i);
          if (colMatch) {
            const num = parseInt(colMatch[1], 10);
            detectedEdition = num < 10 ? `EA 0${num}` : `EA ${num}`;
            break;
          }
        }

        // Ensure detected edition is immediately available in top editions tabs
        setEditions(prev => {
          if (!prev.includes(detectedEdition)) {
            return [detectedEdition, ...prev];
          }
          return prev;
        });
        setUploadTargetEdition(detectedEdition);

        const parsedItems: EmployeeAdvocacyItem[] = [];
        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          // Check if row has No column or direct Name column
          let name = '';
          let statusRaw = '';

          if (row.length >= 3 && (typeof row[0] === 'number' || /^\d+$/.test(String(row[0]).trim()))) {
            name = String(row[1] || '').trim();
            statusRaw = String(row[2] || '').trim();
          } else {
            name = String(row[0] || '').trim();
            statusRaw = String(row[1] || '').trim();
          }

          if (name && isValidEmployeeAdvocacyName(name)) {
            const status: 'Sudah' | 'Belum' = statusRaw.toLowerCase().includes('sudah') ? 'Sudah' : 'Belum';
            parsedItems.push({
              id: `ea-${detectedEdition.replace(/\s+/g, '').toLowerCase()}-${i}-${Date.now()}`,
              name: name.trim(),
              status,
              edition: detectedEdition,
              updatedAt: new Date().toISOString()
            });
          }
        }

        if (parsedItems.length === 0) {
          alert('Format data Excel tidak sesuai. Pastikan terdapat kolom "Nama" dan status "Sudah" / "Belum".');
          return;
        }

        // Sanitasi & hilangkan duplikasi nama pada file Excel, lalu urutkan sesuai abjad (A - Z)
        const { clean: sanitizedExcelItems } = sanitizeEmployeeRecords(parsedItems);

        setExcelPreviewData(sanitizedExcelItems);
        setExcelFileName(file.name);
        setShowUploadModal(false);
        setShowExcelPreview(true);
      } catch (err) {
        console.error('Error importing Excel:', err);
        alert('Gagal membaca file Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processExcelFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processExcelFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Apply Excel Import
  const handleApplyExcelData = () => {
    if (excelPreviewData.length === 0) return;
    const targetEd = uploadTargetEdition || selectedEdition;

    // Make sure edition exists in tabs and is placed at the top / active
    setEditions(prev => {
      const rest = prev.filter(ed => ed !== targetEd);
      return [targetEd, ...rest];
    });

    let updatedList: EmployeeAdvocacyItem[] = [];

    if (uploadMode === 'replace') {
      // Replace all records for target edition (deduplicated & sorted alphabetically)
      const otherEditions = records.filter(r => (r.edition || 'EA 08') !== targetEd);
      const taggedNewItems = excelPreviewData.map(item => ({
        ...item,
        edition: targetEd
      }));
      const { clean: cleanNewItems, removed: removedReplace } = sanitizeEmployeeRecords(taggedNewItems);
      updatedList = [...otherEditions, ...cleanNewItems];
      cleanNewItems.forEach(item => saveFirestoreDoc('employee_advocacy', item));
      removedReplace.forEach(item => {
        if (item?.id) deleteFirestoreDoc('employee_advocacy', item.id);
      });
    } else {
      // Merge / update status based on intelligent normalized name matching (prevents duplicates with/without gelar)
      const targetRecords = records.filter(r => (r.edition || 'EA 08') === targetEd);
      const otherEditions = records.filter(r => (r.edition || 'EA 08') !== targetEd);

      const mergedTarget = [...targetRecords];
      excelPreviewData.forEach(imported => {
        const importedNorm = normalizeEmployeeName(imported.name);
        const existingIdx = mergedTarget.findIndex(
          ex => normalizeEmployeeName(ex.name) === importedNorm
        );
        if (existingIdx >= 0) {
          // Update status; keep more complete name with academic degree if available
          const preferredName = imported.name.trim().length > mergedTarget[existingIdx].name.trim().length
            ? imported.name.trim()
            : mergedTarget[existingIdx].name;

          mergedTarget[existingIdx] = {
            ...mergedTarget[existingIdx],
            name: preferredName,
            status: imported.status,
            updatedAt: new Date().toISOString()
          };
          saveFirestoreDoc('employee_advocacy', mergedTarget[existingIdx]);
        } else {
          const newItem: EmployeeAdvocacyItem = {
            ...imported,
            edition: targetEd
          };
          mergedTarget.push(newItem);
          saveFirestoreDoc('employee_advocacy', newItem);
        }
      });

      // Ensure no duplicates exist in merged target list
      const { clean: cleanMerged, removed: removedMerged } = sanitizeEmployeeRecords(mergedTarget);
      updatedList = [...otherEditions, ...cleanMerged];
      removedMerged.forEach(item => {
        if (item?.id) deleteFirestoreDoc('employee_advocacy', item.id);
      });
    }

    setRecords(updatedList);
    setSelectedEdition(targetEd);
    setShowExcelPreview(false);
    showNotice(`Berhasil mengimpor ${excelPreviewData.length} data pegawai ke edisi "${targetEd}".`);
  };

  // Generate PDF Preview from official document element
  const generatePdfPreview = async () => {
    setIsGeneratingPdfPreview(true);
    try {
      // Allow brief moment for DOM render of #ea-printable-document
      await new Promise((resolve) => setTimeout(resolve, 200));
      const res = await createPdfFromElement('ea-printable-document');
      if (res) {
        if (pdfBlobUrl) {
          URL.revokeObjectURL(pdfBlobUrl);
        }
        setPdfBlobUrl(res.blobUrl);
        return res;
      }
      return null;
    } catch (err) {
      console.warn('Gagal merender pratinjau PDF:', err);
      return null;
    } finally {
      setIsGeneratingPdfPreview(false);
    }
  };

  // Automatically trigger PDF preview generation in background whenever the print modal opens or edition changes
  useEffect(() => {
    if (showPrintModal) {
      setActivePrintViewTab('document');
      setPreviewZoom(100);
      generatePdfPreview();
    } else {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
    }
  }, [showPrintModal, selectedEdition]);

  // Trigger Printer Selection Dialog (Pilih Printer & Cetak)
  const handleChoosePrinter = () => {
    // Reset zoom and ensure document tab is active
    setActivePrintViewTab('document');
    setPreviewZoom(100);

    const cleanEdition = selectedEdition.replace(/[^a-zA-Z0-9_-]/g, '_');
    const docTitle = `Laporan_Employee_Advocacy_${cleanEdition}`;

    showNotice('Membuka jendela cetak dan dialog printer...');

    // Run printDocumentElement directly within user click gesture (prevents popup blocking)
    const printed = printDocumentElement('ea-printable-document', docTitle);
    if (!printed) {
      try {
        window.focus();
        window.print();
      } catch (err) {
        console.warn('Print fallback failed:', err);
        if (pdfBlobUrl) {
          window.open(pdfBlobUrl, '_blank');
        } else {
          handleDownloadPdf();
        }
      }
    }
  };

  // Open PDF Preview in a New Tab
  const handleOpenPdfNewTab = async () => {
    if (pdfBlobUrl) {
      window.open(pdfBlobUrl, '_blank');
    } else {
      showNotice('Menyiapkan file PDF, silakan tunggu sejenak...');
      const res = await generatePdfPreview();
      if (res && res.blobUrl) {
        window.open(res.blobUrl, '_blank');
      }
    }
  };

  // Direct PDF Generation & Download (Simpan File PDF)
  const handleDownloadPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    showNotice('Sedang memproses dan membuat file PDF resmi...');

    try {
      const cleanEditionName = selectedEdition.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Laporan_Employee_Advocacy_${cleanEditionName}.pdf`;

      const success = await exportElementToPdf({
        filename,
        elementId: 'ea-printable-document',
        onSuccess: () => {
          setIsExportingPdf(false);
          showNotice(`File ${filename} berhasil disimpan dan diunduh.`);
        },
        onError: (err) => {
          setIsExportingPdf(false);
          console.error('Export PDF error:', err);
          showNotice('Membuka dialog cetak browser sebagai alternatif...');
          window.print();
        }
      });

      if (!success) {
        setIsExportingPdf(false);
      }
    } catch (err) {
      setIsExportingPdf(false);
      console.error('Fatal PDF export error:', err);
      window.print();
    }
  };

  // Open Print Modal Preview
  const handlePrint = () => {
    setActivePrintViewTab('document');
    setPreviewZoom(100);
    setShowPrintModal(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-6" id="monitoring-ea-root">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 bg-slate-900/95 text-white text-xs font-semibold rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Dashboard Interactive Content */}
      <div id="ea-dashboard-view" className={showPrintModal ? "space-y-6 print:hidden" : "space-y-6"}>
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-djpb-blue-dark to-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-djpb-blue/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="w-14 h-14 rounded-2xl bg-white/10 p-2 flex items-center justify-center shrink-0 border border-white/20 shadow-sm backdrop-blur-xs">
              <KemenkeuLogo className="w-full h-full filter drop-shadow-sm" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 bg-white/10 text-sky-200 text-[11px] font-bold rounded-full tracking-wide uppercase border border-white/10">
                  Layanan Informasi Publikasi
                </span>
                <span className="flex items-center space-x-1 text-emerald-400 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Live Monitoring</span>
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-display font-extrabold tracking-tight text-white flex items-center space-x-2.5">
                <Share2 className="w-6 h-6 text-sky-300" />
                <span>Monitoring Pengisian Employee Advocacy</span>
              </h1>
              <p className="text-xs md:text-sm text-slate-300 max-w-2xl">
                Pantauan tingkat kepatuhan dan status pengisian Employee Advocacy seluruh pegawai Kantor Wilayah DJPb Provinsi Riau.
              </p>
            </div>
          </div>

          {/* Quick Actions (Admin Only) */}
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                id="btn-upload-ea-excel-main"
                onClick={() => {
                  setUploadTargetEdition(selectedEdition);
                  setShowUploadModal(true);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
                title="Unggah / Impor file Excel pengisian Employee Advocacy"
              >
                <Upload className="w-4 h-4 text-slate-950" />
                <span>Upload Excel</span>
              </button>

              <button
                type="button"
                id="btn-copy-belum-wa"
                onClick={handleCopyBelumList}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
                title="Salin daftar pegawai yang belum mengisi untuk pengingat WhatsApp/Telegram"
              >
                {copyFeedback ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
                <span>{copyFeedback ? 'Tersalin!' : 'Salin Yang Belum'}</span>
              </button>

              <button
                type="button"
                id="btn-export-ea-excel"
                onClick={handleExportExcel}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Ekspor Excel</span>
              </button>

              <button
                type="button"
                id="btn-print-ea"
                onClick={handlePrint}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-all border border-white/15 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / PDF</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards / Progress Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Pegawai */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Pegawai</p>
            <p className="text-2xl font-bold font-display text-slate-900 mt-0.5">{totalCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Terdaftar pada {selectedEdition}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Sudah Mengisi */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex items-center justify-between bg-emerald-50/20">
          <div>
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Sudah Mengisi</p>
            <p className="text-2xl font-bold font-display text-emerald-600 mt-0.5">{sudahCount}</p>
            <p className="text-[11px] text-emerald-600/80 mt-0.5 font-semibold">
              {totalCount > 0 ? ((sudahCount / totalCount) * 100).toFixed(1) : 0}% Kepatuhan
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Belum Mengisi */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs flex items-center justify-between bg-rose-50/20">
          <div>
            <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Belum Mengisi</p>
            <p className="text-2xl font-bold font-display text-rose-600 mt-0.5">{belumCount}</p>
            <p className="text-[11px] text-rose-600/80 mt-0.5 font-semibold">
              {totalCount > 0 ? ((belumCount / totalCount) * 100).toFixed(1) : 0}% Pegawai
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Progress Bar & Kepatuhan */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Progress Kepatuhan</p>
              <span className="text-xs font-bold text-djpb-blue font-mono">{complianceRate}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2 overflow-hidden border border-slate-200/60">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  complianceRate >= 80 ? 'bg-emerald-500' : complianceRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${complianceRate}%` }}
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Target: 100% Partisipasi Seluruh Pegawai
          </p>
        </div>
      </div>

      {/* Control Bar: Edition Selector, Search, Status Filter & Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          
          {/* Edition Tabs & Add Edition */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">Edisi:</span>
            {editions.map((ed) => (
              <button
                key={ed}
                type="button"
                onClick={() => setSelectedEdition(ed)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedEdition === ed
                    ? 'bg-djpb-blue text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                {ed}
              </button>
            ))}
            {isAdmin && (
              <button
                type="button"
                id="btn-add-ea-edition"
                onClick={() => setShowNewEditionModal(true)}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-dashed border-slate-300 transition-colors shrink-0 cursor-pointer"
                title="Tambah Periode/Edisi EA Baru"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Edisi Baru</span>
              </button>
            )}
          </div>

          {/* Management Tools (Admin Only) */}
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <button
                type="button"
                id="btn-open-upload-modal"
                onClick={() => {
                  setUploadTargetEdition(selectedEdition);
                  setShowUploadModal(true);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer active:scale-95"
                title="Unggah file Excel monitoring pengisian EA"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Excel</span>
              </button>

              <button
                type="button"
                id="btn-download-template"
                onClick={handleDownloadTemplate}
                className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                title="Unduh Format Template Excel EA"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Template</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAdd}
                className="flex items-center space-x-1 px-3 py-1.5 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Pegawai</span>
              </button>

              {/* Admin Menu Hapus Dropdown */}
              <div className="relative" ref={deleteMenuRef}>
                <button
                  type="button"
                  id="btn-admin-delete-menu"
                  onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 transition-colors cursor-pointer"
                  title="Menu Hapus & Bersihkan Data"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Menu Hapus</span>
                  <ChevronDown className="w-3 h-3 text-rose-500" />
                </button>

                {showDeleteMenu && (
                  <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-100 font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                      Menu Hapus Administrator
                    </div>

                    {/* Hapus Terpilih */}
                    <button
                      type="button"
                      onClick={handleBulkDeleteSelected}
                      disabled={selectedIds.length === 0}
                      className={`w-full text-left px-3 py-2 flex items-center space-x-2 transition-colors ${
                        selectedIds.length > 0
                          ? 'text-rose-700 hover:bg-rose-50 cursor-pointer font-semibold'
                          : 'text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Hapus Terpilih ({selectedIds.length})</span>
                    </button>

                    {/* Kosongkan Semua Data Edisi Ini */}
                    <button
                      type="button"
                      onClick={handleClearCurrentEdition}
                      className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 hover:text-rose-800 flex items-center space-x-2 transition-colors cursor-pointer font-medium"
                    >
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Kosongkan Data {selectedEdition}</span>
                    </button>

                    {/* Hapus Edisi */}
                    {editions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteEdition(selectedEdition)}
                        className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 hover:text-rose-800 flex items-center space-x-2 transition-colors cursor-pointer font-medium"
                      >
                        <X className="w-3.5 h-3.5 shrink-0" />
                        <span>Hapus Edisi {selectedEdition}</span>
                      </button>
                    )}

                    {/* Bersihkan Duplikasi Pegawai */}
                    <button
                      type="button"
                      id="btn-clean-ea-duplicates"
                      onClick={handleCleanDuplicates}
                      className="w-full text-left px-3 py-2 text-emerald-700 hover:bg-emerald-50 flex items-center space-x-2 transition-colors cursor-pointer font-medium"
                      title="Pindai dan hilangkan data nama pegawai ganda/duplikat (termasuk variasi gelar)"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Bersihkan Duplikasi Data</span>
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    {/* Reset ke Data Default */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteMenu(false);
                        handleResetToDefault();
                      }}
                      className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Reset Data Awal (89 Pegawai)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Status Buttons */}
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter('All')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'All'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Semua ({currentEditionRecords.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Sudah')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'Sudah'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sudah ({sudahCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('Belum')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'Belum'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Belum ({belumCount})</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="search-ea-employee"
              placeholder="Cari nama pegawai..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-djpb-blue focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Bulk toggle if admin */}
        {isAdmin && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-600">Aksi Cepat Administrator:</span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleBulkSetStatus('Sudah')}
                className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline cursor-pointer"
              >
                Tandai Semua Sudah
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => handleBulkSetStatus('Belum')}
                className="text-rose-600 hover:text-rose-700 font-semibold hover:underline cursor-pointer"
              >
                Tandai Semua Belum
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={handleClearCurrentEdition}
                className="text-rose-500 hover:text-rose-700 hover:underline cursor-pointer"
              >
                Kosongkan Edisi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table: Exact format as uploaded image */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {/* Active Selection Banner for Admin */}
        {isAdmin && selectedIds.length > 0 && (
          <div className="bg-sky-50 border-b border-sky-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-150">
            <div className="flex items-center space-x-2 text-xs font-bold text-sky-900">
              <span className="bg-sky-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                {selectedIds.length}
              </span>
              <span>Pegawai Terpilih</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  const updated = records.map(r => selectedIds.includes(r.id) ? { ...r, status: 'Sudah' as const, updatedAt: new Date().toISOString() } : r);
                  setRecords(updated);
                  updated.filter(r => selectedIds.includes(r.id)).forEach(i => saveFirestoreDoc('employee_advocacy', i));
                  showNotice(`${selectedIds.length} pegawai ditandai "Sudah".`);
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs cursor-pointer active:scale-95"
              >
                Tandai Sudah
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = records.map(r => selectedIds.includes(r.id) ? { ...r, status: 'Belum' as const, updatedAt: new Date().toISOString() } : r);
                  setRecords(updated);
                  updated.filter(r => selectedIds.includes(r.id)).forEach(i => saveFirestoreDoc('employee_advocacy', i));
                  showNotice(`${selectedIds.length} pegawai ditandai "Belum".`);
                }}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md shadow-xs cursor-pointer active:scale-95"
              >
                Tandai Belum
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteSelected}
                className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold rounded-md border border-rose-300 cursor-pointer flex items-center space-x-1 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Terpilih ({selectedIds.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 text-xs font-medium rounded-md border border-slate-200 cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold font-display">
                {isAdmin && (
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredRecords.length && filteredRecords.length > 0}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-300 text-djpb-blue focus:ring-djpb-blue cursor-pointer"
                      title="Pilih / Batalkan Semua"
                    />
                  </th>
                )}
                <th className="py-3 px-4 w-12 text-center text-slate-500">No</th>
                <th 
                  className="py-3 px-4 cursor-pointer select-none hover:bg-slate-200/60 transition-colors group"
                  onClick={() => setNameSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  title="Klik untuk mengubah urutan abjad (A-Z / Z-A)"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>Nama Pegawai</span>
                    <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200 group-hover:bg-sky-200 transition-colors">
                      <ArrowUpDown className="w-2.5 h-2.5" />
                      <span>{nameSortOrder === 'asc' ? 'A → Z' : 'Z → A'}</span>
                    </span>
                  </div>
                </th>
                <th className="py-3 px-4 w-36 text-center border-l border-slate-200 bg-slate-50 font-extrabold text-slate-800">
                  {selectedEdition}
                </th>
                {isAdmin && (
                  <th className="py-3 px-4 w-44 text-center border-l border-slate-200 bg-slate-100/90 text-slate-800">
                    Status / Aksi
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 3} className="py-10 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Tidak ada data pegawai ditemukan</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau filter status.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item, index) => {
                  const isSudah = item.status === 'Sudah';
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected 
                          ? 'bg-sky-50/60' 
                          : isSudah 
                          ? 'bg-white' 
                          : 'bg-rose-50/10'
                      }`}
                    >
                      {/* Checkbox for Admin */}
                      {isAdmin && (
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(item.id)}
                            className="rounded border-slate-300 text-djpb-blue focus:ring-djpb-blue cursor-pointer"
                          />
                        </td>
                      )}

                      {/* No */}
                      <td className="py-2.5 px-4 text-center font-mono text-slate-400 text-[11px]">
                        {index + 1}
                      </td>

                      {/* Nama Pegawai */}
                      <td className="py-2.5 px-4 font-semibold text-slate-900">
                        {item.name}
                      </td>

                      {/* EA Status (Exact Style format) */}
                      <td className="py-2.5 px-4 text-center border-l border-slate-100 font-medium">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            className={`inline-flex items-center justify-center px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
                              isSudah
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                            }`}
                            title="Klik untuk mengubah status Sudah/Belum"
                          >
                            {item.status}
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center justify-center px-3 py-1 rounded-md text-xs font-bold ${
                              isSudah
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {item.status}
                          </span>
                        )}
                      </td>

                      {/* Actions: ONLY Rendered for Admin */}
                      {isAdmin && (
                        <td className="py-2.5 px-4 text-center border-l border-slate-100">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(item)}
                              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                                isSudah 
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' 
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                              title={isSudah ? 'Ubah ke Belum' : 'Tandai Sudah'}
                            >
                              {isSudah ? 'Tandai Belum' : 'Tandai Sudah'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              title="Edit Nama"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteEmployee(item)}
                              className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Hapus Pegawai Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="bg-slate-50 p-3 px-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>Menampilkan <strong>{filteredRecords.length}</strong> dari <strong>{currentEditionRecords.length}</strong> pegawai</span>
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Sudah: <strong>{sudahCount}</strong></span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Belum: <strong>{belumCount}</strong></span>
            </span>
          </div>
        </div>
      </div>

      {/* Modal: Add / Edit Employee */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold font-display text-slate-900">
                {editingItem ? 'Edit Data Pegawai' : `Tambah Pegawai Baru (${selectedEdition})`}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Pegawai (beserta Gelar) *
                </label>
                <input
                  type="text"
                  required
                  value={employeeForm.name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                  placeholder="Contoh: Muhammad Ali Mutohar A.Md"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-djpb-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Pengisian {selectedEdition} *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEmployeeForm({ ...employeeForm, status: 'Sudah' })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      employeeForm.status === 'Sudah'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    Sudah Mengisi
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmployeeForm({ ...employeeForm, status: 'Belum' })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      employeeForm.status === 'Belum'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    Belum Mengisi
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Tambah ke Daftar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add New EA Edition */}
      {showNewEditionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold font-display text-slate-900">
                Tambah Edisi EA Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowNewEditionModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewEdition} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama / Kode Edisi EA *
                </label>
                <input
                  type="text"
                  required
                  value={newEditionName}
                  onChange={(e) => setNewEditionName(e.target.value)}
                  placeholder="Contoh: EA 09"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-djpb-blue focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Daftar seluruh pegawai akan otomatis disalin ke edisi baru dengan status awal &quot;Belum&quot;.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewEditionModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  Buat Edisi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upload Excel Dialog */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display text-slate-900">
                    Upload File Excel Monitoring EA
                  </h3>
                  <p className="text-[11px] text-slate-500">Impor status pengisian pegawai dari spreadsheet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Edition & Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pilih Target Edisi EA (EA 01 s.d. EA 10) *
                </label>
                <select
                  id="select-upload-target-edition"
                  value={uploadTargetEdition}
                  onChange={(e) => setUploadTargetEdition(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white text-xs font-semibold text-slate-800"
                >
                  <optgroup label="Pilihan Edisi Standar (EA 01 - EA 10)">
                    {STANDARD_EA_EDITIONS.map((ed) => (
                      <option key={ed} value={ed}>{ed}</option>
                    ))}
                  </optgroup>
                  {editions.filter(ed => !STANDARD_EA_EDITIONS.includes(ed)).length > 0 && (
                    <optgroup label="Edisi Kustom Lainnya">
                      {editions.filter(ed => !STANDARD_EA_EDITIONS.includes(ed)).map((ed) => (
                        <option key={ed} value={ed}>{ed}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Metode Impor Data
                </label>
                <select
                  value={uploadMode}
                  onChange={(e) => setUploadMode(e.target.value as 'replace' | 'merge')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white text-xs font-semibold text-slate-800"
                >
                  <option value="replace">Ganti Semua Data (Replace)</option>
                  <option value="merge">Perbarui Status Saja (Merge by Name)</option>
                </select>
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => modalFileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-sky-500 bg-sky-50/80 scale-[0.99]'
                  : 'border-slate-300 hover:border-sky-400 bg-slate-50/60 hover:bg-sky-50/30'
              }`}
            >
              <input
                type="file"
                ref={modalFileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                Tarik & Lepaskan File Excel ke Sini
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                atau <span className="text-sky-600 font-semibold underline">klik untuk memilih file dari komputer</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-2">
                Mendukung format .xlsx, .xls, .csv
              </p>
            </div>

            {/* Excel Column Guidelines */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
              <p className="font-bold text-slate-800 flex items-center space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-sky-600" />
                <span>Format Kolom yang Didukung:</span>
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
                <li>Kolom 1: <strong>No</strong> (Opsional)</li>
                <li>Kolom 2: <strong>Nama Pegawai</strong> (Lengkap dengan gelar)</li>
                <li>Kolom 3: <strong>{uploadTargetEdition}</strong> (Nilai: &quot;Sudah&quot; atau &quot;Belum&quot;)</li>
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center space-x-1 text-sky-600 hover:text-sky-700 text-xs font-semibold underline cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Template Contoh</span>
              </button>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => modalFileInputRef.current?.click()}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  Pilih File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Preview Excel Import */}
      {showExcelPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-display text-slate-900">
                  Pratinjau Impor Excel ({uploadTargetEdition || selectedEdition})
                </h3>
                <p className="text-xs text-slate-500">
                  File: <span className="font-semibold text-slate-700">{excelFileName}</span> • Total: <strong>{excelPreviewData.length}</strong> pegawai • <span className="inline-flex items-center text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">Tersusun Sesuai Abjad (A-Z)</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExcelPreview(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3.5">
              {/* Summary Stats of Upload */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Total Baris</p>
                  <p className="text-lg font-bold text-slate-900">{excelPreviewData.length}</p>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-center">
                  <p className="text-[10px] uppercase font-bold text-emerald-700">Sudah Mengisi</p>
                  <p className="text-lg font-bold text-emerald-700">
                    {excelPreviewData.filter(i => i.status === 'Sudah').length}
                  </p>
                </div>
                <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200 text-center">
                  <p className="text-[10px] uppercase font-bold text-rose-700">Belum Mengisi</p>
                  <p className="text-lg font-bold text-rose-700">
                    {excelPreviewData.filter(i => i.status === 'Belum').length}
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Konfirmasi Penerapan Data:</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Mode: <strong>{uploadMode === 'replace' ? 'Ganti Semua Data (Replace)' : 'Perbarui Status Saja (Merge)'}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <label className="text-[11px] font-bold text-amber-900 whitespace-nowrap">Target Edisi:</label>
                  <select
                    value={uploadTargetEdition || selectedEdition}
                    onChange={(e) => setUploadTargetEdition(e.target.value)}
                    className="px-2.5 py-1 text-xs font-bold bg-white border border-amber-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <optgroup label="Edisi Standar (EA 01 - EA 10)">
                      {STANDARD_EA_EDITIONS.map((ed) => (
                        <option key={ed} value={ed}>{ed}</option>
                      ))}
                    </optgroup>
                    {editions.filter(ed => !STANDARD_EA_EDITIONS.includes(ed)).length > 0 && (
                      <optgroup label="Edisi Kustom">
                        {editions.filter(ed => !STANDARD_EA_EDITIONS.includes(ed)).map((ed) => (
                          <option key={ed} value={ed}>{ed}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center">No</th>
                      <th className="py-2 px-3">Nama Pegawai (Urut Abjad A-Z)</th>
                      <th className="py-2 px-3 w-28 text-center">{uploadTargetEdition || selectedEdition}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {excelPreviewData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{item.name}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            item.status === 'Sudah' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 px-6 border-t border-slate-200 flex items-center justify-between bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => {
                  setShowExcelPreview(false);
                  setShowUploadModal(true);
                }}
                className="text-xs text-slate-600 hover:text-slate-900 underline font-semibold cursor-pointer"
              >
                Pilih File Lain
              </button>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowExcelPreview(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApplyExcelData}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer"
                >
                  Terapkan & Simpan Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-App Confirmation Modal (Reliable across all iframe environments) */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                confirmModal.confirmVariant === 'danger'
                  ? 'bg-rose-100 text-rose-600'
                  : confirmModal.confirmVariant === 'warning'
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-sky-100 text-sky-600'
              }`}>
                {confirmModal.confirmVariant === 'danger' ? (
                  <Trash2 className="w-5 h-5" />
                ) : confirmModal.confirmVariant === 'warning' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold font-display text-slate-900">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmModal.action}
                className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer active:scale-95 ${
                  confirmModal.confirmVariant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmModal.confirmVariant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-sky-600 hover:bg-sky-700'
                }`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Modal: Cetak / PDF Preview & Print Engine */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 z-[9990] animate-in fade-in duration-200 print-modal-container">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden print-modal-card">
            {/* Modal Top Header */}
            <div className="p-4 px-6 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 print-modal-header print:hidden">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm md:text-base font-bold font-display text-white">
                      Cetak Dokumen & Pratinjau PDF
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                      {selectedEdition}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Laporan Monitoring Pengisian Employee Advocacy Kanwil DJPb Provinsi Riau
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  title="Ekspor ke format Excel .xlsx"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Ekspor Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  title="Unduh langsung berkas file PDF resmi"
                >
                  {isExportingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Simpan PDF</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-choose-printer-top"
                  onClick={handleChoosePrinter}
                  className="flex items-center space-x-1.5 px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold rounded-lg transition-all shadow-sm cursor-pointer active:scale-95"
                  title="Pilih printer fisik / virtual untuk mencetak dokumen"
                >
                  <Printer className="w-4 h-4 text-slate-950" />
                  <span>Pilih Printer & Cetak</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Tutup Pratinjau"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Step Navigation & View Tabs Bar */}
            <div className="bg-slate-800 border-b border-slate-700 px-4 md:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
              <div className="flex items-center space-x-1 bg-slate-900/60 p-1 rounded-lg border border-slate-700">
                <button
                  type="button"
                  id="tab-preview-document"
                  onClick={() => setActivePrintViewTab('document')}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    activePrintViewTab === 'document'
                      ? 'bg-sky-500 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Pratinjau Dokumen PDF (A4)</span>
                </button>

                <button
                  type="button"
                  id="tab-preview-iframe"
                  onClick={() => setActivePrintViewTab('pdf')}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    activePrintViewTab === 'pdf'
                      ? 'bg-sky-500 text-slate-950 shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Penampil PDF Browser</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                {activePrintViewTab === 'document' && (
                  <div className="flex items-center space-x-1 bg-slate-900/70 px-2 py-0.5 rounded-lg border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(z => Math.max(60, z - 10))}
                      className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer transition-colors"
                      title="Perkecil Tampilan"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono text-slate-200 px-1 min-w-[38px] text-center font-bold">
                      {previewZoom}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(z => Math.min(140, z + 10))}
                      className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded cursor-pointer transition-colors"
                      title="Perbesar Tampilan"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    {previewZoom !== 100 && (
                      <button
                        type="button"
                        onClick={() => setPreviewZoom(100)}
                        className="text-[10px] text-sky-400 hover:text-sky-300 px-1.5 py-0.5 rounded hover:bg-slate-800 cursor-pointer font-medium"
                        title="Kembalikan ke 100%"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                )}

                {isGeneratingPdfPreview ? (
                  <span className="flex items-center space-x-1 text-sky-400 text-[11px] font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="hidden sm:inline">Membuat file PDF...</span>
                  </span>
                ) : pdfBlobUrl ? (
                  <span className="flex items-center space-x-1 text-emerald-400 text-[11px] font-medium">
                    <Check className="w-3 h-3" />
                    <span className="hidden sm:inline">PDF Siap</span>
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={generatePdfPreview}
                  disabled={isGeneratingPdfPreview}
                  className="flex items-center space-x-1 px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                  title="Muat ulang berkas PDF"
                >
                  <RefreshCw className={`w-3 h-3 ${isGeneratingPdfPreview ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh PDF</span>
                </button>

                {pdfBlobUrl && (
                  <button
                    type="button"
                    onClick={handleOpenPdfNewTab}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-sky-300 hover:text-sky-200 rounded-md transition-colors cursor-pointer"
                    title="Buka tampilan PDF di tab browser baru"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Buka di Tab Baru</span>
                  </button>
                )}
              </div>
            </div>

            {/* Instruction Notice Banner */}
            <div className="bg-sky-50 border-b border-sky-100 px-4 md:px-6 py-2 flex items-center space-x-2.5 text-xs text-sky-950 print:hidden shrink-0">
              <Info className="w-4 h-4 text-sky-600 shrink-0" />
              <div className="flex-1 leading-relaxed">
                <strong>Pratinjau Dokumen Siap:</strong> Tampilan di bawah ini adalah format resmi dokumen A4 Kanwil DJPb Riau. 
                Klik <strong>"Pilih Printer & Cetak"</strong> untuk mencetak langsung, atau <strong>"Simpan PDF"</strong> untuk mengunduh dokumen.
              </div>
            </div>

            {/* Tab 2: Embedded Native PDF Viewer */}
            {activePrintViewTab === 'pdf' && (
              <div className="p-3 md:p-6 overflow-y-auto flex-1 bg-slate-200 flex flex-col items-center justify-center print:hidden">
                {isGeneratingPdfPreview ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center space-y-3 bg-white rounded-2xl shadow-sm border border-slate-300 max-w-md w-full">
                    <Loader2 className="w-10 h-10 text-djpb-blue animate-spin" />
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Menyiapkan Penampil PDF Browser...</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Sedang mengonversi dokumen ke format PDF mandiri. Anda juga dapat langsung melihat pratinjau lembar A4 pada tab pertama.
                      </p>
                    </div>
                  </div>
                ) : pdfBlobUrl ? (
                  <div className="w-full h-full max-w-5xl rounded-xl shadow-lg overflow-hidden border border-slate-300 bg-white flex flex-col">
                    <iframe
                      ref={pdfIframeRef}
                      src={`${pdfBlobUrl}#view=FitH`}
                      className="w-full flex-1 min-h-[520px] md:min-h-[620px] border-0"
                      title="Pratinjau PDF Dokumen Laporan Employee Advocacy"
                    />
                  </div>
                ) : (
                  <div className="p-10 text-center bg-white rounded-2xl border border-slate-300 shadow-sm max-w-md">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <h4 className="font-bold text-slate-800 text-sm">Penampil PDF belum siap</h4>
                    <p className="text-xs text-slate-500 mt-1 mb-4">
                      Silakan klik tombol muat ulang atau gunakan tab Pratinjau Dokumen PDF (A4).
                    </p>
                    <button
                      type="button"
                      onClick={generatePdfPreview}
                      className="px-3.5 py-1.5 bg-djpb-blue text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Render Ulang PDF
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 1 & Printable Engine: Official Document Paper */}
            <div className={`ea-document-wrapper ${
              activePrintViewTab === 'document' 
                ? 'p-4 md:p-8 overflow-y-auto flex-1 bg-slate-200 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible' 
                : 'fixed -left-[99999px] top-0 pointer-events-none opacity-0 print:static print:left-auto print:top-auto print:pointer-events-auto print:opacity-100 print:block'
            }`}>
              <div 
                id="ea-printable-document"
                style={{ 
                  transform: previewZoom !== 100 ? `scale(${previewZoom / 100})` : undefined, 
                  transformOrigin: 'top center' 
                }}
                className="bg-white w-full max-w-[210mm] min-h-[297mm] p-6 md:p-10 shadow-xl border border-slate-300 text-slate-900 rounded-xs font-sans text-xs print:shadow-none print:p-0 print:border-none print:w-full print:transform-none"
              >
                {/* Official Kop DJPb with Kemenkeu Logo on Top Left */}
                <div className="flex items-center space-x-4 pb-3 border-b-2 border-slate-900 mb-5">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center">
                    <KemenkeuLogo className="w-full h-full" />
                  </div>
                  <div className="flex-1 text-center font-sans">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                      KEMENTERIAN KEUANGAN REPUBLIK INDONESIA
                    </div>
                    <div className="text-[10px] font-bold uppercase text-slate-700">
                      DIREKTORAT JENDERAL PERBENDAHARAAN
                    </div>
                    <div className="text-[13px] font-extrabold uppercase mt-0.5 text-slate-900 tracking-tight">
                      KANTOR WILAYAH DIREKTORAT JENDERAL PERBENDAHARAAN PROVINSI RIAU
                    </div>
                    <div className="text-[9px] text-slate-600 mt-1">
                      Jl. Jenderal Sudirman No. 249, Pekanbaru 28128 | Telp: (0761) 23456 | Email: djpb.riau@kemenkeu.go.id
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center mb-5">
                  <div className="text-[13px] font-extrabold uppercase underline tracking-wide text-slate-900">
                    LAPORAN MONITORING PENGISIAN EMPLOYEE ADVOCACY
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-1">
                    Periode / Edisi: {selectedEdition}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>

                {/* Statistics Box */}
                <div className="grid grid-cols-4 gap-2 mb-4 bg-slate-50 border border-slate-300 p-2.5 rounded text-[11px]">
                  <div>Total Pegawai: <strong className="text-slate-900">{totalCount} Orang</strong></div>
                  <div>Sudah Mengisi: <strong className="text-emerald-700">{sudahCount} ({complianceRate}%)</strong></div>
                  <div>Belum Mengisi: <strong className="text-rose-700">{belumCount} Orang</strong></div>
                  <div>Partisipasi: <strong className="text-sky-700">{complianceRate}%</strong></div>
                </div>

                {/* Table */}
                <table className="w-full text-left border-collapse text-[10px] border border-slate-400 mb-6">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 text-slate-800">
                      <th className="py-1.5 px-2 border-r border-slate-400 w-8 text-center">No</th>
                      <th className="py-1.5 px-2 border-r border-slate-400">Nama Lengkap Pegawai</th>
                      <th className="py-1.5 px-2 text-center w-28">Status ({selectedEdition})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentEditionRecords.map((item, idx) => (
                      <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50/50">
                        <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono text-[10px]">{idx + 1}</td>
                        <td className="py-1.5 px-2 border-r border-slate-200 text-slate-800 font-medium">{item.name}</td>
                        <td className="py-1.5 px-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                            item.status === 'Sudah' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Signature Box */}
                <div className="mt-8 flex justify-end">
                  <div className="text-center text-[11px] w-64">
                    <div>Pekanbaru, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <div className="font-semibold mt-1">Pengelola Employee Advocacy,</div>
                    <div className="h-16"></div>
                    <div className="font-bold underline text-slate-900">Tim Humas</div>
                    <div className="text-[10px] text-slate-600">Kanwil DJPb Provinsi Riau</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Bar */}
            <div className="p-3.5 px-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs print-modal-footer print:hidden">
              <div className="text-slate-600 text-[11px]">
                Total: <strong className="text-slate-900">{totalCount}</strong> pegawai | Sudah: <strong className="text-emerald-700">{sudahCount}</strong> ({complianceRate}%) | Belum: <strong className="text-rose-700">{belumCount}</strong>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-300 cursor-pointer transition-colors"
                >
                  Tutup
                </button>

                {pdfBlobUrl && (
                  <button
                    type="button"
                    onClick={handleOpenPdfNewTab}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg border border-slate-300 cursor-pointer transition-colors"
                    title="Buka PDF di tab browser baru untuk mencetak via penampil browser"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                    <span>Buka di Tab Baru</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg shadow-xs cursor-pointer transition-all disabled:opacity-50"
                  title="Unduh langsung file PDF resmi"
                >
                  {isExportingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Simpan PDF</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-choose-printer-bottom"
                  onClick={handleChoosePrinter}
                  className="flex items-center space-x-2 px-5 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white font-extrabold rounded-lg shadow-md hover:shadow-lg cursor-pointer transition-all active:scale-95"
                  title="Buka dialog printer untuk memilih perangkat printer"
                >
                  <Printer className="w-4 h-4 text-white" />
                  <span>Pilih Printer & Cetak</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
