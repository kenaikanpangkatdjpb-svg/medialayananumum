export interface EmployeeAdvocacyItem {
  id: string;
  name: string;
  status: 'Sudah' | 'Belum';
  edition: string;
  division?: string;
  updatedAt?: string;
}

export function isValidEmployeeAdvocacyName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  
  const lower = trimmed.toLowerCase();
  
  // Exclude status words and header labels misidentified as names
  if (
    lower === 'belum' || 
    lower === 'sudah' || 
    lower === 'nama belum' || 
    lower === 'nama sudah' || 
    lower === 'nama' || 
    lower === 'name' || 
    lower === 'nama lengkap' || 
    lower === 'no' || 
    lower === 'status' || 
    lower === 'total' ||
    lower === 'status kepatuhan' ||
    lower === 'status pengisian'
  ) return false;

  if (lower.startsWith('nama belum') || lower.startsWith('nama sudah')) return false;
  if (lower.includes('nama belum') || lower.includes('nama sudah')) return false;

  // Exclude PowerBI / Excel filter summaries and metadata rows
  if (lower.startsWith('applied filters') || lower.includes('applied filters:')) return false;
  if (lower.includes('data.esl') || lower.includes('data.namalengkap') || lower.includes('tanggal is before')) return false;
  if (lower.includes('status kecuali is not') || lower.includes('status kecuali')) return false;
  if (lower.includes('is not (blank)') || lower.includes('staf khusus menteri keuangan') || lower.includes('tenaga ahli menteri keuangan')) return false;
  if (lower.includes('staf ahli bidang ekonomi makro') || lower.includes('staf ahli bidang hukum')) return false;
  if (lower.includes('staf ahli bidang') || lower.includes('wakil menteri keuangan') || lower.includes('suryo utomo s.e. ak. m.b.t.')) return false;
  
  // PowerBI filter rows are typically very long text
  if (trimmed.length > 120 && (lower.includes('is not') || lower.includes('is before') || lower.includes('staf'))) return false;

  return true;
}

/**
 * Normalizes an employee name by stripping punctuation, standard prefixes, and academic degree suffixes
 * to accurately identify duplicate records regardless of whether titles/gelar are included.
 */
export function normalizeEmployeeName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  let s = name.trim().toLowerCase();

  // Strip common prefix titles
  s = s.replace(/^(dr\.|drs\.|dra\.|ir\.|h\.|hj\.)\s+/gi, '');

  // Replace dots, commas, and hyphens with space
  s = s.replace(/[,\.\-_]/g, ' ');

  // Common Indonesian academic degree suffixes (both abbreviated and separated)
  const degrees = [
    's e', 'se', 's kom', 'skom', 's tr ak', 's ak', 's akun', 's m', 'sm', 's mn',
    's h', 'sh', 's sos', 'ssos', 's ip', 'sip', 's si', 'ssi', 's s t', 'sst',
    's ap', 'sap', 's a p', 'a md kb n', 'a md ak', 'a md', 'amd', 'a p kb n', 'a p',
    'm m', 'mm', 'm si', 'msi', 'm b a', 'mba', 'm a', 'ma', 'm h', 'mh', 'm e', 'me',
    'm e p p', 'm a p', 'm b t', 'ak', 'a k'
  ];

  // Iteratively peel degrees from the end of the string
  let changed = true;
  while (changed) {
    changed = false;
    s = s.trim();
    for (const d of degrees) {
      const regex = new RegExp('\\b' + d + '$', 'i');
      if (regex.test(s)) {
        s = s.replace(regex, '').trim();
        changed = true;
      }
    }
  }

  // Normalize duplicate whitespace
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Filters out invalid names/metadata rows and eliminates any duplicate employee entries
 * within each edition (e.g. entries with and without gelar like Winarni Rahayu vs Winarni Rahayu S.S.T. M.M.).
 * The returned 'removed' list contains obsolete/duplicate items so they can be deleted from Firestore.
 */
export function sanitizeEmployeeRecords(items: EmployeeAdvocacyItem[]): { clean: EmployeeAdvocacyItem[], removed: EmployeeAdvocacyItem[] } {
  const clean: EmployeeAdvocacyItem[] = [];
  const removed: EmployeeAdvocacyItem[] = [];
  
  if (!Array.isArray(items)) return { clean, removed };

  // Map of normalized name to EmployeeAdvocacyItem per edition
  const editionMap = new Map<string, Map<string, EmployeeAdvocacyItem>>();

  items.forEach(item => {
    if (!item) return;

    if (!isValidEmployeeAdvocacyName(item.name)) {
      removed.push(item);
      return;
    }

    const ed = item.edition || 'EA 08';
    if (!editionMap.has(ed)) {
      editionMap.set(ed, new Map<string, EmployeeAdvocacyItem>());
    }
    const nameMap = editionMap.get(ed)!;
    const normKey = normalizeEmployeeName(item.name);

    if (!normKey) {
      removed.push(item);
      return;
    }

    if (nameMap.has(normKey)) {
      // DUPLICATE DETECTED!
      const existing = nameMap.get(normKey)!;

      // Preserve 'Sudah' status if either record completed it
      if (item.status === 'Sudah') {
        existing.status = 'Sudah';
      }

      // Keep the longer/more complete official name (e.g. includes full gelar)
      if (item.name.trim().length > existing.name.trim().length) {
        existing.name = item.name.trim();
      }

      // Merge timestamp if newer
      if (item.updatedAt && (!existing.updatedAt || item.updatedAt > existing.updatedAt)) {
        existing.updatedAt = item.updatedAt;
      }

      // Mark duplicate for removal
      removed.push(item);
    } else {
      const cleanItem: EmployeeAdvocacyItem = {
        ...item,
        name: item.name.trim(),
        edition: ed
      };
      nameMap.set(normKey, cleanItem);
      clean.push(cleanItem);
    }
  });

  // Sort clean records alphabetically by name
  clean.sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));

  return { clean, removed };
}

export const STANDARD_EA_EDITIONS = [
  'EA 01',
  'EA 02',
  'EA 03',
  'EA 04',
  'EA 05',
  'EA 06',
  'EA 07',
  'EA 08',
  'EA 09',
  'EA 10'
];

export const INITIAL_EA_EDITIONS = [
  'EA 08',
  'EA 07',
  'EA 06',
  'EA 05',
  'EA 04',
  'EA 03',
  'EA 02',
  'EA 01',
  'EA 09',
  'EA 10'
];

export const INITIAL_EMPLOYEE_ADVOCACY: EmployeeAdvocacyItem[] = [
  { id: 'ea-1', name: 'Abil Fikri Audia S.M.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-2', name: 'Achmad Djunaidi', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-3', name: 'Ade Wahyu Susanto S.S.T. Ak. M.E.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-4', name: 'Adnan Wimbyarto S.E. M.M.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-5', name: 'Ahmad Nauval S. AP. M.M.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-6', name: 'Ahmad Widyarma S.E.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-7', name: 'Ahmad Yusuf S.E. M.Si.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-8', name: 'Aldi Putra Hernandes A.Md.Kb.N.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-9', name: 'Alni Agustin S.E.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-10', name: 'Alviza Fadiya Putri A.Md.Ak.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-11', name: 'Amylia Febriyanti S.Ak.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-12', name: 'Anang Surya Widayanto S.Mn.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-13', name: 'Andi Mulyadi S.Si. M.A.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-14', name: 'Angga Firmansyah S.E. M.A.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-15', name: 'Aprina Elisabeth Br Manik A.Md.Ak.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-16', name: 'Asep Rudi S. E.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-17', name: 'Atalia Manurung A.Md.Ak.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-18', name: 'Audy Morenta Tatyana Girsang A.Md.Kb.N.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-19', name: 'Ayu Pramita S.H.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-20', name: 'Bulan Indah Purnama Siregar A.Md.Ak.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-21', name: 'Charis Danindra Charya Nadiaskara A.P.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-22', name: 'Dea Ivana Chrysti Br. Ginting A.Md.Kb.N.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-23', name: 'Denny Aulia S.E.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-24', name: 'Devina Rosa Sitepu A.Md.Ak.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-25', name: 'Dicky Priatama A.Md.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-26', name: 'Dirga Paul Samuelson Situmorang S.Ak.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-27', name: 'Ditta Arbilla Pratiwi A.Md.Kb.N', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-28', name: 'Donny Sulastiawan S.E. A.k. M.B.A.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-29', name: 'Dr. Saor Silitonga S.Sos. M.Si.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-30', name: 'Dwi Prioatmaji S.Tr.Ak.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-31', name: 'Eko Sambas Priyatna S.E.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-32', name: 'Eko Supriyanto S.IP. M.M.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-33', name: 'Elisa S.E.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-34', name: 'Elsa Natalia Situmorang S.Akun.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-35', name: 'Elyas Setyantoro', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-36', name: 'Ernita S.Ak.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-37', name: 'Fani Nurfadila Nastitie Ariawan A.Md.Kb.N.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-38', name: 'Farhan Ikram Rahimy S.M.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-39', name: 'Febri Anastasia Simanjuntak A.Md.Ak.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-40', name: 'Fewia Zikri Ramadhani S.Akun.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-41', name: 'Firza Yulianti S.E. M.A.P. M.A.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-42', name: 'Franklin Sipayung S.Sos', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-43', name: 'Frans Matthew Manurung A.P.Kb.N.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-44', name: 'Frans Ricky Haholongan Butar Butar A.P.Kb.N.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-45', name: 'Frediek Mulawan S.E.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-46', name: 'Gandis Nareswari A.P.Kb.N.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-47', name: 'Gatut Priyo Sembodo S.H. M.H.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-48', name: 'Halim S.E.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-49', name: 'Hermawan Saptono S.Kom.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-50', name: 'Indra Faizal S.E.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-51', name: 'Irene Aritonang A.P.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-52', name: 'Judhistira Adi Noegraha S.E.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-53', name: 'Kamelia Ulfa A.Md.Kb.N.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-54', name: 'Karno Pandu Wibowo S.E M.E.P.P.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-55', name: 'Kartika Chandra S.E. Ak.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-56', name: 'Kurnia Fitri Anidya S.M.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-57', name: 'Lina Armila A.Md.Kb.N', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-58', name: 'Mahbub Ulhaq S.E.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-59', name: 'Maria Siska Tinambunan A.P.Kb.N.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-60', name: 'Maulana Gilang Firdaus S.E. M.Si.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-61', name: 'Meda Febriana Aquares S.E.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-62', name: 'Michael Amstrong Sidabutar A.Md.Kb.N.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-63', name: 'Mirza Rahmat Suharta S.Kom.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-64', name: 'Mohammad Firdaus S.M.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-65', name: 'Muhammad Ali Mutohar A.Md', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-66', name: 'Nanang Heru Setyo Purdianto S.E. M.B.A.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-67', name: 'Nila Anggraini A.Md.Ak.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-68', name: 'Nindia Dita Putri A.Md.Kb.N.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-69', name: 'Novrenti Yosephine Br. Perangin-Angin A.Md.Ak.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-70', name: 'Nur Asri S.E. M.Si.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-71', name: 'Ot Hendri Fitrahadi S.E.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-72', name: 'Puji Hartanto S.Sos.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-73', name: 'Rangga Wingit S.A.P.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-74', name: 'Resa Kusumasari Saputro A.Md.Kb.N.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-75', name: 'Rose Aprinia Sibuea A.Md.Ak.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-76', name: 'Rusdi Z. S.E.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-77', name: 'Said Syafrizal S.E. Ak.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-78', name: 'Saifan Abdulloh Muqimuddin S.Tr.Ak.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-79', name: 'Sari Fadillah A.Md.Kb.N', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-80', name: 'Setia Lassunardo Sitanggang S.Ak.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-81', name: 'Shania Carissa A.Md.Ak.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-82', name: 'Siti Aminah', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-83', name: 'Tri Utomo S.E. M.A.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-84', name: 'Tri Widiyono S.Kom. M.M.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-85', name: 'Winarni Rahayu S.S.T. M.M.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-86', name: 'Yasmi S.E. Ak.', status: 'Belum', edition: 'EA 08' },
  { id: 'ea-87', name: 'Yoel Parlaungan Simamora A.Md.Ak.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-88', name: 'Yohana Miranda Manik S.Kom.', status: 'Sudah', edition: 'EA 08' },
  { id: 'ea-89', name: 'Yolanda Catherina Sirait A.Md.Ak.', status: 'Belum', edition: 'EA 08' }
];
