// Turkey Escape — keyboard, mouse and touch input.
// Written from scratch in this session (27 Nov 2026 rewrite).
// The world consumes one action per fixed step: { steer, jump, drop }.
// Lane changes and jumps are edge-triggered (one per key press), dropping
// is level-triggered (held). Touch uses swipes; a tap jumps mid-run and
// confirms on the title / end screens.

// Key map, written out plainly so the title card can list the same keys.
export const KEYS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  jump: ['ArrowUp', 'KeyW', 'Space'],
  drop: ['ArrowDown', 'KeyS'],
  pause: ['KeyP', 'Escape'],
  confirm: ['Enter', 'NumpadEnter', 'Space'],
  mute: ['KeyM'],
};

function matches(list, code) {
  return list.includes(code);
}

export function createInput(canvas, hooks) {
  const held = { left: false, right: false, jump: false, drop: false };
  const queue = { steer: 0, jump: false, drop: false };
  let confirmPressed = false;
  let pausePressed = false;
  let mutePressed = false;
  let touchStart = null;

  function pressSteer(dir) {
    // Only the newest steer request in a frame survives; the world takes
    // one lane step per step, so repeated presses queue naturally.
    queue.steer = dir;
  }

  function onKeyDown(e) {
    if (e.repeat) {
      // Holding a lane key must not queue a lane change every frame.
      if (matches(KEYS.drop, e.code)) queue.drop = true;
      return;
    }
    if (matches(KEYS.left, e.code)) {
      pressSteer(-1);
      held.left = true;
    } else if (matches(KEYS.right, e.code)) {
      pressSteer(1);
      held.right = true;
    } else if (matches(KEYS.jump, e.code)) {
      queue.jump = true;
      held.jump = true;
    } else if (matches(KEYS.drop, e.code)) {
      queue.drop = true;
      held.drop = true;
    } else if (matches(KEYS.pause, e.code)) {
      pausePressed = true;
    } else if (matches(KEYS.confirm, e.code)) {
      confirmPressed = true;
    } else if (matches(KEYS.mute, e.code)) {
      mutePressed = true;
    }
    // Game keys must not scroll the page.
    if (
      matches(KEYS.left, e.code) ||
      matches(KEYS.right, e.code) ||
      matches(KEYS.jump, e.code) ||
      matches(KEYS.drop, e.code) ||
      e.code === 'Space'
    ) {
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    if (matches(KEYS.left, e.code)) held.left = false;
    if (matches(KEYS.right, e.code)) held.right = false;
    if (matches(KEYS.jump, e.code)) held.jump = false;
    if (matches(KEYS.drop, e.code)) held.drop = false;
  }

  // Pointer: a quick tap jumps (or confirms on a menu), a swipe steers.
  function onPointerDown(e) {
    touchStart = { x: e.clientX, y: e.clientY, t: performance.now() };
  }

  function onPointerUp(e) {
    if (!touchStart) return;
    const dx = e.clientX - touchStart.x;
    const dy = e.clientY - touchStart.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const dt = performance.now() - touchStart.t;
    touchStart = null;
    if (Math.max(adx, ady) < 24 && dt < 400) {
      // Tap.
      if (hooks.onTap) hooks.onTap();
      return;
    }
    if (adx > ady) {
      pressSteer(dx > 0 ? 1 : -1);
    } else if (dy < 0) {
      queue.jump = true;
    } else {
      queue.drop = true;
    }
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);

  return {
    // Read and clear the edge-triggered action for this step. The world
    // calls this once per fixed step, so a press is never applied twice
    // and never lost between frames.
    readAction() {
      const action = {
        steer: queue.steer,
        jump: queue.jump,
        drop: queue.drop || held.drop,
      };
      queue.steer = 0;
      queue.jump = false;
      queue.drop = false;
      return action;
    },
    consumeConfirm() {
      const v = confirmPressed;
      confirmPressed = false;
      return v;
    },
    consumePause() {
      const v = pausePressed;
      pausePressed = false;
      return v;
    },
    consumeMute() {
      const v = mutePressed;
      mutePressed = false;
      return v;
    },
    // Held keys (for analog-feel extras); the fixed-step loop does not
    // need these, but the pause screen does.
    held,
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
    },
  };
}
