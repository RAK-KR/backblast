// 배경: 해 질 녘의 거대 유적. 정적인 부분은 한 번만 그려 두고 재사용.
import { W, H, ARENA } from './config.js';

function makeCanvas() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  return c;
}

// 고정 시드 난수 (배경이 매번 같게)
function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

export const SUN = { x: 1040, y: 500, r: 130 };

export function buildBackground() {
  const c = makeCanvas();
  const g = c.getContext('2d');
  const rnd = seeded(7);

  // 하늘
  const sky = g.createLinearGradient(0, 0, 0, ARENA.floor);
  sky.addColorStop(0, '#0f0a1c');
  sky.addColorStop(0.38, '#2e1236');
  sky.addColorStop(0.66, '#7a2638');
  sky.addColorStop(0.86, '#c95a3e');
  sky.addColorStop(1, '#e9a05a');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  // 별
  for (let i = 0; i < 90; i++) {
    const x = rnd() * W, y = rnd() * 300;
    g.fillStyle = `rgba(255,235,220,${0.15 + rnd() * 0.45 * (1 - y / 300)})`;
    g.fillRect(x, y, rnd() < 0.1 ? 2 : 1, rnd() < 0.1 ? 2 : 1);
  }

  // 지는 해
  const sg = g.createRadialGradient(SUN.x, SUN.y, 10, SUN.x, SUN.y, SUN.r * 3.2);
  sg.addColorStop(0, 'rgba(255,226,170,0.9)');
  sg.addColorStop(0.3, 'rgba(255,170,110,0.35)');
  sg.addColorStop(1, 'rgba(255,120,90,0)');
  g.fillStyle = sg;
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#ffd9a0';
  g.beginPath(); g.arc(SUN.x, SUN.y, SUN.r, 0, Math.PI * 2); g.fill();
  // 해를 가로지르는 구름 띠
  g.fillStyle = 'rgba(122,38,56,0.55)';
  for (const [yy, hh, ww] of [[460, 6, 520], [515, 10, 640], [580, 8, 460], [410, 4, 300]]) {
    g.fillRect(SUN.x - ww / 2 + (rnd() - 0.5) * 120, yy, ww, hh);
  }

  // 먼 층: 거대한 무너진 아치와 첨탑
  g.fillStyle = 'rgba(86,30,58,0.75)';
  farRuins(g, rnd);

  // 중간 층: 거대 석상의 잔해와 기둥
  g.fillStyle = '#3a1630';
  midRuins(g, rnd);

  // 지평선 안개
  const fog = g.createLinearGradient(0, ARENA.floor - 160, 0, ARENA.floor);
  fog.addColorStop(0, 'rgba(233,140,90,0)');
  fog.addColorStop(1, 'rgba(233,140,90,0.28)');
  g.fillStyle = fog;
  g.fillRect(0, ARENA.floor - 160, W, 160);

  // 위쪽 석조 들보 (천장 경계)
  stoneBeam(g, 0, 0, W, ARENA.top, rnd);

  // 좌우 거대 기둥 (벽 경계)
  pillar(g, 0, ARENA.left, rnd);
  pillar(g, ARENA.right, W - ARENA.right, rnd);

  // 바닥: 석판
  floor(g, rnd);

  return c;
}

function farRuins(g, rnd) {
  const base = ARENA.floor - 40;
  // 첨탑들
  for (const [x, w, h] of [[130, 46, 380], [260, 30, 300], [1420, 52, 420], [1520, 28, 260], [620, 26, 240]]) {
    g.beginPath();
    g.moveTo(x - w / 2, base);
    g.lineTo(x - w / 2, base - h);
    g.lineTo(x, base - h - w * 1.6);
    g.lineTo(x + w / 2, base - h);
    g.lineTo(x + w / 2, base);
    g.closePath();
    g.fill();
  }
  // 반쯤 무너진 대형 아치
  g.beginPath();
  const ax = 760, ar = 230;
  g.moveTo(ax - ar - 40, base);
  g.lineTo(ax - ar - 40, base - 260);
  g.arc(ax, base - 260, ar + 40, Math.PI, Math.PI * 1.62);
  g.lineTo(ax + Math.cos(Math.PI * 1.62) * ar, base - 260 + Math.sin(Math.PI * 1.62) * ar);
  g.arc(ax, base - 260, ar, Math.PI * 1.62, Math.PI, true);
  g.lineTo(ax - ar, base);
  g.closePath();
  g.fill();
  // 오른쪽 기둥만 남은 부분
  g.fillRect(ax + ar, base - 210, 40, 210);
  g.fillRect(ax + ar - 8, base - 222, 56, 14);
  void rnd;
}

function midRuins(g, rnd) {
  const base = ARENA.floor;
  // 부러진 기둥들
  for (const [x, w, h] of [[200, 64, 300], [420, 50, 190], [1180, 58, 240], [1360, 70, 340]]) {
    g.fillRect(x - w / 2, base - h, w, h);
    // 기둥 머리 장식
    g.fillRect(x - w / 2 - 10, base - h - 12, w + 20, 12);
    // 부러진 윗부분
    g.beginPath();
    g.moveTo(x - w / 2, base - h - 12);
    g.lineTo(x - w / 2 + w * 0.3, base - h - 30 - rnd() * 20);
    g.lineTo(x + w * 0.1, base - h - 14);
    g.lineTo(x + w / 2, base - h - 26 - rnd() * 16);
    g.lineTo(x + w / 2, base - h - 12);
    g.closePath();
    g.fill();
  }
  // 바닥에 꽂힌 거대한 부러진 검
  g.save();
  g.translate(960, base);
  g.rotate(0.16);
  g.fillRect(-26, -330, 52, 330);                 // 칼날
  g.beginPath(); g.moveTo(-26, -330); g.lineTo(-6, -352); g.lineTo(26, -318); g.lineTo(26, -330); g.closePath(); g.fill(); // 부러진 끝
  g.fillRect(-14, -330, 6, -2);
  g.restore();
  g.save();
  g.translate(1010, base);
  g.rotate(-0.05);
  // 칼자루 쪽은 옆에 쓰러져 있음
  g.fillRect(-120, -40, 150, 34);
  g.fillRect(30, -78, 22, 110);                   // 코등이
  g.fillRect(52, -32, 70, 18);                    // 손잡이
  g.beginPath(); g.arc(130, -23, 15, 0, Math.PI * 2); g.fill(); // 폼멜
  g.restore();
}

function stoneBeam(g, x, y, w, h, rnd) {
  const sg = g.createLinearGradient(0, y, 0, y + h);
  sg.addColorStop(0, '#120a12');
  sg.addColorStop(1, '#2a1622');
  g.fillStyle = sg;
  g.fillRect(x, y, w, h);
  g.fillStyle = 'rgba(0,0,0,0.4)';
  for (let bx = 0; bx < w; bx += 140 + Math.floor(rnd() * 60)) g.fillRect(bx, y, 2, h);
  g.fillStyle = '#c9a35a';
  g.fillRect(x, y + h - 3, w, 2);
  g.fillStyle = 'rgba(201,163,90,0.35)';
  g.fillRect(x, y + h - 10, w, 1);
  // 끊어진 사슬
  for (const cx of [300, 1290]) {
    for (let i = 0; i < 6; i++) {
      g.strokeStyle = '#1a0e16';
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(cx, y + h + 8 + i * 13, 4, 7, 0, 0, Math.PI * 2);
      g.stroke();
    }
  }
}

function pillar(g, x, w, rnd) {
  const pg = g.createLinearGradient(x, 0, x + w, 0);
  pg.addColorStop(0, '#160c14');
  pg.addColorStop(0.5, '#2c1824');
  pg.addColorStop(1, '#140a12');
  g.fillStyle = pg;
  g.fillRect(x, 0, w, H);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  for (let y = 60; y < H; y += 90 + Math.floor(rnd() * 40)) g.fillRect(x, y, w, 2);
  g.fillStyle = '#c9a35a';
  const edge = x === 0 ? x + w - 2 : x;
  g.fillRect(edge, ARENA.top, 2, ARENA.floor - ARENA.top);
}

function floor(g, rnd) {
  const top = ARENA.floor;
  const fg = g.createLinearGradient(0, top, 0, H);
  fg.addColorStop(0, '#3a2230');
  fg.addColorStop(0.25, '#24141e');
  fg.addColorStop(1, '#0e080c');
  g.fillStyle = fg;
  g.fillRect(0, top, W, H - top);

  // 석판 이음새
  let x = ARENA.left;
  while (x < ARENA.right) {
    const w = 110 + Math.floor(rnd() * 90);
    g.fillStyle = `rgba(255,220,200,${0.02 + rnd() * 0.03})`;
    g.fillRect(x + 2, top + 4, w - 4, 26);
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(x, top + 2, 2, 30);
    // 금
    if (rnd() < 0.5) {
      g.strokeStyle = 'rgba(0,0,0,0.45)';
      g.lineWidth = 1;
      g.beginPath();
      let cx = x + 10 + rnd() * (w - 20), cy = top + 4;
      g.moveTo(cx, cy);
      for (let i = 0; i < 3; i++) { cx += (rnd() - 0.5) * 20; cy += 6 + rnd() * 6; g.lineTo(cx, cy); }
      g.stroke();
    }
    x += w;
  }
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.fillRect(ARENA.left, top + 32, ARENA.right - ARENA.left, 2);

  // 금색 상감 띠 (마름모 무늬)
  const by = top + 48;
  g.fillStyle = 'rgba(201,163,90,0.55)';
  g.fillRect(ARENA.left, by - 8, ARENA.right - ARENA.left, 1);
  g.fillRect(ARENA.left, by + 8, ARENA.right - ARENA.left, 1);
  for (let dx = ARENA.left + 20; dx < ARENA.right; dx += 40) {
    g.beginPath();
    g.moveTo(dx, by - 5); g.lineTo(dx + 5, by); g.lineTo(dx, by + 5); g.lineTo(dx - 5, by); g.closePath();
    g.fill();
  }

  // 아래쪽 기단 (큰 석재 블록)
  for (let row = 0; row < 3; row++) {
    const ry = top + 66 + row * 34;
    if (ry > H) break;
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(ARENA.left, ry, ARENA.right - ARENA.left, 2);
    let bx = ARENA.left + (row % 2) * 70;
    while (bx < ARENA.right) {
      const bw = 140 + Math.floor(rnd() * 60);
      g.fillStyle = 'rgba(0,0,0,0.4)';
      g.fillRect(bx, ry, 2, 34);
      g.fillStyle = `rgba(255,220,200,${0.012 + rnd() * 0.02})`;
      g.fillRect(bx + 2, ry + 3, bw - 4, 28);
      bx += bw;
    }
  }

  // 윗면 테두리 (석양 반사)
  g.fillStyle = '#e8b878';
  g.fillRect(ARENA.left, top, ARENA.right - ARENA.left, 2);
  const rf = g.createLinearGradient(0, top, 0, top + 30);
  rf.addColorStop(0, 'rgba(255,170,110,0.18)');
  rf.addColorStop(1, 'rgba(255,170,110,0)');
  g.fillStyle = rf;
  g.fillRect(ARENA.left, top, ARENA.right - ARENA.left, 30);
}

export function buildVignette() {
  const c = makeCanvas();
  const g = c.getContext('2d');
  const v = g.createRadialGradient(W / 2, H * 0.55, H * 0.3, W / 2, H * 0.55, W * 0.72);
  v.addColorStop(0, 'rgba(10,4,14,0)');
  v.addColorStop(1, 'rgba(10,4,14,0.6)');
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  return c;
}

// 떠다니는 먼지·재 (매 프레임)
export class Motes {
  constructor() {
    const rnd = seeded(31);
    this.list = Array.from({ length: 70 }, () => ({
      x: rnd() * W, y: ARENA.top + rnd() * (ARENA.floor - ARENA.top),
      s: 0.6 + rnd() * 2, sp: 8 + rnd() * 22, ph: rnd() * 6.28,
    }));
  }
  draw(g, t, dt) {
    for (const m of this.list) {
      m.x += m.sp * dt;
      m.y += Math.sin(t * 0.7 + m.ph) * 6 * dt - 3 * dt;
      if (m.x > W) m.x = 0;
      if (m.y < ARENA.top) m.y = ARENA.floor;
      const a = 0.25 + 0.25 * Math.sin(t * 1.3 + m.ph);
      g.fillStyle = `rgba(255,214,170,${a})`;
      g.fillRect(m.x, m.y, m.s, m.s);
    }
  }
}
