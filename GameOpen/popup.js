/* ============================================================
   GameOpen - lanceur d'apps + mini-jeux
   ============================================================ */

const DEFAULT_APPS = [
  { name: 'Roblox',    icon: '🟥', proto: 'roblox://',                 web: 'https://www.roblox.com/home' },
  { name: 'Discord',   icon: '💬', proto: 'discord://',                web: 'https://discord.com/app' },
  { name: 'Steam',     icon: '🎮', proto: 'steam://open/main',         web: 'https://store.steampowered.com' },
  { name: 'Spotify',   icon: '🎵', proto: 'spotify://',                web: 'https://open.spotify.com' },
  { name: 'Epic',      icon: '⚫', proto: 'com.epicgames.launcher://', web: 'https://store.epicgames.com' },
  { name: 'Minecraft', icon: '🟩', proto: 'minecraft://',              web: 'https://www.minecraft.net' },
  { name: 'Twitch',    icon: '🟣', proto: 'twitch://',                 web: 'https://www.twitch.tv' },
  { name: 'VS Code',   icon: '🔵', proto: 'vscode://',                 web: 'https://vscode.dev' },
  { name: 'YouTube',   icon: '▶️', proto: '',                          web: 'https://www.youtube.com' }
];

/* ---------- Onglets ---------- */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('is-active', t === tab));
    document.querySelectorAll('.panel').forEach(p =>
      p.classList.toggle('is-active', p.id === 'panel-' + tab.dataset.tab));
    if (tab.dataset.tab !== 'games') Game.pause();
  });
});

/* ============================================================
   1. LANCEUR D'APPLICATIONS
   ============================================================ */

const grid = document.getElementById('app-grid');
let apps = [];

function loadApps() {
  chrome.storage.local.get({ apps: DEFAULT_APPS }, res => {
    apps = res.apps;
    renderApps();
  });
}

function saveApps() {
  chrome.storage.local.set({ apps });
  renderApps();
}

function renderApps() {
  grid.innerHTML = '';
  apps.forEach((app, i) => {
    const btn = document.createElement('button');
    btn.className = 'app';
    btn.title = app.proto
      ? 'Clic : ouvrir l’app  •  Clic droit : ' + app.web
      : 'Ouvrir ' + app.web;

    const emoji = document.createElement('span');
    emoji.className = 'emoji';
    emoji.textContent = app.icon || '📦';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = app.name;
    btn.append(emoji, name);

    btn.addEventListener('click', () => launch(app, btn));
    btn.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (app.web) chrome.tabs.create({ url: app.web });
    });

    const kill = document.createElement('button');
    kill.className = 'kill';
    kill.textContent = '×';
    kill.title = 'Retirer';
    kill.addEventListener('click', e => {
      e.stopPropagation();
      apps.splice(i, 1);
      saveApps();
    });
    btn.appendChild(kill);
    grid.appendChild(btn);
  });
}

/* Lance un protocole systeme via une iframe cachee : Chrome affiche
   la boite de dialogue "Ouvrir <App> ?" sans quitter le popup.       */
function launch(app, btn) {
  if (!app.proto) {
    if (app.web) chrome.tabs.create({ url: app.web });
    return;
  }
  const frame = document.createElement('iframe');
  frame.style.display = 'none';
  frame.src = app.proto;
  document.body.appendChild(frame);
  setTimeout(() => frame.remove(), 2000);

  btn.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(.88)' }, { transform: 'scale(1)' }],
    { duration: 220 }
  );
}

document.getElementById('add-app').addEventListener('click', () => {
  const name  = document.getElementById('new-name').value.trim();
  const icon  = document.getElementById('new-icon').value.trim() || '📦';
  const proto = document.getElementById('new-proto').value.trim();
  const web   = document.getElementById('new-web').value.trim();
  if (!name || (!proto && !web)) return;
  apps.push({ name, icon, proto, web });
  saveApps();
  ['new-name', 'new-icon', 'new-proto', 'new-web'].forEach(id => {
    document.getElementById(id).value = '';
  });
});

document.getElementById('reset-apps').addEventListener('click', () => {
  apps = DEFAULT_APPS.slice();
  saveApps();
});

loadApps();

/* ============================================================
   2. MINI-JEUX
   ============================================================ */

const canvas   = document.getElementById('canvas');
const ctx      = canvas.getContext('2d');
const scoreEl  = document.getElementById('score');
const bestEl   = document.getElementById('best');
const overlay  = document.getElementById('overlay');
const oText    = document.getElementById('overlay-text');
const oBtn     = document.getElementById('overlay-btn');
const controls = document.getElementById('controls');

const W = canvas.width, H = canvas.height;

const TITLES = {
  snake: 'Snake', breakout: 'Casse-brique', flappy: 'Flappy',
  g2048: '2048', memory: 'Paires', simon: 'Simon'
};

const HELP = {
  snake:    'Fleches ou WASD pour diriger le serpent.',
  breakout: 'Souris ou fleches pour deplacer la raquette.',
  flappy:   'Espace ou clic pour battre des ailes.',
  g2048:    'Fleches pour glisser les tuiles. Objectif : 2048.',
  memory:   'Clique deux cartes pour retrouver les paires.',
  simon:    'Regarde la sequence, puis reproduis-la en cliquant.'
};

const NO_BEST = { snake: 0, breakout: 0, flappy: 0, g2048: 0, memory: 0, simon: 0 };

/* petit utilitaire : rectangle arrondi */
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}
function clearBg(color) {
  ctx.fillStyle = color || '#0c0d13';
  ctx.fillRect(0, 0, W, H);
}

const Game = {
  current: 'snake',
  running: false,
  raf: null,
  score: 0,
  best: Object.assign({}, NO_BEST),

  select(name) {
    this.stop();
    this.current = name;
    document.querySelectorAll('.chip').forEach(c =>
      c.classList.toggle('is-active', c.dataset.game === name));
    controls.textContent = HELP[name];
    bestEl.textContent = this.best[name] || 0;
    this.score = 0;
    scoreEl.textContent = 0;
    Engines[name].init();
    Engines[name].draw();
    this.showOverlay(TITLES[name], 'Jouer');
  },

  setScore(n) {
    this.score = n;
    scoreEl.textContent = Math.round(n);
    if (n > (this.best[this.current] || 0)) {
      this.best[this.current] = Math.round(n);
      bestEl.textContent = Math.round(n);
      chrome.storage.local.set({ best: this.best });
    }
  },

  start() {
    this.stop();
    Engines[this.current].init();
    this.setScore(0);
    this.running = true;
    overlay.classList.add('hidden');
    let last = performance.now();
    const loop = t => {
      if (!this.running) return;
      const dt = Math.min(t - last, 100);
      last = t;
      Engines[this.current].update(dt);
      Engines[this.current].draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  },

  stop()  { this.running = false; cancelAnimationFrame(this.raf); },
  pause() { this.stop(); },

  over(msg) {
    this.stop();
    Engines[this.current].draw();
    this.showOverlay(msg + ' Score : ' + Math.round(this.score), 'Rejouer');
  },

  showOverlay(text, label) {
    oText.textContent = text;
    oBtn.textContent = label;
    overlay.classList.remove('hidden');
  }
};

/* ============================================================
   Snake
   ============================================================ */
const CELL = 16, COLS = W / CELL, ROWS = H / CELL;

const Snake = {
  body: [], dir: { x: 1, y: 0 }, next: { x: 1, y: 0 }, food: null, acc: 0, step: 130,

  init() {
    this.body = [{ x: 5, y: 8 }, { x: 4, y: 8 }, { x: 3, y: 8 }];
    this.dir  = { x: 1, y: 0 };
    this.next = { x: 1, y: 0 };
    this.step = 130;
    this.acc  = 0;
    this.placeFood();
  },

  placeFood() {
    do {
      this.food = { x: (Math.random() * COLS) | 0, y: (Math.random() * ROWS) | 0 };
    } while (this.body.some(s => s.x === this.food.x && s.y === this.food.y));
  },

  update(dt) {
    this.acc += dt;
    if (this.acc < this.step) return;
    this.acc = 0;
    this.dir = this.next;

    const head = { x: this.body[0].x + this.dir.x, y: this.body[0].y + this.dir.y };
    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS ||
        this.body.some(s => s.x === head.x && s.y === head.y)) {
      Game.over('Perdu !');
      return;
    }
    this.body.unshift(head);

    if (head.x === this.food.x && head.y === this.food.y) {
      Game.setScore(Game.score + 10);
      this.step = Math.max(60, this.step - 3);
      this.placeFood();
    } else {
      this.body.pop();
    }
  },

  draw() {
    clearBg();
    ctx.strokeStyle = 'rgba(255,255,255,.03)';
    for (let i = 1; i < COLS; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL); ctx.stroke();
    }
    if (this.food) {
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(this.food.x * CELL + CELL / 2, this.food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
    }
    this.body.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? '#00d2a0' : 'hsl(165 60% ' + (45 - Math.min(i, 20)) + '%)';
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
  },

  key(k) {
    const map = {
      ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0]
    };
    const v = map[k] || map[String(k).toLowerCase()];
    if (!v) return;
    if (v[0] === -this.dir.x && v[1] === -this.dir.y) return;
    this.next = { x: v[0], y: v[1] };
  }
};

/* ============================================================
   Casse-brique
   ============================================================ */
const Breakout = {
  pad: { x: W / 2 - 30, w: 60, h: 8, speed: 0 },
  ball: { x: W / 2, y: H - 40, vx: 0.18, vy: -0.24, r: 5 },
  bricks: [],

  init() {
    this.pad = { x: W / 2 - 30, w: 60, h: 8, speed: 0 };
    this.ball = { x: W / 2, y: H - 40, vx: 0.18, vy: -0.24, r: 5 };
    this.bricks = [];
    const cols = 8, rows = 5, bw = W / cols, bh = 14;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.bricks.push({ x: c * bw, y: 30 + r * bh, w: bw - 3, h: bh - 3, hue: 260 - r * 28 });
      }
    }
  },

  update(dt) {
    const b = this.ball;
    this.pad.x = Math.max(0, Math.min(W - this.pad.w, this.pad.x + this.pad.speed * dt));

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.x < b.r || b.x > W - b.r) { b.vx *= -1; b.x = Math.max(b.r, Math.min(W - b.r, b.x)); }
    if (b.y < b.r) { b.vy *= -1; b.y = b.r; }
    if (b.y > H) { Game.over('Balle perdue !'); return; }

    const py = H - 18;
    if (b.y + b.r > py && b.y < py + this.pad.h && b.x > this.pad.x && b.x < this.pad.x + this.pad.w) {
      const hit = (b.x - (this.pad.x + this.pad.w / 2)) / (this.pad.w / 2);
      const sp  = Math.hypot(b.vx, b.vy) * 1.02;
      b.vx = sp * hit * 0.8;
      b.vy = -Math.abs(sp * (1 - Math.abs(hit) * 0.4));
      b.y  = py - b.r;
    }

    for (let i = 0; i < this.bricks.length; i++) {
      const k = this.bricks[i];
      if (b.x > k.x && b.x < k.x + k.w && b.y - b.r < k.y + k.h && b.y + b.r > k.y) {
        this.bricks.splice(i, 1);
        b.vy *= -1;
        Game.setScore(Game.score + 5);
        break;
      }
    }
    if (!this.bricks.length) Game.over('Gagne ! 🎉');
  },

  draw() {
    clearBg();
    this.bricks.forEach(k => {
      ctx.fillStyle = 'hsl(' + k.hue + ' 70% 60%)';
      ctx.fillRect(k.x + 1, k.y, k.w, k.h);
    });
    ctx.fillStyle = '#e8e9f0';
    ctx.fillRect(this.pad.x, H - 18, this.pad.w, this.pad.h);
    ctx.fillStyle = '#00d2a0';
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
    ctx.fill();
  },

  key(k, down) {
    if (k === 'ArrowLeft'  || k === 'a') this.pad.speed = down ? -0.5 : 0;
    if (k === 'ArrowRight' || k === 'd') this.pad.speed = down ?  0.5 : 0;
  }
};

/* ============================================================
   Flappy
   ============================================================ */
const BIRD_X = 74, PIPE_W = 42;

const Flappy = {
  y: H / 2, vy: 0, pipes: [], spawnIn: 500, ground: 0,

  init() {
    this.y = H / 2;
    this.vy = 0;
    this.pipes = [];
    this.spawnIn = 500;
    this.ground = 0;
  },

  flap() { this.vy = -0.42; },

  update(dt) {
    this.ground = (this.ground + 0.13 * dt) % 20;
    this.vy += 0.0017 * dt;
    this.y += this.vy * dt;

    if (this.y < 10 || this.y > H - 18) { Game.over('Perdu !'); return; }

    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.spawnIn = 1450;
      const gap = 96;
      this.pipes.push({ x: W, gy: 40 + Math.random() * (H - 100 - gap), gap, passed: false });
    }

    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const p = this.pipes[i];
      p.x -= 0.13 * dt;

      if (!p.passed && p.x + PIPE_W < BIRD_X) {
        p.passed = true;
        Game.setScore(Game.score + 1);
      }
      const inX = BIRD_X + 9 > p.x && BIRD_X - 9 < p.x + PIPE_W;
      if (inX && (this.y - 9 < p.gy || this.y + 9 > p.gy + p.gap)) { Game.over('Perdu !'); return; }

      if (p.x < -PIPE_W) this.pipes.splice(i, 1);
    }
  },

  draw() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#132033');
    sky.addColorStop(1, '#1d3350');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    this.pipes.forEach(p => {
      ctx.fillStyle = '#00d2a0';
      rr(p.x, 0, PIPE_W, p.gy, 4); ctx.fill();
      rr(p.x, p.gy + p.gap, PIPE_W, H - p.gy - p.gap, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.14)';
      ctx.fillRect(p.x + 5, 0, 6, p.gy);
      ctx.fillRect(p.x + 5, p.gy + p.gap, 6, H - p.gy - p.gap);
    });

    /* sol raye qui defile */
    ctx.fillStyle = '#0f1a28';
    ctx.fillRect(0, H - 10, W, 10);
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    for (let x = -this.ground; x < W; x += 20) ctx.fillRect(x, H - 10, 10, 10);

    /* l'oiseau */
    ctx.save();
    ctx.translate(BIRD_X, this.y);
    ctx.rotate(Math.max(-0.5, Math.min(1, this.vy * 1.6)));
    ctx.fillStyle = '#ffc857';
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff9f45';
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(15, 3); ctx.lineTo(7, 5); ctx.fill();
    ctx.fillStyle = '#12131a';
    ctx.beginPath(); ctx.arc(3.5, -3, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  key(k, down) {
    if (down && (k === ' ' || k === 'ArrowUp' || k === 'w')) this.flap();
  },

  click() { this.flap(); }
};

/* ============================================================
   2048
   ============================================================ */
const TILE_COLORS = {
  0: '#191c26', 2: '#2b3040', 4: '#39415c', 8: '#4b5a86',
  16: '#5c6fae', 32: '#7080d4', 64: '#8f6fd4', 128: '#ac6fc6',
  256: '#c66fa8', 512: '#d1708a', 1024: '#d98d6f', 2048: '#00d2a0'
};

const G2048 = {
  grid: [],

  init() {
    this.grid = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    this.add();
    this.add();
  },

  add() {
    const free = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!this.grid[r][c]) free.push([r, c]);
    if (!free.length) return;
    const [r, c] = free[(Math.random() * free.length) | 0];
    this.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  },

  slide(line) {
    const a = line.filter(v => v);
    const out = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i] === a[i + 1]) {
        out.push(a[i] * 2);
        Game.setScore(Game.score + a[i] * 2);
        i++;
      } else out.push(a[i]);
    }
    while (out.length < 4) out.push(0);
    return out;
  },

  move(dir) {
    const g = this.grid;
    let moved = false;

    for (let i = 0; i < 4; i++) {
      let line;
      if (dir === 'left')  line = [g[i][0], g[i][1], g[i][2], g[i][3]];
      if (dir === 'right') line = [g[i][3], g[i][2], g[i][1], g[i][0]];
      if (dir === 'up')    line = [g[0][i], g[1][i], g[2][i], g[3][i]];
      if (dir === 'down')  line = [g[3][i], g[2][i], g[1][i], g[0][i]];

      const res = this.slide(line);
      for (let k = 0; k < 4; k++) {
        if (res[k] !== line[k]) moved = true;
        if (dir === 'left')  g[i][k] = res[k];
        if (dir === 'right') g[i][3 - k] = res[k];
        if (dir === 'up')    g[k][i] = res[k];
        if (dir === 'down')  g[3 - k][i] = res[k];
      }
    }

    if (!moved) return;
    this.add();

    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      if (g[r][c] === 2048) { Game.over('2048 ! 🎉'); return; }
    }
    if (this.stuck()) Game.over('Bloque !');
  },

  stuck() {
    const g = this.grid;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      if (!g[r][c]) return false;
      if (c < 3 && g[r][c] === g[r][c + 1]) return false;
      if (r < 3 && g[r][c] === g[r + 1][c]) return false;
    }
    return true;
  },

  update() {},

  draw() {
    clearBg('#12141c');
    const pad = 8, cell = (W - pad * 5) / 4;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const v = this.grid[r][c];
        const x = pad + c * (cell + pad), y = pad + r * (cell + pad);

        ctx.fillStyle = TILE_COLORS[v] || '#00d2a0';
        rr(x, y, cell, cell, 8);
        ctx.fill();

        if (v) {
          ctx.fillStyle = v <= 4 ? '#c8cde0' : '#ffffff';
          ctx.font = '700 ' + (v > 999 ? 22 : v > 99 ? 27 : 31) + 'px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(v, x + cell / 2, y + cell / 2 + 1);
        }
      }
    }
  },

  key(k, down) {
    if (!down) return;
    const map = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      a: 'left', d: 'right', w: 'up', s: 'down'
    };
    const dir = map[k] || map[String(k).toLowerCase()];
    if (dir) this.move(dir);
  }
};

/* ============================================================
   Paires (memory)
   ============================================================ */
const PAIRS = ['🍎', '🚀', '🐱', '⚽', '🎸', '🌟', '🍕', '🎲'];

const Memory = {
  cards: [], first: null, lock: 0, moves: 0, found: 0,

  init() {
    const deck = PAIRS.concat(PAIRS);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
    this.cards = deck.map(e => ({ e, up: false, done: false }));
    this.first = null;
    this.lock = 0;
    this.moves = 0;
    this.found = 0;
  },

  update(dt) {
    if (this.lock <= 0) return;
    this.lock -= dt;
    if (this.lock <= 0) {
      this.cards.forEach(c => { if (!c.done) c.up = false; });
      this.first = null;
    }
  },

  geom() {
    const pad = 9;
    const cell = (W - pad * 5) / 4;
    return { pad, cell };
  },

  draw() {
    clearBg('#12141c');
    const { pad, cell } = this.geom();

    this.cards.forEach((c, i) => {
      const x = pad + (i % 4) * (cell + pad);
      const y = pad + ((i / 4) | 0) * (cell + pad);

      if (c.done) {
        ctx.fillStyle = 'rgba(0,210,160,.16)';
        rr(x, y, cell, cell, 9); ctx.fill();
      } else if (c.up) {
        ctx.fillStyle = '#262938';
        rr(x, y, cell, cell, 9); ctx.fill();
      } else {
        ctx.fillStyle = '#6c5ce7';
        rr(x, y, cell, cell, 9); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.16)';
        ctx.font = '700 22px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', x + cell / 2, y + cell / 2 + 1);
      }

      if (c.up || c.done) {
        ctx.font = '34px "Segoe UI Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = c.done ? 0.55 : 1;
        ctx.fillText(c.e, x + cell / 2, y + cell / 2 + 2);
        ctx.globalAlpha = 1;
      }
    });

    ctx.fillStyle = '#8b90a8';
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Coups : ' + this.moves, 10, H - 8);
  },

  click(x, y) {
    if (this.lock > 0) return;
    const { pad, cell } = this.geom();
    const c = Math.floor((x - pad) / (cell + pad));
    const r = Math.floor((y - pad) / (cell + pad));
    if (c < 0 || c > 3 || r < 0 || r > 3) return;

    const card = this.cards[r * 4 + c];
    if (!card || card.up || card.done) return;
    card.up = true;

    if (!this.first) { this.first = card; return; }

    this.moves++;
    if (this.first.e === card.e) {
      this.first.done = true;
      card.done = true;
      this.found++;
      this.first = null;
      Game.setScore(Game.score + 25);

      if (this.found === 8) {
        Game.setScore(Game.score + Math.max(0, 200 - this.moves * 8));
        Game.over('Trouve ! 🎉');
      }
    } else {
      this.lock = 750;
    }
  }
};

/* ============================================================
   Simon
   ============================================================ */
const QUADS = [
  { x: 0,     y: 0,     c: '#00d2a0' },
  { x: W / 2, y: 0,     c: '#ff6b6b' },
  { x: 0,     y: H / 2, c: '#4da3ff' },
  { x: W / 2, y: H / 2, c: '#ffc857' }
];

const Simon = {
  seq: [], step: 0, showing: true, showIdx: 0, t: 0, lit: -1, flash: 0, pending: 0,

  init() {
    this.seq = [];
    this.nextRound();
  },

  nextRound() {
    this.seq.push((Math.random() * 4) | 0);
    this.showing = true;
    this.showIdx = 0;
    this.step = 0;
    this.lit = -1;
    this.t = 500;
    this.pending = 0;
  },

  update(dt) {
    if (this.pending > 0) {
      this.pending -= dt;
      if (this.pending <= 0) this.nextRound();
      return;
    }

    if (this.showing) {
      this.t -= dt;
      if (this.t > 0) return;
      if (this.lit >= 0) {
        this.lit = -1;
        this.t = 170;
        if (this.showIdx >= this.seq.length) this.showing = false;
      } else if (this.showIdx < this.seq.length) {
        this.lit = this.seq[this.showIdx++];
        this.t = 420;
      } else {
        this.showing = false;
      }
      return;
    }

    if (this.flash > 0) {
      this.flash -= dt;
      if (this.flash <= 0) this.lit = -1;
    }
  },

  draw() {
    clearBg('#0c0d13');
    QUADS.forEach((q, i) => {
      ctx.globalAlpha = this.lit === i ? 1 : 0.34;
      ctx.fillStyle = q.c;
      rr(q.x + 6, q.y + 6, W / 2 - 12, H / 2 - 12, 12);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#12131a';
    ctx.beginPath(); ctx.arc(W / 2, H / 2, 32, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = this.showing ? '#ffc857' : '#00d2a0';
    ctx.font = '700 13px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.showing ? 'Regarde' : 'A toi', W / 2, H / 2 - 7);
    ctx.fillStyle = '#8b90a8';
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillText('Tour ' + this.seq.length, W / 2, H / 2 + 10);
  },

  click(x, y) {
    if (this.showing || this.pending > 0) return;
    const q = (x > W / 2 ? 1 : 0) + (y > H / 2 ? 2 : 0);
    this.lit = q;
    this.flash = 220;

    if (this.seq[this.step] !== q) { Game.over('Rate !'); return; }

    this.step++;
    if (this.step === this.seq.length) {
      Game.setScore(Game.score + 10);
      this.pending = 750;
    }
  }
};

const Engines = {
  snake: Snake, breakout: Breakout, flappy: Flappy,
  g2048: G2048, memory: Memory, simon: Simon
};

/* ============================================================
   Entrees
   ============================================================ */
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;

  if (e.key === ' ' && !Game.running) {
    e.preventDefault();
    Game.start();
    return;
  }
  if (!Game.running) return;

  const eng = Engines[Game.current];
  if (eng.key) eng.key(e.key, true);
  if (e.key.indexOf('Arrow') === 0 || e.key === ' ') e.preventDefault();
});

document.addEventListener('keyup', e => {
  if (!Game.running) return;
  const eng = Engines[Game.current];
  if (eng.key) eng.key(e.key, false);
});

canvas.addEventListener('mousemove', e => {
  if (Game.current !== 'breakout' || !Game.running) return;
  const r = canvas.getBoundingClientRect();
  Breakout.pad.x = Math.max(0, Math.min(W - Breakout.pad.w, e.clientX - r.left - Breakout.pad.w / 2));
});

canvas.addEventListener('mousedown', e => {
  if (!Game.running) return;
  const eng = Engines[Game.current];
  if (!eng.click) return;
  const r = canvas.getBoundingClientRect();
  eng.click(e.clientX - r.left, e.clientY - r.top);
});

oBtn.addEventListener('click', () => Game.start());

document.querySelectorAll('.chip').forEach(c =>
  c.addEventListener('click', () => Game.select(c.dataset.game)));

chrome.storage.local.get({ best: NO_BEST }, res => {
  Game.best = Object.assign({}, NO_BEST, res.best);
  Game.select('snake');
});
