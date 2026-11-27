// Turkey Escape — the hand-in program (Node 22, stdlib only).
// Written from scratch in this session (27 Nov 2026 rewrite).
//
// Copies game/ and screenshots/ into the output directory and writes
// dossier.json: the makefun/dossier/v1 outline the judges read, with
// the four screenshots embedded (base64 + sha256) and a text outline
// of every source file.
//
// Usage: node main.ts [--out <dir>]
//   Default output directory is /output.

import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

function parseOutDir(argv: string[]): string {
  const idx = argv.indexOf('--out');
  if (idx >= 0 && argv[idx + 1]) return path.resolve(argv[idx + 1]);
  return '/output';
}

function sha256Hex(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function listFilesRecursive(dir: string, base: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listFilesRecursive(full, base)));
    } else if (entry.isFile()) {
      out.push(path.relative(base, full));
    }
  }
  return out.sort();
}

// One-line descriptions for the dossier outline, in the author's words.
const FILE_NOTES: Record<string, string> = {
  'game/index.html': 'Page shell: canvas, HUD (score/distance/corn/lives/level/progress), title/caught/escaped/pause cards, import map for the vendored three.js.',
  'game/src/config.js': 'All tuning constants: goal 1500 m, 3 lanes, speed 9-17 m/s, levels every 300 m, 3 lives, farmer gap, jump and collision numbers.',
  'game/src/random.js': 'Seeded PRNG (mulberry32) plus a deterministic integer hash for stable scenery; makes every seed replay exactly.',
  'game/src/world.js': 'Pure game logic, no DOM or rendering: lanes, spawning, collisions, corn, lives, farmer gap, caught/escaped outcomes.',
  'game/src/input.js': 'Keyboard, mouse and touch input; edge-triggered lane changes and jumps, held drop, tap and swipe.',
  'game/src/turkey.js': 'The turkey mesh (body, fan tail, beak, wattle, wings, legs) and its run/jump animation driven by the world state.',
  'game/src/farmer.js': 'The farmer mesh (straw hat, red shirt, apron, carving knife) and his chase run cycle.',
  'game/src/environment.js': 'Golden-hour farm scenery and obstacle meshes: ground, track, sun, clouds, barn, autumn trees, pines, fences, oven, knife, hay, pumpkin, corn.',
  'game/src/render.js': 'three.js scene and chase camera; syncs meshes from the world state, recycles fences and trees, places rows and corn.',
  'game/src/audio.js': 'Procedural WebAudio sounds (gobble, jump, corn, hit, caught, escaped fanfare); no audio files.',
  'game/src/shots.js': 'Headless autopilot (nearest-row pilot with the five hard-learned rules) and deterministic screenshot staging.',
  'game/src/main.js': 'Browser entry: fixed-step loop, HUD and overlay wiring, pause/restart, shot mode with a frozen frame.',
};

const VENDORED_NOTE =
  'game/vendor/three.module.min.js: three.js r170, vendored unchanged (MIT, see its header). Not authored for this entry.';

async function buildDossierText(repoRootPath: string): Promise<string> {
  const lines: string[] = [];
  lines.push('Turkey Escape — a 3D endless runner for the make.fun competition "Make the best turkey escape game".');
  lines.push('');
  lines.push('The player is a turkey escaping Thanksgiving dinner. The farmer chases from 8 m behind and gains 2.4 m on every hit; three hits and the turkey is caught. The run is 1500 m to the pine woods, over five levels (one per 300 m), speeding up from 9 to 17 m/s.');
  lines.push('Three lanes. The oven and the carving knife are tall: switch lane. Hay bales and pumpkins are low: jump them. Corn is worth 10 points; score is distance in metres plus corn points. Title screen, HUD (score, distance, corn, lives, progress bar), CAUGHT and ESCAPED end screens with restart. Keyboard (arrows/WASD/Space), mouse and touch. Procedural WebAudio sounds, no audio files, no network requests.');
  lines.push('');
  lines.push('How to play: node serve.ts, then open http://localhost:8080 in desktop Chrome. Press ENTER to run. Screenshots are staged deterministically with ?shot=start|play|caught|escaped&seed=1.');
  lines.push('');
  lines.push('Source files:');
  const gameFiles = await listFilesRecursive(path.join(repoRootPath, 'game'), repoRootPath);
  for (const rel of gameFiles) {
    if (rel.startsWith('game/vendor/')) continue;
    const full = path.join(repoRootPath, rel);
    const size = (await stat(full)).size;
    const note = FILE_NOTES[rel] || '';
    lines.push(`- ${rel} (${size} bytes): ${note}`);
  }
  lines.push(`- ${VENDORED_NOTE}`);
  lines.push('');
  lines.push('Verification done for this build: headless autopilot escapes 1500 m on seeds 1-10 with 3 lives; the four screenshots are real renders of this code (seed 1, zero console errors); the play screenshot is byte-identical across two renders; keyboard play works (Enter starts, arrows steer, Space jumps, distance and score move, zero errors); no http/https references in game/.');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const outDir = parseOutDir(process.argv.slice(2));
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await cp(path.join(repoRoot, 'game'), path.join(outDir, 'game'), { recursive: true });
  await cp(path.join(repoRoot, 'screenshots'), path.join(outDir, 'screenshots'), { recursive: true });

  const text = await buildDossierText(repoRoot);

  const shotNames = (await readdir(path.join(repoRoot, 'screenshots')))
    .filter((name) => /\.(jpe?g|png)$/i.test(name))
    .sort();
  const images = [];
  for (const name of shotNames) {
    const bytes = await readFile(path.join(repoRoot, 'screenshots', name));
    images.push({
      name,
      media_type: name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
      sha256: sha256Hex(bytes),
      base64: bytes.toString('base64'),
    });
  }

  const dossier = {
    schema: 'makefun/dossier/v1',
    cover: 0,
    text,
    images,
  };
  const dossierJson = JSON.stringify(dossier, null, 2);
  // The dossier contract caps a dossier at 4 MiB; refuse loudly instead
  // of writing a file the judges would reject.
  const dossierBytes = Buffer.byteLength(dossierJson, 'utf8');
  if (dossierBytes > 4 * 1024 * 1024) {
    throw new Error(`dossier is ${dossierBytes} bytes, over the 4 MiB limit`);
  }
  await writeFile(path.join(outDir, 'dossier.json'), dossierJson, 'utf8');

  const gameBytes = (await listFilesRecursive(path.join(outDir, 'game'), outDir)).length;
  console.log(`output: ${outDir}`);
  console.log(`game files copied: ${gameBytes}`);
  console.log(`screenshots: ${images.map((img) => img.name).join(', ')}`);
  console.log(`dossier: ${dossierJson.length} bytes, text ${text.length} bytes, cover ${dossier.cover}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
