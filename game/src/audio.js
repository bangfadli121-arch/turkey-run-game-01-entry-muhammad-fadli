// Turkey Escape — procedural WebAudio sounds, no audio files.
// Written from scratch in this session (27 Nov 2026 rewrite).
// Everything is synthesized with oscillators and filtered noise, so the
// game ships zero audio assets and makes zero network requests.

let ctx = null;
let master = null;
let muted = false;

function ensure() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return ctx;
}

function tone({ freq, freqEnd, dur, type = 'sine', vol = 0.2, delay = 0 }) {
  const ac = ensure();
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
  }
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst({ dur, vol = 0.25, freq = 800, delay = 0 }) {
  const ac = ensure();
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = freq;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t0);
}

export const audio = {
  // Call from the first user gesture; browsers block audio before that.
  unlock() {
    ensure();
  },
  toggleMute() {
    muted = !muted;
    return muted;
  },
  isMuted() {
    return muted;
  },
  // The turkey's signature: three quick descending gobbles.
  gobble() {
    tone({ freq: 320, freqEnd: 180, dur: 0.09, type: 'square', vol: 0.12 });
    tone({ freq: 300, freqEnd: 170, dur: 0.09, type: 'square', vol: 0.12, delay: 0.1 });
    tone({ freq: 280, freqEnd: 150, dur: 0.13, type: 'square', vol: 0.12, delay: 0.2 });
  },
  jump() {
    tone({ freq: 280, freqEnd: 620, dur: 0.16, type: 'sine', vol: 0.16 });
  },
  lane() {
    tone({ freq: 500, freqEnd: 700, dur: 0.07, type: 'triangle', vol: 0.1 });
  },
  corn() {
    tone({ freq: 880, dur: 0.08, type: 'sine', vol: 0.18 });
    tone({ freq: 1318, dur: 0.12, type: 'sine', vol: 0.16, delay: 0.07 });
  },
  hit() {
    noiseBurst({ dur: 0.22, vol: 0.3, freq: 500 });
    tone({ freq: 140, freqEnd: 55, dur: 0.28, type: 'sawtooth', vol: 0.22 });
  },
  caught() {
    // A sad little descending line for dinner time.
    tone({ freq: 392, dur: 0.22, type: 'triangle', vol: 0.2 });
    tone({ freq: 330, dur: 0.22, type: 'triangle', vol: 0.2, delay: 0.22 });
    tone({ freq: 262, dur: 0.4, type: 'triangle', vol: 0.2, delay: 0.44 });
  },
  escaped() {
    // A bright little fanfare for reaching the woods.
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      tone({ freq: f, dur: 0.18, type: 'triangle', vol: 0.18, delay: i * 0.12 });
    });
    tone({ freq: 1319, dur: 0.4, type: 'triangle', vol: 0.16, delay: 0.5 });
  },
  click() {
    tone({ freq: 660, dur: 0.05, type: 'sine', vol: 0.12 });
  },
};
