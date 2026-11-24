// file -> hash -> dedupe -> QR -> OCR -> parse -> draft for the review screen.
import { db } from '../db/db';
import { classify, fallbackCategoryId, getSetting, ruleFor } from '../db/repo';
import { toLocalIso } from '../lib/format';
import { parseSlipText, type SlipDraft } from './parse';

export interface ImportItem {
  key: string;
  file: File;
  previewUrl: string;
  status: 'queued' | 'reading' | 'ready' | 'duplicate' | 'error';
  error?: string;
  draft?: SlipDraft;
  imageHash?: string;
  thumb?: Blob;
  // editable fields for the review screen
  include: boolean;
  amount: string;
  occurredAt: string;
  receiver: string;
  sender: string;
  categoryId: number;
  type: 'expense' | 'income' | 'transfer';
  note: string;
}

/** Loads the OCR engine ahead of the first slip. */
export const warmUp = () => import('./ocr').then((m) => m.getWorker());

export function newItem(file: File, i: number): ImportItem {
  return {
    key: `${Date.now()}-${i}-${file.name}`,
    file,
    previewUrl: URL.createObjectURL(file),
    status: 'queued',
    include: true,
    amount: '',
    occurredAt: toLocalIso(new Date()).slice(0, 16),
    receiver: '',
    sender: '',
    categoryId: 0,
    type: 'expense',
    note: '',
  };
}

export async function processItem(item: ImportItem, seenRefs: Set<string>): Promise<ImportItem> {
  try {
    const { loadBitmap, ocrText, scanQr, sha256, thumbnail } = await import('./ocr');
    const imageHash = await sha256(item.file);
    if (await db.transactions.where('imageHash').equals(imageHash).count()) {
      return { ...item, imageHash, status: 'duplicate', include: false, error: 'บันทึกสลิปนี้ไปแล้ว' };
    }
    const bmp = await loadBitmap(item.file);
    const qr = scanQr(bmp);
    if (qr && (seenRefs.has(qr.transRef) || (await db.transactions.where('slipRef').equals(qr.transRef).count()))) {
      return { ...item, imageHash, status: 'duplicate', include: false, error: 'บันทึกสลิปนี้ไปแล้ว' };
    }
    const text = await ocrText(bmp);
    const draft = parseSlipText(text, qr);
    if (draft.transRef) {
      if (seenRefs.has(draft.transRef) || (await db.transactions.where('slipRef').equals(draft.transRef).count())) {
        return { ...item, imageHash, draft, status: 'duplicate', include: false, error: 'บันทึกสลิปนี้ไปแล้ว' };
      }
      seenRefs.add(draft.transRef);
    }
    const thumb = await thumbnail(bmp);
    bmp.close();

    const myName = await getSetting('myName', '');
    const type = classify(draft.sender ?? '', draft.receiver ?? '', myName);
    const ruled = await ruleFor(type === 'income' ? draft.sender ?? '' : draft.receiver ?? '');
    const categoryId = ruled ?? (await fallbackCategoryId(type === 'income' ? 'income' : 'expense'));

    return {
      ...item,
      imageHash,
      thumb,
      draft,
      status: 'ready',
      include: draft.isSlip && draft.amountSatang !== null,
      amount: draft.amountSatang !== null ? (draft.amountSatang / 100).toFixed(2) : '',
      occurredAt: draft.occurredAt ? toLocalIso(draft.occurredAt).slice(0, 16) : item.occurredAt,
      receiver: draft.receiver ?? '',
      sender: draft.sender ?? '',
      categoryId,
      type,
    };
  } catch (e) {
    return { ...item, status: 'error', include: false, error: e instanceof Error ? e.message : String(e) };
  }
}
