// Turns OCR text from a slip into a draft transaction. Written from scratch
// with generic rules (keywords near numbers), not any bank's templates.
import { banksInText, bankByCode, type Bank } from './banks';
import { findDateTime } from './thaiDate';
import type { SlipQr } from './qr';

export interface SlipDraft {
  amountSatang: number | null;
  occurredAt: Date | null;
  hasTime: boolean;
  receiver: string | null;
  sender: string | null;
  bank: Bank | null; // sending bank
  receiverBank: Bank | null;
  transRef: string | null;
  isSlip: boolean;
  confidence: number; // 0..1
  issues: string[];
}

const AMOUNT_KEYS = /(จำนวนเงิน|จํานวนเงิน|จำนวน|จํานวน|ยอดโอน|ยอดเงินโอน|ยอดชำระ|amount|total)/i;
const SKIP_KEYS = /(ค่าธรรมเนียม|ค่าบริการ|คงเหลือ|ยอดเงินคงเหลือ|fee|balance|available)/i;
const SLIP_WORDS = /(โอนเงินสำเร็จ|โอนเงินสําเร็จ|ทำรายการสำเร็จ|ชำระเงินสำเร็จ|รายการสำเร็จ|สำเร็จ|transfer successful|successful|เลขที่รายการ|รหัสอ้างอิง|transaction|พร้อมเพย์|promptpay)/i;
const NUM = /(?<![\d.])(\d{1,3}(?:[,\s]\d{3})+|\d+)[.,](\d{2})(?!\d)/g;
const NAME_PREFIX = /(นางสาว|น\.ส\.|นาง|นาย|ด\.ช\.|ด\.ญ\.|บริษัท|บจก\.?|หจก\.?|ร้าน|mr\.?|mrs\.?|ms\.?|miss)\s*\S+/i;
const TO_KEYS = /^(ไปยัง|ถึง|ผู้รับ|โอนไป|to|receiver|payee)\b/i;
const FROM_KEYS = /^(จาก|ผู้โอน|from|sender)\b/i;
const REF = /(?:เลขที่รายการ|รหัสอ้างอิง|หมายเลขอ้างอิง|ref(?:erence)?\.?\s*(?:no\.?)?|transaction id)\s*[:：]?\s*([A-Za-z0-9]{8,})/i;

const toSatang = (whole: string, dec: string) => Number(whole.replace(/[,\s]/g, '')) * 100 + Number(dec);

/** Amounts on a line, in satang. */
function amountsIn(line: string): number[] {
  const out: number[] = [];
  for (const m of line.matchAll(NUM)) out.push(toSatang(m[1], m[2]));
  return out;
}

export function findAmount(lines: string[]): { satang: number | null; sure: boolean } {
  // 1. A line with an amount keyword, or the line right after one.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!AMOUNT_KEYS.test(line) || SKIP_KEYS.test(line)) continue;
    const here = amountsIn(line);
    if (here.length) return { satang: here[0], sure: true };
    const next = lines[i + 1];
    if (next && !SKIP_KEYS.test(next)) {
      const n = amountsIn(next);
      if (n.length) return { satang: n[0], sure: true };
    }
  }
  // 2. Any number followed by บาท / THB on a line that is not a fee or balance.
  const candidates: number[] = [];
  for (const line of lines) {
    if (SKIP_KEYS.test(line)) continue;
    if (/(บาท|thb|฿)/i.test(line)) candidates.push(...amountsIn(line));
  }
  const nonZero = candidates.filter((c) => c > 0);
  if (nonZero.length) return { satang: Math.max(...nonZero), sure: false };
  return { satang: null, sure: false };
}

function cleanName(s: string): string {
  return s
    .replace(TO_KEYS, '')
    .replace(FROM_KEYS, '')
    .replace(/^[\s:：\-]+/, '')
    .replace(/\s{2,}/g, ' ')
    // OCR drops the space after a Thai title; put it back ("นางสาวมะลิ" -> "นางสาว มะลิ").
    .replace(/^(นางสาว|น\.ส\.|นาง(?!สาว)|นาย|ด\.ช\.|ด\.ญ\.|บจก\.|หจก\.)(?=\S)/, '$1 ')
    .trim();
}

const looksLikeAccount = (s: string) => /x{2,}|\d{3}-|\*{2,}|\d{4,}/i.test(s);

export function findParties(lines: string[]): { sender: string | null; receiver: string | null } {
  let sender: string | null = null;
  let receiver: string | null = null;
  // Explicit labels first.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const label = (re: RegExp) => {
      if (!re.test(line)) return null;
      const rest = cleanName(line);
      if (rest && !looksLikeAccount(rest) && rest.length > 1) return rest;
      const next = lines[i + 1];
      return next && !looksLikeAccount(next) ? cleanName(next) : null;
    };
    receiver ??= label(TO_KEYS);
    sender ??= label(FROM_KEYS);
  }
  // Otherwise: names in order. On a slip the payer comes first, the payee second.
  const names = lines
    .map((l) => l.match(NAME_PREFIX))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => cleanName(m.input!.slice(m.index!)));
  if (!sender && !receiver) {
    if (names.length >= 2) [sender, receiver] = [names[0], names[1]];
    else if (names.length === 1) receiver = names[0];
  } else if (!receiver) {
    receiver = names.find((n) => n !== sender) ?? null;
  } else if (!sender) {
    sender = names.find((n) => n !== receiver) ?? null;
  }
  return { sender, receiver };
}

export function parseSlipText(text: string, qr: SlipQr | null, now = new Date()): SlipDraft {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const issues: string[] = [];

  const amount = findAmount(lines);
  const when = findDateTime(text, now);
  const { sender, receiver } = findParties(lines);
  const mentioned = banksInText(text);
  const bank = bankByCode(qr?.bankCode) ?? mentioned[0] ?? null;
  const receiverBank = mentioned.find((b) => b !== bank) ?? null;
  const transRef = qr?.transRef ?? text.match(REF)?.[1] ?? null;
  const isSlip = !!qr || SLIP_WORDS.test(text);

  let score = 0;
  if (amount.satang !== null) score += amount.sure ? 0.4 : 0.2;
  else issues.push('อ่านยอดเงินไม่ได้');
  if (when) score += when.hasTime ? 0.25 : 0.15;
  else issues.push('อ่านวันที่ไม่ได้');
  if (receiver) score += 0.15;
  else issues.push('ไม่พบชื่อผู้รับ');
  if (qr) score += 0.2;
  else if (isSlip) score += 0.1;
  if (!isSlip) issues.push('อาจไม่ใช่สลิปโอนเงิน');
  if (when && when.date.getTime() > now.getTime() + 86400000) {
    issues.push('วันที่อยู่ในอนาคต');
    score -= 0.2;
  }

  return {
    amountSatang: amount.satang,
    occurredAt: when?.date ?? null,
    hasTime: when?.hasTime ?? false,
    receiver,
    sender,
    bank,
    receiverBank,
    transRef,
    isSlip,
    confidence: Math.max(0, Math.min(1, score)),
    issues,
  };
}
