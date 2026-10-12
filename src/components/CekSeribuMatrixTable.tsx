import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, Download, Upload, Filter, AlertTriangle, Check, RefreshCw, 
  FileSpreadsheet, Eye, Tag, Trash2, Trash, AlertCircle, X,
  Printer, FileText, ExternalLink, ZoomIn, ZoomOut, Loader2, CheckCircle2,
  SlidersHorizontal, Settings2, ShieldCheck, HelpCircle, Info, Calendar,
  CalendarRange, ArrowUpDown, Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import KemenkeuLogo from './KemenkeuLogo';
import { exportElementToPdf, createPdfFromElement, printDocumentElement } from '../lib/pdfExport';
import { safeLocalStorageSet } from '../lib/storage';

export interface MatrixRowData {
  id: string;
  nama: string;
  isYellow?: boolean;
  records: {
    [dateKey: string]: {
      hadir: 'Ada' | 'Tidak';
      pulang: 'Ada' | 'Tidak';
    };
  };
}

// Urutan tanggal presensi Cek Seribu dari tanggal awal ke tanggal akhir: 07 Oktober 2026 s.d. 12 Oktober 2026
export const OCTOBER_CEK_SERIBU_DATES = [
  '07-Okt-26',
  '08-Okt-26',
  '09-Okt-26',
  '10-Okt-26',
  '11-Okt-26',
  '12-Okt-26'
];

export const BASE_CEK_SERIBU_EMPLOYEES: Array<{ id: string; nama: string; isYellow?: boolean }> = [
  { id: 'csr-1', nama: 'Abil Fikri Audia' },
  { id: 'csr-2', nama: 'Achmad Djunaidi', isYellow: true },
  { id: 'csr-3', nama: 'Ade Wahyu Susanto' },
  { id: 'csr-4', nama: 'Ahmad Nauval' },
  { id: 'csr-5', nama: 'Ahmad Widyarma' },
  { id: 'csr-6', nama: 'Ahmad Yusuf' },
  { id: 'csr-7', nama: 'Aldi Putra Hernandes' },
  { id: 'csr-8', nama: 'Alni Agustin' },
  { id: 'csr-9', nama: 'Alviza Fadiya Putri' },
  { id: 'csr-10', nama: 'Amylia Febriyanti' },
  { id: 'csr-11', nama: 'Anang Surya Widayanto' },
  { id: 'csr-12', nama: 'Andi Mulyadi' },
  { id: 'csr-13', nama: 'Angga Firmansyah' },
  { id: 'csr-14', nama: 'Aprina Elisabeth Br Manik' },
  { id: 'csr-15', nama: 'Asep Rudi' },
  { id: 'csr-16', nama: 'Atalia Manurung' },
  { id: 'csr-17', nama: 'Audy Morenta Tatyana Girsang' },
  { id: 'csr-18', nama: 'Ayu Pramita' },
  { id: 'csr-19', nama: 'Betrice Mega Maria Br Pakpahan' },
  { id: 'csr-20', nama: 'Bulan Indah Purnama Siregar' },
  { id: 'csr-21', nama: 'Charis Danindra Charya Nadiaskara' },
  { id: 'csr-22', nama: 'Dea Ivana Christi Br. Ginting' },
  { id: 'csr-23', nama: 'Denny Aulia' },
  { id: 'csr-24', nama: 'Devina Rosa Sitepu' },
  { id: 'csr-25', nama: 'Dicky Priatama' },
  { id: 'csr-26', nama: 'Dirga Paul Samuelson Situmorang' },
  { id: 'csr-27', nama: 'Ditta Arbilla Pratiwi' },
  { id: 'csr-28', nama: 'Donny Sulastiawan' },
  { id: 'csr-29', nama: 'Dwi Prioatmaji' },
  { id: 'csr-30', nama: 'Eko Sambas Priyatna' },
  { id: 'csr-31', nama: 'Eko Supriyanto' },
  { id: 'csr-32', nama: 'Elisa' },
  { id: 'csr-33', nama: 'Elsa Natalia Situmorang' },
  { id: 'csr-34', nama: 'Elyas Setyantoro' },
  { id: 'csr-35', nama: 'Ernita', isYellow: true },
  { id: 'csr-36', nama: 'Fani Nurfadila Nastitie Ariawan' },
  { id: 'csr-37', nama: 'Farhan Ikram Rahimy' },
  { id: 'csr-38', nama: 'Febri Anastasia Simanjuntak' },
  { id: 'csr-39', nama: 'Fewia Zikri Ramadhani' },
  { id: 'csr-40', nama: 'Firza Yulianti' },
  { id: 'csr-41', nama: 'Franklin Sipayung' },
  { id: 'csr-42', nama: 'Frans Matthew Manurung' },
  { id: 'csr-43', nama: 'Frans Ricky Haholongan Butar Butar' },
  { id: 'csr-44', nama: 'Frediek Mulawan' },
  { id: 'csr-45', nama: 'Gandis Nareswari' },
  { id: 'csr-46', nama: 'Gatut Priyo Sembodo' },
  { id: 'csr-47', nama: 'Halim' },
  { id: 'csr-48', nama: 'Hermawan Saptono' },
  { id: 'csr-49', nama: 'Indra Faizal' },
  { id: 'csr-50', nama: 'Irene Aritonang' },
  { id: 'csr-51', nama: 'Judhistira Adi Noegraha' },
  { id: 'csr-52', nama: 'Kamelia Ulfa' },
  { id: 'csr-53', nama: 'Karno Pandu Wibowo' },
  { id: 'csr-54', nama: 'Kartika Chandra' },
  { id: 'csr-55', nama: 'Kurnia Fitri Anidya' },
  { id: 'csr-56', nama: 'Lina Armila' },
  { id: 'csr-57', nama: 'Mahbub Ulhaq' },
  { id: 'csr-58', nama: 'Maria Siska Tinambunan' },
  { id: 'csr-59', nama: 'Maulana Gilang Firdaus' },
  { id: 'csr-60', nama: 'Meda Febriana Aquares' },
  { id: 'csr-61', nama: 'Michael Amstrong Sidabutar' },
  { id: 'csr-62', nama: 'Mirza Rahmat Suharta' },
  { id: 'csr-63', nama: 'Mohammad Firdaus' },
  { id: 'csr-64', nama: 'Muhammad Ali Mutohar' },
  { id: 'csr-65', nama: 'Nanang Heru Setyo Purdianto' },
  { id: 'csr-66', nama: 'Nila Anggraini' },
  { id: 'csr-67', nama: 'Nindia Dita Putri' },
  { id: 'csr-68', nama: 'Novrenti Yosephine Br. Perangin-Angin' },
  { id: 'csr-69', nama: 'Nur Asri' },
  { id: 'csr-70', nama: 'Ot Hendri Fitrahadi' },
  { id: 'csr-71', nama: 'Puji Hartanto' },
  { id: 'csr-72', nama: 'Rangga Wingit' },
  { id: 'csr-73', nama: 'Resa Kusumasari Saputro' },
  { id: 'csr-74', nama: 'Rose Aprinia Sibuea' },
  { id: 'csr-75', nama: 'Rusdi Z.' },
  { id: 'csr-76', nama: 'Said Sjafrizal' },
  { id: 'csr-77', nama: 'Saifan Abdulloh Muqimuddin' },
  { id: 'csr-78', nama: 'Saor Silitonga' },
  { id: 'csr-79', nama: 'Sari Fadillah' },
  { id: 'csr-80', nama: 'Setia Lassunardo Sitanggang' },
  { id: 'csr-81', nama: 'Shania Carissa' },
  { id: 'csr-82', nama: 'Siti Aminah' },
  { id: 'csr-83', nama: 'Tri Utomo' },
  { id: 'csr-84', nama: 'Tri Widiyono' },
  { id: 'csr-85', nama: 'Winarni Rahayu' },
  { id: 'csr-86', nama: 'Yasmi' },
  { id: 'csr-87', nama: 'Yayat Nurhayat' },
  { id: 'csr-88', nama: 'Yoel Parlaungan Simamora' },
  { id: 'csr-89', nama: 'Yohana Miranda Manik' },
  { id: 'csr-90', nama: 'Yolanda Catherina Sirait' }
];

// Helper to generate realistic attendance dataset ordered chronologically from 07 Oktober 2026 to 12 Oktober 2026
export function createOctoberDefaultMatrix(): MatrixRowData[] {
  return BASE_CEK_SERIBU_EMPLOYEES.map((emp) => {
    const isAlwaysAbsent =
      emp.nama === 'Ahmad Widyarma' ||
      emp.nama === 'Ahmad Yusuf' ||
      emp.nama === 'Audy Morenta Tatyana Girsang' ||
      emp.nama === 'Betrice Mega Maria Br Pakpahan' ||
      emp.nama === 'Dwi Prioatmaji' ||
      emp.nama === 'Frans Matthew Manurung' ||
      emp.nama === 'Maulana Gilang Firdaus' ||
      emp.nama === 'Tri Utomo';

    const newRecords: Record<string, { hadir: 'Ada' | 'Tidak'; pulang: 'Ada' | 'Tidak' }> = {};

    OCTOBER_CEK_SERIBU_DATES.forEach((dKey, dIdx) => {
      if (isAlwaysAbsent) {
        newRecords[dKey] = { hadir: 'Tidak', pulang: 'Tidak' };
      } else if (emp.isYellow && (dIdx === 1 || dIdx === 4)) {
        newRecords[dKey] = { hadir: 'Ada', pulang: 'Tidak' };
      } else if (emp.nama === 'Alviza Fadiya Putri' && dIdx === 0) {
        newRecords[dKey] = { hadir: 'Tidak', pulang: 'Tidak' };
      } else if (
        (emp.nama === 'Aldi Putra Hernandes' ||
         emp.nama === 'Amylia Febriyanti' ||
         emp.nama === 'Angga Firmansyah' ||
         emp.nama === 'Asep Rudi' ||
         emp.nama === 'Dirga Paul Samuelson Situmorang' ||
         emp.nama === 'Fani Nurfadila Nastitie Ariawan' ||
         emp.nama === 'Frans Ricky Haholongan Butar Butar' ||
         emp.nama === 'Setia Lassunardo Sitanggang') &&
        dIdx === 2
      ) {
        newRecords[dKey] = { hadir: 'Ada', pulang: 'Tidak' };
      } else if (
        (emp.nama === 'Anang Surya Widayanto' ||
         emp.nama === 'Frediek Mulawan' ||
         emp.nama === 'Gatut Priyo Sembodo' ||
         emp.nama === 'Halim' ||
         emp.nama === 'Judhistira Adi Noegraha' ||
         emp.nama === 'Mirza Rahmat Suharta' ||
         emp.nama === 'Nindia Dita Putri' ||
         emp.nama === 'Yoel Parlaungan Simamora') &&
        dIdx === 2
      ) {
        newRecords[dKey] = { hadir: 'Tidak', pulang: 'Tidak' };
      } else if (
        (emp.nama === 'Firza Yulianti' ||
         emp.nama === 'Kamelia Ulfa' ||
         emp.nama === 'Saifan Abdulloh Muqimuddin' ||
         emp.nama === 'Tri Widiyono') &&
        (dIdx === 1 || dIdx === 2)
      ) {
        newRecords[dKey] = { hadir: 'Tidak', pulang: 'Tidak' };
      } else {
        newRecords[dKey] = { hadir: 'Ada', pulang: 'Ada' };
      }
    });

    return {
      id: emp.id,
      nama: emp.nama,
      isYellow: Boolean(emp.isYellow),
      records: newRecords
    };
  });
}

// Default 90 employees with October 07 to 12 sequence (tanggal awal ke tanggal akhir)
export const INITIAL_CEK_SERIBU_MATRIX: MatrixRowData[] = createOctoberDefaultMatrix();

export interface MonthYearDetection {
  monthNum: string;
  monthName: string;
  year: string;
}

export const MONTH_NAMES_MAP: Record<string, { num: string; name: string }> = {
  '01': { num: '01', name: 'Januari' }, '1': { num: '01', name: 'Januari' }, 'jan': { num: '01', name: 'Januari' }, 'januari': { num: '01', name: 'Januari' }, 'january': { num: '01', name: 'Januari' },
  '02': { num: '02', name: 'Februari' }, '2': { num: '02', name: 'Februari' }, 'feb': { num: '02', name: 'Februari' }, 'februari': { num: '02', name: 'Februari' }, 'february': { num: '02', name: 'Februari' },
  '03': { num: '03', name: 'Maret' }, '3': { num: '03', name: 'Maret' }, 'mar': { num: '03', name: 'Maret' }, 'maret': { num: '03', name: 'Maret' }, 'march': { num: '03', name: 'Maret' },
  '04': { num: '04', name: 'April' }, '4': { num: '04', name: 'April' }, 'apr': { num: '04', name: 'April' }, 'april': { num: '04', name: 'April' },
  '05': { num: '05', name: 'Mei' }, '5': { num: '05', name: 'Mei' }, 'mei': { num: '05', name: 'Mei' }, 'may': { num: '05', name: 'Mei' },
  '06': { num: '06', name: 'Juni' }, '6': { num: '06', name: 'Juni' }, 'jun': { num: '06', name: 'Juni' }, 'juni': { num: '06', name: 'Juni' }, 'june': { num: '06', name: 'Juni' },
  '07': { num: '07', name: 'Juli' }, '7': { num: '07', name: 'Juli' }, 'jul': { num: '07', name: 'Juli' }, 'juli': { num: '07', name: 'Juli' }, 'july': { num: '07', name: 'Juli' },
  '08': { num: '08', name: 'Agustus' }, '8': { num: '08', name: 'Agustus' }, 'agu': { num: '08', name: 'Agustus' }, 'ags': { num: '08', name: 'Agustus' }, 'agustus': { num: '08', name: 'Agustus' }, 'aug': { num: '08', name: 'Agustus' }, 'august': { num: '08', name: 'Agustus' },
  '09': { num: '09', name: 'September' }, '9': { num: '09', name: 'September' }, 'sep': { num: '09', name: 'September' }, 'september': { num: '09', name: 'September' },
  '10': { num: '10', name: 'Oktober' }, 'okt': { num: '10', name: 'Oktober' }, 'oktober': { num: '10', name: 'Oktober' }, 'oct': { num: '10', name: 'Oktober' }, 'october': { num: '10', name: 'Oktober' },
  '11': { num: '11', name: 'November' }, 'nov': { num: '11', name: 'November' }, 'november': { num: '11', name: 'November' },
  '12': { num: '12', name: 'Desember' }, 'des': { num: '12', name: 'Desember' }, 'desember': { num: '12', name: 'Desember' }, 'dec': { num: '12', name: 'Desember' }, 'december': { num: '12', name: 'Desember' }
};

export const MONTH_LIST_OPTIONS = [
  { num: '01', name: 'Januari' },
  { num: '02', name: 'Februari' },
  { num: '03', name: 'Maret' },
  { num: '04', name: 'April' },
  { num: '05', name: 'Mei' },
  { num: '06', name: 'Juni' },
  { num: '07', name: 'Juli' },
  { num: '08', name: 'Agustus' },
  { num: '09', name: 'September' },
  { num: '10', name: 'Oktober' },
  { num: '11', name: 'November' },
  { num: '12', name: 'Desember' }
];

export function detectMonthYearFromStrings(sources: string[]): MonthYearDetection | null {
  const monthCounts: Record<string, { count: number; year: string }> = {};

  for (const s of sources) {
    if (!s) continue;
    const str = String(s).trim().toLowerCase();

    // 1. Check word match like "22-Jul-26", "1 Okt 2026", "24-Jul-2026"
    const wordMatch = str.match(/(\d{1,2})[\s\/\.\-]([a-z]{3,9})[\s\/\.\-](\d{2,4})/);
    if (wordMatch) {
      const mKey = wordMatch[2];
      const yKey = wordMatch[3].length === 2 ? '20' + wordMatch[3] : wordMatch[3];
      if (MONTH_NAMES_MAP[mKey]) {
        const item = MONTH_NAMES_MAP[mKey];
        if (!monthCounts[item.num]) monthCounts[item.num] = { count: 0, year: yKey };
        monthCounts[item.num].count += 2;
        continue;
      }
    }

    // 2. Check ISO match like "2026-10-02"
    const isoMatch = str.match(/(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})/);
    if (isoMatch) {
      const yKey = isoMatch[1];
      const mNum = isoMatch[2].padStart(2, '0');
      if (MONTH_NAMES_MAP[mNum]) {
        const item = MONTH_NAMES_MAP[mNum];
        if (!monthCounts[item.num]) monthCounts[item.num] = { count: 0, year: yKey };
        monthCounts[item.num].count += 2;
        continue;
      }
    }

    // 3. Check numeric date match like "22-07-2026" or "10/08/2026"
    const numMatch = str.match(/(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})/);
    if (numMatch) {
      const p1 = parseInt(numMatch[1], 10);
      const p2 = parseInt(numMatch[2], 10);
      const yKey = numMatch[3].length === 2 ? '20' + numMatch[3] : numMatch[3];
      let mNum = String(p2).padStart(2, '0');
      if (p1 > 12 && p2 <= 12) {
        mNum = String(p2).padStart(2, '0');
      } else if (p2 > 12 && p1 <= 12) {
        mNum = String(p1).padStart(2, '0');
      }
      if (MONTH_NAMES_MAP[mNum]) {
        const item = MONTH_NAMES_MAP[mNum];
        if (!monthCounts[item.num]) monthCounts[item.num] = { count: 0, year: yKey };
        monthCounts[item.num].count += 2;
        continue;
      }
    }

    // 4. Check text search for month name and 4-digit year, e.g. "Bulan Oktober 2026"
    for (const [key, val] of Object.entries(MONTH_NAMES_MAP)) {
      if (key.length >= 3 && str.includes(key)) {
        const yrMatch = str.match(/\b(20\d{2})\b/);
        const yKey = yrMatch ? yrMatch[1] : '2026';
        if (!monthCounts[val.num]) monthCounts[val.num] = { count: 0, year: yKey };
        monthCounts[val.num].count += 1;
        break;
      }
    }
  }

  let topM: string | null = null;
  let topCount = 0;
  for (const [mNum, data] of Object.entries(monthCounts)) {
    if (data.count > topCount) {
      topCount = data.count;
      topM = mNum;
    }
  }

  if (topM && monthCounts[topM]) {
    const item = MONTH_NAMES_MAP[topM];
    return { monthNum: item.num, monthName: item.name, year: monthCounts[topM].year };
  }
  return null;
}

export function detectMonthYearFromMatrix(matrix: MatrixRowData[]): MonthYearDetection | null {
  if (!matrix || matrix.length === 0) return null;
  const dates: string[] = [];
  for (const row of matrix) {
    if (row.records) {
      for (const d of Object.keys(row.records)) {
        dates.push(d);
      }
    }
  }
  return detectMonthYearFromStrings(dates);
}

export function replaceMonthInDateKey(dateKey: string, targetMonthNum: string, targetYear: string): string {
  const str = String(dateKey).trim();
  const targetShortMonth = MONTH_NAMES_MAP[targetMonthNum] ? MONTH_NAMES_MAP[targetMonthNum].name.slice(0, 3) : 'Jul';
  const targetShortYr = targetYear.slice(2);

  // Check word format like 22-Jul-26 or 22-Oct-26
  const wordMatch = str.match(/^(\d{1,2})[\s\/\.\-]([a-zA-Z]{3,9})[\s\/\.\-](\d{2,4})$/);
  if (wordMatch) {
    const day = wordMatch[1].padStart(2, '0');
    return `${day}-${targetShortMonth}-${targetShortYr}`;
  }

  // Check numeric format like 22-07-2026
  const numMatch = str.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})$/);
  if (numMatch) {
    const day = numMatch[1].padStart(2, '0');
    return `${day}-${targetMonthNum}-${targetYear}`;
  }

  return str;
}

const MONTH_INDEX_MAP: Record<string, number> = {
  jan: 0, januari: 0, january: 0, '01': 0, '1': 0,
  feb: 1, februari: 1, february: 1, '02': 1, '2': 1,
  mar: 2, maret: 2, march: 2, '03': 2, '3': 2,
  apr: 3, april: 3, '04': 3, '4': 3,
  mei: 4, may: 4, '05': 4, '5': 4,
  jun: 5, juni: 5, june: 5, '06': 5, '6': 5,
  jul: 6, juli: 6, july: 6, '07': 6, '7': 6,
  agu: 7, ags: 7, agustus: 7, aug: 7, august: 7, '08': 7, '8': 7,
  sep: 8, september: 8, '09': 8, '9': 8,
  okt: 9, oktober: 9, oct: 9, october: 9, '10': 9,
  nov: 10, november: 10, '11': 10,
  des: 11, desember: 11, dec: 11, december: 11, '12': 11
};

export function parseDateToTimestamp(str: string): number {
  if (!str) return 0;
  let s = String(str).trim().toLowerCase();

  // Strip day prefix if any, e.g. "rabu, " or "rabu/ " or "senin - "
  s = s.replace(/^(senin|selasa|rabu|kamis|jumat|sabtu|minggu|mon|tue|wed|thu|fri|sat|sun)[\s\,\/\-]+/i, '').trim();

  // 1. ISO format: 2026-10-07
  const iso = s.match(/^(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})$/);
  if (iso) {
    return new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10)).getTime();
  }

  // 2. Word format: 07-Oct-26, 7 Okt 2026, 12-Oktober-2026, 07-Okt-26
  const word = s.match(/^(\d{1,2})[\s\/\.\-]([a-z]{3,9})[\s\/\.\-](\d{2,4})$/);
  if (word) {
    const day = parseInt(word[1], 10);
    const mStr = word[2];
    let yr = parseInt(word[3], 10);
    if (yr < 100) yr += 2000;
    const mIdx = MONTH_INDEX_MAP[mStr];
    if (mIdx !== undefined && !isNaN(day) && !isNaN(yr)) {
      return new Date(yr, mIdx, day).getTime();
    }
  }

  // 3. Numeric format: 07-10-2026 or 07/10/26
  const num = s.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})$/);
  if (num) {
    const p1 = parseInt(num[1], 10);
    const p2 = parseInt(num[2], 10);
    let yr = parseInt(num[3], 10);
    if (yr < 100) yr += 2000;
    let day = p1;
    let month = p2 - 1;
    if (p1 > 12 && p2 <= 12) {
      day = p1;
      month = p2 - 1;
    } else if (p2 > 12 && p1 <= 12) {
      day = p2;
      month = p1 - 1;
    }
    if (!isNaN(day) && !isNaN(month) && !isNaN(yr)) {
      return new Date(yr, month, day).getTime();
    }
  }

  return 0;
}

// Strictly sort any dates list chronologically from tanggal awal ke tanggal akhir
export function sortDatesChronologically(dateList: string[]): string[] {
  return [...dateList].sort((a, b) => {
    const tA = parseDateToTimestamp(a);
    const tB = parseDateToTimestamp(b);
    if (tA && tB && tA !== tB) {
      return tA - tB;
    }
    if (tA && !tB) return -1;
    if (!tA && tB) return 1;
    return a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' });
  });
}

// Generate realistic dataset for 07 Oktober 2026 s.d. 12 Oktober 2026
export function generateOctober07to12Matrix(): MatrixRowData[] {
  const dates = ['07-Okt-26', '08-Okt-26', '09-Okt-26', '10-Okt-26', '11-Okt-26', '12-Okt-26'];
  return INITIAL_CEK_SERIBU_MATRIX.map((emp) => {
    const newRecords: Record<string, { hadir: 'Ada' | 'Tidak'; pulang: 'Ada' | 'Tidak' }> = {};
    const isAlwaysAbsent =
      emp.nama === 'Ahmad Widyarma' ||
      emp.nama === 'Ahmad Yusuf' ||
      emp.nama === 'Audy Morenta Tatyana Girsang' ||
      emp.nama === 'Betrice Mega Maria Br Pakpahan';

    dates.forEach((dKey, dIdx) => {
      if (isAlwaysAbsent) {
        newRecords[dKey] = { hadir: 'Tidak', pulang: 'Tidak' };
      } else if (emp.isYellow && (dIdx === 1 || dIdx === 4)) {
        newRecords[dKey] = { hadir: 'Ada', pulang: 'Tidak' };
      } else {
        newRecords[dKey] = { hadir: 'Ada', pulang: 'Ada' };
      }
    });

    return {
      ...emp,
      records: newRecords
    };
  });
}

interface Props {
  data?: MatrixRowData[];
  onDataChange?: (newData: MatrixRowData[], detectedMonth?: string, detectedYear?: string) => void;
  canManageAdmin?: boolean;
  selectedMonth?: string;
  selectedYear?: string;
  onMonthYearChange?: (month: string, year: string) => void;
}

export const CekSeribuMatrixTable: React.FC<Props> = ({
  data = [],
  onDataChange,
  canManageAdmin = true,
  selectedMonth,
  selectedYear,
  onMonthYearChange,
}) => {
  const [matrixData, setMatrixData] = useState<MatrixRowData[]>(() => {
    let list = data && data.length > 0 ? data : INITIAL_CEK_SERIBU_MATRIX;
    const hasOldJulyOnly =
      list.some((r) => r.records && Object.keys(r.records).some((k) => k.includes('Jul'))) &&
      !list.some((r) => r.records && Object.keys(r.records).some((k) => k.includes('Okt') || k.includes('10')));
    if (hasOldJulyOnly) {
      list = INITIAL_CEK_SERIBU_MATRIX;
    }
    return [...list].sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'ANOMALI' | 'TIDAK_HADIR'>('ALL');

  // Month & Year state adjusted to Excel or admin choice (Default: Oktober 2026)
  const [customMonthNum, setCustomMonthNum] = useState<string>(() => {
    const saved = localStorage.getItem('melayu_cek_seribu_month');
    if (saved && saved !== '07') return saved;
    const det = detectMonthYearFromMatrix(data || []);
    return det ? det.monthNum : (selectedMonth || '10');
  });

  const [customYear, setCustomYear] = useState<string>(() => {
    const saved = localStorage.getItem('melayu_cek_seribu_year');
    if (saved) return saved;
    const det = detectMonthYearFromMatrix(data || []);
    return det ? det.year : (selectedYear || '2026');
  });

  // Sync external props if updated and sort alphabetically
  React.useEffect(() => {
    const sorted = [...(data || [])].sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
    setMatrixData(sorted);
  }, [data]);

  const updateMatrix = (updated: MatrixRowData[], mNum?: string, yStr?: string) => {
    const sorted = [...updated].sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
    setMatrixData(sorted);
    const effectiveM = mNum || customMonthNum;
    const effectiveY = yStr || customYear;
    if (onDataChange) {
      onDataChange(sorted, effectiveM, effectiveY);
    }
    if (onMonthYearChange && effectiveM && effectiveY) {
      onMonthYearChange(effectiveM, effectiveY);
    }
  };

  // Extract all unique dates dynamically & sort strictly chronologically from tanggal awal ke tanggal akhir
  const dates = useMemo(() => {
    const setOfDates = new Set<string>();
    matrixData.forEach((row) => {
      if (row.records) {
        Object.keys(row.records).forEach((d) => setOfDates.add(d));
      }
    });
    return sortDatesChronologically(Array.from(setOfDates));
  }, [matrixData]);

  const isAbsent = (val: string) => {
    if (!val) return true;
    const s = String(val).toLowerCase().trim();
    return (
      s === 'tidak' ||
      s === 'tidak ada' ||
      s === 'absen' ||
      s === '-' ||
      s === 'x' ||
      s === 'a' ||
      s === 'tap' ||
      s === 'tk' ||
      s === 'tidak hadir' ||
      s === 'tidak pulang'
    );
  };

  // Check if row has an anomaly (e.g. Hadir Ada & Pulang Tidak, or vice-versa)
  const hasAnomaly = (row: MatrixRowData) => {
    if (!row.records) return false;
    return Object.values(row.records).some(
      (rec) =>
        (!isAbsent(rec.hadir) && isAbsent(rec.pulang)) ||
        (isAbsent(rec.hadir) && !isAbsent(rec.pulang))
    );
  };

  // Check if row has any "Tidak"
  const hasTidakHadir = (row: MatrixRowData) => {
    if (!row.records) return false;
    return Object.values(row.records).some(
      (rec) => isAbsent(rec.hadir) || isAbsent(rec.pulang)
    );
  };

  // Dynamic Month & Year detection prioritizing matrixData dates from imported Excel
  const detectedMonthYear = useMemo(() => {
    // 1. Prioritize detecting month and year directly from the current matrix data dates!
    const det = detectMonthYearFromMatrix(matrixData);
    if (det) {
      return `${det.monthName} ${det.year}`;
    }

    // 2. If custom state is set
    if (customMonthNum && customYear) {
      const item = MONTH_NAMES_MAP[customMonthNum];
      return `${item ? item.name : customMonthNum} ${customYear}`;
    }

    // 3. Fallback to props
    if (selectedMonth) {
      const mStr = String(selectedMonth).trim().toLowerCase();
      const item = MONTH_NAMES_MAP[mStr];
      return `${item ? item.name : selectedMonth} ${selectedYear || '2026'}`;
    }

    return 'Juli 2026';
  }, [matrixData, customMonthNum, customYear, selectedMonth, selectedYear]);

  // Active month number & year for selector dropdown
  const activeMonthNum = useMemo(() => {
    const det = detectMonthYearFromMatrix(matrixData);
    if (det) return det.monthNum;
    if (customMonthNum) return customMonthNum;
    if (selectedMonth) return selectedMonth.padStart(2, '0');
    return '07';
  }, [matrixData, customMonthNum, selectedMonth]);

  const activeYear = useMemo(() => {
    const det = detectMonthYearFromMatrix(matrixData);
    if (det) return det.year;
    if (customYear) return customYear;
    if (selectedYear) return selectedYear;
    return '2026';
  }, [matrixData, customYear, selectedYear]);

  // Handle administrator manual month & year adjustment for Presensi Cek Seribu
  const handleManualMonthChange = (newM: string, newY: string) => {
    setCustomMonthNum(newM);
    setCustomYear(newY);
    safeLocalStorageSet('melayu_cek_seribu_month', newM);
    safeLocalStorageSet('melayu_cek_seribu_year', newY);

    const updated = matrixData.map((row) => {
      const newRecords: Record<string, { hadir: 'Ada' | 'Tidak'; pulang: 'Ada' | 'Tidak' }> = {};
      Object.entries(row.records || {}).forEach(([dKey, val]) => {
        const adjustedDKey = replaceMonthInDateKey(dKey, newM, newY);
        newRecords[adjustedDKey] = val;
      });
      return { ...row, records: newRecords };
    });

    updateMatrix(updated, newM, newY);
    const mName = MONTH_NAMES_MAP[newM]?.name || newM;
    setSuccessNotice(`Bulan presensi Cek Seribu disesuaikan menjadi: ${mName} ${newY}.`);
    setTimeout(() => setSuccessNotice(''), 5000);
  };

  // Handle Quick Apply / Sorting for 07 Oktober 2026 s.d. 12 Oktober 2026
  const handleApplyOctober07to12 = () => {
    const octMatrix = createOctoberDefaultMatrix();
    setCustomMonthNum('10');
    setCustomYear('2026');
    safeLocalStorageSet('melayu_cek_seribu_month', '10');
    safeLocalStorageSet('melayu_cek_seribu_year', '2026');

    updateMatrix(octMatrix, '10', '2026');
    setSelectedRowIds([]);
    setSuccessNotice('BERHASIL MENGATUR URUTAN TANGGAL: 07 Oktober 2026 s.d. 12 Oktober 2026 (Urutan tanggal awal ke tanggal akhir aktif).');
    setTimeout(() => setSuccessNotice(''), 7000);
  };

  // Explicitly sort existing dates chronologically from tanggal awal ke tanggal akhir
  const handleSortDatesChronological = () => {
    const currentDates = Array.from(
      new Set(matrixData.flatMap((r) => Object.keys(r.records || {})))
    );
    const sortedDates = sortDatesChronologically(currentDates);

    const reorderedMatrix = matrixData.map((row) => {
      const sortedRecs: Record<string, { hadir: 'Ada' | 'Tidak'; pulang: 'Ada' | 'Tidak' }> = {};
      sortedDates.forEach((d) => {
        if (row.records && row.records[d]) {
          sortedRecs[d] = row.records[d];
        }
      });
      return { ...row, records: sortedRecs };
    });

    updateMatrix(reorderedMatrix);
    setSuccessNotice(`Urutan tanggal presensi diurutkan dari tanggal awal ke tanggal akhir: ${sortedDates.join(', ')}.`);
    setTimeout(() => setSuccessNotice(''), 5000);
  };

  const formatDateForHeader = (dateStr: string): string => {
    if (!dateStr) return dateStr;
    const str = String(dateStr).trim();

    const shortMonthMap: Record<string, string> = {
      '01': 'Jan', '1': 'Jan', 'jan': 'Jan', 'januari': 'Jan',
      '02': 'Feb', '2': 'Feb', 'feb': 'Feb', 'februari': 'Feb',
      '03': 'Mar', '3': 'Mar', 'mar': 'Mar', 'maret': 'Mar',
      '04': 'Apr', '4': 'Apr', 'apr': 'Apr', 'april': 'Apr',
      '05': 'Mei', '5': 'Mei', 'mei': 'Mei', 'may': 'Mei',
      '06': 'Jun', '6': 'Jun', 'jun': 'Jun', 'juni': 'Jun',
      '07': 'Jul', '7': 'Jul', 'jul': 'Jul', 'juli': 'Jul',
      '08': 'Agu', '8': 'Agu', 'agu': 'Agu', 'ags': 'Agu', 'agustus': 'Agu', 'aug': 'Agu',
      '09': 'Sep', '9': 'Sep', 'sep': 'Sep', 'september': 'Sep',
      '10': 'Okt', 'okt': 'Okt', 'oktober': 'Okt', 'oct': 'Okt', 'october': 'Okt',
      '11': 'Nov', 'nov': 'Nov', 'november': 'Nov',
      '12': 'Des', 'des': 'Des', 'desember': 'Des', 'dec': 'Des'
    };

    const numMatch = str.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})$/);
    if (numMatch) {
      const g1 = parseInt(numMatch[1], 10);
      const g2 = parseInt(numMatch[2], 10);
      let day = numMatch[1].padStart(2, '0');
      let mNum = numMatch[2].padStart(2, '0');

      if (g1 > 12 && g2 <= 12) {
        day = String(g1).padStart(2, '0');
        mNum = String(g2).padStart(2, '0');
      } else if (g2 > 12 && g1 <= 12) {
        day = String(g2).padStart(2, '0');
        mNum = String(g1).padStart(2, '0');
      }

      const mStr = shortMonthMap[mNum] || 'Okt';
      let yr = numMatch[3];
      if (yr.length === 4) yr = yr.substring(2);
      return `${day}-${mStr}-${yr}`;
    }

    // ISO format: 2026-10-07 or 2026/10/12
    const isoMatch = str.match(/^(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})$/);
    if (isoMatch) {
      let yr = isoMatch[1];
      if (yr.length === 4) yr = yr.substring(2);
      const mNum = isoMatch[2].padStart(2, '0');
      const day = isoMatch[3].padStart(2, '0');
      const mStr = shortMonthMap[mNum] || 'Okt';
      return `${day}-${mStr}-${yr}`;
    }

    const wordMatch = str.match(/^(\d{1,2})[\s\/\.\-]([a-zA-Z]{3,9})[\s\/\.\-](\d{2,4})$/);
    if (wordMatch) {
      const day = wordMatch[1].padStart(2, '0');
      const mKey = wordMatch[2].toLowerCase();
      const mStr = shortMonthMap[mKey] || wordMatch[2].substring(0, 3);
      let yr = wordMatch[3];
      if (yr.length === 4) yr = yr.substring(2);
      return `${day}-${mStr.charAt(0).toUpperCase() + mStr.slice(1).toLowerCase()}-${yr}`;
    }

    return str;
  };

  const filteredData = useMemo(() => {
    const list = matrixData.filter((row) => {
      const matchSearch = row.nama.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (filterMode === 'ANOMALI') {
        return row.isYellow || hasAnomaly(row);
      }
      if (filterMode === 'TIDAK_HADIR') {
        return hasTidakHadir(row);
      }
      return true;
    });

    return [...list].sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
  }, [matrixData, searchQuery, filterMode]);

  // Toggle yellow highlight on employee name click
  const toggleYellowHighlight = (id: string) => {
    if (!canManageAdmin) return;
    const updated = matrixData.map((row) =>
      row.id === id ? { ...row, isYellow: !row.isYellow } : row
    );
    updateMatrix(updated);
  };

  // Handle Export to Excel Matrix (Matching 2-row header with merged date cells)
  const handleExportMatrixExcel = () => {
    const row1: any[] = ['Nama'];
    const row2: any[] = [''];

    dates.forEach((d) => {
      const headerDateStr = formatDateForHeader(d);
      row1.push(headerDateStr, '');
      row2.push('Hadir', 'Pulang');
    });

    const aoaData: any[][] = [row1, row2];

    const sortedRows = [...matrixData].sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
    sortedRows.forEach((row) => {
      const rowVals: any[] = [row.nama];
      dates.forEach((d) => {
        const rec = row.records[d] || { hadir: 'Tidak', pulang: 'Tidak' };
        const hVal = !isAbsent(rec.hadir) ? 'Ada' : 'Tidak';
        const pVal = !isAbsent(rec.pulang) ? 'Ada' : 'Tidak';
        rowVals.push(hVal, pVal);
      });
      aoaData.push(rowVals);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(aoaData);

    const merges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }
    ];

    dates.forEach((_, idx) => {
      const colStart = 1 + idx * 2;
      merges.push({
        s: { r: 0, c: colStart },
        e: { r: 0, c: colStart + 1 }
      });
    });

    worksheet['!merges'] = merges;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap_Presensi');
    XLSX.writeFile(workbook, 'Rekapitulasi_Presensi_CekSeribu.xlsx');
  };

  // Selection State for Bulk Delete
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [rowToDelete, setRowToDelete] = useState<MatrixRowData | null>(null);
  const [showConfirmDeleteSelected, setShowConfirmDeleteSelected] = useState(false);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);

  // Excel Import Preview Modal State (identical to Security Guard)
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [excelFileName, setExcelFileName] = useState('');
  const [previewDocTitle, setPreviewDocTitle] = useState('REKAPITULASI PRESENSI CEK SERIBU');
  const [previewMatrixData, setPreviewMatrixData] = useState<MatrixRowData[]>([]);
  const [previewDates, setPreviewDates] = useState<string[]>([]);
  const [previewDetectedMonth, setPreviewDetectedMonth] = useState<MonthYearDetection | null>(null);
  const [previewMonthNum, setPreviewMonthNum] = useState<string>('07');
  const [previewYear, setPreviewYear] = useState<string>('2026');
  const [successNotice, setSuccessNotice] = useState('');

  // Print & PDF State for Cek Seribu
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [activePrintViewTab, setActivePrintViewTab] = useState<'document' | 'pdf'>('document');
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [previewZoom, setPreviewZoom] = useState(100);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isGeneratingPdfPreview, setIsGeneratingPdfPreview] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [selectedPrintDates, setSelectedPrintDates] = useState<string[]>([]);
  const [printEmployeeFilter, setPrintEmployeeFilter] = useState<'ALL' | 'ANOMALI' | 'TIDAK_HADIR'>('ALL');
  const [printSignCity, setPrintSignCity] = useState('Pekanbaru');
  const [printSignDate, setPrintSignDate] = useState(() =>
    new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  );
  const [printSignRole, setPrintSignRole] = useState('Kepala Subbagian Kepegawaian');
  const [printSignName, setPrintSignName] = useState('Asep Rudi');
  const [printSignNip, setPrintSignNip] = useState('19830717 200312 1 001');
  const [showSignSettings, setShowSignSettings] = useState(false);
  const pdfIframeRef = useRef<HTMLIFrameElement>(null);

  // Active dates to show in the printable report
  const activePrintDates = useMemo(() => {
    if (selectedPrintDates.length === 0) return dates;
    return dates.filter(d => selectedPrintDates.includes(d));
  }, [dates, selectedPrintDates]);

  // Active employees to show in the printable report
  const printableEmployees = useMemo(() => {
    let list = [...matrixData];
    if (printEmployeeFilter === 'ANOMALI') {
      list = list.filter(r => r.isYellow || hasAnomaly(r));
    } else if (printEmployeeFilter === 'TIDAK_HADIR') {
      list = list.filter(hasTidakHadir);
    }
    return list.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
  }, [matrixData, printEmployeeFilter]);

  // Overall statistics for printable report
  const printStats = useMemo(() => {
    const total = matrixData.length;
    const anomalyCount = matrixData.filter(r => r.isYellow || hasAnomaly(r)).length;
    const absentCount = matrixData.filter(hasTidakHadir).length;
    const completeCount = matrixData.filter(r => !hasTidakHadir(r) && !r.isYellow && !hasAnomaly(r)).length;
    const complianceRate = total > 0 ? Math.round((completeCount / total) * 100) : 100;
    return { total, completeCount, anomalyCount, absentCount, complianceRate };
  }, [matrixData]);

  // Open Print Modal with current context
  const handleOpenPrintModal = () => {
    setActivePrintViewTab('document');
    setPreviewZoom(100);
    setSelectedPrintDates([...dates]);
    setPrintEmployeeFilter(filterMode);
    setShowPrintModal(true);
  };

  // Trigger Native / Popup Print Dialog
  const handleChoosePrinter = () => {
    const docTitle = `Rekapitulasi Presensi Cek Seribu - ${detectedMonthYear}`;
    printDocumentElement('cek-seribu-printable-document', docTitle, {
      orientation: printOrientation
    });
  };

  // Generate & Download PDF Directly
  const handleDownloadPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    setSuccessNotice('Sedang memproses dan menyusun dokumen PDF Cek Seribu...');

    try {
      const cleanPeriod = detectedMonthYear.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Rekapitulasi_Presensi_Cek_Seribu_${cleanPeriod}.pdf`;

      const success = await exportElementToPdf({
        filename,
        elementId: 'cek-seribu-printable-document',
        orientation: printOrientation,
        onSuccess: () => {
          setIsExportingPdf(false);
          setSuccessNotice(`File "${filename}" berhasil dibuat dan diunduh.`);
        },
        onError: (err) => {
          setIsExportingPdf(false);
          console.error('Export PDF error:', err);
          setSuccessNotice('Membuka dialog cetak browser sebagai alternatif...');
          handleChoosePrinter();
        }
      });

      if (!success) setIsExportingPdf(false);
    } catch (err) {
      setIsExportingPdf(false);
      console.error('Fatal PDF export error:', err);
      handleChoosePrinter();
    }
  };

  // Generate standalone PDF blob for embedded viewer
  const generatePdfPreview = async () => {
    setIsGeneratingPdfPreview(true);
    try {
      const res = await createPdfFromElement('cek-seribu-printable-document', {
        orientation: printOrientation
      });
      if (res?.blobUrl) {
        if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(res.blobUrl);
      }
    } catch (err) {
      console.error('Generate PDF preview error:', err);
    } finally {
      setIsGeneratingPdfPreview(false);
    }
  };

  // Open generated PDF in new browser tab
  const handleOpenPdfNewTab = async () => {
    if (pdfBlobUrl) {
      window.open(pdfBlobUrl, '_blank');
    } else {
      setSuccessNotice('Menyiapkan file PDF untuk tab baru...');
      const res = await createPdfFromElement('cek-seribu-printable-document', {
        orientation: printOrientation
      });
      if (res?.blobUrl) {
        window.open(res.blobUrl, '_blank');
      }
    }
  };

  // Regenerate PDF when switching to viewer tab
  useEffect(() => {
    if (showPrintModal && activePrintViewTab === 'pdf' && !pdfBlobUrl && !isGeneratingPdfPreview) {
      generatePdfPreview();
    }
  }, [showPrintModal, activePrintViewTab]);

  // Clean up blob url on unmount
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  // Handle Excel File Upload & Parse
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rowsFormatted = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: false, defval: '' });
        const rowsRaw = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: true, defval: '' });

        if (!rowsFormatted || rowsFormatted.length === 0) {
          alert('File Excel kosong atau format tidak dapat dibaca.');
          return;
        }

        let detectedTitle = 'REKAPITULASI PRESENSI CEK SERIBU';
        for (let r = 0; r < Math.min(rowsFormatted.length, 5); r++) {
          const rowText = (rowsFormatted[r] || []).join(' ').trim();
          if (rowText.toLowerCase().includes('rekap') || rowText.toLowerCase().includes('presensi') || rowText.toLowerCase().includes('cek seribu')) {
            detectedTitle = rowText;
            break;
          }
        }

        // Try to parse matrix layout (dates on column headers)
        let matrixHeaderIdx = -1;
        let matrixNameColIdx = -1;
        const dateColMap: Record<string, { hadirCol: number; pulangCol: number }> = {};

        for (let r = 0; r < Math.min(rowsFormatted.length, 12); r++) {
          const row = rowsFormatted[r] || [];
          const nextRow = rowsFormatted[r + 1] || [];

          let foundNameIdx = -1;
          row.forEach((cellVal: any, cIdx: number) => {
            const str = String(cellVal || '').toLowerCase().trim();
            if (str.includes('nama') || str.includes('pegawai') || str.includes('employee')) {
              if (foundNameIdx === -1) foundNameIdx = cIdx;
            }
          });

          if (foundNameIdx !== -1) {
            // Check if single row has Date (Hadir) / Date (Pulang)
            row.forEach((cellVal: any, cIdx: number) => {
              const str = String(cellVal || '').trim();
              if (!str || cIdx === foundNameIdx) return;

              const matchCol = str.match(/(.*?)\s*[\(\_]?\s*(hadir|datang|pulang|masuk|keluar|check\s*in|check\s*out)[\)]?/i);
              if (matchCol) {
                const rawDate = matchCol[1].trim();
                const typeStr = matchCol[2].toLowerCase();
                const parsedDate = formatDateForHeader(rawDate) || rawDate;

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

            // Check if 2-row header: Row r = Dates, Row r+1 = Hadir/Pulang
            if (Object.keys(dateColMap).length === 0 && nextRow.length > 0) {
              let currDateStr: string | null = null;
              const maxCols = Math.max(row.length, nextRow.length);
              for (let cIdx = 0; cIdx < maxCols; cIdx++) {
                if (cIdx === foundNameIdx) continue;
                const topVal = String(row[cIdx] || '').trim();
                const subVal = String(nextRow[cIdx] || '').toLowerCase().trim();

                if (topVal) {
                  currDateStr = formatDateForHeader(topVal) || topVal;
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

            if (Object.keys(dateColMap).length > 0) {
              const isTwoRow = nextRow.some((cell) => {
                const s = String(cell || '').toLowerCase();
                return s.includes('hadir') || s.includes('pulang') || s.includes('datang') || s.includes('keluar');
              });
              matrixHeaderIdx = isTwoRow ? r + 1 : r;
              matrixNameColIdx = foundNameIdx;
              break;
            }
          }
        }

        const parsedResult: MatrixRowData[] = [];
        const detectedDateList = Object.keys(dateColMap);

        if (matrixHeaderIdx !== -1 && detectedDateList.length > 0) {
          for (let r = matrixHeaderIdx + 1; r < rowsFormatted.length; r++) {
            const rowF = rowsFormatted[r] || [];
            let nameVal = String(rowF[matrixNameColIdx] || '').trim();
            nameVal = nameVal.replace(/^\d+[\.\-\s]+/, '').trim();
            if (!nameVal || nameVal.toLowerCase().includes('total') || nameVal.toLowerCase().includes('jumlah')) continue;

            const recordsObj: Record<string, { hadir: 'Ada' | 'Tidak'; pulang: 'Ada' | 'Tidak' }> = {};
            detectedDateList.forEach((dKey) => {
              const cols = dateColMap[dKey];
              const hValRaw = cols.hadirCol !== -1 ? String(rowF[cols.hadirCol] || '').trim() : '';
              const pValRaw = cols.pulangCol !== -1 ? String(rowF[cols.pulangCol] || '').trim() : '';

              recordsObj[dKey] = {
                hadir: !isAbsent(hValRaw) ? 'Ada' : 'Tidak',
                pulang: !isAbsent(pValRaw) ? 'Ada' : 'Tidak'
              };
            });

            parsedResult.push({
              id: `imported-csr-${Date.now()}-${r}`,
              nama: nameVal,
              isYellow: false,
              records: recordsObj
            });
          }
        } else {
          // Fallback: parse flat list of rows (Nama, Tanggal, Hadir, Pulang)
          const empMap = new Map<string, MatrixRowData>();
          for (let r = 1; r < rowsFormatted.length; r++) {
            const rowF = rowsFormatted[r] || [];
            const nameVal = String(rowF[0] || rowF[1] || '').trim().replace(/^\d+[\.\-\s]+/, '').trim();
            const dateVal = String(rowF[1] || rowF[2] || '22-Jul-26').trim();
            const hadirVal = String(rowF[2] || rowF[3] || 'Ada').trim();
            const pulangVal = String(rowF[3] || rowF[4] || 'Ada').trim();

            if (!nameVal || nameVal.toLowerCase().includes('nama')) continue;

            const dateKey = formatDateForHeader(dateVal) || dateVal;
            if (!empMap.has(nameVal)) {
              empMap.set(nameVal, {
                id: `imported-csr-${Date.now()}-${r}`,
                nama: nameVal,
                isYellow: false,
                records: {}
              });
            }

            empMap.get(nameVal)!.records[dateKey] = {
              hadir: !isAbsent(hadirVal) ? 'Ada' : 'Tidak',
              pulang: !isAbsent(pulangVal) ? 'Ada' : 'Tidak'
            };
          }
          parsedResult.push(...Array.from(empMap.values()));
        }

        if (parsedResult.length === 0) {
          alert('Tidak dapat mengekstraksi data presensi pegawai dari file Excel. Harap pastikan format file sesuai template.');
          return;
        }

        parsedResult.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));

        setExcelFileName(file.name);
        setPreviewDocTitle(detectedTitle);
        setPreviewMatrixData(parsedResult);
        const allDates = Array.from(new Set(parsedResult.flatMap((r) => Object.keys(r.records || {}))));
        setPreviewDates(allDates.length > 0 ? allDates : ['22-Jul-26', '23-Jul-26', '24-Jul-26', '27-Jul-26']);

        // Detect month and year directly from the imported Excel (dates, title, filename)
        const detectedFromExcel = detectMonthYearFromStrings([
          file.name,
          detectedTitle,
          firstSheetName,
          ...allDates,
          ...parsedResult.slice(0, 15).flatMap((r) => Object.keys(r.records || {}))
        ]) || { monthNum: '07', monthName: 'Juli', year: '2026' };

        setPreviewDetectedMonth(detectedFromExcel);
        setPreviewMonthNum(detectedFromExcel.monthNum);
        setPreviewYear(detectedFromExcel.year);
        setShowPreviewModal(true);
      } catch (err) {
        console.error('Error importing Excel:', err);
        alert('Gagal membaca file Excel. Pastikan file valid.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Apply Excel Data & Overwrite Matrix Completely - Synchronizing Month & Year
  const handleApplyExcel = () => {
    const finalMonthNum = previewMonthNum || previewDetectedMonth?.monthNum || '07';
    const finalYear = previewYear || previewDetectedMonth?.year || '2026';
    const finalMonthName = MONTH_NAMES_MAP[finalMonthNum]?.name || 'Juli';

    let finalMatrix = previewMatrixData;
    // If the administrator manually adjusted the month in preview modal, adjust date keys in records
    if (previewDetectedMonth && previewDetectedMonth.monthNum !== finalMonthNum) {
      finalMatrix = previewMatrixData.map((row) => {
        const newRecords: Record<string, { hadir: 'Ada' | 'Tidak'; pulang: 'Ada' | 'Tidak' }> = {};
        Object.entries(row.records || {}).forEach(([dKey, val]) => {
          const adjustedDKey = replaceMonthInDateKey(dKey, finalMonthNum, finalYear);
          newRecords[adjustedDKey] = val;
        });
        return { ...row, records: newRecords };
      });
    }

    setCustomMonthNum(finalMonthNum);
    setCustomYear(finalYear);
    safeLocalStorageSet('melayu_cek_seribu_month', finalMonthNum);
    safeLocalStorageSet('melayu_cek_seribu_year', finalYear);

    updateMatrix(finalMatrix, finalMonthNum, finalYear);
    setSelectedRowIds([]);
    setShowPreviewModal(false);
    setSuccessNotice(`BERHASIL MENYESUAIKAN DENGAN IMPORT EXCEL! Bulan presensi diatur ke: ${finalMonthName} ${finalYear} (${finalMatrix.length} data pegawai dari file "${excelFileName}").`);
    setTimeout(() => setSuccessNotice(''), 7000);
  };

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedRowIds.length === filteredData.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(filteredData.map((r) => r.id));
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Delete Actions
  const handleConfirmDeleteSingle = () => {
    if (!rowToDelete) return;
    const updated = matrixData.filter((r) => r.id !== rowToDelete.id);
    updateMatrix(updated);
    setSelectedRowIds((prev) => prev.filter((i) => i !== rowToDelete.id));
    setRowToDelete(null);
    setSuccessNotice(`Berhasil menghapus data pegawai "${rowToDelete.nama}".`);
    setTimeout(() => setSuccessNotice(''), 5000);
  };

  const handleConfirmDeleteSelected = () => {
    const count = selectedRowIds.length;
    const updated = matrixData.filter((r) => !selectedRowIds.includes(r.id));
    updateMatrix(updated);
    setSelectedRowIds([]);
    setShowConfirmDeleteSelected(false);
    setSuccessNotice(`Berhasil menghapus ${count} pegawai terpilih.`);
    setTimeout(() => setSuccessNotice(''), 5000);
  };

  const handleConfirmDeleteAll = () => {
    const total = matrixData.length;
    updateMatrix([]);
    setSelectedRowIds([]);
    setShowConfirmDeleteAll(false);
    setSuccessNotice(`Berhasil menghapus SELURUH ${total} data presensi Cek Seribu.`);
    setTimeout(() => setSuccessNotice(''), 5000);
  };

  // Reset to default sample (default October 2026: 07 s.d. 12 Oktober 2026)
  const handleResetSample = () => {
    setCustomMonthNum('10');
    setCustomYear('2026');
    safeLocalStorageSet('melayu_cek_seribu_month', '10');
    safeLocalStorageSet('melayu_cek_seribu_year', '2026');
    const octMatrix = createOctoberDefaultMatrix();
    updateMatrix(octMatrix, '10', '2026');
    setSelectedRowIds([]);
    setSuccessNotice('Data presensi Cek Seribu telah dimuat ulang ke urutan tanggal awal ke akhir (07 Oktober 2026 s.d. 12 Oktober 2026).');
    setTimeout(() => setSuccessNotice(''), 5000);
  };

  return (
    <div className="space-y-4" id="cek-seribu-matrix-container">
      {/* Top Success Notice Banner */}
      {successNotice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-2.5">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice('')}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Controls & Filter Bar (Matching Security Guard Layout) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
            <FileSpreadsheet className="w-5 h-5 text-emerald-700 shrink-0" />
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-800 text-sm md:text-base">
              Hasil Konversi Presensi Cek Seribu
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs">
              <span className="text-slate-600 font-medium flex items-center space-x-1.5">
                <span>Bulan:</span>
                <span className="font-mono font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {detectedMonthYear}
                </span>
              </span>

              {/* Urutan Tanggal Badge */}
              <span className="text-[10px] bg-blue-50 text-blue-900 border border-blue-200 font-bold px-2 py-0.5 rounded-md flex items-center space-x-1 shadow-2xs">
                <CalendarRange className="w-3 h-3 text-blue-600 shrink-0" />
                <span>Urutan Tanggal: {dates.length > 0 ? `${dates[0]} s.d. ${dates[dates.length - 1]}` : '07-Okt-26 s.d. 12-Okt-26'}</span>
              </span>

              {canManageAdmin && (
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sesuaikan Bulan:</span>
                  <select
                    value={activeMonthNum}
                    onChange={(e) => handleManualMonthChange(e.target.value, activeYear)}
                    className="px-2 py-0.5 bg-slate-50 hover:bg-white border border-slate-300 hover:border-djpb-blue rounded-md text-xs font-bold text-slate-800 cursor-pointer shadow-2xs transition-all"
                    title="Sesuaikan Bulan Presensi Cek Seribu"
                  >
                    {MONTH_LIST_OPTIONS.map((m) => (
                      <option key={m.num} value={m.num}>
                        Bulan {m.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={activeYear}
                    onChange={(e) => handleManualMonthChange(activeMonthNum, e.target.value)}
                    className="px-2 py-0.5 bg-slate-50 hover:bg-white border border-slate-300 hover:border-djpb-blue rounded-md text-xs font-bold text-slate-800 cursor-pointer shadow-2xs transition-all"
                    title="Sesuaikan Tahun Presensi Cek Seribu"
                  >
                    {['2024', '2025', '2026', '2027', '2028'].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-300 shadow-2xs">
                    Sesuai Import Excel
                  </span>
                </div>
              )}

              <span className="text-slate-500">
                {dates.length > 0 && `• (${dates.join(', ')})`} • <span className="font-bold text-emerald-700">{matrixData.length} Pegawai</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Urutan Tanggal: 07 Oktober 2026 s.d. 12 Oktober 2026 */}
          {canManageAdmin && (
            <button
              type="button"
              onClick={handleApplyOctober07to12}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-2xs cursor-pointer"
              title="Atur Urutan Tanggal: 07 Oktober 2026 ke 12 Oktober 2026 (Awal ke Akhir)"
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Urutan 07 s.d. 12 Okt 2026</span>
            </button>
          )}

          {/* Tombol Urutkan Tanggal Awal ke Akhir */}
          <button
            type="button"
            onClick={handleSortDatesChronological}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-2xs cursor-pointer"
            title="Urutkan Kolom Tanggal dari Tanggal Awal ke Tanggal Akhir Secara Kronologis"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
            <span>Urut Tanggal Awal ke Akhir</span>
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pegawai..."
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-djpb-blue focus:bg-white w-44 sm:w-48 transition-all"
            />
          </div>

          {/* Filter Dropdown */}
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as any)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-djpb-blue cursor-pointer"
          >
            <option value="ALL">Semua Data ({matrixData.length})</option>
            <option value="ANOMALI">Anomali / Sorot Kuning ({matrixData.filter((r) => r.isYellow || hasAnomaly(r)).length})</option>
            <option value="TIDAK_HADIR">Ada 'Tidak' Hadir/Pulang ({matrixData.filter(hasTidakHadir).length})</option>
          </select>

          {/* Import Excel Button (With hidden file input) */}
          {canManageAdmin && (
            <label className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-2xs cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import Excel</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelImport}
                className="hidden"
              />
            </label>
          )}

          {/* Export Excel Button */}
          <button
            type="button"
            onClick={handleExportMatrixExcel}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-2xs cursor-pointer"
            title="Unduh Tabel Matrix ke File Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Excel</span>
          </button>

          {/* Cetak PDF Button */}
          <button
            type="button"
            id="btn-print-cek-seribu-pdf"
            onClick={handleOpenPrintModal}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-2xs cursor-pointer"
            title="Cetak Dokumen Resmi & Unduh Laporan Rekapitulasi Presensi Cek Seribu ke Format PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak PDF</span>
          </button>

          {/* Admin Delete All Cek Seribu Button */}
          {canManageAdmin && matrixData.length > 0 && (
            <button
              type="button"
              onClick={() => setShowConfirmDeleteAll(true)}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Hapus Seluruh Data Presensi Cek Seribu"
            >
              <Trash className="w-3.5 h-3.5 text-rose-600" />
              <span>Hapus Semua</span>
            </button>
          )}

          {/* Reset Data - Hanya untuk Administrator */}
          {canManageAdmin && (
            <button
              type="button"
              onClick={handleResetSample}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
              title="Muat Ulang Data Default Cek Seribu"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Data</span>
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar (When rows selected - exactly like Security Guard) */}
      {selectedRowIds.length > 0 && (
        <div className="bg-rose-50 border border-rose-300 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in duration-150 shadow-xs">
          <div className="flex items-center space-x-2 text-rose-900 font-bold">
            <Check className="w-4 h-4 text-rose-600" />
            <span>{selectedRowIds.length} entri pegawai dipilih (centang aktif)</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowConfirmDeleteSelected(true)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-lg text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus {selectedRowIds.length} Terpilih</span>
            </button>
            <button
              onClick={() => setSelectedRowIds([])}
              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
            >
              Batal Pilih
            </button>
          </div>
        </div>
      )}

      {/* Main Table Frame matching Security Guard Table structure */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs bg-white">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            {/* Header Row 1: Nama & Date Headers */}
            <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-800 font-extrabold uppercase font-display tracking-wider">
              {canManageAdmin && (
                <th
                  rowSpan={dates.length > 0 ? 2 : 1}
                  className="py-3 px-3 w-10 text-center border-r border-slate-200 align-middle"
                >
                  <input
                    type="checkbox"
                    checked={filteredData.length > 0 && selectedRowIds.length === filteredData.length}
                    onChange={toggleSelectAll}
                    className="rounded text-djpb-blue focus:ring-djpb-blue cursor-pointer"
                    title="Pilih / Centang Semua Baris"
                  />
                </th>
              )}

              <th
                rowSpan={dates.length > 0 ? 2 : 1}
                className="py-3 px-4 border-r border-slate-200 text-left align-middle"
              >
                NAMA PEGAWAI
              </th>

              {dates.map((d) => (
                <th
                  key={d}
                  colSpan={2}
                  className="py-3 px-3 text-center border-r border-slate-200 font-sans font-extrabold text-slate-800 bg-slate-100"
                >
                  {formatDateForHeader(d)}
                </th>
              ))}

              {canManageAdmin && (
                <th
                  rowSpan={dates.length > 0 ? 2 : 1}
                  className="py-3 px-4 text-right align-middle w-20"
                >
                  AKSI
                </th>
              )}
            </tr>

            {/* Header Row 2: Sub-headers Hadir | Pulang */}
            {dates.length > 0 && (
              <tr className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-300">
                {dates.map((d) => (
                  <React.Fragment key={`${d}-sub`}>
                    <th className="py-2 px-2 text-center border-r border-slate-200 w-16">
                      Hadir
                    </th>
                    <th className="py-2 px-2 text-center border-r border-slate-200 w-16">
                      Pulang
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            )}
          </thead>

          <tbody className="divide-y divide-slate-200 text-slate-800 font-mono">
            {filteredData.length > 0 ? (
              filteredData.map((row) => {
                const isYellowRow = Boolean(row.isYellow);
                const isSelected = selectedRowIds.includes(row.id);

                return (
                  <tr
                    key={row.id}
                    className={`transition-colors ${isSelected ? 'bg-amber-50/80' : 'hover:bg-slate-50'}`}
                  >
                    {/* Select Checkbox Column */}
                    {canManageAdmin && (
                      <td className="py-3 px-3 text-center border-r border-slate-200">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectRow(row.id, e as any)}
                          className="rounded text-djpb-blue focus:ring-djpb-blue cursor-pointer"
                        />
                      </td>
                    )}

                    {/* Nama Cell */}
                    <td
                      onClick={() => toggleYellowHighlight(row.id)}
                      className="py-3 px-4 border-r border-slate-200 font-sans font-extrabold text-slate-900 cursor-pointer select-none"
                      title={canManageAdmin ? 'Klik untuk aktifkan/nonaktifkan sorotan kuning anomali' : undefined}
                    >
                      <div className="flex items-center justify-between space-x-2">
                        <span>{row.nama}</span>
                        {isYellowRow && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold shrink-0">
                            Anomali
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Date Presensi Columns */}
                    {dates.map((d) => {
                      const rec = row.records?.[d] || { hadir: 'Tidak', pulang: 'Tidak' };
                      const isHadirAda = !isAbsent(rec.hadir);
                      const isPulangAda = !isAbsent(rec.pulang);

                      return (
                        <React.Fragment key={`${row.id}-${d}`}>
                          {/* Hadir Cell */}
                          <td
                            className={`py-2 px-2 text-center font-bold border-r border-slate-200 ${
                              isHadirAda
                                ? 'text-slate-800 bg-white'
                                : 'bg-rose-50/90 text-rose-700 font-extrabold'
                            }`}
                          >
                            {isHadirAda ? (
                              <span className="text-emerald-700">Ada</span>
                            ) : (
                              <span className="text-rose-700">Tidak</span>
                            )}
                          </td>

                          {/* Pulang Cell */}
                          <td
                            className={`py-2 px-2 text-center font-bold border-r border-slate-200 ${
                              isPulangAda
                                ? 'text-slate-800 bg-white'
                                : 'bg-rose-50/90 text-rose-700 font-extrabold'
                            }`}
                          >
                            {isPulangAda ? (
                              <span className="text-emerald-700">Ada</span>
                            ) : (
                              <span className="text-rose-700">Tidak</span>
                            )}
                          </td>
                        </React.Fragment>
                      );
                    })}

                    {/* Admin Action Row Delete Button */}
                    {canManageAdmin && (
                      <td className="py-3 px-4 text-right font-sans">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={() => setRowToDelete(row)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={`Hapus data ${row.nama}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={(canManageAdmin ? 2 : 1) + (dates.length > 0 ? dates.length * 2 : 1) + (canManageAdmin ? 1 : 0)}
                  className="py-10 text-center text-slate-500 font-medium bg-slate-50"
                >
                  <AlertTriangle className="w-7 h-7 text-amber-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    {matrixData.length === 0
                      ? 'Belum ada data presensi Cek Seribu atau semua data telah dihapus.'
                      : 'Tidak ada data pegawai yang sesuai dengan pencarian atau filter.'}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Legend & Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 gap-2">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-slate-800">Keterangan Presensi:</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 bg-emerald-100 border border-emerald-400 rounded-xs" />
            <span className="text-emerald-800 font-bold">Ada = Terekam Hadir / Pulang</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 bg-rose-100 border border-rose-400 rounded-xs" />
            <span className="text-rose-800 font-bold">Tidak = Belum Presensi / Absen</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 bg-amber-200 border border-amber-400 rounded-xs" />
            <span className="font-bold text-amber-900">Anomali = Klik Nama Pegawai</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono shrink-0">
          Tampil: <strong>{filteredData.length}</strong> / <strong>{matrixData.length}</strong> Pegawai
        </div>
      </div>

      {/* ---------------- MODALS ---------------- */}

      {/* Excel Preview Confirmation Modal (EXACTLY MATCHING Konfirmasi Import Excel Security) */}
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
                    Konfirmasi Import Excel Cek Seribu
                  </h3>
                  <p className="text-xs text-slate-500">
                    File: <span className="font-mono font-bold text-slate-700">{excelFileName}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Detected Month from Excel Document */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-slate-900 block text-xs">
                    Bulan Presensi yang Terdeteksi dari Dokumen Excel:
                  </span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Bulan: <strong className="text-emerald-800 font-bold">{MONTH_NAMES_MAP[previewMonthNum]?.name || previewDetectedMonth?.monthName || 'Juli'} {previewYear}</strong> • <span className="text-emerald-700 font-semibold">Disesuaikan otomatis dari tanggal file Excel</span>
                  </p>
                </div>
              </div>
              {canManageAdmin && (
                <div className="flex items-center space-x-1.5 shrink-0 bg-white/90 p-1.5 rounded-lg border border-emerald-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sesuaikan:</span>
                  <select
                    value={previewMonthNum}
                    onChange={(e) => setPreviewMonthNum(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-800 cursor-pointer shadow-2xs focus:border-djpb-blue focus:outline-none"
                    title="Ubah Bulan untuk Import Excel"
                  >
                    {MONTH_LIST_OPTIONS.map((m) => (
                      <option key={m.num} value={m.num}>Bulan {m.name}</option>
                    ))}
                  </select>
                  <select
                    value={previewYear}
                    onChange={(e) => setPreviewYear(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-800 cursor-pointer shadow-2xs focus:border-djpb-blue focus:outline-none"
                    title="Ubah Tahun untuk Import Excel"
                  >
                    {['2024', '2025', '2026', '2027', '2028'].map((y) => (
                      <option key={y} value={y}>Tahun {y}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start space-x-2.5 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block text-amber-900">Perhatian: Pengunggahan ini akan MENIMPA data lama!</span>
                <span className="text-amber-800">
                  Seluruh data presensi Cek Seribu sebelumnya akan digantikan secara penuh dengan dokumen baru: <strong className="underline">{previewDocTitle}</strong> ({previewMatrixData.length} baris data pegawai).
                </span>
              </div>
            </div>

            <div className="overflow-y-auto max-h-60 border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 font-bold uppercase sticky top-0 text-slate-800 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-200">NAMA PEGAWAI</th>
                    {previewDates.map((d) => (
                      <th key={d} colSpan={2} className="py-2.5 px-3 border-r border-slate-200 text-center">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {previewMatrixData.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-800 border-r border-slate-200 font-sans">
                        {row.nama}
                      </td>
                      {previewDates.map((d) => {
                        const rec = row.records?.[d] || { hadir: 'Tidak', pulang: 'Tidak' };
                        return (
                          <React.Fragment key={`${idx}-${d}`}>
                            <td className="py-2 px-2 text-center border-r border-slate-200 font-semibold">
                              {rec.hadir === 'Ada' ? (
                                <span className="text-emerald-700 font-bold">Ada</span>
                              ) : (
                                <span className="text-rose-700 font-bold">Tidak</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center border-r border-slate-200 font-semibold">
                              {rec.pulang === 'Ada' ? (
                                <span className="text-emerald-700 font-bold">Ada</span>
                              ) : (
                                <span className="text-rose-700 font-bold">Tidak</span>
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {previewMatrixData.length > 50 && (
              <p className="text-[11px] text-slate-500 text-center font-mono">
                Menampilkan 50 dari total {previewMatrixData.length} baris pratinjau. Seluruh data akan disimpan.
              </p>
            )}

            <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Ya, Terapkan & Simpan Presensi Cek Seribu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete Single Employee */}
      {rowToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-rose-600 font-bold text-base">
                <AlertCircle className="w-5 h-5" />
                <span>Hapus Data Cek Seribu</span>
              </div>
              <button
                type="button"
                onClick={() => setRowToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              Apakah Anda yakin ingin menghapus data presensi Cek Seribu untuk pegawai{' '}
              <strong className="text-slate-900 font-bold">{rowToDelete.nama}</strong>? Data yang dihapus tidak dapat dikembalikan.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setRowToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Pegawai Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete Selected Rows */}
      {showConfirmDeleteSelected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-rose-600 font-bold text-base">
                <AlertCircle className="w-5 h-5" />
                <span>Hapus Data Terpilih ({selectedRowIds.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmDeleteSelected(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong className="text-rose-700">{selectedRowIds.length} pegawai terpilih</strong> dari rekapitulasi Cek Seribu?
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDeleteSelected(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSelected}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus {selectedRowIds.length} Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete All Cek Seribu */}
      {showConfirmDeleteAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-rose-600 font-bold text-base">
                <AlertCircle className="w-5 h-5" />
                <span>Hapus Seluruh Data Cek Seribu</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmDeleteAll(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              <strong className="text-rose-600 font-bold">PERHATIAN:</strong> Tindakan ini akan menghapus seluruh data matriks rekapitulasi presensi Cek Seribu ({matrixData.length} pegawai). Apakah Anda yakin?
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDeleteAll(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Semua Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cetak Dokumen & Pratinjau PDF Cek Seribu */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 z-[9990] animate-in fade-in duration-200 print-modal-container">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden print-modal-card">
            {/* Modal Top Header */}
            <div className="p-3 sm:p-4 px-4 sm:px-6 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 print-modal-header print:hidden">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-400/30">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm md:text-base font-bold font-display text-white">
                      Cetak Dokumen & Pratinjau PDF Presensi Cek Seribu
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30">
                      {detectedMonthYear}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Laporan Rekapitulasi Presensi Finger/Mobile Kanwil DJPb Provinsi Riau • {printableEmployees.length} Pegawai
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleExportMatrixExcel}
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
                  id="btn-choose-printer-cek-seribu"
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

            {/* Secondary Controls & View Tabs Bar */}
            <div className="bg-slate-800 border-b border-slate-700 px-4 md:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
              <div className="flex flex-wrap items-center gap-2">
                {/* View Tabs */}
                <div className="flex items-center space-x-1 bg-slate-900/60 p-1 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setActivePrintViewTab('document')}
                    className={`flex items-center space-x-1.5 px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      activePrintViewTab === 'document'
                        ? 'bg-sky-500 text-slate-950 shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Pratinjau Dokumen ({printOrientation === 'landscape' ? 'A4 Landscape' : 'A4 Portrait'})</span>
                  </button>

                  <button
                    type="button"
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

                {/* Orientation Selector */}
                <div className="flex items-center bg-slate-900/60 p-1 rounded-lg border border-slate-700">
                  <span className="text-[10px] text-slate-400 px-1.5 font-bold uppercase">Orientasi:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPrintOrientation('landscape');
                      setPdfBlobUrl(null);
                    }}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                      printOrientation === 'landscape'
                        ? 'bg-rose-500 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    title="Orientasi mendatar (sangat cocok untuk tabel matrix dengan banyak tanggal)"
                  >
                    Landscape
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrintOrientation('portrait');
                      setPdfBlobUrl(null);
                    }}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                      printOrientation === 'portrait'
                        ? 'bg-rose-500 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    title="Orientasi tegak (vertikal)"
                  >
                    Portrait
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Filter Pegawai untuk Cetak */}
                <select
                  value={printEmployeeFilter}
                  onChange={(e) => setPrintEmployeeFilter(e.target.value as any)}
                  className="bg-slate-900 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-sky-400 cursor-pointer"
                >
                  <option value="ALL">Semua Pegawai ({matrixData.length})</option>
                  <option value="ANOMALI">Hanya Pegawai Anomali ({matrixData.filter(r => r.isYellow || hasAnomaly(r)).length})</option>
                  <option value="TIDAK_HADIR">Hanya Yang Ada 'Tidak' Hadir ({matrixData.filter(hasTidakHadir).length})</option>
                </select>

                {/* Toggle Signatory & Date Settings */}
                <button
                  type="button"
                  onClick={() => setShowSignSettings(prev => !prev)}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                    showSignSettings
                      ? 'bg-sky-500/20 text-sky-300 border-sky-400/50'
                      : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                  title="Atur data penandatangan, tanggal cetak, dan filter tanggal"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Pengaturan Lembar</span>
                </button>

                {/* Zoom Controls */}
                {activePrintViewTab === 'document' && (
                  <div className="flex items-center space-x-1 bg-slate-900/70 px-2 py-0.5 rounded-lg border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setPreviewZoom(z => Math.max(50, z - 10))}
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

                {/* PDF Status / Refresh */}
                {isGeneratingPdfPreview ? (
                  <span className="flex items-center space-x-1 text-sky-400 text-[11px] font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="hidden sm:inline">Membuat PDF...</span>
                  </span>
                ) : pdfBlobUrl ? (
                  <button
                    type="button"
                    onClick={handleOpenPdfNewTab}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-sky-300 hover:text-sky-200 rounded-md transition-colors cursor-pointer"
                    title="Buka tampilan PDF di tab browser baru"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span className="hidden sm:inline">Tab Baru</span>
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={generatePdfPreview}
                  disabled={isGeneratingPdfPreview}
                  className="flex items-center space-x-1 px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                  title="Render ulang file PDF"
                >
                  <RefreshCw className={`w-3 h-3 ${isGeneratingPdfPreview ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Expandable Document Settings Panel */}
            {showSignSettings && (
              <div className="bg-slate-850 p-3 px-4 md:px-6 border-b border-slate-700 text-slate-200 text-xs animate-in slide-in-from-top duration-150 print:hidden shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sky-400 flex items-center space-x-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Pengaturan Dokumen & Pejabat Penandatangan</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSignSettings(false)}
                    className="text-slate-400 hover:text-slate-200 p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Kota Penetapan</label>
                    <input
                      type="text"
                      value={printSignCity}
                      onChange={(e) => setPrintSignCity(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Tanggal Dokumen</label>
                    <input
                      type="text"
                      value={printSignDate}
                      onChange={(e) => setPrintSignDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Jabatan Penandatangan</label>
                    <input
                      type="text"
                      value={printSignRole}
                      onChange={(e) => setPrintSignRole(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:border-sky-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nama Pejabat</label>
                    <input
                      type="text"
                      value={printSignName}
                      onChange={(e) => setPrintSignName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:border-sky-400 focus:outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">NIP Pejabat</label>
                    <input
                      type="text"
                      value={printSignNip}
                      onChange={(e) => setPrintSignNip(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:border-sky-400 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Filter Tanggal Spesifik */}
                {dates.length > 0 && (
                  <div className="pt-2 border-t border-slate-700/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Pilih Kolom Tanggal yang Dicetak:</span>
                      <div className="space-x-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSelectedPrintDates([...dates])}
                          className="text-sky-400 hover:underline cursor-pointer"
                        >
                          Pilih Semua ({dates.length})
                        </button>
                        <span className="text-slate-500">•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPrintDates(dates.slice(0, Math.min(dates.length, 5)))}
                          className="text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          5 Tanggal Pertama
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-900 rounded border border-slate-700/70">
                      {dates.map((d) => {
                        const isSelected = selectedPrintDates.includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                if (selectedPrintDates.length > 1) {
                                  setSelectedPrintDates(prev => prev.filter(item => item !== d));
                                }
                              } else {
                                setSelectedPrintDates(prev => [...prev, d]);
                              }
                            }}
                            className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer border ${
                              isSelected
                                ? 'bg-sky-500/20 text-sky-300 border-sky-400/50 font-bold'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Instruction Notice Banner */}
            <div className="bg-rose-50 border-b border-rose-100 px-4 md:px-6 py-2 flex items-center space-x-2.5 text-xs text-rose-950 print:hidden shrink-0">
              <Info className="w-4 h-4 text-rose-600 shrink-0" />
              <div className="flex-1 leading-relaxed">
                <strong>Pratinjau Dokumen Cek Seribu Siap:</strong> Rekapitulasi presensi memuat <strong>{printableEmployees.length} pegawai</strong> dan <strong>{activePrintDates.length} tanggal</strong>. 
                Untuk tabel dengan banyak tanggal, disarankan menggunakan format <strong>Landscape</strong>. Klik <strong>"Pilih Printer & Cetak"</strong> untuk mencetak langsung, atau <strong>"Simpan PDF"</strong> untuk mengunduh dokumen.
              </div>
            </div>

            {/* Tab 2: Embedded Native PDF Viewer */}
            {activePrintViewTab === 'pdf' && (
              <div className="p-3 md:p-6 overflow-y-auto flex-1 bg-slate-200 flex flex-col items-center justify-center print:hidden">
                {isGeneratingPdfPreview ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center space-y-3 bg-white rounded-2xl shadow-sm border border-slate-300 max-w-md w-full">
                    <Loader2 className="w-10 h-10 text-rose-600 animate-spin" />
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Menyiapkan Penampil PDF Browser...</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Sedang mengonversi tabel rekapitulasi Cek Seribu ke format PDF. Anda juga dapat langsung melihat pratinjau lembar cetak pada tab pertama.
                      </p>
                    </div>
                  </div>
                ) : pdfBlobUrl ? (
                  <div className="w-full h-full max-w-5xl rounded-xl shadow-lg overflow-hidden border border-slate-300 bg-white flex flex-col">
                    <iframe
                      ref={pdfIframeRef}
                      src={`${pdfBlobUrl}#view=FitH`}
                      className="w-full flex-1 min-h-[520px] md:min-h-[620px] border-0"
                      title="Pratinjau PDF Dokumen Laporan Rekapitulasi Presensi Cek Seribu"
                    />
                  </div>
                ) : (
                  <div className="p-10 text-center bg-white rounded-2xl border border-slate-300 shadow-sm max-w-md">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <h4 className="font-bold text-slate-800 text-sm">Penampil PDF belum siap</h4>
                    <p className="text-xs text-slate-500 mt-1 mb-4">
                      Silakan klik tombol muat ulang atau gunakan tab Pratinjau Dokumen.
                    </p>
                    <button
                      type="button"
                      onClick={generatePdfPreview}
                      className="px-3.5 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Render Ulang PDF
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 1 & Printable Engine: Official Document Paper */}
            <div className={`cek-seribu-document-wrapper ${
              activePrintViewTab === 'document'
                ? 'p-4 md:p-8 overflow-y-auto flex-1 bg-slate-200 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible'
                : 'fixed -left-[99999px] top-0 pointer-events-none opacity-0 print:static print:left-auto print:top-auto print:pointer-events-auto print:opacity-100 print:block'
            }`}>
              <div
                id="cek-seribu-printable-document"
                style={{
                  transform: previewZoom !== 100 ? `scale(${previewZoom / 100})` : undefined,
                  transformOrigin: 'top center'
                }}
                className={`bg-white w-full ${
                  printOrientation === 'landscape' ? 'max-w-[297mm] min-h-[210mm]' : 'max-w-[210mm] min-h-[297mm]'
                } p-6 md:p-10 shadow-xl border border-slate-300 text-slate-900 rounded-xs font-sans text-xs print:shadow-none print:p-0 print:border-none print:w-full print:transform-none`}
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

                {/* Document Title Header */}
                <div className="text-center mb-5">
                  <div className="text-[13px] font-extrabold uppercase underline tracking-wide text-slate-900">
                    LAPORAN REKAPITULASI MONITORING PRESENSI CEK SERIBU
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-1">
                    Bulan / Periode: {detectedMonthYear}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Tanggal Cetak: {printSignDate} • Dicetak melalui Sistem Informasi Kepegawaian Kanwil DJPb Riau
                  </div>
                </div>

                {/* Statistics Box */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 bg-slate-50 border border-slate-300 p-2.5 rounded text-[11px]">
                  <div>
                    <span className="text-slate-500">Total Pegawai Terdata:</span>{' '}
                    <strong className="text-slate-900 font-bold">{printStats.total} Orang</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Hadir Lengkap:</span>{' '}
                    <strong className="text-emerald-700 font-bold">{printStats.completeCount} Pegawai</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Anomali / Ada Tidak:</span>{' '}
                    <strong className="text-rose-700 font-bold">{printStats.anomalyCount} Pegawai</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Tingkat Kepatuhan:</span>{' '}
                    <strong className="text-sky-700 font-bold">{printStats.complianceRate}%</strong>
                  </div>
                </div>

                {/* Printable Matrix Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-400 text-slate-900 text-[10px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800">
                        <th rowSpan={2} className="border border-slate-400 px-2 py-1.5 text-center w-10 font-bold">
                          No
                        </th>
                        <th rowSpan={2} className="border border-slate-400 px-3 py-1.5 text-left font-bold min-w-[160px]">
                          Nama Pegawai
                        </th>
                        {activePrintDates.map((d) => (
                          <th
                            key={d}
                            colSpan={2}
                            className="border border-slate-400 px-2 py-1 text-center font-bold font-mono text-[10px] bg-slate-200/70"
                          >
                            {formatDateForHeader(d)}
                          </th>
                        ))}
                      </tr>
                      <tr className="bg-slate-50 text-slate-700">
                        {activePrintDates.map((d) => (
                          <React.Fragment key={`sub-${d}`}>
                            <th className="border border-slate-400 px-1 py-1 text-center font-semibold text-[9px] w-12 bg-emerald-50/50">
                              Hadir
                            </th>
                            <th className="border border-slate-400 px-1 py-1 text-center font-semibold text-[9px] w-12 bg-sky-50/50">
                              Pulang
                            </th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {printableEmployees.length === 0 ? (
                        <tr>
                          <td
                            colSpan={2 + activePrintDates.length * 2}
                            className="border border-slate-400 p-4 text-center text-slate-500 italic"
                          >
                            Tidak ada data pegawai yang sesuai dengan filter.
                          </td>
                        </tr>
                      ) : (
                        printableEmployees.map((row, idx) => {
                          const isRowYellow = row.isYellow;

                          return (
                            <tr
                              key={row.id}
                              className={`break-inside-avoid ${
                                isRowYellow
                                  ? 'bg-amber-100/70'
                                  : idx % 2 === 0
                                  ? 'bg-white'
                                  : 'bg-slate-50/60'
                              }`}
                            >
                              <td className="border border-slate-400 px-2 py-1 text-center font-mono text-slate-600">
                                {idx + 1}
                              </td>
                              <td className="border border-slate-400 px-3 py-1 font-medium text-slate-900">
                                {row.nama}
                              </td>
                              {activePrintDates.map((d) => {
                                const rec = row.records[d] || { hadir: 'Tidak', pulang: 'Tidak' };
                                const hadirAda = !isAbsent(rec.hadir);
                                const pulangAda = !isAbsent(rec.pulang);

                                return (
                                  <React.Fragment key={`${row.id}-${d}`}>
                                    <td
                                      className={`border border-slate-400 px-1 py-1 text-center font-semibold text-[9px] ${
                                        hadirAda
                                          ? 'text-emerald-800 bg-emerald-50/40'
                                          : 'text-rose-700 bg-rose-50/50 font-bold'
                                      }`}
                                    >
                                      {hadirAda ? 'Ada' : 'Tidak'}
                                    </td>
                                    <td
                                      className={`border border-slate-400 px-1 py-1 text-center font-semibold text-[9px] ${
                                        pulangAda
                                          ? 'text-emerald-800 bg-emerald-50/40'
                                          : 'text-rose-700 bg-rose-50/50 font-bold'
                                      }`}
                                    >
                                      {pulangAda ? 'Ada' : 'Tidak'}
                                    </td>
                                  </React.Fragment>
                                );
                              })}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Signature Footer */}
                <div className="mt-8 pt-4 flex justify-between items-end break-inside-avoid text-xs">
                  <div className="text-[10px] text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-700">Catatan Monitoring:</p>
                    <p>• Data presensi Cek Seribu ditarik dari hasil rekapitulasi harian finger / mobile presensi Kanwil DJPb Riau.</p>
                    <p>• Laporan ini diterbitkan secara otomatis dan sah sebagai bahan evaluasi kedisiplinan pegawai.</p>
                    <p className="text-[9px] text-slate-400 italic">ID Dokumen: CS-{detectedMonthYear.replace(/\s+/g, '-')}-{new Date().getTime()}</p>
                  </div>
                  <div className="text-center min-w-[240px]">
                    <div className="text-slate-800">{printSignCity}, {printSignDate}</div>
                    <div className="font-semibold text-slate-800 mt-0.5">{printSignRole}</div>
                    <div className="h-16 flex items-center justify-center">
                      {/* Space for signature */}
                    </div>
                    <div className="font-bold underline text-slate-900">{printSignName}</div>
                    <div className="text-slate-600 font-mono text-[11px]">NIP {printSignNip}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CekSeribuMatrixTable;
