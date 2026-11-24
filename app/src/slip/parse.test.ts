import { describe, expect, it } from 'vitest';
import { parseSlipText, findAmount } from './parse';
import { buildSlipQr, parseSlipQr, parseTlv } from './qr';
import { findDateTime, toCE } from './thaiDate';

const now = new Date('2025-11-22T12:00:00');

describe('slip QR', () => {
  it('round-trips a built payload', () => {
    const raw = buildSlipQr('004', '015326143259ATF07123');
    expect(parseSlipQr(raw)).toEqual({ bankCode: '004', transRef: '015326143259ATF07123', raw });
  });
  it('rejects a PromptPay payment QR and junk', () => {
    expect(parseSlipQr('00020101021129370016A000000677010111011300668123456785802TH53037646304ABCD')).toBeNull();
    expect(parseSlipQr('hello')).toBeNull();
    expect(parseTlv('0005abc')).toBeNull();
  });
});

describe('dates', () => {
  it('converts Buddhist-era years', () => {
    expect(toCE(68, now)).toBe(2025);
    expect(toCE(2568, now)).toBe(2025);
    expect(toCE(2025, now)).toBe(2025);
  });
  it('reads Thai abbreviated dates with time', () => {
    const r = findDateTime('19 พ.ย. 68 14:32 น.', now)!;
    expect(r.date.toString()).toBe(new Date('2025-11-19T14:32:00').toString());
    expect(r.hasTime).toBe(true);
  });
  it('reads full Thai month and 4-digit year', () => {
    const r = findDateTime('วันที่ 3 มีนาคม 2568 - 09:05:44', now)!;
    expect(r.date.toString()).toBe(new Date('2025-03-03T09:05:44').toString());
  });
  it('does not confuse มี.ค. with ม.ค.', () => {
    expect(findDateTime('1 มี.ค. 68 10:00', now)!.date.getMonth()).toBe(2);
    expect(findDateTime('1 ม.ค. 68 10:00', now)!.date.getMonth()).toBe(0);
  });
  it('reads English and numeric dates', () => {
    expect(findDateTime('19 Nov 2025, 08:15', now)!.date.toString()).toBe(new Date('2025-11-19T08:15:00').toString());
    expect(findDateTime('19/11/2568 21:00', now)!.date.toString()).toBe(new Date('2025-11-19T21:00:00').toString());
  });
});

describe('amount', () => {
  it('prefers the amount line and skips the fee', () => {
    expect(findAmount(['ค่าธรรมเนียม 0.00 บาท', 'จำนวนเงิน 1,250.50 บาท']).satang).toBe(125050);
  });
  it('reads an amount on the line after the label', () => {
    expect(findAmount(['จำนวน:', '89.00 บาท']).satang).toBe(8900);
  });
  it('falls back to the largest baht amount, ignoring balance', () => {
    const r = findAmount(['ยอดเงินคงเหลือ 99,999.00 บาท', '45.00 บาท', '0.00 บาท']);
    expect(r).toEqual({ satang: 4500, sure: false });
  });
});

describe('parseSlipText', () => {
  it('parses a typical slip', () => {
    const text = [
      'โอนเงินสำเร็จ',
      '19 พ.ย. 68 14:32 น.',
      'นาย สมชาย ใจดี',
      'ธ.กสิกรไทย',
      'xxx-x-x1234-x',
      'นางสาว มะลิ หอมหวาน',
      'ธ.ไทยพาณิชย์',
      'xxx-x-x5678-x',
      'เลขที่รายการ: 015323143259ATF07123',
      'จำนวน: 150.00 บาท',
      'ค่าธรรมเนียม: 0.00 บาท',
    ].join('\n');
    const d = parseSlipText(text, null, now);
    expect(d.amountSatang).toBe(15000);
    expect(d.sender).toBe('นาย สมชาย ใจดี');
    expect(d.receiver).toBe('นางสาว มะลิ หอมหวาน');
    expect(d.bank?.code).toBe('004');
    expect(d.receiverBank?.code).toBe('014');
    expect(d.transRef).toBe('015323143259ATF07123');
    expect(d.isSlip).toBe(true);
    expect(d.confidence).toBeGreaterThan(0.8);
    expect(d.issues).toEqual([]);
  });
  it('uses labelled receiver and the QR bank', () => {
    const qr = parseSlipQr(buildSlipQr('014', 'REF1234567890'))!;
    const d = parseSlipText('ชำระเงินสำเร็จ\nไปยัง\nร้านกาแฟดอยช้าง\nจำนวนเงิน 65.00\n2 ธ.ค. 2568 07:45', qr, now);
    expect(d.receiver).toBe('ร้านกาแฟดอยช้าง');
    expect(d.bank?.short).toBe('SCB');
    expect(d.transRef).toBe('REF1234567890');
  });
  it('flags a non-slip photo', () => {
    const d = parseSlipText('a photo of a cat', null, now);
    expect(d.isSlip).toBe(false);
    expect(d.confidence).toBeLessThan(0.3);
    expect(d.issues).toContain('อาจไม่ใช่สลิปโอนเงิน');
  });
});

describe('names', () => {
  it('puts back the space after a Thai title', () => {
    const d = parseSlipText('โอนเงินสำเร็จ\nนายสมชายใจดี\nนางสาวมะลิหอมหวาน\nจำนวน 10.00 บาท', null, now);
    expect(d.sender).toBe('นาย สมชายใจดี');
    expect(d.receiver).toBe('นางสาว มะลิหอมหวาน');
  });
});

import { guessCategoryName } from '../db/repo';
describe('category guesses', () => {
  it('guesses common payees', () => {
    expect(guessCategoryName('ร้านกาแฟบ้านสวน')).toBe('เครื่องดื่ม');
    expect(guessCategoryName('7-ELEVEN สาขา 1234')).toBe('ช้อปปิ้ง');
    expect(guessCategoryName('GRAB TAXI')).toBe('เดินทาง');
    expect(guessCategoryName('การไฟฟ้านครหลวง')).toBe('บิล/ค่าบ้าน');
  });
  it('leaves people alone', () => {
    expect(guessCategoryName('นาย สมชาย ใจดี')).toBeNull();
    expect(guessCategoryName('MS MALI HOMWAN')).toBeNull();
    expect(guessCategoryName('MR KAIS TRUEMAN')).toBeNull();
  });
});
