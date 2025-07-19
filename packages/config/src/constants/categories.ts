// Issue categories with Indonesian labels and descriptions
export const ISSUE_CATEGORIES = {
  INFRASTRUCTURE: 'infrastructure',
  CLEANLINESS: 'cleanliness',
  LIGHTING: 'lighting',
  WATER_DRAINAGE: 'water_drainage',
  ENVIRONMENT: 'environment',
  SAFETY: 'safety',
} as const;

export type IssueCategory = typeof ISSUE_CATEGORIES[keyof typeof ISSUE_CATEGORIES];

// Category metadata with Indonesian labels
export const CATEGORY_METADATA = {
  [ISSUE_CATEGORIES.INFRASTRUCTURE]: {
    label: 'Infrastruktur',
    description: 'Jalan rusak, jembatan, fasilitas umum',
    icon: '🛣️',
    color: '#ef4444', // red-500
    examples: [
      'Jalan berlubang',
      'Trotoar rusak',
      'Jembatan penyeberangan',
      'Halte bus rusak',
      'Fasilitas umum rusak',
    ],
  },
  [ISSUE_CATEGORIES.CLEANLINESS]: {
    label: 'Kebersihan',
    description: 'Sampah, sanitasi, polusi',
    icon: '🚮',
    color: '#22c55e', // green-500
    examples: [
      'Sampah berserakan',
      'Tempat sampah rusak',
      'Saluran air kotor',
      'Bau tidak sedap',
      'Toilet umum kotor',
    ],
  },
  [ISSUE_CATEGORIES.LIGHTING]: {
    label: 'Penerangan',
    description: 'Lampu jalan, penerangan umum',
    icon: '💡',
    color: '#f59e0b', // yellow-500
    examples: [
      'Lampu jalan mati',
      'Penerangan kurang',
      'Lampu taman rusak',
      'Area gelap berbahaya',
    ],
  },
  [ISSUE_CATEGORIES.WATER_DRAINAGE]: {
    label: 'Air & Drainase',
    description: 'Air bersih, saluran air, banjir',
    icon: '🚰',
    color: '#3b82f6', // blue-500
    examples: [
      'Saluran air tersumbat',
      'Banjir',
      'Air PAM mati',
      'Drainase rusak',
      'Genangan air',
    ],
  },
  [ISSUE_CATEGORIES.ENVIRONMENT]: {
    label: 'Lingkungan',
    description: 'Pohon, taman, kualitas udara',
    icon: '🌳',
    color: '#10b981', // emerald-500
    examples: [
      'Pohon tumbang',
      'Taman rusak',
      'Polusi udara',
      'Tanaman liar',
      'Area hijau kotor',
    ],
  },
  [ISSUE_CATEGORIES.SAFETY]: {
    label: 'Keamanan',
    description: 'Keamanan, keselamatan lalu lintas',
    icon: '🚨',
    color: '#dc2626', // red-600
    examples: [
      'Area rawan kejahatan',
      'Rambu lalu lintas rusak',
      'Jalan berbahaya',
      'Pagar pengaman rusak',
      'Lubang berbahaya',
    ],
  },
} as const;

// Get category options for forms
export const getCategoryOptions = () => {
  return Object.values(ISSUE_CATEGORIES).map(category => ({
    value: category,
    label: CATEGORY_METADATA[category].label,
    description: CATEGORY_METADATA[category].description,
    icon: CATEGORY_METADATA[category].icon,
    color: CATEGORY_METADATA[category].color,
  }));
};

// Category validation
export const isValidCategory = (category: string): category is IssueCategory => {
  return Object.values(ISSUE_CATEGORIES).includes(category as IssueCategory);
};