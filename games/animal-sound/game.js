/* games/animal-sound/game.js */
'use strict';

// ── Constants ────────────────────────────────────────────────
const TOTAL_ROUNDS   = 10;
const RESULT_PAUSE_MS = 2000;   // pause between rounds

// Player config: label, dot colour, zone class
const PLAYER_CONFIG = [
  { label: 'P1', dot: '#0288D1', cls: 'p1' },
  { label: 'P2', dot: '#E53935', cls: 'p2' },
  { label: 'P3', dot: '#388E3C', cls: 'p3' },
  { label: 'P4', dot: '#F57C00', cls: 'p4' },
];

// ── Animal data ──────────────────────────────────────────────
// Each animal: id, Korean name, SVG builder function
const ANIMALS = [
  {
    id: 'cat',
    name: '고양이',
    buildSvg() {
      // Round face, pointed ears, whiskers
      return `<svg viewBox="0 0 60 60" width="46" height="46" xmlns="http://www.w3.org/2000/svg">
        <!-- Face -->
        <circle cx="30" cy="34" r="20" fill="#FFB74D" stroke="#E65100" stroke-width="1.5"/>
        <!-- Ears -->
        <polygon points="13,18 9,4 22,14" fill="#FFB74D" stroke="#E65100" stroke-width="1.5" stroke-linejoin="round"/>
        <polygon points="47,18 51,4 38,14" fill="#FFB74D" stroke="#E65100" stroke-width="1.5" stroke-linejoin="round"/>
        <!-- Inner ears -->
        <polygon points="14,17 11,8 20,15" fill="#FF8A65" opacity="0.7"/>
        <polygon points="46,17 49,8 40,15" fill="#FF8A65" opacity="0.7"/>
        <!-- Eyes -->
        <ellipse cx="23" cy="31" rx="4" ry="5" fill="#1A1A1A"/>
        <ellipse cx="37" cy="31" rx="4" ry="5" fill="#1A1A1A"/>
        <circle cx="24.5" cy="29.5" r="1.5" fill="#fff"/>
        <circle cx="38.5" cy="29.5" r="1.5" fill="#fff"/>
        <!-- Nose -->
        <polygon points="30,38 28,41 32,41" fill="#E91E63"/>
        <!-- Mouth -->
        <path d="M28,41 Q30,44 32,41" stroke="#555" stroke-width="1.2" fill="none"/>
        <!-- Whiskers -->
        <line x1="10" y1="38" x2="24" y2="39" stroke="#555" stroke-width="1.2"/>
        <line x1="10" y1="41" x2="24" y2="41" stroke="#555" stroke-width="1.2"/>
        <line x1="36" y1="39" x2="50" y2="38" stroke="#555" stroke-width="1.2"/>
        <line x1="36" y1="41" x2="50" y2="41" stroke="#555" stroke-width="1.2"/>
      </svg>`;
    },
    playSound(ctx) {
      // Meow: high sine that rises then falls
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      const t = ctx.currentTime;
      osc.frequency.setValueAtTime(700, t);
      osc.frequency.linearRampToValueAtTime(900, t + 0.15);
      osc.frequency.linearRampToValueAtTime(600, t + 0.4);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.05);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.start(t); osc.stop(t + 0.45);
    }
  },
  {
    id: 'dog',
    name: '강아지',
    buildSvg() {
      // Round face, floppy ears, tongue
      return `<svg viewBox="0 0 60 60" width="46" height="46" xmlns="http://www.w3.org/2000/svg">
        <!-- Floppy ears -->
        <ellipse cx="13" cy="32" rx="8" ry="13" fill="#A1887F" stroke="#6D4C41" stroke-width="1.5"/>
        <ellipse cx="47" cy="32" rx="8" ry="13" fill="#A1887F" stroke="#6D4C41" stroke-width="1.5"/>
        <!-- Face -->
        <circle cx="30" cy="30" r="20" fill="#D7A57A" stroke="#8D6E63" stroke-width="1.5"/>
        <!-- Muzzle -->
        <ellipse cx="30" cy="39" rx="9" ry="7" fill="#F5CFA0"/>
        <!-- Eyes -->
        <circle cx="23" cy="26" r="4" fill="#1A1A1A"/>
        <circle cx="37" cy="26" r="4" fill="#1A1A1A"/>
        <circle cx="24.5" cy="24.5" r="1.5" fill="#fff"/>
        <circle cx="38.5" cy="24.5" r="1.5" fill="#fff"/>
        <!-- Nose -->
        <ellipse cx="30" cy="35" rx="4" ry="3" fill="#1A1A1A"/>
        <circle cx="29" cy="34.5" r="1" fill="#555"/>
        <!-- Tongue -->
        <ellipse cx="30" cy="44" rx="4" ry="3.5" fill="#E91E63"/>
        <line x1="30" y1="42" x2="30" y2="47" stroke="#C2185B" stroke-width="1"/>
        <!-- Spots -->
        <circle cx="20" cy="18" r="4" fill="#A1887F" opacity="0.5"/>
      </svg>`;
    },
    playSound(ctx) {
      // Bark: two short square wave bursts
      [0, 0.18].forEach(offset => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square';
        const t = ctx.currentTime + offset;
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.1);
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.start(t); osc.stop(t + 0.12);
      });
    }
  },
  {
    id: 'bird',
    name: '새',
    buildSvg() {
      // Simple body + wing + beak
      return `<svg viewBox="0 0 60 60" width="46" height="46" xmlns="http://www.w3.org/2000/svg">
        <!-- Body -->
        <ellipse cx="30" cy="38" rx="14" ry="12" fill="#29B6F6" stroke="#0288D1" stroke-width="1.5"/>
        <!-- Tail -->
        <polygon points="16,40 8,50 20,46" fill="#0288D1"/>
        <!-- Wing -->
        <ellipse cx="26" cy="34" rx="9" ry="5" fill="#4FC3F7" stroke="#0288D1" stroke-width="1" transform="rotate(-15,26,34)"/>
        <!-- Head -->
        <circle cx="40" cy="26" r="10" fill="#29B6F6" stroke="#0288D1" stroke-width="1.5"/>
        <!-- Eye -->
        <circle cx="43" cy="24" r="3" fill="#1A1A1A"/>
        <circle cx="44" cy="23" r="1" fill="#fff"/>
        <!-- Beak -->
        <polygon points="50,26 58,24 50,29" fill="#FF8F00"/>
        <!-- Belly -->
        <ellipse cx="31" cy="40" rx="8" ry="6" fill="#E3F2FD" opacity="0.8"/>
      </svg>`;
    },
    playSound(ctx) {
      // Chirps ascending: 1000→1500→2000 Hz, 0.1s each
      [1000, 1500, 2000].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        const t = ctx.currentTime + i * 0.14;
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.linearRampToValueAtTime(freq * 1.15, t + 0.08);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.start(t); osc.stop(t + 0.1);
      });
    }
  },
  {
    id: 'frog',
    name: '개구리',
    buildSvg() {
      // Wide face, big eyes on top
      return `<svg viewBox="0 0 60 60" width="46" height="46" xmlns="http://www.w3.org/2000/svg">
        <!-- Eye bumps -->
        <circle cx="18" cy="18" r="9" fill="#66BB6A" stroke="#388E3C" stroke-width="1.5"/>
        <circle cx="42" cy="18" r="9" fill="#66BB6A" stroke="#388E3C" stroke-width="1.5"/>
        <!-- Face -->
        <ellipse cx="30" cy="36" rx="22" ry="18" fill="#66BB6A" stroke="#388E3C" stroke-width="1.5"/>
        <!-- Belly -->
        <ellipse cx="30" cy="40" rx="14" ry="11" fill="#A5D6A7" opacity="0.85"/>
        <!-- Eyes (pupils) -->
        <circle cx="18" cy="17" r="5" fill="#1A1A1A"/>
        <circle cx="42" cy="17" r="5" fill="#1A1A1A"/>
        <circle cx="19.5" cy="15.5" r="2" fill="#fff"/>
        <circle cx="43.5" cy="15.5" r="2" fill="#fff"/>
        <!-- Mouth wide -->
        <path d="M14,42 Q30,52 46,42" stroke="#388E3C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <!-- Nostrils -->
        <circle cx="26" cy="32" r="1.5" fill="#388E3C"/>
        <circle cx="34" cy="32" r="1.5" fill="#388E3C"/>
      </svg>`;
    },
    playSound(ctx) {
      // Ribbit: low square wave with vibrato
      const osc     = ctx.createOscillator();
      const vibOsc  = ctx.createOscillator();
      const vibGain = ctx.createGain();
      const gain    = ctx.createGain();
      vibOsc.connect(vibGain); vibGain.connect(osc.frequency);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type     = 'square';
      vibOsc.type  = 'sine';
      const t = ctx.currentTime;
      osc.frequency.setValueAtTime(200, t);
      vibOsc.frequency.setValueAtTime(18, t);
      vibGain.gain.setValueAtTime(25, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      vibOsc.start(t); vibOsc.stop(t + 0.35);
      osc.start(t);    osc.stop(t + 0.35);
    }
  },
  {
    id: 'cow',
    name: '소',
    buildSvg() {
      // Face + horns + spots
      return `<svg viewBox="0 0 60 60" width="46" height="46" xmlns="http://www.w3.org/2000/svg">
        <!-- Horns -->
        <path d="M16,14 Q10,4 18,8" stroke="#8D6E63" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M44,14 Q50,4 42,8" stroke="#8D6E63" stroke-width="3" fill="none" stroke-linecap="round"/>
        <!-- Ears -->
        <ellipse cx="10" cy="22" rx="6" ry="8" fill="#FFCCBC" stroke="#BCAAA4" stroke-width="1.5" transform="rotate(-20,10,22)"/>
        <ellipse cx="50" cy="22" rx="6" ry="8" fill="#FFCCBC" stroke="#BCAAA4" stroke-width="1.5" transform="rotate(20,50,22)"/>
        <!-- Face -->
        <ellipse cx="30" cy="34" rx="20" ry="20" fill="#EFEBE9" stroke="#BCAAA4" stroke-width="1.5"/>
        <!-- Black spots -->
        <ellipse cx="22" cy="26" rx="6" ry="5" fill="#1A1A1A" opacity="0.6" transform="rotate(20,22,26)"/>
        <ellipse cx="42" cy="22" rx="4" ry="3" fill="#1A1A1A" opacity="0.6" transform="rotate(-15,42,22)"/>
        <!-- Muzzle -->
        <ellipse cx="30" cy="43" rx="10" ry="7" fill="#FFCCBC"/>
        <!-- Nostrils -->
        <circle cx="26" cy="44" r="2" fill="#BCAAA4"/>
        <circle cx="34" cy="44" r="2" fill="#BCAAA4"/>
        <!-- Eyes -->
        <circle cx="22" cy="30" r="3.5" fill="#1A1A1A"/>
        <circle cx="38" cy="30" r="3.5" fill="#1A1A1A"/>
        <circle cx="23" cy="29" r="1.3" fill="#fff"/>
        <circle cx="39" cy="29" r="1.3" fill="#fff"/>
      </svg>`;
    },
    playSound(ctx) {
      // Moo: long low sine descending
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      const t = ctx.currentTime;
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.linearRampToValueAtTime(100, t + 0.8);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.45, t + 0.1);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.65);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
      osc.start(t); osc.stop(t + 0.85);
    }
  },
  {
    id: 'chicken',
    name: '닭',
    buildSvg() {
      // Body + comb + beak
      return `<svg viewBox="0 0 60 60" width="46" height="46" xmlns="http://www.w3.org/2000/svg">
        <!-- Body -->
        <ellipse cx="30" cy="42" rx="16" ry="13" fill="#FFF9C4" stroke="#F9A825" stroke-width="1.5"/>
        <!-- Wing -->
        <ellipse cx="22" cy="42" rx="7" ry="10" fill="#FFF176" stroke="#F9A825" stroke-width="1" transform="rotate(10,22,42)"/>
        <!-- Head -->
        <circle cx="36" cy="22" r="12" fill="#FFF9C4" stroke="#F9A825" stroke-width="1.5"/>
        <!-- Comb (red) -->
        <path d="M32,12 Q34,6 36,10 Q38,4 40,10 Q42,6 43,12" fill="#E53935" stroke="#C62828" stroke-width="1" stroke-linejoin="round"/>
        <!-- Wattle -->
        <ellipse cx="36" cy="31" rx="3" ry="4" fill="#E53935"/>
        <!-- Beak -->
        <polygon points="46,22 54,20 46,26" fill="#F9A825"/>
        <!-- Eye -->
        <circle cx="40" cy="20" r="3" fill="#1A1A1A"/>
        <circle cx="41" cy="19" r="1" fill="#fff"/>
        <!-- Tail feathers -->
        <path d="M14,38 Q6,28 10,22" stroke="#F9A825" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M14,42 Q4,34 7,28" stroke="#FFD600" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      </svg>`;
    },
    playSound(ctx) {
      // Cluck: sharp sine bursts descending, 3 times
      [0, 0.22, 0.44].forEach(offset => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        const t = ctx.currentTime + offset;
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.18);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.start(t); osc.stop(t + 0.2);
      });
    }
  },
  {
    id: 'pig',
    name: '돼지',
    buildSvg() {
      // Round face + snout + curly tail
      return `<svg viewBox="0 0 60 60" width="46" height="46" xmlns="http://www.w3.org/2000/svg">
        <!-- Ears -->
        <ellipse cx="16" cy="16" rx="7" ry="9" fill="#F48FB1" stroke="#E91E63" stroke-width="1.5" transform="rotate(-20,16,16)"/>
        <ellipse cx="44" cy="16" rx="7" ry="9" fill="#F48FB1" stroke="#E91E63" stroke-width="1.5" transform="rotate(20,44,16)"/>
        <ellipse cx="16" cy="16" rx="4" ry="6" fill="#F8BBD0" transform="rotate(-20,16,16)"/>
        <ellipse cx="44" cy="16" rx="4" ry="6" fill="#F8BBD0" transform="rotate(20,44,16)"/>
        <!-- Face -->
        <circle cx="30" cy="32" r="21" fill="#F48FB1" stroke="#E91E63" stroke-width="1.5"/>
        <!-- Snout -->
        <ellipse cx="30" cy="42" rx="11" ry="8" fill="#F8BBD0" stroke="#F06292" stroke-width="1.2"/>
        <!-- Nostrils -->
        <ellipse cx="26" cy="43" rx="2.5" ry="2" fill="#E91E63"/>
        <ellipse cx="34" cy="43" rx="2.5" ry="2" fill="#E91E63"/>
        <!-- Eyes -->
        <circle cx="22" cy="28" r="4" fill="#1A1A1A"/>
        <circle cx="38" cy="28" r="4" fill="#1A1A1A"/>
        <circle cx="23.5" cy="26.5" r="1.5" fill="#fff"/>
        <circle cx="39.5" cy="26.5" r="1.5" fill="#fff"/>
        <!-- Tail (curly) -->
        <path d="M51,30 Q58,24 56,32 Q54,40 60,38" stroke="#E91E63" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>`;
    },
    playSound(ctx) {
      // Oink: nasal sawtooth with filter sweep
      const osc    = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain   = ctx.createGain();
      osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      filter.type = 'bandpass';
      const t = ctx.currentTime;
      osc.frequency.setValueAtTime(250, t);
      osc.frequency.linearRampToValueAtTime(280, t + 0.15);
      osc.frequency.linearRampToValueAtTime(220, t + 0.3);
      filter.frequency.setValueAtTime(400, t);
      filter.frequency.linearRampToValueAtTime(900, t + 0.15);
      filter.frequency.linearRampToValueAtTime(400, t + 0.3);
      filter.Q.setValueAtTime(3, t);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t); osc.stop(t + 0.35);
    }
  },
  {
    id: 'sheep',
    name: '양',
    buildSvg() {
      // Fluffy body + simple face
      return `<svg viewBox="0 0 60 60" width="46" height="46" xmlns="http://www.w3.org/2000/svg">
        <!-- Fluffy body (clouds) -->
        <circle cx="18" cy="38" r="10" fill="#ECEFF1"/>
        <circle cx="30" cy="33" r="12" fill="#ECEFF1"/>
        <circle cx="42" cy="38" r="10" fill="#ECEFF1"/>
        <circle cx="24" cy="44" r="9" fill="#ECEFF1"/>
        <circle cx="37" cy="44" r="9" fill="#ECEFF1"/>
        <!-- Outline circle to unify -->
        <ellipse cx="30" cy="40" rx="20" ry="16" fill="none" stroke="#B0BEC5" stroke-width="1.2"/>
        <!-- Head -->
        <circle cx="30" cy="20" r="11" fill="#ECEFF1" stroke="#B0BEC5" stroke-width="1.5"/>
        <!-- Ears -->
        <ellipse cx="17" cy="22" rx="5" ry="7" fill="#ECEFF1" stroke="#B0BEC5" stroke-width="1.5" transform="rotate(-20,17,22)"/>
        <ellipse cx="43" cy="22" rx="5" ry="7" fill="#ECEFF1" stroke="#B0BEC5" stroke-width="1.5" transform="rotate(20,43,22)"/>
        <!-- Face -->
        <ellipse cx="30" cy="24" rx="6" ry="4.5" fill="#D7CCC8"/>
        <!-- Eyes -->
        <circle cx="25" cy="17" r="2.5" fill="#1A1A1A"/>
        <circle cx="35" cy="17" r="2.5" fill="#1A1A1A"/>
        <circle cx="25.8" cy="16.2" r="1" fill="#fff"/>
        <circle cx="35.8" cy="16.2" r="1" fill="#fff"/>
        <!-- Nose -->
        <ellipse cx="30" cy="23" rx="2" ry="1.5" fill="#D4A5A5"/>
      </svg>`;
    },
    playSound(ctx) {
      // Baa: tremolo sine at 350Hz
      const osc     = ctx.createOscillator();
      const tremosc = ctx.createOscillator();
      const tremGain= ctx.createGain();
      const gain    = ctx.createGain();
      tremosc.connect(tremGain); tremGain.connect(gain.gain);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type     = 'sine';
      tremosc.type = 'sine';
      const t = ctx.currentTime;
      osc.frequency.setValueAtTime(350, t);
      tremosc.frequency.setValueAtTime(10, t);
      tremGain.gain.setValueAtTime(0.2, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      tremosc.start(t); tremosc.stop(t + 0.55);
      osc.start(t);     osc.stop(t + 0.55);
    }
  },
  {
    id: 'horse',
    name: '말',
    buildSvg() {
      // Long face + mane
      return `<svg viewBox="0 0 60 60" width="46" height="46" xmlns="http://www.w3.org/2000/svg">
        <!-- Mane -->
        <path d="M22,4 Q14,10 16,20 Q12,14 14,24 Q10,18 13,28" stroke="#5D4037" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Head (long) -->
        <ellipse cx="32" cy="28" rx="16" ry="22" fill="#D7A57A" stroke="#8D6E63" stroke-width="1.5"/>
        <!-- Snout -->
        <ellipse cx="32" cy="48" rx="9" ry="6" fill="#F5CFA0" stroke="#8D6E63" stroke-width="1.2"/>
        <!-- Nostrils -->
        <ellipse cx="28" cy="49" rx="2" ry="1.5" fill="#A1887F"/>
        <ellipse cx="36" cy="49" rx="2" ry="1.5" fill="#A1887F"/>
        <!-- Eye -->
        <ellipse cx="38" cy="22" rx="4" ry="4.5" fill="#1A1A1A"/>
        <circle cx="39.5" cy="20.5" r="1.5" fill="#fff"/>
        <!-- Ear -->
        <polygon points="22,8 18,0 28,6" fill="#D7A57A" stroke="#8D6E63" stroke-width="1.2"/>
        <polygon points="23,8 20,3 27,7" fill="#F5CFA0"/>
      </svg>`;
    },
    playSound(ctx) {
      // Neigh: descending noise burst
      const bufSize = ctx.sampleRate * 0.6;
      const buffer  = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data    = buffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain   = ctx.createGain();
      source.buffer = buffer;
      source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      filter.type = 'bandpass';
      const t = ctx.currentTime;
      filter.frequency.setValueAtTime(1000, t);
      filter.frequency.exponentialRampToValueAtTime(400, t + 0.6);
      filter.Q.setValueAtTime(2, t);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
      source.start(t); source.stop(t + 0.65);
    }
  },
  {
    id: 'snake',
    name: '뱀',
    buildSvg() {
      // S-curve body + eyes + tongue
      return `<svg viewBox="0 0 60 60" width="46" height="46" xmlns="http://www.w3.org/2000/svg">
        <!-- Body (S-shape) -->
        <path d="M48,8 Q56,14 48,22 Q40,30 48,38 Q56,46 48,54" stroke="#66BB6A" stroke-width="12" fill="none" stroke-linecap="round"/>
        <path d="M48,8 Q56,14 48,22 Q40,30 48,38 Q56,46 48,54" stroke="#81C784" stroke-width="7" fill="none" stroke-linecap="round"/>
        <!-- Scale pattern -->
        <path d="M48,8 Q56,14 48,22 Q40,30 48,38 Q56,46 48,54" stroke="#A5D6A7" stroke-width="2" fill="none" stroke-linecap="round" stroke-dasharray="4 6"/>
        <!-- Head (larger end) -->
        <ellipse cx="46" cy="10" rx="10" ry="8" fill="#4CAF50" stroke="#388E3C" stroke-width="1.5"/>
        <!-- Eyes -->
        <circle cx="42" cy="8" r="2.5" fill="#1A1A1A"/>
        <circle cx="50" cy="8" r="2.5" fill="#1A1A1A"/>
        <circle cx="42.8" cy="7.2" r="1" fill="#FFEB3B"/>
        <circle cx="50.8" cy="7.2" r="1" fill="#FFEB3B"/>
        <!-- Tongue (forked) -->
        <path d="M46,17 L46,22 M46,22 L43,26 M46,22 L49,26" stroke="#E53935" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      </svg>`;
    },
    playSound(ctx) {
      // Hiss: white noise with high bandpass
      const bufSize = ctx.sampleRate * 0.5;
      const buffer  = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data    = buffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain   = ctx.createGain();
      source.buffer = buffer;
      source.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(4000, ctx.currentTime);
      filter.Q.setValueAtTime(0.8, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      source.start(ctx.currentTime); source.stop(ctx.currentTime + 0.5);
    }
  },
];

// ── Feedback Sound Manager (for ding/buzz — respects mute) ──
const sound = createSoundManager({
  ding(ctx) {
    [523, 659, 784].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.09;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.start(t); osc.stop(t + 0.28);
    });
  },
  buzz(ctx) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.28);
  },
  fanfare(ctx) {
    [392, 494, 523, 659, 784].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle';
      const t = ctx.currentTime + i * 0.12;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
      osc.start(t); osc.stop(t + 0.36);
    });
  },
});

// ── Dedicated AudioContext for animal sounds (bypasses mute) ──
let animalAudioCtx = null;
function getAnimalCtx() {
  if (!animalAudioCtx || animalAudioCtx.state === 'closed') {
    animalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (animalAudioCtx.state === 'suspended') {
    animalAudioCtx.resume();
  }
  return animalAudioCtx;
}

function playAnimalSound(animal) {
  try {
    const ctx = getAnimalCtx();
    animal.playSound(ctx);
  } catch (e) {
    // AudioContext may be blocked — silently ignore
    console.warn('Animal sound playback failed:', e);
  }
}

// ── State ────────────────────────────────────────────────────
let playerCount   = 2;
let roundIdx      = 0;       // 0-based current round
let scores        = [];
let roundLog      = [];      // { animalId, animalName, winnerIdx, dqSet }
let currentAnimal = null;
let currentChoices= [];      // array of 4 ANIMALS objects for this round
let dqSet         = new Set();
let phase         = 'idle';  // 'idle' | 'active' | 'result'
let nextHandle    = null;
let animHandle    = null;
let overlayHandle = null;

// ── DOM refs ─────────────────────────────────────────────────
const introScreen   = document.getElementById('introScreen');
const gameScreen    = document.getElementById('gameScreen');
const resultScreen  = document.getElementById('resultScreen');

const backBtn       = document.getElementById('backBtn');
const playBtn       = document.getElementById('playBtn');
const closeBtn      = document.getElementById('closeBtn');
const retryBtn      = document.getElementById('retryBtn');
const homeBtn       = document.getElementById('homeBtn');

const zonesWrap     = document.getElementById('zonesWrap');
const questionCounter= document.getElementById('questionCounter');
const speakerDisplay = document.getElementById('speakerDisplay');
const centerLabel    = document.getElementById('centerLabel');
const replayBtn      = document.getElementById('replayBtn');
const problemStatus  = document.getElementById('problemStatus');
const scoreBar       = document.getElementById('scoreBar');

const soundToggleIntro = document.getElementById('soundToggleIntro');

const resultTitle      = document.getElementById('resultTitle');
const resultWinner     = document.getElementById('resultWinner');
const resultTableHead  = document.getElementById('resultTableHead');
const resultTableBody  = document.getElementById('resultTableBody');
const totalRow         = document.getElementById('totalRow');

// ── Helpers ──────────────────────────────────────────────────
function showScreen(s) {
  [introScreen, gameScreen, resultScreen].forEach(x => x.classList.remove('active'));
  s.classList.add('active');
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function updateSoundBtn(btn) {
  btn.textContent = sound.isMuted() ? '🔇' : '🔊';
}

// ── Sound toggle ─────────────────────────────────────────────
onTap(soundToggleIntro, () => {
  sound.toggleMute();
  updateSoundBtn(soundToggleIntro);
});
updateSoundBtn(soundToggleIntro);

// ── Player count selection ───────────────────────────────────
document.querySelectorAll('.player-btn').forEach(btn => {
  onTap(btn, () => {
    document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    playerCount = parseInt(btn.dataset.count, 10);
  });
});

// ── Navigation ───────────────────────────────────────────────
onTap(backBtn,  () => { clearTimers(); goHome(); });
onTap(closeBtn, () => { clearTimers(); goHome(); });
onTap(homeBtn,  () => { clearTimers(); goHome(); });
onTap(retryBtn, () => startGame());
onTap(playBtn,  () => startGame());

// Replay button
onTap(replayBtn, () => {
  if (phase !== 'active' && phase !== 'idle') return;
  if (!currentAnimal) return;
  animateSpeaker();
  playAnimalSound(currentAnimal);
});

// ── Build zone grid ──────────────────────────────────────────
function buildZones() {
  zonesWrap.innerHTML = '';
  zonesWrap.className = `zones-wrap p${playerCount}`;

  for (let i = 0; i < playerCount; i++) {
    const cfg  = PLAYER_CONFIG[i];
    const zone = document.createElement('div');
    zone.className = `zone ${cfg.cls}`;
    zone.dataset.player = i;

    const header = document.createElement('div');
    header.className = 'zone-header';
    header.innerHTML = `
      <span class="zone-label">${cfg.label}</span>
      <span class="zone-score-chip" id="score-chip-${i}">0점</span>
    `;

    const grid = document.createElement('div');
    grid.className = 'answer-grid';
    grid.id = `answer-grid-${i}`;

    for (let j = 0; j < 4; j++) {
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.dataset.player = i;
      btn.dataset.slot   = j;
      btn.innerHTML = '<span class="animal-name">?</span>';
      onTap(btn, (e) => handleAnswerTap(i, j, btn, e));
      grid.appendChild(btn);
    }

    zone.appendChild(header);
    zone.appendChild(grid);
    zonesWrap.appendChild(zone);
  }
}

function getZone(idx) {
  return zonesWrap.querySelector(`.zone[data-player="${idx}"]`);
}

function getAnswerBtns(playerIdx) {
  return zonesWrap.querySelectorAll(`.answer-btn[data-player="${playerIdx}"]`);
}

function updateScoreChip(playerIdx) {
  const chip = document.getElementById(`score-chip-${playerIdx}`);
  if (chip) chip.textContent = `${scores[playerIdx]}점`;
}

// ── Build score bar ──────────────────────────────────────────
function buildScoreBar() {
  scoreBar.innerHTML = '';
  for (let i = 0; i < playerCount; i++) {
    const cfg  = PLAYER_CONFIG[i];
    const chip = document.createElement('div');
    chip.className = 'score-chip';
    chip.innerHTML = `
      <span class="score-chip-dot" style="background:${cfg.dot}"></span>
      <span>${cfg.label}</span>
      <span class="score-chip-val" id="bar-score-${i}">0</span>
    `;
    scoreBar.appendChild(chip);
  }
}

function updateBarScore(playerIdx) {
  const el = document.getElementById(`bar-score-${playerIdx}`);
  if (el) el.textContent = scores[playerIdx];
}

// ── Populate answer buttons for a round ─────────────────────
function populateChoices() {
  for (let i = 0; i < playerCount; i++) {
    const btns = getAnswerBtns(i);
    btns.forEach((btn, j) => {
      const animal = currentChoices[j];
      btn.innerHTML = animal.buildSvg() + `<span class="animal-name">${animal.name}</span>`;
      btn.dataset.animalId = animal.id;
      btn.className = 'answer-btn';
      btn.disabled  = false;

      if (dqSet.has(i)) {
        btn.classList.add('state-disabled');
        btn.disabled = true;
      }
    });
  }
}

// ── Ripple ───────────────────────────────────────────────────
function spawnRipple(zone, e) {
  const rect  = zone.getBoundingClientRect();
  const touch = e && e.touches ? e.touches[0] : e;
  const x     = (touch && touch.clientX != null ? touch.clientX : rect.left + rect.width / 2)  - rect.left;
  const y     = (touch && touch.clientY != null ? touch.clientY : rect.top  + rect.height / 2) - rect.top;
  const r     = document.createElement('span');
  r.className = 'zone-ripple';
  r.style.left      = x + 'px';
  r.style.top       = y + 'px';
  const size = Math.max(rect.width, rect.height);
  r.style.width     = size + 'px';
  r.style.height    = size + 'px';
  r.style.marginLeft= `-${size / 2}px`;
  r.style.marginTop = `-${size / 2}px`;
  zone.appendChild(r);
  r.addEventListener('animationend', () => r.remove());
}

// ── Speaker wave animation ───────────────────────────────────
function animateSpeaker() {
  speakerDisplay.classList.add('playing');
  if (animHandle) clearTimeout(animHandle);
  animHandle = setTimeout(() => {
    speakerDisplay.classList.remove('playing');
    animHandle = null;
  }, 700);
}

// ── Answer tap handler ───────────────────────────────────────
function handleAnswerTap(playerIdx, slotIdx, btn, e) {
  if (phase !== 'active') return;
  if (dqSet.has(playerIdx)) return;

  const zone = getZone(playerIdx);
  spawnRipple(zone, e);

  const chosen  = currentChoices[slotIdx];
  const correct = chosen.id === currentAnimal.id;

  if (correct) {
    resolveRound(playerIdx, btn);
  } else {
    sound.play('buzz');
    btn.classList.add('state-wrong');
    disqualifyPlayer(playerIdx);
  }
}

function disqualifyPlayer(playerIdx) {
  if (dqSet.has(playerIdx)) return;
  dqSet.add(playerIdx);

  // Deduct 1 point (floor 0)
  scores[playerIdx] = Math.max(0, scores[playerIdx] - 1);
  updateScoreChip(playerIdx);
  updateBarScore(playerIdx);

  // Penalty flash
  const zone = getZone(playerIdx);
  if (zone) {
    zone.classList.add('penalty-zone');
    zone.addEventListener('animationend', () => zone.classList.remove('penalty-zone'), { once: true });

    const flash = document.createElement('div');
    flash.className = 'penalty-flash';
    flash.textContent = '-1';
    zone.appendChild(flash);
    flash.addEventListener('animationend', () => flash.remove());
  }

  // Disable all this player's buttons
  getAnswerBtns(playerIdx).forEach(b => {
    b.classList.add('state-disabled');
    b.disabled = true;
  });

  // All players DQ'd → nobody wins
  const allDQ = Array.from({ length: playerCount }, (_, i) => i).every(i => dqSet.has(i));
  if (allDQ) {
    resolveRound(-1, null);
  }
}

// ── Resolve a round ──────────────────────────────────────────
function resolveRound(winnerIdx, winBtn) {
  if (phase !== 'active') return;
  clearTimers();
  phase = 'result';

  // Reveal correct answer for all players
  revealCorrect(winnerIdx);

  if (winnerIdx >= 0) {
    sound.play('ding');
    scores[winnerIdx]++;
    updateScoreChip(winnerIdx);
    updateBarScore(winnerIdx);

    if (winBtn) winBtn.classList.add('state-correct');

    const cfg = PLAYER_CONFIG[winnerIdx];
    problemStatus.textContent = `${cfg.label} 정답!`;
    centerLabel.textContent   = currentAnimal.name;

    roundLog.push({
      animalId:   currentAnimal.id,
      animalName: currentAnimal.name,
      winnerIdx,
      dqSet: new Set(dqSet),
    });
  } else {
    sound.play('buzz');
    problemStatus.textContent = '모두 실격!';
    centerLabel.textContent   = currentAnimal.name;

    roundLog.push({
      animalId:   currentAnimal.id,
      animalName: currentAnimal.name,
      winnerIdx: -1,
      dqSet: new Set(dqSet),
    });
  }

  nextHandle = setTimeout(nextRound, RESULT_PAUSE_MS);
}

function revealCorrect(winnerIdx) {
  for (let i = 0; i < playerCount; i++) {
    const btns = getAnswerBtns(i);
    btns.forEach((btn, j) => {
      const animal = currentChoices[j];
      if (animal.id === currentAnimal.id && !(winnerIdx >= 0 && i === winnerIdx && btn.classList.contains('state-correct'))) {
        btn.classList.remove('state-disabled');
        btn.classList.add('state-correct');
        btn.disabled = false;
      }
    });
  }
}

// ── Game flow ────────────────────────────────────────────────
function startGame() {
  clearTimers();
  scores    = new Array(playerCount).fill(0);
  roundLog  = [];
  roundIdx  = 0;

  showScreen(gameScreen);
  buildZones();
  buildScoreBar();
  nextRound();
}

// Shuffled order of animals for this game
let animalOrder = [];

function nextRound() {
  if (roundIdx >= TOTAL_ROUNDS) {
    showResult();
    return;
  }

  roundIdx++;
  dqSet   = new Set();
  phase   = 'idle';

  questionCounter.textContent = `${roundIdx} / ${TOTAL_ROUNDS}`;
  problemStatus.textContent   = '';
  centerLabel.textContent     = '어떤 동물일까?';
  replayBtn.disabled          = false;
  speakerDisplay.classList.remove('playing');

  // Reset zones
  for (let i = 0; i < playerCount; i++) {
    const z = getZone(i);
    if (z) z.classList.remove('dq-zone', 'penalty-zone');
    getAnswerBtns(i).forEach(b => {
      b.className = 'answer-btn';
      b.disabled  = false;
      b.innerHTML = '<span class="animal-name">?</span>';
    });
  }

  // Pick animal for this round (cycle through shuffled list)
  if (animalOrder.length === 0) {
    animalOrder = shuffle(ANIMALS.map((_, i) => i));
  }
  const animalIdx = animalOrder.pop();
  currentAnimal   = ANIMALS[animalIdx];

  // Pick 3 wrong animals (unique)
  const wrongPool = ANIMALS.filter(a => a.id !== currentAnimal.id);
  const wrongs    = shuffle(wrongPool).slice(0, 3);
  currentChoices  = shuffle([currentAnimal, ...wrongs]);

  // Populate choices
  populateChoices();

  // Small delay, then play sound and activate
  nextHandle = setTimeout(() => {
    animateSpeaker();
    playAnimalSound(currentAnimal);
    phase = 'active';
    replayBtn.disabled = false;
  }, 400);
}

function clearTimers() {
  if (nextHandle)    { clearTimeout(nextHandle);    nextHandle    = null; }
  if (animHandle)    { clearTimeout(animHandle);    animHandle    = null; }
  if (overlayHandle) { clearTimeout(overlayHandle); overlayHandle = null; }
}

// ── Result screen ─────────────────────────────────────────────
function showResult() {
  sound.play('fanfare');

  const maxScore = Math.max(...scores);
  const winners  = scores.reduce((acc, s, i) => { if (s === maxScore) acc.push(i); return acc; }, []);

  if (winners.length === 1) {
    const cfg = PLAYER_CONFIG[winners[0]];
    resultTitle.textContent  = '게임 종료!';
    resultWinner.textContent = `${cfg.label} 최종 우승!`;
    resultWinner.style.color = cfg.dot;
  } else {
    resultTitle.textContent  = '게임 종료!';
    resultWinner.textContent = `공동 우승: ${winners.map(i => PLAYER_CONFIG[i].label).join(', ')}`;
    resultWinner.style.color = '#388E3C';
  }

  // Table header
  const players = Array.from({ length: playerCount }, (_, i) => PLAYER_CONFIG[i]);
  resultTableHead.innerHTML = `
    <tr>
      <th>#</th>
      <th>동물</th>
      ${players.map(p => `<th><span class="player-dot" style="background:${p.dot}"></span>${p.label}</th>`).join('')}
    </tr>
  `;

  // Table body
  resultTableBody.innerHTML = roundLog.map((q, ri) => {
    const cells = players.map((_, pi) => {
      if (q.winnerIdx === pi)               return `<td class="cell-win">정답</td>`;
      if (q.dqSet.has(pi))                  return `<td class="cell-dq">실격</td>`;
      if (q.winnerIdx < 0 && !q.dqSet.has(pi)) return `<td class="cell-none">—</td>`;
      return `<td class="cell-none">—</td>`;
    }).join('');
    return `<tr>
      <td>${ri + 1}</td>
      <td style="font-weight:700">${q.animalName}</td>
      ${cells}
    </tr>`;
  }).join('');

  // Total chips
  totalRow.innerHTML = players.map((p, i) => `
    <div class="total-chip">
      <span class="chip-dot" style="background:${p.dot}"></span>
      <span>${p.label}</span>
      <span class="chip-score">${scores[i]}점</span>
    </div>
  `).join('');

  showScreen(resultScreen);
}
