import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, Download, Upload, Filter, AlertTriangle, Check, RefreshCw, 
  FileSpreadsheet, Eye, Tag, Trash2, Trash, AlertCircle, X,
  Printer, FileText, ExternalLink, ZoomIn, ZoomOut, Loader2, CheckCircle2,
  SlidersHorizontal, Settings2, ShieldCheck, HelpCircle, Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import KemenkeuLogo from './KemenkeuLogo';
import { exportElementToPdf, createPdfFromElement, printDocumentElement } from '../lib/pdfExport';

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

// Default 90 employees matching the user's provided Excel matrix screenshot
export const INITIAL_CEK_SERIBU_MATRIX: MatrixRowData[] = [
  {
    id: 'csr-1', nama: 'Abil Fikri Audia', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-2', nama: 'Achmad Djunaidi', isYellow: true,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Tidak' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-3', nama: 'Ade Wahyu Susanto', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-4', nama: 'Ahmad Nauval', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-5', nama: 'Ahmad Widyarma', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '23-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '24-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' } }
  },
  {
    id: 'csr-6', nama: 'Ahmad Yusuf', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '23-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '24-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' } }
  },
  {
    id: 'csr-7', nama: 'Aldi Putra Hernandes', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-8', nama: 'Alni Agustin', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-9', nama: 'Alviza Fadiya Putri', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-10', nama: 'Amylia Febriyanti', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-11', nama: 'Anang Surya Widayanto', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-12', nama: 'Andi Mulyadi', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-13', nama: 'Angga Firmansyah', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-14', nama: 'Aprina Elisabeth Br Manik', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-15', nama: 'Asep Rudi', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-16', nama: 'Atalia Manurung', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-17', nama: 'Audy Morenta Tatyana Girsang', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '23-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '24-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' } }
  },
  {
    id: 'csr-18', nama: 'Ayu Pramita', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-19', nama: 'Betrice Mega Maria Br Pakpahan', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '23-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '24-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' } }
  },
  {
    id: 'csr-20', nama: 'Bulan Indah Purnama Siregar', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Tidak' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-21', nama: 'Charis Danindra Charya Nadiaskara', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '23-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-22', nama: 'Dea Ivana Christi Br. Ginting', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-23', nama: 'Denny Aulia', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-24', nama: 'Devina Rosa Sitepu', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-25', nama: 'Dicky Priatama', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-26', nama: 'Dirga Paul Samuelson Situmorang', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-27', nama: 'Ditta Arbilla Pratiwi', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-28', nama: 'Donny Sulastiawan', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-29', nama: 'Dwi Prioatmaji', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '23-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '24-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' } }
  },
  {
    id: 'csr-30', nama: 'Eko Sambas Priyatna', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-31', nama: 'Eko Supriyanto', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-32', nama: 'Elisa', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-33', nama: 'Elsa Natalia Situmorang', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-34', nama: 'Elyas Setyantoro', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-35', nama: 'Ernita', isYellow: true,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Tidak' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-36', nama: 'Fani Nurfadila Nastitie Ariawan', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-37', nama: 'Farhan Ikram Rahimy', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-38', nama: 'Febri Anastasia Simanjuntak', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-39', nama: 'Fewia Zikri Ramadhani', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-40', nama: 'Firza Yulianti', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '24-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-41', nama: 'Franklin Sipayung', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-42', nama: 'Frans Matthew Manurung', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '23-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '24-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' } }
  },
  {
    id: 'csr-43', nama: 'Frans Ricky Haholongan Butar Butar', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-44', nama: 'Frediek Mulawan', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-45', nama: 'Gandis Nareswari', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-46', nama: 'Gatut Priyo Sembodo', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-47', nama: 'Halim', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-48', nama: 'Hermawan Saptono', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-49', nama: 'Indra Faizal', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-50', nama: 'Irene Aritonang', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-51', nama: 'Judhistira Adi Noegraha', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-52', nama: 'Kamelia Ulfa', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '24-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-53', nama: 'Karno Pandu Wibowo', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-54', nama: 'Kartika Chandra', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-55', nama: 'Kurnia Fitri Anidya', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-56', nama: 'Lina Armila', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-57', nama: 'Mahbub Ulhaq', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-58', nama: 'Maria Siska Tinambunan', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-59', nama: 'Maulana Gilang Firdaus', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '23-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '24-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' } }
  },
  {
    id: 'csr-60', nama: 'Meda Febriana Aquares', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-61', nama: 'Michael Amstrong Sidabutar', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-62', nama: 'Mirza Rahmat Suharta', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-63', nama: 'Mohammad Firdaus', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-64', nama: 'Muhammad Ali Mutohar', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-65', nama: 'Nanang Heru Setyo Purdianto', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-66', nama: 'Nila Anggraini', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-67', nama: 'Nindia Dita Putri', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-68', nama: 'Novrenti Yosephine Br. Perangin-Angin', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-69', nama: 'Nur Asri', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-70', nama: 'Ot Hendri Fitrahadi', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-71', nama: 'Puji Hartanto', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-72', nama: 'Rangga Wingit', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-73', nama: 'Resa Kusumasari Saputro', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-74', nama: 'Rose Aprinia Sibuea', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-75', nama: 'Rusdi Z.', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-76', nama: 'Said Sjafrizal', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-77', nama: 'Saifan Abdulloh Muqimuddin', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '24-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-78', nama: 'Saor Silitonga', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-79', nama: 'Sari Fadillah', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-80', nama: 'Setia Lassunardo Sitanggang', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-81', nama: 'Shania Carissa', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-82', nama: 'Siti Aminah', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-83', nama: 'Tri Utomo', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '23-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '24-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' } }
  },
  {
    id: 'csr-84', nama: 'Tri Widiyono', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '24-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-85', nama: 'Winarni Rahayu', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-86', nama: 'Yasmi', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-87', nama: 'Yayat Nurhayat', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-88', nama: 'Yoel Parlaungan Simamora', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Tidak', pulang: 'Tidak' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-89', nama: 'Yohana Miranda Manik', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  },
  {
    id: 'csr-90', nama: 'Yolanda Catherina Sirait', isYellow: false,
    records: { '22-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '23-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '24-Jul-26': { hadir: 'Ada', pulang: 'Ada' }, '27-Jul-26': { hadir: 'Ada', pulang: 'Ada' } }
  }
];

interface Props {
  data?: MatrixRowData[];
  onDataChange?: (newData: MatrixRowData[]) => void;
  canManageAdmin?: boolean;
  selectedMonth?: string;
  selectedYear?: string;
}

export const CekSeribuMatrixTable: React.FC<Props> = ({
  data = [],
  onDataChange,
  canManageAdmin = true,
  selectedMonth,
  selectedYear,
}) => {
  const [matrixData, setMatrixData] = useState<MatrixRowData[]>(() =>
    [...(data || [])].sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'ANOMALI' | 'TIDAK_HADIR'>('ALL');

  // Sync external props if updated and sort alphabetically
  React.useEffect(() => {
    const sorted = [...(data || [])].sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
    setMatrixData(sorted);
  }, [data]);

  const updateMatrix = (updated: MatrixRowData[]) => {
    const sorted = [...updated].sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
    setMatrixData(sorted);
    if (onDataChange) {
      onDataChange(sorted);
    }
  };

  // Extract all unique dates dynamically & sort chronologically
  const dates = useMemo(() => {
    const setOfDates = new Set<string>();
    matrixData.forEach((row) => {
      if (row.records) {
        Object.keys(row.records).forEach((d) => setOfDates.add(d));
      }
    });
    const list = Array.from(setOfDates);

    list.sort((a, b) => {
      const parseD = (str: string) => {
        const parts = str.split(/[\/\.\-]/);
        if (parts.length === 3) {
          const p1 = parseInt(parts[0], 10);
          const p2 = parseInt(parts[1], 10);
          const y = parseInt(parts[2].length === 2 ? `20${parts[2]}` : parts[2], 10);
          let d = p1;
          let m = p2;
          if (p1 > 12 && p2 <= 12) {
            d = p1;
            m = p2;
          } else if (p2 > 12 && p1 <= 12) {
            d = p2;
            m = p1;
          }
          if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
            return new Date(y, m - 1, d).getTime();
          }
        }
        return 0;
      };
      return parseD(a) - parseD(b);
    });

    return list;
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

  // Dynamic Month & Year detection from dates in matrixData
  const monthMap: Record<string, string> = useMemo(() => ({
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
  }), []);

  const detectedMonthYear = useMemo(() => {
    let foundMonth = 'Agustus';
    let foundYear = '2026';

    if (selectedMonth) {
      const mStr = String(selectedMonth).trim().toLowerCase();
      if (monthMap[mStr]) {
        foundMonth = monthMap[mStr];
      } else {
        foundMonth = selectedMonth;
      }
    }

    if (selectedYear) {
      foundYear = String(selectedYear).trim();
    }

    if (selectedMonth && selectedYear) {
      return `${foundMonth} ${foundYear}`;
    }

    for (const row of matrixData) {
      if (!row.records) continue;
      for (const dKey of Object.keys(row.records)) {
        const str = String(dKey).trim().toLowerCase();
        
        const wordMatch = str.match(/(\d{1,2})[\s\/\.\-]([a-z]{3,9})[\s\/\.\-](\d{2,4})/);
        if (wordMatch) {
          const mKey = wordMatch[2];
          const yKey = wordMatch[3];
          if (monthMap[mKey]) {
            foundMonth = monthMap[mKey];
            foundYear = yKey.length === 2 ? `20${yKey}` : yKey;
            return `${foundMonth} ${foundYear}`;
          }
        }

        const numMatch = str.match(/(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})/);
        if (numMatch) {
          let mNum = numMatch[2].padStart(2, '0');
          let yStr = numMatch[3];
          const g1 = parseInt(numMatch[1], 10);
          const g2 = parseInt(numMatch[2], 10);
          if (g1 > 12 && g2 <= 12) {
            mNum = String(g2).padStart(2, '0');
          } else if (g2 > 12 && g1 <= 12) {
            mNum = String(g1).padStart(2, '0');
          }

          if (monthMap[mNum]) {
            foundMonth = monthMap[mNum];
            foundYear = yStr;
            return `${foundMonth} ${foundYear}`;
          }
        }

        const isoMatch = str.match(/(\d{4})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})/);
        if (isoMatch) {
          const yStr = isoMatch[1];
          const mNum = isoMatch[2].padStart(2, '0');
          if (monthMap[mNum]) {
            foundMonth = monthMap[mNum];
            foundYear = yStr;
            return `${foundMonth} ${foundYear}`;
          }
        }
      }
    }

    return `${foundMonth} ${foundYear}`;
  }, [matrixData, monthMap, selectedMonth, selectedYear]);

  const formatDateForHeader = (dateStr: string): string => {
    if (!dateStr) return dateStr;
    const str = String(dateStr).trim();

    const shortMonthMap: Record<string, string> = {
      '01': 'Jan', '1': 'Jan', 'jan': 'Jan', 'januari': 'Jan',
      '02': 'Feb', '2': 'Feb', 'feb': 'Feb', 'februari': 'Feb',
      '03': 'Mar', '3': 'Mar', 'mar': 'Mar', 'maret': 'Mar',
      '04': 'Apr', '4': 'Apr', 'apr': 'Apr', 'april': 'Apr',
      '05': 'May', '5': 'May', 'mei': 'May', 'may': 'May',
      '06': 'Jun', '6': 'Jun', 'jun': 'Jun', 'juni': 'Jun',
      '07': 'Jul', '7': 'Jul', 'jul': 'Jul', 'juli': 'Jul',
      '08': 'Aug', '8': 'Aug', 'agu': 'Aug', 'ags': 'Aug', 'agustus': 'Aug', 'aug': 'Aug',
      '09': 'Sep', '9': 'Sep', 'sep': 'Sep', 'september': 'Sep',
      '10': 'Oct', 'okt': 'Oct', 'oktober': 'Oct', 'oct': 'Oct',
      '11': 'Nov', 'nov': 'Nov', 'november': 'Nov',
      '12': 'Dec', 'des': 'Dec', 'desember': 'Dec', 'dec': 'Dec'
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

      const mStr = shortMonthMap[mNum] || 'Jul';
      let yr = numMatch[3];
      if (yr.length === 4) yr = yr.substring(2);
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

        // Sort parsed Excel rows alphabetically by employee name
        parsedResult.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));

        setExcelFileName(file.name);
        setPreviewDocTitle(detectedTitle);
        setPreviewMatrixData(parsedResult);
        const allDates = Array.from(new Set(parsedResult.flatMap((r) => Object.keys(r.records || {}))));
        setPreviewDates(allDates.length > 0 ? allDates : ['22-Jul-26', '23-Jul-26', '24-Jul-26', '27-Jul-26']);
        setShowPreviewModal(true);
      } catch (err) {
        console.error('Error importing Excel:', err);
        alert('Gagal membaca file Excel. Pastikan file valid.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Apply Excel Data & Overwrite Matrix Completely
  const handleApplyExcel = () => {
    updateMatrix(previewMatrixData);
    setSelectedRowIds([]);
    setShowPreviewModal(false);
    setSuccessNotice(`BERHASIL MENIMPA DATA EXCEL LAMA! Memuat ${previewMatrixData.length} data pegawai dari file "${excelFileName}". Tampilan telah disesuaikan.`);
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

  // Reset to default sample
  const handleResetSample = () => {
    updateMatrix(INITIAL_CEK_SERIBU_MATRIX);
    setSelectedRowIds([]);
    setSuccessNotice('Data presensi Cek Seribu telah dimuat ulang ke default template.');
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
            <p className="text-xs text-slate-500">
              Bulan: <strong className="font-mono font-bold text-slate-700">{detectedMonthYear}</strong>
              {dates.length > 0 && ` • (${dates.join(', ')})`} • <span className="font-bold text-emerald-700">{matrixData.length} Pegawai</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
