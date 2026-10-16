import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Shield, Plus, Trash2, Edit3, Check, X,
  FileSpreadsheet, Upload, Download, RotateCcw, AlertCircle, FileCheck,
  Search, Users, Home, Calendar, Clock, Sparkles, Filter, ExternalLink,
  Printer, FileDown, Eye, CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SecurityShift, SecurityRosterItem } from '../types';
import { INITIAL_SECURITY_SHIFTS, INITIAL_SECURITY_ROSTER, generateOctoberSecurityShifts } from '../mockData';
import { saveFirestoreCollection, subscribeFirestoreCollection, saveFirestoreDoc } from '../lib/firebase';
import { safeLocalStorageSet } from '../lib/storage';
import KemenkeuLogo from './KemenkeuLogo';
import { exportElementToPdf, printDocumentElement } from '../lib/pdfExport';

const ID_DAYS_UPPER = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
const ID_MONTHS_TITLE = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function extractMonthAndYearFromText(text: string): { month: number; year: number } | null {
  if (!text) return null;
  const up = text.toUpperCase();
  let month = -1;

  // Prioritize October if explicitly present
  if (/\b(OKTOBER|OCTOBER|OKT|OCT)\b/i.test(up)) {
    month = 10;
  } else {
    for (let m = 0; m < ID_MONTHS_TITLE.length; m++) {
      const mName = ID_MONTHS_TITLE[m].toUpperCase();
      const reg = new RegExp(`\\b${mName}\\b`, 'i');
      if (reg.test(up)) {
        month = m + 1;
        break;
      }
    }
  }

  if (month === -1) {
    if (/\b(OKT|OCT)\b/i.test(up)) month = 10;
    else if (/\b(AGU|AGS|AUG|ASG)\b/i.test(up)) month = 8;
    else if (/\b(SEP|SEPT)\b/i.test(up)) month = 9;
    else if (/\b(NOV)\b/i.test(up)) month = 11;
    else if (/\b(DES|DEC)\b/i.test(up)) month = 12;
    else if (/\b(JUL)\b/i.test(up)) month = 7;
    else if (/\b(JUN)\b/i.test(up)) month = 6;
    else if (/\b(MEI|MAY)\b/i.test(up)) month = 5;
    else if (/\b(APR)\b/i.test(up)) month = 4;
    else if (/\b(MAR)\b/i.test(up)) month = 3;
    else if (/\b(FEB)\b/i.test(up)) month = 2;
    else if (/\b(JAN)\b/i.test(up)) month = 1;
  }

  const yMatch = up.match(/\b(202[4-9]|203[0-9])\b/);
  const year = yMatch ? parseInt(yMatch[1], 10) : 2026;

  return month !== -1 ? { month, year } : null;
}

// Comprehensive parser for Excel date cells (serial number, Date object, formatted string, MM/DD vs DD/MM)
export function parseDateFromExcelCell(
  cellVal: any,
  contextMonth: number = 10,
  contextYear: number = 2026
): { year: number; month: number; day: number; dayName: string } | null {
  if (cellVal === null || cellVal === undefined) return null;

  // 1. If already a JS Date object
  if (cellVal instanceof Date && !isNaN(cellVal.getTime())) {
    return {
      year: cellVal.getFullYear(),
      month: cellVal.getMonth() + 1,
      day: cellVal.getDate(),
      dayName: ID_DAYS_UPPER[cellVal.getDay()]
    };
  }

  // 2. If number (Excel serial date e.g. 46296 or day number 1..31)
  if (typeof cellVal === 'number') {
    if (cellVal >= 40000 && cellVal <= 65000) {
      const d = new Date(Math.round((cellVal - 25569) * 86400 * 1000));
      return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
        dayName: ID_DAYS_UPPER[d.getUTCDay()]
      };
    }
    if (cellVal >= 1 && cellVal <= 31) {
      const d = new Date(contextYear, contextMonth - 1, cellVal);
      return {
        year: contextYear,
        month: contextMonth,
        day: cellVal,
        dayName: ID_DAYS_UPPER[d.getDay()]
      };
    }
  }

  const str = String(cellVal).trim();
  if (!str) return null;

  // Protect against time ranges or shift strings being erroneously parsed as dates
  // e.g. "06.00/18.00", "18.00/06.00", "14.00/22.00", "06.00 - 18.00", "06.00", "18.00"
  if (
    /^(0?6[\.:]00|18[\.:]00|14[\.:]00|22[\.:]00)\s*[\/\-]\s*(0?6[\.:]00|18[\.:]00|14[\.:]00|22[\.:]00)$/i.test(str) ||
    /^(shift\s*[123i]+|pagi|malam|sore|libur|off|lepas)$/i.test(str) ||
    /^\d{1,2}[\.:]\d{2}$/.test(str)
  ) {
    return null;
  }

  // 3. Serial string like "46296"
  const serialMatch = str.match(/^(\d{5})(?:\.\d+)?$/);
  if (serialMatch) {
    const serial = parseInt(serialMatch[1], 10);
    if (serial >= 40000 && serial <= 65000) {
      const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
      return {
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
        dayName: ID_DAYS_UPPER[d.getUTCDay()]
      };
    }
  }

  const lower = str.toLowerCase();

  // Explicit day name if included in the cell string
  let explicitDayName: string | undefined;
  for (let d = 0; d < ID_DAYS_UPPER.length; d++) {
    if (lower.includes(ID_DAYS_UPPER[d].toLowerCase())) {
      explicitDayName = ID_DAYS_UPPER[d];
      break;
    }
  }

  // 4. Word Month matching e.g. "Kamis/ 1 Oktober 2026", "1 Okt 2026", "Oktober 1, 2026", "1-Okt-26"
  const wordMonthMatch = lower.match(/(?:(\d{1,2})[\s\/\.\,\-]+([a-zA-Z]{3,12})|([a-zA-Z]{3,12})[\s\/\.\,\-]+(\d{1,2}))[\s\/\.\,\-]?(\d{2,4})?/);
  if (wordMonthMatch) {
    const dayStr = wordMonthMatch[1] || wordMonthMatch[4];
    const mStr = (wordMonthMatch[2] || wordMonthMatch[3] || '').toLowerCase();
    const day = parseInt(dayStr, 10);
    let month = -1;
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

    if (month !== -1 && day >= 1 && day <= 31) {
      let year = contextYear;
      if (wordMonthMatch[5]) {
        const y = parseInt(wordMonthMatch[5], 10);
        year = y < 100 ? 2000 + y : y;
      }
      const dObj = new Date(year, month - 1, day);
      return {
        year,
        month,
        day,
        dayName: explicitDayName || ID_DAYS_UPPER[dObj.getDay()]
      };
    }
  }

  // 5. Numeric dates: e.g. "01/10/2026", "10/01/2026", "2026-10-01", "1-10-2026"
  const numMatch = lower.match(/(\d{1,4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,4})/);
  if (numMatch) {
    const p1 = parseInt(numMatch[1], 10);
    const p2 = parseInt(numMatch[2], 10);
    const p3 = parseInt(numMatch[3], 10);

    let year = contextYear;
    let month = contextMonth;
    let day = 1;

    if (p1 > 1000) {
      // YYYY-MM-DD
      year = p1;
      month = p2;
      day = p3;
    } else {
      year = p3 < 100 ? 2000 + p3 : p3;
      // Smart ambiguity resolution with contextMonth awareness:
      if (p1 === contextMonth && p2 !== contextMonth && p2 <= 31) {
        month = p1;
        day = p2;
      } else if (p2 === contextMonth && p1 !== contextMonth && p1 <= 31) {
        month = p2;
        day = p1;
      } else if (p1 > 12 && p2 <= 12) {
        day = p1;
        month = p2;
      } else if (p2 > 12 && p1 <= 12) {
        day = p2;
        month = p1;
      } else {
        // Default Indonesian format DD/MM/YYYY
        day = p1;
        month = p2;
      }
    }

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const dObj = new Date(year, month - 1, day);
      return {
        year,
        month,
        day,
        dayName: explicitDayName || ID_DAYS_UPPER[dObj.getDay()]
      };
    }
  }

  // 6. Day number with or without leading zeros: e.g. "1", "01", "2", "31" or "KAMIS / 01"
  const dayOnly = lower.match(/\b(0?[1-9]|[12]\d|3[01])\b/);
  if (dayOnly) {
    const day = parseInt(dayOnly[1], 10);
    if (day >= 1 && day <= 31) {
      const dObj = new Date(contextYear, contextMonth - 1, day);
      return {
        year: contextYear,
        month: contextMonth,
        day,
        dayName: explicitDayName || ID_DAYS_UPPER[dObj.getDay()]
      };
    }
  }

  return null;
}

// Extract normalized YYYY-MM-DD or unique day key from any date string variations
export function normalizeDateKey(dateStr: string, contextMonth: number = 10, contextYear: number = 2026): string {
  if (!dateStr) return '';
  const parsed = parseDateFromExcelCell(dateStr, contextMonth, contextYear);
  if (parsed) {
    return `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`;
  }
  return String(dateStr).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Standard display format for a date string: HARI/ Day Bulan Tahun (e.g. KAMIS/ 1 Oktober 2026)
export function formatStandardDateStr(dateStr: string, contextMonth: number = 10, contextYear: number = 2026): string {
  if (!dateStr) return '';
  const parsed = parseDateFromExcelCell(dateStr, contextMonth, contextYear);
  if (parsed) {
    const monthName = ID_MONTHS_TITLE[parsed.month - 1] || 'Oktober';
    return `${parsed.dayName}/ ${parsed.day} ${monthName} ${parsed.year}`;
  }
  return String(dateStr).trim();
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

// Helper to determine whether a given hours string and location represents morning shift (starts with 06.00 / 06.00/18.00 / Pagi)
// Helper to split multiple guard names in a single cell whether delimited by /, comma, &, newline, dan, or space-concatenated
export function splitMultipleGuardNames(text: string): string[] {
  if (!text) return [];
  const trimmed = text.trim();
  const standardDelim = trimmed
    .replace(/(\(?\d+[\.\-\)]\s*)/g, '\n$1')
    .split(/[\/\n\r,&;]| dan | DAN /)
    .map(n => n.trim().replace(/^\(?\d+[\.\-\)]\s*/, '').trim())
    .filter(n => n.length > 1 && !/^(SHIFT|POS|PAGI|MALAM|SORE|LIBUR|OFF|-)$/i.test(n));

  if (standardDelim.length > 1) {
    return standardDelim;
  }

  const up = trimmed.toUpperCase();
  const found: { name: string; index: number }[] = [];
  const sortedGuards = [...OFFICIAL_SECURITY_GUARDS].sort((a, b) => b.length - a.length);
  sortedGuards.forEach(g => {
    let searchFrom = 0;
    while (searchFrom < up.length) {
      const idx = up.indexOf(g, searchFrom);
      if (idx === -1) break;
      found.push({ name: g, index: idx });
      searchFrom = idx + g.length;
    }
  });

  if (found.length >= 2) {
    found.sort((a, b) => a.index - b.index);
    const nonOverlapping: string[] = [];
    let lastEnd = -1;
    for (const f of found) {
      if (f.index >= lastEnd) {
        nonOverlapping.push(f.name);
        lastEnd = f.index + f.name.length;
      }
    }
    if (nonOverlapping.length >= 2) {
      return nonOverlapping;
    }
  }

  return standardDelim.length > 0 ? standardDelim : [trimmed];
}

// Helper to determine whether a given hours string and location represents morning shift (starts with 06.00 / 06.00/18.00 / Pagi / Shift 1)
export function isMorningHours(hours: string, location?: string): boolean {
  if (!hours || hours.trim() === '-' || (location && location.toUpperCase().includes('LIBUR'))) return false;
  const trimmed = hours.trim();
  const up = trimmed.toUpperCase();

  // If location is Rumah Dinas, it is exclusively night shift (18.00/06.00)
  if (location && (location.toUpperCase().includes('RUMAH') || location.toUpperCase().includes('RUMDIN'))) {
    return false;
  }

  if (isEveningHours(hours, location)) return false;

  // Smart resolution if string contains both 06 and 18:
  // "06.00/18.00" -> 06 comes first -> morning
  // "18.00/06.00" -> 18 comes first -> night
  const idx06 = trimmed.search(/0?6[\.:]/);
  const idx18 = trimmed.search(/18[\.:]/);
  if (idx06 !== -1 && idx18 !== -1) {
    return idx06 < idx18;
  }

  if (
    /0?6[\.:]\d{2}/i.test(trimmed) ||
    /^(PUKUL\s*|JAM\s*|SHIFT\s*)?0?6/i.test(trimmed) ||
    up.includes('PAGI') ||
    /\bSHIFT\s*1\b/i.test(up) ||
    /\bSHIFT\s*I\b/i.test(up) ||
    up === '06-18' || up === '06/18' || up === 'P' || up === '1'
  ) {
    return true;
  }

  return false;
}

// Helper to determine whether a given hours string and location represents evening shift (14.00 / 14.00/22.00 / Sore)
export function isEveningHours(hours: string, location?: string): boolean {
  if (!hours || hours.trim() === '-' || (location && location.toUpperCase().includes('LIBUR'))) return false;
  const trimmed = hours.trim();
  const up = trimmed.toUpperCase();
  return (
    /^(PUKUL\s*|JAM\s*|SHIFT\s*)?14[\.:]/i.test(trimmed) ||
    /14[\.:]?00\s*[\/\-\s*sd\.]+\s*22/i.test(trimmed) ||
    up.includes('SORE') ||
    up.includes('SIANG') ||
    /\bSHIFT\s*2\b/i.test(up) ||
    /\bSHIFT\s*II\b/i.test(up) ||
    up === '14-22' || up === '14/22' ||
    up === 'S' || up === '2'
  );
}

// Helper to determine whether a given hours string and location represents night shift (18.00 / 18.00/06.00 / Malam / Rumah Dinas)
export function isNightHours(hours: string, location?: string): boolean {
  if (!hours || hours.trim() === '-' || (location && location.toUpperCase().includes('LIBUR'))) return false;
  const trimmed = hours.trim();
  const up = trimmed.toUpperCase();

  if (location && (location.toUpperCase().includes('RUMAH') || location.toUpperCase().includes('RUMDIN'))) return true;

  const idx06 = trimmed.search(/0?6[\.:]/);
  const idx18 = trimmed.search(/18[\.:]/);
  if (idx06 !== -1 && idx18 !== -1) {
    return idx18 < idx06;
  }

  if (
    /18[\.:]\d{2}/i.test(trimmed) ||
    /^(PUKUL\s*|JAM\s*|SHIFT\s*)?18/i.test(trimmed) ||
    up.includes('MALAM') ||
    /\bSHIFT\s*3\b/i.test(up) ||
    /\bSHIFT\s*III\b/i.test(up) ||
    up === '18-06' || up === '18/06' || up === 'M' || up === '3' ||
    trimmed === '18.00' || trimmed === '18:00'
  ) {
    return true;
  }

  return false;
}

export function isMorningShift(hours: string, location: string): boolean {
  return isMorningHours(hours, location);
}

// Parse duty cells in matrix / roster tables into clean location, hours, and shift category
export function parseDutyCellValue(rawVal: string): { location: string; hours: string; shiftType: 'morning' | 'evening' | 'night' | 'rumdin' | 'libur' } {
  const up = (rawVal || '').trim().toUpperCase();
  if (!up || up === '-' || up === '0' || up.includes('LIBUR') || up.includes('OFF') || up.includes('LEPAS') || up === 'L') {
    return { location: 'LIBUR', hours: '-', shiftType: 'libur' };
  }
  if (up.includes('RUMAH') || up.includes('RUMDIN') || up.includes('JABATAN') || up === 'RD') {
    return { location: 'RUMAH DINAS', hours: '18.00/06.00', shiftType: 'rumdin' };
  }

  // Check Evening first (14.00)
  if (isEveningHours(up)) {
    return { location: 'KANWIL DJPB', hours: '14.00/22.00', shiftType: 'evening' };
  }

  // Check Night next (18.00 / 18.00/06.00 / MALAM / M / SHIFT 3)
  if (isNightHours(up)) {
    return { location: 'KANWIL DJPB', hours: '18.00/06.00', shiftType: 'night' };
  }

  // Check Morning (06.00 / 06.00/18.00 / PAGI / P / SHIFT 1)
  if (isMorningHours(up)) {
    return { location: 'KANWIL DJPB', hours: '06.00/18.00', shiftType: 'morning' };
  }

  return { location: 'KANWIL DJPB', hours: '06.00/18.00', shiftType: 'morning' };
}

// Normalize raw hours text to official standard
export function normalizeHours(rawHours: string, location: string): string {
  const normLoc = (location || '').trim().toUpperCase();
  if (normLoc.includes('LIBUR') || normLoc === 'OFF' || normLoc === 'LEPAS' || normLoc === 'L') {
    return '-';
  }
  const trimmed = (rawHours || '').trim();
  if (!trimmed || trimmed === '-' || trimmed === '0' || trimmed.toUpperCase() === 'LIBUR' || trimmed.toUpperCase() === 'OFF') {
    return '-';
  }

  // Night variations: 18.00, 18:00, 18-06, 18.00/06.00, MALAM, SHIFT 3, SHIFT III, M
  if (isNightHours(trimmed, normLoc)) {
    return '18.00/06.00';
  }

  // Evening variations: 14.00, 14:00, 14-22, 14.00/22.00, SORE, SIANG, SHIFT 2, SHIFT II, S
  if (isEveningHours(trimmed, normLoc)) {
    return '14.00/22.00';
  }

  // Morning variations: 06.00, 06:00, 06-18, 06/18, 06.00/18.00, PAGI, SHIFT 1, SHIFT I, P
  if (isMorningHours(trimmed, normLoc)) {
    return '06.00/18.00';
  }

  if (normLoc.includes('RUMAH') || normLoc.includes('RUMDIN')) {
    return '18.00/06.00';
  }

  return trimmed;
}

// Official 5 duty positions for security guard shifts in Kanwil DJPb Riau:
// Position 1 & 2: KANWIL DJPB (06.00/18.00) -> 2 Petugas Shift Pagi
// Position 3 & 4: KANWIL DJPB (18.00/06.00) -> 2 Petugas Shift Malam
// Position 5: RUMAH DINAS (18.00/06.00) -> 1 Petugas Rumah Dinas
export const OCTOBER_DAILY_ROTATION: { [idx: number]: {
  morning: [string, string];
  night: [string, string];
  rumdin: string;
  libur: string;
}} = {
  0: { morning: ['ROBBY', 'DIAN ARI'], night: ['ERWIN', 'RATMANSYAH'], rumdin: 'ARIEF', libur: 'ADITYA' },
  1: { morning: ['DIAN ARI', 'ADITYA'], night: ['RATMANSYAH', 'ARIEF'], rumdin: 'ROBBY', libur: 'ERWIN' },
  2: { morning: ['ADITYA', 'ERWIN'], night: ['ARIEF', 'ROBBY'], rumdin: 'DIAN ARI', libur: 'RATMANSYAH' },
  3: { morning: ['ERWIN', 'RATMANSYAH'], night: ['ROBBY', 'DIAN ARI'], rumdin: 'ADITYA', libur: 'ARIEF' },
  4: { morning: ['RATMANSYAH', 'ARIEF'], night: ['DIAN ARI', 'ADITYA'], rumdin: 'ERWIN', libur: 'ROBBY' },
  5: { morning: ['ARIEF', 'ROBBY'], night: ['ADITYA', 'ERWIN'], rumdin: 'RATMANSYAH', libur: 'DIAN ARI' },
};

// Enforces that for ALL days in October 2026 (terutama mulai Jumat/ 2 Oktober s.d. Sabtu/ 31 Oktober 2026),
// pola Jam Hadir / Shift dan Lokasi Penjagaan SAMA PERSIS dengan standar resmi:
// 1. KANWIL DJPB: 06.00/18.00 (2 petugas)
// 2. KANWIL DJPB: 18.00/06.00 (2 petugas)
// 3. RUMAH DINAS: 18.00/06.00 (1 petugas)
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

  // Separate non-October items (exclude any stray August or September)
  const nonOctoberItems = deduplicated.filter(it => {
    const dKey = normalizeDateKey(it.dateStr || '', 10, 2026);
    const isOct = dKey.startsWith('2026-10') || (it.dateStr || '').toLowerCase().includes('oktober');
    const isAug = dKey.startsWith('2026-08') || (it.dateStr || '').toLowerCase().includes('agustus');
    const isSep = dKey.startsWith('2026-09') || (it.dateStr || '').toLowerCase().includes('september');
    return !isOct && !isAug && !isSep;
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

    // 6 official positions for each day matching image.png (5 on duty + 1 LIBUR):
    // Slot 1 & 2: KANWIL DJPB, 06.00/18.00 (Shift Pagi)
    // Slot 3 & 4: KANWIL DJPB, 18.00/06.00 (Shift Malam)
    // Slot 5: RUMAH DINAS, 18.00/06.00 (Pos Rumah Dinas)
    // Slot 6: LIBUR, - (Personil Libur / Off)
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

// Deduplicate roster entries: ensures each officer appears once per date, and retains official roster statuses (including LIBUR)
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

    const rawLocUp = (rawItem.location || '').trim().toUpperCase();
    const rawHoursUp = (rawItem.hours || '').trim().toUpperCase();
    const rawNameUp = rawName.toUpperCase();

    // Skip if name is literally placeholder or separator
    if (rawNameUp === 'LIBUR' || rawNameUp === 'OFF' || rawNameUp === 'LEPAS' || rawNameUp === '-' || rawNameUp === '0') {
      continue;
    }

    // Check if name cell contains multiple officers (e.g. "ROBBY / DIAN ARI")
    const subNames = (rawName.includes('/') || rawName.includes('\n') || rawName.includes('&') || / dan /i.test(rawName) || (rawName.includes(',') && !rawName.includes('SH') && !rawName.includes('SE')))
      ? rawName.split(/[\/\n\r,&]| dan | DAN /).map(n => n.trim().replace(/^\d+[\.\-\)]\s*/, '')).filter(Boolean)
      : [rawName];

    for (const subName of subNames) {
      const normName = normalizeGuardName(subName);
      if (!normName || normName === 'LIBUR' || normName === 'OFF' || normName === 'LEPAS' || normName === '-') continue;

      const itemMonthInfo = extractMonthAndYearFromText(rawDate);
      const curMonth = itemMonthInfo?.month || effMonth;
      const curYear = itemMonthInfo?.year || effYear;
      const dateKey = normalizeDateKey(rawDate, curMonth, curYear);
      if (!normName || !dateKey) continue;

      let normLoc = (rawItem.location || 'KANWIL DJPB').trim().toUpperCase();
      let normHours = normalizeHours(rawItem.hours || '', normLoc);

      const isLibur = 
        normLoc.includes('LIBUR') || normLoc === 'OFF' || normLoc === 'LEPAS' || normLoc === 'L' || 
        (normHours === '-' && !normLoc.includes('KANWIL') && !normLoc.includes('RUMAH')) ||
        (rawItem.hours || '').toUpperCase().includes('LIBUR') || (rawItem.hours || '').toUpperCase().includes('OFF') ||
        (rawItem.location || '').toUpperCase().includes('LIBUR') || (rawItem.location || '').toUpperCase().includes('OFF');

      if (isLibur) {
        normLoc = 'LIBUR';
        normHours = '-';
      } else if (normLoc.includes('RUMAH') || normLoc.includes('RUMDIN') || normLoc.includes('JABATAN')) {
        normLoc = 'RUMAH DINAS';
        normHours = '18.00/06.00';
      } else {
        normLoc = 'KANWIL DJPB';
        if (isMorningHours(normHours, normLoc)) {
          normHours = '06.00/18.00';
        } else if (isEveningHours(normHours, normLoc)) {
          normHours = '14.00/22.00';
        } else {
          normHours = '18.00/06.00';
        }
      }

      // Deduplication key: ensure each officer only appears ONCE for any given date
      const key = `${dateKey}___${normName}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const stdDateStr = formatStandardDateStr(rawDate, curMonth, curYear);
        cleanList.push({
          ...rawItem,
          id: rawItem.id || `ros-${dateKey}-${normName}-${cleanList.length}`,
          name: normName,
          dateStr: stdDateStr || rawDate,
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
    const saved = localStorage.getItem('melayu_security_doc_title');
    if (!saved || saved.toUpperCase().includes('SEPTEMBER')) {
      return 'JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN OKTOBER 2026';
    }
    return saved;
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
            const cleanTitle = mainConfig.docTitle.toUpperCase().includes('SEPTEMBER')
              ? 'JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN OKTOBER 2026'
              : mainConfig.docTitle;
            setDocTitle(cleanTitle);
            safeLocalStorageSet('melayu_security_doc_title', cleanTitle);
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
  const [previewDocTitle, setPreviewDocTitle] = useState<string>('JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN OKTOBER 2026');
  const [previewDocHeaders, setPreviewDocHeaders] = useState<string[]>(['NO.', 'NAMA PETUGAS', 'HARI / TANGGAL', 'LOKASI / POS', 'JAM HADIR']);
  const [excelFileName, setExcelFileName] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [uploadedWorkbook, setUploadedWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [previewMonth, setPreviewMonth] = useState<number>(10);
  const [previewYear, setPreviewYear] = useState<number>(2026);

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

  // Print PDF Modal States (Cetak PDF Penjagaan Security Sesuai Bulan)
  const [showPrintPdfModal, setShowPrintPdfModal] = useState(false);
  const [printMonth, setPrintMonth] = useState<number>(10);
  const [printYear, setPrintYear] = useState<number>(2026);
  const [printDocFormat, setPrintDocFormat] = useState<'roster' | 'matrix'>('roster');
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [printOfficerFilter, setPrintOfficerFilter] = useState<string>('ALL');
  const [printIncludeKop, setPrintIncludeKop] = useState(true);
  const [printIncludeSignature, setPrintIncludeSignature] = useState(true);
  const [printCityDate, setPrintCityDate] = useState('Pekanbaru, 31 Oktober 2026');
  const [signerKasubbagTitle] = useState('Kasubbag Kepegawaian dan Rumah Tangga');
  const [signerKasubbagName] = useState('HENDRA SUTIKNO');
  const [signerKasubbagNip] = useState('19780512 200212 1 002');
  const [signerKoorTitle] = useState('Koordinator / Komandan Regu Keamanan');
  const [signerKoorName] = useState('DIAN ARI');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [deleteTargetMonth, setDeleteTargetMonth] = useState<number>(10);
  const [deleteTargetYear, setDeleteTargetYear] = useState<number>(2026);

  // Count true duplicate officer assignments on the same date
  const duplicateCount = useMemo(() => {
    const list = securityRoster || [];
    const seen = new Set<string>();
    let dupes = 0;
    for (const item of list) {
      if (!item) continue;
      const rawName = (item.name || '').trim();
      const rawDate = (item.dateStr || '').trim();
      const normName = normalizeGuardName(rawName);
      if (!normName || !rawDate) continue;

      const dateKey = normalizeDateKey(rawDate);
      if (!dateKey) continue;
      const key = `${dateKey}___${normName}`;
      if (seen.has(key)) {
        dupes++;
      } else {
        seen.add(key);
      }
    }
    return dupes;
  }, [securityRoster]);

  // Auto-clean any true duplicate entries or stray September/August entries reactively
  useEffect(() => {
    if (!setSecurityRoster || !securityRoster || securityRoster.length === 0) return;
    const isOctoberActive = docTitle.toUpperCase().includes('OKTOBER');

    const hasWrongMonthItems = isOctoberActive && securityRoster.some(it => {
      const dKey = normalizeDateKey(it.dateStr || '', 10, 2026);
      return (
        dKey.startsWith('2026-09') || (it.dateStr || '').toLowerCase().includes('september') ||
        dKey.startsWith('2026-08') || (it.dateStr || '').toLowerCase().includes('agustus')
      );
    });

    // Check if any day in October has only 1 guard on morning shift 06.00/18.00
    const hasSingleGuardMornings = isOctoberActive && securityRoster.some(it => {
      const dKey = normalizeDateKey(it.dateStr || '', 10, 2026);
      return dKey.startsWith('2026-10');
    }) && (() => {
      const morningCountPerDay = new Map<string, number>();
      securityRoster.forEach(it => {
        if (isMorningHours(it.hours, it.location)) {
          const dKey = normalizeDateKey(it.dateStr || '', 10, 2026);
          if (dKey.startsWith('2026-10')) {
            morningCountPerDay.set(dKey, (morningCountPerDay.get(dKey) || 0) + 1);
          }
        }
      });
      for (let day = 1; day <= 31; day++) {
        const dKey = `2026-10-${String(day).padStart(2, '0')}`;
        if ((morningCountPerDay.get(dKey) || 0) < 2) return true;
      }
      return false;
    })();

    if (duplicateCount > 0 || hasWrongMonthItems || hasSingleGuardMornings) {
      const cleaned = deduplicateRoster(securityRoster);
      const filteredForMonth = isOctoberActive
        ? alignOctoberRosterToPattern(cleaned.filter(it => {
            const dKey = normalizeDateKey(it.dateStr || '', 10, 2026);
            const isSep = dKey.startsWith('2026-09') || (it.dateStr || '').toLowerCase().includes('september');
            const isAug = dKey.startsWith('2026-08') || (it.dateStr || '').toLowerCase().includes('agustus');
            return !isSep && !isAug;
          }))
        : cleaned;

      const sorted = sortRosterChronologically(filteredForMonth);
      const isDifferent = sorted.length !== securityRoster.length ||
        sorted.some((s, i) => s.id !== securityRoster[i]?.id || s.name !== securityRoster[i]?.name || s.dateStr !== securityRoster[i]?.dateStr || s.hours !== securityRoster[i]?.hours);
      if (isDifferent) {
        setSecurityRoster(sorted);
        safeLocalStorageSet('melayu_security_roster', JSON.stringify(sorted));
        saveFirestoreCollection('security_roster', sorted);
      }
    }
  }, [securityRoster, duplicateCount, docTitle, setSecurityRoster]);

  // Handler to manually sync/repair shift pattern starting from 2 to 31 October to match 1 October (Optional Manual Tool)
  const handleAlignOctoberShifts = () => {
    if (!setSecurityRoster) return;
    const deduplicated = deduplicateRoster(securityRoster || []);
    const aligned = alignOctoberRosterToPattern(deduplicated);
    const sorted = sortRosterChronologically(aligned);
    setSecurityRoster(sorted);
    safeLocalStorageSet('melayu_security_roster', JSON.stringify(sorted));
    saveFirestoreCollection('security_roster', sorted);

    if (setSecurityShifts) {
      const generatedShifts = generateOctoberSecurityShifts();
      setSecurityShifts(generatedShifts);
      safeLocalStorageSet('melayu_security_shifts', JSON.stringify(generatedShifts));
      saveFirestoreCollection('security_shifts', generatedShifts);
    }

    setSuccessNotice(
      `BERHASIL DISINKRONKAN! Pola Penjagaan Security mulai Jumat/ 2 Oktober s.d. Sabtu/ 31 Oktober 2026 telah diperbaiki (2 petugas Shift Pagi 06.00/18.00 di KANWIL DJPB, 2 petugas Shift Malam 18.00/06.00 di KANWIL DJPB, dan 1 petugas Shift Malam 18.00/06.00 di RUMAH DINAS).`
    );
    setTimeout(() => setSuccessNotice(''), 7000);
  };
  const handleFixTwoMorningGuards = handleAlignOctoberShifts;

  // Clean and deduplicate roster handler
  const handleCleanDuplicates = () => {
    if (!setSecurityRoster) return;
    const originalCount = (securityRoster || []).length;
    const cleaned = alignOctoberRosterToPattern(deduplicateRoster(securityRoster || []));
    const sorted = sortRosterChronologically(cleaned);
    const removed = originalCount - cleaned.length;
    setSecurityRoster(sorted);
    safeLocalStorageSet('melayu_security_roster', JSON.stringify(sorted));
    saveFirestoreCollection('security_roster', sorted);
    setSelectedIds([]);
    if (removed > 0) {
      setSuccessNotice(`BERHASIL DIBERSIHKAN! Sebanyak ${removed} data diselaraskan dan duplikasi dibersihkan.`);
    } else {
      setSuccessNotice(`Data roster pengawasan penjagaan keamanan sudah bersih, rapi, dan sesuai standar 2 petugas shift pagi.`);
    }
    setTimeout(() => setSuccessNotice(''), 6000);
  };

  // Filtered Roster Data (Sorted strictly chronologically by Hari, Tanggal, Jam, dan Urutan Shift)
  const safeRoster = useMemo(() => {
    const list = securityRoster || [];
    const isCleared = localStorage.getItem('melayu_security_roster_cleared') === 'true';
    if (isCleared && list.length === 0) {
      return [];
    }

    let deletedIdsSet = new Set<string>();
    try {
      const stored = localStorage.getItem('melayu_deleted_security_roster_ids');
      if (stored) {
        deletedIdsSet = new Set(JSON.parse(stored));
      }
    } catch (e) {}

    const deduplicated = deduplicateRoster(list).filter(item => !deletedIdsSet.has(item.id));
    
    // Check if there is October data
    const hasOctoberData = deduplicated.some(item => {
      const dKey = normalizeDateKey(item.dateStr || '');
      return dKey.startsWith('2026-10') || (item.dateStr || '').toLowerCase().includes('oktober');
    });

    const isOctoberDoc = !docTitle || docTitle.toUpperCase().includes('OKTOBER') || docTitle.toUpperCase().includes('SEPTEMBER');
    const isCustomUploaded = localStorage.getItem('melayu_security_roster_custom_uploaded') === 'true';
    const isUserModified = localStorage.getItem('melayu_security_roster_user_modified') === 'true';

    let filteredList: SecurityRosterItem[] = deduplicated;

    if (isOctoberDoc || hasOctoberData || isCustomUploaded) {
      // Strictly isolate October items: purge any rogue September or August records from October roster
      const octoberOnly = deduplicated.filter(item => {
        if (!item) return false;
        const dKey = normalizeDateKey(item.dateStr || '', 10, 2026);
        const isSep = dKey.startsWith('2026-09') || (item.dateStr || '').toLowerCase().includes('september');
        const isAug = dKey.startsWith('2026-08') || (item.dateStr || '').toLowerCase().includes('agustus');
        return !isSep && !isAug;
      });

      if (!isCleared && !isCustomUploaded && !isUserModified && octoberOnly.length === 0 && INITIAL_SECURITY_ROSTER && INITIAL_SECURITY_ROSTER.length > 0) {
        filteredList = INITIAL_SECURITY_ROSTER.filter(item => !deletedIdsSet.has(item.id));
      } else {
        // Enforce 2 officers for 06.00/18.00 every day in October 2026
        filteredList = alignOctoberRosterToPattern(octoberOnly);
      }
    } else if (isCleared || isUserModified || isCustomUploaded) {
      filteredList = deduplicated;
    } else {
      filteredList = INITIAL_SECURITY_ROSTER.filter(item => !deletedIdsSet.has(item.id));
    }

    const finalClean = deduplicateRoster(filteredList);
    // Strict chronological sort: Hari & Tanggal -> Jam Hadir -> Lokasi -> Urutan Shift (orderIndex) -> Nama
    return sortRosterChronologically(finalClean);
  }, [securityRoster, docTitle]);

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

  // Auto-sync city and date for document signature when month/year changes
  useEffect(() => {
    const daysInMonth = new Date(printYear, printMonth, 0).getDate();
    const monthName = ID_MONTHS_TITLE[printMonth - 1] || 'Oktober';
    setPrintCityDate(`Pekanbaru, ${daysInMonth} ${monthName} ${printYear}`);
  }, [printMonth, printYear]);

  // Available Months detected from safeRoster
  const availableMonths = useMemo(() => {
    const map = new Map<string, { month: number; year: number; label: string; count: number }>();
    (safeRoster || []).forEach(item => {
      if (!item?.dateStr) return;
      const dKey = normalizeDateKey(item.dateStr);
      const m = dKey.match(/^(\d{4})-(\d{2})/);
      if (m) {
        const y = parseInt(m[1], 10);
        const mo = parseInt(m[2], 10);
        const mapKey = `${y}-${String(mo).padStart(2, '0')}`;
        const existing = map.get(mapKey);
        if (existing) {
          existing.count++;
        } else {
          map.set(mapKey, {
            month: mo,
            year: y,
            label: `${ID_MONTHS_TITLE[mo - 1]} ${y}`,
            count: 1
          });
        }
      }
    });

    if (!map.has('2026-10')) {
      map.set('2026-10', {
        month: 10,
        year: 2026,
        label: 'Oktober 2026',
        count: (safeRoster || []).filter(r => (r?.dateStr || '').toLowerCase().includes('oktober')).length
      });
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }, [safeRoster]);

  // Filtered Roster for PDF Print according to selected Month & Year
  const printRosterData = useMemo(() => {
    const targetMonthStr = String(printMonth).padStart(2, '0');
    const targetKeyPrefix = `${printYear}-${targetMonthStr}`;
    const targetMonthName = (ID_MONTHS_TITLE[printMonth - 1] || '').toLowerCase();

    const filtered = (safeRoster || []).filter(item => {
      if (!item) return false;
      const dKey = normalizeDateKey(item.dateStr || '', printMonth, printYear);
      const matchesMonth = dKey.startsWith(targetKeyPrefix) || (item.dateStr || '').toLowerCase().includes(targetMonthName);
      if (!matchesMonth) return false;

      if (printOfficerFilter !== 'ALL' && item.name !== printOfficerFilter) {
        return false;
      }
      return true;
    });

    return sortRosterChronologically(filtered);
  }, [safeRoster, printMonth, printYear, printOfficerFilter]);

  // RowSpan map for PDF print table
  const printRowSpanMap = useMemo(() => {
    const map: { [index: number]: number } = {};
    if (!printRosterData || printRosterData.length === 0) return map;

    let i = 0;
    while (i < printRosterData.length) {
      const currentDate = printRosterData[i]?.dateStr?.trim();
      let count = 1;
      let j = i + 1;
      while (j < printRosterData.length && (printRosterData[j]?.dateStr?.trim() === currentDate)) {
        count++;
        j++;
      }
      map[i] = count;
      i = j;
    }
    return map;
  }, [printRosterData]);

  // Synthesize Matrix Shift Data for PDF Print
  const printMatrixData = useMemo(() => {
    const dateMap = new Map<string, { morning: string[]; evening: string[]; night: string[]; rumdin: string[]; libur: string[] }>();
    printRosterData.forEach(item => {
      const d = item.dateStr || '';
      if (!dateMap.has(d)) {
        dateMap.set(d, { morning: [], evening: [], night: [], rumdin: [], libur: [] });
      }
      const grp = dateMap.get(d)!;
      if (item.location === 'LIBUR') {
        grp.libur.push(item.name);
      } else if (item.location === 'RUMAH DINAS') {
        grp.rumdin.push(item.name);
      } else if (isMorningHours(item.hours, item.location)) {
        grp.morning.push(item.name);
      } else if (isEveningHours(item.hours, item.location)) {
        grp.evening.push(item.name);
      } else {
        grp.night.push(item.name);
      }
    });

    const list: { day: string; morning: string; evening: string; nightRumdin: string; libur: string }[] = [];
    dateMap.forEach((grp, day) => {
      list.push({
        day,
        morning: grp.morning.join(' / ') || '-',
        evening: grp.evening.join(' / ') || '-',
        nightRumdin: [...grp.night, ...(grp.rumdin.map(r => `${r} (Rumdin)`))].join(' / ') || '-',
        libur: grp.libur.join(' / ') || '-'
      });
    });
    return list;
  }, [printRosterData]);

  // Dynamically derive Shift Matrix directly from safeRoster so that Shift Pagi (06.00/18.00)
  // in the Matrix View table ALWAYS exactly reflects the officers uploaded from the Excel file!
  const displayShifts = useMemo(() => {
    if (safeRoster && safeRoster.length > 0) {
      const dateMap = new Map<string, { morning: string[]; evening: string[]; night: string[]; rumdin: string[]; libur: string[] }>();
      safeRoster.forEach(item => {
        const d = item.dateStr || '';
        if (!d) return;
        if (!dateMap.has(d)) {
          dateMap.set(d, { morning: [], evening: [], night: [], rumdin: [], libur: [] });
        }
        const grp = dateMap.get(d)!;
        if (item.location === 'LIBUR' || item.hours === '-') {
          grp.libur.push(item.name);
        } else if (item.location === 'RUMAH DINAS') {
          grp.rumdin.push(item.name);
        } else if (isMorningHours(item.hours, item.location)) {
          grp.morning.push(item.name);
        } else if (isEveningHours(item.hours, item.location)) {
          grp.evening.push(item.name);
        } else {
          grp.night.push(item.name);
        }
      });

      if (dateMap.size > 0) {
        const list: SecurityShift[] = [];
        dateMap.forEach((grp, day) => {
          list.push({
            day,
            shiftMorning: grp.morning.join(' / ') || '-',
            shiftEvening: grp.evening.join(' / ') || '-',
            shiftNight: [...grp.night, ...(grp.rumdin.map(r => `${r} (Rumdin)`))].join(' / ') || '-'
          });
        });
        return list;
      }
    }
    return securityShifts;
  }, [safeRoster, securityShifts]);

  // Generate & Download Official PDF Document
  const handleDownloadPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    const monthName = ID_MONTHS_TITLE[printMonth - 1] || 'Bulan';
    setSuccessNotice(`Sedang menyusun dokumen PDF Jadwal Security Bulan ${monthName} ${printYear}...`);

    try {
      const filename = `Jadwal_Pengawasan_Penjagaan_Keamanan_${monthName}_${printYear}.pdf`;
      const success = await exportElementToPdf({
        filename,
        elementId: 'security-printable-document',
        orientation: printOrientation,
        onSuccess: () => {
          setIsExportingPdf(false);
          setSuccessNotice(`BERHASIL! File "${filename}" telah diunduh.`);
          setTimeout(() => setSuccessNotice(''), 6000);
        },
        onError: (err) => {
          setIsExportingPdf(false);
          console.error('Export PDF error:', err);
          setSuccessNotice('Membuka dialog cetak browser sebagai alternatif...');
          handlePrintDocument();
        }
      });
      if (!success) setIsExportingPdf(false);
    } catch (err) {
      setIsExportingPdf(false);
      console.error('Fatal PDF export error:', err);
      handlePrintDocument();
    }
  };

  // Trigger Clean Native / Browser Print
  const handlePrintDocument = () => {
    const monthName = ID_MONTHS_TITLE[printMonth - 1] || 'Bulan';
    const docTitle = `Jadwal Pengawasan Penjagaan Keamanan Bulan ${monthName} ${printYear}`;
    printDocumentElement('security-printable-document', docTitle, {
      orientation: printOrientation
    });
  };

  // Delete all roster entries for a specific target month
  const handleDeleteByMonth = (targetMonth: number, targetYear: number) => {
    if (!setSecurityRoster) return;
    const targetMonthStr = String(targetMonth).padStart(2, '0');
    const targetKeyPrefix = `${targetYear}-${targetMonthStr}`;
    const targetMonthName = (ID_MONTHS_TITLE[targetMonth - 1] || '').toLowerCase();

    const targetItems = (securityRoster || []).filter(r => {
      const dKey = normalizeDateKey(r?.dateStr || '', targetMonth, targetYear);
      return dKey.startsWith(targetKeyPrefix) || (r?.dateStr || '').toLowerCase().includes(targetMonthName);
    });

    if (targetItems.length === 0) {
      alert(`Tidak ada data jadwal untuk bulan ${ID_MONTHS_TITLE[targetMonth - 1]} ${targetYear}.`);
      return;
    }

    try {
      const stored = localStorage.getItem('melayu_deleted_security_roster_ids');
      const deletedList: string[] = stored ? JSON.parse(stored) : [];
      targetItems.forEach(r => {
        if (!deletedList.includes(r.id)) deletedList.push(r.id);
      });
      localStorage.setItem('melayu_deleted_security_roster_ids', JSON.stringify(deletedList));
      localStorage.setItem('melayu_security_roster_user_modified', 'true');
    } catch (e) {}

    const targetIds = new Set(targetItems.map(r => r.id));
    const updated = (securityRoster || []).filter(r => !targetIds.has(r.id));
    setSecurityRoster(updated);
    setSelectedIds(prev => prev.filter(id => !targetIds.has(id)));
    safeLocalStorageSet('melayu_security_roster', JSON.stringify(updated));
    saveFirestoreCollection('security_roster', updated);
    setShowDeleteModal(false);
    setSuccessNotice(`BERHASIL! Sebanyak ${targetItems.length} entri jadwal bulan ${ID_MONTHS_TITLE[targetMonth - 1]} ${targetYear} telah dihapus.`);
    setTimeout(() => setSuccessNotice(''), 6000);
  };

  // Helper to parse any sheet from an Excel workbook with custom target month/year
  const parseWorkbookSheet = (
    wb: XLSX.WorkBook,
    targetSheetName: string,
    targetMonth: number = 10,
    targetYear: number = 2026,
    fileName?: string
  ) => {
    try {
      const ws = wb.Sheets[targetSheetName];
      if (!ws) {
        alert(`Lembar kerja "${targetSheetName}" tidak ditemukan.`);
        return;
      }
      const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: false });
      if (!rawRows || rawRows.length < 1) {
        alert(`Lembar kerja "${targetSheetName}" kosong.`);
        return;
      }

      let detectedTitle = `JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN ${ID_MONTHS_TITLE[targetMonth - 1].toUpperCase()} ${targetYear}`;
      let headerRowIdx = -1;
      let bestScore = 0;

      // Scan first 15 rows for header row and title
      for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
        const rowArr = rawRows[r] || [];
        const rowStr = rowArr.map(c => String(c || '').trim()).join(' ').toUpperCase();

        if ((rowStr.includes('JADWAL') || rowStr.includes('PENGAWASAN') || rowStr.includes('PENJAGAAN') || rowStr.includes('SATPAM') || rowStr.includes('KEAMANAN')) && !rowStr.includes('LOKASI') && !rowStr.includes('HADIR')) {
          const nonNullCells = rowArr.map(c => String(c || '').trim()).filter(Boolean);
          if (nonNullCells.length > 0) {
            let t = nonNullCells.join(' ');
            if (targetMonth === 10) {
              t = t.replace(/BULAN\s+SEPTEMBER/gi, 'BULAN OKTOBER').replace(/\bSEPTEMBER\b/gi, 'OKTOBER');
            }
            detectedTitle = t;
          }
        }

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

      // Multi-level header merge
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

      // Format detection
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
        } else if (hUp.includes('RUMAH') || hUp.includes('RUMDIN') || hUp.includes('JABATAN') || hUp === 'RD') {
          rumdinCols.push(colIdx);
        } else if (hUp.includes('LIBUR') || hUp.includes('OFF') || hUp.includes('LEPAS') || hUp === 'L') {
          liburCols.push(colIdx);
        } else if (isNightHours(hUp)) {
          nightCols.push(colIdx);
        } else if (isEveningHours(hUp)) {
          eveningCols.push(colIdx);
        } else if (isMorningHours(hUp)) {
          morningCols.push(colIdx);
        }
      });

      const guardCols: { colIdx: number; name: string }[] = [];
      rawHeaderRow.forEach((h, colIdx) => {
        const cleanedName = normalizeGuardName(h);
        if (cleanedName && (OFFICIAL_SECURITY_GUARDS.includes(cleanedName) || (cleanedName.length >= 3 && !/HARI|TANGGAL|DATE|NO|LOKASI|JAM|SHIFT/i.test(cleanedName)))) {
          guardCols.push({ colIdx, name: cleanedName });
        }
      });

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
        // FORMAT C
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
            const dutyVal = String(row[colIdx] || '').trim();
            if (!dutyVal || dutyVal === '0') return;
            const duty = parseDutyCellValue(dutyVal);
            if (duty.shiftType === 'libur') {
              dailyGroups.get(day)?.libur.push(guardName);
              return; // Petugas libur TIDAK dimasukan ke dalam penjagaan
            } else if (duty.shiftType === 'rumdin') {
              dailyGroups.get(day)?.rumdin.push(guardName);
            } else if (duty.shiftType === 'evening') {
              dailyGroups.get(day)?.evening.push(guardName);
            } else if (duty.shiftType === 'night') {
              dailyGroups.get(day)?.night.push(guardName);
            } else {
              dailyGroups.get(day)?.morning.push(guardName);
            }
            const loc = duty.location;
            const hrs = duty.hours;
            const dObj = new Date(targetYear, targetMonth - 1, day);
            const dayStr = `${ID_DAYS_UPPER[dObj.getDay()]}/ ${day} ${ID_MONTHS_TITLE[targetMonth - 1]} ${targetYear}`;
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
          const dObj = new Date(targetYear, targetMonth - 1, day);
          const dayStr = `${ID_DAYS_UPPER[dObj.getDay()]}/ ${day} ${ID_MONTHS_TITLE[targetMonth - 1]} ${targetYear}`;
          parsedShifts.push({
            day: dayStr,
            shiftMorning: grp.morning.join(' / ') || '-',
            shiftEvening: grp.evening.join(' / ') || '-',
            shiftNight: [...grp.night, ...grp.rumdin].join(' / ') || '-'
          });
        });
      } else if (isGuardColsFormat) {
        // FORMAT B
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
          const formattedDate = formatStandardDateStr(dateRaw, targetMonth, targetYear) || dateRaw;
          const morningNames: string[] = [];
          const eveningNames: string[] = [];
          const nightNames: string[] = [];
          const rumdinNames: string[] = [];
          guardCols.forEach(({ colIdx, name }) => {
            const cellVal = String(row[colIdx] || '').trim();
            if (!cellVal || cellVal === '-' || cellVal === '0') return;
            const duty = parseDutyCellValue(cellVal);
            if (duty.shiftType === 'libur') {
              return; // Personil libur tidak dimasukan ke dalam penjagaan
            } else if (duty.shiftType === 'rumdin') {
              rumdinNames.push(name);
            } else if (duty.shiftType === 'evening') {
              eveningNames.push(name);
            } else if (duty.shiftType === 'night') {
              nightNames.push(name);
            } else {
              morningNames.push(name);
            }
            parsedRoster.push({
              id: `ros-gc-${rowOrder}-${Date.now()}`,
              orderIndex: rowOrder++,
              name: name,
              dateStr: formattedDate,
              location: duty.location,
              hours: duty.hours
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
        // FORMAT A
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
          if (!dateRaw || /^(HARI|TANGGAL|TOTAL|MENGETAHUI|CATATAN)/i.test(dateRaw)) continue;
          const formattedDate = formatStandardDateStr(dateRaw, targetMonth, targetYear) || dateRaw;

          const extractNamesFromCols = (cols: number[]) => {
            const res: string[] = [];
            cols.forEach(cIdx => {
              if (cIdx === -1 || row[cIdx] === undefined) return;
              const raw = String(row[cIdx]).trim();
              if (!raw || raw === '-' || raw === '0' || raw.toUpperCase() === 'LIBUR' || raw.toUpperCase() === 'OFF') return;
              const split = raw
                .replace(/(\d+[\.\-\)])/g, '\n$1')
                .split(/[\/\n\r,&;]| dan | DAN /)
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
          parsedShifts.push({
            day: formattedDate,
            shiftMorning: morningNames.map(normalizeGuardName).join(' / ') || '-',
            shiftEvening: eveningNames.map(normalizeGuardName).join(' / ') || '-',
            shiftNight: [...nightNames, ...rumdinNames].map(normalizeGuardName).join(' / ') || '-'
          });
        }
      } else {
        // FORMAT D: Tabular
        let colNo = -1, colName = -1, colDay = -1, colDate = -1, colLoc = -1, colHours = -1;
        headerRow.forEach((h, colIdx) => {
          const hUp = h.toUpperCase();
          if (colNo === -1 && (hUp === 'NO' || hUp === 'NO.' || hUp === 'NOMOR' || hUp.startsWith('NO '))) colNo = colIdx;
          else if (colName === -1 && (hUp.includes('NAMA') || hUp.includes('PETUGAS') || hUp.includes('PERSONIL') || hUp.includes('SATPAM') || hUp.includes('SECURITY') || hUp.includes('ANGGOTA'))) colName = colIdx;
          else if (hUp.includes('HARI') && (hUp.includes('TANGGAL') || hUp.includes('TGL') || hUp.includes('DATE'))) { if (colDate === -1) colDate = colIdx; }
          else if (hUp.includes('TANGGAL') || hUp.includes('TGL') || hUp.includes('DATE') || hUp.includes('WAKTU/TGL')) { if (colDate === -1) colDate = colIdx; }
          else if (hUp.includes('HARI') || hUp.includes('DAY')) { if (colDay === -1) colDay = colIdx; }
          else if (colLoc === -1 && (hUp.includes('LOKASI') || hUp.includes('POS') || hUp.includes('PENEMPATAN') || hUp.includes('TEMPAT') || hUp.includes('STATUS'))) colLoc = colIdx;
          else if (colHours === -1 && (hUp.includes('JAM') || hUp.includes('HADIR') || hUp.includes('PUKUL') || hUp.includes('WAKTU') || hUp.includes('SHIFT') || hUp.includes('HOURS'))) colHours = colIdx;
        });

        const sampleRows = rawRows.slice(headerRowIdx + 1, headerRowIdx + 30).filter(r => r && r.length > 0);
        const maxCols = Math.max(...sampleRows.map(r => r.length), 5);

        for (let c = 0; c < maxCols; c++) {
          if (c === colNo) continue;
          const vals = sampleRows.map(r => String(r[c] || '').trim()).filter(Boolean);
          if (vals.length === 0) continue;
          if (colName === -1 && vals.filter(v => OFFICIAL_SECURITY_GUARDS.some(g => v.toUpperCase().includes(g))).length >= 2) {
            colName = c; continue;
          }
          if (colHours === -1 && vals.filter(v => /\d{1,2}[\.:]\d{2}/.test(v) || /06|18|14/i.test(v) || /pagi|malam|sore/i.test(v)).length >= 2) {
            colHours = c; continue;
          }
          if (colLoc === -1 && vals.filter(v => /KANWIL|RUMAH|RUMDIN|LIBUR|OFF|LEPAS|GEDUNG/i.test(v.toUpperCase())).length >= 2) {
            colLoc = c; continue;
          }
          if (colDate === -1 && vals.filter(v => /SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU|MINGGU|\d{1,2}\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)|\d{1,2}[\/\.\-]\d{1,2}/i.test(v)).length >= 2) {
            colDate = c; continue;
          }
        }

        const assignedCols = new Set([colNo, colName, colDate, colDay, colLoc, colHours].filter(c => c !== -1));
        const unassignedCols = [];
        for (let c = 0; c < maxCols; c++) {
          if (!assignedCols.has(c)) unassignedCols.push(c);
        }
        if (colDate === -1 && colDay !== -1) colDate = colDay;
        if (colName === -1 && unassignedCols.length > 0) colName = unassignedCols.shift()!;
        if (colDate === -1 && unassignedCols.length > 0) colDate = unassignedCols.shift()!;
        if (colLoc === -1 && unassignedCols.length > 0) colLoc = unassignedCols.shift()!;
        if (colHours === -1 && unassignedCols.length > 0) colHours = unassignedCols.shift()!;

        let lastActiveDate = '';
        let lastActiveDay = '';
        let lastActiveHoursForDay = '';
        let lastActiveLocForDay = '';

        for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          let nameRaw = colName !== -1 && row[colName] !== undefined ? String(row[colName]).trim() : '';
          let dateRaw = colDate !== -1 && row[colDate] !== undefined ? String(row[colDate]).trim() : '';
          let dayRaw = colDay !== -1 && colDay !== colDate && row[colDay] !== undefined ? String(row[colDay]).trim() : '';
          let locRaw = colLoc !== -1 && row[colLoc] !== undefined ? String(row[colLoc]).trim() : '';
          let hoursRaw = colHours !== -1 && row[colHours] !== undefined ? String(row[colHours]).trim() : '';

          nameRaw = nameRaw.replace(/^\d+[\.\-\)]\s*/, '').trim();

          // Reconcile reversed columns between location and hours if needed
          if (/KANWIL|RUMAH|RUMDIN|LIBUR|OFF|LEPAS|POS|GEDUNG/i.test(hoursRaw) && (/\d{1,2}[\.:]\d{2}/.test(locRaw) || locRaw === '-')) {
            const temp = locRaw; locRaw = hoursRaw; hoursRaw = temp;
          } else if ((!hoursRaw || hoursRaw === '-') && (/\d{1,2}[\.:]\d{2}/.test(locRaw) || /0?6[\.:]|18[\.:]|14[\.:]|pagi|malam|sore/i.test(locRaw))) {
            hoursRaw = locRaw; locRaw = 'KANWIL DJPB';
          }

          // Reconcile reversed columns between date and name
          const isNameActuallyDate = /^(SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU|MINGGU|\d{1,2}[\/\.\-]\d{1,2}|\d{1,2}\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des))/i.test(nameRaw);
          const isDateActuallyDate = /^(SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU|MINGGU|\d{1,2}[\/\.\-]\d{1,2}|\d{1,2}\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des))/i.test(dateRaw);
          if (isNameActuallyDate && !isDateActuallyDate) {
            const temp = nameRaw; nameRaw = dateRaw; dateRaw = temp;
          }

          // Scan for hours in row if still empty
          if (!hoursRaw || (!/\d{1,2}[\.:]\d{2}/.test(hoursRaw) && hoursRaw !== '-' && !/pagi|malam|sore/i.test(hoursRaw))) {
            for (let c = 0; c < row.length; c++) {
              if (c === colName || c === colDate || c === colDay) continue;
              const cell = String(row[c] || '').trim();
              if (/\d{1,2}[\.:]\d{2}/.test(cell) || /06\.00|18\.00|14\.00/i.test(cell) || /pagi|malam|sore/i.test(cell)) {
                hoursRaw = cell; break;
              }
            }
          }

          const upName = nameRaw.toUpperCase();
          if (!nameRaw || upName === 'NAMA' || upName === 'NAMA PETUGAS' || /^(JADWAL|TOTAL|MENGETAHUI|CATATAN|BAGIAN)/i.test(upName)) {
            continue;
          }

          const isNewDate = dateRaw && dateRaw !== lastActiveDate;
          if (dateRaw) lastActiveDate = dateRaw;
          else if (lastActiveDate) dateRaw = lastActiveDate;

          if (isNewDate) {
            lastActiveHoursForDay = '';
            lastActiveLocForDay = '';
          }

          if (dayRaw) lastActiveDay = dayRaw;
          else if (lastActiveDay) dayRaw = lastActiveDay;

          let rawDateCombined = dateRaw;
          if (dayRaw && !rawDateCombined.toUpperCase().includes(dayRaw.toUpperCase())) {
            rawDateCombined = `${dayRaw}/ ${rawDateCombined}`;
          }

          let formattedDate = formatStandardDateStr(rawDateCombined || dateRaw || dayRaw, targetMonth, targetYear);
          if (!formattedDate) {
            const dObj = new Date(targetYear, targetMonth - 1, 1);
            formattedDate = `${ID_DAYS_UPPER[dObj.getDay()]}/ 1 ${ID_MONTHS_TITLE[targetMonth - 1]} ${targetYear}`;
          }

          // Skip rows belonging to other months (e.g. September rows in an October sheet)
          const dateMonthInfo = extractMonthAndYearFromText(formattedDate);
          if (targetMonth === 10 && dateMonthInfo && dateMonthInfo.month !== 10) {
            continue;
          }

          if (!hoursRaw && lastActiveHoursForDay) hoursRaw = lastActiveHoursForDay;
          if (!locRaw && lastActiveLocForDay) locRaw = lastActiveLocForDay;

          const upLoc = locRaw.trim().toUpperCase();
          const upHours = hoursRaw.trim().toUpperCase();

          // Skip only if officer name cell is literally a blank/placeholder string
          const isNamePlaceholder = upName === 'LIBUR' || upName === 'OFF' || upName === 'LEPAS' || upName === '-' || upName === '0';
          if (isNamePlaceholder) {
            continue;
          }

          let location = locRaw.toUpperCase();
          const isLiburRow = 
            upLoc.includes('LIBUR') || upLoc === 'OFF' || upLoc === 'LEPAS' || upLoc === 'L' ||
            upHours.includes('LIBUR') || upHours.includes('OFF') || upHours.includes('LEPAS') ||
            (upHours === '' && !upLoc.includes('KANWIL') && !upLoc.includes('RUMAH')) ||
            (upHours === '-' && !upLoc.includes('KANWIL') && !upLoc.includes('RUMAH'));

          if (isLiburRow || location.includes('LIBUR') || location === 'OFF' || location === 'LEPAS') {
            location = 'LIBUR';
            hoursRaw = '-';
          } else if (location.includes('RUMAH') || location.includes('RUMDIN') || location.includes('JABATAN')) {
            location = 'RUMAH DINAS';
            hoursRaw = normalizeHours(hoursRaw, location) || '18.00/06.00';
          } else {
            location = 'KANWIL DJPB';
            hoursRaw = normalizeHours(hoursRaw, location);
            if (!hoursRaw || hoursRaw === '-') {
              hoursRaw = '06.00/18.00';
            }
          }

          if (hoursRaw && hoursRaw !== '-' && location !== 'LIBUR') {
            lastActiveHoursForDay = hoursRaw;
            lastActiveLocForDay = location;
          }

          const names = (nameRaw.includes('/') || nameRaw.includes('\n') || nameRaw.includes('&') || / dan /i.test(nameRaw) || (nameRaw.includes(',') && !nameRaw.includes('SH') && !nameRaw.includes('SE')))
            ? nameRaw.split(/[\/\n\r,&]| dan | DAN /).map(n => n.trim().replace(/^\d+[\.\-\)]\s*/, '')).filter(Boolean)
            : [nameRaw];

          for (const n of names) {
            const nUp = n.trim().toUpperCase();
            if (nUp === 'LIBUR' || nUp === 'OFF' || nUp === 'LEPAS' || nUp === '-' || nUp === '0') continue;
            const cleanedName = normalizeGuardName(n);
            if (!cleanedName || cleanedName === 'LIBUR' || cleanedName === 'OFF' || cleanedName === 'LEPAS') continue;

            parsedRoster.push({
              id: `ros-up-${rowOrder}-${Date.now()}`,
              orderIndex: rowOrder++,
              name: cleanedName,
              dateStr: formattedDate,
              location: location,
              hours: hoursRaw
            });
          }
        }

        const dateGroupMap = new Map<string, { morning: string[]; evening: string[]; night: string[]; rumdin: string[]; libur: string[] }>();
        for (const item of parsedRoster) {
          const d = item.dateStr || '';
          if (!dateGroupMap.has(d)) {
            dateGroupMap.set(d, { morning: [], evening: [], night: [], rumdin: [], libur: [] });
          }
          const grp = dateGroupMap.get(d)!;
          if (item.location === 'LIBUR' || item.hours === '-') {
            grp.libur.push(item.name);
          } else if (item.location === 'RUMAH DINAS') {
            grp.rumdin.push(item.name);
          } else if (isMorningHours(item.hours, item.location)) {
            grp.morning.push(item.name);
          } else if (isEveningHours(item.hours, item.location)) {
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
            shiftNight: [...grp.night, ...(grp.rumdin.map(r => `${r} (Rumdin)`))].join(' / ') || '-'
          });
        });
      }

      // Deduplicate and filter out rogue months
      const deduplicated = deduplicateRoster(parsedRoster, targetMonth, targetYear);
      let cleanForMonth = targetMonth === 10
        ? deduplicated.filter(it => {
            const dKey = normalizeDateKey(it.dateStr || '', 10, targetYear);
            const isSep = dKey.startsWith('2026-09') || (it.dateStr || '').toLowerCase().includes('september');
            const isAug = dKey.startsWith('2026-08') || (it.dateStr || '').toLowerCase().includes('agustus');
            return !isSep && !isAug;
          })
        : deduplicated;

      if (targetMonth === 10) {
        cleanForMonth = alignOctoberRosterToPattern(cleanForMonth);
      }

      const cleanParsedRoster = sortRosterChronologically(cleanForMonth);

      // Re-synthesize parsedShifts so that preview modal Matrix Shift view also reflects both morning guards
      if (cleanParsedRoster.length > 0) {
        const dMap = new Map<string, { morning: string[]; evening: string[]; night: string[]; rumdin: string[] }>();
        cleanParsedRoster.forEach(it => {
          const d = it.dateStr || '';
          if (!d) return;
          if (!dMap.has(d)) dMap.set(d, { morning: [], evening: [], night: [], rumdin: [] });
          const grp = dMap.get(d)!;
          if (it.location === 'LIBUR') {
            // libur dikecualikan
          } else if (it.location === 'RUMAH DINAS') {
            grp.rumdin.push(it.name);
          } else if (isMorningHours(it.hours, it.location)) {
            grp.morning.push(it.name);
          } else if (isEveningHours(it.hours, it.location)) {
            grp.evening.push(it.name);
          } else {
            grp.night.push(it.name);
          }
        });
        parsedShifts.length = 0;
        dMap.forEach((grp, day) => {
          parsedShifts.push({
            day,
            shiftMorning: grp.morning.join(' / ') || '-',
            shiftEvening: grp.evening.join(' / ') || '-',
            shiftNight: [...grp.night, ...(grp.rumdin.map(r => `${r} (Rumdin)`))].join(' / ') || '-'
          });
        });
      }

      setPreviewType('roster');
      setPreviewRosterData(cleanParsedRoster);
      setPreviewMatrixData(parsedShifts);
      setPreviewDocTitle(detectedTitle);
      setPreviewMonth(targetMonth);
      setPreviewYear(targetYear);
      setSelectedSheet(targetSheetName);
      if (fileName) setExcelFileName(fileName);
      setShowPreviewModal(true);
    } catch (err) {
      console.error('Error parsing sheet:', err);
      alert('Gagal membaca lembar kerja. Pastikan data tabel berformat valid.');
    }
  };

  // Handle Excel File Upload with Intelligent Column Detection & Chronological Ordering
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheetNames = wb.SheetNames;
        if (!sheetNames || sheetNames.length === 0) {
          alert('File Excel tidak memiliki lembar kerja (sheet).');
          return;
        }

        setUploadedWorkbook(wb);
        setAvailableSheets(sheetNames);

        // Intelligently select best sheet, prioritizing October
        let bestSheetName = sheetNames[0];
        const octSheet = sheetNames.find(s => /oktober|okt\b/i.test(s));
        if (octSheet) {
          bestSheetName = octSheet;
        } else {
          // Check if any sheet's content contains October
          for (const sName of sheetNames) {
            const ws = wb.Sheets[sName];
            const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: false });
            const hasOkt = (rows || []).slice(0, 10).some(r => (r || []).some(c => /oktober|okt\b/i.test(String(c))));
            if (hasOkt) {
              bestSheetName = sName;
              break;
            }
          }
        }

        // Default target is always Bulan Oktober 2026 for Penjagaan Keamanan
        let targetMonth = 10;
        let targetYear = 2026;
        if (!/oktober|okt\b/i.test(file.name) && !/oktober|okt\b/i.test(bestSheetName)) {
          const mInfo = extractMonthAndYearFromText(file.name) || extractMonthAndYearFromText(bestSheetName);
          // Never let an un-updated September template filename force month 9 onto October roster
          if (mInfo && mInfo.month !== 9) {
            targetMonth = mInfo.month;
            targetYear = mInfo.year;
          }
        }

        parseWorkbookSheet(wb, bestSheetName, targetMonth, targetYear, file.name);
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
    // Pastikan data yang diterapkan dari Excel bebas dari duplikasi & personil libur tidak dimasukan
    const cleanedData = deduplicateRoster(previewRosterData, previewMonth, previewYear);
    const readyData = (previewMonth === 10)
      ? alignOctoberRosterToPattern(cleanedData)
      : cleanedData;
    const sortedData = sortRosterChronologically(readyData);

    // Bersihkan cache penghapusan lama agar seluruh baris baru Excel tampil sempurna tanpa tersembunyi
    safeLocalStorageSet('melayu_deleted_security_roster_ids', JSON.stringify([]));
    try {
      localStorage.removeItem('melayu_security_roster_cleared');
    } catch (e) {}

    // Tandai bahwa jadwal telah diunggah resmi oleh administrator
    safeLocalStorageSet('melayu_security_roster_custom_uploaded', 'true');
    safeLocalStorageSet('melayu_security_roster_updated_at', String(Date.now()));

    // Pastikan judul mencerminkan bulan yang diterapkan
    let finalTitle = previewDocTitle;
    if (previewMonth === 10 && finalTitle.toUpperCase().includes('SEPTEMBER')) {
      finalTitle = finalTitle.replace(/BULAN\s+SEPTEMBER/gi, 'BULAN OKTOBER').replace(/\bSEPTEMBER\b/gi, 'OKTOBER');
    }

    if (setSecurityRoster) {
      setSecurityRoster(sortedData);
      safeLocalStorageSet('melayu_security_roster', JSON.stringify(sortedData));
      saveFirestoreCollection('security_roster', sortedData);
    }

    const finalShifts: SecurityShift[] = (previewMatrixData && previewMatrixData.length > 0) ? [...previewMatrixData] : [];
    if (sortedData.length > 0) {
      const dateMap = new Map<string, { morning: string[]; evening: string[]; night: string[]; rumdin: string[] }>();
      sortedData.forEach(item => {
        const d = item.dateStr || '';
        if (!dateMap.has(d)) {
          dateMap.set(d, { morning: [], evening: [], night: [], rumdin: [] });
        }
        const grp = dateMap.get(d)!;
        if (item.location === 'LIBUR') {
          // libur dikecualikan
        } else if (item.location === 'RUMAH DINAS') {
          grp.rumdin.push(item.name);
        } else if (isMorningHours(item.hours, item.location)) {
          grp.morning.push(item.name);
        } else if (isEveningHours(item.hours, item.location)) {
          grp.evening.push(item.name);
        } else {
          grp.night.push(item.name);
        }
      });
      finalShifts.length = 0;
      dateMap.forEach((grp, day) => {
        finalShifts.push({
          day,
          shiftMorning: grp.morning.join(' / ') || '-',
          shiftEvening: grp.evening.join(' / ') || '-',
          shiftNight: [...grp.night, ...(grp.rumdin.map(r => `${r} (Rumdin)`))].join(' / ') || '-'
        });
      });
    }

    if (setSecurityShifts && finalShifts.length > 0) {
      setSecurityShifts(finalShifts);
      safeLocalStorageSet('melayu_security_shifts', JSON.stringify(finalShifts));
      saveFirestoreCollection('security_shifts', finalShifts);
    }

    setDocTitle(finalTitle);
    setDynamicHeaders(previewDocHeaders);

    // Save title, headers and data to localStorage
    safeLocalStorageSet('melayu_security_doc_title', finalTitle);
    safeLocalStorageSet('melayu_security_doc_headers', JSON.stringify(previewDocHeaders));

    // Save to Firestore for permanent persistence across all PCs
    saveFirestoreDoc('security_config', {
      id: 'main',
      docTitle: finalTitle,
      dynamicHeaders: previewDocHeaders,
      updatedAt: new Date().toISOString()
    });

    // Reset filter
    setSearchQuery('');
    setSelectedLocation('ALL');
    setSelectedDate('ALL');

    setSuccessNotice(
      `BERHASIL MEMUAT DATA EXCEL! Menampilkan ${sortedData.length} baris jadwal pengawasan penjagaan keamanan dari file "${excelFileName}" sesuai dengan isi dokumen Excel yang diupload.`
    );
    setShowPreviewModal(false);
    setTimeout(() => setSuccessNotice(''), 7000);
  };

  // Download Templates
  // Download Templates matching exact structure in image.png (NAMA, HARI / TANGGAL, LOKASI, JAM HADIR)
  const handleDownloadRosterTemplate = () => {
    const templateRows: { 'NAMA': string; 'HARI / TANGGAL': string; 'LOKASI': string; 'JAM HADIR': string }[] = [];
    
    for (let day = 1; day <= 31; day++) {
      const d = new Date(2026, 9, day);
      const dayName = ID_DAYS_UPPER[d.getDay()];
      const dateStr = `${dayName} / ${day} Oktober 2026`;
      const rot = OCTOBER_DAILY_ROTATION[(day - 1) % 6];
      
      templateRows.push(
        { 'NAMA': rot.morning[0], 'HARI / TANGGAL': dateStr, 'LOKASI': 'KANWIL DJPB', 'JAM HADIR': '06.00/18.00' },
        { 'NAMA': rot.morning[1], 'HARI / TANGGAL': dateStr, 'LOKASI': 'KANWIL DJPB', 'JAM HADIR': '06.00/18.00' },
        { 'NAMA': rot.night[0],   'HARI / TANGGAL': dateStr, 'LOKASI': 'KANWIL DJPB', 'JAM HADIR': '18.00/06.00' },
        { 'NAMA': rot.night[1],   'HARI / TANGGAL': dateStr, 'LOKASI': 'KANWIL DJPB', 'JAM HADIR': '18.00/06.00' },
        { 'NAMA': rot.rumdin,     'HARI / TANGGAL': dateStr, 'LOKASI': 'RUMAH DINAS', 'JAM HADIR': '18.00/06.00' },
        { 'NAMA': rot.libur,      'HARI / TANGGAL': dateStr, 'LOKASI': 'LIBUR',       'JAM HADIR': '' }
      );
    }

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Roster Security');
    XLSX.writeFile(wb, 'Template_Jadwal_Security_Oktober_2026.xlsx');
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
    if (setSecurityRoster) {
      setSecurityRoster([]);
      setSelectedIds([]);
      safeLocalStorageSet('melayu_security_roster', JSON.stringify([]));
      safeLocalStorageSet('melayu_security_roster_cleared', 'true');
      safeLocalStorageSet('melayu_security_roster_user_modified', 'true');
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
      try {
        const stored = localStorage.getItem('melayu_deleted_security_roster_ids');
        const deletedList: string[] = stored ? JSON.parse(stored) : [];
        filteredRoster.forEach(r => {
          if (!deletedList.includes(r.id)) deletedList.push(r.id);
        });
        localStorage.setItem('melayu_deleted_security_roster_ids', JSON.stringify(deletedList));
        localStorage.setItem('melayu_security_roster_user_modified', 'true');
      } catch (e) {}

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
      try {
        const stored = localStorage.getItem('melayu_deleted_security_roster_ids');
        const deletedList: string[] = stored ? JSON.parse(stored) : [];
        selectedIds.forEach(id => {
          if (!deletedList.includes(id)) deletedList.push(id);
        });
        localStorage.setItem('melayu_deleted_security_roster_ids', JSON.stringify(deletedList));
        localStorage.setItem('melayu_security_roster_user_modified', 'true');
      } catch (e) {}

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
      const targetItems = (securityRoster || []).filter(r => r.location === targetLoc);
      try {
        const stored = localStorage.getItem('melayu_deleted_security_roster_ids');
        const deletedList: string[] = stored ? JSON.parse(stored) : [];
        targetItems.forEach(r => {
          if (!deletedList.includes(r.id)) deletedList.push(r.id);
        });
        localStorage.setItem('melayu_deleted_security_roster_ids', JSON.stringify(deletedList));
        localStorage.setItem('melayu_security_roster_user_modified', 'true');
      } catch (e) {}

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

    const trimmedName = normalizeGuardName(rosterForm.name || '');
    const trimmedDate = (rosterForm.dateStr || '').trim();
    const trimmedLoc = (rosterForm.location || 'KANWIL DJPB').trim().toUpperCase();
    const trimmedHours = (rosterForm.hours || '06.00/18.00').trim();

    if (
      trimmedLoc.includes('LIBUR') || trimmedLoc === 'OFF' || trimmedLoc === 'LEPAS' ||
      trimmedHours === '-' || trimmedHours.includes('LIBUR') ||
      trimmedName.includes('LIBUR') || trimmedName === 'OFF' || trimmedName === '-'
    ) {
      alert('Petugas yang libur tidak dimasukan ke dalam daftar pengawasan penjagaan.');
      return;
    }

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
    try {
      const stored = localStorage.getItem('melayu_deleted_security_roster_ids');
      const deletedList: string[] = stored ? JSON.parse(stored) : [];
      if (!deletedList.includes(id)) deletedList.push(id);
      localStorage.setItem('melayu_deleted_security_roster_ids', JSON.stringify(deletedList));
      localStorage.setItem('melayu_security_roster_user_modified', 'true');
    } catch (e) {}

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
    localStorage.removeItem('melayu_security_roster_cleared');
    localStorage.removeItem('melayu_deleted_security_roster_ids');
    localStorage.removeItem('melayu_security_roster_user_modified');
    localStorage.removeItem('melayu_security_doc_title');
    localStorage.removeItem('melayu_security_doc_headers');
    localStorage.removeItem('melayu_security_roster_custom_uploaded');
    localStorage.removeItem('melayu_security_roster_updated_at');

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
              <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Menampilkan {filteredRoster.length} entri roster penjagaan</span>
                <span className="inline-block w-1 h-1 rounded-full bg-slate-300"></span>
                <a 
                  href="https://www.medialayananumum.my.id/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center space-x-1 hover:underline cursor-pointer"
                  title="Buka website live https://www.medialayananumum.my.id/"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Website Produksi: medialayananumum.my.id</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
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

            <button
              onClick={() => setShowPrintPdfModal(true)}
              className="px-3.5 py-1.5 bg-djpb-blue hover:bg-djpb-blue-light text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
              title="Cetak & Unduh Dokumen Jadwal Penjagaan Security Format PDF Sesuai Pilihan Bulan"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak PDF Sesuai Bulan</span>
            </button>

            {isAdmin && (
              <>
                <button
                  onClick={handleAlignOctoberShifts}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                  title="Perbaiki Jam Hadir / Shift Mulai Kamis/ 1 Oktober s.d. Sabtu/ 31 Oktober 2026 agar polanya konsisten dan akurat (2 Petugas Pagi 06.00/18.00, 2 Petugas Malam 18.00/06.00, 1 Petugas Rumdin, 1 Petugas Libur)"
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
              <span>Matriks Shift Harian ({displayShifts.length})</span>
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
                  <option value="ALL">Semua Lokasi / Pos</option>
                  <option value="KANWIL DJPB">KANWIL DJPB</option>
                  <option value="RUMAH DINAS">RUMAH DINAS</option>
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
                {displayShifts
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
                          <button
                            onClick={() => {
                              if (confirm(`Apakah Anda yakin ingin menghapus jadwal matriks ${shift.day}?`)) {
                                if (setSecurityShifts) {
                                  const updated = displayShifts.filter((_, i) => i !== idx);
                                  setSecurityShifts(updated);
                                  safeLocalStorageSet('melayu_security_shifts', JSON.stringify(updated));
                                  saveFirestoreCollection('security_shifts', updated);
                                  setSuccessNotice(`Jadwal matriks ${shift.day} berhasil dihapus.`);
                                  setTimeout(() => setSuccessNotice(''), 4000);
                                }
                              }
                            }}
                            className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer ml-1"
                            title="Hapus Shift"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                {displayShifts.length === 0 && (
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
                  <th className="py-3 px-4 border-r border-slate-200">Lokasi / Pos</th>
                  <th className="py-3 px-4 border-r border-slate-200">Jam Hadir</th>
                  {isAdmin && <th className="py-3 px-4 text-right w-24">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 font-mono">
                {filteredRoster.map((item, idx) => {
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
                        {item.location === 'LIBUR' ? (
                          <span className="text-rose-600 font-extrabold tracking-wide">{item.name}</span>
                        ) : (
                          item.name
                        )}
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
                        {item.location === 'LIBUR' && (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-rose-100 text-rose-700 border border-rose-300 text-[11px] font-bold">
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
                        {item.location === 'LIBUR' || item.hours === '-' ? (
                          <span className="text-slate-400 font-bold">-</span>
                        ) : item.hours === '06.00/18.00' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
                            06.00/18.00
                          </span>
                        ) : item.hours === '18.00/06.00' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs font-bold">
                            18.00/06.00
                          </span>
                        ) : (
                          <span>{item.hours}</span>
                        )}
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
              <div className="w-full">
                <span className="font-extrabold block text-amber-900">Perhatian: Pengunggahan ini akan MENIMPA data lama!</span>
                <span className="text-amber-800">
                  Seluruh data jadwal Excel sebelumnya akan digantikan secara penuh dengan dokumen baru: <strong className="underline">{previewDocTitle}</strong> ({previewRosterData.length} baris pengawasan aktif).
                </span>
              </div>
            </div>

            {/* Sheet & Month Selector Controls */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {availableSheets.length > 1 && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Pilih Lembar Kerja (Sheet Excel):
                    </label>
                    <select
                      value={selectedSheet}
                      onChange={(e) => {
                        const s = e.target.value;
                        setSelectedSheet(s);
                        if (uploadedWorkbook) {
                          parseWorkbookSheet(uploadedWorkbook, s, previewMonth, previewYear, excelFileName);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-djpb-blue"
                    >
                      {availableSheets.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={availableSheets.length <= 1 ? 'col-span-full' : ''}>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Bulan & Tahun Penjagaan:
                  </label>
                  <select
                    value={previewMonth}
                    onChange={(e) => {
                      const m = parseInt(e.target.value, 10);
                      setPreviewMonth(m);
                      if (uploadedWorkbook && selectedSheet) {
                        parseWorkbookSheet(uploadedWorkbook, selectedSheet, m, previewYear, excelFileName);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-djpb-blue"
                  >
                    {ID_MONTHS_TITLE.map((mName, mIdx) => (
                      <option key={mName} value={mIdx + 1}>{mName} {previewYear}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Judul Dokumen Penjagaan:
                </label>
                <input
                  type="text"
                  value={previewDocTitle}
                  onChange={(e) => setPreviewDocTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-1 focus:ring-djpb-blue"
                />
              </div>

              {/* Data Verification Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-900 font-bold rounded-md border border-blue-200">
                  Total: {previewRosterData.length} baris tugas aktif
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold rounded-md border border-emerald-200">
                  Bebas Duplikasi Petugas
                </span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-md border border-amber-200">
                  Petugas Libur (OFF) Tidak Dimasukan
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
                        <td className="py-2 px-3 font-bold text-slate-800 border-r border-slate-200">
                          {row.location === 'LIBUR' ? (
                            <span className="text-rose-600 font-extrabold">{row.name}</span>
                          ) : (
                            row.name
                          )}
                        </td>
                        {previewRowSpanMap[idx] !== undefined ? (
                          <td rowSpan={previewRowSpanMap[idx]} className="py-2 px-3 border-r border-slate-200 text-center align-middle font-bold bg-slate-50/70 text-slate-800">
                            {row.dateStr}
                          </td>
                        ) : null}
                        <td className="py-2 px-3 border-r border-slate-200 font-sans">
                          {row.location === 'LIBUR' ? (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-300">LIBUR</span>
                          ) : (
                            row.location
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold">
                          {row.location === 'LIBUR' || row.hours === '-' ? (
                            <span className="text-slate-400">-</span>
                          ) : (
                            row.hours
                          )}
                        </td>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi / Pos</label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-djpb-blue"
                  value={rosterForm.location}
                  onChange={(e) => {
                    const loc = e.target.value;
                    const hrs = loc === 'RUMAH DINAS' ? '18.00/06.00' : (rosterForm.hours === '18.00/06.00' ? '18.00/06.00' : '06.00/18.00');
                    setRosterForm({ ...rosterForm, location: loc, hours: hrs });
                  }}
                >
                  <option value="KANWIL DJPB">KANWIL DJPB</option>
                  <option value="RUMAH DINAS">RUMAH DINAS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jam Hadir</label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-djpb-blue"
                  value={rosterForm.hours}
                  onChange={(e) => setRosterForm({ ...rosterForm, hours: e.target.value })}
                >
                  {rosterForm.location === 'RUMAH DINAS' ? (
                    <option value="18.00/06.00">18.00/06.00 (Shift Malam)</option>
                  ) : (
                    <>
                      <option value="06.00/18.00">06.00/18.00 (Shift Pagi)</option>
                      <option value="18.00/06.00">18.00/06.00 (Shift Malam)</option>
                      <option value="14.00/22.00">14.00/22.00 (Shift Sore)</option>
                    </>
                  )}
                </select>
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
                const baseList = displayShifts.length > 0 ? displayShifts : securityShifts;
                if (editingShiftIndex !== null) {
                  updated = baseList.map((s, idx) => idx === editingShiftIndex ? shiftForm : s);
                } else {
                  updated = [...baseList, shiftForm];
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
                    <span>BERSIHKAN SELURUH DUPLIKASI NAMA PETUGAS & STATUS LIBUR</span>
                  </div>
                  <p className="text-[11px] text-indigo-700 mt-0.5 ml-5">
                    Mendeteksi dan menghapus penugasan ganda pada tanggal yang sama, serta memastikan personil libur tidak dimasukan ke dalam daftar penjagaan.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-indigo-600 text-white font-bold text-[10px] rounded-lg shadow-2xs">
                  {duplicateCount > 0 ? `${duplicateCount} Duplikasi/Libur Terdeteksi` : 'Bersih (0 Duplikasi)'}
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
                    Memperbaiki Jam Hadir / Shift mulai Kamis/ 1 Oktober s.d. Sabtu/ 31 Oktober 2026 agar polanya sama persis dengan standar resmi (2 Pagi 06.00/18.00, 2 Malam 18.00/06.00 di KANWIL DJPB, dan 1 Rumdin 18.00/06.00; personil libur tidak dimasukan).
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
                    Membersihkan seluruh entri Agustus 2026 yang masih tersisa agar tabel murni berisi jadwal Oktober 2026.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-amber-600 text-white font-bold text-[10px] rounded-lg shadow-2xs">
                  Bersihkan Agustus
                </span>
              </button>

              {/* Option 6: Hapus Seluruh Data Bulan September 2026 */}
              <button
                onClick={() => {
                  const cleaned = securityRoster.filter(r => !(r?.dateStr || '').toLowerCase().includes('september') && !normalizeDateKey(r?.dateStr || '').startsWith('2026-09'));
                  const sorted = sortRosterChronologically(cleaned);
                  setSecurityRoster(sorted);
                  safeLocalStorageSet('melayu_security_roster', JSON.stringify(sorted));
                  saveFirestoreCollection('security_roster', sorted);
                  setShowDeleteModal(false);
                  setSuccessNotice(`BERHASIL! Seluruh sisa data jadwal penjagaan bulan September 2026 telah dibersihkan.`);
                  setTimeout(() => setSuccessNotice(''), 6000);
                }}
                className="w-full p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="font-extrabold text-xs text-indigo-900 flex items-center space-x-1.5">
                    <Trash2 className="w-4 h-4 text-indigo-600" />
                    <span>HAPUS SISA DATA JADWAL BULAN SEPTEMBER 2026</span>
                  </div>
                  <p className="text-[11px] text-indigo-800 mt-0.5 ml-5">
                    Membersihkan seluruh entri September 2026 yang masih tersisa agar tabel murni hanya menampilkan jadwal Oktober 2026.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-indigo-600 text-white font-bold text-[10px] rounded-lg shadow-2xs">
                  Bersihkan September
                </span>
              </button>

              {/* Option: Hapus Jadwal Berdasarkan Pilihan Bulan */}
              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2.5">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-900">
                  <Calendar className="w-4 h-4 text-rose-600" />
                  <span>HAPUS JADWAL BERDASARKAN PILIHAN BULAN</span>
                </div>
                <p className="text-[11px] text-rose-700">
                  Pilih bulan dan tahun jadwal yang ingin dihapus secara permanen dari basis data.
                </p>
                <div className="flex items-center space-x-2">
                  <select
                    value={deleteTargetMonth}
                    onChange={(e) => setDeleteTargetMonth(parseInt(e.target.value, 10))}
                    className="flex-1 bg-white border border-rose-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                  >
                    {ID_MONTHS_TITLE.map((m, idx) => (
                      <option key={idx} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={deleteTargetYear}
                    onChange={(e) => setDeleteTargetYear(parseInt(e.target.value, 10))}
                    className="w-24 bg-white border border-rose-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                  >
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleDeleteByMonth(deleteTargetMonth, deleteTargetYear)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg cursor-pointer shadow-2xs whitespace-nowrap"
                  >
                    Hapus Bulan Ini
                  </button>
                </div>
              </div>

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

      {/* Modal Cetak PDF Penjagaan Security Sesuai Bulan */}
      {showPrintPdfModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[96vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-djpb-blue/10 rounded-xl text-djpb-blue">
                  <Printer className="w-5 h-5 text-djpb-blue" />
                </div>
                <div>
                  <h3 className="text-base font-display font-extrabold text-slate-800 flex items-center space-x-2">
                    <span>Cetak Dokumen Jadwal Penjagaan Security (PDF)</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-djpb-blue">
                      {ID_MONTHS_TITLE[printMonth - 1]} {printYear}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Kantor Wilayah DJPb Provinsi Riau • Format Standar Resmi ({printRosterData.length} baris penugasan)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center space-x-1.5 shadow-xs transition-colors"
                  title="Unduh File PDF Dokumen Jadwal Security"
                >
                  <FileDown className="w-4 h-4" />
                  <span>{isExportingPdf ? 'Menyusun PDF...' : 'Unduh PDF (.pdf)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintDocument}
                  className="px-3.5 py-1.5 bg-djpb-blue hover:bg-djpb-blue-light text-white text-xs font-bold rounded-xl cursor-pointer flex items-center space-x-1.5 shadow-xs transition-colors"
                  title="Buka Dialog Cetak Browser / Printer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak (Printer)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintPdfModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Config & Filter Toolbar */}
            <div className="px-5 py-3 bg-slate-100 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs shrink-0">
              {/* 1. Pilih Bulan */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Pilih Bulan Jadwal:
                </label>
                <select
                  value={printMonth}
                  onChange={(e) => setPrintMonth(parseInt(e.target.value, 10))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 shadow-2xs focus:ring-1 focus:ring-djpb-blue cursor-pointer"
                >
                  {ID_MONTHS_TITLE.map((name, idx) => {
                    const mNum = idx + 1;
                    const count = safeRoster.filter(r => {
                      const k = normalizeDateKey(r?.dateStr || '', mNum, printYear);
                      return k.startsWith(`${printYear}-${String(mNum).padStart(2, '0')}`) || (r?.dateStr || '').toLowerCase().includes(name.toLowerCase());
                    }).length;
                    return (
                      <option key={idx} value={mNum}>
                        {name} {count > 0 ? `(${count} data)` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 2. Pilih Tahun */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tahun:
                </label>
                <select
                  value={printYear}
                  onChange={(e) => setPrintYear(parseInt(e.target.value, 10))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 shadow-2xs focus:ring-1 focus:ring-djpb-blue cursor-pointer"
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                  <option value={2028}>2028</option>
                </select>
              </div>

              {/* 3. Format Dokumen */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Format Dokumen:
                </label>
                <select
                  value={printDocFormat}
                  onChange={(e) => {
                    const fmt = e.target.value as 'roster' | 'matrix';
                    setPrintDocFormat(fmt);
                    if (fmt === 'matrix') setPrintOrientation('landscape');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 shadow-2xs focus:ring-1 focus:ring-djpb-blue cursor-pointer"
                >
                  <option value="roster">Tabel Roster Harian (Resmi)</option>
                  <option value="matrix">Matriks Shift Penjagaan</option>
                </select>
              </div>

              {/* 4. Filter Petugas */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Filter Petugas:
                </label>
                <select
                  value={printOfficerFilter}
                  onChange={(e) => setPrintOfficerFilter(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 shadow-2xs focus:ring-1 focus:ring-djpb-blue cursor-pointer"
                >
                  <option value="ALL">Semua Petugas ({uniqueNames.length || 6})</option>
                  {uniqueNames.map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {/* 5. Orientasi Kertas */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Orientasi Kertas:
                </label>
                <select
                  value={printOrientation}
                  onChange={(e) => setPrintOrientation(e.target.value as 'portrait' | 'landscape')}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 shadow-2xs focus:ring-1 focus:ring-djpb-blue cursor-pointer"
                >
                  <option value="portrait">Potret (Portrait A4)</option>
                  <option value="landscape">Lanskap (Landscape A4)</option>
                </select>
              </div>
            </div>

            {/* Quick Toggle Options */}
            <div className="px-5 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2 shrink-0">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-1.5 font-bold cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={printIncludeKop}
                    onChange={(e) => setPrintIncludeKop(e.target.checked)}
                    className="rounded text-djpb-blue focus:ring-djpb-blue cursor-pointer"
                  />
                  <span>Sertakan Kop Surat Resmi Kementerian Keuangan DJPb</span>
                </label>

                <label className="flex items-center space-x-1.5 font-bold cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={printIncludeSignature}
                    onChange={(e) => setPrintIncludeSignature(e.target.checked)}
                    className="rounded text-djpb-blue focus:ring-djpb-blue cursor-pointer"
                  />
                  <span>Sertakan Kolom Tanda Tangan Resmi</span>
                </label>
              </div>

              <div className="flex items-center space-x-2 text-[11px] font-medium text-slate-500">
                <span>Tanggal Dokumen:</span>
                <input
                  type="text"
                  value={printCityDate}
                  onChange={(e) => setPrintCityDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-0.5 text-slate-800 font-bold text-[11px] w-48"
                  placeholder="Pekanbaru, 31 Oktober 2026"
                />
              </div>
            </div>

            {/* Document Paper Container */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-6 bg-slate-200/90 flex flex-col items-center">
              <div
                id="security-printable-document"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  width: '100%',
                  maxWidth: printOrientation === 'landscape' ? '297mm' : '210mm',
                  minHeight: printOrientation === 'landscape' ? '210mm' : '297mm',
                  padding: '24px 32px',
                  boxSizing: 'border-box',
                  fontFamily: 'Arial, Helvetica, sans-serif'
                }}
                className="bg-white shadow-xl rounded-xs border border-slate-300 print:shadow-none print:border-none print:p-0"
              >
                {/* Official Kop DJPb */}
                {printIncludeKop && (
                  <div className="flex items-center space-x-4 pb-3 border-b-2 border-slate-900 mb-4">
                    <div className="w-16 h-16 shrink-0 flex items-center justify-center">
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
                      <div className="text-[9px] text-slate-600 mt-0.5">
                        Jalan Jenderal Sudirman No. 249, Pekanbaru 28126 | Telp: (0761) 22359, 23456 | Email: djpb.riau@kemenkeu.go.id
                      </div>
                    </div>
                  </div>
                )}

                {/* Document Title Header */}
                <div className="text-center mb-4">
                  <div className="text-[13px] font-extrabold uppercase underline tracking-wide text-slate-900">
                    JADWAL PENGAWASAN PENJAGAAN KEAMANAN
                  </div>
                  <div className="text-xs font-bold uppercase text-slate-800 mt-1">
                    BULAN {ID_MONTHS_TITLE[printMonth - 1].toUpperCase()} {printYear}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5">
                    Lokasi: Gedung Kantor Wilayah DJPb Provinsi Riau & Rumah Dinas Jabatan
                    {printOfficerFilter !== 'ALL' && ` • Petugas: ${printOfficerFilter}`}
                  </div>
                </div>

                {/* Table Rendering */}
                {printDocFormat === 'roster' ? (
                  <table className="w-full text-left border-collapse text-[10px] border border-slate-800 mb-4">
                    <thead>
                      <tr className="bg-slate-200 border-b border-slate-800 text-slate-900 font-extrabold uppercase text-center">
                        <th className="py-2 px-1.5 w-8 border-r border-slate-800">No.</th>
                        <th className="py-2 px-3 border-r border-slate-800 text-left">Nama Petugas</th>
                        <th className="py-2 px-3 border-r border-slate-800 w-44">Hari / Tanggal</th>
                        <th className="py-2 px-3 border-r border-slate-800 w-36">Lokasi / Pos</th>
                        <th className="py-2 px-2 border-slate-800 w-28">Jam Hadir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-400">
                      {printRosterData.map((item, idx) => {
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-1.5 text-center font-bold text-slate-700 border-r border-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-1.5 px-3 font-extrabold text-slate-900 border-r border-slate-400">
                              {item.name}
                            </td>
                            {printRowSpanMap[idx] !== undefined ? (
                              <td
                                rowSpan={printRowSpanMap[idx]}
                                className="py-1.5 px-3 border-r border-slate-800 text-center align-middle font-extrabold bg-slate-100/80 text-slate-900 border-b border-slate-800"
                              >
                                {item.dateStr}
                              </td>
                            ) : null}
                            <td className="py-1.5 px-3 font-bold border-r border-slate-400">
                              {item.location === 'KANWIL DJPB' ? (
                                <span className="text-blue-900 font-bold">KANWIL DJPB</span>
                              ) : item.location === 'RUMAH DINAS' ? (
                                <span className="text-teal-800 font-bold">RUMAH DINAS</span>
                              ) : (
                                <span className="text-slate-800 font-bold">{item.location}</span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-800">
                              {item.hours}
                            </td>
                          </tr>
                        );
                      })}
                      {printRosterData.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500 font-medium italic">
                            Tidak ada jadwal penjagaan yang tercatat untuk bulan {ID_MONTHS_TITLE[printMonth - 1]} {printYear}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  /* Matrix Format Table */
                  <table className="w-full text-left border-collapse text-[10px] border border-slate-800 mb-4">
                    <thead>
                      <tr className="bg-slate-200 border-b border-slate-800 text-slate-900 font-extrabold uppercase text-center">
                        <th className="py-2 px-1.5 w-8 border-r border-slate-800">No.</th>
                        <th className="py-2 px-3 border-r border-slate-800 w-44">Hari / Tanggal</th>
                        <th className="py-2 px-3 border-r border-slate-800">Shift Pagi (06.00 - 18.00)</th>
                        <th className="py-2 px-3 border-r border-slate-800">Shift Malam & Rumdin (18.00 - 06.00)</th>
                        <th className="py-2 px-3 border-r border-slate-800">Petugas Libur (Off)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-400">
                      {printMatrixData.map((shift, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1.5 px-1.5 text-center font-bold text-slate-700 border-r border-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-3 font-extrabold text-slate-900 border-r border-slate-400">
                            {shift.day}
                          </td>
                          <td className="py-1.5 px-3 font-bold text-blue-900 border-r border-slate-400">
                            {shift.morning}
                          </td>
                          <td className="py-1.5 px-3 font-bold text-indigo-900 border-r border-slate-400">
                            {shift.nightRumdin}
                          </td>
                          <td className="py-1.5 px-3 font-bold text-rose-700 border-r border-slate-400">
                            {shift.libur}
                          </td>
                        </tr>
                      ))}
                      {printMatrixData.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500 font-medium italic">
                            Tidak ada data matriks shift untuk bulan {ID_MONTHS_TITLE[printMonth - 1]} {printYear}.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

                {/* Summary Box */}
                <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-50 border border-slate-300 p-2 rounded text-[10px] text-slate-800">
                  <div>
                    <span className="text-slate-500">Total Penugasan:</span>{' '}
                    <strong>{printRosterData.length} Baris</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Jumlah Hari Terjadwal:</span>{' '}
                    <strong>{printMatrixData.length || new Set(printRosterData.map(r => r.dateStr)).size} Hari</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Personil Satpam Terdaftar:</span>{' '}
                    <strong>{uniqueNames.length || 6} Orang</strong>
                  </div>
                </div>

                {/* Signature Section */}
                {printIncludeSignature && (
                  <div className="pt-2 text-[10px] text-slate-900 break-inside-avoid">
                    <div className="grid grid-cols-2 gap-8 text-center">
                      {/* Left: Kasubbag Kepegawaian & RT */}
                      <div className="flex flex-col items-center">
                        <div className="font-bold">Mengetahui,</div>
                        <div className="font-bold">{signerKasubbagTitle}</div>
                        <div className="text-[9px] text-slate-600">Kanwil DJPb Provinsi Riau</div>
                        <div className="h-16 flex items-center justify-center">
                          {/* Signature stamp area */}
                        </div>
                        <div className="font-extrabold uppercase underline underline-offset-1">
                          {signerKasubbagName}
                        </div>
                        <div className="text-[9px] text-slate-700">NIP {signerKasubbagNip}</div>
                      </div>

                      {/* Right: Koordinator Keamanan */}
                      <div className="flex flex-col items-center">
                        <div>{printCityDate}</div>
                        <div className="font-bold">{signerKoorTitle}</div>
                        <div className="text-[9px] text-slate-600">Kanwil DJPb Provinsi Riau</div>
                        <div className="h-16 flex items-center justify-center">
                          {/* Signature stamp area */}
                        </div>
                        <div className="font-extrabold uppercase underline underline-offset-1">
                          {signerKoorName}
                        </div>
                        <div className="text-[9px] text-slate-700">Petugas Koordinator</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Print Footer */}
                <div className="mt-4 pt-2 border-t border-slate-200 text-[8px] text-slate-400 flex items-center justify-between">
                  <span>Dokumen Resmi Jadwal Keamanan Kanwil DJPb Provinsi Riau</span>
                  <span>Dicetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500">
                Pilihan: <strong className="text-slate-800">{ID_MONTHS_TITLE[printMonth - 1]} {printYear}</strong> • Format: <strong className="text-slate-800">{printDocFormat === 'roster' ? 'Tabel Roster Harian' : 'Matriks Shift'}</strong>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPrintPdfModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center space-x-1.5 shadow-xs"
                >
                  <FileDown className="w-4 h-4" />
                  <span>{isExportingPdf ? 'Menyusun Dokumen...' : 'Unduh PDF (.pdf)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
