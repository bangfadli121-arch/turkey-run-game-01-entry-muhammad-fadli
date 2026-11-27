// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game
// moves between five screens: title, play, paused, caught and escaped.
//
// ?seed=N fixes the obstacle pattern. ?shot=start|play|caught|escaped
// (with &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createWorld, EVENT_CAUGHT, EVENT_CORN, EVENT_ESCAPED, EVENT_HIT, EVENT_LEVEL } from './world.js';
import { ACTION_CONFIRM, ACTION_DROP, ACTION_JUMP, ACTION_LEFT, ACTION_PAUSE, ACTION_RIGHT, createInput } from './input.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const container = document.getElementById('gl');
const status = document.getElementById('status');
const hud = {
  score: document.getElementById('hud-score'),
  distance: document.getElementById('hud-distance'),
  corn: document.getElementById('hud-corn'),
  lives: document.getElementById('hud-lives'),
  level: document.getElementById('hud-level'),
  progress: document.getElementById('hud-progress'),
  warning: document.getElementById('hud-warning'),
  overlays: {
    title: document.getElementById('overlay-title'),
    paused: document.getElementById('overlay-paused'),
    caught: document.getElementById('overlay-caught'),
    escaped: document.getElementById('overlay-escaped'),
  },
  bestLine: document.getElementById('best-line'),
  caughtScore: document.getElementById('caught-score'),
  escapedScore: document.getElementById('escaped-score'),
};

const world = createWorld(seed);
const renderer = createRenderer(container, hud);
const input = createInput(window);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}

let best = readBest();

function showScreen(name) {
  const data = { score: world.state.score, distance: world.state.distance, corn: world.state.corn, best };
  renderer.setOverlay(name, data);
  if (name === 'title') status.textContent = 'Turkey Escape. Press Enter or click to run from the farmer.';
  if (name === 'caught') status.textContent = `Caught! Score ${world.state.score}. Press Enter to try again.`;
  if (name === 'escaped') status.textContent = `Escaped! Score ${world.state.score}. Press Enter to run again.`;
  if (name === 'paused') status.textContent = 'Paused. Press P or Enter to keep running.';
}

function runShot(name) {
  const scene = stageShot(name, world);
  showScreen(scene.screen);
  // Fixed animation time: the same shot must paint the same frame twice.
  const fixedT = 12.5;
  let painted = 0;
  function paint() {
    renderer.draw(world.state, fixedT);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  showScreen('title');
  let last = performance.now();
  let acc = 0;

  function frame(now) {
    const dt = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    const actions = input.drain();
    const screen = world.state.screen;

    if (screen === 'title') {
      if (actions.includes(ACTION_CONFIRM)) {
        audio.unlock();
        audio.gobble();
        world.start();
        showScreen(null);
      }
    } else if (screen === 'play') {
      if (actions.includes(ACTION_PAUSE)) {
        world.state.screen = 'paused';
        showScreen('paused');
      } else {
        const act = { move: 0, jump: false, drop: false };
        for (const a of actions) {
          if (a === ACTION_LEFT) act.move = -1;
          if (a === ACTION_RIGHT) act.move = 1;
          if (a === ACTION_JUMP) act.jump = true;
          if (a === ACTION_DROP) act.drop = true;
        }
        acc += dt;
        let first = true;
        while (acc >= STEP) {
          const ev = world.step(STEP, first ? act : { move: 0, jump: false, drop: false });
          first = false;
          acc -= STEP;
          if (ev & EVENT_HIT) audio.hit();
          if (ev & EVENT_CORN) audio.pickup();
          if (ev & EVENT_LEVEL) audio.level();
          if (ev & EVENT_CAUGHT) {
            audio.caught();
            if (world.state.score > best) { best = world.state.score; saveBest(best); }
            showScreen('caught');
            break;
          }
          if (ev & EVENT_ESCAPED) {
            audio.escaped();
            if (world.state.score > best) { best = world.state.score; saveBest(best); }
            showScreen('escaped');
            break;
          }
          if (world.state.screen !== 'play') break;
        }
      }
    } else if (screen === 'paused') {
      if (actions.includes(ACTION_PAUSE) || actions.includes(ACTION_CONFIRM)) {
        world.state.screen = 'play';
        showScreen(null);
      }
    } else {
      // caught | escaped
      if (actions.includes(ACTION_CONFIRM)) {
        world.reset();
        showScreen('title');
      }
    }

    renderer.draw(world.state, now / 1000);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
