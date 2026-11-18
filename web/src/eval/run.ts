// On-device eval: synthetic note → on-device profile → code vetoes, compared with labels.
// Open /eval.html in Chrome with on-device AI and click Run. Paste the summary into the README.

import notesFile from '../../../eval/notes.sample.json';
import candidatesFile from '../../../eval/candidates.sample.json';
import type { Candidate } from '../attrs';
import { understandNote } from '../ai/features';
import { deviceState, downloadPrivateModel } from '../ai/gate';
import { onDeviceOnly } from '../ai/models';
import { PROFILE_SYSTEM } from '../ai/prompts';
import { ready } from '../firebase';
import { vetoSet } from '../matcher';

const candidates = candidatesFile.items as Candidate[];
const out = document.querySelector<HTMLPreElement>('#out')!;
const btn = document.querySelector<HTMLButtonElement>('#run')!;
const log = (s: string) => (out.textContent += `${s}\n`);

btn.addEventListener('click', async () => {
  btn.disabled = true;
  out.textContent = '';
  await ready();
  let state = await deviceState();
  if (state === 'downloadable' || state === 'downloading') {
    log('Downloading the on-device model (one time)…');
    await downloadPrivateModel(
      onDeviceOnly(PROFILE_SYSTEM),
      (p) => (btn.textContent = `${Math.round(p * 100)}%`),
    );
    state = await deviceState();
  }
  if (state !== 'available') {
    log(`On-device AI is not available in this browser (${state}). Nothing was sent anywhere.`);
    btn.disabled = false;
    return;
  }

  let tp = 0,
    fp = 0,
    fn = 0,
    exact = 0;
  const latencies: number[] = [];
  for (const c of notesFile.cases) {
    const t0 = performance.now();
    let got: number[] = [];
    try {
      got = vetoSet(await understandNote(c.note), candidates);
    } catch (e) {
      log(`${c.id}: ERROR ${(e as Error).message}`);
      continue;
    }
    const ms = performance.now() - t0;
    latencies.push(ms);
    const want = new Set(c.expectedVetoes);
    const have = new Set(got);
    const caseTp = got.filter((i) => want.has(i)).length;
    tp += caseTp;
    fp += got.length - caseTp;
    fn += c.expectedVetoes.filter((i) => !have.has(i)).length;
    const ok = got.length === want.size && caseTp === want.size;
    if (ok) exact++;
    log(
      `${ok ? '✓' : '✗'} ${c.id.padEnd(18)} ${Math.round(ms)} ms  got [${got}]  want [${c.expectedVetoes}]`,
    );
  }

  latencies.sort((a, b) => a - b);
  const pct = (p: number) =>
    Math.round(latencies[Math.min(latencies.length - 1, Math.floor(p * latencies.length))] ?? 0);
  log('');
  log(`Cases: ${notesFile.cases.length}   exact veto sets: ${exact}`);
  log(
    `Hard-constraint recall: ${(tp / Math.max(1, tp + fn)).toFixed(3)}   precision: ${(tp / Math.max(1, tp + fp)).toFixed(3)}`,
  );
  log(`Latency per note: p50 ${pct(0.5)} ms   p95 ${pct(0.95)} ms`);
  log(`Browser: ${navigator.userAgent}`);
  btn.disabled = false;
  btn.textContent = 'Run again';
});
