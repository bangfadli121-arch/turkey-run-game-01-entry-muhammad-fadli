// Procedural sound: no audio files, everything is synthesised with
// WebAudio oscillators. Created lazily on the first user gesture, so the
// game stays silent (and error-free) in a headless screenshot run.
export function createAudio() {
  let ctx = null;
  let enabled = true;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type = 'sine', gain = 0.12, slideTo = null, delay = 0) {
    const ac = ensure();
    if (!ac || !enabled) return;
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  return {
    unlock() { ensure(); },
    toggle() { enabled = !enabled; return enabled; },
    gobble() {
      // A turkey gobble: three fast descending wobbles.
      for (let i = 0; i < 3; i += 1) {
        tone(320 - i * 40, 0.09, 'sawtooth', 0.05, 180 - i * 30, i * 0.09);
      }
    },
    pickup() { tone(880, 0.12, 'sine', 0.1, 1320); },
    jump() { tone(280, 0.18, 'sine', 0.07, 620); },
    hit() {
      tone(140, 0.25, 'square', 0.14, 60);
      tone(90, 0.3, 'sawtooth', 0.1, 50, 0.02);
    },
    caught() {
      tone(220, 0.4, 'sawtooth', 0.12, 110);
      tone(165, 0.6, 'sawtooth', 0.1, 55, 0.25);
    },
    escaped() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.1, null, i * 0.12));
    },
    level() { tone(660, 0.1, 'triangle', 0.08, 990); },
  };
}
