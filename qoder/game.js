'use strict';
/* Counter-Strike 1.6 Web - 纯前端射线投射FPS */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
const COLW = 2, NUMRAYS = W / COLW;
const FOV = Math.PI / 3;
const PLANE = Math.tan(FOV / 2);

/* ---------------- 地图 ---------------- */
const MAPSRC = [
"##########################",
"#P.......#....#..T.....T.#",
"#........#....#..........#",
"#..BB....#.B..#....BB....#",
"#..BB.........#..........#",
"#........#....D....##....#",
"####.#####....#....##....#",
"#........#.DD.#..........#",
"#..B.....#....#.....B..T.#",
"#........D....#..........#",
"#....#####....######.#####",
"#....#...................#",
"#.BB.#...BB....BB....B...#",
"#....#...BB....BB........#",
"#....D...................#",
"#....#........##.....DD..#",
"#....#........##.........#",
"#....######.######...#####",
"#..........T.........#..T#",
"#....B...........B...#...#",
"#####....#####........D..#",
"#T.......#...#........#..#",
"#........#.B.#..BB....#..#",
"#...T....D...#..BB....#.T#",
"#........#...#........#..#",
"##########################",
];
const MH = MAPSRC.length;
const MW = Math.max(...MAPSRC.map(r => r.length));
const map = [];
let spawnX = 2.5, spawnY = 2.5;
const tSpawns = [];
for (let y = 0; y < MH; y++) {
  const row = MAPSRC[y].padEnd(MW, '#');
  const arr = [];
  for (let x = 0; x < MW; x++) {
    let c = row[x];
    if (c === 'P') { spawnX = x + 0.5; spawnY = y + 0.5; c = '.'; }
    if (c === 'T') { tSpawns.push([x + 0.5, y + 0.5]); c = '.'; }
    arr.push(c);
  }
  map.push(arr);
}
function solid(x, y) {
  if (x < 0 || y < 0 || x >= MW || y >= MH) return '#';
  const c = map[y | 0][x | 0];
  return (c === '#' || c === 'B' || c === 'D') ? c : null;
}

/* ---------------- 纹理 ---------------- */
function makeTex(fn) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  fn(c.getContext('2d'));
  return c;
}
const texWall = makeTex(g => { // dust 沙墙
  g.fillStyle = '#c9b184'; g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 500; i++) {
    g.fillStyle = 'rgba(0,0,0,' + Math.random() * 0.08 + ')';
    g.fillRect(Math.random() * 64 | 0, Math.random() * 64 | 0, 2, 2);
  }
  g.fillStyle = 'rgba(120,95,60,0.55)';
  for (let y = 15; y < 64; y += 16) g.fillRect(0, y, 64, 2);
  g.fillRect(20, 0, 2, 16); g.fillRect(44, 17, 2, 16); g.fillRect(12, 33, 2, 16); g.fillRect(50, 49, 2, 16);
  g.fillStyle = 'rgba(255,240,200,0.25)'; g.fillRect(0, 0, 64, 3);
});
const texCrate = makeTex(g => { // 木箱
  g.fillStyle = '#8a6a3c'; g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 300; i++) {
    g.fillStyle = 'rgba(60,40,10,' + Math.random() * 0.15 + ')';
    g.fillRect(Math.random() * 64 | 0, Math.random() * 64 | 0, 3, 1);
  }
  g.strokeStyle = '#5b4020'; g.lineWidth = 4; g.strokeRect(2, 2, 60, 60);
  g.beginPath(); g.moveTo(4, 4); g.lineTo(60, 60); g.moveTo(60, 4); g.lineTo(4, 60); g.stroke();
});
const texDark = makeTex(g => { // 石砖
  g.fillStyle = '#7d7466'; g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = 'rgba(0,0,0,' + Math.random() * 0.12 + ')';
    g.fillRect(Math.random() * 64 | 0, Math.random() * 64 | 0, 2, 2);
  }
  g.fillStyle = 'rgba(30,28,24,0.7)';
  for (let y = 0; y < 64; y += 16) g.fillRect(0, y, 64, 2);
  for (let y = 0; y < 64; y += 32) { g.fillRect(16, y, 2, 16); g.fillRect(48, y + 16, 2, 16); }
});
function texFor(tile) { return tile === 'B' ? texCrate : tile === 'D' ? texDark : texWall; }

/* 敌人贴图(恐怖分子) */
const enemyImg = (() => {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#5a5f3f'; g.fillRect(22, 86, 8, 36); g.fillRect(34, 86, 8, 36);
  g.fillStyle = '#222'; g.fillRect(20, 118, 12, 10); g.fillRect(33, 118, 12, 10);
  g.fillStyle = '#7a7f55'; g.fillRect(18, 50, 28, 38);
  g.fillStyle = '#3b3f2a'; g.fillRect(22, 52, 20, 28);
  g.fillStyle = '#7a7f55'; g.fillRect(11, 52, 7, 26); g.fillRect(46, 52, 7, 26);
  g.fillStyle = '#c69c6d'; g.fillRect(11, 78, 7, 7); g.fillRect(46, 78, 7, 7);
  g.fillStyle = '#c69c6d'; g.fillRect(24, 26, 16, 20);
  g.fillStyle = '#3a3a3a'; g.fillRect(24, 20, 16, 12);
  g.fillStyle = '#111'; g.fillRect(27, 36, 3, 3); g.fillRect(34, 36, 3, 3);
  g.fillStyle = '#222'; g.fillRect(6, 66, 50, 6);
  g.fillStyle = '#5b3d1e'; g.fillRect(40, 63, 12, 11);
  return c;
})();
const corpseImg = (() => {
  const c = document.createElement('canvas'); c.width = 64; c.height = 24;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(120,10,10,0.8)';
  g.beginPath(); g.ellipse(32, 16, 30, 7, 0, 0, 7); g.fill();
  g.fillStyle = '#5a5f3f'; g.fillRect(8, 8, 34, 8);
  g.fillStyle = '#3b3f2a'; g.fillRect(24, 7, 18, 10);
  g.fillStyle = '#c69c6d'; g.fillRect(44, 6, 10, 10);
  return c;
})();

/* ---------------- 音效 ---------------- */
let AC = null;
function audio() {
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function noiseShot(vol, freq, dur) {
  try {
    const ac = audio();
    const buf = ac.createBuffer(1, ac.sampleRate * dur | 0, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = ac.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(ac.destination);
    src.start();
  } catch (e) {}
}
function tone(freq, dur, vol, type, slide) {
  try {
    const ac = audio(), t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + dur);
  } catch (e) {}
}
const sfx = {
  shot: () => noiseShot(0.35, 3200, 0.14),
  shotFar: d => noiseShot(Math.max(0.03, 0.22 - d * 0.012), 1200, 0.16),
  hit: () => tone(700, 0.06, 0.12, 'square', 500),
  death: () => tone(220, 0.3, 0.15, 'sawtooth', 60),
  click: () => tone(1400, 0.04, 0.08, 'square'),
  reload: () => { tone(900, 0.05, 0.1, 'square'); setTimeout(() => tone(600, 0.05, 0.1, 'square'), 140); },
  swing: () => noiseShot(0.1, 900, 0.1),
  hurt: () => tone(140, 0.18, 0.2, 'sawtooth', 80),
  buy: () => { tone(880, 0.07, 0.1, 'sine'); setTimeout(() => tone(1320, 0.09, 0.1, 'sine'), 80); },
  begin: () => { tone(660, 0.1, 0.12, 'sine'); setTimeout(() => tone(990, 0.15, 0.12, 'sine'), 120); },
};

/* ---------------- 玩家 / 武器 ---------------- */
const WEAPONS = {
  knife: { label: '军刀', dmg: 55, rof: 0.5, spread: 0, auto: false, melee: true, range: 1.8 },
  usp:   { label: 'USP', dmg: 30, rof: 0.25, mag: 12, maxReserve: 100, spread: 0.02, auto: false },
  ak:    { label: 'AK-47', dmg: 36, rof: 0.1, mag: 30, maxReserve: 90, spread: 0.032, auto: true },
};
const player = { x: spawnX, y: spawnY, ang: 0, pitch: 0, hp: 100, armor: 0, money: 800 };
let inv = null, curW = 'usp';

/* ---------------- 游戏状态 ---------------- */
let state = 'menu'; // menu | play | roundend
let paused = false, buyOpen = false;
let round = 1, scoreCT = 0, scoreT = 0, kills = 0;
let roundTime = 0, buyT = 0, roundEndT = 0, roundMsg = '', roundMsgColor = '#fff';
let enemies = [], feed = [];
let fireCd = 0, reloading = 0, recoil = 0, muzzle = 0, dmgFlash = 0, hitMark = 0;
let bobT = 0, moveAmt = 0, now = 0;
const keys = {};
let mouseDown = false;

function addFeed(text, color) {
  feed.push({ text, color: color || '#ddd', t: now });
  if (feed.length > 6) feed.shift();
}
function resetInv() {
  inv = { knife: {}, usp: { mag: 12, reserve: 100 } };
  curW = 'usp';
}
function startGame() {
  round = 1; scoreCT = 0; scoreT = 0; kills = 0;
  player.money = 800; player.armor = 0;
  resetInv();
  startRound();
}
function startRound() {
  player.x = spawnX; player.y = spawnY; player.ang = 0; player.pitch = 0;
  player.hp = 100;
  roundTime = 135; buyT = 15;
  fireCd = 0; reloading = 0; recoil = 0; buyOpen = false;
  for (const k in inv) {
    const w = WEAPONS[k];
    if (w.mag) { inv[k].mag = w.mag; }
  }
  const n = Math.min(4 + round, 10);
  enemies = [];
  for (let i = 0; i < n; i++) {
    const s = tSpawns[i % tSpawns.length];
    enemies.push({
      x: s[0] + (Math.random() - 0.5) * 0.5, y: s[1] + (Math.random() - 0.5) * 0.5,
      hp: 100, alive: true, deadT: 0, cd: 1 + Math.random() * 2,
      wdir: Math.random() * Math.PI * 2, wT: 0, flash: 0, hitT: -9, seen: false,
    });
  }
  state = 'play';
  addFeed('第 ' + round + ' 回合开始 — 歼灭所有恐怖分子!', '#8ff03c');
  sfx.begin();
}
function endRound(win, msg) {
  state = 'roundend'; roundEndT = 4;
  roundMsg = msg; roundMsgColor = win ? '#6db2ff' : '#ff5544';
  if (win) { scoreCT++; player.money = Math.min(16000, player.money + 1400); }
  else scoreT++;
}

/* ---------------- 射线 ---------------- */
function castRay(px, py, dx, dy) {
  let mapX = px | 0, mapY = py | 0;
  const ddx = Math.abs(1 / dx), ddy = Math.abs(1 / dy);
  let stepX, stepY, sdx, sdy;
  if (dx < 0) { stepX = -1; sdx = (px - mapX) * ddx; } else { stepX = 1; sdx = (mapX + 1 - px) * ddx; }
  if (dy < 0) { stepY = -1; sdy = (py - mapY) * ddy; } else { stepY = 1; sdy = (mapY + 1 - py) * ddy; }
  let side = 0, tile = '#';
  for (let i = 0; i < 80; i++) {
    if (sdx < sdy) { sdx += ddx; mapX += stepX; side = 0; }
    else { sdy += ddy; mapY += stepY; side = 1; }
    const c = solid(mapX, mapY);
    if (c) { tile = c; break; }
  }
  const dist = side === 0 ? sdx - ddx : sdy - ddy;
  let wallX = side === 0 ? py + dist * dy : px + dist * dx;
  wallX -= Math.floor(wallX);
  return { dist, side, tile, wallX };
}
function normAng(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
function hasLOS(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const d = Math.hypot(dx, dy);
  if (d < 0.001) return true;
  return castRay(x1, y1, dx / d, dy / d).dist > d;
}
function moveEntity(o, dx, dy) {
  const r = 0.22;
  const nx = o.x + dx;
  if (!solid(nx + r, o.y - r) && !solid(nx - r, o.y - r) && !solid(nx + r, o.y + r) && !solid(nx - r, o.y + r)) o.x = nx;
  const ny = o.y + dy;
  if (!solid(o.x + r, ny - r) && !solid(o.x - r, ny - r) && !solid(o.x + r, ny + r) && !solid(o.x - r, ny + r)) o.y = ny;
}

/* ---------------- 战斗 ---------------- */
function curState() { return inv[curW]; }
function startReload() {
  const w = WEAPONS[curW], st = curState();
  if (w.melee || reloading > 0 || !st || st.mag >= w.mag || st.reserve <= 0) return;
  reloading = curW === 'ak' ? 2.4 : 2.1;
  sfx.reload();
}
function tryFire() {
  if (state !== 'play' || paused || buyOpen || player.hp <= 0) return;
  if (fireCd > 0 || reloading > 0) return;
  const w = WEAPONS[curW], st = curState();
  if (w.melee) {
    fireCd = w.rof; muzzle = 0; sfx.swing();
    bobT += 0.5;
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      const da = Math.abs(normAng(Math.atan2(e.y - player.y, e.x - player.x) - player.ang));
      if (d < w.range && da < 0.6) { hitEnemy(e, w.dmg, d); break; }
    }
    return;
  }
  if (st.mag <= 0) { sfx.click(); startReload(); fireCd = 0.3; return; }
  st.mag--;
  fireCd = w.rof;
  muzzle = 0.06;
  recoil = Math.min(recoil + (curW === 'ak' ? 0.011 : 0.02), 0.09);
  sfx.shot();
  const spread = w.spread * (0.3 + recoil * 14) * (Math.random() * 2 - 1);
  const sa = player.ang + spread;
  const sdx = Math.cos(sa), sdy = Math.sin(sa);
  const wall = castRay(player.x, player.y, sdx, sdy);
  let best = null, bestD = 1e9;
  for (const e of enemies) {
    if (!e.alive) continue;
    const rx = e.x - player.x, ry = e.y - player.y;
    const d = Math.hypot(rx, ry);
    if (d < 0.2 || d > wall.dist + 0.3) continue;
    const da = Math.abs(normAng(Math.atan2(ry, rx) - sa));
    if (da < Math.atan2(0.3, d) && d < bestD) { best = e; bestD = d; }
  }
  if (best) hitEnemy(best, w.dmg, bestD);
}
function hitEnemy(e, dmg, d) {
  const hs = Math.random() < 0.22;
  e.hp -= dmg * (hs ? 2.5 : 1) * (1 - Math.min(0.35, d * 0.018));
  e.hitT = now; hitMark = 0.12;
  sfx.hit();
  if (e.hp <= 0) {
    e.alive = false; e.deadT = 0; kills++;
    player.money = Math.min(16000, player.money + 300);
    addFeed(hs ? '你 [爆头] 击杀了 恐怖分子  +$300' : '你 击杀了 恐怖分子  +$300', '#ffd24a');
    sfx.death();
    if (enemies.every(x => !x.alive)) endRound(true, '反恐精英获胜!');
  }
}
function damagePlayer(dmg) {
  if (player.hp <= 0 || state !== 'play') return;
  if (player.armor > 0) {
    const abs = Math.min(player.armor, dmg * 0.5);
    player.armor -= Math.ceil(abs);
    dmg -= abs;
  }
  player.hp -= Math.round(dmg);
  dmgFlash = 0.6;
  sfx.hurt();
  if (player.hp <= 0) {
    player.hp = 0;
    endRound(false, '你阵亡了 — 恐怖分子获胜');
  }
}

/* ---------------- 敌人 AI ---------------- */
function updateEnemy(e, dt) {
  if (!e.alive) { e.deadT += dt; return; }
  e.flash = Math.max(0, e.flash - dt);
  const rx = player.x - e.x, ry = player.y - e.y;
  const d = Math.hypot(rx, ry);
  const los = d < 16 && hasLOS(e.x, e.y, player.x, player.y) && player.hp > 0;
  if (los) {
    e.seen = true;
    const a = Math.atan2(ry, rx);
    if (d > 2.5) moveEntity(e, Math.cos(a) * 1.5 * dt, Math.sin(a) * 1.5 * dt);
    e.cd -= dt;
    if (e.cd <= 0 && d < 14) {
      e.cd = 0.7 + Math.random() * 0.9;
      e.flash = 0.08;
      sfx.shotFar(d);
      const chance = Math.max(0.12, 0.6 - d * 0.035);
      if (Math.random() < chance) damagePlayer(8 + Math.random() * 14);
    }
  } else {
    e.wT -= dt;
    if (e.wT <= 0) {
      e.wT = 1 + Math.random() * 2;
      e.wdir = e.seen ? Math.atan2(ry, rx) + (Math.random() - 0.5) : Math.random() * Math.PI * 2;
    }
    const ox = e.x, oy = e.y;
    moveEntity(e, Math.cos(e.wdir) * 1.1 * dt, Math.sin(e.wdir) * 1.1 * dt);
    if (Math.abs(e.x - ox) < 0.001 && Math.abs(e.y - oy) < 0.001) e.wT = 0;
  }
}

/* ---------------- 更新 ---------------- */
function update(dt) {
  if (state === 'roundend') {
    roundEndT -= dt;
    if (roundEndT <= 0) { round++; startRound(); }
  }
  if (state !== 'play' && state !== 'roundend') return;
  if (paused) return;

  if (state === 'play' && player.hp > 0) {
    roundTime -= dt; buyT = Math.max(0, buyT - dt);
    if (roundTime <= 0) { endRound(false, '时间到 — 恐怖分子获胜'); }
    if (buyOpen && buyT <= 0) buyOpen = false;

    let mx = 0, my = 0;
    if (keys.KeyW || keys.ArrowUp) mx += 1;
    if (keys.KeyS || keys.ArrowDown) mx -= 1;
    if (keys.KeyA || keys.ArrowLeft) my -= 1;
    if (keys.KeyD || keys.ArrowRight) my += 1;
    const len = Math.hypot(mx, my);
    if (len > 0) {
      const spd = (keys.ShiftLeft || keys.ShiftRight) ? 1.7 : 3.4;
      const c = Math.cos(player.ang), s = Math.sin(player.ang);
      moveEntity(player, (c * mx - s * my) / len * spd * dt, (s * mx + c * my) / len * spd * dt);
      moveAmt = Math.min(1, moveAmt + dt * 6);
      bobT += dt * ((keys.ShiftLeft || keys.ShiftRight) ? 5 : 9);
    } else moveAmt = Math.max(0, moveAmt - dt * 8);

    fireCd -= dt;
    recoil = Math.max(0, recoil - dt * 0.12);
    if (reloading > 0) {
      reloading -= dt;
      if (reloading <= 0) {
        reloading = 0;
        const w = WEAPONS[curW], st = curState();
        const take = Math.min(w.mag - st.mag, st.reserve);
        st.mag += take; st.reserve -= take;
      }
    }
    if (mouseDown && WEAPONS[curW].auto) tryFire();
    for (const e of enemies) updateEnemy(e, dt);
  }
  muzzle = Math.max(0, muzzle - dt);
  dmgFlash = Math.max(0, dmgFlash - dt * 1.5);
  hitMark = Math.max(0, hitMark - dt);
}

/* ---------------- 渲染 ---------------- */
const zbuf = new Float32Array(NUMRAYS);
function render() {
  const horizon = H / 2 + player.pitch;
  let grd = ctx.createLinearGradient(0, 0, 0, horizon);
  grd.addColorStop(0, '#7fa3c7'); grd.addColorStop(1, '#cfc4a2');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, Math.max(0, horizon));
  grd = ctx.createLinearGradient(0, horizon, 0, H);
  grd.addColorStop(0, '#4a4335'); grd.addColorStop(1, '#8d8168');
  ctx.fillStyle = grd; ctx.fillRect(0, Math.max(0, horizon), W, H);

  const dirX = Math.cos(player.ang), dirY = Math.sin(player.ang);
  const planeX = -dirY * PLANE, planeY = dirX * PLANE;
  for (let col = 0; col < NUMRAYS; col++) {
    const camX = 2 * col / NUMRAYS - 1;
    const r = castRay(player.x, player.y, dirX + planeX * camX, dirY + planeY * camX);
    zbuf[col] = r.dist;
    const lineH = H / r.dist;
    const y0 = horizon - lineH / 2;
    const tex = texFor(r.tile);
    const texX = Math.min(63, r.wallX * 64 | 0);
    ctx.drawImage(tex, texX, 0, 1, 64, col * COLW, y0, COLW, lineH);
    const sh = Math.min(0.75, r.dist / 16 + (r.side ? 0.18 : 0));
    if (sh > 0.02) {
      ctx.fillStyle = 'rgba(0,0,0,' + sh + ')';
      ctx.fillRect(col * COLW, y0, COLW, lineH);
    }
  }

  // 敌人精灵
  const order = enemies.map(e => ({ e, d: (e.x - player.x) ** 2 + (e.y - player.y) ** 2 }))
    .sort((a, b) => b.d - a.d);
  const invDet = 1 / (planeX * dirY - dirX * planeY);
  for (const { e } of order) {
    if (!e.alive && e.deadT > 6) continue;
    const rx = e.x - player.x, ry = e.y - player.y;
    const tx = invDet * (dirY * rx - dirX * ry);
    const ty = invDet * (-planeY * rx + planeX * ry);
    if (ty < 0.15) continue;
    const screenX = (W / 2) * (1 + tx / ty);
    const size = H / ty;
    if (e.alive) {
      const sh2 = size * 0.85, sw = sh2 * 0.5;
      const yB = horizon + size / 2, yT = yB - sh2;
      const x0 = screenX - sw / 2;
      for (let x = Math.max(0, x0 | 0); x < Math.min(W, x0 + sw); x += COLW) {
        const c = (x / COLW) | 0;
        if (zbuf[c] <= ty) continue;
        const sx = Math.min(63, Math.max(0, (x - x0) / sw * 64 | 0));
        ctx.drawImage(enemyImg, sx, 0, Math.max(1, 64 * COLW / sw), 128, x, yT, COLW, sh2);
      }
      if (now - e.hitT < 0.15) {
        ctx.fillStyle = 'rgba(200,20,20,0.6)';
        ctx.beginPath(); ctx.arc(screenX, yT + sh2 * 0.35, size * 0.05, 0, 7); ctx.fill();
      }
      if (e.flash > 0 && zbuf[Math.min(NUMRAYS - 1, Math.max(0, screenX / COLW | 0))] > ty) {
        ctx.fillStyle = 'rgba(255,230,120,0.9)';
        ctx.beginPath(); ctx.arc(screenX - sw * 0.35, yT + sh2 * 0.45, size * 0.03, 0, 7); ctx.fill();
      }
    } else {
      const cw = size * 0.8, chh = size * 0.22;
      const yB = horizon + size / 2;
      const x0 = screenX - cw / 2;
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, e.deadT - 4) / 2);
      for (let x = Math.max(0, x0 | 0); x < Math.min(W, x0 + cw); x += COLW) {
        const c = (x / COLW) | 0;
        if (zbuf[c] <= ty) continue;
        const sx = Math.min(63, Math.max(0, (x - x0) / cw * 64 | 0));
        ctx.drawImage(corpseImg, sx, 0, Math.max(1, 64 * COLW / cw), 24, x, yB - chh, COLW, chh);
      }
      ctx.globalAlpha = 1;
    }
  }

  if (state === 'play' || state === 'roundend') {
    drawWeapon();
    drawHUD();
  }
  if (dmgFlash > 0) {
    ctx.fillStyle = 'rgba(200,0,0,' + dmgFlash * 0.45 + ')';
    ctx.fillRect(0, 0, W, H);
  }
  if (buyOpen) drawBuyMenu();
  if (state === 'menu') drawMenu();
  if (state === 'roundend') {
    ctx.textAlign = 'center';
    ctx.font = 'bold 42px monospace';
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, H / 2 - 60, W, 120);
    ctx.fillStyle = roundMsgColor;
    ctx.fillText(roundMsg, W / 2, H / 2);
    ctx.font = '18px monospace'; ctx.fillStyle = '#ccc';
    ctx.fillText('下一回合 ' + Math.ceil(roundEndT) + ' 秒后开始...', W / 2, H / 2 + 36);
    ctx.textAlign = 'left';
  }
  if (paused && state === 'play') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('已暂停', W / 2, H / 2 - 10);
    ctx.font = '18px monospace';
    ctx.fillText('点击屏幕继续', W / 2, H / 2 + 28);
    ctx.textAlign = 'left';
  }
}

function drawWeapon() {
  const w = WEAPONS[curW];
  const bx = Math.sin(bobT) * 7 * moveAmt;
  const by = Math.abs(Math.cos(bobT)) * 6 * moveAmt + (muzzle > 0 ? 7 : 0) + (reloading > 0 ? 55 : 0);
  const cx = W / 2 + 55 + bx, base = H + by;
  ctx.save();
  if (curW === 'knife') {
    ctx.translate(cx + 60, base - 70); ctx.rotate(-0.5 + (fireCd > 0.3 ? -0.8 : 0));
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(-14, 20, 28, 70);
    ctx.fillStyle = '#b8bcc2';
    ctx.beginPath(); ctx.moveTo(-12, 20); ctx.lineTo(12, 20); ctx.lineTo(10, -75); ctx.lineTo(-14, -35); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8f949a'; ctx.fillRect(-4, -60, 4, 80);
  } else if (curW === 'usp') {
    const top = base - 165;
    ctx.fillStyle = '#111'; ctx.fillRect(cx - 9, top, 18, 24);
    ctx.fillStyle = '#3d3d40'; ctx.fillRect(cx - 13, top + 20, 26, 95);
    ctx.fillStyle = '#28282b'; ctx.fillRect(cx - 17, top + 75, 34, 55);
    ctx.fillStyle = '#333'; ctx.fillRect(cx - 22, top + 125, 44, 60);
    ctx.fillStyle = '#555'; ctx.fillRect(cx - 13, top + 30, 5, 70);
  } else {
    ctx.translate(cx + 15, base + 30); ctx.rotate(-0.14);
    ctx.fillStyle = '#2f2f2f'; ctx.fillRect(-7, -285, 14, 90);
    ctx.fillStyle = '#111'; ctx.fillRect(-5, -300, 10, 20);
    ctx.fillStyle = '#7a4a1e'; ctx.fillRect(-13, -205, 26, 65);
    ctx.fillStyle = '#5b3612'; ctx.fillRect(-13, -180, 26, 6);
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(-17, -140, 34, 85);
    ctx.save(); ctx.translate(-20, -95); ctx.rotate(0.35);
    ctx.fillStyle = '#6b4415'; ctx.fillRect(-13, 0, 26, 70);
    ctx.restore();
  }
  ctx.restore();
  if (muzzle > 0 && !w.melee) {
    const fy = curW === 'ak' ? H - 250 : H - 175;
    const g = ctx.createRadialGradient(cx - 5, fy, 2, cx - 5, fy, 42);
    g.addColorStop(0, 'rgba(255,255,200,0.95)');
    g.addColorStop(0.4, 'rgba(255,180,60,0.7)');
    g.addColorStop(1, 'rgba(255,120,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx - 5, fy, 42, 0, 7); ctx.fill();
  }
  // 准星
  const gap = 6 + recoil * 260 + moveAmt * 4;
  ctx.strokeStyle = 'rgba(80,255,80,0.9)'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - gap - 8, H / 2); ctx.lineTo(W / 2 - gap, H / 2);
  ctx.moveTo(W / 2 + gap, H / 2); ctx.lineTo(W / 2 + gap + 8, H / 2);
  ctx.moveTo(W / 2, H / 2 - gap - 8); ctx.lineTo(W / 2, H / 2 - gap);
  ctx.moveTo(W / 2, H / 2 + gap); ctx.lineTo(W / 2, H / 2 + gap + 8);
  ctx.stroke();
  if (hitMark > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.moveTo(W / 2 - 10, H / 2 - 10); ctx.lineTo(W / 2 - 4, H / 2 - 4);
    ctx.moveTo(W / 2 + 10, H / 2 - 10); ctx.lineTo(W / 2 + 4, H / 2 - 4);
    ctx.moveTo(W / 2 - 10, H / 2 + 10); ctx.lineTo(W / 2 - 4, H / 2 + 4);
    ctx.moveTo(W / 2 + 10, H / 2 + 10); ctx.lineTo(W / 2 + 4, H / 2 + 4);
    ctx.stroke();
  }
}

const GREEN = '#9ee65a';
function drawHUD() {
  const w = WEAPONS[curW], st = curState();
  ctx.font = 'bold 26px monospace';
  // 生命 / 护甲
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(10, H - 46, 250, 36);
  ctx.fillStyle = player.hp > 25 ? GREEN : '#ff5544';
  ctx.fillText('♥ ' + player.hp, 22, H - 19);
  ctx.fillStyle = GREEN;
  ctx.fillText('◘ ' + player.armor, 130, H - 19);
  // 金钱
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(10, H - 90, 130, 36);
  ctx.fillStyle = GREEN; ctx.fillText('$ ' + player.money, 22, H - 63);
  // 弹药
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(W - 250, H - 46, 240, 36);
  ctx.fillStyle = GREEN; ctx.textAlign = 'right';
  if (w.melee) ctx.fillText(w.label, W - 22, H - 19);
  else ctx.fillText(w.label + '  ' + (reloading > 0 ? '装填中...' : st.mag + ' / ' + st.reserve), W - 22, H - 19);
  ctx.textAlign = 'left';
  // 顶部: 时间 / 比分
  const t = Math.max(0, roundTime | 0);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(W / 2 - 110, 8, 220, 30);
  ctx.font = 'bold 20px monospace'; ctx.fillStyle = GREEN;
  ctx.fillText('CT ' + scoreCT + '   ' + ((t / 60) | 0) + ':' + String(t % 60).padStart(2, '0') + '   T ' + scoreT, W / 2, 30);
  if (buyT > 0 && state === 'play') {
    ctx.font = '15px monospace'; ctx.fillStyle = '#ffd24a';
    ctx.fillText('购买时间 ' + Math.ceil(buyT) + 's — 按 B 打开购买菜单', W / 2, 56);
  }
  ctx.textAlign = 'left';
  // 击杀信息
  ctx.font = '15px monospace';
  for (let i = 0; i < feed.length; i++) {
    const f = feed[i];
    const age = now - f.t;
    if (age > 5) continue;
    ctx.globalAlpha = Math.min(1, 5 - age);
    ctx.fillStyle = f.color;
    ctx.textAlign = 'right';
    ctx.fillText(f.text, W - 14, 60 + i * 20);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
  // 小地图
  const ms = 4, mx0 = 10, my0 = 10;
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = '#000'; ctx.fillRect(mx0 - 2, my0 - 2, MW * ms + 4, MH * ms + 4);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const c = map[y][x];
    if (c === '#') ctx.fillStyle = '#8a8a8a';
    else if (c === 'B') ctx.fillStyle = '#8a6a3c';
    else if (c === 'D') ctx.fillStyle = '#6a6258';
    else continue;
    ctx.fillRect(mx0 + x * ms, my0 + y * ms, ms, ms);
  }
  for (const e of enemies) {
    if (!e.alive || !e.seen) continue;
    ctx.fillStyle = '#ff4030';
    ctx.fillRect(mx0 + e.x * ms - 2, my0 + e.y * ms - 2, 4, 4);
  }
  ctx.fillStyle = '#40ff40';
  ctx.fillRect(mx0 + player.x * ms - 2, my0 + player.y * ms - 2, 4, 4);
  ctx.strokeStyle = '#40ff40'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(mx0 + player.x * ms, my0 + player.y * ms);
  ctx.lineTo(mx0 + (player.x + Math.cos(player.ang) * 2) * ms, my0 + (player.y + Math.sin(player.ang) * 2) * ms);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawBuyMenu() {
  ctx.fillStyle = 'rgba(10,20,10,0.85)';
  ctx.fillRect(W / 2 - 220, 110, 440, 260);
  ctx.strokeStyle = GREEN; ctx.lineWidth = 2;
  ctx.strokeRect(W / 2 - 220, 110, 440, 260);
  ctx.textAlign = 'center'; ctx.fillStyle = GREEN;
  ctx.font = 'bold 24px monospace';
  ctx.fillText('购 买 装 备', W / 2, 148);
  ctx.font = '19px monospace'; ctx.textAlign = 'left';
  const x = W / 2 - 190;
  ctx.fillStyle = inv.ak ? '#777' : '#fff';
  ctx.fillText('1.  AK-47 突击步枪' + (inv.ak ? ' (已拥有)' : ''), x, 195);
  ctx.fillStyle = '#fff';
  ctx.fillText('2.  防弹衣 (护甲 100)', x, 230);
  ctx.fillText('3.  补满弹药', x, 265);
  ctx.textAlign = 'right'; ctx.fillStyle = '#ffd24a';
  ctx.fillText('$2500', W / 2 + 190, 195);
  ctx.fillText('$650', W / 2 + 190, 230);
  ctx.fillText('$300', W / 2 + 190, 265);
  ctx.textAlign = 'center'; ctx.fillStyle = '#aaa'; ctx.font = '15px monospace';
  ctx.fillText('当前资金: $' + player.money + '    按 B 关闭', W / 2, 340);
  ctx.textAlign = 'left';
}

function drawMenu() {
  ctx.fillStyle = '#0b0f14'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 600);
  g.addColorStop(0, 'rgba(60,80,50,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d8d2b8'; ctx.font = 'bold 64px monospace';
  ctx.fillText('COUNTER-STRIKE', W / 2, 150);
  ctx.fillStyle = '#ff9f21'; ctx.font = 'bold 34px monospace';
  ctx.fillText('1.6 WEB', W / 2, 200);
  ctx.fillStyle = GREEN; ctx.font = 'bold 26px monospace';
  ctx.fillText('>> 点击屏幕开始游戏 <<', W / 2, 280);
  ctx.fillStyle = '#bbb'; ctx.font = '17px monospace';
  const lines = [
    'WASD 移动    鼠标 转向/射击    Shift 静步',
    'R 换弹    B 购买菜单    1/2/3 切换 步枪/手枪/军刀',
    '任务: 歼灭全部恐怖分子 | 击杀 +$300, 胜利 +$1400',
  ];
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 340 + i * 30));
  ctx.fillStyle = '#666'; ctx.font = '14px monospace';
  ctx.fillText('ESC 释放鼠标 / 暂停', W / 2, 470);
  ctx.textAlign = 'left';
}

/* ---------------- 输入 ---------------- */
addEventListener('keydown', e => {
  if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  if (keys[e.code]) return;
  keys[e.code] = true;
  if (state !== 'play' || paused) return;
  if (e.code === 'KeyR') startReload();
  if (e.code === 'KeyB') {
    if (buyT > 0) { buyOpen = !buyOpen; }
    else addFeed('购买时间已结束', '#ff8866');
  }
  if (buyOpen) {
    if (e.code === 'Digit1') {
      if (inv.ak) addFeed('已拥有 AK-47', '#ff8866');
      else if (player.money >= 2500) {
        player.money -= 2500;
        inv.ak = { mag: 30, reserve: 90 };
        curW = 'ak'; reloading = 0; fireCd = 0.5;
        addFeed('购买了 AK-47', '#8ff03c'); sfx.buy();
      } else addFeed('资金不足', '#ff8866');
    }
    if (e.code === 'Digit2') {
      if (player.money >= 650) { player.money -= 650; player.armor = 100; addFeed('购买了防弹衣', '#8ff03c'); sfx.buy(); }
      else addFeed('资金不足', '#ff8866');
    }
    if (e.code === 'Digit3') {
      if (player.money >= 300) {
        player.money -= 300;
        for (const k in inv) if (WEAPONS[k].mag) inv[k].reserve = WEAPONS[k].maxReserve;
        addFeed('弹药已补满', '#8ff03c'); sfx.buy();
      } else addFeed('资金不足', '#ff8866');
    }
    return;
  }
  const sel = { Digit1: 'ak', Digit2: 'usp', Digit3: 'knife' }[e.code];
  if (sel && inv[sel] && sel !== curW) {
    curW = sel; reloading = 0; fireCd = 0.4;
  }
});
addEventListener('keyup', e => { keys[e.code] = false; });

canvas.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  mouseDown = true;
  if (document.pointerLockElement === canvas && state === 'play' && !paused && !buyOpen) {
    if (!WEAPONS[curW].auto) tryFire();
  }
});
addEventListener('mouseup', e => { if (e.button === 0) mouseDown = false; });
canvas.addEventListener('click', () => {
  audio();
  if (state === 'menu') { startGame(); }
  if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) paused = false;
  else if (state === 'play') { paused = true; mouseDown = false; }
});
addEventListener('mousemove', e => {
  if (document.pointerLockElement !== canvas || paused || buyOpen) return;
  player.ang += e.movementX * 0.0022;
  player.pitch = Math.max(-130, Math.min(130, player.pitch - e.movementY * 0.5));
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

/* ---------------- 主循环 ---------------- */
let last = performance.now();
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t; now = t / 1000;
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
