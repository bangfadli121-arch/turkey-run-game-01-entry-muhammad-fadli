// Turkey Escape — browser entry point.
// Written from scratch in this session (27 Nov 2026 rewrite).
// Wires the pure world to the renderer, the input and the sounds, keeps
// the HUD and the overlays in sync, and stages deterministic screenshots
// when the page is opened with ?shot=…&seed=….
//
// Shot mode freezes the world after staging: the render loop keeps
// drawing the same frozen frame (fixed animation time), so a screenshot
// taken at any moment after __shotReady is identical.

import { STEP, GOAL_DISTANCE } from './config.js';
import {
  createWorld,
  EVENT_CORN,
  EVENT_HIT,
  EVENT_CAUGHT,
  EVENT_ESCAPED,
  SCREEN_TITLE,
  SCREEN_PLAYING,
  SCREEN_PAUSED,
  SCREEN_CAUGHT,
  SCREEN_ESCAPED,
} from './world.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { audio } from './audio.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const shotKind = params.get('shot');
const seed = Number.parseInt(params.get('seed') || '1', 10) || 1;
const SHOT_MODE = shotKind === 'start' || shotKind === 'play' || shotKind === 'caught' || shotKind === 'escaped';

const canvas = document.querySelector('#scene');
const hud = {
  score: document.querySelector('#hud-score'),
  distance: document.querySelector('#hud-distance'),
  corn: document.querySelector('#hud-corn'),
  lives: document.querySelector('#hud-lives'),
  level: document.querySelector('#hud-level'),
  progress: document.querySelector('#hud-progress-fill'),
};
const overlays = {
  title: document.querySelector('#overlay-title'),
  caught: document.querySelector('#overlay-caught'),
  escaped: document.querySelector('#overlay-escaped'),
  pause: document.querySelector('#overlay-pause'),
};
const caughtStats = document.querySelector('#caught-stats');
const escapedStats = document.querySelector('#escaped-stats');

const world = createWorld(seed);
const renderer = createRenderer(canvas);

let tapJump = false;
const input = createInput(canvas, {
  onTap() {
    const screen = world.state.screen;
    if (screen === SCREEN_TITLE || screen === SCREEN_CAUGHT || screen === SCREEN_ESCAPED) {
      startRun();
    } else if (screen === SCREEN_PLAYING) {
      tapJump = true;
    } else if (screen === SCREEN_PAUSED) {
      resumeRun();
    }
  },
});

function showOverlay(name) {
  for (const [key, el] of Object.entries(overlays)) {
    if (!el) continue;
    el.classList.toggle('show', key === name);
  }
}

function updateHud() {
  const s = world.state;
  hud.score.textContent = String(s.score);
  hud.distance.textContent = `${Math.floor(s.distance)} m`;
  hud.corn.textContent = `CORN ${s.corn}`;
  hud.lives.textContent = '♥'.repeat(Math.max(0, s.lives)) + '♡'.repeat(Math.max(0, 3 - s.lives));
  hud.level.textContent = `LEVEL ${s.level}`;
  hud.progress.style.width = `${Math.min(100, (s.distance / GOAL_DISTANCE) * 100)}%`;
}

function statsLine(s) {
  return `Score ${s.score} · ${Math.floor(s.distance)} m · ${s.corn} corn`;
}

function startRun() {
  audio.unlock();
  audio.click();
  audio.gobble();
  world.start();
  renderer.reset();
  showOverlay(null);
}

function resumeRun() {
  world.togglePause();
  showOverlay(null);
}

function pauseRun() {
  world.togglePause();
  showOverlay('pause');
}

function onEvents(events) {
  if (events & EVENT_CORN) audio.corn();
  if (events & EVENT_HIT) audio.hit();
  if (events & EVENT_CAUGHT) {
    audio.caught();
    caughtStats.textContent = statsLine(world.state);
    showOverlay('caught');
  }
  if (events & EVENT_ESCAPED) {
    audio.escaped();
    escapedStats.textContent = statsLine(world.state);
    showOverlay('escaped');
  }
}

// --- Screenshot staging -------------------------------------------------
let frozenTime = null;
if (SHOT_MODE) {
  const summary = stageShot(world, shotKind);
  window.__shotSummary = summary;
  // Freeze the animation clock so every rendered frame is identical.
  frozenTime = 12.5;
  updateHud();
  if (world.state.screen === SCREEN_CAUGHT) {
    caughtStats.textContent = statsLine(world.state);
    showOverlay('caught');
  } else if (world.state.screen === SCREEN_ESCAPED) {
    escapedStats.textContent = statsLine(world.state);
    showOverlay('escaped');
  } else if (shotKind === 'start') {
    showOverlay('title');
  } else {
    showOverlay(null);
  }
  renderer.sync(world.state, frozenTime);
  window.__shotReady = true;
}

// --- Main loop ----------------------------------------------------------
let lastNow = performance.now();
let accumulator = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - lastNow) / 1000);
  lastNow = now;

  if (SHOT_MODE) {
    // Frozen frame: redraw identically, never step the world.
    renderer.sync(world.state, frozenTime);
    requestAnimationFrame(frame);
    return;
  }

  const screen = world.state.screen;

  if (input.consumeMute()) {
    const muted = audio.toggleMute();
    document.querySelector('#mute-note').textContent = muted ? 'M — sound off' : 'M — sound on';
  }

  if (screen === SCREEN_TITLE || screen === SCREEN_CAUGHT || screen === SCREEN_ESCAPED) {
    if (input.consumeConfirm()) startRun();
    input.readAction(); // drain any queued steering
  } else if (screen === SCREEN_PAUSED) {
    if (input.consumePause() || input.consumeConfirm()) resumeRun();
    input.readAction();
  } else if (screen === SCREEN_PLAYING) {
    if (input.consumePause()) {
      pauseRun();
    } else {
      accumulator += dt;
      while (accumulator >= STEP) {
        const action = input.readAction();
        if (tapJump) {
          action.jump = true;
          tapJump = false;
        }
        const events = world.fixedStep(action);
        onEvents(events);
        accumulator -= STEP;
        if (world.state.screen !== SCREEN_PLAYING) {
          accumulator = 0;
          break;
        }
      }
    }
  }

  updateHud();
  renderer.sync(world.state, now / 1000);
  requestAnimationFrame(frame);
}

function resize() {
  renderer.resize(canvas.clientWidth, canvas.clientHeight);
}
window.addEventListener('resize', resize);
resize();
if (!SHOT_MODE) {
  showOverlay('title');
  updateHud();
}
requestAnimationFrame(frame);
