// Copies tesseract worker, wasm core and language data into public/ocr so the
// app runs OCR fully offline, with nothing loaded from a CDN.
import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const out = join(process.cwd(), 'public', 'ocr');
mkdirSync(join(out, 'core'), { recursive: true });
mkdirSync(join(out, 'lang'), { recursive: true });

const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));
cpSync(join(pkgDir('tesseract.js'), 'dist', 'worker.min.js'), join(out, 'worker.min.js'));
const core = pkgDir('tesseract.js-core');
for (const f of ['tesseract-core-lstm', 'tesseract-core-simd-lstm', 'tesseract-core-relaxedsimd-lstm']) {
  for (const ext of ['.wasm.js', '.js', '.wasm']) {
    const src = join(core, f + ext);
    if (existsSync(src)) cpSync(src, join(out, 'core', f + ext));
  }
}
for (const lang of ['tha', 'eng']) {
  cpSync(join(pkgDir(`@tesseract.js-data/${lang}`), '4.0.0_best_int', `${lang}.traineddata.gz`), join(out, 'lang', `${lang}.traineddata.gz`));
}
console.log('OCR assets copied to public/ocr');
