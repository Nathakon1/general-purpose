import Dexie, { type Table } from 'dexie';

export type TxType = 'expense' | 'income' | 'transfer';

export interface Transaction {
  id?: number;
  type: TxType;
  amountSatang: number;
  occurredAt: string; // local ISO, no zone: "2025-11-19T14:32:00"
  categoryId: number;
  receiver: string;
  sender: string;
  bank: string; // bank code or ''
  note: string;
  source: 'slip' | 'manual';
  slipRef?: string;
  imageHash?: string;
  slipImageId?: number;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id?: number;
  name: string;
  emoji: string;
  color: string;
  type: 'expense' | 'income';
  sortOrder: number;
}

export interface Rule {
  id?: number;
  match: string;
  categoryId: number;
}

export interface SlipImage {
  id?: number;
  blob: Blob;
  createdAt: string;
}

export interface Setting {
  key: string;
  value: unknown;
}

class JodjaiDB extends Dexie {
  transactions!: Table<Transaction, number>;
  categories!: Table<Category, number>;
  rules!: Table<Rule, number>;
  slipImages!: Table<SlipImage, number>;
  settings!: Table<Setting, string>;

  constructor() {
    super('jodjai');
    this.version(1).stores({
      transactions: '++id, occurredAt, categoryId, type, source, &slipRef, imageHash',
      categories: '++id, type, sortOrder',
      rules: '++id, &match',
      slipImages: '++id',
      settings: 'key',
    });
    this.on('populate', (tx) => {
      tx.table('categories').bulkAdd(DEFAULT_CATEGORIES);
    });
  }
}

// Our own default set. Colours are category tags, chosen for contrast in both themes.
export const DEFAULT_CATEGORIES: Category[] = [
  { name: 'อาหาร', emoji: '🍜', color: '#E0712C', type: 'expense', sortOrder: 1 },
  { name: 'เครื่องดื่ม', emoji: '🧋', color: '#B5651D', type: 'expense', sortOrder: 2 },
  { name: 'เดินทาง', emoji: '🚇', color: '#2F7DD1', type: 'expense', sortOrder: 3 },
  { name: 'ช้อปปิ้ง', emoji: '🛍️', color: '#C23A7A', type: 'expense', sortOrder: 4 },
  { name: 'บิล/ค่าบ้าน', emoji: '🧾', color: '#6B5BD2', type: 'expense', sortOrder: 5 },
  { name: 'สุขภาพ', emoji: '💊', color: '#1E9E8A', type: 'expense', sortOrder: 6 },
  { name: 'บันเทิง', emoji: '🎬', color: '#D4A017', type: 'expense', sortOrder: 7 },
  { name: 'ครอบครัว', emoji: '👨‍👩‍👧', color: '#8C6D46', type: 'expense', sortOrder: 8 },
  { name: 'อื่นๆ', emoji: '📦', color: '#7A8790', type: 'expense', sortOrder: 99 },
  { name: 'เงินเดือน', emoji: '💼', color: '#1F7A3A', type: 'income', sortOrder: 101 },
  { name: 'รับโอน', emoji: '📥', color: '#3E9B5B', type: 'income', sortOrder: 102 },
  { name: 'รายรับอื่นๆ', emoji: '✨', color: '#5FA36F', type: 'income', sortOrder: 199 },
];

export const db = new JodjaiDB();
