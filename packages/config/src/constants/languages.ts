// Language support configuration for Indonesian regional languages
export const SUPPORTED_LANGUAGES = {
  // Tier 1: Full support with native conversation capabilities
  TIER_1: ['id', 'jv', 'su'],
  // Tier 2: Basic support with translation to Indonesian
  TIER_2: ['btk', 'min', 'bug', 'bjn'],
  // Tier 3: Limited recognition with fallback to Indonesian
  TIER_3: ['*'], // Wildcard for other languages
} as const;

// Language metadata
export const LANGUAGE_METADATA = {
  // Indonesian (National Language)
  id: {
    code: 'id',
    name: 'Bahasa Indonesia',
    nativeName: 'Bahasa Indonesia',
    region: 'Indonesia',
    tier: 1,
    population: 270000000, // Total speakers
    dialects: ['formal', 'informal', 'jakartanese'],
    support: 'full',
  },
  
  // Javanese (Central & East Java)
  jv: {
    code: 'jv',
    name: 'Javanese',
    nativeName: 'Basa Jawa',
    region: 'Central Java, East Java',
    tier: 1,
    population: 68000000,
    dialects: ['ngoko', 'madya', 'krama'],
    support: 'full',
  },
  
  // Sundanese (West Java)
  su: {
    code: 'su',
    name: 'Sundanese',
    nativeName: 'Basa Sunda',
    region: 'West Java',
    tier: 1,
    population: 32000000,
    dialects: ['loma', 'lemes'],
    support: 'full',
  },
  
  // Batak (North Sumatra)
  btk: {
    code: 'btk',
    name: 'Batak',
    nativeName: 'Hata Batak',
    region: 'North Sumatra',
    tier: 2,
    population: 8000000,
    dialects: ['toba', 'karo', 'mandailing', 'simalungun'],
    support: 'basic',
  },
  
  // Minangkabau (West Sumatra)
  min: {
    code: 'min',
    name: 'Minangkabau',
    nativeName: 'Baso Minangkabau',
    region: 'West Sumatra',
    tier: 2,
    population: 6500000,
    dialects: ['padang', 'bukittinggi'],
    support: 'basic',
  },
  
  // Bugis (South Sulawesi)
  bug: {
    code: 'bug',
    name: 'Bugis',
    nativeName: 'Basa Ugi',
    region: 'South Sulawesi',
    tier: 2,
    population: 5000000,
    dialects: ['bone', 'wajo', 'soppeng'],
    support: 'basic',
  },
  
  // Banjar (South Kalimantan)
  bjn: {
    code: 'bjn',
    name: 'Banjar',
    nativeName: 'Bahasa Banjar',
    region: 'South Kalimantan',
    tier: 2,
    population: 4000000,
    dialects: ['hulu', 'kuala'],
    support: 'basic',
  },
} as const;

export type LanguageCode = keyof typeof LANGUAGE_METADATA;
export type LanguageTier = 1 | 2 | 3;
export type SupportLevel = 'full' | 'basic' | 'limited';

// Language detection patterns
export const LANGUAGE_PATTERNS = {
  // Indonesian patterns
  id: [
    /\b(saya|aku|gue|gw)\b/i, // pronouns
    /\b(ini|itu|yang|dengan)\b/i, // common words
    /\b(tidak|nggak|enggak|gak)\b/i, // negation
    /\b(sudah|udah|belum)\b/i, // time markers
  ],
  
  // Javanese patterns
  jv: [
    /\b(aku|kowe|awakmu)\b/i, // pronouns
    /\b(ning|karo|lan)\b/i, // conjunctions
    /\b(ora|gak|mboten)\b/i, // negation
    /\b(wis|durung|lagi)\b/i, // time markers
    /\b(monggo|nuwun|matur)\b/i, // politeness
  ],
  
  // Sundanese patterns
  su: [
    /\b(abdi|aing|maneh)\b/i, // pronouns
    /\b(jeung|sareng|kalawan)\b/i, // conjunctions
    /\b(henteu|teu|moal)\b/i, // negation
    /\b(parantos|can|keur)\b/i, // time markers
    /\b(punten|hatur|nuhun)\b/i, // politeness
  ],
  
  // Batak patterns (simplified)
  btk: [
    /\b(au|ho|ita)\b/i, // pronouns
    /\b(dohot|sian|tu)\b/i, // prepositions
    /\b(ndang|alai|dang)\b/i, // negation/emphasis
  ],
  
  // Minangkabau patterns
  min: [
    /\b(ambo|waang|awak)\b/i, // pronouns
    /\b(jo|nyo|lo)\b/i, // particles
    /\b(indak|kada|nda)\b/i, // negation
  ],
} as const;

// Common phrases for each language
export const COMMON_PHRASES = {
  id: {
    greeting: ['halo', 'hai', 'selamat pagi', 'selamat siang', 'selamat sore'],
    location: ['di', 'dekat', 'sekitar', 'daerah', 'kawasan'],
    problem: ['rusak', 'bermasalah', 'tidak berfungsi', 'mati', 'bocor'],
    time: ['tadi', 'kemarin', 'sejak', 'sudah lama', 'baru saja'],
  },
  jv: {
    greeting: ['sugeng enjing', 'sugeng siang', 'sugeng sonten'],
    location: ['ning', 'cedhak', 'sacedhake', 'dharek'],
    problem: ['rusak', 'ora iso', 'mati', 'bocor', 'angel'],
    time: ['mau', 'wingi', 'wiwit', 'wis suwe', 'nembe'],
  },
  su: {
    greeting: ['wilujeng enjing', 'wilujeng siang', 'wilujeng sonten'],
    location: ['di', 'deukeut', 'sabudeureun', 'wewengkon'],
    problem: ['rusak', 'teu tiasa', 'paeh', 'bocor', 'angel'],
    time: ['tadi', 'kamari', 'ti baheula', 'parantos lami', 'nembe'],
  },
} as const;

// Language detection function
export const detectLanguage = (text: string): LanguageCode => {
  const normalizedText = text.toLowerCase();
  
  // Check patterns for each language
  for (const [langCode, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    const matches = patterns.filter(pattern => pattern.test(normalizedText));
    if (matches.length >= 2) { // Require at least 2 pattern matches
      return langCode as LanguageCode;
    }
  }
  
  // Default to Indonesian
  return 'id';
};

// Get language by tier
export const getLanguagesByTier = (tier: LanguageTier): LanguageCode[] => {
  return Object.entries(LANGUAGE_METADATA)
    .filter(([_, meta]) => meta.tier === tier)
    .map(([code]) => code as LanguageCode);
};

// Check if language is supported
export const isLanguageSupported = (code: string): code is LanguageCode => {
  return code in LANGUAGE_METADATA;
};

// Get support level for language
export const getLanguageSupport = (code: LanguageCode): SupportLevel => {
  return LANGUAGE_METADATA[code].support;
};

// Language-specific UI text
export const UI_TEXT = {
  id: {
    submitButton: 'Kirim Laporan',
    chatPlaceholder: 'Ketik pesan Anda...',
    locationPrompt: 'Dimana lokasi masalah ini terjadi?',
    photoPrompt: 'Bisa kirim foto kondisinya?',
    confirmSubmission: 'Apakah informasi ini sudah benar?',
    thankYou: 'Terima kasih! Laporan Anda telah diterima.',
  },
  jv: {
    submitButton: 'Kirim Laporan',
    chatPlaceholder: 'Ketik pesen sampeyan...',
    locationPrompt: 'Ning endi panggonan masalahe iki?',
    photoPrompt: 'Iso ngirim foto kahananе?',
    confirmSubmission: 'Informasi iki wis bener?',
    thankYou: 'Matur nuwun! Laporan sampeyan wis ditampa.',
  },
  su: {
    submitButton: 'Kirim Laporan',
    chatPlaceholder: 'Ketik pesen anjeun...',
    locationPrompt: 'Di mana tempat masalah ieu kajadian?',
    photoPrompt: 'Tiasa kirim poto kaayaanana?',
    confirmSubmission: 'Inpormasi ieu parantos leres?',
    thankYou: 'Hatur nuhun! Laporan anjeun parantos ditampi.',
  },
} as const;