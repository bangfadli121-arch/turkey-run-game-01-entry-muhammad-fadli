// Input: keyboard + mouse/touch, read every frame as a set of actions.
// Left / Right (or A / D): change lane. Up / Space / W: jump.
// Down / S: quick drop. Enter / click: confirm (start / restart).
// P or Escape: pause. Nothing here touches the world directly.

export const ACTION_LEFT = 'left';
export const ACTION_RIGHT = 'right';
export const ACTION_JUMP = 'jump';
export const ACTION_DROP = 'drop';
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';

const KEY_ACTIONS = {
  ArrowLeft: ACTION_LEFT,
  KeyA: ACTION_LEFT,
  ArrowRight: ACTION_RIGHT,
  KeyD: ACTION_RIGHT,
  ArrowUp: ACTION_JUMP,
  Space: ACTION_JUMP,
  KeyW: ACTION_JUMP,
  ArrowDown: ACTION_DROP,
  KeyS: ACTION_DROP,
  Enter: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
};

export function createInput(target) {
  const pressed = new Set();
  const queued = [];
  let touchStartX = null;
  let touchStartY = null;

  function onKeyDown(event) {
    const action = KEY_ACTIONS[event.code];
    if (!action) return;
    if (action === ACTION_JUMP || action === ACTION_CONFIRM) event.preventDefault();
    if (!event.repeat) {
      pressed.add(action);
      queued.push(action);
    }
  }
  function onKeyUp(event) {
    const action = KEY_ACTIONS[event.code];
    if (action) pressed.delete(action);
  }
  function onPointerDown(event) {
    // A click anywhere confirms on title/end screens; during play it jumps.
    queued.push(ACTION_CONFIRM);
    touchStartX = event.clientX;
    touchStartY = event.clientY;
  }
  function onPointerUp(event) {
    if (touchStartX === null) return;
    const dx = event.clientX - touchStartX;
    const dy = event.clientY - touchStartY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      queued.push(dx < 0 ? ACTION_LEFT : ACTION_RIGHT);
    } else if (dy < -40) {
      queued.push(ACTION_JUMP);
    } else if (dy > 40) {
      queued.push(ACTION_DROP);
    }
    touchStartX = null;
    touchStartY = null;
  }

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('pointerdown', onPointerDown);
  target.addEventListener('pointerup', onPointerUp);

  return {
    /** Drain the actions queued since the last call, in order. */
    drain() {
      if (queued.length === 0) return queued;
      const out = queued.splice(0, queued.length);
      return out;
    },
    held(action) {
      return pressed.has(action);
    },
  };
}
