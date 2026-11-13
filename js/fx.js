// 파티클, 데미지 숫자, 화면 흔들림
import { ARENA } from './config.js';

export class FX {
  constructor() {
    this.parts = [];
    this.nums = [];
    this.rings = [];
    this.shakeAmt = 0;
    this.shakeMul = 1;
    this.flash = 0;
    this.flashColor = '255,255,255';
    this.hitstop = 0;
  }

  reset() {
    this.parts.length = 0;
    this.nums.length = 0;
    this.rings.length = 0;
    this.shakeAmt = 0;
    this.flash = 0;
    this.hitstop = 0;
  }

  shake(a) { this.shakeAmt = Math.min(40, Math.max(this.shakeAmt, a * this.shakeMul)); }
  doFlash(a, color = '255,255,255') { this.flash = Math.max(this.flash, a); this.flashColor = color; }
  stop(t) { this.hitstop = Math.max(this.hitstop, t); }

  spark(x, y, dir, count, color = '#ffd27a', speed = 600, spread = 0.9, life = 0.3) {
    for (let i = 0; i < count; i++) {
      const a = dir + (Math.random() - 0.5) * spread * 2;
      const s = speed * (0.35 + Math.random() * 0.8);
      this.parts.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: life * (0.5 + Math.random() * 0.8), max: life, size: 1.5 + Math.random() * 2.2,
        color, kind: 'spark', g: 900,
      });
    }
  }

  smoke(x, y, count, color = '72,52,70', size = 18, life = 0.8) {
    for (let i = 0; i < count; i++) {
      this.parts.push({
        x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 80,
        life: life * (0.6 + Math.random() * 0.6), max: life, size: size * (0.6 + Math.random() * 0.8),
        color, kind: 'smoke', g: -30,
      });
    }
  }

  debris(x, y, count, color = '#3a2434') {
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
      const s = 300 + Math.random() * 700;
      this.parts.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 1.2 + Math.random() * 0.8, max: 2, size: 3 + Math.random() * 6,
        color, kind: 'debris', g: 1800, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 20,
      });
    }
  }

  ring(x, y, r0, r1, life, color = '240,200,130', width = 6) {
    this.rings.push({ x, y, r0, r1, life, max: life, color, width });
  }

  number(x, y, value, crit = false, big = false) {
    // 같은 위치 근처 숫자는 위로 쌓이게 살짝 흩뿌림
    this.nums.push({
      x: x + (Math.random() - 0.5) * 50, y: y - 20 + (Math.random() - 0.5) * 20,
      vy: -120 - Math.random() * 40, value: Math.round(value), life: 0.9, max: 0.9, crit, big,
    });
    if (this.nums.length > 90) this.nums.shift();
  }

  update(dt) {
    this.shakeAmt *= Math.pow(0.0008, dt);
    if (this.shakeAmt < 0.2) this.shakeAmt = 0;
    this.flash = Math.max(0, this.flash - dt * 3);

    for (const p of this.parts) {
      p.life -= dt;
      p.vy += p.g * dt;
      if (p.kind === 'smoke') { p.vx *= 1 - dt * 1.5; p.size += dt * 20; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'debris') {
        p.rot += p.vr * dt;
        if (p.y > ARENA.floor - 2) { p.y = ARENA.floor - 2; p.vy *= -0.3; p.vx *= 0.6; p.vr *= 0.5; }
      }
      if (p.kind === 'spark' && p.y > ARENA.floor) { p.y = ARENA.floor; p.vy *= -0.3; }
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    if (this.parts.length > 1400) this.parts.splice(0, this.parts.length - 1400);

    for (const n of this.nums) { n.life -= dt; n.y += n.vy * dt; n.vy *= 1 - dt * 3; }
    this.nums = this.nums.filter((n) => n.life > 0);

    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter((r) => r.life > 0);
  }

  drawWorld(g) {
    for (const r of this.rings) {
      const t = 1 - r.life / r.max;
      const rad = r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - t, 3));
      g.strokeStyle = `rgba(${r.color},${(1 - t) * 0.8})`;
      g.lineWidth = r.width * (1 - t) + 1;
      g.beginPath(); g.arc(r.x, r.y, rad, 0, Math.PI * 2); g.stroke();
    }
    for (const p of this.parts) {
      const a = Math.max(0, p.life / p.max);
      if (p.kind === 'smoke') {
        g.fillStyle = `rgba(${p.color},${a * 0.35})`;
        g.beginPath(); g.arc(p.x, p.y, p.size, 0, Math.PI * 2); g.fill();
      } else if (p.kind === 'debris') {
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
        g.globalAlpha = Math.min(1, a * 2);
        g.fillStyle = p.color; g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        g.restore();
      } else {
        g.globalAlpha = Math.min(1, a * 1.5);
        g.strokeStyle = p.color;
        g.lineWidth = p.size;
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.lineTo(p.x - p.vx * 0.018, p.y - p.vy * 0.018);
        g.stroke();
      }
    }
    g.globalAlpha = 1;
  }

  drawNumbers(g) {
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const n of this.nums) {
      const t = n.life / n.max;
      const pop = t > 0.85 ? 1 + (t - 0.85) * 4 : 1;
      const size = (n.big ? 34 : n.crit ? 26 : 19) * pop;
      g.font = `700 ${size}px "Cinzel", "Noto Serif KR", serif`;
      g.globalAlpha = Math.min(1, t * 2.5);
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(16,6,16,0.9)';
      g.strokeText(n.value.toLocaleString(), n.x, n.y);
      g.fillStyle = n.big ? '#ffe08a' : n.crit ? '#ff9ab8' : '#f3ece2';
      g.fillText(n.value.toLocaleString(), n.x, n.y);
    }
    g.globalAlpha = 1;
  }
}
