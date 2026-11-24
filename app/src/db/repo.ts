import { db, type Category, type Transaction, type TxType } from './db';
import { dayKey, toLocalIso } from '../lib/format';

export const normName = (s: string) =>
  s.toLowerCase().replace(/^(นางสาว|น\.ส\.|นาง|นาย|mr\.?|mrs\.?|ms\.?|miss)\s*/i, '').replace(/[\s.]/g, '');

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return row ? (row.value as T) : fallback;
}
export const setSetting = (key: string, value: unknown) => db.settings.put({ key, value });

export async function categories(): Promise<Category[]> {
  return db.categories.orderBy('sortOrder').toArray();
}

export async function fallbackCategoryId(type: 'expense' | 'income'): Promise<number> {
  const all = await categories();
  const name = type === 'income' ? 'รายรับอื่นๆ' : 'อื่นๆ';
  return (all.find((c) => c.name === name && c.type === type) ?? all.filter((c) => c.type === type).at(-1) ?? all[0]).id!;
}

/** Category for a receiver from saved rules, else null. */
export async function ruleFor(receiver: string): Promise<number | null> {
  if (!receiver) return null;
  const r = await db.rules.where('match').equals(normName(receiver)).first();
  return r?.categoryId ?? null;
}

// Keyword guesses for common Thai payees, used when no saved rule matches.
const GUESSES: [RegExp, string][] = [
  [/กาแฟ|คาเฟ่|cafe|coffee|ชานม|ชาไทย|ชาเย็น|\btea\b|café amazon|starbucks|bubble/i, 'เครื่องดื่ม'],
  [/ร้านอาหาร|ข้าว|ก๋วยเตี๋ยว|อาหาร|หมูกระทะ|ส้มตำ|ไก่|pizza|\bkfc\b|mcdonald|food|restaurant|bistro|grabfood|lineman|foodpanda/i, 'อาหาร'],
  [/\bgrab\b|\bbolt\b|\bbts\b|\bmrt\b|แท็กซี่|taxi|ปตท|\bptt\b|บางจาก|\bshell\b|\besso\b|caltex|ทางด่วน|easy pass|รถไฟ/i, 'เดินทาง'],
  [/7-?eleven|เซเว่น|ซีพี ออลล์|cp all|lotus|โลตัส|big ?c|บิ๊กซี|makro|แม็คโคร|shopee|lazada|central|เซ็นทรัล|\btops\b|uniqlo|watsons/i, 'ช้อปปิ้ง'],
  [/การไฟฟ้า|ประปา|\bais\b|แอดวานซ์|\btrue\b|ทรูมูฟ|dtac|ดีแทค|3bb|ค่าเช่า|นิติบุคคล|ประกัน/i, 'บิล/ค่าบ้าน'],
  [/โรงพยาบาล|รพ\.|คลินิก|clinic|hospital|ร้านยา|pharmacy|ทันตกรรม/i, 'สุขภาพ'],
  [/netflix|spotify|youtube|\bmajor\b|เมเจอร์|sf ?cinema|steam|playstation|disney/i, 'บันเทิง'],
];

export const guessCategoryName = (payee: string) => GUESSES.find(([re]) => re.test(payee))?.[1] ?? null;

export async function guessCategory(payee: string): Promise<number | null> {
  const name = guessCategoryName(payee);
  if (!name) return null;
  const c = (await categories()).find((x) => x.name === name && x.type === 'expense');
  return c?.id ?? null;
}

export async function saveRule(receiver: string, categoryId: number) {
  const match = normName(receiver);
  if (!match) return;
  const existing = await db.rules.where('match').equals(match).first();
  if (existing) await db.rules.update(existing.id!, { categoryId });
  else await db.rules.add({ match, categoryId });
}

/** Decides expense / income / transfer from "my name" in settings. */
export function classify(sender: string, receiver: string, myName: string): TxType {
  const me = normName(myName);
  if (!me) return 'expense';
  const s = normName(sender), r = normName(receiver);
  const isMe = (x: string) => !!x && (x.includes(me) || me.includes(x));
  if (isMe(r) && isMe(s)) return 'transfer';
  if (isMe(r)) return 'income';
  return 'expense';
}

export type NewTx = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;

export async function addTx(tx: NewTx): Promise<number> {
  const now = toLocalIso(new Date());
  return db.transactions.add({ ...tx, createdAt: now, updatedAt: now });
}

export async function updateTx(id: number, patch: Partial<Transaction>) {
  await db.transactions.update(id, { ...patch, updatedAt: toLocalIso(new Date()) });
}

export async function deleteTx(id: number) {
  await db.transaction('rw', db.transactions, db.slipImages, async () => {
    const tx = await db.transactions.get(id);
    if (tx?.slipImageId) await db.slipImages.delete(tx.slipImageId);
    await db.transactions.delete(id);
  });
}

export async function txBetween(fromIso: string, toIso: string): Promise<Transaction[]> {
  return db.transactions.where('occurredAt').between(fromIso, toIso, true, false).reverse().toArray();
}

export function monthRange(year: number, month0: number) {
  const from = toLocalIso(new Date(year, month0, 1));
  const to = toLocalIso(new Date(year, month0 + 1, 1));
  return [from, to] as const;
}

export interface Totals { expense: number; income: number }
export function totals(txs: Transaction[]): Totals {
  const t = { expense: 0, income: 0 };
  for (const x of txs) if (x.type !== 'transfer') t[x.type] += x.amountSatang;
  return t;
}

export function byCategory(txs: Transaction[], type: 'expense' | 'income') {
  const m = new Map<number, number>();
  for (const x of txs) if (x.type === type) m.set(x.categoryId, (m.get(x.categoryId) ?? 0) + x.amountSatang);
  return [...m.entries()].map(([categoryId, satang]) => ({ categoryId, satang })).sort((a, b) => b.satang - a.satang);
}

export function byDay(txs: Transaction[], type: 'expense' | 'income') {
  const m = new Map<string, number>();
  for (const x of txs) if (x.type === type) m.set(dayKey(x.occurredAt), (m.get(dayKey(x.occurredAt)) ?? 0) + x.amountSatang);
  return m;
}

export async function deleteCategory(id: number) {
  const cat = await db.categories.get(id);
  if (!cat) return;
  const fallback = await fallbackCategoryId(cat.type);
  if (fallback === id) throw new Error('ลบหมวดสำรองไม่ได้');
  await db.transaction('rw', db.transactions, db.categories, db.rules, async () => {
    await db.transactions.where('categoryId').equals(id).modify({ categoryId: fallback });
    await db.rules.filter((r) => r.categoryId === id).delete();
    await db.categories.delete(id);
  });
}

// ---- export / backup ----

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function exportCsv(): Promise<string> {
  const cats = new Map((await categories()).map((c) => [c.id!, c.name]));
  const rows = await db.transactions.orderBy('occurredAt').toArray();
  const head = ['date', 'time', 'type', 'amount', 'category', 'receiver', 'sender', 'bank', 'note', 'source', 'ref'];
  const body = rows.map((t) => [
    t.occurredAt.slice(0, 10), t.occurredAt.slice(11, 16), t.type, (t.amountSatang / 100).toFixed(2),
    cats.get(t.categoryId) ?? '', t.receiver, t.sender, t.bank, t.note, t.source, t.slipRef ?? '',
  ].map(csvCell).join(','));
  return '﻿' + [head.join(','), ...body].join('\n');
}

export interface Backup {
  app: 'jodjai';
  version: 1;
  exportedAt: string;
  transactions: Transaction[];
  categories: Category[];
  rules: { match: string; categoryId: number }[];
  settings: { key: string; value: unknown }[];
}

export async function makeBackup(): Promise<Backup> {
  return {
    app: 'jodjai',
    version: 1,
    exportedAt: new Date().toISOString(),
    // Slip images are left out to keep backups small.
    transactions: (await db.transactions.toArray()).map(({ slipImageId: _s, ...t }) => t),
    categories: await db.categories.toArray(),
    rules: await db.rules.toArray(),
    settings: await db.settings.toArray(),
  };
}

export function isBackup(x: unknown): x is Backup {
  const b = x as Backup;
  return !!b && b.app === 'jodjai' && b.version === 1 && Array.isArray(b.transactions) && Array.isArray(b.categories);
}

export async function restoreBackup(b: Backup) {
  if (!isBackup(b)) throw new Error('ไฟล์สำรองไม่ถูกต้อง');
  await db.transaction('rw', [db.transactions, db.categories, db.rules, db.settings, db.slipImages], async () => {
    await Promise.all([db.transactions.clear(), db.categories.clear(), db.rules.clear(), db.settings.clear(), db.slipImages.clear()]);
    await db.categories.bulkAdd(b.categories);
    await db.transactions.bulkAdd(b.transactions);
    await db.rules.bulkAdd(b.rules ?? []);
    await db.settings.bulkAdd(b.settings ?? []);
  });
}

export async function clearAll() {
  await db.delete();
  await db.open();
}
