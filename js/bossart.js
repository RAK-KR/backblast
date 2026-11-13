// 보스 그림. 보스마다 하나씩.
import { ARENA } from './config.js';

function drawWarden(b, g, t) {
  const dead = b.state === 'dead';
  if (dead && b.deadT > 2.6) return;
  const bob = b.hovering ? Math.sin(t * 2.2) * 6 : 0;
  const x = b.x, y = b.y + bob;
  const red = b.phase === 2;
  const coreCol = b.groggy ? '255,240,214' : red ? '255,64,108' : '255,200,128';
  const open = b.open * 18 + (dead ? b.deadT * 26 : 0);

  // 바닥 그림자
  const hgt = Math.max(0, ARENA.floor - (y + b.r));
  const sa = Math.max(0.08, 0.45 - hgt / 1400);
  g.fillStyle = `rgba(10,4,12,${sa})`;
  g.beginPath(); g.ellipse(x, ARENA.floor + 2, 90 - Math.min(40, hgt / 20), 10, 0, 0, Math.PI * 2); g.fill();

  g.save();
  g.translate(x, y);

  // 공전하는 돌 파편 (뒤쪽 절반)
  drawShards(b, g, t, false, open);

  // 금색 고리 (뒤쪽 절반)
  const ringTilt = b.groggy ? 0.5 + b.open * 0.6 : 0.35;
  const r1 = b.ringRot, r2 = -b.ringRot * 1.3 + 1.2;
  const ringDrop = b.open * 40;
  drawRing(g, 0, ringDrop, 118, r1, ringTilt, false);
  drawRing(g, 0, ringDrop * 0.6, 100, r2, ringTilt + 0.25, false);

  // 코어 후광
  g.globalCompositeOperation = 'lighter';
  const pulse = b.groggy ? 0.8 + 0.2 * Math.sin(t * 12) : 0.75 + 0.25 * Math.sin(t * 3);
  const halo = g.createRadialGradient(0, 0, 6, 0, 0, b.groggy ? 130 : 110);
  halo.addColorStop(0, `rgba(${coreCol},${0.55 * pulse})`);
  halo.addColorStop(1, `rgba(${coreCol},0)`);
  g.fillStyle = halo;
  g.beginPath(); g.arc(0, 0, b.groggy ? 130 : 110, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = 'source-over';

  // 흑요석 결정 몸체 (그로기 때 좌우로 갈라짐)
  const T = -102, B = 92, L = 70;
  const halves = [
    { dx: -open, pts: [[0, T], [-L, -8], [0, B]], faces: [['#3c2440', [0, T], [-L, -8], [-14, 0]], ['#1e1222', [-L, -8], [0, B], [-14, 0]], ['#2e1a32', [0, T], [-14, 0], [0, B]]] },
    { dx: open, pts: [[0, T], [L, -8], [0, B]], faces: [['#563050', [0, T], [L, -8], [14, 0]], ['#2a1628', [L, -8], [0, B], [14, 0]], ['#46284a', [0, T], [14, 0], [0, B]]] },
  ];
  for (const hv of halves) {
    g.save();
    g.translate(hv.dx, 0);
    for (const [col, a, b, c] of hv.faces) {
      g.fillStyle = col;
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.closePath(); g.fill();
    }
    // 가장자리 금빛
    g.strokeStyle = 'rgba(232,200,138,0.85)';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(hv.pts[0][0], hv.pts[0][1]); g.lineTo(hv.pts[1][0], hv.pts[1][1]); g.lineTo(hv.pts[2][0], hv.pts[2][1]);
    g.stroke();
    g.restore();
  }

  // 균열 발광
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = `rgba(${coreCol},${red ? 0.85 : 0.5})`;
  g.lineWidth = 2;
  const cracks = red ? CRACKS : CRACKS.slice(0, 2);
  for (const cr of cracks) {
    g.beginPath();
    g.moveTo(cr[0][0] + Math.sign(cr[0][0]) * open, cr[0][1]);
    for (let i = 1; i < cr.length; i++) g.lineTo(cr[i][0] + Math.sign(cr[i][0] || cr[0][0]) * open, cr[i][1]);
    g.stroke();
  }
  g.globalCompositeOperation = 'source-over';

  // 눈 (세로로 긴 아몬드)
  const eh = b.groggy ? 34 : 26, ew = b.groggy ? 16 + open * 0.5 : 11;
  g.fillStyle = '#0e0810';
  g.beginPath();
  g.moveTo(0, -eh); g.quadraticCurveTo(ew * 1.6, 0, 0, eh); g.quadraticCurveTo(-ew * 1.6, 0, 0, -eh);
  g.fill();
  g.globalCompositeOperation = 'lighter';
  const ex = Math.cos(b.eyeA) * 5, ey = Math.sin(b.eyeA) * 10;
  const eg = g.createRadialGradient(ex, ey, 1, ex, ey, ew * 1.4);
  eg.addColorStop(0, 'rgba(255,250,240,1)');
  eg.addColorStop(0.35, `rgba(${coreCol},1)`);
  eg.addColorStop(1, `rgba(${coreCol},0)`);
  g.fillStyle = eg;
  g.beginPath(); g.ellipse(ex, ey, ew * 0.9, eh * 0.55, 0, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = 'source-over';

  if (b.hitFlash > 0) {
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(255,255,255,${b.hitFlash * 5})`;
    g.beginPath(); g.moveTo(-open, T); g.lineTo(-L - open, -8); g.lineTo(-open, B); g.lineTo(open, B); g.lineTo(L + open, -8); g.lineTo(open, T); g.closePath(); g.fill();
    g.globalCompositeOperation = 'source-over';
  }

  // 금색 고리 (앞쪽 절반)
  drawRing(g, 0, ringDrop, 118, r1, ringTilt, true);
  drawRing(g, 0, ringDrop * 0.6, 100, r2, ringTilt + 0.25, true);

  // 공전하는 돌 파편 (앞쪽 절반)
  drawShards(b, g, t, true, open);

  if (b.state === 'phase' || (b.state === 'charge' && b.step === 0)) {
    g.strokeStyle = `rgba(255,64,108,${0.5 + 0.5 * Math.sin(t * 40)})`;
    g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, 0, 112 + Math.sin(t * 30) * 4, 124 + Math.sin(t * 30) * 4, 0, 0, Math.PI * 2); g.stroke();
  }

  g.restore();
}


function drawRing(g, cx, cy, r, rot, tilt, front) {
  g.save();
  g.translate(cx, cy);
  g.rotate(Math.sin(rot) * 0.5);
  const ry = r * tilt;
  g.lineWidth = 5;
  g.strokeStyle = front ? '#d8b066' : 'rgba(150,110,60,0.8)';
  g.beginPath();
  if (front) g.ellipse(0, 0, r, ry, 0, 0, Math.PI);
  else g.ellipse(0, 0, r, ry, 0, Math.PI, Math.PI * 2);
  g.stroke();
  if (front) {
    g.lineWidth = 1.5;
    g.strokeStyle = 'rgba(255,240,200,0.8)';
    g.beginPath(); g.ellipse(0, -1.5, r, ry, 0, 0.3, Math.PI - 0.3); g.stroke();
    // 고리 위 장식 마디
    for (let i = 0; i < 6; i++) {
      const a = rot * 2 + (i / 6) * Math.PI * 2;
      const sy = Math.sin(a);
      if (sy < 0) continue;
      g.fillStyle = '#f0d08a';
      g.fillRect(Math.cos(a) * r - 3, sy * ry - 3, 6, 6);
    }
  }
  g.restore();
}


function drawShards(b, g, t, front, open) {
  for (let i = 0; i < SHARDS.length; i++) {
    const sh = SHARDS[i];
    const a = b.ringRot * sh.sp + sh.ph;
    const z = Math.sin(a);
    if ((z >= 0) !== front) continue;
    const rr = sh.r + open * 1.5;
    const sx = Math.cos(a) * rr;
    const sy = z * rr * 0.28 + sh.oy + (b.groggy ? b.open * 50 : 0);
    g.save();
    g.translate(sx, sy);
    g.rotate(a * 1.7 + i);
    const k = 0.8 + z * 0.2;
    g.scale(k, k);
    g.fillStyle = front ? '#3a2234' : '#24142a';
    g.beginPath();
    sh.poly.forEach(([px, py], j) => (j ? g.lineTo(px, py) : g.moveTo(px, py)));
    g.closePath();
    g.fill();
    g.strokeStyle = front ? 'rgba(232,200,138,0.7)' : 'rgba(232,200,138,0.3)';
    g.lineWidth = 1.2;
    g.stroke();
    g.restore();
  }
}

const CRACKS = [
  [[-6, -70], [-18, -48], [-10, -30]],
  [[8, 40], [22, 58], [14, 76]],
  [[-30, 20], [-46, 34], [-40, 52]],
  [[34, -40], [50, -22], [44, -6]],
];

const SHARDS = [
  { r: 150, sp: 1.0, ph: 0.0, oy: -10, poly: [[-10, -8], [8, -12], [12, 6], [-4, 12]] },
  { r: 140, sp: 1.0, ph: 2.1, oy: 20, poly: [[-7, -10], [9, -4], [4, 10], [-9, 4]] },
  { r: 160, sp: 1.0, ph: 4.2, oy: -30, poly: [[-12, -4], [2, -12], [12, 2], [0, 10]] },
  { r: 132, sp: 1.4, ph: 1.0, oy: 40, poly: [[-6, -6], [7, -6], [5, 7], [-5, 6]] },
  { r: 170, sp: 0.8, ph: 3.3, oy: 0, poly: [[-9, -9], [10, -6], [6, 9], [-8, 7]] },
];

// 공통: 바닥 그림자
function shadow(b, g, x, y) {
  const hgt = Math.max(0, ARENA.floor - (y + b.r));
  const sa = Math.max(0.08, 0.45 - hgt / 1400);
  g.fillStyle = `rgba(10,4,12,${sa})`;
  g.beginPath(); g.ellipse(x, ARENA.floor + 2, b.r - Math.min(30, hgt / 20), 10, 0, 0, Math.PI * 2); g.fill();
}

function almondEye(b, g, cx, cy, eh, ew, coreCol, range = 6) {
  g.fillStyle = '#0e0810';
  g.beginPath();
  g.moveTo(cx - ew * 1.6, cy); g.quadraticCurveTo(cx, cy - eh, cx + ew * 1.6, cy); g.quadraticCurveTo(cx, cy + eh, cx - ew * 1.6, cy);
  g.fill();
  const ex = cx + Math.cos(b.eyeA) * range, ey = cy + Math.sin(b.eyeA) * range * 0.4;
  g.globalCompositeOperation = 'lighter';
  const eg = g.createRadialGradient(ex, ey, 1, ex, ey, ew * 1.3);
  eg.addColorStop(0, 'rgba(255,250,240,1)');
  eg.addColorStop(0.35, `rgba(${coreCol},1)`);
  eg.addColorStop(1, `rgba(${coreCol},0)`);
  g.fillStyle = eg;
  g.beginPath(); g.ellipse(ex, ey, ew * 1.1, eh * 0.55, 0, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = 'source-over';
}

// ───── 1. 울림종: 떠다니는 거대한 청동 종 ─────
function bellPath(g) {
  g.beginPath();
  g.moveTo(-30, -64);
  g.quadraticCurveTo(0, -86, 30, -64);
  g.bezierCurveTo(44, -36, 44, 14, 70, 44);
  g.lineTo(76, 58);
  g.quadraticCurveTo(0, 72, -76, 58);
  g.lineTo(-70, 44);
  g.bezierCurveTo(-44, 14, -44, -36, -30, -64);
  g.closePath();
}

function drawBell(b, g, t) {
  const dead = b.state === 'dead';
  if (dead && b.deadT > 2.6) return;
  const bob = b.hovering ? Math.sin(t * 1.8) * 7 : 0;
  const x = b.x, y = b.y + bob;
  const red = b.phase === 2;
  const coreCol = b.groggy ? '255,240,214' : red ? '255,90,120' : '255,200,128';
  shadow(b, g, x, y);

  g.save();
  g.translate(x, y);
  const swing = Math.sin(t * 1.6) * 0.07 + b.open * 0.38 + (dead ? b.deadT * 0.25 : 0);
  g.rotate(swing);

  // 안쪽에서 새어 나오는 빛
  g.globalCompositeOperation = 'lighter';
  const pulse = b.groggy ? 0.85 + 0.15 * Math.sin(t * 12) : 0.6 + 0.2 * Math.sin(t * 3);
  const glow = g.createRadialGradient(0, 64, 4, 0, 64, 120);
  glow.addColorStop(0, `rgba(${coreCol},${0.75 * pulse})`);
  glow.addColorStop(1, `rgba(${coreCol},0)`);
  g.fillStyle = glow;
  g.beginPath(); g.ellipse(0, 70, 120, 70, 0, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = 'source-over';

  // 꼭대기 고리
  g.strokeStyle = '#6a4a28';
  g.lineWidth = 7;
  g.beginPath(); g.arc(0, -90, 13, Math.PI * 0.85, Math.PI * 2.15); g.stroke();
  g.strokeStyle = '#c9a35a';
  g.lineWidth = 1.5;
  g.beginPath(); g.arc(0, -90, 13, Math.PI * 1.1, Math.PI * 1.6); g.stroke();

  // 종 몸체 (청동)
  const body = g.createLinearGradient(-76, 0, 76, 0);
  body.addColorStop(0, '#3a2414');
  body.addColorStop(0.32, '#a77c42');
  body.addColorStop(0.5, '#7a5630');
  body.addColorStop(1, '#2e1c10');
  g.fillStyle = body;
  bellPath(g);
  g.fill();

  // 녹청 얼룩
  g.save();
  bellPath(g);
  g.clip();
  g.fillStyle = 'rgba(96,150,128,0.32)';
  for (const [px, w, h] of [[-38, 10, 60], [-12, 7, 40], [22, 12, 70], [46, 8, 46]]) {
    g.beginPath();
    g.moveTo(px - w, -60); g.lineTo(px + w, -60); g.lineTo(px + w * 0.4, -60 + h); g.lineTo(px - w * 0.3, -60 + h * 0.8); g.closePath(); g.fill();
  }
  // 장식 띠
  g.fillStyle = 'rgba(232,200,138,0.75)';
  g.fillRect(-80, -48, 160, 3);
  g.fillRect(-80, 34, 160, 3);
  g.fillStyle = 'rgba(40,24,12,0.6)';
  g.fillRect(-80, 38, 160, 6);
  // 띠 위 마름모 장식
  g.fillStyle = 'rgba(232,200,138,0.8)';
  for (let i = -4; i <= 4; i++) {
    const dx = i * 14;
    g.beginPath(); g.moveTo(dx, 26); g.lineTo(dx + 4, 30); g.lineTo(dx, 34); g.lineTo(dx - 4, 30); g.closePath(); g.fill();
  }
  // 금 (2페이즈)
  if (red || b.groggy) {
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(${coreCol},0.8)`;
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(18, -56); g.lineTo(26, -30); g.lineTo(16, -10); g.lineTo(28, 14); g.stroke();
    g.beginPath(); g.moveTo(-40, 10); g.lineTo(-30, 24); g.lineTo(-44, 40); g.stroke();
    g.globalCompositeOperation = 'source-over';
  }
  g.restore();

  // 테두리
  g.strokeStyle = 'rgba(232,200,138,0.55)';
  g.lineWidth = 1.5;
  bellPath(g);
  g.stroke();

  // 종 입구
  g.fillStyle = '#140a08';
  g.beginPath(); g.ellipse(0, 59, 74, 10, 0, 0, Math.PI * 2); g.fill();

  // 추 (흔들림)
  const cl = Math.sin(t * 3.2) * 0.35 - swing * 0.6;
  g.save();
  g.translate(0, 20);
  g.rotate(cl);
  g.strokeStyle = '#2a1a10';
  g.lineWidth = 5;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 46); g.stroke();
  g.globalCompositeOperation = 'lighter';
  const cg = g.createRadialGradient(0, 52, 2, 0, 52, 22);
  cg.addColorStop(0, `rgba(${coreCol},1)`);
  cg.addColorStop(1, `rgba(${coreCol},0)`);
  g.fillStyle = cg;
  g.beginPath(); g.arc(0, 52, 22, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#3a2614';
  g.beginPath(); g.arc(0, 52, 10, 0, Math.PI * 2); g.fill();
  g.restore();

  // 새겨진 눈
  almondEye(b, g, 0, -16, b.groggy ? 18 : 14, b.groggy ? 12 : 10, coreCol, 7);

  if (b.hitFlash > 0) {
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(255,255,255,${b.hitFlash * 5})`;
    bellPath(g);
    g.fill();
    g.globalCompositeOperation = 'source-over';
  }
  g.restore();
}

// ───── 2. 불씨 화로: 불꽃을 이고 떠 있는 석조 화로 ─────
function flame(g, cx, base, h, w, t, seed) {
  const sway = Math.sin(t * 7 + seed) * w * 0.45;
  g.beginPath();
  g.moveTo(cx - w, base);
  g.quadraticCurveTo(cx - w * 0.95, base - h * 0.55, cx + sway, base - h);
  g.quadraticCurveTo(cx + w * 0.95, base - h * 0.5, cx + w, base);
  g.closePath();
  g.fill();
}

function drawBrazier(b, g, t) {
  const dead = b.state === 'dead';
  if (dead && b.deadT > 2.6) return;
  const bob = b.hovering ? Math.sin(t * 2) * 6 : 0;
  const x = b.x, y = b.y + bob;
  const red = b.phase === 2;
  const coreCol = b.groggy ? '255,240,214' : red ? '255,70,110' : '255,180,100';
  shadow(b, g, x, y);

  g.save();
  g.translate(x, y);
  g.rotate(b.open * 0.32 + (dead ? b.deadT * 0.2 : 0));

  // 불꽃
  const fh = b.groggy ? 0.3 : dead ? Math.max(0, 1 - b.deadT) : 1;
  const k = fh * (red ? 1.25 : 1);
  g.globalCompositeOperation = 'lighter';
  const halo = g.createRadialGradient(0, -40, 6, 0, -40, 150 * Math.max(0.4, k));
  halo.addColorStop(0, `rgba(${coreCol},0.45)`);
  halo.addColorStop(1, `rgba(${coreCol},0)`);
  g.fillStyle = halo;
  g.beginPath(); g.arc(0, -40, 150 * Math.max(0.4, k), 0, Math.PI * 2); g.fill();
  if (k > 0.02) {
    g.fillStyle = red ? 'rgba(255,60,100,0.55)' : 'rgba(255,110,60,0.55)';
    flame(g, -40, -12, 70 * k, 22, t, 1);
    flame(g, 38, -12, 80 * k, 24, t, 2.4);
    flame(g, 0, -12, 125 * k, 36, t, 0.3);
    g.fillStyle = 'rgba(255,190,110,0.5)';
    flame(g, -22, -12, 60 * k, 16, t * 1.2, 3);
    flame(g, 20, -12, 70 * k, 18, t * 1.2, 4);
    flame(g, 0, -12, 92 * k, 24, t * 1.1, 5);
    g.fillStyle = 'rgba(255,244,220,0.55)';
    flame(g, 0, -12, 52 * k, 14, t * 1.4, 6);
  }
  g.globalCompositeOperation = 'source-over';

  // 사슬 장식
  g.strokeStyle = '#1e1218';
  g.lineWidth = 3;
  for (const sx of [-76, 76]) {
    for (let i = 0; i < 4; i++) {
      g.beginPath(); g.ellipse(sx, 2 + i * 11, 3.5, 6, 0, 0, Math.PI * 2); g.stroke();
    }
  }

  // 받침 기둥
  g.fillStyle = '#2a1824';
  g.beginPath(); g.moveTo(-22, 26); g.lineTo(22, 26); g.lineTo(34, 72); g.lineTo(-34, 72); g.closePath(); g.fill();
  g.fillStyle = '#c9a35a';
  g.fillRect(-36, 70, 72, 3);
  g.fillRect(-24, 26, 48, 2);

  // 그릇
  const bowl = g.createLinearGradient(0, -12, 0, 32);
  bowl.addColorStop(0, '#5a3a4c');
  bowl.addColorStop(1, '#22121c');
  g.fillStyle = bowl;
  g.beginPath();
  g.moveTo(-84, -12);
  g.lineTo(84, -12);
  g.quadraticCurveTo(76, 26, 40, 32);
  g.lineTo(-40, 32);
  g.quadraticCurveTo(-76, 26, -84, -12);
  g.closePath();
  g.fill();
  // 금 테두리
  g.fillStyle = '#d8b066';
  g.fillRect(-88, -16, 176, 6);
  g.fillStyle = 'rgba(255,240,200,0.7)';
  g.fillRect(-88, -16, 176, 1.5);
  // 그릇 무늬
  g.fillStyle = 'rgba(232,200,138,0.6)';
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    const dx = i * 20;
    g.beginPath(); g.moveTo(dx, 4); g.lineTo(dx + 5, 10); g.lineTo(dx, 16); g.lineTo(dx - 5, 10); g.closePath(); g.fill();
  }
  // 그릇 균열 (2페이즈)
  if (red || b.groggy) {
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(${coreCol},0.85)`;
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(-60, -8); g.lineTo(-50, 8); g.lineTo(-58, 22); g.stroke();
    g.beginPath(); g.moveTo(54, -8); g.lineTo(64, 6); g.stroke();
    g.globalCompositeOperation = 'source-over';
  }

  // 눈
  almondEye(b, g, 0, 10, b.groggy ? 14 : 11, b.groggy ? 11 : 9, coreCol, 7);

  if (b.hitFlash > 0) {
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(255,255,255,${b.hitFlash * 5})`;
    g.fillRect(-88, -16, 176, 48);
    g.globalCompositeOperation = 'source-over';
  }
  g.restore();
}

// ───── 튜토리얼 과녁 ─────
function drawDummy(b, g, t) {
  const x = b.x, y = b.y + (b.hovering ? Math.sin(t * 2) * 5 : 0);
  shadow(b, g, x, y);
  g.save();
  g.translate(x, y);
  g.rotate(b.open * 0.25);
  g.fillStyle = '#2a1824';
  g.beginPath(); g.arc(0, 0, 70, 0, Math.PI * 2); g.fill();
  const rings = [[62, '#d8b066'], [48, '#3a2232'], [36, '#c4364c'], [22, '#3a2232'], [10, '#f3ece2']];
  for (const [r, c] of rings) {
    g.fillStyle = c;
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
  }
  if (b.groggy) {
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(255,236,200,${0.35 + 0.2 * Math.sin(t * 12)})`;
    g.beginPath(); g.arc(0, 0, 74, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'source-over';
  }
  if (b.hitFlash > 0) {
    g.fillStyle = `rgba(255,255,255,${b.hitFlash * 5})`;
    g.beginPath(); g.arc(0, 0, 70, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

// ───── 4. 검은 태양: 불타는 코로나를 두른 일식 ─────
function drawEclipse(b, g, t) {
  const dead = b.state === 'dead';
  if (dead && b.deadT > 2.6) return;
  const bob = b.hovering ? Math.sin(t * 1.9) * 6 : 0;
  const x = b.x, y = b.y + bob;
  const red = b.phase === 2;
  const coreCol = b.groggy ? '255,240,214' : red ? '255,60,110' : '255,206,140';
  const R = b.r * 0.9;
  shadow(b, g, x, y);

  g.save();
  g.translate(x, y);
  g.rotate(b.open * 0.25);

  // 코로나 (불꽃 가시) — 두 겹이 반대로 회전
  const fade = b.groggy ? 0.35 : dead ? Math.max(0, 1 - b.deadT * 0.5) : 1;
  const lenMul = (red ? 1.35 : 1) * fade;
  g.globalCompositeOperation = 'lighter';
  for (let layer = 0; layer < 2; layer++) {
    const n = layer ? 18 : 24;
    const rot = (layer ? -1 : 1) * t * (red ? 0.5 : 0.3);
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      const L = R * (0.3 + 0.28 * Math.abs(Math.sin(t * 3 + i * 1.7 + layer))) * lenMul;
      const wa = layer ? 0.1 : 0.07;
      const r0 = R * 0.96;
      g.fillStyle = layer
        ? (red ? 'rgba(255,60,110,0.45)' : 'rgba(255,140,80,0.45)')
        : 'rgba(255,214,150,0.55)';
      g.beginPath();
      g.moveTo(Math.cos(a - wa) * r0, Math.sin(a - wa) * r0);
      g.lineTo(Math.cos(a) * (r0 + L), Math.sin(a) * (r0 + L));
      g.lineTo(Math.cos(a + wa) * r0, Math.sin(a + wa) * r0);
      g.closePath();
      g.fill();
    }
  }
  const halo = g.createRadialGradient(0, 0, R * 0.8, 0, 0, R * 2.1);
  halo.addColorStop(0, `rgba(${coreCol},${0.5 * fade + 0.1})`);
  halo.addColorStop(1, `rgba(${coreCol},0)`);
  g.fillStyle = halo;
  g.beginPath(); g.arc(0, 0, R * 2.1, 0, Math.PI * 2); g.fill();
  g.globalCompositeOperation = 'source-over';

  // 검은 원반
  const disk = g.createRadialGradient(-R * 0.3, -R * 0.3, 4, 0, 0, R);
  disk.addColorStop(0, '#22142a');
  disk.addColorStop(1, '#07030a');
  g.fillStyle = disk;
  g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();

  // 일식 빛 테두리
  g.shadowColor = `rgba(${coreCol},0.9)`;
  g.shadowBlur = 18;
  g.strokeStyle = '#fff2dc';
  g.lineWidth = 3.5;
  g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.stroke();
  g.shadowBlur = 0;

  // 균열 (2페이즈 / 그로기)
  if (red || b.groggy) {
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = `rgba(${coreCol},0.85)`;
    g.lineWidth = 2;
    for (const cr of [[[-20, -60], [-34, -36], [-24, -14]], [[30, 40], [48, 52], [42, 70]], [[50, -30], [62, -10]]]) {
      g.beginPath();
      cr.forEach(([px, py], j) => (j ? g.lineTo(px, py) : g.moveTo(px, py)));
      g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
  }

  // 눈
  almondEye(b, g, 0, 0, b.groggy ? 20 : 15, b.groggy ? 18 : 14, coreCol, 10);

  // 공전하는 작은 달 3개
  for (let i = 0; i < 3; i++) {
    const a = t * 1.1 + (i / 3) * Math.PI * 2;
    const z = Math.sin(a);
    const mx = Math.cos(a) * R * 1.55, my = z * R * 0.45 + (b.groggy ? 40 : 0);
    g.globalAlpha = z > 0 ? 1 : 0.5;
    g.fillStyle = '#1a0e1e';
    g.beginPath(); g.arc(mx, my, z > 0 ? 11 : 8, 0, Math.PI * 2); g.fill();
    g.strokeStyle = `rgba(${coreCol},0.8)`;
    g.lineWidth = 1.5;
    g.beginPath(); g.arc(mx, my, z > 0 ? 11 : 8, -0.6, 1.2); g.stroke();
    g.globalAlpha = 1;
  }

  if (b.hitFlash > 0) {
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = `rgba(255,255,255,${b.hitFlash * 5})`;
    g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'source-over';
  }
  g.restore();
}

export const ART = { warden: drawWarden, bell: drawBell, brazier: drawBrazier, dummy: drawDummy, eclipse: drawEclipse };
