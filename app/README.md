# จดใจ (Jodjai)

จดรายจ่ายจากสลิปโอนเงิน เลือกรูปสลิป แอปจะอ่านยอดเงิน วันเวลา ชื่อผู้รับ และธนาคารให้ แล้วสรุปเป็นรายวัน รายเดือน และตามหมวด
ทุกอย่างทำงานในเบราว์เซอร์ (OCR ภาษาไทยด้วย tesseract.js) ข้อมูลเก็บใน IndexedDB ของเครื่อง ไม่มีเซิร์ฟเวอร์ ไม่ต้องสมัคร

A personal-use PWA that logs expenses from Thai bank transfer slips. Built clean-room from public descriptions of the idea; no code, art, name or copy from any existing app.

## Run

```bash
cd app
npm install        # also copies the OCR engine + Thai/English data into public/ocr
npm run dev        # http://localhost:5173
npm test           # unit tests (parser, dates, QR, category guesses)
npm run build && npm run e2e   # Playwright flows on synthetic slips
npm run fixtures   # regenerate the synthetic test slips
```

## How a slip is read

1. SHA-256 of the file: the same image is never imported twice.
2. The slip's verification QR (jsQR): sending bank + transaction reference, used to dedupe. It has no amount.
3. OCR (Thai + English), then `src/slip/parse.ts` finds the amount next to จำนวน/Amount (skipping fees and balances), the date (พ.ศ. 2- or 4-digit years, Thai or English months), the payer and payee, and the banks.
4. Every slip goes through a review screen; low-confidence ones are flagged.
5. Category: a saved rule for that payee, else a keyword guess (coffee shop → เครื่องดื่ม, 7-Eleven → ช้อปปิ้ง…), else อื่นๆ. Changing a category during review saves a rule.
6. If "my name" is set, slips paid to you are income, and transfers between your own accounts are left out of totals.

## Install on a phone

Open the site in Chrome (Android) or Safari (iOS) → "Add to Home screen". On Android the installed app shows up in the share sheet, so you can share a slip straight from your bank app.

## Deploy

`.github/workflows/pages.yml` builds, runs unit tests and publishes `app/dist` to GitHub Pages on every push. The build uses relative paths and hash routing, so it works on any static host.
