import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Shield, Plus, Trash2, Edit3, Check, X,
  FileSpreadsheet, Upload, Download, RotateCcw, AlertCircle, FileCheck,
  Search, Users, Home, Calendar, Clock, Sparkles, Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SecurityShift, SecurityRosterItem } from '../types';
import { INITIAL_SECURITY_SHIFTS, INITIAL_SECURITY_ROSTER } from '../mockData';
import { saveFirestoreCollection, subscribeFirestoreCollection, saveFirestoreDoc } from '../lib/firebase';
import { safeLocalStorageSet } from '../lib/storage';

const ID_DAYS_UPPER = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
const ID_MONTHS_TITLE = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function extractMonthAndYearFromText(text: string): { month: number; year: number } | null {
  if (!text) return null;
  const up = text.toUpperCase();
  let month = -1;
  for (let m = 0; m < ID_MONTHS_TITLE.length; m++) {
    const mName = ID_MONTHS_TITLE[m].toUpperCase();
    if (up.includes(mName)) {
      month = m + 1;
      break;
    }
  }
  if (month === -1) {
    if (up.includes('OKT') || up.includes('OCT')) month = 10;
    else if (up.includes('AGU') || up.includes('AGS') || up.includes('AUG') || up.includes('ASG')) month = 8;
    else if (up.includes('SEP')) month = 9;
    else if (up.includes('NOV')) month = 11;
    else if (up.includes('DES') || up.includes('DEC')) month = 12;
    else if (up.includes('JUL')) month = 7;
    else if (up.includes('JUN')) month = 6;
    else if (up.includes('MEI') || up.includes('MAY')) month = 5;
    else if (up.includes('APR')) month = 4;
    else if (up.includes('MAR')) month = 3;
    else if (up.includes('FEB')) month = 2;
    else if (up.includes('JAN')) month = 1;
  }

  const yMatch = up.match(/\b(202[4-9]|203[0-9])\b/);
  const year = yMatch ? parseInt(yMatch[1], 10) : 2026;

  return month !== -1 ? { month, year } : null;
}

// Extract normalized YYYY-MM-DD or unique day key from any date string variations
export function normalizeDateKey(dateStr: string, contextMonth: number = 10, contextYear: number = 2026): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();

  // Excel serial number (e.g. 45000 to 50000)
  const serialMatch = trimmed.match(/^\d{5}$/);
  if (serialMatch) {
    const serial = parseInt(serialMatch[0], 10);
    if (serial >= 40000 && serial <= 60000) {
      const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  }

  const lower = trimmed.toLowerCase();

  // Regex 1: Word month e.g. "KAMIS/ 1 Oktober 2026", "1 Okt 2026", "01 OKTOBER"
  const wordMatch = lower.match(/(\d{1,2})[\s\/\.\,\-]+([a-zA-Z]{3,12})[\s\/\.\,\-]?(\d{2,4})?/);
  if (wordMatch) {
    const day = parseInt(wordMatch[1], 10);
    const mStr = wordMatch[2].toLowerCase();
    let month = contextMonth;
    if (mStr.startsWith('jan')) month = 1;
    else if (mStr.startsWith('feb')) month = 2;
    else if (mStr.startsWith('mar')) month = 3;
    else if (mStr.startsWith('apr')) month = 4;
    else if (mStr.startsWith('mei') || mStr.startsWith('may')) month = 5;
    else if (mStr.startsWith('jun')) month = 6;
    else if (mStr.startsWith('jul')) month = 7;
    else if (mStr.startsWith('agu') || mStr.startsWith('ags') || mStr.startsWith('aug') || mStr.startsWith('asg')) month = 8;
    else if (mStr.startsWith('sep')) month = 9;
    else if (mStr.startsWith('okt') || mStr.startsWith('oct')) month = 10;
    else if (mStr.startsWith('nov')) month = 11;
    else if (mStr.startsWith('des') || mStr.startsWith('dec')) month = 12;

    let year = contextYear;
    if (wordMatch[3]) {
      const y = parseInt(wordMatch[3], 10);
      year = y < 100 ? 2000 + y : y;
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Regex 2: Numbers only e.g. "01/10/2026", "1-10-2026", "2026-10-01"
  const numMatch = lower.match(/(\d{1,4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,4})/);
  if (numMatch) {
    const p1 = parseInt(numMatch[1], 10);
    const p2 = parseInt(numMatch[2], 10);
    const p3 = parseInt(numMatch[3], 10);
    if (p1 > 1000) {
      return `${p1}-${String(p2).padStart(2, '0')}-${String(p3).padStart(2, '0')}`;
    } else {
      let day = p1;
      let month = p2;
      let year = p3 < 100 ? 2000 + p3 : p3;
      if (p1 > 12 && p2 <= 12) {
        day = p1;
        month = p2;
      } else if (p2 > 12 && p1 <= 12) {
        day = p2;
        month = p1;
      }
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Regex 3: Single day number e.g. "1", "01", "2"
  const dayOnly = lower.match(/\b([1-9]|[12]\d|3[01])\b/);
  if (dayOnly) {
    const day = parseInt(dayOnly[1], 10);
    return `${contextYear}-${String(contextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return lower.replace(/[^a-z0-9]/g, '');
}

// Standard display format for a date string: HARI/ Day Bulan Tahun (e.g. KAMIS/ 1 Oktober 2026)
export function formatStandardDateStr(dateStr: string, contextMonth: number = 10, contextYear: number = 2026): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  const dateKey = normalizeDateKey(trimmed, contextMonth, contextYear);
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const dObj = new Date(year, month, day);
    const dayName = ID_DAYS_UPPER[dObj.getDay()];
    const monthName = ID_MONTHS_TITLE[month] || 'Oktober';
    return `${dayName}/ ${day} ${monthName} ${year}`;
  }
  return trimmed;
}

export function getNextDayDateStr(dateStr: string, contextMonth: number = 10, contextYear: number = 2026): string {
  const dateKey = normalizeDateKey(dateStr || '', contextMonth, contextYear);
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const nextD = new Date(year, month, day + 1);
    const dayName = ID_DAYS_UPPER[nextD.getDay()];
    const monthName = ID_MONTHS_TITLE[nextD.getMonth()];
    return `${dayName}/ ${nextD.getDate()} ${monthName} ${nextD.getFullYear()}`;
  }
  const now = new Date(2026, 9, 2);
  return `${ID_DAYS_UPPER[now.getDay()]}/ ${now.getDate()} ${ID_MONTHS_TITLE[now.getMonth()]} ${now.getFullYear()}`;
}

// Get numerical start time in minutes for sorting shifts within the same day
export function getHourSortValue(hours: string, location: string): number {
  if (!hours || (location && location.toUpperCase().includes('LIBUR')) || hours.trim() === '-') {
    return 999999;
  }
  const match = hours.match(/(\d{1,2})[\.:](\d{2})/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    return h * 60 + m;
  }
  return 888888;
}

// Sort roster strictly chronologically: 1. Hari & Tanggal -> 2. Jam Hadir -> 3. Lokasi -> 4. Urutan Shift (orderIndex) -> 5. Nama
export function sortRosterChronologically(list: SecurityRosterItem[]): SecurityRosterItem[] {
  return [...list].sort((a, b) => {
    // 1. Urutkan berdasarkan Hari & Tanggal (secara kronologis)
    const keyA = normalizeDateKey(a.dateStr || '');
    const keyB = normalizeDateKey(b.dateStr || '');
    if (keyA !== keyB) {
      return keyA.localeCompare(keyB);
    }

    // 2. Urutkan berdasarkan Jam Hadir (Pagi -> Sore -> Malam -> Libur)
    const hourA = getHourSortValue(a.hours || '', a.location || '');
    const hourB = getHourSortValue(b.hours || '', b.location || '');
    if (hourA !== hourB) {
      return hourA - hourB;
    }

    // 3. Urutkan berdasarkan Lokasi: KANWIL DJPB -> RUMAH DINAS -> LIBUR
    const locRank = (loc: string) => {
      const up = (loc || '').toUpperCase();
      if (up.includes('KANWIL')) return 1;
      if (up.includes('RUMAH')) return 2;
      if (up.includes('LIBUR')) return 3;
      return 4;
    };
    const rankA = locRank(a.location || '');
    const rankB = locRank(b.location || '');
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    // 4. Urutkan berdasarkan urutan rotasi resmi / orderIndex (Pagi 1 -> Pagi 2, Malam 1 -> Malam 2)
    const orderA = typeof a.orderIndex === 'number' ? a.orderIndex : 0;
    const orderB = typeof b.orderIndex === 'number' ? b.orderIndex : 0;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // 5. Urutkan berdasarkan Nama Petugas (A-Z)
    return (a.name || '').localeCompare(b.name || '');
  }).map((item, idx) => ({
    ...item,
    orderIndex: idx
  }));
}

// Normalize guard names to canonical official satpam name
export function normalizeGuardName(name: string): string {
  if (!name) return '';
  let clean = name.trim().toUpperCase().replace(/\s+/g, ' ');
  // Remove parenthesis notes
  clean = clean.replace(/\([^)]*\)/g, '').trim();

  if (clean === 'DIAN' || clean === 'DIAN ARIF' || clean === 'DIAN A' || clean === 'DIANARI') return 'DIAN ARI';
  if (clean === 'RATMAN' || clean === 'M. RATMANSYAH' || clean === 'M.RATMANSYAH') return 'RATMANSYAH';
  if (clean === 'M. ARIEF' || clean === 'M.ARIEF' || clean === 'ARIF' || clean === 'M ARIEF') return 'ARIEF';
  if (clean === 'ADIT' || clean === 'ADITYA P' || clean === 'ADITIYA') return 'ADITYA';
  if (clean === 'ROBI' || clean === 'ROBBI') return 'ROBBY';
  if (clean === 'ERWIN S' || clean === 'M. ERWIN') return 'ERWIN';
  return clean;
}

export const OFFICIAL_SECURITY_GUARDS = ['ARIEF', 'ROBBY', 'ADITYA', 'ERWIN', 'RATMANSYAH', 'DIAN ARI'];

// Helper to determine whether a given hours string and location represents morning shift (starts with 06.00)
export function isMorningShift(hours: string, location: string): boolean {
  if (!hours || (location && location.toUpperCase().includes('LIBUR')) || hours.trim() === '-') return false;
  const trimmed = hours.trim();
  return /^0?6[\.:]/.test(trimmed) || /06[\.:]00\s*[\/\-]\s*18/i.test(trimmed) || /pagi/i.test(trimmed);
}

// Normalize raw hours text to official standard
export function normalizeHours(rawHours: string, location: string): string {
  if (!rawHours || (location && location.toUpperCase().includes('LIBUR')) || rawHours.trim() === '-') {
    return location === 'LIBUR' ? '-' : '06.00/18.00';
  }
  const trimmed = rawHours.trim();
  if (/^0?6[\.:]/.test(trimmed) || /06[\.:]00\s*[\/\-]\s*18/i.test(trimmed) || /pagi/i.test(trimmed)) {
    return '06.00/18.00';
  }
  if (/^18[\.:]/.test(trimmed) || /18[\.:]00\s*[\/\-]\s*0?6/i.test(trimmed) || /malam/i.test(trimmed) || /sore/i.test(trimmed)) {
    return '18.00/06.00';
  }
  return trimmed;
}

// Official 6-day rotation patterns for security guard shifts in Kanwil DJPb Riau:
// Position 1 & 2: KANWIL DJPB (06.00/18.00) -> 2 Petugas Shift Pagi
// Position 3 & 4: KANWIL DJPB (18.00/06.00) -> 2 Petugas Shift Malam
// Position 5: RUMAH DINAS (18.00/06.00) -> 1 Petugas Rumah Dinas
// Position 6: LIBUR (-) -> 1 Petugas Libur
export const OCTOBER_DAILY_ROTATION: { [idx: number]: {
  morning: [string, string];
  night: [string, string];
  rumdin: string;
  libur: string;
}} = {
  0: { morning: ['ARIEF', 'ROBBY'], night: ['ADITYA', 'ERWIN'], rumdin: 'RATMANSYAH', libur: 'DIAN ARI' },
  1: { morning: ['ROBBY', 'DIAN ARI'], night: ['ERWIN', 'RATMANSYAH'], rumdin: 'ARIEF', libur: 'ADITYA' },
  2: { morning: ['DIAN ARI', 'ADITYA'], night: ['RATMANSYAH', 'ARIEF'], rumdin: 'ROBBY', libur: 'ERWIN' },
  3: { morning: ['ADITYA', 'ERWIN'], night: ['ARIEF', 'ROBBY'], rumdin: 'DIAN ARI', libur: 'RATMANSYAH' },
  4: { morning: ['ERWIN', 'RATMANSYAH'], night: ['ROBBY', 'DIAN ARI'], rumdin: 'ADITYA', libur: 'ARIEF' },
  5: { morning: ['RATMANSYAH', 'ARIEF'], night: ['DIAN ARI', 'ADITYA'], rumdin: 'ERWIN', libur: 'ROBBY' },
};

// Enforces that for ALL days in October 2026 (terutama mulai Jumat/ 2 Oktober s.d. Sabtu/ 31 Oktober 2026),
// pola Jam Hadir / Shift dan Lokasi Penjagaan SAMA PERSIS dengan Kamis/ 1 Oktober 2026:
// 1. KANWIL DJPB: 06.00/18.00 (2 petugas)
// 2. KANWIL DJPB: 18.00/06.00 (2 petugas)
// 3. RUMAH DINAS: 18.00/06.00 (1 petugas)
// 4. LIBUR: - (1 petugas)
export function alignOctoberRosterToPattern(list: SecurityRosterItem[]): SecurityRosterItem[] {
  if (!list || list.length === 0) return [];

  // Step 1: Split any multi-guard names (e.g. "ROBBY / DIAN ARI")
  const expandedList: SecurityRosterItem[] = [];
  for (const item of list) {
    if (!item) continue;
    const rawName = (item.name || '').trim();
    if (rawName.includes('/') || rawName.includes('\n') || rawName.includes('&') || / dan /i.test(rawName) || (rawName.includes(',') && !rawName.includes('SH') && !rawName.includes('SE'))) {
      const splitNames = rawName.split(/[\/\n\r,&]| dan | DAN /).map(n => n.trim().replace(/^\d+[\.\-\)]\s*/, '')).filter(Boolean);
      if (splitNames.length > 1) {
        splitNames.forEach((n, subIdx) => {
          expandedList.push({
            ...item,
            id: `${item.id}-split-${subIdx}`,
            name: normalizeGuardName(n)
          });
        });
        continue;
      }
    }
    expandedList.push({
      ...item,
      name: normalizeGuardName(item.name || '')
    });
  }

  // Deduplicate before alignment
  const deduplicated = deduplicateRoster(expandedList);
  
  // Check if October is active
  const hasOctober = deduplicated.some(it => {
    const dKey = normalizeDateKey(it.dateStr || '');
    return dKey.startsWith('2026-10') || (it.dateStr || '').toLowerCase().includes('oktober');
  });

  if (!hasOctober) return deduplicated;

  // Separate non-October items (exclude any stray August)
  const nonOctoberItems = deduplicated.filter(it => {
    const dKey = normalizeDateKey(it.dateStr || '');
    const isOct = dKey.startsWith('2026-10') || (it.dateStr || '').toLowerCase().includes('oktober');
    const isAug = dKey.startsWith('2026-08') || (it.dateStr || '').toLowerCase().includes('agustus');
    return !isOct && !isAug;
  });

  const alignedOctoberItems: SecurityRosterItem[] = [];

  for (let day = 1; day <= 31; day++) {
    const dObj = new Date(2026, 9, day);
    const dayName = ID_DAYS_UPPER[dObj.getDay()];
    const standardDateStr = `${dayName}/ ${day} Oktober 2026`;
    const rotIdx = (day - 1) % 6;
    const rot = OCTOBER_DAILY_ROTATION[rotIdx];

    // Find items for this specific day using robust normalized date matching
    const dayKey = `2026-10-${String(day).padStart(2, '0')}`;
    const dayItems = deduplicated.filter(it => {
      const dKey = normalizeDateKey(it.dateStr || '', 10, 2026);
      if (dKey === dayKey) return true;
      const parts = (it.dateStr || '').split('/ ');
      const rawDate = parts[1] || it.dateStr || '';
      const dMatch = rawDate.match(/^(\d{1,2})\s+Oktober/i);
      return Boolean(dMatch && parseInt(dMatch[1], 10) === day);
    });

    // Helper map of current guards present on this day
    const dayGuardsMap = new Map<string, SecurityRosterItem>();
    dayItems.forEach(it => {
      dayGuardsMap.set(normalizeGuardName(it.name), it);
    });

    // 6 required slots for each day according to the pattern of Kamis/ 1 Oktober 2026:
    // Slot 1 & 2: KANWIL DJPB, 06.00/18.00
    // Slot 3 & 4: KANWIL DJPB, 18.00/06.00
    // Slot 5: RUMAH DINAS, 18.00/06.00
    // Slot 6: LIBUR, -
    const slots = [
      { name: rot.morning[0], location: 'KANWIL DJPB', hours: '06.00/18.00' },
      { name: rot.morning[1], location: 'KANWIL DJPB', hours: '06.00/18.00' },
      { name: rot.night[0],   location: 'KANWIL DJPB', hours: '18.00/06.00' },
      { name: rot.night[1],   location: 'KANWIL DJPB', hours: '18.00/06.00' },
      { name: rot.rumdin,     location: 'RUMAH DINAS', hours: '18.00/06.00' },
      { name: rot.libur,      location: 'LIBUR',       hours: '-' },
    ];

    slots.forEach((slot, slotIdx) => {
      const existing = dayGuardsMap.get(slot.name);
      alignedOctoberItems.push({
        id: existing?.id || `ros-oct-${day}-${slotIdx + 1}`,
        orderIndex: (day - 1) * 6 + slotIdx,
        name: slot.name,
        dateStr: standardDateStr,
        location: slot.location,
        hours: slot.hours
      });
    });
  }

  return [...alignedOctoberItems, ...nonOctoberItems];
}

// Keep ensureTwoGuardsForMorningShift as alias to alignOctoberRosterToPattern for backwards compatibility
export function ensureTwoGuardsForMorningShift(list: SecurityRosterItem[]): SecurityRosterItem[] {
  return alignOctoberRosterToPattern(list);
}

// Deduplicate roster entries: ensures no guard is duplicated on the same date regardless of string formatting
export function deduplicateRoster(roster: SecurityRosterItem[], contextMonth?: number, contextYear?: number): SecurityRosterItem[] {
  if (!roster || roster.length === 0) return [];
  
  // Detect dominant month & year dynamically from the roster if not provided
  let effMonth = contextMonth;
  let effYear = contextYear;
  if (!effMonth || !effYear) {
    for (const it of roster) {
      const info = extractMonthAndYearFromText(it?.dateStr || '');
      if (info) {
        if (!effMonth) effMonth = info.month;
        if (!effYear) effYear = info.year;
        break;
      }
    }
  }
  effMonth = effMonth || 10;
  effYear = effYear || 2026;

  const seenKeys = new Set<string>();
  const cleanList: SecurityRosterItem[] = [];

  for (const rawItem of roster) {
    if (!rawItem) continue;
    const rawName = (rawItem.name || '').trim();
    const rawDate = (rawItem.dateStr || '').trim();
    if (!rawName || !rawDate) continue;

    // Check if name cell contains multiple officers (e.g. "ROBBY / DIAN ARI")
    const subNames = (rawName.includes('/') || rawName.includes('\n') || rawName.includes('&') || / dan /i.test(rawName) || (rawName.includes(',') && !rawName.includes('SH') && !rawName.includes('SE')))
      ? rawName.split(/[\/\n\r,&]| dan | DAN /).map(n => n.trim().replace(/^\d+[\.\-\)]\s*/, '')).filter(Boolean)
      : [rawName];

    for (const subName of subNames) {
      const normName = normalizeGuardName(subName);
      const dateKey = normalizeDateKey(rawDate, effMonth, effYear);
      if (!normName || !dateKey) continue;

      const normLoc = (rawItem.location || 'KANWIL DJPB').trim().toUpperCase();
      const normHours = normalizeHours(rawItem.hours || '', normLoc);
      // Normalization key: dateKey + normName + normLoc + normHours
      const key = `${dateKey}___${normName}___${normLoc}___${normHours}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const stdDateStr = formatStandardDateStr(rawDate, effMonth, effYear);
        cleanList.push({
          ...rawItem,
          id: rawItem.id || `ros-${dateKey}-${normName}-${cleanList.length}`,
          name: normName,
          dateStr: stdDateStr,
          location: normLoc,
          hours: normHours
        });
      }
    }
  }

  return cleanList.map((item, idx) => ({
    ...item,
    orderIndex: typeof item.orderIndex === 'number' ? item.orderIndex : idx
  }));
}

interface SecurityGuardSectionProps {
  securityShifts: SecurityShift[];
  setSecurityShifts?: React.Dispatch<React.SetStateAction<SecurityShift[]>>;
  securityRoster?: SecurityRosterItem[];
  setSecurityRoster?: React.Dispatch<React.SetStateAction<SecurityRosterItem[]>>;
  isAdmin: boolean;
}

export default function SecurityGuardSection({
  securityShifts,
  setSecurityShifts,
  securityRoster = [],
  setSecurityRoster,
  isAdmin
}: SecurityGuardSectionProps) {
  // View mode: 'roster' (Individual Guard Table) or 'matrix' (3-Shift View)
  const [viewMode, setViewMode] = useState<'roster' | 'matrix'>('roster');

  // Document Title & Dynamic Headers State (persisted to localStorage)
  const [docTitle, setDocTitle] = useState<string>(() => {
    return localStorage.getItem('melayu_security_doc_title') || 'JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN OKTOBER 2026';
  });

  const [dynamicHeaders, setDynamicHeaders] = useState<string[]>(() => {
    const saved = localStorage.getItem('melayu_security_doc_headers');
    return saved ? JSON.parse(saved) : ['NO.', 'NAMA PETUGAS', 'HARI / TANGGAL', 'LOKASI / POS', 'JAM HADIR'];
  });

  // Sync security configuration (docTitle, headers) across all PCs
  useEffect(() => {
    const unsubConfig = subscribeFirestoreCollection<{ id: string; docTitle?: string; dynamicHeaders?: string[] }>(
      'security_config',
      [{ id: 'main', docTitle: 'JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN OKTOBER 2026', dynamicHeaders: ['NO.', 'NAMA PETUGAS', 'HARI / TANGGAL', 'LOKASI / POS', 'JAM HADIR'] }],
      (configs) => {
        const mainConfig = configs.find(c => c.id === 'main');
        if (mainConfig) {
          if (mainConfig.docTitle) {
            setDocTitle(mainConfig.docTitle);
            safeLocalStorageSet('melayu_security_doc_title', mainConfig.docTitle);
          }
          if (Array.isArray(mainConfig.dynamicHeaders) && mainConfig.dynamicHeaders.length > 0) {
            setDynamicHeaders(mainConfig.dynamicHeaders);
            safeLocalStorageSet('melayu_security_doc_headers', JSON.stringify(mainConfig.dynamicHeaders));
          }
        }
      }
    );
    return () => unsubConfig();
  }, []);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');

  // File Upload & Preview States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewType, setPreviewType] = useState<'roster' | 'matrix'>('roster');
  const [previewRosterData, setPreviewRosterData] = useState<SecurityRosterItem[]>([]);
  const [previewMatrixData, setPreviewMatrixData] = useState<SecurityShift[]>([]);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>('JADWAL SECURITY');
  const [previewDocHeaders, setPreviewDocHeaders] = useState<string[]>(['NO.', 'NAMA PETUGAS', 'HARI / TANGGAL', 'LOKASI / POS', 'JAM HADIR']);
  const [excelFileName, setExcelFileName] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Roster Add / Edit Modal
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [editingRosterId, setEditingRosterId] = useState<string | null>(null);
  const [rosterForm, setRosterForm] = useState<Omit<SecurityRosterItem, 'id'>>({
    name: 'ARIEF',
    dateStr: 'KAMIS/ 1 Oktober 2026',
    location: 'KANWIL DJPB',
    hours: '06.00/18.00'
  });

  // Matrix Shift Add / Edit Modal
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShiftIndex, setEditingShiftIndex] = useState<number | null>(null);
  const [shiftForm, setShiftForm] = useState<SecurityShift>({
    day: 'Senin',
    shiftMorning: '',
    shiftEvening: '',
    shiftNight: ''
  });

  // Count duplicate items in current raw securityRoster
  const duplicateCount = useMemo(() => {
    const list = securityRoster || [];
    const seen = new Set<string>();
    let dupes = 0;
    for (const item of list) {
      if (!item) continue;
      const rawName = (item.name || '').trim();
      const rawDate = (item.dateStr || '').trim();
      if (!rawName || !rawDate) continue;
      const normName = normalizeGuardName(rawName);
      const dateKey = normalizeDateKey(rawDate);
      if (!normName || !dateKey) continue;
      const key = `${dateKey}___${normName}`;
      if (seen.has(key)) {
        dupes++;
      } else {
        seen.add(key);
      }
    }
    return dupes;
  }, [securityRoster]);

  // Handler to manually sync/repair shift pattern starting from 2 to 31 October to match 1 October (Optional Manual Tool)
  const handleAlignOctoberShifts = () => {
    if (!setSecurityRoster) return;
    const deduplicated = deduplicateRoster(securityRoster || []);
    const aligned = alignOctoberRosterToPattern(deduplicated);
    const sorted = sortRosterChronologically(aligned);
    setSecurityRoster(sorted);
    safeLocalStorageSet('melayu_security_roster', JSON.stringify(sorted));
    saveFirestoreCollection('security_roster', sorted);
    setSuccessNotice(
      `BERHASIL DISINKRONKAN! Pola Jam Hadir / Shift mulai Jumat/ 2 Oktober s.d. Sabtu/ 31 Oktober 2026 telah diperbaiki dan diseragamkan sama persis dengan Kamis/ 1 Oktober 2026 (2 petugas Pagi 06.00/18.00 di KANWIL DJPB, 2 petugas Malam 18.00/06.00 di KANWIL DJPB, 1 petugas Malam 18.00/06.00 di RUMAH DINAS, dan 1 petugas LIBUR).`
    );
    setTimeout(() => setSuccessNotice(''), 7000);
  };
  const handleFixTwoMorningGuards = handleAlignOctoberShifts;

  // Clean and deduplicate roster handler
  const handleCleanDuplicates = () => {
    if (!setSecurityRoster) return;
    const originalCount = (securityRoster || []).length;
    const cleaned = deduplicateRoster(securityRoster || []);
    const sorted = sortRosterChronologically(cleaned);
    const removed = originalCount - cleaned.length;
    setSecurityRoster(sorted);
    safeLocalStorageSet('melayu_security_roster', JSON.stringify(sorted));
    saveFirestoreCollection('security_roster', sorted);
    setSelectedIds([]);
    if (removed > 0) {
      setSuccessNotice(`BERHASIL DIBERSIHKAN! Sebanyak ${removed} data duplikasi nama petugas telah dibersihkan.`);
    } else {
      setSuccessNotice(`Data roster pengawasan penjagaan keamanan sudah bersih dan rapi.`);
    }
    setTimeout(() => setSuccessNotice(''), 6000);
  };

  // Filtered Roster Data (Sorted strictly chronologically by Hari, Tanggal, Jam, dan Urutan Shift)
  const safeRoster = useMemo(() => {
    const list = securityRoster || [];
    const deduplicated = deduplicateRoster(list);
    
    // Check if there is October data
    const hasOctoberData = deduplicated.some(item => {
      const dKey = normalizeDateKey(item.dateStr || '');
      return dKey.startsWith('2026-10') || (item.dateStr || '').toLowerCase().includes('oktober');
    });

    // If October data is active, filter out rogue August entries (e.g. leftover 1 Agustus 2026)
    const filteredList = hasOctoberData
      ? deduplicated.filter(item => {
          const dKey = normalizeDateKey(item.dateStr || '');
          const isAugust = dKey.startsWith('2026-08') || (item.dateStr || '').toLowerCase().includes('agustus');
          return !isAugust;
        })
      : deduplicated;

    // Strict chronological sort: Hari & Tanggal -> Jam Hadir -> Lokasi -> Urutan Shift (orderIndex) -> Nama
    return sortRosterChronologically(filteredList);
  }, [securityRoster]);

  const filteredRoster = safeRoster.filter(item => {
    if (!item) return false;
    const name = item.name || '';
    const dateStr = item.dateStr || '';
    const location = item.location || '';
    const matchName = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      dateStr.toLowerCase().includes(searchQuery.toLowerCase());
    const matchLoc = selectedLocation === 'ALL' || location.toUpperCase() === selectedLocation.toUpperCase();
    const matchDate = selectedDate === 'ALL' || dateStr.toUpperCase().includes(selectedDate.toUpperCase());
    return matchName && matchLoc && matchDate;
  });

  // Calculate rowSpans for contiguous identical dateStr rows in filteredRoster
  const rowSpanMap = useMemo(() => {
    const map: { [index: number]: number } = {};
    if (!filteredRoster || filteredRoster.length === 0) return map;

    let i = 0;
    while (i < filteredRoster.length) {
      const currentDate = filteredRoster[i]?.dateStr?.trim();
      let count = 1;
      let j = i + 1;
      while (j < filteredRoster.length && (filteredRoster[j]?.dateStr?.trim() === currentDate)) {
        count++;
        j++;
      }
      map[i] = count;
      i = j;
    }
    return map;
  }, [filteredRoster]);

  // Calculate rowSpans for preview modal
  const previewRowSpanMap = useMemo(() => {
    const map: { [index: number]: number } = {};
    if (!previewRosterData || previewRosterData.length === 0) return map;

    let i = 0;
    while (i < previewRosterData.length) {
      const currentDate = previewRosterData[i]?.dateStr?.trim();
      let count = 1;
      let j = i + 1;
      while (j < previewRosterData.length && (previewRosterData[j]?.dateStr?.trim() === currentDate)) {
        count++;
        j++;
      }
      map[i] = count;
      i = j;
    }
    return map;
  }, [previewRosterData]);

  // Unique list of dates for filter
  const uniqueDates = Array.from(new Set(safeRoster.map(r => r?.dateStr || '').filter(Boolean)));
  const uniqueNames = Array.from(new Set(safeRoster.map(r => r?.name || '').filter(Boolean)));

  // Total Guards Calculation
  const totalGuards = uniqueNames.length || 6;

  // Handle Excel File Upload with Intelligent Column Detection & Chronological Ordering
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const wb = XLSX.read(buffer, { type: 'array' });
        
        // Pick best sheet: prioritize sheet with keyword matching
        let bestSheetName = wb.SheetNames[0];
        let bestSheetRows: any[][] = [];
        const prioritized = wb.SheetNames.filter(s => 
          /oktober|okt|jadwal|pengawasan|security|satpam|kanwil|riau/i.test(s)
        );
        const searchList = prioritized.length > 0 ? [...prioritized, ...wb.SheetNames] : wb.SheetNames;
        const checkedSheets = new Set<string>();

        for (const sName of searchList) {
          if (checkedSheets.has(sName)) continue;
          checkedSheets.add(sName);
          const wsCheck = wb.Sheets[sName];
          const rowsCheck = XLSX.utils.sheet_to_json<any[]>(wsCheck, { header: 1, defval: '', raw: false });
          if (rowsCheck && rowsCheck.length > bestSheetRows.length) {
            bestSheetRows = rowsCheck;
            bestSheetName = sName;
          }
        }

        const sheetName = bestSheetName;
        const rawRows = bestSheetRows;
        if (!rawRows || rawRows.length < 1) {
          alert('File Excel kosong atau tidak berisi data.');
          return;
        }

        // 1. Detect target Month & Year from file name, sheet name, and initial rows
        let detectedMonth = 10; // Default to October (Bulan 10)
        let detectedYear = 2026;

        const fileMonthInfo = extractMonthAndYearFromText(file.name) || extractMonthAndYearFromText(sheetName);
        if (fileMonthInfo) {
          detectedMonth = fileMonthInfo.month;
          detectedYear = fileMonthInfo.year;
        }

        let detectedTitle = `JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN ${ID_MONTHS_TITLE[detectedMonth - 1].toUpperCase()} ${detectedYear}`;
        let headerRowIdx = -1;
        let bestScore = 0;

        // Scan first 15 rows to detect Title, Month & Header Row
        for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
          const rowArr = rawRows[r] || [];
          const rowStr = rowArr.map(c => String(c || '').trim()).join(' ').toUpperCase();

          const rowMonthInfo = extractMonthAndYearFromText(rowStr);
          if (rowMonthInfo) {
            detectedMonth = rowMonthInfo.month;
            detectedYear = rowMonthInfo.year;
          }

          // Title detection
          if ((rowStr.includes('JADWAL') || rowStr.includes('PENGAWASAN') || rowStr.includes('PENJAGAAN') || rowStr.includes('SATPAM') || rowStr.includes('KEAMANAN')) && !rowStr.includes('LOKASI') && !rowStr.includes('HADIR')) {
            const nonNullCells = rowArr.map(c => String(c || '').trim()).filter(Boolean);
            if (nonNullCells.length > 0) {
              detectedTitle = nonNullCells.join(' ');
            }
          }

          // Header scoring
          let score = 0;
          rowArr.forEach(c => {
            const val = String(c || '').trim().toUpperCase();
            if (val.includes('NAMA') || val.includes('PETUGAS') || val.includes('PERSONIL') || val.includes('SATPAM') || val.includes('SECURITY')) score += 4;
            if (val.includes('HARI') || val.includes('TANGGAL') || val.includes('TGL') || val.includes('DATE')) score += 4;
            if (val.includes('LOKASI') || val.includes('POS') || val.includes('PENEMPATAN') || val.includes('TEMPAT')) score += 3;
            if (val.includes('JAM') || val.includes('WAKTU') || val.includes('PUKUL') || val.includes('SHIFT')) score += 3;
            if (val.includes('PAGI') || val.includes('MALAM') || val.includes('RUMAH') || val.includes('LIBUR')) score += 3;
            if (val === 'NO' || val === 'NO.' || val === 'NOMOR') score += 1;
          });

          if (score > bestScore) {
            bestScore = score;
            headerRowIdx = r;
          }
        }

        if (headerRowIdx === -1 || bestScore < 2) {
          headerRowIdx = 0;
        }

        // Multi-level header merge (combine parent row categories with child row labels)
        const rawHeaderRow = (rawRows[headerRowIdx] || []).map(c => String(c || '').trim());
        const prevRow = headerRowIdx > 0 ? (rawRows[headerRowIdx - 1] || []).map(c => String(c || '').trim()) : [];
        let lastPrev = '';
        const filledPrev = prevRow.map(c => {
          if (c) { lastPrev = c; return c; }
          return lastPrev;
        });
        const headerRow = rawHeaderRow.map((h, idx) => {
          const p = filledPrev[idx] || '';
          return (p && !h.toUpperCase().includes(p.toUpperCase())) ? `${p} ${h}`.trim() : h;
        });

        // ----------------- FORMAT DETECTION -----------------
        // Format A: Shift Columns Matrix (Pagi, Malam, Rumah Dinas, Libur)
        const morningCols: number[] = [];
        const eveningCols: number[] = [];
        const nightCols: number[] = [];
        const rumdinCols: number[] = [];
        const liburCols: number[] = [];
        let colMatrixDay = -1;

        headerRow.forEach((h, colIdx) => {
          const hUp = h.toUpperCase();
          if (colMatrixDay === -1 && (hUp.includes('HARI') || hUp.includes('TANGGAL') || hUp.includes('TGL') || hUp.includes('DAY') || hUp.includes('DATE'))) {
            colMatrixDay = colIdx;
          } else if (hUp.includes('RUMAH') || hUp.includes('RUMDIN') || hUp.includes('JABATAN')) {
            rumdinCols.push(colIdx);
          } else if (hUp.includes('LIBUR') || hUp.includes('OFF') || hUp.includes('LEPAS') || hUp === 'L') {
            liburCols.push(colIdx);
          } else if (hUp.includes('PAGI') || hUp.includes('06.00') || hUp.includes('06:00') || hUp.includes('SHIFT 1') || hUp.includes('SHIFT I') || hUp.includes('06-18')) {
            morningCols.push(colIdx);
          } else if (hUp.includes('SORE') || hUp.includes('SIANG') || hUp.includes('14.00') || hUp.includes('14:00') || hUp.includes('SHIFT 2') || hUp.includes('SHIFT II')) {
            eveningCols.push(colIdx);
          } else if (hUp.includes('MALAM') || hUp.includes('18.00') || hUp.includes('18:00') || hUp.includes('SHIFT 3') || hUp.includes('SHIFT III') || hUp.includes('18-06')) {
            nightCols.push(colIdx);
          }
        });

        // Format B: Guard Names as Column Headers (e.g. ARIEF, ROBBY, ADITYA, ERWIN, RATMANSYAH, DIAN ARI)
        const guardCols: { colIdx: number; name: string }[] = [];
        rawHeaderRow.forEach((h, colIdx) => {
          const cleanedName = normalizeGuardName(h);
          if (cleanedName && (OFFICIAL_SECURITY_GUARDS.includes(cleanedName) || cleanedName.length >= 3 && !/HARI|TANGGAL|DATE|NO|LOKASI|JAM|SHIFT/i.test(cleanedName))) {
            guardCols.push({ colIdx, name: cleanedName });
          }
        });

        // Format C: Calendar grid (Dates 1..31 across column headers)
        const dayCols: { colIdx: number; day: number }[] = [];
        rawHeaderRow.forEach((h, colIdx) => {
          const num = parseInt(h.trim(), 10);
          if (!isNaN(num) && num >= 1 && num <= 31 && String(num) === h.trim()) {
            dayCols.push({ colIdx, day: num });
          }
        });

        const isShiftMatrixFormat = (morningCols.length > 0 || nightCols.length > 0 || rumdinCols.length > 0) && (colMatrixDay !== -1 || headerRow.length >= 3);
        const isGuardColsFormat = guardCols.length >= 3;
        const isCalendarGridFormat = dayCols.length >= 7;

        const parsedRoster: SecurityRosterItem[] = [];
        const parsedShifts: SecurityShift[] = [];
        let rowOrder = 0;

        if (isCalendarGridFormat) {
          // FORMAT C: Guards in rows, Days 1..31 in columns
          let colGuardName = 0;
          for (let c = 0; c < rawHeaderRow.length; c++) {
            if (rawHeaderRow[c].toUpperCase().includes('NAMA') || rawHeaderRow[c].toUpperCase().includes('PETUGAS')) {
              colGuardName = c;
              break;
            }
          }

          const dailyGroups = new Map<number, { morning: string[]; evening: string[]; night: string[]; rumdin: string[]; libur: string[] }>();
          for (let d = 1; d <= 31; d++) {
            dailyGroups.set(d, { morning: [], evening: [], night: [], rumdin: [], libur: [] });
          }

          for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;
            const guardNameRaw = String(row[colGuardName] || '').trim();
            if (!guardNameRaw || /TOTAL|MENGETAHUI|CATATAN/i.test(guardNameRaw)) continue;
            const guardName = normalizeGuardName(guardNameRaw);

            dayCols.forEach(({ colIdx, day }) => {
              const dutyVal = String(row[colIdx] || '').trim().toUpperCase();
              if (!dutyVal || dutyVal === '0') return;

              let loc = 'KANWIL DJPB';
              let hrs = '06.00/18.00';
              if (dutyVal.includes('LIBUR') || dutyVal.includes('OFF') || dutyVal === 'L' || dutyVal === '-') {
                loc = 'LIBUR';
                hrs = '-';
                dailyGroups.get(day)?.libur.push(guardName);
              } else if (dutyVal.includes('RUMAH') || dutyVal.includes('RUMDIN') || dutyVal === 'RD') {
                loc = 'RUMAH DINAS';
                hrs = '18.00/06.00';
                dailyGroups.get(day)?.rumdin.push(guardName);
              } else if (dutyVal.includes('MALAM') || dutyVal.includes('18.') || dutyVal === 'M' || dutyVal.includes('SHIFT 3')) {
                loc = 'KANWIL DJPB';
                hrs = '18.00/06.00';
                dailyGroups.get(day)?.night.push(guardName);
              } else if (dutyVal.includes('SORE') || dutyVal.includes('14.') || dutyVal === 'S') {
                loc = 'KANWIL DJPB';
                hrs = '14.00/22.00';
                dailyGroups.get(day)?.evening.push(guardName);
              } else {
                loc = 'KANWIL DJPB';
                hrs = '06.00/18.00';
                dailyGroups.get(day)?.morning.push(guardName);
              }

              const dObj = new Date(detectedYear, detectedMonth - 1, day);
              const dayStr = `${ID_DAYS_UPPER[dObj.getDay()]}/ ${day} ${ID_MONTHS_TITLE[detectedMonth - 1]} ${detectedYear}`;

              parsedRoster.push({
                id: `ros-cal-${day}-${guardName}-${rowOrder++}`,
                orderIndex: rowOrder,
                name: guardName,
                dateStr: dayStr,
                location: loc,
                hours: hrs
              });
            });
          }

          dailyGroups.forEach((grp, day) => {
            const dObj = new Date(detectedYear, detectedMonth - 1, day);
            const dayStr = `${ID_DAYS_UPPER[dObj.getDay()]}/ ${day} ${ID_MONTHS_TITLE[detectedMonth - 1]} ${detectedYear}`;
            parsedShifts.push({
              day: dayStr,
              shiftMorning: grp.morning.join(' / ') || '-',
              shiftEvening: grp.evening.join(' / ') || '-',
              shiftNight: [...grp.night, ...grp.rumdin].join(' / ') || '-'
            });
          });

        } else if (isGuardColsFormat) {
          // FORMAT B: Dates in rows, Guards across columns
          let colDate = colMatrixDay !== -1 ? colMatrixDay : 0;
          let lastActiveDate = '';

          for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;

            let dateRaw = row[colDate] !== undefined ? String(row[colDate]).trim() : '';
            if (!dateRaw && lastActiveDate) {
              dateRaw = lastActiveDate;
            } else if (dateRaw) {
              lastActiveDate = dateRaw;
            }

            if (!dateRaw || /TOTAL|MENGETAHUI|CATATAN/i.test(dateRaw)) continue;
            const formattedDate = formatStandardDateStr(dateRaw, detectedMonth, detectedYear) || dateRaw;

            const morningNames: string[] = [];
            const eveningNames: string[] = [];
            const nightNames: string[] = [];
            const rumdinNames: string[] = [];
            const liburNames: string[] = [];

            guardCols.forEach(({ colIdx, name }) => {
              const cellVal = String(row[colIdx] || '').trim().toUpperCase();
              if (!cellVal || cellVal === '-' || cellVal === '0') return;

              let loc = 'KANWIL DJPB';
              let hrs = '06.00/18.00';
              if (cellVal.includes('LIBUR') || cellVal.includes('OFF') || cellVal === 'L') {
                loc = 'LIBUR';
                hrs = '-';
                liburNames.push(name);
              } else if (cellVal.includes('RUMAH') || cellVal.includes('RUMDIN') || cellVal === 'RD') {
                loc = 'RUMAH DINAS';
                hrs = '18.00/06.00';
                rumdinNames.push(name);
              } else if (cellVal.includes('MALAM') || cellVal.includes('18.') || cellVal === 'M' || cellVal.includes('SHIFT 3')) {
                loc = 'KANWIL DJPB';
                hrs = '18.00/06.00';
                nightNames.push(name);
              } else if (cellVal.includes('SORE') || cellVal.includes('14.') || cellVal === 'S') {
                loc = 'KANWIL DJPB';
                hrs = '14.00/22.00';
                eveningNames.push(name);
              } else {
                loc = 'KANWIL DJPB';
                hrs = '06.00/18.00';
                morningNames.push(name);
              }

              parsedRoster.push({
                id: `ros-gc-${rowOrder}-${Date.now()}`,
                orderIndex: rowOrder++,
                name: name,
                dateStr: formattedDate,
                location: loc,
                hours: hrs
              });
            });

            parsedShifts.push({
              day: formattedDate,
              shiftMorning: morningNames.join(' / ') || '-',
              shiftEvening: eveningNames.join(' / ') || '-',
              shiftNight: [...nightNames, ...rumdinNames].join(' / ') || '-'
            });
          }

        } else if (isShiftMatrixFormat) {
          // FORMAT A: Shift Columns Matrix (Pagi, Malam, Rumdin, Libur)
          let lastActiveDate = '';
          if (colMatrixDay === -1) {
            colMatrixDay = (headerRow[0] && !headerRow[0].toUpperCase().includes('SHIFT')) ? 0 : 1;
          }

          for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;

            let dateRaw = row[colMatrixDay] !== undefined ? String(row[colMatrixDay]).trim() : '';
            if (!dateRaw && lastActiveDate) {
              dateRaw = lastActiveDate;
            } else if (dateRaw) {
              lastActiveDate = dateRaw;
            }

            if (!dateRaw || /^(HARI|TANGGAL|TOTAL|MENGETAHUI|CATATAN)/i.test(dateRaw)) {
              continue;
            }

            const formattedDate = formatStandardDateStr(dateRaw, detectedMonth, detectedYear) || dateRaw;

            const extractNamesFromCols = (cols: number[]) => {
              const res: string[] = [];
              cols.forEach(cIdx => {
                if (cIdx === -1 || row[cIdx] === undefined) return;
                const raw = String(row[cIdx]).trim();
                if (!raw || raw === '-' || raw === '0' || raw.toUpperCase() === 'LIBUR' || raw.toUpperCase() === 'OFF') return;
                const split = raw
                  .replace(/^\d+[\.\-\)]\s*/, '')
                  .split(/[\/\n\r,&]| dan | DAN /)
                  .map(n => n.trim().replace(/^\d+[\.\-\)]\s*/, ''))
                  .filter(n => n.length > 1 && !/^(SHIFT|POS|PAGI|MALAM|SORE|LIBUR|OFF|-)$/i.test(n));
                res.push(...split);
              });
              return res;
            };

            const morningNames = extractNamesFromCols(morningCols);
            const eveningNames = extractNamesFromCols(eveningCols);
            const nightNames = extractNamesFromCols(nightCols);
            const rumdinNames = extractNamesFromCols(rumdinCols);
            const liburNames = extractNamesFromCols(liburCols);

            morningNames.forEach(n => {
              parsedRoster.push({
                id: `ros-mat-${rowOrder}-${Date.now()}`,
                orderIndex: rowOrder++,
                name: normalizeGuardName(n),
                dateStr: formattedDate,
                location: 'KANWIL DJPB',
                hours: '06.00/18.00'
              });
            });

            eveningNames.forEach(n => {
              parsedRoster.push({
                id: `ros-mat-${rowOrder}-${Date.now()}`,
                orderIndex: rowOrder++,
                name: normalizeGuardName(n),
                dateStr: formattedDate,
                location: 'KANWIL DJPB',
                hours: '14.00/22.00'
              });
            });

            nightNames.forEach(n => {
              parsedRoster.push({
                id: `ros-mat-${rowOrder}-${Date.now()}`,
                orderIndex: rowOrder++,
                name: normalizeGuardName(n),
                dateStr: formattedDate,
                location: 'KANWIL DJPB',
                hours: '18.00/06.00'
              });
            });

            rumdinNames.forEach(n => {
              parsedRoster.push({
                id: `ros-mat-${rowOrder}-${Date.now()}`,
                orderIndex: rowOrder++,
                name: normalizeGuardName(n),
                dateStr: formattedDate,
                location: 'RUMAH DINAS',
                hours: '18.00/06.00'
              });
            });

            liburNames.forEach(n => {
              parsedRoster.push({
                id: `ros-mat-${rowOrder}-${Date.now()}`,
                orderIndex: rowOrder++,
                name: normalizeGuardName(n),
                dateStr: formattedDate,
                location: 'LIBUR',
                hours: '-'
              });
            });

            parsedShifts.push({
              day: formattedDate,
              shiftMorning: morningNames.map(normalizeGuardName).join(' / ') || '-',
              shiftEvening: eveningNames.map(normalizeGuardName).join(' / ') || '-',
              shiftNight: [...nightNames, ...rumdinNames].map(normalizeGuardName).join(' / ') || '-'
            });
          }

        } else {
          // FORMAT D: Standard Tabular Rows (NO, NAMA PETUGAS, HARI/TANGGAL, LOKASI/POS, JAM HADIR)
          let colNo = -1;
          let colName = -1;
          let colDay = -1;
          let colDate = -1;
          let colLoc = -1;
          let colHours = -1;

          headerRow.forEach((h, colIdx) => {
            const hUp = h.toUpperCase();
            if (colNo === -1 && (hUp === 'NO' || hUp === 'NO.' || hUp === 'NOMOR' || hUp.startsWith('NO '))) {
              colNo = colIdx;
            } else if (colName === -1 && (hUp.includes('NAMA') || hUp.includes('PETUGAS') || hUp.includes('PERSONIL') || hUp.includes('SATPAM') || hUp.includes('SECURITY') || hUp.includes('ANGGOTA'))) {
              colName = colIdx;
            } else if (hUp.includes('HARI') && (hUp.includes('TANGGAL') || hUp.includes('TGL') || hUp.includes('DATE'))) {
              if (colDate === -1) colDate = colIdx;
            } else if (hUp.includes('TANGGAL') || hUp.includes('TGL') || hUp.includes('DATE') || hUp.includes('WAKTU/TGL')) {
              if (colDate === -1) colDate = colIdx;
            } else if (hUp.includes('HARI') || hUp.includes('DAY')) {
              if (colDay === -1) colDay = colIdx;
            } else if (colLoc === -1 && (hUp.includes('LOKASI') || hUp.includes('POS') || hUp.includes('PENEMPATAN') || hUp.includes('TEMPAT') || hUp.includes('STATUS'))) {
              colLoc = colIdx;
            } else if (colHours === -1 && (hUp.includes('JAM') || hUp.includes('PUKUL') || hUp.includes('WAKTU') || hUp.includes('SHIFT') || hUp.includes('HOURS'))) {
              colHours = colIdx;
            }
          });

          // Fallback heuristic if headers are not standard
          if (colName === -1 || colDate === -1 || colLoc === -1) {
            const sampleRows = rawRows.slice(headerRowIdx + 1, headerRowIdx + 10).filter(r => r && r.length > 0);
            const numCols = Math.max(...sampleRows.map(r => r.length), 4);
            
            for (let c = 0; c < numCols; c++) {
              if (c === colNo || c === colName || c === colDate || c === colDay || c === colLoc || c === colHours) continue;
              const values = sampleRows.map(r => String(r[c] || '').trim()).filter(Boolean);
              
              const hasDateIndicators = values.some(v => {
                const up = v.toUpperCase();
                return /SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU|MINGGU|JAN|FEB|MAR|APR|MEI|JUN|JUL|AGU|SEP|OKT|NOV|DES|\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}/.test(up);
              });
              if (colDate === -1 && hasDateIndicators) {
                colDate = c;
                continue;
              }

              const hasLocIndicators = values.some(v => {
                const up = v.toUpperCase();
                return up.includes('KANWIL') || up.includes('RUMAH') || up.includes('LIBUR') || up.includes('POS') || up.includes('OFF') || up.includes('DINAS');
              });
              if (colLoc === -1 && hasLocIndicators) {
                colLoc = c;
                continue;
              }

              const hasHoursIndicators = values.some(v => {
                return /\d{1,2}[\.:]\d{2}/.test(v) || v === '-';
              });
              if (colHours === -1 && hasHoursIndicators) {
                colHours = c;
                continue;
              }
            }

            if (colName === -1) {
              for (let c = 0; c < numCols; c++) {
                if (c !== colNo && c !== colDate && c !== colDay && c !== colLoc && c !== colHours) {
                  colName = c;
                  break;
                }
              }
            }
          }

          if (colDate === -1 && colDay !== -1) colDate = colDay;
          if (colName === -1) colName = colNo === 0 ? 1 : 0;
          if (colDate === -1) colDate = colName === 0 ? 1 : (colName === 1 && colNo === 0 ? 2 : 1);
          if (colLoc === -1) colLoc = 2;
          if (colHours === -1) colHours = 3;

          let lastActiveDate = '';
          let lastActiveDay = '';

          for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;

            let nameRaw = row[colName] !== undefined ? String(row[colName]).trim() : '';
            let dateRaw = row[colDate] !== undefined ? String(row[colDate]).trim() : '';
            let dayRaw = colDay !== -1 && colDay !== colDate && row[colDay] !== undefined ? String(row[colDay]).trim() : '';
            let locRaw = row[colLoc] !== undefined ? String(row[colLoc]).trim() : '';
            let hoursRaw = row[colHours] !== undefined ? String(row[colHours]).trim() : '';

            nameRaw = nameRaw.replace(/^\d+[\.\-\)]\s*/, '').trim();

            const upName = nameRaw.toUpperCase();
            if (!nameRaw || upName === 'NAMA' || upName === 'NAMA PETUGAS' || /^(JADWAL|TOTAL|MENGETAHUI|CATATAN|BAGIAN)/i.test(upName)) {
              continue;
            }

            if (dateRaw) {
              lastActiveDate = dateRaw;
            } else if (lastActiveDate) {
              dateRaw = lastActiveDate;
            }

            if (dayRaw) {
              lastActiveDay = dayRaw;
            } else if (lastActiveDay) {
              dayRaw = lastActiveDay;
            }

            let rawDateCombined = dateRaw;
            if (dayRaw && !rawDateCombined.toUpperCase().includes(dayRaw.toUpperCase())) {
              rawDateCombined = `${dayRaw}/ ${rawDateCombined}`;
            }

            let formattedDate = formatStandardDateStr(rawDateCombined || dateRaw || dayRaw, detectedMonth, detectedYear);
            if (!formattedDate) {
              const dObj = new Date(detectedYear, detectedMonth - 1, 1);
              formattedDate = `${ID_DAYS_UPPER[dObj.getDay()]}/ 1 ${ID_MONTHS_TITLE[detectedMonth - 1]} ${detectedYear}`;
            }

            let location = locRaw.toUpperCase();
            if (location.includes('LIBUR') || location.includes('OFF') || location.includes('LEPAS') || location === 'L') {
              location = 'LIBUR';
            } else if (location.includes('RUMAH') || location.includes('RUMDIN') || location.includes('JABATAN')) {
              location = 'RUMAH DINAS';
            } else if (location.includes('KANWIL') || location.includes('DJPB') || location.includes('GEDUNG')) {
              location = 'KANWIL DJPB';
            } else if (!location) {
              location = 'KANWIL DJPB';
            }

            if (!hoursRaw) {
              hoursRaw = location === 'LIBUR' ? '-' : '06.00/18.00';
            } else {
              hoursRaw = normalizeHours(hoursRaw, location);
            }

            const names = (nameRaw.includes('/') || nameRaw.includes('\n') || nameRaw.includes('&') || / dan /i.test(nameRaw) || (nameRaw.includes(',') && !nameRaw.includes('SH') && !nameRaw.includes('SE')))
              ? nameRaw.split(/[\/\n\r,&]| dan | DAN /).map(n => n.trim().replace(/^\d+[\.\-\)]\s*/, '')).filter(Boolean)
              : [nameRaw];

            for (const n of names) {
              parsedRoster.push({
                id: `ros-up-${rowOrder}-${Date.now()}`,
                orderIndex: rowOrder++,
                name: normalizeGuardName(n),
                dateStr: formattedDate,
                location: location,
                hours: hoursRaw
              });
            }
          }

          // Synthesize shifts for matrix view
          const dateGroupMap = new Map<string, { morning: string[]; evening: string[]; night: string[] }>();
          for (const item of parsedRoster) {
            const d = item.dateStr || '';
            if (!dateGroupMap.has(d)) {
              dateGroupMap.set(d, { morning: [], evening: [], night: [] });
            }
            const grp = dateGroupMap.get(d)!;
            if (item.location === 'LIBUR') {
              // libur
            } else if (item.hours.includes('06.00/18.00') || item.hours.includes('06') || item.hours.includes('pagi')) {
              grp.morning.push(item.name);
            } else if (item.hours.includes('14.00') || item.hours.includes('sore')) {
              grp.evening.push(item.name);
            } else {
              grp.night.push(item.name);
            }
          }

          dateGroupMap.forEach((grp, day) => {
            parsedShifts.push({
              day,
              shiftMorning: grp.morning.join(' / ') || '-',
              shiftEvening: grp.evening.join(' / ') || '-',
              shiftNight: grp.night.join(' / ') || '-'
            });
          });
        }

        // Cleanse and sort strictly chronologically
        const deduplicated = deduplicateRoster(parsedRoster, detectedMonth, detectedYear);
        const cleanParsedRoster = sortRosterChronologically(deduplicated);

        setPreviewType('roster');
        setPreviewRosterData(cleanParsedRoster);
        setPreviewMatrixData(parsedShifts);
        setPreviewDocTitle(detectedTitle);
        setPreviewDocHeaders(['NO.', 'NAMA PETUGAS', 'HARI / TANGGAL', 'LOKASI / POS', 'JAM HADIR']);
        setExcelFileName(file.name);
        setShowPreviewModal(true);
      } catch (err) {
        console.error('Error reading Excel:', err);
        alert('Gagal membaca file Excel. Pastikan file berformat .xlsx, .xls, atau .csv');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Apply Excel Data & Overwrite Previous Excel Completely with Strict Chronological Ordering
  const handleApplyExcel = () => {
    // Gunakan persis data yang diunggah dari Excel tanpa merubah atau menimpa pola petugas
    const sortedData = sortRosterChronologically(previewRosterData);

    // Tandai bahwa jadwal telah diunggah resmi oleh administrator
    safeLocalStorageSet('melayu_security_roster_custom_uploaded', 'true');
    safeLocalStorageSet('melayu_security_roster_updated_at', String(Date.now()));

    if (setSecurityRoster) {
      setSecurityRoster(sortedData);
      safeLocalStorageSet('melayu_security_roster', JSON.stringify(sortedData));
      saveFirestoreCollection('security_roster', sortedData);
    }

    if (setSecurityShifts && previewMatrixData && previewMatrixData.length > 0) {
      setSecurityShifts(previewMatrixData);
      safeLocalStorageSet('melayu_security_shifts', JSON.stringify(previewMatrixData));
      saveFirestoreCollection('security_shifts', previewMatrixData);
    }

    setDocTitle(previewDocTitle);
    setDynamicHeaders(previewDocHeaders);

    // Save title, headers and data to localStorage
    safeLocalStorageSet('melayu_security_doc_title', previewDocTitle);
    safeLocalStorageSet('melayu_security_doc_headers', JSON.stringify(previewDocHeaders));

    // Save to Firestore for permanent persistence across all PCs
    saveFirestoreDoc('security_config', {
      id: 'main',
      docTitle: previewDocTitle,
      dynamicHeaders: previewDocHeaders,
      updatedAt: new Date().toISOString()
    });

    // Reset filter
    setSearchQuery('');
    setSelectedLocation('ALL');
    setSelectedDate('ALL');

    setSuccessNotice(
      `BERHASIL MEMUAT DATA EXCEL! Menampilkan ${sortedData.length} baris pengawasan penjagaan keamanan dari file "${excelFileName}" sesuai dengan isi dokumen Excel yang diupload.`
    );
    setShowPreviewModal(false);
    setTimeout(() => setSuccessNotice(''), 7000);
  };

  // Download Templates
  const handleDownloadRosterTemplate = () => {
    const templateRows = (securityRoster.length > 0 ? securityRoster : INITIAL_SECURITY_ROSTER).map((r, idx) => ({
      'NO': idx + 1,
      'NAMA PETUGAS': r.name,
      'HARI / TANGGAL': r.dateStr,
      'LOKASI / POS': r.location,
      'JAM HADIR': r.hours
    }));

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Roster Security');
    XLSX.writeFile(wb, 'Template_Jadwal_Security.xlsx');
  };

  // Export Current
  const handleExportRoster = () => {
    const rows = securityRoster.map((r, idx) => ({
      'NO': idx + 1,
      'NAMA PETUGAS': r.name,
      'HARI / TANGGAL': r.dateStr,
      'LOKASI / POS': r.location,
      'JAM HADIR': r.hours
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Roster Security');
    XLSX.writeFile(wb, `${docTitle.replace(/\s+/g, '_')}.xlsx`);
  };

  // Selection & Delete Modal state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Bulk / Clear Delete Handlers
  const handleClearAllRoster = () => {
    const total = securityRoster.length;
    if (total === 0) return;
    if (setSecurityRoster) {
      setSecurityRoster([]);
      setSelectedIds([]);
      safeLocalStorageSet('melayu_security_roster', JSON.stringify([]));
      saveFirestoreCollection('security_roster', []);
      setSuccessNotice(`Berhasil menghapus SELURUH ${total} data Pengawasan Penjagaan Keamanan.`);
      setTimeout(() => setSuccessNotice(''), 6000);
    }
    setShowDeleteModal(false);
  };

  const handleDeleteFilteredRoster = () => {
    const count = filteredRoster.length;
    if (count === 0) return;
    if (setSecurityRoster) {
      const filteredIds = new Set(filteredRoster.map(r => r.id));
      const updated = (securityRoster || []).filter(r => !filteredIds.has(r.id));
      setSecurityRoster(updated);
      setSelectedIds([]);
      safeLocalStorageSet('melayu_security_roster', JSON.stringify(updated));
      saveFirestoreCollection('security_roster', updated);
      setSuccessNotice(`Berhasil menghapus ${count} entri pengawasan terfilter.`);
      setTimeout(() => setSuccessNotice(''), 6000);
    }
    setShowDeleteModal(false);
  };

  const handleDeleteSelectedRoster = () => {
    const count = selectedIds.length;
    if (count === 0) return;
    if (setSecurityRoster) {
      const selectedSet = new Set(selectedIds);
      const updated = (securityRoster || []).filter(r => !selectedSet.has(r.id));
      setSecurityRoster(updated);
      setSelectedIds([]);
      safeLocalStorageSet('melayu_security_roster', JSON.stringify(updated));
      saveFirestoreCollection('security_roster', updated);
      setSuccessNotice(`Berhasil menghapus ${count} entri pengawasan yang dipilih.`);
      setTimeout(() => setSuccessNotice(''), 6000);
    }
    setShowDeleteModal(false);
  };

  const handleDeleteByLocation = (targetLoc: string) => {
    if (setSecurityRoster) {
      const updated = (securityRoster || []).filter(r => r.location !== targetLoc);
      setSecurityRoster(updated);
      setSelectedIds([]);
      safeLocalStorageSet('melayu_security_roster', JSON.stringify(updated));
      saveFirestoreCollection('security_roster', updated);
      setSuccessNotice(`Berhasil menghapus data pengawasan lokasi ${targetLoc}.`);
      setTimeout(() => setSuccessNotice(''), 6000);
    }
    setShowDeleteModal(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRoster.length && filteredRoster.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRoster.map(r => r.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSaveRoster = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setSecurityRoster) return;

    const trimmedName = (rosterForm.name || '').trim().toUpperCase();
    const trimmedDate = (rosterForm.dateStr || '').trim();
    const trimmedLoc = (rosterForm.location || 'KANWIL DJPB').trim();
    const trimmedHours = (rosterForm.hours || (trimmedLoc === 'LIBUR' ? '-' : '06.00/18.00')).trim();

    let updated: SecurityRosterItem[] = [];
    if (editingRosterId) {
      updated = securityRoster.map(r => r.id === editingRosterId ? { 
        ...r, 
        name: trimmedName, 
        dateStr: trimmedDate, 
        location: trimmedLoc, 
        hours: trimmedHours 
      } : r);
    } else {
      // Check if this guard is already assigned on the same date to prevent duplication
      const existingIdx = securityRoster.findIndex(
        r => r.name.trim().toUpperCase() === trimmedName && r.dateStr.trim().toLowerCase() === trimmedDate.toLowerCase()
      );

      if (existingIdx !== -1) {
        // Update existing entry instead of creating a duplicate
        updated = securityRoster.map((r, idx) => idx === existingIdx ? {
          ...r,
          name: trimmedName,
          dateStr: trimmedDate,
          location: trimmedLoc,
          hours: trimmedHours
        } : r);
        setSuccessNotice(`Jadwal petugas ${trimmedName} pada ${trimmedDate} diperbarui (duplikasi dicegah).`);
      } else {
        const newItem: SecurityRosterItem = {
          id: `ros-${Date.now()}`,
          orderIndex: securityRoster.length,
          name: trimmedName,
          dateStr: trimmedDate,
          location: trimmedLoc,
          hours: trimmedHours
        };
        updated = [...securityRoster, newItem];
      }
    }

    const cleanUpdated = deduplicateRoster(updated);
    setSecurityRoster(cleanUpdated);
    safeLocalStorageSet('melayu_security_roster', JSON.stringify(cleanUpdated));
    saveFirestoreCollection('security_roster', cleanUpdated);
    setShowRosterModal(false);
    setTimeout(() => setSuccessNotice(''), 5000);
  };

  // Delete Roster Item
  const handleDeleteRoster = (id: string) => {
    if (!setSecurityRoster) return;
    const updated = (securityRoster || []).filter(r => r.id !== id);
    setSecurityRoster(updated);
    setSelectedIds(prev => prev.filter(i => i !== id));
    safeLocalStorageSet('melayu_security_roster', JSON.stringify(updated));
    saveFirestoreCollection('security_roster', updated);
    setSuccessNotice('Berhasil menghapus 1 entri pengawasan.');
    setTimeout(() => setSuccessNotice(''), 4000);
  };

  // Reset Default
  const handleReset = () => {
    if (setSecurityRoster) {
      setSecurityRoster(INITIAL_SECURITY_ROSTER);
      safeLocalStorageSet('melayu_security_roster', JSON.stringify(INITIAL_SECURITY_ROSTER));
      saveFirestoreCollection('security_roster', INITIAL_SECURITY_ROSTER);
    }
    if (setSecurityShifts) {
      setSecurityShifts(INITIAL_SECURITY_SHIFTS);
      safeLocalStorageSet('melayu_security_shifts', JSON.stringify(INITIAL_SECURITY_SHIFTS));
      saveFirestoreCollection('security_shifts', INITIAL_SECURITY_SHIFTS);
    }
    setDocTitle('JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN OKTOBER 2026');
    setDynamicHeaders(['NO.', 'NAMA PETUGAS', 'HARI / TANGGAL', 'LOKASI / POS', 'JAM HADIR']);
    localStorage.removeItem('melayu_security_doc_title');
    localStorage.removeItem('melayu_security_doc_headers');
    localStorage.removeItem('melayu_security_roster_custom_uploaded');
    localStorage.removeItem('melayu_security_roster_updated_at');
    setSelectedIds([]);
    setSuccessNotice('Jadwal berhasil dikembalikan ke pengaturan default.');
    setTimeout(() => setSuccessNotice(''), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".xlsx, .xls, .csv" 
        onChange={handleFileUpload} 
      />

      {/* Header Title & Information */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-djpb-blue p-5 rounded-2xl text-white shadow-md">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30">
              <Shield className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-display font-bold tracking-wide">
              Pengawasan Penjagaan Keamanan Kanwil DJPb Riau
            </h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            Sistem pengawasan piket satpam pada KANWIL DJPB, RUMAH DINAS, serta pemantauan personil libur/piket.
          </p>
        </div>
      </div>

      {/* KPI Total Personil Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL PERSONIL</span>
            <Users className="w-4 h-4 text-djpb-blue" />
          </div>
          <div className="text-xl font-display font-extrabold text-slate-800">{totalGuards} Personil</div>
          <p className="text-[11px] text-slate-500">Anggota Satpam Aktif</p>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successNotice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-800 flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <FileCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successNotice}</span>
          </div>
          <button onClick={() => setSuccessNotice('')} className="text-emerald-500 hover:text-emerald-800 p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        {/* Controls Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-djpb-blue" />
            <div>
              <h3 className="font-display font-extrabold text-slate-800 text-sm md:text-base tracking-wide uppercase flex items-center space-x-2">
                <span>{docTitle}</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                  Dokumen Excel Aktif
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Menampilkan {filteredRoster.length} entri roster penjagaan (Dapat ditimpa via Upload Excel)
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportRoster}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-200"
              title="Download Excel Roster"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export Excel</span>
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={handleAlignOctoberShifts}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                  title="Perbaiki Jam Hadir / Shift Mulai Jumat/ 2 Oktober s.d. Sabtu/ 31 Oktober 2026 agar polanya sama dengan Kamis/ 1 Oktober 2026 (2 Petugas Pagi 06.00/18.00, 2 Petugas Malam 18.00/06.00, 1 Petugas Rumdin, 1 Petugas Libur)"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Sinkron Pola Shift (1-31 Okt)</span>
                </button>

                <button
                  onClick={handleCleanDuplicates}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                  title="Bersihkan Duplikasi Nama Petugas Pada Jadwal"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Bersihkan Duplikasi</span>
                  {duplicateCount > 0 && (
                    <span className="bg-amber-400 text-slate-900 text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                      {duplicateCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                  title="Menu Hapus Pengawasan Penjagaan Keamanan Kanwil DJPb Riau"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Menu Hapus</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                  title="Upload File Excel Jadwal Security Terbaru (Akan Menimpa Data Lama)"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Excel Baru</span>
                </button>

                <button
                  onClick={handleDownloadRosterTemplate}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-djpb-blue font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer border border-blue-200"
                  title="Download Format Template Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Template Excel</span>
                </button>

                <button
                  onClick={() => {
                    setEditingRosterId(null);
                    let defaultDate = 'KAMIS/ 1 Oktober 2026';
                    if (safeRoster.length > 0) {
                      const last = safeRoster[safeRoster.length - 1];
                      if (last.location === 'LIBUR') {
                        defaultDate = getNextDayDateStr(last.dateStr);
                      } else {
                        defaultDate = last.dateStr || defaultDate;
                      }
                    }
                    setRosterForm({ name: 'ARIEF', dateStr: defaultDate, location: 'KANWIL DJPB', hours: '06.00/18.00' });
                    setShowRosterModal(true);
                  }}
                  className="px-3 py-1.5 bg-djpb-blue hover:bg-djpb-blue-light text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* View Mode Switcher and Filters */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div className="flex items-center space-x-1.5 bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('roster')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'roster'
                  ? 'bg-white text-djpb-blue shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Tabel Roster Detail ({filteredRoster.length})</span>
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'matrix'
                  ? 'bg-white text-djpb-blue shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Matriks Shift Harian ({securityShifts.length})</span>
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-2 flex-1 justify-end">
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama petugas / tanggal..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-djpb-blue outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {viewMode === 'roster' && (
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  <option value="ALL">Semua Lokasi</option>
                  <option value="KANWIL DJPB">KANWIL DJPB</option>
                  <option value="RUMAH DINAS">RUMAH DINAS</option>
                  <option value="LIBUR">LIBUR (OFF)</option>
                </select>

                <select
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                >
                  <option value="ALL">Semua Tanggal</option>
                  {uniqueDates.map((d, idx) => (
                    <option key={idx} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            {(searchQuery || selectedLocation !== 'ALL' || selectedDate !== 'ALL') && (
              <button
                onClick={() => { setSearchQuery(''); setSelectedLocation('ALL'); setSelectedDate('ALL'); }}
                className="text-[11px] text-djpb-blue font-bold hover:underline px-2 cursor-pointer whitespace-nowrap"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Bar (When rows selected in Roster Mode) */}
        {viewMode === 'roster' && selectedIds.length > 0 && (
          <div className="bg-rose-50 border border-rose-300 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in duration-150 shadow-xs">
            <div className="flex items-center space-x-2 text-rose-900 font-bold">
              <Check className="w-4 h-4 text-rose-600" />
              <span>{selectedIds.length} entri pengawasan dipilih (centang aktif)</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDeleteSelectedRoster}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus {selectedIds.length} Terpilih</span>
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
              >
                Batal Pilih
              </button>
            </div>
          </div>
        )}

        {/* ---------------- MAIN DATA TABLE ---------------- */}
        {viewMode === 'matrix' ? (
          /* MATRIX 3-SHIFT VIEW */
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-800 font-extrabold uppercase font-display tracking-wider">
                  <th className="py-3 px-3 w-12 text-center border-r border-slate-200">No.</th>
                  <th className="py-3 px-4 border-r border-slate-200 text-center">Hari / Tanggal</th>
                  <th className="py-3 px-4 border-r border-slate-200 bg-blue-50/60 text-blue-900">Shift Pagi (06.00/18.00)</th>
                  <th className="py-3 px-4 border-r border-slate-200 bg-amber-50/60 text-amber-900">Shift Sore (14.00/22.00)</th>
                  <th className="py-3 px-4 border-r border-slate-200 bg-indigo-50/60 text-indigo-900">Shift Malam & Rumdin (18.00/06.00)</th>
                  {isAdmin && <th className="py-3 px-4 text-right w-20">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 font-mono">
                {securityShifts
                  .filter(s => !searchQuery || (s.day && s.day.toLowerCase().includes(searchQuery.toLowerCase())) || (s.shiftMorning && s.shiftMorning.toLowerCase().includes(searchQuery.toLowerCase())) || (s.shiftNight && s.shiftNight.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map((shift, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-slate-500 font-mono border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-sans font-extrabold text-djpb-blue text-center">
                        {shift.day}
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-sans font-bold text-slate-900">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-xs border border-blue-200 inline-block">
                          {shift.shiftMorning || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-sans font-bold text-slate-900">
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-xs border border-amber-200 inline-block">
                          {shift.shiftEvening || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 border-r border-slate-200 font-sans font-bold text-slate-900">
                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 text-xs border border-indigo-200 inline-block">
                          {shift.shiftNight || '-'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right font-sans">
                          <button
                            onClick={() => {
                              setEditingShiftIndex(idx);
                              setShiftForm(shift);
                              setShowShiftModal(true);
                            }}
                            className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                            title="Edit Shift"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                {securityShifts.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-slate-400 text-xs">
                      Belum ada jadwal matriks shift harian. Silakan upload file Excel jadwal security.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* INDIVIDUAL ROSTER TABLE */
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-800 font-extrabold uppercase font-display tracking-wider">
                  {isAdmin && (
                    <th className="py-3 px-3 w-10 text-center border-r border-slate-200">
                      <input
                        type="checkbox"
                        className="rounded text-djpb-blue focus:ring-djpb-blue cursor-pointer"
                        checked={selectedIds.length === filteredRoster.length && filteredRoster.length > 0}
                        onChange={toggleSelectAll}
                        title="Pilih / Centang Semua Baris"
                      />
                    </th>
                  )}
                  <th className="py-3 px-3 w-12 text-center border-r border-slate-200">No.</th>
                  <th className="py-3 px-4 border-r border-slate-200">Nama Petugas</th>
                  <th className="py-3 px-4 border-r border-slate-200 text-center">Hari / Tanggal</th>
                  <th className="py-3 px-4 border-r border-slate-200">Lokasi / Pos Penjagaan</th>
                  <th className="py-3 px-4 border-r border-slate-200">Jam Hadir / Shift</th>
                  {isAdmin && <th className="py-3 px-4 text-right w-24">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 font-mono">
                {filteredRoster.map((item, idx) => {
                  const isLibur = item.location === 'LIBUR';
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr key={item.id} className={`transition-colors ${isSelected ? 'bg-amber-50/80' : 'hover:bg-slate-50'}`}>
                      {isAdmin && (
                        <td className="py-3 px-3 text-center border-r border-slate-200">
                          <input
                            type="checkbox"
                            className="rounded text-djpb-blue focus:ring-djpb-blue cursor-pointer"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(item.id)}
                          />
                        </td>
                      )}
                      {/* NO CELL */}
                      <td className="py-3 px-3 text-center font-bold text-slate-500 font-mono border-r border-slate-200">
                        {idx + 1}
                      </td>

                      {/* NAMA CELL */}
                      <td className="py-3 px-4 border-r border-slate-200 font-sans font-extrabold text-slate-900">
                        {item.name}
                      </td>

                      {/* HARI / TANGGAL CELL */}
                      {rowSpanMap[idx] !== undefined ? (
                        <td 
                          rowSpan={rowSpanMap[idx]} 
                          className="py-3 px-4 border-r border-slate-200 font-sans font-extrabold text-slate-800 bg-slate-50/70 text-center align-middle border-b-2 border-b-slate-200"
                        >
                          <div className="font-display font-extrabold text-djpb-blue tracking-wide py-1 text-xs">
                            {item.dateStr}
                          </div>
                        </td>
                      ) : null}

                      {/* LOKASI CELL */}
                      <td className="py-3 px-4 border-r border-slate-200 font-sans font-bold">
                        {item.location === 'KANWIL DJPB' && (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-blue-100 text-blue-900 border border-blue-200 text-[11px]">
                            <Shield className="w-3 h-3 text-blue-600" />
                            <span>KANWIL DJPB</span>
                          </span>
                        )}
                        {item.location === 'RUMAH DINAS' && (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-teal-100 text-teal-900 border border-teal-200 text-[11px]">
                            <Home className="w-3 h-3 text-teal-600" />
                            <span>RUMAH DINAS</span>
                          </span>
                        )}
                        {isLibur && (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            <span>LIBUR</span>
                          </span>
                        )}
                        {!['KANWIL DJPB', 'RUMAH DINAS', 'LIBUR'].includes(item.location) && (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-200 text-[11px] font-bold">
                            <span>{item.location}</span>
                          </span>
                        )}
                      </td>

                      {/* JAM HADIR CELL */}
                      <td className="py-3 px-4 border-r border-slate-200 font-mono font-bold text-slate-800">
                        {item.hours}
                      </td>

                      {/* ADMIN ACTIONS */}
                      {isAdmin && (
                        <td className="py-3 px-4 text-right font-sans">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => {
                                setEditingRosterId(item.id);
                                setRosterForm({
                                  name: item.name,
                                  dateStr: item.dateStr,
                                  location: item.location,
                                  hours: item.hours
                                });
                                setShowRosterModal(true);
                              }}
                              className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                              title="Edit Roster"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRoster(item.id)}
                              className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Roster"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {filteredRoster.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 5} className="py-8 text-center text-slate-400 text-xs">
                      Tidak ada entri roster yang sesuai dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- MODALS ---------------- */}

      {/* Excel Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-800 text-sm md:text-base">
                    Konfirmasi Import Excel Security
                  </h3>
                  <p className="text-xs text-slate-500">File: <span className="font-mono font-bold text-slate-700">{excelFileName}</span></p>
                </div>
              </div>

              <button onClick={() => setShowPreviewModal(false)} className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-xl cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start space-x-2.5 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block text-amber-900">Perhatian: Pengunggahan ini akan MENIMPA data lama!</span>
                <span className="text-amber-800">
                  Seluruh data jadwal Excel sebelumnya akan digantikan secara penuh dengan dokumen baru: <strong className="underline">{previewDocTitle}</strong> ({previewRosterData.length} baris data).
                </span>
              </div>
            </div>

            <div className="overflow-y-auto max-h-60 border border-slate-200 rounded-xl">
              {previewType === 'roster' ? (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 font-extrabold uppercase sticky top-0 text-slate-800 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center border-r border-slate-200">No.</th>
                      <th className="py-2.5 px-3 border-r border-slate-200">Nama Petugas</th>
                      <th className="py-2.5 px-3 border-r border-slate-200 text-center">Hari / Tanggal</th>
                      <th className="py-2.5 px-3 border-r border-slate-200">Lokasi / Pos</th>
                      <th className="py-2.5 px-3">Jam Hadir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-xs">
                    {previewRosterData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-center font-bold text-slate-500 border-r border-slate-200">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-800 border-r border-slate-200">{row.name}</td>
                        {previewRowSpanMap[idx] !== undefined ? (
                          <td rowSpan={previewRowSpanMap[idx]} className="py-2 px-3 border-r border-slate-200 text-center align-middle font-bold bg-slate-50/70 text-slate-800">
                            {row.dateStr}
                          </td>
                        ) : null}
                        <td className="py-2 px-3 border-r border-slate-200 font-sans">{row.location}</td>
                        <td className="py-2 px-3">{row.hours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 font-bold uppercase sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Hari</th>
                      <th className="py-2.5 px-3">Shift Pagi</th>
                      <th className="py-2.5 px-3">Shift Sore</th>
                      <th className="py-2.5 px-3">Shift Malam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {previewMatrixData.map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3">{row.day}</td>
                        <td className="py-2 px-3">{row.shiftMorning}</td>
                        <td className="py-2 px-3">{row.shiftEvening}</td>
                        <td className="py-2 px-3">{row.shiftNight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center space-x-1.5 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Terapkan Jadwal Baru</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roster Add / Edit Modal */}
      {showRosterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-slate-800 text-base">
                {editingRosterId ? 'Edit Entri Roster Penjagaan' : 'Tambah Entri Roster Penjagaan'}
              </h3>
              <button onClick={() => setShowRosterModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoster} className="space-y-4">
              {/* Duplicate guard notice */}
              {(() => {
                const searchName = (rosterForm.name || '').trim().toUpperCase();
                const searchDate = (rosterForm.dateStr || '').trim().toLowerCase();
                if (!searchName || !searchDate) return null;
                const dup = safeRoster.find(
                  r => r.id !== editingRosterId && 
                       r.name.trim().toUpperCase() === searchName && 
                       r.dateStr.trim().toLowerCase() === searchDate
                );
                if (dup) {
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold">Info Duplikasi Nama:</span> Petugas <span className="font-bold">{searchName}</span> sudah memiliki jadwal pada tanggal ini di <span className="font-bold">{dup.location} ({dup.hours})</span>. Menyimpan form ini akan memperbarui penugasannya dan mencegah entri ganda.
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Petugas</label>
                <input
                  type="text"
                  required
                  list="security-guards-datalist"
                  placeholder="Contoh: ARIEF"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-djpb-blue"
                  value={rosterForm.name}
                  onChange={(e) => setRosterForm({ ...rosterForm, name: e.target.value.toUpperCase() })}
                />
                <datalist id="security-guards-datalist">
                  {Array.from(new Set([...OFFICIAL_SECURITY_GUARDS, ...uniqueNames])).map(n => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hari / Tanggal</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: KAMIS/ 1 Oktober 2026"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-djpb-blue"
                  value={rosterForm.dateStr}
                  onChange={(e) => setRosterForm({ ...rosterForm, dateStr: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi Penjagaan</label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-djpb-blue"
                  value={rosterForm.location}
                  onChange={(e) => {
                    const loc = e.target.value;
                    const hrs = loc === 'LIBUR' ? '-' : (rosterForm.hours === '-' ? '06.00/18.00' : rosterForm.hours);
                    setRosterForm({ ...rosterForm, location: loc, hours: hrs });
                  }}
                >
                  <option value="KANWIL DJPB">KANWIL DJPB (Gedung Utama)</option>
                  <option value="RUMAH DINAS">RUMAH DINAS</option>
                  <option value="LIBUR">LIBUR (OFF)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jam Hadir / Jam Kerja</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 06.00/18.00 atau 18.00/06.00 atau -"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-djpb-blue"
                  value={rosterForm.hours}
                  onChange={(e) => setRosterForm({ ...rosterForm, hours: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRosterModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Simpan Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Matrix Shift Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-slate-800 text-base">
                {editingShiftIndex !== null ? 'Edit Matriks Shift Harian' : 'Tambah Matriks Shift Harian'}
              </h3>
              <button onClick={() => setShowShiftModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!setSecurityShifts) return;
                let updated: SecurityShift[] = [];
                if (editingShiftIndex !== null) {
                  updated = securityShifts.map((s, idx) => idx === editingShiftIndex ? shiftForm : s);
                } else {
                  updated = [...securityShifts, shiftForm];
                }
                setSecurityShifts(updated);
                saveFirestoreCollection('security_shifts', updated);
                safeLocalStorageSet('melayu_security_shifts', JSON.stringify(updated));
                setShowShiftModal(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hari</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Senin"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-djpb-blue"
                  value={shiftForm.day}
                  onChange={(e) => setShiftForm({ ...shiftForm, day: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Shift Pagi (07:00 - 15:00)</label>
                <input
                  type="text"
                  placeholder="Nama Petugas Pagi"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-djpb-blue"
                  value={shiftForm.shiftMorning}
                  onChange={(e) => setShiftForm({ ...shiftForm, shiftMorning: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Shift Sore (15:00 - 23:00)</label>
                <input
                  type="text"
                  placeholder="Nama Petugas Sore"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-djpb-blue"
                  value={shiftForm.shiftEvening}
                  onChange={(e) => setShiftForm({ ...shiftForm, shiftEvening: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Shift Malam (23:00 - 07:00)</label>
                <input
                  type="text"
                  placeholder="Nama Petugas Malam"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-djpb-blue"
                  value={shiftForm.shiftNight}
                  onChange={(e) => setShiftForm({ ...shiftForm, shiftNight: e.target.value })}
                />
              </div>

              <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowShiftModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Simpan Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Menu Hapus Pengawasan Penjagaan Keamanan Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-150 border border-slate-100">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-rose-100 rounded-xl text-rose-600">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-display font-extrabold text-slate-800">
                    Menu Hapus Pengawasan Penjagaan Keamanan
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Kanwil DJPb Provinsi Riau ({securityRoster.length} total entri aktif)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-xl cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Pilih metode penghapusan data jadwal security pengawasan penjagaan keamanan:
              </p>

              {/* Option: Clean Duplicate Guard Names */}
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  handleCleanDuplicates();
                }}
                className="w-full p-3.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-left transition-all cursor-pointer group flex items-center justify-between"
              >
                <div>
                  <div className="font-extrabold text-xs text-indigo-900 flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>BERSIHKAN SELURUH DUPLIKASI NAMA PETUGAS</span>
                  </div>
                  <p className="text-[11px] text-indigo-700 mt-0.5 ml-5">
                    Mendeteksi dan menghapus penugasan ganda untuk nama petugas yang sama pada tanggal yang sama.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-indigo-600 text-white font-bold text-[10px] rounded-lg shadow-2xs">
                  {duplicateCount > 0 ? `${duplicateCount} Duplikasi Terdeteksi` : 'Bersih (0 Duplikasi)'}
                </span>
              </button>

              {/* Option: Sinkronkan Pola Shift & Jam Hadir (Pola 1 Oktober) */}
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  handleAlignOctoberShifts();
                }}
                className="w-full p-3.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-left transition-all cursor-pointer group flex items-center justify-between"
              >
                <div>
                  <div className="font-extrabold text-xs text-blue-900 flex items-center space-x-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>SINKRONKAN POLA SHIFT & JAM HADIR (POLA 1 OKTOBER 2026)</span>
                  </div>
                  <p className="text-[11px] text-blue-700 mt-0.5 ml-5">
                    Memperbaiki Jam Hadir / Shift mulai Jumat/ 2 Oktober s.d. Sabtu/ 31 Oktober 2026 agar polanya sama persis dengan Kamis/ 1 Oktober 2026 (2 Pagi 06.00/18.00, 2 Malam 18.00/06.00, 1 Rumdin, 1 Libur).
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-blue-600 text-white font-bold text-[10px] rounded-lg shadow-2xs">
                  Sinkronkan Pola
                </span>
              </button>

              {/* Option 1: Delete Selected Rows */}
              {selectedIds.length > 0 ? (
                <button
                  onClick={handleDeleteSelectedRoster}
                  className="w-full p-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-left transition-all cursor-pointer shadow-sm flex items-center justify-between"
                >
                  <div>
                    <div className="font-extrabold text-xs uppercase flex items-center space-x-2 text-white">
                      <Check className="w-4 h-4 text-rose-200" />
                      <span>HAPUS {selectedIds.length} DATA TERPILIH (CENTANG AKTIF)</span>
                    </div>
                    <p className="text-[11px] text-rose-100/90 mt-0.5 ml-6">
                      Eksekusi hapus untuk {selectedIds.length} baris data pengawasan yang sedang dicentang.
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-white text-rose-700 font-extrabold text-[11px] rounded-lg shadow-2xs">
                    Eksekusi Hapus ({selectedIds.length})
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSelectedIds(filteredRoster.map(r => r.id));
                  }}
                  className="w-full p-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="font-extrabold text-xs text-blue-900 flex items-center space-x-2">
                      <Check className="w-4 h-4 text-blue-600" />
                      <span>PILIH / CENTANG SEMUA DATA TAMPIL ({filteredRoster.length} BARIS)</span>
                    </div>
                    <p className="text-[11px] text-blue-700 mt-0.5 ml-6">
                      Pilih/centang seluruh baris dalam tabel untuk mengaktifkan fitur Hapus Terpilih.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-600 text-white font-bold text-[10px] rounded-lg shadow-2xs">
                    Centang Semua ({filteredRoster.length})
                  </span>
                </button>
              )}

              {/* Option 2: Delete Filtered / Currently Displayed Rows */}
              {filteredRoster.length > 0 && (
                <button
                  onClick={handleDeleteFilteredRoster}
                  className="w-full p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-left transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div>
                    <div className="font-extrabold text-xs text-amber-900 flex items-center space-x-1.5">
                      <Filter className="w-4 h-4 text-amber-600" />
                      <span>Hapus Data Tampil Saat Ini ({filteredRoster.length} Baris)</span>
                    </div>
                    <p className="text-[11px] text-amber-800 mt-0.5 ml-5">
                      Menghapus {filteredRoster.length} baris data pengawasan yang sedang tampak pada layar/tabel.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-600 text-white font-bold text-[10px] rounded-lg shadow-2xs">
                    Hapus Tampil ({filteredRoster.length})
                  </span>
                </button>
              )}

              {/* Option 3: Delete ALL Data */}
              <button
                onClick={handleClearAllRoster}
                className="w-full p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-left transition-all cursor-pointer group flex items-center justify-between"
              >
                <div>
                  <div className="font-extrabold text-xs text-rose-800 group-hover:text-rose-900 flex items-center space-x-1.5">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Hapus SELURUH Total Data ({securityRoster.length} Baris)</span>
                  </div>
                  <p className="text-[11px] text-rose-700/80 mt-0.5 ml-5">
                    Menghapus seluruh jadwal roster security tanpa sisa (kosongkan tabel).
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-rose-600 text-white font-bold text-[10px] rounded-lg shadow-2xs">
                  Kosongkan Total ({securityRoster.length})
                </span>
              </button>

              {/* Option 4: Delete By Location */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  4. Hapus Berdasarkan Lokasi Penjagaan
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleDeleteByLocation('KANWIL DJPB')}
                    className="p-2 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-center text-xs font-bold text-slate-800 transition-colors cursor-pointer shadow-2xs"
                  >
                    KANWIL DJPB
                  </button>
                  <button
                    onClick={() => handleDeleteByLocation('RUMAH DINAS')}
                    className="p-2 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-lg text-center text-xs font-bold text-slate-800 transition-colors cursor-pointer shadow-2xs"
                  >
                    RUMAH DINAS
                  </button>
                  <button
                    onClick={() => handleDeleteByLocation('LIBUR')}
                    className="p-2 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 rounded-lg text-center text-xs font-bold text-red-700 transition-colors cursor-pointer shadow-2xs"
                  >
                    LIBUR (OFF)
                  </button>
                </div>
              </div>

              {/* Option 5: Hapus Seluruh Data Bulan Agustus 2026 */}
              <button
                onClick={() => {
                  const cleaned = securityRoster.filter(r => !(r?.dateStr || '').toLowerCase().includes('agustus') && !normalizeDateKey(r?.dateStr || '').startsWith('2026-08'));
                  const sorted = sortRosterChronologically(cleaned);
                  setSecurityRoster(sorted);
                  safeLocalStorageSet('melayu_security_roster', JSON.stringify(sorted));
                  saveFirestoreCollection('security_roster', sorted);
                  setShowDeleteModal(false);
                  setSuccessNotice(`BERHASIL! Seluruh sisa data jadwal penjagaan bulan Agustus 2026 telah dibersihkan.`);
                  setTimeout(() => setSuccessNotice(''), 6000);
                }}
                className="w-full p-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="font-extrabold text-xs text-amber-900 flex items-center space-x-1.5">
                    <Trash2 className="w-4 h-4 text-amber-600" />
                    <span>HAPUS SISA DATA JADWAL BULAN AGUSTUS 2026</span>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-0.5 ml-5">
                    Membersihkan seluruh entri 1 Agustus 2026 yang masih tersisa agar tabel murni berisi jadwal Oktober 2026.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-amber-600 text-white font-bold text-[10px] rounded-lg shadow-2xs">
                  Bersihkan Agustus
                </span>
              </button>

              {/* Option 6: Reset Default */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-800 block">5. Kembalikan ke Data Standar Default</span>
                  <span className="text-[11px] text-slate-500 block">Mengatur ulang jadwal ke data awal sistem.</span>
                </div>
                <button
                  onClick={() => { setShowDeleteModal(false); handleReset(); }}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg cursor-pointer flex items-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Tutup Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
