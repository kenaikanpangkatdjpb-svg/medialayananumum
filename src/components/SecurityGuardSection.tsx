import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Shield, Plus, Trash2, Edit3, Check, X,
  FileSpreadsheet, Upload, Download, RotateCcw, AlertCircle, FileCheck,
  Search, Users, Home, Calendar, Clock, Sparkles, Filter, ExternalLink,
  Printer, FileDown, Eye, CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SecurityShift, SecurityRosterItem } from '../types';
import { INITIAL_SECURITY_SHIFTS, INITIAL_SECURITY_ROSTER, generateOctoberSecurityShifts, generateNovemberSecurityShifts, generateNovemberSecurityRoster } from '../mockData';
import { saveFirestoreCollection, subscribeFirestoreCollection, saveFirestoreDoc, getFirestoreDocOnce } from '../lib/firebase';
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

  // 1. First prioritize explicit "BULAN <MONTH>" or "PERIODE <MONTH>" pattern
  const explicitBulan = up.match(/(?:BULAN|PERIODE)\s+(JANUARI|JANUARY|FEBRUARI|FEBRUARY|MARET|MARCH|APRIL|MEI|MAY|JUNI|JUNE|JULI|JULY|AGUSTUS|AUGUST|SEPTEMBER|OKTOBER|OCTOBER|NOVEMBER|NOPEMBER|DESEMBER|DECEMBER|JAN|FEB|MAR|APR|JUN|JUL|AGU|AGS|AUG|SEP|SEPT|OKT|OCT|NOV|NOP|DES|DEC)\b/);
  const monthTokenToNum = (tok: string): number => {
    const t = tok.toUpperCase();
    if (t.startsWith('JAN')) return 1;
    if (t.startsWith('FEB')) return 2;
    if (t.startsWith('MAR')) return 3;
    if (t.startsWith('APR')) return 4;
    if (t === 'MEI' || t === 'MAY') return 5;
    if (t.startsWith('JUN')) return 6;
    if (t.startsWith('JUL')) return 7;
    if (t.startsWith('AGU') || t.startsWith('AGS') || t.startsWith('AUG') || t.startsWith('ASG')) return 8;
    if (t.startsWith('SEP')) return 9;
    if (t.startsWith('OKT') || t.startsWith('OCT')) return 10;
    if (t.startsWith('NOV') || t.startsWith('NOP')) return 11;
    if (t.startsWith('DES') || t.startsWith('DEC')) return 12;
    return -1;
  };

  if (explicitBulan) {
    month = monthTokenToNum(explicitBulan[1]);
  }

  // 2. Scan full month names neutrally (without bias toward any specific month)
  if (month === -1) {
    const fullMatch = up.match(/(?<![A-Z])(JANUARI|JANUARY|FEBRUARI|FEBRUARY|MARET|MARCH|APRIL|MEI|MAY|JUNI|JUNE|JULI|JULY|AGUSTUS|AUGUST|SEPTEMBER|OKTOBER|OCTOBER|NOVEMBER|NOPEMBER|DESEMBER|DECEMBER)(?![A-Z])/i);
    if (fullMatch) {
      month = monthTokenToNum(fullMatch[1]);
    }
  }

  // 3. Fallback to 3-4 letter month abbreviations
  if (month === -1) {
    const abbrMatch = up.match(/(?<![A-Z])(JAN|FEB|MAR|APR|JUN|JUL|AGU|AGS|AUG|ASG|SEPT|SEP|OKT|OCT|NOV|NOP|DES|DEC)(?![A-Z])/i);
    if (abbrMatch) {
      month = monthTokenToNum(abbrMatch[1]);
    }
  }

  const yMatch = up.match(/(?<!\d)(202[4-9]|203[0-9])(?!\d)/);
  const year = yMatch ? parseInt(yMatch[1], 10) : 2026;

  return month !== -1 ? { month, year } : null;
}

// Comprehensive parser for Excel date cells (serial number, Date object, formatted string, MM/DD vs DD/MM)
export function parseDateFromExcelCell(
  cellVal: any,
  contextMonth: number = 10,
  contextYear: number = 2026,
  preferMonthFirst: boolean = false
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
  // e.g. "06.00/18.00", "07.00 - 15.00 WIB", "06.00 s/d 18.00", "18.00/06.00", "06.00"
  if (
    /^\d{1,2}[\.:]\d{2}(?:\s*(?:[\/\-\–\—]|s\.?\s*\/?\s*d\.?|sd|to)\s*\d{1,2}[\.:]\d{2})+(?:\s*(?:WIB|WITA|WIT))?$/i.test(str) ||
    /^(shift\s*[123iv]+|pagi|malam|sore|siang|libur|off|lepas)$/i.test(str) ||
    /^\d{1,2}[\.:]\d{2}(?:\s*(?:WIB|WITA|WIT))?$/i.test(str)
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

  // 4. Word Month matching e.g. "Kamis/ 1 Oktober 2026", "16 NOVEMBER2026", "24 / NOVEMBER 2026", "1-Okt-26"
  const MONTH_PATTERN = 'januari|january|jan|februari|february|feb|maret|march|mar|april|apr|mei|may|juni|june|jun|juli|july|jul|agustus|august|agu|ags|aug|september|sept|sep|oktober|october|okt|oct|november|nopember|nov|nop|desember|december|des|dec';
  const wordMonthMatch = lower.match(new RegExp(`(?:(?:^|[^\\d])(\\d{1,2})[\\s\\/\\.\\,\\-]*(${MONTH_PATTERN})(?![a-z])|(?<![a-z])(${MONTH_PATTERN})[\\s\\/\\.\\,\\-]+(\\d{1,2})(?!\\d))(?:[\\s\\/\\.\\,\\-]*(\\d{2,4})\\b)?`, 'i'));
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
    else if (mStr.startsWith('nov') || mStr.startsWith('nop')) month = 11;
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

  // 4b. Roman numeral month matching e.g. "01/XI/2026", "1-XI-2026", "1 XI 2026"
  const romanMatch = lower.match(/(?:^|[^\d])(\d{1,2})[\s\/\.\-]+(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)(?:[\s\/\.\-]+(\d{2,4}))?(?![a-z0-9])/i);
  if (romanMatch) {
    const ROMAN_MONTHS: Record<string, number> = {
      i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12
    };
    const day = parseInt(romanMatch[1], 10);
    const month = ROMAN_MONTHS[romanMatch[2].toLowerCase()] || -1;
    if (month !== -1 && day >= 1 && day <= 31) {
      let year = contextYear;
      if (romanMatch[3]) {
        const y = parseInt(romanMatch[3], 10);
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

  // 5. Numeric 3-part dates: e.g. "01/11/2026", "11/01/2026", "2026-11-01", "1-11-2026", "01.11.2026"
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
      if (p1 > 12 && p2 <= 12) {
        day = p1;
        month = p2;
      } else if (p2 > 12 && p1 <= 12) {
        day = p2;
        month = p1;
      } else if (preferMonthFirst) {
        month = p1;
        day = p2;
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

  // 5b. Numeric 2-part dates without year: e.g. "01/11", "1-11" (slash or dash only so 06.00 time is never matched)
  const twoPartMatch = lower.match(/(?:^|[^\d])(\d{1,2})[\/\-](\d{1,2})(?!\d)/);
  if (twoPartMatch) {
    const p1 = parseInt(twoPartMatch[1], 10);
    const p2 = parseInt(twoPartMatch[2], 10);
    let day = p1;
    let month = p2;
    if (p1 > 12 && p2 <= 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12 && p1 <= 12) {
      day = p2;
      month = p1;
    } else if (preferMonthFirst) {
      month = p1;
      day = p2;
    }
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const dObj = new Date(contextYear, month - 1, day);
      return {
        year: contextYear,
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
export function normalizeDateKey(
  dateStr: string,
  contextMonth: number = 10,
  contextYear: number = 2026,
  preferMonthFirst: boolean = false
): string {
  if (!dateStr) return '';
  const parsed = parseDateFromExcelCell(dateStr, contextMonth, contextYear, preferMonthFirst);
  if (parsed) {
    return `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`;
  }
  return String(dateStr).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Standard display format for a date string: HARI/ Day Bulan Tahun (e.g. KAMIS/ 1 Oktober 2026)
export function formatStandardDateStr(
  dateStr: string,
  contextMonth: number = 10,
  contextYear: number = 2026,
  preferMonthFirst: boolean = false
): string {
  if (!dateStr) return '';
  const parsed = parseDateFromExcelCell(dateStr, contextMonth, contextYear, preferMonthFirst);
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

// Infer dominant month and year from a roster list by counting explicit month occurrences
export function inferDominantMonthYear(roster: SecurityRosterItem[]): { month: number; year: number } {
  const counts = new Map<string, { month: number; year: number; count: number }>();
  for (const it of roster || []) {
    const info = extractMonthAndYearFromText(it?.dateStr || '');
    if (info) {
      const k = `${info.year}-${info.month}`;
      const existing = counts.get(k);
      if (existing) {
        existing.count++;
      } else {
        counts.set(k, { month: info.month, year: info.year, count: 1 });
      }
    }
  }
  let best: { month: number; year: number; count: number } | null = null;
  counts.forEach((v) => {
    if (!best || v.count > best.count) best = v;
  });
  if (best) return { month: (best as { month: number; year: number }).month, year: (best as { month: number; year: number }).year };

  try {
    const savedTitle = (typeof localStorage !== 'undefined' && localStorage.getItem('melayu_security_doc_title')) || '';
    const titleInfo = extractMonthAndYearFromText(savedTitle);
    if (titleInfo) return titleInfo;
  } catch (e) {}

  return { month: 11, year: 2026 };
}

// Uniform daily duty slot order:
// 1. KANWIL DJPB Pagi (06.00 / 18.00) -> 2. Shift Sore (14.00 / 22.00) -> 3. KANWIL DJPB Malam (18.00 / 06.00) -> 4. Pos Lain -> 5. RUMAH DINAS (18.00 / 06.00) -> 6. LIBUR
function getDutySlotRank(item: SecurityRosterItem): number {
  const loc = (item.location || '').toUpperCase();
  const hrs = (item.hours || '').trim();
  if (loc.includes('LIBUR') || loc === 'OFF' || loc === 'LEPAS' || loc === 'L') return 40;
  if (loc.includes('RUMAH') || loc.includes('RUMDIN')) return 30;
  if (isMorningHours(hrs, loc)) return 10;
  if (isEveningHours(hrs, loc)) return 15;
  if (isNightHours(hrs, loc)) return 20;
  if (!hrs || hrs === '-') return 28;
  return 25;
}

// Sort roster chronologically with uniform daily shift/location order (preserving within-shift orderIndex)
export function sortRosterChronologically(
  list: SecurityRosterItem[],
  contextMonth?: number,
  contextYear?: number
): SecurityRosterItem[] {
  const inferred = (!contextMonth || !contextYear) ? inferDominantMonthYear(list || []) : null;
  const effMonth = contextMonth || inferred?.month || 11;
  const effYear = contextYear || inferred?.year || 2026;

  return [...list].sort((a, b) => {
    const keyA = normalizeDateKey(a.dateStr || '', effMonth, effYear);
    const keyB = normalizeDateKey(b.dateStr || '', effMonth, effYear);
    const isIsoA = /^\d{4}-\d{2}-\d{2}$/.test(keyA);
    const isIsoB = /^\d{4}-\d{2}-\d{2}$/.test(keyB);

    // 1. Chronological date order when both are valid ISO dates (ISO dates always sort ahead of unparsed strings)
    if (isIsoA !== isIsoB) {
      return isIsoA ? -1 : 1;
    }
    if (isIsoA && isIsoB && keyA !== keyB) {
      return keyA.localeCompare(keyB);
    }
    if (!isIsoA && !isIsoB && keyA !== keyB) {
      return keyA.localeCompare(keyB);
    }

    // 2. Enforce uniform daily duty slot order (KANWIL Pagi -> Sore -> KANWIL Malam -> RUMAH DINAS -> LIBUR)
    const slotA = getDutySlotRank(a);
    const slotB = getDutySlotRank(b);
    if (slotA !== slotB) {
      return slotA - slotB;
    }

    // 3. Preserve relative Excel row order (orderIndex) within the same shift/location slot
    const hasOrderA = typeof a.orderIndex === 'number';
    const hasOrderB = typeof b.orderIndex === 'number';
    if (hasOrderA && hasOrderB && a.orderIndex !== b.orderIndex) {
      return a.orderIndex! - b.orderIndex!;
    }

    // 4. Fallback: Jam Hadir -> Lokasi -> Nama
    const hourA = getHourSortValue(a.hours || '', a.location || '');
    const hourB = getHourSortValue(b.hours || '', b.location || '');
    if (hourA !== hourB) {
      return hourA - hourB;
    }

    const locRank = (loc: string) => {
      const up = (loc || '').toUpperCase();
      if (up.includes('KANWIL')) return 1;
      if (up.includes('RUMAH') || up.includes('RUMDIN')) return 2;
      if (up.includes('LIBUR')) return 3;
      return 4;
    };
    const rankA = locRank(a.location || '');
    const rankB = locRank(b.location || '');
    if (rankA !== rankB) {
      return rankA - rankB;
    }

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

// Helper to split multiple guard names in a single cell whether delimited by /, comma, &, newline, dan, or space-concatenated
export function splitMultipleGuardNames(text: string): string[] {
  if (!text) return [];
  const trimmed = text.trim();
  const standardDelim = trimmed
    .replace(/(\(?\d+[\.\-\)]\s*)/g, '\n$1')
    .split(/[\/\n\r,&;]|\s+-\s+|\bdan\b/i)
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

  if (location && (location.toUpperCase().includes('RUMAH') || location.toUpperCase().includes('RUMDIN'))) {
    return false;
  }

  if (isEveningHours(hours, location)) return false;

  const tMatch = trimmed.match(/(\d{1,2})[\.:]\d{2}/);
  if (tMatch) {
    const startH = parseInt(tMatch[1], 10);
    if (startH >= 5 && startH <= 11) return true;
    if (startH >= 18 || startH <= 4) return false;
  }

  if (
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

// Helper to determine whether a given hours string and location represents evening shift (12.00 - 17.59 / Sore)
export function isEveningHours(hours: string, location?: string): boolean {
  if (!hours || hours.trim() === '-' || (location && location.toUpperCase().includes('LIBUR'))) return false;
  const trimmed = hours.trim();
  const up = trimmed.toUpperCase();
  const tMatch = trimmed.match(/(\d{1,2})[\.:]\d{2}/);
  if (tMatch) {
    const startH = parseInt(tMatch[1], 10);
    if (startH >= 12 && startH <= 17) return true;
  }
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

// Helper to determine whether a given hours string and location represents night shift (18.00 - 04.59 / Malam / Rumah Dinas)
export function isNightHours(hours: string, location?: string): boolean {
  if (!hours || hours.trim() === '-' || (location && location.toUpperCase().includes('LIBUR'))) return false;
  const trimmed = hours.trim();
  const up = trimmed.toUpperCase();

  if (location && (location.toUpperCase().includes('RUMAH') || location.toUpperCase().includes('RUMDIN'))) return true;

  const tMatch = trimmed.match(/(\d{1,2})[\.:]\d{2}/);
  if (tMatch) {
    const startH = parseInt(tMatch[1], 10);
    if (startH >= 18 || startH <= 4) return true;
    return false;
  }

  if (
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
  if (!up || up === '-' || up === '0' || up === 'X' || up.includes('LIBUR') || /\bOFF\b/.test(up) || /\bLEPAS\b/.test(up) || up === 'L') {
    return { location: 'LIBUR', hours: '-', shiftType: 'libur' };
  }
  if (up.includes('RUMAH') || up.includes('RUMDIN') || up.includes('JABATAN') || up === 'RD' || up === 'R') {
    return { location: 'RUMAH DINAS', hours: '18.00 / 06.00', shiftType: 'rumdin' };
  }

  // Common shorthand codes for calendar/matrix grids
  if (up === 'KP' || up === 'PK' || up === 'P1' || up === 'P2' || up === 'PG') {
    return { location: 'KANWIL DJPB', hours: '06.00 / 18.00', shiftType: 'morning' };
  }
  if (up === 'KM' || up === 'MK' || up === 'M1' || up === 'M2' || up === 'ML') {
    return { location: 'KANWIL DJPB', hours: '18.00 / 06.00', shiftType: 'night' };
  }
  if (up === 'S1' || up === 'S2' || up === 'SR') {
    return { location: 'KANWIL DJPB', hours: '14.00 / 22.00', shiftType: 'evening' };
  }

  // Check Evening first (14.00)
  if (isEveningHours(up)) {
    return { location: 'KANWIL DJPB', hours: '14.00 / 22.00', shiftType: 'evening' };
  }

  // Check Night next (18.00 / 18.00/06.00 / MALAM / M / SHIFT 3)
  if (isNightHours(up)) {
    return { location: 'KANWIL DJPB', hours: '18.00 / 06.00', shiftType: 'night' };
  }

  // Check Morning (06.00 / 06.00/18.00 / PAGI / P / SHIFT 1)
  if (isMorningHours(up)) {
    return { location: 'KANWIL DJPB', hours: '06.00 / 18.00', shiftType: 'morning' };
  }

  return { location: 'KANWIL DJPB', hours: '06.00 / 18.00', shiftType: 'morning' };
}

// Normalize raw hours text while preserving explicit Excel time ranges verbatim
export function normalizeHours(rawHours: string, location: string): string {
  const normLoc = (location || '').trim().toUpperCase();
  if (normLoc.includes('LIBUR') || normLoc === 'OFF' || normLoc === 'LEPAS' || normLoc === 'L') {
    return '-';
  }
  const trimmed = (rawHours || '').trim();
  const up = trimmed.toUpperCase();
  if (!trimmed || trimmed === '-' || trimmed === '0' || up === 'LIBUR' || up === 'OFF' || up === 'LEPAS' || up === 'L') {
    return '-';
  }

  // If Excel already contains an explicit time range (e.g. "06.00/18.00", "07.00 - 19.00", "06:00 - 14:00"), keep it verbatim!
  if (/\d{1,2}[\.:]\d{2}\s*[\/\-\–\—\s]+\s*\d{1,2}[\.:]\d{2}/.test(trimmed)) {
    return trimmed;
  }

  // Convert shorthand labels/codes into standard shift hours
  if (up === 'PAGI' || up === 'P' || up === 'SHIFT 1' || up === 'SHIFT I' || up === '1' || up === '06-18' || up === '06/18') {
    return '06.00/18.00';
  }
  if (up === 'SORE' || up === 'SIANG' || up === 'S' || up === 'SHIFT 2' || up === 'SHIFT II' || up === '2' || up === '14-22' || up === '14/22') {
    return '14.00/22.00';
  }
  if (up === 'MALAM' || up === 'M' || up === 'SHIFT 3' || up === 'SHIFT III' || up === '3' || up === '18-06' || up === '18/06') {
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

// Deduplicate exact duplicate roster entries while preserving exact Excel names, locations, hours, and dates
export function deduplicateRoster(roster: SecurityRosterItem[], contextMonth?: number, contextYear?: number): SecurityRosterItem[] {
  if (!roster || roster.length === 0) return [];
  
  // Detect dominant month & year dynamically from the roster if not provided
  const inferred = (!contextMonth || !contextYear) ? inferDominantMonthYear(roster) : null;
  const effMonth = contextMonth || inferred?.month || 11;
  const effYear = contextYear || inferred?.year || 2026;

  const seenKeys = new Set<string>();
  const cleanList: SecurityRosterItem[] = [];

  for (const rawItem of roster) {
    if (!rawItem) continue;
    const rawName = (rawItem.name || '').trim().replace(/\s+/g, ' ');
    const rawDate = (rawItem.dateStr || '').trim();
    if (!rawName || !rawDate) continue;

    const rawNameUp = rawName.toUpperCase();

    // Skip if name is literally placeholder or separator
    if (rawNameUp === 'LIBUR' || rawNameUp === 'OFF' || rawNameUp === 'LEPAS' || rawNameUp === '-' || rawNameUp === '0') {
      continue;
    }

    // Check if name cell contains multiple officers (e.g. "ROBBY / DIAN ARI")
    const hasAcademicDegree = /,\s*(S\.|M\.|A\.Md|SH|SE|ST|MM|AK)/i.test(rawName);
    const subNames = (rawName.includes('/') || rawName.includes('\n') || rawName.includes('&') || / dan /i.test(rawName) || (rawName.includes(',') && !hasAcademicDegree))
      ? rawName.split(/[\/\n\r,&]| dan | DAN /).map(n => n.trim().replace(/^\d+[\.\-\)]\s*/, '')).filter(Boolean)
      : [rawName];

    for (const subName of subNames) {
      const displayName = subName.trim().replace(/\s+/g, ' ');
      const nameKey = displayName.toUpperCase();
      if (!displayName || nameKey === 'LIBUR' || nameKey === 'OFF' || nameKey === 'LEPAS' || nameKey === '-') continue;

      const itemMonthInfo = extractMonthAndYearFromText(rawDate);
      const curMonth = itemMonthInfo?.month || effMonth;
      const curYear = itemMonthInfo?.year || effYear;
      const dateKey = normalizeDateKey(rawDate, curMonth, curYear);
      if (!dateKey) continue;

      const rawLocClean = (rawItem.location || '').trim().replace(/\s+/g, ' ');
      let normLoc = rawLocClean ? rawLocClean.toUpperCase() : 'KANWIL DJPB';
      let normHours = normalizeHours(rawItem.hours || '', normLoc);

      const isLibur = 
        normLoc === 'LIBUR' || normLoc === 'OFF' || normLoc === 'LEPAS' || normLoc === 'L' ||
        normLoc.includes('LIBUR') ||
        (rawItem.hours || '').toUpperCase().includes('LIBUR') || /\bOFF\b/.test((rawItem.hours || '').toUpperCase());

      if (isLibur) {
        normLoc = 'LIBUR';
        normHours = '-';
      } else if (!normHours) {
        normHours = '-';
      }

      // Deduplication key: removes exact duplicate rows without discarding distinct shifts
      const key = `${dateKey}___${nameKey}___${normLoc}___${normHours.toUpperCase()}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        const stdDateStr = formatStandardDateStr(rawDate, curMonth, curYear);
        const safeNameSlug = nameKey.replace(/[^a-zA-Z0-9_-]/g, '_');
        cleanList.push({
          ...rawItem,
          id: rawItem.id ? String(rawItem.id).replace(/[^a-zA-Z0-9_-]/g, '_') : `ros-${dateKey}-${safeNameSlug}-${cleanList.length}`,
          name: displayName,
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
    if (saved && saved !== 'JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN OKTOBER 2026') {
      return saved;
    }
    return 'JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN NOVEMBER 2026';
  });

  const [dynamicHeaders, setDynamicHeaders] = useState<string[]>(() => {
    const saved = localStorage.getItem('melayu_security_doc_headers');
    return saved ? JSON.parse(saved) : ['NO.', 'NAMA PETUGAS', 'HARI / TANGGAL', 'LOKASI / POS', 'JAM HADIR'];
  });

  // Sync security configuration (docTitle, headers) across all PCs
  useEffect(() => {
    const unsubConfig = subscribeFirestoreCollection<{ id: string; docTitle?: string; dynamicHeaders?: string[]; nov2026PresetApplied?: boolean }>(
      'security_config',
      [{ id: 'main', docTitle: 'JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN NOVEMBER 2026', dynamicHeaders: ['NO.', 'NAMA PETUGAS', 'HARI / TANGGAL', 'LOKASI / POS', 'JAM HADIR'] }],
      (configs) => {
        const mainConfig = configs.find(c => c.id === 'main');
        if (mainConfig) {
          if (mainConfig.nov2026PresetApplied === true) {
            safeLocalStorageSet('melayu_security_nov2026_preset_applied', 'true');
          }
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

    let cancelled = false;
    const ensureNov2026CloudSync = async () => {
      if (!isAdmin) return;
      const isCleared = localStorage.getItem('melayu_security_roster_cleared') === 'true';
      const alreadyMigrated = localStorage.getItem('melayu_security_nov2026_preset_applied') === 'true';
      const isCustomUploaded = localStorage.getItem('melayu_security_roster_custom_uploaded') === 'true';
      if (isCleared || alreadyMigrated || isCustomUploaded) return;

      const remoteCfg = await getFirestoreDocOnce<{ docTitle?: string; nov2026PresetApplied?: boolean }>('security_config', 'main');
      if (cancelled) return;
      if (localStorage.getItem('melayu_security_roster_custom_uploaded') === 'true') return;
      if (remoteCfg?.nov2026PresetApplied === true) {
        safeLocalStorageSet('melayu_security_nov2026_preset_applied', 'true');
        return;
      }

      const novRoster = generateNovemberSecurityRoster();
      const novShifts = generateNovemberSecurityShifts();
      const novTitle = 'JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN NOVEMBER 2026';
      safeLocalStorageSet('melayu_security_nov2026_preset_applied', 'true');
      safeLocalStorageSet('melayu_security_doc_title', novTitle);
      safeLocalStorageSet('melayu_deleted_security_roster_ids', JSON.stringify([]));
      safeLocalStorageSet('melayu_security_roster', JSON.stringify(novRoster));
      safeLocalStorageSet('melayu_security_shifts', JSON.stringify(novShifts));
      if (setSecurityRoster) setSecurityRoster(novRoster);
      if (setSecurityShifts) setSecurityShifts(novShifts);
      setDocTitle(novTitle);
      saveFirestoreCollection('security_roster', novRoster);
      saveFirestoreCollection('security_shifts', novShifts);
      saveFirestoreDoc('security_config', {
        id: 'main',
        docTitle: novTitle,
        dynamicHeaders: ['NO.', 'NAMA PETUGAS', 'HARI / TANGGAL', 'LOKASI / POS', 'JAM HADIR'],
        nov2026PresetApplied: true,
        updatedAt: new Date().toISOString()
      });
    };
    ensureNov2026CloudSync();

    return () => {
      cancelled = true;
      unsubConfig();
    };
  }, [isAdmin]);

  // Sync print and delete target months whenever document title changes
  useEffect(() => {
    const mInfo = extractMonthAndYearFromText(docTitle);
    if (mInfo) {
      setPrintMonth(mInfo.month);
      setPrintYear(mInfo.year);
      setDeleteTargetMonth(mInfo.month);
      setDeleteTargetYear(mInfo.year);
    }
  }, [docTitle]);

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
  const [previewDocTitle, setPreviewDocTitle] = useState<string>('JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN NOVEMBER 2026');
  const [previewDocHeaders, setPreviewDocHeaders] = useState<string[]>(['NO.', 'NAMA PETUGAS', 'HARI / TANGGAL', 'LOKASI / POS', 'JAM HADIR']);
  const [excelFileName, setExcelFileName] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [uploadedWorkbook, setUploadedWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [previewMonth, setPreviewMonth] = useState<number>(11);
  const [previewYear, setPreviewYear] = useState<number>(2026);
  const [previewFormatLabel, setPreviewFormatLabel] = useState<string>('Tabel Roster');
  const [previewColOptions, setPreviewColOptions] = useState<{ idx: number; label: string }[]>([]);
  const [previewTabularMap, setPreviewTabularMap] = useState<{ name: number; date: number; loc: number; hours: number } | null>(null);
  const [isApplyingExcel, setIsApplyingExcel] = useState(false);

  // Roster Add / Edit Modal
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [editingRosterId, setEditingRosterId] = useState<string | null>(null);
  const [rosterForm, setRosterForm] = useState<Omit<SecurityRosterItem, 'id'>>({
    name: 'DIAN ARI',
    dateStr: 'MINGGU/ 1 November 2026',
    location: 'KANWIL DJPB',
    hours: '06.00 / 18.00'
  });

  // Matrix Shift Add / Edit Modal
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShiftIndex, setEditingShiftIndex] = useState<number | null>(null);
  const [shiftForm, setShiftForm] = useState<SecurityShift>({
    day: 'Minggu',
    shiftMorning: '',
    shiftEvening: '',
    shiftNight: ''
  });

  // Print PDF Modal States (Cetak PDF Penjagaan Security Sesuai Bulan)
  const [showPrintPdfModal, setShowPrintPdfModal] = useState(false);
  const [printMonth, setPrintMonth] = useState<number>(11);
  const [printYear, setPrintYear] = useState<number>(2026);
  const [printDocFormat, setPrintDocFormat] = useState<'roster' | 'matrix'>('roster');
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [printOfficerFilter, setPrintOfficerFilter] = useState<string>('ALL');
  const [printIncludeKop, setPrintIncludeKop] = useState(true);
  const [printIncludeSignature, setPrintIncludeSignature] = useState(true);
  const [printCityDate, setPrintCityDate] = useState('Pekanbaru, 30 November 2026');
  const [signerKasubbagTitle] = useState('Kasubbag Kepegawaian dan Rumah Tangga');
  const [signerKasubbagName] = useState('HENDRA SUTIKNO');
  const [signerKasubbagNip] = useState('19780512 200212 1 002');
  const [signerKoorTitle] = useState('Koordinator / Komandan Regu Keamanan');
  const [signerKoorName] = useState('DIAN ARI');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [deleteTargetMonth, setDeleteTargetMonth] = useState<number>(11);
  const [deleteTargetYear, setDeleteTargetYear] = useState<number>(2026);

  // Count exact duplicate rows matching deduplicateRoster logic
  const duplicateCount = useMemo(() => {
    const list = securityRoster || [];
    const seen = new Set<string>();
    let dupes = 0;
    for (const item of list) {
      if (!item) continue;
      const rawName = (item.name || '').trim().replace(/\s+/g, ' ');
      const rawDate = (item.dateStr || '').trim();
      const nameKey = rawName.toUpperCase();
      if (!nameKey || !rawDate || nameKey === 'LIBUR' || nameKey === 'OFF' || nameKey === 'LEPAS' || nameKey === '-') continue;

      const dateKey = normalizeDateKey(rawDate);
      if (!dateKey) continue;
      const rawLocClean = (item.location || '').trim().replace(/\s+/g, ' ');
      let normLoc = rawLocClean ? rawLocClean.toUpperCase() : 'KANWIL DJPB';
      let normHours = normalizeHours(item.hours || '', normLoc);
      const isLibur = normLoc.includes('LIBUR') || normLoc === 'OFF' || normLoc === 'LEPAS' || normLoc === 'L';
      if (isLibur) {
        normLoc = 'LIBUR';
        normHours = '-';
      } else if (!normHours) {
        normHours = '-';
      }
      const key = `${dateKey}___${nameKey}___${normLoc}___${normHours.toUpperCase()}`;
      if (seen.has(key)) {
        dupes++;
      } else {
        seen.add(key);
      }
    }
    return dupes;
  }, [securityRoster]);

  // Uploaded Excel data is preserved verbatim without reactive pattern overrides.

  // Handler to load official November 2026 schedule (1-30 November 2026) matching the standard image layout
  const handleLoadNovember2026Roster = () => {
    if (!setSecurityRoster) return;
    const novRoster = generateNovemberSecurityRoster();
    const novShifts = generateNovemberSecurityShifts();
    const novTitle = 'JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN NOVEMBER 2026';

    try {
      localStorage.removeItem('melayu_security_roster_cleared');
      localStorage.removeItem('melayu_security_roster_user_modified');
    } catch (e) {}
    safeLocalStorageSet('melayu_deleted_security_roster_ids', JSON.stringify([]));
    safeLocalStorageSet('melayu_security_nov2026_preset_applied', 'true');
    safeLocalStorageSet('melayu_security_doc_title', novTitle);

    setSecurityRoster(novRoster);
    safeLocalStorageSet('melayu_security_roster', JSON.stringify(novRoster));
    saveFirestoreCollection('security_roster', novRoster);

    if (setSecurityShifts) {
      setSecurityShifts(novShifts);
      safeLocalStorageSet('melayu_security_shifts', JSON.stringify(novShifts));
      saveFirestoreCollection('security_shifts', novShifts);
    }

    setDocTitle(novTitle);
    setPrintMonth(11);
    setPrintYear(2026);
    setDeleteTargetMonth(11);
    setDeleteTargetYear(2026);
    setSearchQuery('');
    setSelectedLocation('ALL');
    setSelectedDate('ALL');

    saveFirestoreDoc('security_config', {
      id: 'main',
      docTitle: novTitle,
      dynamicHeaders: ['NO.', 'NAMA PETUGAS', 'HARI / TANGGAL', 'LOKASI / POS', 'JAM HADIR'],
      nov2026PresetApplied: true,
      updatedAt: new Date().toISOString()
    });

    setSuccessNotice(
      `BERHASIL DISINKRONKAN! Jadwal Penjagaan Security Bulan November 2026 (1–30 November 2026, 180 baris) telah dimuat sesuai susunan resmi.`
    );
    setTimeout(() => setSuccessNotice(''), 7000);
  };

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

  // Clean and deduplicate exact duplicate roster rows handler
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
      setSuccessNotice(`BERHASIL DIBERSIHKAN! Sebanyak ${removed} data diselaraskan dan duplikasi dibersihkan.`);
    } else {
      setSuccessNotice(`Data roster pengawasan penjagaan keamanan sudah bersih dan rapi.`);
    }
    setTimeout(() => setSuccessNotice(''), 6000);
  };

  // Filtered Roster Data (Preserves uploaded Excel rows verbatim, sorted chronologically)
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

    const filteredDeleted = list.filter(item => item && !deletedIdsSet.has(item.id));
    const isCustomUploaded = localStorage.getItem('melayu_security_roster_custom_uploaded') === 'true';
    const isUserModified = localStorage.getItem('melayu_security_roster_user_modified') === 'true';

    let baseList = filteredDeleted;
    if (!isCleared && !isUserModified && !isCustomUploaded && baseList.length === 0 && INITIAL_SECURITY_ROSTER && INITIAL_SECURITY_ROSTER.length > 0) {
      baseList = INITIAL_SECURITY_ROSTER.filter(item => !deletedIdsSet.has(item.id));
    }

    const dom = inferDominantMonthYear(baseList);
    const finalClean = deduplicateRoster(baseList, dom.month, dom.year);
    return sortRosterChronologically(finalClean, dom.month, dom.year);
  }, [securityRoster]);

  const uniqueLocations = useMemo(() => {
    return Array.from(new Set(safeRoster.map(r => (r?.location || '').trim().toUpperCase()).filter(Boolean)));
  }, [safeRoster]);

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

    if (!map.has('2026-11')) {
      map.set('2026-11', {
        month: 11,
        year: 2026,
        label: 'November 2026',
        count: (safeRoster || []).filter(r => (r?.dateStr || '').toLowerCase().includes('november')).length
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

    return sortRosterChronologically(filtered, printMonth, printYear);
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
      } else if (item.location.includes('RUMAH') || item.location.includes('RUMDIN')) {
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
        if (item.location === 'LIBUR' || item.location.includes('LIBUR')) {
          grp.libur.push(item.name);
        } else if (item.location.includes('RUMAH') || item.location.includes('RUMDIN')) {
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

  // Helper to extract worksheet grid while expanding merged cells and decoding Excel serial dates accurately
  const extractSheetRowsWithMerges = (ws: XLSX.WorkSheet, date1904: boolean = false): { rows: string[][]; rowHasMerge: Set<string> } => {
    const ref = ws['!ref'];
    if (!ref) return { rows: [], rowHasMerge: new Set() };
    const range = XLSX.utils.decode_range(ref);
    const numRows = range.e.r + 1;
    const numCols = range.e.c + 1;
    const grid: string[][] = Array.from({ length: numRows }, () => Array(numCols).fill(''));
    const rowHasMerge = new Set<string>();

    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (!cell) continue;
        let val = '';
        if (cell.t === 'n' && typeof cell.v === 'number') {
          if (cell.v > 20000 && ((cell.z && XLSX.SSF.is_date(cell.z)) || (cell.v >= 35000 && cell.v <= 70000))) {
            const d = XLSX.SSF.parse_date_code(cell.v, { date1904 });
            if (d && d.y >= 1900 && d.m >= 1 && d.m <= 12 && d.d >= 1 && d.d <= 31) {
              const dObj = new Date(d.y, d.m - 1, d.d);
              val = `${ID_DAYS_UPPER[dObj.getDay()]}/ ${d.d} ${ID_MONTHS_TITLE[d.m - 1]} ${d.y}`;
            } else {
              val = cell.w !== undefined ? String(cell.w).trim() : String(cell.v).trim();
            }
          } else if (cell.v >= 0 && cell.v < 1 && cell.z && XLSX.SSF.is_date(cell.z)) {
            const d = XLSX.SSF.parse_date_code(cell.v, { date1904 });
            if (d) {
              val = `${String(d.H || 0).padStart(2, '0')}.${String(d.M || 0).padStart(2, '0')}`;
            } else {
              val = String(cell.v).trim();
            }
          } else {
            const wStr = cell.w !== undefined ? String(cell.w).trim() : '';
            val = (wStr && !/^#+$/.test(wStr)) ? wStr : String(cell.v).trim();
          }
        } else if (cell.t === 'd' && cell.v instanceof Date && !isNaN(cell.v.getTime())) {
          const dt = cell.v;
          val = `${ID_DAYS_UPPER[dt.getDay()]}/ ${dt.getDate()} ${ID_MONTHS_TITLE[dt.getMonth()]} ${dt.getFullYear()}`;
        } else if (cell.t === 's' || cell.t === 'str') {
          // Prefer exact string value cell.v over cell.w which SheetJS can truncate/mask for narrow columns
          val = String(cell.v ?? cell.w ?? '').trim();
        } else {
          const wStr = cell.w !== undefined ? String(cell.w).trim() : '';
          val = (wStr && !/^#+$/.test(wStr)) ? wStr : String(cell.v ?? '').trim();
        }
        grid[r][c] = val.replace(/[\u00A0\u200B\uFEFF]+/g, ' ').trim();
      }
    }

    const merges = ws['!merges'] || [];
    for (const m of merges) {
      const topLeftVal = (grid[m.s.r]?.[m.s.c] || '').trim();
      for (let r = m.s.r; r <= Math.min(m.e.r, numRows - 1); r++) {
        for (let c = m.s.c; c <= Math.min(m.e.c, numCols - 1); c++) {
          if (r === m.s.r && c === m.s.c) continue;
          rowHasMerge.add(`${r}:${c}`);
          if (topLeftVal && !grid[r][c]) {
            grid[r][c] = topLeftVal;
          }
        }
      }
    }

    return { rows: grid, rowHasMerge };
  };

  // Helper to parse any sheet from an Excel workbook with custom target month/year and optional tabular column override
  const parseWorkbookSheet = (
    wb: XLSX.WorkBook,
    targetSheetName: string,
    targetMonth: number = 10,
    targetYear: number = 2026,
    fileName?: string,
    respectExplicitMonth: boolean = false,
    colMapOverride?: { name: number; date: number; loc: number; hours: number } | null
  ) => {
    try {
      const ws = wb.Sheets[targetSheetName];
      if (!ws) {
        alert(`Lembar kerja "${targetSheetName}" tidak ditemukan.`);
        return;
      }
      const date1904 = Boolean(wb.Workbook?.WBProps?.date1904);
      const { rows: rawRows, rowHasMerge } = extractSheetRowsWithMerges(ws, date1904);
      if (!rawRows || rawRows.length < 1) {
        alert(`Lembar kerja "${targetSheetName}" kosong.`);
        return;
      }

      let detectedTitle = `JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN ${ID_MONTHS_TITLE[targetMonth - 1].toUpperCase()} ${targetYear}`;
      let headerRowIdx = -1;
      let bestScore = 0;

      const isCalendarCellToken = (raw: string): boolean => {
        const val = raw.trim().toUpperCase();
        if (!val) return false;
        if (/^0?([1-9]|[12]\d|3[01])$/.test(val)) return true;
        if (/^(TGL|TANGGAL)\s*0?([1-9]|[12]\d|3[01])$/.test(val)) return true;
        if (/^\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?$/.test(val)) return true;
        if (/^\d{1,2}[\s\/\-]+(JAN|FEB|MAR|APR|MEI|MAY|JUN|JUL|AGU|AGS|AUG|SEP|SEPT|OKT|OCT|NOV|NOP|DES|DEC)\b/i.test(val)) return true;
        if (/\b(?:SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU|MINGGU)\b/.test(val) && /\d{1,2}/.test(val)) return true;
        return false;
      };

      // Scan first 30 rows for header row using unique cell values
      for (let r = 0; r < Math.min(rawRows.length, 30); r++) {
        const rowArr = rawRows[r] || [];
        const uniqueRowVals = Array.from(new Set(rowArr.map(c => String(c || '').trim()).filter(Boolean)));
        if (uniqueRowVals.length < 2) continue;

        let dayNumCount = 0;
        let calCellCount = 0;
        rowArr.forEach(c => {
          const s = String(c || '').trim();
          if (/^0?([1-9]|[12]\d|3[01])$/.test(s)) dayNumCount++;
          if (isCalendarCellToken(s)) calCellCount++;
        });

        // Skip rows that look like single-date data rows (unless the row is a horizontal calendar header row with >= 7 dates)
        const hasFullDataDate = calCellCount < 7 && uniqueRowVals.some(v =>
          (/^\s*(SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU|MINGGU)\s*$/i.test(v)) ||
          (/\b(SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU|MINGGU)\b/i.test(v) && /\d{1,2}/.test(v)) ||
          /^\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}$/.test(v)
        );
        if (hasFullDataDate) continue;

        let score = 0;
        uniqueRowVals.forEach(rawCell => {
          const val = rawCell.toUpperCase();
          if (val.length > 50) return;
          if (val.includes('NAMA') || val.includes('PETUGAS') || val.includes('PERSONIL') || val.includes('PERSONEL') || val.includes('SATPAM') || val.includes('SECURITY') || val.includes('ANGGOTA')) score += 4;
          if (val.includes('HARI') || val.includes('TANGGAL') || val.includes('TGL') || val.includes('DATE')) score += 4;
          if (val.includes('LOKASI') || val.includes('POS') || val.includes('PENEMPATAN') || val.includes('TEMPAT') || val.includes('AREA') || val.includes('GEDUNG') || val.includes('UNIT')) score += 3;
          if (val.includes('JAM') || val.includes('WAKTU') || val.includes('PUKUL') || val.includes('SHIFT') || val.includes('HADIR')) score += 3;
          if (val.includes('PAGI') || val.includes('SORE') || val.includes('MALAM') || val.includes('RUMAH') || val.includes('RUMDIN') || val.includes('LIBUR')) score += 3;
          if (/\d{1,2}[\.:]\d{2}\s*[\/\-\s]+\s*\d{1,2}[\.:]\d{2}/.test(val)) score += 3;
          if (val === 'NO' || val === 'NO.' || val === 'NOMOR' || val === 'NO. URUT') score += 2;
        });

        if (dayNumCount >= 7 || calCellCount >= 7) {
          score += 25;
        }

        if (score > bestScore) {
          bestScore = score;
          headerRowIdx = r;
        }
      }

      let subHeaderRowIdx = -1;
      let dataStartRowIdx = 0;

      if (headerRowIdx === -1 || bestScore < 2) {
        // Check if the first non-empty row is already a data row (sheet has no header row) so day-1 rows are never dropped
        const firstDataLikeIdx = rawRows.findIndex(row => {
          const vals = (row || []).map(c => String(c || '').trim()).filter(Boolean);
          if (vals.length < 2) return false;
          const joined = vals.join(' ').toUpperCase();
          return (
            /\b(SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU|MINGGU)\b/.test(joined) ||
            /\d{1,2}\s*(JAN|FEB|MAR|APR|MEI|JUN|JUL|AGU|AGS|AUG|SEP|OKT|OCT|NOV|NOP|DES|DEC)/i.test(joined) ||
            /\d{1,2}[\.:]\d{2}\s*[\/\-\–\s]+\s*\d{1,2}[\.:]\d{2}/.test(joined) ||
            vals.some(v => OFFICIAL_SECURITY_GUARDS.some(g => v.toUpperCase() === g)) ||
            joined.includes('KANWIL') ||
            joined.includes('RUMAH DINAS')
          );
        });
        if (firstDataLikeIdx !== -1) {
          headerRowIdx = -1;
          dataStartRowIdx = firstDataLikeIdx;
        } else {
          headerRowIdx = 0;
          dataStartRowIdx = 1;
        }
      } else {
        dataStartRowIdx = headerRowIdx + 1;
      }

      // Check if headerRowIdx + 1 is a sub-header tier (e.g. LOKASI / JAM HADIR, DATANG / PULANG, 06.00/18.00, 1..31, or vertically merged header continuation)
      if (headerRowIdx >= 0 && headerRowIdx + 1 < rawRows.length) {
        const nextRow = (rawRows[headerRowIdx + 1] || []).map(c => String(c || '').trim());
        const nextUnique = Array.from(new Set(nextRow.filter(Boolean)));
        if (nextUnique.length > 0) {
          const nextHasGuardName = nextUnique.some(v => OFFICIAL_SECURITY_GUARDS.some(g => v.toUpperCase() === g));
          const nextHasDateToken = nextUnique.some(v =>
            (/^\s*(SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU|MINGGU)\s*$/i.test(v)) ||
            (/\b(SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU|MINGGU)\b/i.test(v) && /\d{1,2}/.test(v)) ||
            /\d{1,2}\s*(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Nop|Des)/i.test(v) ||
            /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(v)
          );
          const nextIsVerticalHeaderMergeClone = (rawRows[headerRowIdx] || []).some((hCell, cIdx) => {
            const hStr = String(hCell || '').trim().toUpperCase();
            return (
              hStr !== '' &&
              rowHasMerge.has(`${headerRowIdx + 1}:${cIdx}`) &&
              String(nextRow[cIdx] || '').trim().toUpperCase() === hStr
            );
          });
          const nextCalCount = nextRow.filter(isCalendarCellToken).length;
          const nextHeaderSignals = nextUnique.filter(v => {
            const up = v.toUpperCase();
            return (
              /^(NO\.?|NOMOR|NAMA|PETUGAS|PERSONIL|PERSONEL|SATPAM|TANGGAL|TGL|HARI|LOKASI|POS|PENEMPATAN|TEMPAT|AREA|GEDUNG|UNIT|JAM|JAM HADIR|WAKTU|PUKUL|DATANG|MASUK|PULANG|KELUAR|MULAI|SELESAI|AKHIR|PAGI|SORE|MALAM|RUMAH DINAS|RUMDIN|LIBUR|OFF|SHIFT\s*[123I]+|KETERANGAN|KET)$/i.test(up) ||
              /^\d{1,2}[\.:]\d{2}\s*[\/\-\–\s]+\s*\d{1,2}[\.:]\d{2}$/.test(up) ||
              /^0?([1-9]|[12]\d|3[01])$/.test(up)
            );
          }).length;
          if (!nextHasGuardName && !nextHasDateToken && (nextIsVerticalHeaderMergeClone || nextCalCount >= 7 || nextHeaderSignals >= 2)) {
            subHeaderRowIdx = headerRowIdx + 1;
            dataStartRowIdx = headerRowIdx + 2;
          }
        }
      }

      let foundTitleRowMonth = false;
      let titleMonth = targetMonth;
      let titleYear = targetYear;
      // Scan title rows (strictly rows BEFORE headerRowIdx, or before dataStartRowIdx when headerless)
      const titleScanLimit = headerRowIdx >= 0 ? headerRowIdx : dataStartRowIdx;
      for (let r = 0; r < titleScanLimit; r++) {
        const rowArr = rawRows[r] || [];
        const uniqueCells = Array.from(new Set(rowArr.map(c => String(c || '').trim()).filter(Boolean)));
        if (uniqueCells.length === 0) continue;
        const rowStr = uniqueCells.join(' ');
        const rowUp = rowStr.toUpperCase();

        if (!respectExplicitMonth) {
          const contentMonthInfo = extractMonthAndYearFromText(rowUp);
          if (contentMonthInfo && !/^PEKANBARU\b/i.test(rowUp)) {
            targetMonth = contentMonthInfo.month;
            targetYear = contentMonthInfo.year;
            titleMonth = contentMonthInfo.month;
            titleYear = contentMonthInfo.year;
            foundTitleRowMonth = true;
            detectedTitle = `JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN ${ID_MONTHS_TITLE[targetMonth - 1].toUpperCase()} ${targetYear}`;
          }
        }

        if ((rowUp.includes('JADWAL') || rowUp.includes('PENGAWASAN') || rowUp.includes('PENJAGAAN') || rowUp.includes('SATPAM') || rowUp.includes('KEAMANAN')) && !rowUp.includes('LOKASI') && !rowUp.includes('HADIR')) {
          detectedTitle = rowStr;
        }
      }

      // Detect whether numeric dates across ALL data rows follow US MM/DD/YYYY (stops before signature/summary footer)
      let preferMonthFirst = false;
      let maxP1 = 0;
      let maxP2 = 0;
      const numericP1Counts = new Map<number, number>();
      const numericP2Counts = new Map<number, number>();
      const SIGNATURE_FOOTER_RE = /^\s*(MENGETAHUI|PEKANBARU\s*,|DITETAPKAN\s+DI|KASUBBAG|KEPALA\s+(BAGIAN|KANTOR|SUBBAGIAN)|NIP[\s:\.]*\d|REKAPITULASI|RINGKASAN|JUMLAH\s+(SHIFT|KEHADIRAN|HARI|PIKET)|TOTAL\s+(SHIFT|KEHADIRAN|HARI|PIKET)|CATATAN\s*:|KETERANGAN\s*:|LEGENDA\s*:|DISUSUN\s+OLEH|DISETUJUI\s+OLEH|MENYETUJUI)/i;
      for (let r = dataStartRowIdx; r < rawRows.length; r++) {
        const rowArr = rawRows[r] || [];
        const joinedForSig = rowArr.map(c => String(c || '').trim()).filter(Boolean).join(' ');
        if (SIGNATURE_FOOTER_RE.test(joinedForSig)) break;
        for (const c of rowArr) {
          const cStr = String(c || '').trim();
          if (!cStr || /^\d{1,2}[\.:]\d{2}(?:\s*[\/\-\–\s]|$)/.test(cStr)) continue;
          const nm = cStr.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})$/);
          if (nm) {
            const p1 = parseInt(nm[1], 10);
            const p2 = parseInt(nm[2], 10);
            if (p1 > maxP1) maxP1 = p1;
            if (p2 > maxP2) maxP2 = p2;
            numericP1Counts.set(p1, (numericP1Counts.get(p1) || 0) + 1);
            numericP2Counts.set(p2, (numericP2Counts.get(p2) || 0) + 1);
          }
        }
      }
      if (maxP1 <= 12 && maxP2 > 12) {
        preferMonthFirst = true;
      } else if (maxP1 <= 12 && maxP2 <= 12 && foundTitleRowMonth && (numericP1Counts.get(titleMonth) || 0) >= 3 && (numericP2Counts.get(titleMonth) || 0) <= 1) {
        preferMonthFirst = true;
      }

      // Infer dominant month/year across ALL actual data rows (stopping before signature footer)
      if (!respectExplicitMonth) {
        const monthCounts = new Map<string, number>();
        for (let r = dataStartRowIdx; r < rawRows.length; r++) {
          const rowArr = rawRows[r] || [];
          const joinedForSig = rowArr.map(c => String(c || '').trim()).filter(Boolean).join(' ');
          if (SIGNATURE_FOOTER_RE.test(joinedForSig)) break;
          for (const c of rowArr) {
            const cStr = String(c || '').trim();
            if (!cStr) continue;
            const info = extractMonthAndYearFromText(cStr);
            if (info) {
              const key = `${info.year}-${info.month}`;
              monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
            } else if (!/^\d{1,2}[\.:]\d{2}(?:\s*[\/\-\–\s]|$)/.test(cStr) && /(\d{1,4})([\/\.\-])(\d{1,2}|i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)\2(\d{1,4})/i.test(cStr)) {
              const parsed = parseDateFromExcelCell(cStr, targetMonth, targetYear, preferMonthFirst);
              if (parsed) {
                const key = `${parsed.year}-${parsed.month}`;
                monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
              }
            }
          }
        }
        if (monthCounts.size > 0) {
          let bestKey = '';
          let maxC = 0;
          monthCounts.forEach((cnt, k) => {
            if (cnt > maxC) { maxC = cnt; bestKey = k; }
          });
          if (bestKey && (!foundTitleRowMonth || maxC >= 3)) {
            const [yStr, mStr] = bestKey.split('-');
            const newYear = parseInt(yStr, 10);
            const newMonth = parseInt(mStr, 10);
            const monthChangedFromTitle = foundTitleRowMonth && (newMonth !== titleMonth || newYear !== titleYear);
            targetYear = newYear;
            targetMonth = newMonth;
            if (monthChangedFromTitle || !detectedTitle || detectedTitle.startsWith('JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN ') || !extractMonthAndYearFromText(detectedTitle)) {
              detectedTitle = `JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN ${ID_MONTHS_TITLE[targetMonth - 1].toUpperCase()} ${targetYear}`;
            }
          }
        }
      }

      // Build unified headerRow supporting both parent row above or sub-header row below
      const baseHeaderRow = headerRowIdx >= 0 ? (rawRows[headerRowIdx] || []).map(c => String(c || '').trim()) : [];
      const subHeaderRow = subHeaderRowIdx !== -1 ? (rawRows[subHeaderRowIdx] || []).map(c => String(c || '').trim()) : [];
      const rawPrevRow = headerRowIdx > 0 ? (rawRows[headerRowIdx - 1] || []).map(c => String(c || '').trim()) : [];
      const uniquePrevVals = Array.from(new Set(rawPrevRow.filter(Boolean)));
      const prevJoined = uniquePrevVals.join(' ').toUpperCase();
      const isPrevTitleRow =
        uniquePrevVals.length < 2 ||
        /\b(JADWAL|PENGAWASAN|PENJAGAAN|KEMENTERIAN|DIREKTORAT|KANWIL|PROVINSI|DAFTAR|REKAPITULASI|BULAN|PERIODE|TAHUN|SUBBAGIAN|BAGIAN|TENTANG|NOMOR|KEPUTUSAN)\b/.test(prevJoined) ||
        /\b20\d{2}\b/.test(prevJoined);
      const prevRow = isPrevTitleRow ? [] : rawPrevRow;

      let lastPrev = '';
      const filledPrev = prevRow.map(c => {
        if (c) { lastPrev = c; return c; }
        return lastPrev;
      });

      const headerLen = Math.max(baseHeaderRow.length, subHeaderRow.length, filledPrev.length);
      const rawHeaderRow: string[] = [];
      const headerRow: string[] = [];
      for (let c = 0; c < headerLen; c++) {
        const b = baseHeaderRow[c] || '';
        const s = subHeaderRow[c] || '';
        const p = filledPrev[c] || '';
        const combinedSub = (b && s && !b.toUpperCase().includes(s.toUpperCase())) ? `${b} ${s}`.trim() : (s || b);
        rawHeaderRow.push(s || b || p);
        headerRow.push((p && !combinedSub.toUpperCase().includes(p.toUpperCase())) ? `${p} ${combinedSub}`.trim() : combinedSub);
      }

      // Format detection
      const morningCols: number[] = [];
      const eveningCols: number[] = [];
      const nightCols: number[] = [];
      const rumdinCols: number[] = [];
      const liburCols: number[] = [];
      let colMatrixDay = -1;
      let colMatrixDayOnly = -1;

      const hasDedicatedNameCol = headerRow.some(h => {
        const up = h.toUpperCase();
        const isLocName = up.includes('LOKASI') || up.includes('POS') || up.includes('TEMPAT') || up.includes('PENEMPATAN') || up.includes('GEDUNG') || up.includes('UNIT') || up.includes('SHIFT');
        const isNameLike = !isLocName && (up.includes('NAMA') || up.includes('PETUGAS') || up.includes('PERSONIL') || up.includes('PERSONEL') || up.includes('SATPAM') || up.includes('SECURITY') || up.includes('ANGGOTA'));
        const isShiftLike = up.includes('PAGI') || up.includes('SORE') || up.includes('MALAM') || up.includes('RUMAH') || up.includes('RUMDIN') || up.includes('LIBUR') || /\d{1,2}[\.:]\d{2}/.test(up);
        return isNameLike && !isShiftLike;
      });

      const isTabularHeaderPresent = hasDedicatedNameCol || headerRow.some(h => {
        const up = h.toUpperCase();
        return up.includes('LOKASI') || up.includes('POS') || up.includes('PENEMPATAN') || up.includes('GEDUNG') || up.includes('UNIT') || up.includes('JAM HADIR');
      });

      headerRow.forEach((h, colIdx) => {
        const hUp = h.toUpperCase();
        if ((hUp.includes('TANGGAL') || hUp.includes('TGL') || hUp.includes('DATE')) && colMatrixDay === -1) {
          colMatrixDay = colIdx;
        } else if ((hUp.includes('HARI') || hUp.includes('DAY')) && !hUp.includes('TANGGAL') && !hUp.includes('TGL')) {
          if (colMatrixDayOnly === -1) colMatrixDayOnly = colIdx;
        } else if (hUp.includes('RUMAH') || hUp.includes('RUMDIN') || hUp.includes('JABATAN') || hUp === 'RD') {
          rumdinCols.push(colIdx);
        } else if (hUp.includes('LIBUR') || /\bOFF\b/.test(hUp) || /\bLEPAS\b/.test(hUp) || hUp === 'L') {
          liburCols.push(colIdx);
        } else if (isNightHours(hUp)) {
          nightCols.push(colIdx);
        } else if (isEveningHours(hUp)) {
          eveningCols.push(colIdx);
        } else if (isMorningHours(hUp)) {
          morningCols.push(colIdx);
        }
      });
      if (colMatrixDay === -1 && colMatrixDayOnly !== -1) {
        colMatrixDay = colMatrixDayOnly;
        colMatrixDayOnly = -1;
      }

      const STANDARD_TABULAR_HEADER_REGEX = /\b(NO|NO\.|NOMOR|NAMA|PETUGAS|PERSONIL|PERSONEL|SATPAM|SECURITY|ANGGOTA|HARI|TANGGAL|TGL|DATE|DAY|LOKASI|POS|PENEMPATAN|TEMPAT|GEDUNG|UNIT|JAM|HADIR|PUKUL|WAKTU|SHIFT|HOURS|STATUS|KETERANGAN|KET|PARAF|TTD|CATATAN|TOTAL|JUMLAH)\b/i;

      const guardCols: { colIdx: number; name: string }[] = [];
      rawHeaderRow.forEach((h, colIdx) => {
        const trimmedH = h.trim();
        if (!trimmedH || STANDARD_TABULAR_HEADER_REGEX.test(trimmedH)) return;
        const cleanedName = normalizeGuardName(trimmedH);
        if (OFFICIAL_SECURITY_GUARDS.includes(cleanedName) || (!isTabularHeaderPresent && trimmedH.length >= 3 && !/^\d+$/.test(trimmedH))) {
          guardCols.push({ colIdx, name: trimmedH.toUpperCase() });
        }
      });

      const dayCols: { colIdx: number; day: number; month?: number; year?: number }[] = [];
      headerRow.forEach((h, colIdx) => {
        const rawCell = (rawHeaderRow[colIdx] || h || '').trim();
        const matchSimpleDay = rawCell.match(/^(?:TGL\s*|TANGGAL\s*)?0?([1-9]|[12]\d|3[01])$/i);
        if (matchSimpleDay) {
          dayCols.push({ colIdx, day: parseInt(matchSimpleDay[1], 10) });
        } else if (isCalendarCellToken(rawCell)) {
          const parsed = parseDateFromExcelCell(rawCell, targetMonth, targetYear, preferMonthFirst);
          if (parsed) {
            dayCols.push({ colIdx, day: parsed.day, month: parsed.month, year: parsed.year });
          }
        }
      });

      const shiftMatrixColCount = morningCols.length + eveningCols.length + nightCols.length + rumdinCols.length + liburCols.length;
      const isCalendarGridFormat = !colMapOverride && dayCols.length >= 7;
      const isShiftMatrixFormat = !colMapOverride && !isCalendarGridFormat && !hasDedicatedNameCol && (morningCols.length > 0 || nightCols.length > 0 || rumdinCols.length > 0) && (colMatrixDay !== -1 || shiftMatrixColCount >= 2 || headerRow.length >= 3);
      const isGuardColsFormat = !colMapOverride && !isCalendarGridFormat && !isShiftMatrixFormat && !isTabularHeaderPresent && guardCols.length >= 3;

      // Sync targetMonth/targetYear when Calendar Grid headers explicitly carry full dates
      if (isCalendarGridFormat && !respectExplicitMonth) {
        const dcWithMonth = dayCols.find(dc => dc.month && dc.year);
        if (dcWithMonth && dcWithMonth.month && dcWithMonth.year) {
          targetMonth = dcWithMonth.month;
          targetYear = dcWithMonth.year;
          if (!extractMonthAndYearFromText(detectedTitle) || detectedTitle.startsWith('JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN ')) {
            detectedTitle = `JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN ${ID_MONTHS_TITLE[targetMonth - 1].toUpperCase()} ${targetYear}`;
          }
        }
      }

      const parsedRoster: SecurityRosterItem[] = [];
      const parsedShifts: SecurityShift[] = [];
      let rowOrder = 0;

      if (isCalendarGridFormat) {
        // FORMAT C: Calendar Grid (Rows = Officers, Columns = Days 1..31)
        setPreviewFormatLabel('Matriks Kalender Bulanan (Baris = Petugas, Kolom = Tanggal)');
        setPreviewTabularMap(null);
        let colGuardName = 0;
        for (let c = 0; c < headerRow.length; c++) {
          const curH = (headerRow[c] || '').toUpperCase();
          if (curH.includes('NAMA') || curH.includes('PETUGAS') || curH.includes('PERSONIL') || curH.includes('PERSONEL')) {
            colGuardName = c;
            break;
          }
        }
        const dailyGroups = new Map<number, { morning: string[]; evening: string[]; night: string[]; rumdin: string[]; libur: string[] }>();
        const daysInTargetMonth = new Date(targetYear, targetMonth, 0).getDate();
        for (let d = 1; d <= daysInTargetMonth; d++) {
          dailyGroups.set(d, { morning: [], evening: [], night: [], rumdin: [], libur: [] });
        }
        const tempCalItems: { day: number; rank: number; item: SecurityRosterItem }[] = [];
        for (let i = dataStartRowIdx; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;
          const guardNameRaw = String(row[colGuardName] || '').trim().replace(/\s+/g, ' ');
          if (!guardNameRaw || /^\s*(MENGETAHUI|PEKANBARU|DITETAPKAN|KASUBBAG|KEPALA\s+(BAGIAN|KANTOR)|NIP[\s:\.]*\d|TOTAL|JUMLAH|CATATAN|KETERANGAN|LEGENDA|[PMLR]\s*=)/i.test(guardNameRaw)) continue;
          const guardName = guardNameRaw.replace(/^\d+[\.\-\)]\s*/, '').trim();
          if (!guardName || /^(NO\.?|NAMA|PETUGAS)$/i.test(guardName)) continue;
          const safeCalNameSlug = guardName.replace(/[^a-zA-Z0-9_-]/g, '_');
          dayCols.forEach(({ colIdx, day, month: cMonth, year: cYear }) => {
            const effM = cMonth || targetMonth;
            const effY = cYear || targetYear;
            const maxD = new Date(effY, effM, 0).getDate();
            if (day > maxD) return;
            const dutyVal = String(row[colIdx] || '').trim();
            if (!dutyVal || dutyVal === '0') return;
            const duty = parseDutyCellValue(dutyVal);
            let rank = 1;
            if (duty.shiftType === 'libur') {
              dailyGroups.get(day)?.libur.push(guardName);
              rank = 5;
            } else if (duty.shiftType === 'rumdin') {
              dailyGroups.get(day)?.rumdin.push(guardName);
              rank = 4;
            } else if (duty.shiftType === 'evening') {
              dailyGroups.get(day)?.evening.push(guardName);
              rank = 2;
            } else if (duty.shiftType === 'night') {
              dailyGroups.get(day)?.night.push(guardName);
              rank = 3;
            } else {
              dailyGroups.get(day)?.morning.push(guardName);
              rank = 1;
            }
            const loc = duty.location;
            const hrs = duty.shiftType === 'libur' ? '-' : (/\d{1,2}[\.:]\d{2}/.test(dutyVal) ? dutyVal : duty.hours);
            const dObj = new Date(effY, effM - 1, day);
            const dayStr = `${ID_DAYS_UPPER[dObj.getDay()]}/ ${day} ${ID_MONTHS_TITLE[effM - 1]} ${effY}`;
            tempCalItems.push({
              day,
              rank,
              item: {
                id: `ros-cal-${day}-${safeCalNameSlug}-${rowOrder++}`,
                orderIndex: 0,
                name: guardName,
                dateStr: dayStr,
                location: loc,
                hours: hrs
              }
            });
          });
        }
        tempCalItems.sort((a, b) => (a.day !== b.day ? a.day - b.day : a.rank - b.rank));
        tempCalItems.forEach((entry, idx) => {
          parsedRoster.push({ ...entry.item, orderIndex: idx });
        });
        dailyGroups.forEach((grp, day) => {
          const hasAny = grp.morning.length > 0 || grp.evening.length > 0 || grp.night.length > 0 || grp.rumdin.length > 0 || grp.libur.length > 0;
          if (!hasAny) return;
          const dObj = new Date(targetYear, targetMonth - 1, day);
          const dayStr = `${ID_DAYS_UPPER[dObj.getDay()]}/ ${day} ${ID_MONTHS_TITLE[targetMonth - 1]} ${targetYear}`;
          parsedShifts.push({
            day: dayStr,
            shiftMorning: grp.morning.join(' / ') || '-',
            shiftEvening: grp.evening.join(' / ') || '-',
            shiftNight: [...grp.night, ...grp.rumdin.map(r => `${r} (Rumdin)`)].join(' / ') || '-'
          });
        });
      } else if (isGuardColsFormat) {
        // FORMAT B: Columns = Guard Names, Rows = Dates
        setPreviewFormatLabel('Matriks Kolom Petugas (Baris = Tanggal, Kolom = Nama Petugas)');
        setPreviewTabularMap(null);
        const colDate = colMatrixDay !== -1 ? colMatrixDay : 0;
        let lastActiveDate = '';
        let lastActiveDay = '';
        for (let i = dataStartRowIdx; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;
          const rowText = row.map(c => String(c || '').trim()).join(' ');
          if (/^\s*(MENGETAHUI|PEKANBARU\s*,|DITETAPKAN|KASUBBAG|KEPALA\s+(BAGIAN|KANTOR)|NIP[\s:\.]*\d)/i.test(rowText)) break;
          let dateRaw = row[colDate] !== undefined ? String(row[colDate]).trim() : '';
          let dayRaw = colMatrixDayOnly !== -1 && row[colMatrixDayOnly] !== undefined ? String(row[colMatrixDayOnly]).trim() : '';
          if (!dateRaw && lastActiveDate) {
            dateRaw = lastActiveDate;
          } else if (dateRaw) {
            lastActiveDate = dateRaw;
          }
          if (dayRaw) lastActiveDay = dayRaw;
          else if (lastActiveDay) dayRaw = lastActiveDay;
          if (!dateRaw || /TOTAL|MENGETAHUI|CATATAN|KETERANGAN/i.test(dateRaw)) continue;
          const combinedDate = (dayRaw && !dateRaw.toUpperCase().includes(dayRaw.toUpperCase())) ? `${dayRaw}/ ${dateRaw}` : dateRaw;
          const formattedDate = formatStandardDateStr(combinedDate, targetMonth, targetYear, preferMonthFirst) || combinedDate;
          const morningNames: string[] = [];
          const eveningNames: string[] = [];
          const nightNames: string[] = [];
          const rumdinNames: string[] = [];
          guardCols.forEach(({ colIdx, name }) => {
            const cellVal = String(row[colIdx] || '').trim();
            if (!cellVal || cellVal === '0') return;
            const duty = parseDutyCellValue(cellVal);
            if (duty.shiftType === 'libur') {
              if (cellVal === '-') return;
            } else if (duty.shiftType === 'rumdin') {
              rumdinNames.push(name);
            } else if (duty.shiftType === 'evening') {
              eveningNames.push(name);
            } else if (duty.shiftType === 'night') {
              nightNames.push(name);
            } else {
              morningNames.push(name);
            }
            const hrs = duty.shiftType === 'libur' ? '-' : (/\d{1,2}[\.:]\d{2}/.test(cellVal) ? cellVal : duty.hours);
            parsedRoster.push({
              id: `ros-gc-${rowOrder}-${Date.now()}`,
              orderIndex: rowOrder++,
              name: name,
              dateStr: formattedDate,
              location: duty.location,
              hours: hrs
            });
          });
          parsedShifts.push({
            day: formattedDate,
            shiftMorning: morningNames.join(' / ') || '-',
            shiftEvening: eveningNames.join(' / ') || '-',
            shiftNight: [...nightNames, ...rumdinNames.map(r => `${r} (Rumdin)`)].join(' / ') || '-'
          });
        }
      } else if (isShiftMatrixFormat) {
        // FORMAT A: Shift Matrix (Columns = Shift Pagi, Sore, Malam, Rumdin, Libur)
        setPreviewFormatLabel('Matriks Shift Harian (Kolom = Shift Pagi / Malam / Rumdin / Libur)');
        setPreviewTabularMap(null);
        let lastActiveDate = '';
        let lastActiveDay = '';
        if (colMatrixDay === -1) {
          colMatrixDay = (headerRow[0] && !headerRow[0].toUpperCase().includes('SHIFT')) ? 0 : 1;
        }
        for (let i = dataStartRowIdx; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;
          const rowText = row.map(c => String(c || '').trim()).join(' ');
          if (/^\s*(MENGETAHUI|PEKANBARU\s*,|DITETAPKAN|KASUBBAG|KEPALA\s+(BAGIAN|KANTOR)|NIP[\s:\.]*\d)/i.test(rowText)) break;
          let dateRaw = row[colMatrixDay] !== undefined ? String(row[colMatrixDay]).trim() : '';
          let dayRaw = colMatrixDayOnly !== -1 && row[colMatrixDayOnly] !== undefined ? String(row[colMatrixDayOnly]).trim() : '';
          if (!dateRaw && lastActiveDate) {
            dateRaw = lastActiveDate;
          } else if (dateRaw) {
            lastActiveDate = dateRaw;
          }
          if (dayRaw) lastActiveDay = dayRaw;
          else if (lastActiveDay) dayRaw = lastActiveDay;
          if (!dateRaw || /^(HARI|TANGGAL|TOTAL|MENGETAHUI|CATATAN|KETERANGAN)/i.test(dateRaw)) continue;
          const combinedDate = (dayRaw && !dateRaw.toUpperCase().includes(dayRaw.toUpperCase())) ? `${dayRaw}/ ${dateRaw}` : dateRaw;
          const formattedDate = formatStandardDateStr(combinedDate, targetMonth, targetYear, preferMonthFirst) || combinedDate;

          const extractNamesFromCols = (cols: number[]) => {
            const res: string[] = [];
            cols.forEach(cIdx => {
              if (cIdx === -1 || row[cIdx] === undefined) return;
              const raw = String(row[cIdx]).trim();
              if (!raw || raw === '-' || raw === '0' || raw.toUpperCase() === 'LIBUR' || raw.toUpperCase() === 'OFF') return;
              const split = splitMultipleGuardNames(raw);
              res.push(...split);
            });
            return res;
          };

          const extractHeaderTime = (cols: number[], defaultHours: string): string => {
            for (const cIdx of cols) {
              const hdr = headerRow[cIdx] || '';
              const m = hdr.match(/(\d{1,2}[\.:]\d{2}\s*[\/\-\–\s]+\s*\d{1,2}[\.:]\d{2})/);
              if (m) return m[1].trim();
            }
            return defaultHours;
          };

          const morningNames = extractNamesFromCols(morningCols);
          const eveningNames = extractNamesFromCols(eveningCols);
          const nightNames = extractNamesFromCols(nightCols);
          const rumdinNames = extractNamesFromCols(rumdinCols);
          const liburNames = extractNamesFromCols(liburCols);

          const morningHrs = extractHeaderTime(morningCols, '06.00 / 18.00');
          const eveningHrs = extractHeaderTime(eveningCols, '14.00 / 22.00');
          const nightHrs = extractHeaderTime(nightCols, '18.00 / 06.00');
          const rumdinHrs = extractHeaderTime(rumdinCols, '18.00 / 06.00');

          morningNames.forEach(n => {
            parsedRoster.push({
              id: `ros-mat-${rowOrder}-${Date.now()}`,
              orderIndex: rowOrder++,
              name: n.trim().replace(/\s+/g, ' '),
              dateStr: formattedDate,
              location: 'KANWIL DJPB',
              hours: morningHrs
            });
          });
          eveningNames.forEach(n => {
            parsedRoster.push({
              id: `ros-mat-${rowOrder}-${Date.now()}`,
              orderIndex: rowOrder++,
              name: n.trim().replace(/\s+/g, ' '),
              dateStr: formattedDate,
              location: 'KANWIL DJPB',
              hours: eveningHrs
            });
          });
          nightNames.forEach(n => {
            parsedRoster.push({
              id: `ros-mat-${rowOrder}-${Date.now()}`,
              orderIndex: rowOrder++,
              name: n.trim().replace(/\s+/g, ' '),
              dateStr: formattedDate,
              location: 'KANWIL DJPB',
              hours: nightHrs
            });
          });
          rumdinNames.forEach(n => {
            parsedRoster.push({
              id: `ros-mat-${rowOrder}-${Date.now()}`,
              orderIndex: rowOrder++,
              name: n.trim().replace(/\s+/g, ' '),
              dateStr: formattedDate,
              location: 'RUMAH DINAS',
              hours: rumdinHrs
            });
          });
          liburNames.forEach(n => {
            parsedRoster.push({
              id: `ros-mat-${rowOrder}-${Date.now()}`,
              orderIndex: rowOrder++,
              name: n.trim().replace(/\s+/g, ' '),
              dateStr: formattedDate,
              location: 'LIBUR',
              hours: '-'
            });
          });
          parsedShifts.push({
            day: formattedDate,
            shiftMorning: morningNames.join(' / ') || '-',
            shiftEvening: eveningNames.join(' / ') || '-',
            shiftNight: [...nightNames, ...rumdinNames.map(r => `${r} (Rumdin)`)].join(' / ') || '-'
          });
        }
      } else {
        // FORMAT D: Tabular (NAMA, HARI / TANGGAL, LOKASI, JAM HADIR)
        setPreviewFormatLabel('Tabel Roster Harian (Nama, Hari / Tanggal, Lokasi, Jam Hadir)');
        let colNo = -1, colName = -1, colDay = -1, colDate = -1, colLoc = -1, colHours = -1, colHoursEnd = -1, colNotes = -1;

        if (colMapOverride) {
          colName = colMapOverride.name;
          colDate = colMapOverride.date;
          colLoc = colMapOverride.loc;
          colHours = colMapOverride.hours;
        } else {
          // Pass 1: match primary explicit headers
          headerRow.forEach((h, colIdx) => {
            const hUp = h.toUpperCase();
            const isLocWord = hUp.includes('LOKASI') || hUp.includes('POS') || hUp.includes('PENEMPATAN') || hUp.includes('TEMPAT') || hUp.includes('GEDUNG') || hUp.includes('UNIT') || hUp.includes('SHIFT');
            const isEndTimeWord = hUp.includes('PULANG') || hUp.includes('KELUAR') || hUp.includes('SELESAI') || hUp.includes('SAMPAI') || hUp.includes('AKHIR');
            if (colNo === -1 && /^(NO\.?(\s+URUT)?|NOMOR)$/i.test(hUp)) colNo = colIdx;
            else if (colName === -1 && !isLocWord && (hUp.includes('NAMA') || hUp.includes('PETUGAS') || hUp.includes('PERSONIL') || hUp.includes('PERSONEL') || hUp.includes('SATPAM') || hUp.includes('SECURITY') || hUp.includes('ANGGOTA'))) colName = colIdx;
            else if (hUp.includes('HARI') && (hUp.includes('TANGGAL') || hUp.includes('TGL') || hUp.includes('DATE'))) { if (colDate === -1) colDate = colIdx; }
            else if (hUp.includes('TANGGAL') || hUp.includes('TGL') || hUp.includes('DATE') || hUp.includes('WAKTU/TGL')) { if (colDate === -1) colDate = colIdx; }
            else if (hUp.includes('HARI') || hUp.includes('DAY')) { if (colDay === -1) colDay = colIdx; }
            else if (colLoc === -1 && (hUp.includes('LOKASI') || hUp.includes('POS') || hUp.includes('PENEMPATAN') || hUp.includes('TEMPAT') || hUp.includes('AREA') || hUp.includes('GEDUNG') || hUp.includes('UNIT'))) colLoc = colIdx;
            else if (colHours === -1 && !isEndTimeWord && (hUp.includes('JAM') || hUp.includes('HADIR') || hUp.includes('PUKUL') || hUp.includes('HOURS') || hUp.includes('MASUK') || hUp.includes('DATANG') || hUp.includes('MULAI'))) colHours = colIdx;
            else if (colHours !== -1 && colHoursEnd === -1 && (isEndTimeWord || (colIdx === colHours + 1 && headerRowIdx >= 0 && rowHasMerge.has(`${headerRowIdx}:${colIdx}`) && hUp === (headerRow[colHours] || '').toUpperCase()))) colHoursEnd = colIdx;
            else if (colNotes === -1 && (hUp.includes('KETERANGAN') || hUp === 'KET' || hUp === 'KET.' || hUp.includes('CATATAN'))) colNotes = colIdx;
          });
          // Pass 2: fallback secondary headers (STATUS, WAKTU, SHIFT) only if primary wasn't matched
          headerRow.forEach((h, colIdx) => {
            const hUp = h.toUpperCase();
            if ([colNo, colName, colDate, colDay, colLoc, colHours, colHoursEnd, colNotes].includes(colIdx)) return;
            if (colLoc === -1 && hUp.includes('STATUS')) colLoc = colIdx;
            else if (colHours === -1 && (hUp.includes('WAKTU') || hUp.includes('SHIFT'))) colHours = colIdx;
            else if (colHours !== -1 && colHoursEnd === -1 && colIdx === colHours + 1 && headerRowIdx >= 0 && rowHasMerge.has(`${headerRowIdx}:${colIdx}`) && hUp === (headerRow[colHours] || '').toUpperCase()) colHoursEnd = colIdx;
          });

          const sampleRows = rawRows.slice(dataStartRowIdx, dataStartRowIdx + 30).filter(r => r && r.some(c => String(c || '').trim()));
          const maxCols = Math.max(...sampleRows.map(r => r.length), headerRow.length, 4);

          for (let c = 0; c < maxCols; c++) {
            if (c === colNo || c === colNotes) continue;
            const vals = sampleRows.map(r => String(r[c] || '').trim()).filter(Boolean);
            if (vals.length === 0) continue;
            if (colNo === -1 && vals.length >= 3 && vals.every(v => /^\d{1,3}\.?$/.test(v))) {
              colNo = c; continue;
            }
            if (colName === -1 && vals.filter(v => OFFICIAL_SECURITY_GUARDS.some(g => v.toUpperCase().includes(g))).length >= 2) {
              colName = c; continue;
            }
            if (colDate === -1 && vals.filter(v => /SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU|MINGGU|\d{1,2}\s*(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Nop|Des)|\d{1,2}[\/\-]\d{1,2}/i.test(v)).length >= 2) {
              colDate = c; continue;
            }
            if (colLoc === -1 && vals.filter(v => /KANWIL|RUMAH|RUMDIN|LIBUR|\bOFF\b|\bLEPAS\b|GEDUNG|POS/i.test(v.toUpperCase())).length >= 2) {
              colLoc = c; continue;
            }
            if (colHours === -1 && vals.filter(v => /\d{1,2}[\.:]\d{2}/.test(v) || /^\s*(0?6|14|18)\s*$/.test(v) || /^(pagi|malam|sore|shift\s*[123i]+)$/i.test(v)).length >= 2) {
              colHours = c; continue;
            }
          }

          const assignedCols = new Set([colNo, colName, colDate, colDay, colLoc, colHours, colHoursEnd, colNotes].filter(c => c !== -1));
          const unassignedCols: number[] = [];
          for (let c = 0; c < maxCols; c++) {
            if (assignedCols.has(c)) continue;
            const hUp = (headerRow[c] || '').toUpperCase();
            if (/\b(KETERANGAN|CATATAN|PARAF|TTD|NIP|JABATAN)\b/.test(hUp)) continue;
            const hasData = sampleRows.some(r => String(r[c] || '').trim() !== '');
            if (hasData) unassignedCols.push(c);
          }
          if (colDate === -1 && colDay !== -1) { colDate = colDay; colDay = -1; }
          if (colName === -1 && unassignedCols.length > 0) colName = unassignedCols.shift()!;
          if (colDate === -1 && unassignedCols.length > 0) colDate = unassignedCols.shift()!;
          if (colLoc === -1 && unassignedCols.length > 0) colLoc = unassignedCols.shift()!;
          if (colHours === -1 && unassignedCols.length > 0) colHours = unassignedCols.shift()!;
        }

        const totalColsFound = Math.max(headerRow.length, ...(rawRows.slice(dataStartRowIdx, dataStartRowIdx + 15).map(r => r?.length || 0)), 4);
        const colOptionsList: { idx: number; label: string }[] = [];
        for (let c = 0; c < totalColsFound; c++) {
          const hdrLabel = headerRow[c] || `Kolom ${c + 1}`;
          colOptionsList.push({ idx: c, label: `${XLSX.utils.encode_col(c)}: ${hdrLabel}` });
        }
        setPreviewColOptions(colOptionsList);
        setPreviewTabularMap({ name: colName, date: colDate, loc: colLoc, hours: colHours });

        let lastActiveDate = '';
        let lastActiveDay = '';
        let lastActiveHoursForDay = '';
        let lastActiveLocForDay = '';
        let dayBlockSawLibur = false;
        const dayBlockGuards = new Set<string>();

        for (let i = dataStartRowIdx; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          const joinedRow = row.map(c => String(c || '').trim()).filter(Boolean).join(' ');
          if (!joinedRow) continue;

          let nameRaw = colName !== -1 && row[colName] !== undefined ? String(row[colName]).trim() : '';
          let dateRaw = colDate !== -1 && row[colDate] !== undefined ? String(row[colDate]).trim() : '';
          let dayRaw = colDay !== -1 && colDay !== colDate && row[colDay] !== undefined ? String(row[colDay]).trim() : '';
          let locRaw = colLoc !== -1 && row[colLoc] !== undefined ? String(row[colLoc]).trim() : '';
          let hoursRaw = colHours !== -1 && row[colHours] !== undefined ? String(row[colHours]).trim() : '';
          const notesRaw = colNotes !== -1 && row[colNotes] !== undefined ? String(row[colNotes]).trim() : '';
          const hoursEndRaw = colHoursEnd !== -1 && row[colHoursEnd] !== undefined ? String(row[colHoursEnd]).trim() : '';
          if (hoursRaw && hoursEndRaw && !hoursRaw.includes(hoursEndRaw)) {
            hoursRaw = `${hoursRaw} / ${hoursEndRaw}`;
          }

          // Detect Excel signature/footer or recap summary blocks so trailing text never leaks into the last day
          const FOOTER_BLOCK_RE = /^\s*(MENGETAHUI|PEKANBARU\s*,|DITETAPKAN\s+DI|KASUBBAG|KEPALA\s+(BAGIAN|KANTOR|SUBBAGIAN)|NIP[\s:\.]*\d|REKAPITULASI|RINGKASAN|JUMLAH\s+(SHIFT|KEHADIRAN|HARI|PIKET)|TOTAL\s+(SHIFT|KEHADIRAN|HARI|PIKET)|CATATAN\s*:|KETERANGAN\s*:|LEGENDA\s*:|DISUSUN\s+OLEH|DISETUJUI\s+OLEH|MENYETUJUI)/i;
          if ((!nameRaw && FOOTER_BLOCK_RE.test(joinedRow)) || FOOTER_BLOCK_RE.test(nameRaw)) {
            break;
          }

          nameRaw = nameRaw.replace(/^\d+[\.\-\)]\s*/, '').trim();

          // Reconcile reversed columns between location and hours if needed
          if (/KANWIL|RUMAH|RUMDIN|LIBUR|\bOFF\b|\bLEPAS\b|POS|GEDUNG/i.test(hoursRaw) && (/\d{1,2}[\.:]\d{2}/.test(locRaw) || locRaw === '-')) {
            const temp = locRaw; locRaw = hoursRaw; hoursRaw = temp;
          } else if ((!hoursRaw || hoursRaw === '-') && /\d{1,2}[\.:]\d{2}/.test(locRaw) && !/KANWIL|RUMAH|RUMDIN|LIBUR/i.test(locRaw)) {
            hoursRaw = locRaw; locRaw = 'KANWIL DJPB';
          }

          // Reconcile reversed columns between date and name
          const isNameActuallyDate = /^(SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU|MINGGU|\d{1,2}[\/\-]\d{1,2}|\d{1,2}\s*(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Nop|Des))/i.test(nameRaw);
          const isDateActuallyDate = /^(SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU|MINGGU|\d{1,2}[\/\-]\d{1,2}|\d{1,2}\s*(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Nop|Des))/i.test(dateRaw);
          if (isNameActuallyDate && !isDateActuallyDate) {
            const temp = nameRaw; nameRaw = dateRaw; dateRaw = temp;
          }

          const upName = nameRaw.toUpperCase();
          if (!nameRaw || /^(NAMA(\s+(PETUGAS|SATPAM|PERSONIL|PERSONEL|SECURITY|ANGGOTA|LENGKAP))?|PETUGAS|PERSONIL|PERSONEL|SATPAM|JADWAL|TOTAL|MENGETAHUI|CATATAN|BAGIAN|KETERANGAN|NO\.?)$/i.test(upName)) {
            continue;
          }

          // Skip placeholder name rows
          if (upName === 'LIBUR' || upName === 'OFF' || upName === 'LEPAS' || upName === '-' || upName === '0') {
            continue;
          }

          // Look ahead up to 5 rows for unmerged/centered dates on Day 1 OR right after a completed day block (e.g. after LIBUR / repeated guard)
          if (!dateRaw && colDate !== -1 && (!lastActiveDate || dayBlockSawLibur || dayBlockGuards.has(upName))) {
            for (let look = i + 1; look <= Math.min(i + 5, rawRows.length - 1); look++) {
              const candDate = String(rawRows[look]?.[colDate] || '').trim();
              if (candDate && candDate !== lastActiveDate) {
                dateRaw = candDate;
                break;
              }
            }
          }

          const isNewDate = Boolean(dateRaw && dateRaw !== lastActiveDate);
          if (dateRaw) lastActiveDate = dateRaw;
          else if (lastActiveDate) dateRaw = lastActiveDate;

          if (isNewDate) {
            lastActiveHoursForDay = '';
            lastActiveLocForDay = '';
            lastActiveDay = '';
            dayBlockSawLibur = false;
            dayBlockGuards.clear();
          }

          if (dayRaw) lastActiveDay = dayRaw;
          else if (!isNewDate && lastActiveDay) dayRaw = lastActiveDay;

          let rawDateCombined = dateRaw;
          if (dayRaw && !rawDateCombined.toUpperCase().includes(dayRaw.toUpperCase())) {
            rawDateCombined = `${dayRaw}/ ${rawDateCombined}`;
          }

          let formattedDate = formatStandardDateStr(rawDateCombined || dateRaw || dayRaw, targetMonth, targetYear, preferMonthFirst);
          if (!formattedDate) {
            formattedDate = rawDateCombined || dateRaw || dayRaw;
          }

          const upLocPre = locRaw.trim().toUpperCase();
          const upHoursPre = hoursRaw.trim().toUpperCase();
          const notesUp = notesRaw.toUpperCase().trim();
          const notesIndicatesLibur =
            /^(LIBUR|OFF|LEPAS|L)\b/i.test(notesUp) ||
            ((upLocPre === '' || upLocPre === '-') && (upHoursPre === '' || upHoursPre === '-') && /\b(LIBUR|OFF|LEPAS)\b/.test(notesUp));

          // Continuation row inheritance (works even when HARI/TANGGAL is vertically merged across the day!)
          if (!isNewDate && !notesIndicatesLibur && hoursRaw !== '-' && locRaw !== '-') {
            if (!locRaw && !hoursRaw && lastActiveLocForDay && lastActiveHoursForDay) {
              locRaw = lastActiveLocForDay;
              hoursRaw = lastActiveHoursForDay;
            } else if (locRaw && !hoursRaw && locRaw.toUpperCase() === lastActiveLocForDay && lastActiveHoursForDay) {
              hoursRaw = lastActiveHoursForDay;
            } else if (!locRaw && hoursRaw && hoursRaw.trim() === lastActiveHoursForDay && lastActiveLocForDay) {
              locRaw = lastActiveLocForDay;
            }
          }

          const upLoc = locRaw.trim().toUpperCase();
          const upHours = hoursRaw.trim().toUpperCase();

          const isLiburRow =
            notesIndicatesLibur ||
            upLoc === 'LIBUR' || upLoc === 'OFF' || upLoc === 'LEPAS' || upLoc === 'L' || upLoc.includes('LIBUR') ||
            upHours === 'LIBUR' || upHours === 'OFF' || upHours === 'LEPAS' ||
            ((upHours === '' || upHours === '-') && (upLoc === '' || upLoc === '-'));

          let location = upLoc;
          let finalHours = hoursRaw.trim();

          if (isLiburRow) {
            location = 'LIBUR';
            finalHours = '-';
            dayBlockSawLibur = true;
          } else {
            if (!location) location = 'KANWIL DJPB';
            finalHours = normalizeHours(finalHours, location);
            if (!finalHours) finalHours = '-';
          }
          dayBlockGuards.add(upName);

          if (finalHours && finalHours !== '-' && location !== 'LIBUR') {
            lastActiveHoursForDay = finalHours;
            lastActiveLocForDay = location;
          }

          const hasAcademicDegree = /,\s*(S\.|M\.|A\.Md|SH|SE|ST|MM|AK)/i.test(nameRaw);
          const names = (nameRaw.includes('/') || nameRaw.includes('\n') || nameRaw.includes('&') || / dan /i.test(nameRaw) || (nameRaw.includes(',') && !hasAcademicDegree))
            ? nameRaw.split(/[\/\n\r,&]| dan | DAN /).map(n => n.trim().replace(/^\d+[\.\-\)]\s*/, '')).filter(Boolean)
            : [nameRaw];

          for (const n of names) {
            const cleanN = n.trim().replace(/\s+/g, ' ');
            const nUp = cleanN.toUpperCase();
            if (!cleanN || nUp === 'LIBUR' || nUp === 'OFF' || nUp === 'LEPAS' || nUp === '-' || nUp === '0') continue;

            parsedRoster.push({
              id: `ros-up-${rowOrder}-${Date.now()}`,
              orderIndex: rowOrder++,
              name: cleanN,
              dateStr: formattedDate,
              location: location,
              hours: finalHours
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
          } else if (item.location.includes('RUMAH') || item.location.includes('RUMDIN')) {
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

      // Remove only exact duplicate rows, keeping every Excel row verbatim in exact chronological/Excel order
      const deduplicated = deduplicateRoster(parsedRoster, targetMonth, targetYear);
      const cleanParsedRoster = sortRosterChronologically(deduplicated, targetMonth, targetYear);

      // Synthesize Matrix Shift Data from exact parsed roster
      if (cleanParsedRoster.length > 0) {
        const dMap = new Map<string, { morning: string[]; evening: string[]; night: string[]; rumdin: string[] }>();
        cleanParsedRoster.forEach(it => {
          const d = it.dateStr || '';
          if (!d) return;
          if (!dMap.has(d)) dMap.set(d, { morning: [], evening: [], night: [], rumdin: [] });
          const grp = dMap.get(d)!;
          if (it.location === 'LIBUR' || it.location.includes('LIBUR')) {
            // libur dikecualikan dari kolom shift aktif
          } else if (it.location.includes('RUMAH') || it.location.includes('RUMDIN')) {
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

  // Handle Excel File Upload with Intelligent Month & Column Detection & Chronological Ordering
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const wb = XLSX.read(buffer, { type: 'array', cellNF: true, cellDates: false });
        const sheetNames = wb.SheetNames;
        if (!sheetNames || sheetNames.length === 0) {
          alert('File Excel tidak memiliki lembar kerja (sheet).');
          return;
        }

        setUploadedWorkbook(wb);
        setAvailableSheets(sheetNames);

        // Detect month & year from filename first
        const fileMonthInfo = extractMonthAndYearFromText(file.name);

        const sheetRowCount = (sName: string) => {
          const ws = wb.Sheets[sName];
          if (!ws || !ws['!ref']) return 0;
          const rng = XLSX.utils.decode_range(ws['!ref']);
          return rng.e.r - rng.s.r + 1;
        };

        const isHiddenSheet = (sName: string) => {
          const idx = sheetNames.indexOf(sName);
          return idx !== -1 && Boolean(wb.Workbook?.Sheets?.[idx]?.Hidden);
        };
        const visibleSheets = sheetNames.filter(s => !isHiddenSheet(s));
        const candidateSheets = visibleSheets.length > 0 ? visibleSheets : sheetNames;

        // Smart sheet selection across visible sheets: match filename month -> keyword-named sheet with data -> largest sheet
        let bestSheetName = candidateSheets[0];
        if (sheetRowCount(bestSheetName) < 3) {
          const nonEmptySheet = candidateSheets.find(s => sheetRowCount(s) >= 3);
          if (nonEmptySheet) bestSheetName = nonEmptySheet;
        }

        if (fileMonthInfo) {
          const matchingSheet = candidateSheets.find(s => {
            const sInfo = extractMonthAndYearFromText(s);
            return sInfo && sInfo.month === fileMonthInfo.month && sheetRowCount(s) >= 3;
          });
          if (matchingSheet) {
            bestSheetName = matchingSheet;
          }
        } else {
          const curMonth = new Date().getMonth() + 1;
          const monthSheets = candidateSheets
            .map(s => ({ name: s, info: extractMonthAndYearFromText(s), rows: sheetRowCount(s) }))
            .filter(x => x.info !== null && x.rows >= 5);
          const curMonthSheet = monthSheets.find(x => x.info!.month === curMonth);
          const keywordSheet = candidateSheets.find(s =>
            /(JADWAL|ROSTER|SECURITY|SATPAM|KEAMANAN|PENJAGAAN|PIKET|SHIFT)/i.test(s) && sheetRowCount(s) >= 5
          );
          if (curMonthSheet) {
            bestSheetName = curMonthSheet.name;
          } else if (monthSheets.length > 0) {
            monthSheets.sort((a, b) => (b.info!.year * 12 + b.info!.month) - (a.info!.year * 12 + a.info!.month));
            bestSheetName = monthSheets[0].name;
          } else if (keywordSheet) {
            bestSheetName = keywordSheet;
          } else if (sheetRowCount(bestSheetName) < 10) {
            const largest = [...candidateSheets].sort((a, b) => sheetRowCount(b) - sheetRowCount(a))[0];
            if (largest && sheetRowCount(largest) > sheetRowCount(bestSheetName)) {
              bestSheetName = largest;
            }
          }
        }

        let detectedMonthFromSheets = -1;
        let detectedYearFromSheets = 2026;
        const chosenTabInfo = extractMonthAndYearFromText(bestSheetName);
        if (chosenTabInfo) {
          detectedMonthFromSheets = chosenTabInfo.month;
          detectedYearFromSheets = chosenTabInfo.year;
        } else {
          const ws = wb.Sheets[bestSheetName];
          const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: false });
          for (let r = 0; r < Math.min((rows || []).length, 15); r++) {
            const rStr = ((rows || [])[r] || []).map(c => String(c || '')).join(' ');
            const mInfo = extractMonthAndYearFromText(rStr);
            if (mInfo) {
              detectedMonthFromSheets = mInfo.month;
              detectedYearFromSheets = mInfo.year;
              break;
            }
          }
        }

        let targetMonth = fileMonthInfo?.month || (detectedMonthFromSheets !== -1 ? detectedMonthFromSheets : new Date().getMonth() + 1);
        let targetYear = fileMonthInfo?.year || (detectedMonthFromSheets !== -1 ? detectedYearFromSheets : 2026);

        parseWorkbookSheet(wb, bestSheetName, targetMonth, targetYear, file.name);
      } catch (err) {
        console.error('Error reading Excel:', err);
        alert('Gagal membaca file Excel. Pastikan file berformat .xlsx, .xls, atau .csv');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Apply Excel Data & Overwrite Previous Excel Completely while preserving uploaded Excel rows verbatim
  const handleApplyExcel = async () => {
    if (isApplyingExcel) return;
    setIsApplyingExcel(true);

    try {
      const cleanedData = deduplicateRoster(previewRosterData, previewMonth, previewYear);
      const sortedData = sortRosterChronologically(cleanedData, previewMonth, previewYear);

      // Bersihkan cache penghapusan lama agar seluruh baris baru Excel tampil sempurna tanpa tersembunyi
      safeLocalStorageSet('melayu_deleted_security_roster_ids', JSON.stringify([]));
      try {
        localStorage.removeItem('melayu_security_roster_cleared');
        localStorage.removeItem('melayu_security_roster_user_modified');
      } catch (e) {}

      // Tandai bahwa jadwal telah diunggah resmi oleh administrator
      const applyTs = String(Date.now());
      safeLocalStorageSet('melayu_security_roster_custom_uploaded', 'true');
      safeLocalStorageSet('melayu_security_roster_updated_at', applyTs);
      safeLocalStorageSet('melayu_security_shifts_custom_uploaded', 'true');
      safeLocalStorageSet('melayu_security_shifts_updated_at', applyTs);
      safeLocalStorageSet('melayu_security_config_custom_uploaded', 'true');
      safeLocalStorageSet('melayu_security_config_updated_at', applyTs);

      const finalTitle = previewDocTitle;

      if (setSecurityRoster) {
        setSecurityRoster(sortedData);
        safeLocalStorageSet('melayu_security_roster', JSON.stringify(sortedData));
      }

      const finalShifts: SecurityShift[] = [];
      if (sortedData.length > 0) {
        const dateMap = new Map<string, { morning: string[]; evening: string[]; night: string[]; rumdin: string[] }>();
        sortedData.forEach(item => {
          const d = item.dateStr || '';
          if (!dateMap.has(d)) {
            dateMap.set(d, { morning: [], evening: [], night: [], rumdin: [] });
          }
          const grp = dateMap.get(d)!;
          if (item.location === 'LIBUR' || item.location.includes('LIBUR')) {
            // libur dikecualikan dari kolom shift aktif
          } else if (item.location.includes('RUMAH') || item.location.includes('RUMDIN')) {
            grp.rumdin.push(item.name);
          } else if (isMorningHours(item.hours, item.location)) {
            grp.morning.push(item.name);
          } else if (isEveningHours(item.hours, item.location)) {
            grp.evening.push(item.name);
          } else {
            grp.night.push(item.name);
          }
        });
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
      }

      setDocTitle(finalTitle);
      setDynamicHeaders(previewDocHeaders);
      setPrintMonth(previewMonth);
      setPrintYear(previewYear);
      setDeleteTargetMonth(previewMonth);
      setDeleteTargetYear(previewYear);

      safeLocalStorageSet('melayu_security_doc_title', finalTitle);
      safeLocalStorageSet('melayu_security_doc_headers', JSON.stringify(previewDocHeaders));
      safeLocalStorageSet('melayu_security_nov2026_preset_applied', 'true');

      // Reset filter
      setSearchQuery('');
      setSelectedLocation('ALL');
      setSelectedDate('ALL');
      setShowPreviewModal(false);

      // Force write to Firestore so stale local quota flags never drop explicit admin uploads
      const [rosterSaved, shiftsSaved, cfgSaved] = await Promise.all([
        saveFirestoreCollection('security_roster', sortedData, { force: true }),
        finalShifts.length > 0
          ? saveFirestoreCollection('security_shifts', finalShifts, { force: true })
          : Promise.resolve(true),
        saveFirestoreDoc('security_config', {
          id: 'main',
          docTitle: finalTitle,
          dynamicHeaders: previewDocHeaders,
          nov2026PresetApplied: true,
          updatedAt: new Date().toISOString()
        }, { force: true })
      ]);

      const cloudOk = rosterSaved && shiftsSaved && cfgSaved;
      setSuccessNotice(
        cloudOk
          ? `BERHASIL MEMUAT & MENYINKRONKAN DATA EXCEL! Menampilkan ${sortedData.length} baris jadwal pengawasan penjagaan keamanan dari file "${excelFileName}" sesuai isi dokumen Excel.`
          : `Data Excel (${sortedData.length} baris dari "${excelFileName}") berhasil ditampilkan di perangkat ini, namun sinkronisasi cloud tertunda karena batas kuota penulisan.`
      );
      setTimeout(() => setSuccessNotice(''), 8000);
    } finally {
      setIsApplyingExcel(false);
    }
  };

  // Download Templates matching exact structure in image (NAMA, HARI / TANGGAL, LOKASI, JAM HADIR with merged date & LIBUR cells)
  const handleDownloadRosterTemplate = () => {
    const tMonth = printMonth || 11;
    const tYear = printYear || 2026;
    const monthNameUpper = (ID_MONTHS_TITLE[tMonth - 1] || 'NOVEMBER').toUpperCase();
    const monthNameTitle = ID_MONTHS_TITLE[tMonth - 1] || 'November';
    const daysInMonth = new Date(tYear, tMonth, 0).getDate();

    const aoa: string[][] = [['NAMA', 'HARI / TANGGAL', 'LOKASI', 'JAM HADIR']];
    const merges: XLSX.Range[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(tYear, tMonth - 1, day);
      const dayName = ID_DAYS_UPPER[d.getDay()];
      const dateStr = `${dayName} / ${day} ${monthNameUpper} ${tYear}`;
      const diffDays = Math.round((Date.UTC(tYear, tMonth - 1, day) - Date.UTC(2026, 9, 1)) / 86400000);
      const rotIdx = ((diffDays % 6) + 6) % 6;
      const rot = OCTOBER_DAILY_ROTATION[rotIdx];

      const startRow = aoa.length;
      aoa.push(
        [rot.morning[0], dateStr, 'KANWIL DJPB', '06.00 / 18.00'],
        [rot.morning[1], '',      'KANWIL DJPB', '06.00 / 18.00'],
        [rot.night[0],   '',      'KANWIL DJPB', '18.00 / 06.00'],
        [rot.night[1],   '',      'KANWIL DJPB', '18.00 / 06.00'],
        [rot.rumdin,     '',      'RUMAH DINAS', '18.00 / 06.00'],
        [rot.libur,      '',      'LIBUR',       '']
      );
      // Merge HARI / TANGGAL vertically across the 6 rows for this date
      merges.push({ s: { r: startRow, c: 1 }, e: { r: startRow + 5, c: 1 } });
      // Merge LOKASI + JAM HADIR horizontally on the LIBUR row
      merges.push({ s: { r: startRow + 5, c: 2 }, e: { r: startRow + 5, c: 3 } });
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = merges;
    ws['!cols'] = [{ wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Roster Security');
    XLSX.writeFile(wb, `Template_Jadwal_Security_${monthNameTitle}_${tYear}.xlsx`);
  };

  // Export Current displayed roster or matrix (with merged HARI / TANGGAL and LIBUR cells matching display & image)
  const handleExportRoster = () => {
    const wb = XLSX.utils.book_new();

    if (viewMode === 'matrix') {
      const matrixFiltered = displayShifts.filter(
        s =>
          !searchQuery ||
          (s.day && s.day.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (s.shiftMorning && s.shiftMorning.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (s.shiftEvening && s.shiftEvening.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (s.shiftNight && s.shiftNight.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      const aoa: (string | number)[][] = [
        ['NO', 'HARI / TANGGAL', 'SHIFT PAGI (06.00/18.00)', 'SHIFT SORE (14.00/22.00)', 'SHIFT MALAM & RUMDIN (18.00/06.00)']
      ];
      matrixFiltered.forEach((s, idx) => {
        aoa.push([idx + 1, s.day, s.shiftMorning || '-', s.shiftEvening || '-', s.shiftNight || '-']);
      });
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 28 }, { wch: 22 }, { wch: 36 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Matriks Shift Security');
    } else {
      const exportSource = filteredRoster;
      const aoa: (string | number)[][] = [['NO', 'NAMA PETUGAS', 'HARI / TANGGAL', 'LOKASI / POS', 'JAM HADIR']];
      const merges: XLSX.Range[] = [];

      let i = 0;
      while (i < exportSource.length) {
        const currentDate = (exportSource[i]?.dateStr || '').trim();
        let groupCount = 1;
        while (
          i + groupCount < exportSource.length &&
          (exportSource[i + groupCount]?.dateStr || '').trim() === currentDate
        ) {
          groupCount++;
        }

        const startExcelRow = aoa.length;
        for (let k = 0; k < groupCount; k++) {
          const item = exportSource[i + k];
          const isLibur = item.location === 'LIBUR';
          aoa.push([
            i + k + 1,
            item.name,
            k === 0 ? item.dateStr : '',
            item.location,
            isLibur ? '' : item.hours
          ]);
          if (isLibur) {
            merges.push({ s: { r: startExcelRow + k, c: 3 }, e: { r: startExcelRow + k, c: 4 } });
          }
        }
        if (groupCount > 1) {
          merges.push({ s: { r: startExcelRow, c: 2 }, e: { r: startExcelRow + groupCount - 1, c: 2 } });
        }
        i += groupCount;
      }

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      if (merges.length > 0) ws['!merges'] = merges;
      ws['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Roster Security');
    }

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
    setDocTitle('JADWAL PENGAWASAN PENJAGAAN KEAMANAN BULAN NOVEMBER 2026');
    setDynamicHeaders(['NO.', 'NAMA PETUGAS', 'HARI / TANGGAL', 'LOKASI / POS', 'JAM HADIR']);
    setSelectedIds([]);
    setSuccessNotice('Jadwal berhasil dikembalikan ke pengaturan default Bulan November 2026.');
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
                  onClick={handleLoadNovember2026Roster}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                  title="Muat & Sinkronkan Jadwal Penjagaan Security Bulan November 2026 (1–30 November 2026) sesuai susunan resmi"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Sinkron Jadwal Nov 2026</span>
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
                  {uniqueLocations.map((loc, idx) => (
                    <option key={idx} value={loc}>{loc}</option>
                  ))}
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
                  .filter(s => !searchQuery || (s.day && s.day.toLowerCase().includes(searchQuery.toLowerCase())) || (s.shiftMorning && s.shiftMorning.toLowerCase().includes(searchQuery.toLowerCase())) || (s.shiftEvening && s.shiftEvening.toLowerCase().includes(searchQuery.toLowerCase())) || (s.shiftNight && s.shiftNight.toLowerCase().includes(searchQuery.toLowerCase())))
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

                      {/* LOKASI & JAM HADIR CELL (LIBUR merged horizontally matching image.png) */}
                      {item.location === 'LIBUR' ? (
                        <td colSpan={2} className="py-3 px-4 border-r border-slate-200 font-sans font-bold text-center bg-rose-50/60">
                          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md bg-rose-100 text-rose-700 border border-rose-300 text-[11px] font-bold">
                            <span>LIBUR</span>
                          </span>
                        </td>
                      ) : (
                        <>
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
                            {!['KANWIL DJPB', 'RUMAH DINAS', 'LIBUR'].includes(item.location) && (
                              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-200 text-[11px] font-bold">
                                <span>{item.location}</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 border-r border-slate-200 font-mono font-bold text-slate-800">
                            {item.hours === '-' || !item.hours ? (
                              <span className="text-slate-400 font-bold">-</span>
                            ) : isMorningHours(item.hours, item.location) ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
                                {item.hours}
                              </span>
                            ) : isNightHours(item.hours, item.location) ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs font-bold">
                                {item.hours}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold">
                                {item.hours}
                              </span>
                            )}
                          </td>
                        </>
                      )}

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
                        parseWorkbookSheet(uploadedWorkbook, selectedSheet, m, previewYear, excelFileName, true);
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

              {/* Data Verification Badges & Format Info */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-900 font-bold rounded-md border border-blue-200">
                  Total: {previewRosterData.length} baris dari Excel
                </span>
                <span className="px-2 py-0.5 bg-slate-200/80 text-slate-800 font-bold rounded-md border border-slate-300">
                  Sheet: {selectedSheet || '-'}
                </span>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-900 font-bold rounded-md border border-indigo-200">
                  Format: {previewFormatLabel}
                </span>
              </div>

              {/* Optional Column Mapping Adjustment for Tabular Excel */}
              {previewTabularMap && previewColOptions.length > 0 && (
                <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-700">
                    Pemetaan Kolom Excel (Sesuaikan jika kolom Excel berbeda):
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: 'name' as const, label: 'Kolom Nama' },
                      { key: 'date' as const, label: 'Kolom Hari/Tanggal' },
                      { key: 'loc' as const, label: 'Kolom Lokasi' },
                      { key: 'hours' as const, label: 'Kolom Jam Hadir' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">{label}</label>
                        <select
                          value={previewTabularMap[key]}
                          onChange={(e) => {
                            const nextVal = parseInt(e.target.value, 10);
                            const nextMap = { ...previewTabularMap, [key]: nextVal };
                            setPreviewTabularMap(nextMap);
                            if (uploadedWorkbook && selectedSheet) {
                              parseWorkbookSheet(uploadedWorkbook, selectedSheet, previewMonth, previewYear, excelFileName, true, nextMap);
                            }
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-djpb-blue"
                        >
                          <option value={-1}>(Otomatis / Tidak Ada)</option>
                          {previewColOptions.map(opt => (
                            <option key={opt.idx} value={opt.idx}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                        {row.location === 'LIBUR' ? (
                          <td colSpan={2} className="py-2 px-3 font-sans text-center bg-rose-50/60">
                            <span className="px-2.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-300">LIBUR</span>
                          </td>
                        ) : (
                          <>
                            <td className="py-2 px-3 border-r border-slate-200 font-sans">
                              {row.location}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold">
                              {row.hours === '-' || !row.hours ? (
                                <span className="text-slate-400">-</span>
                              ) : (
                                row.hours
                              )}
                            </td>
                          </>
                        )}
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
                disabled={isApplyingExcel}
                onClick={handleApplyExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center space-x-1.5 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>{isApplyingExcel ? 'Menyimpan...' : 'Terapkan Jadwal Baru'}</span>
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

              {/* Option: Sinkronkan Jadwal Bulan November 2026 Resmi */}
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  handleLoadNovember2026Roster();
                }}
                className="w-full p-3.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-left transition-all cursor-pointer group flex items-center justify-between"
              >
                <div>
                  <div className="font-extrabold text-xs text-blue-900 flex items-center space-x-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>SINKRONKAN JADWAL BULAN NOVEMBER 2026 (1–30 NOVEMBER 2026)</span>
                  </div>
                  <p className="text-[11px] text-blue-700 mt-0.5 ml-5">
                    Memuat jadwal penjagaan security resmi bulan November 2026 (2 Pagi 06.00 / 18.00 di KANWIL DJPB, 2 Malam 18.00 / 06.00 di KANWIL DJPB, 1 Rumdin 18.00 / 06.00, dan 1 Libur per hari).
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-blue-600 text-white font-bold text-[10px] rounded-lg shadow-2xs">
                  Muat Nov 2026
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
                        const isLibur = item.location === 'LIBUR';
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-1.5 text-center font-bold text-slate-700 border-r border-slate-400">
                              {idx + 1}
                            </td>
                            <td className={`py-1.5 px-3 font-extrabold border-r border-slate-400 ${isLibur ? 'text-rose-600' : 'text-slate-900'}`}>
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
                            {isLibur ? (
                              <td colSpan={2} className="py-1.5 px-3 font-bold text-center bg-rose-50/50">
                                <span className="text-rose-700 font-bold">LIBUR</span>
                              </td>
                            ) : (
                              <>
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
                              </>
                            )}
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
