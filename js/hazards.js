// 보스가 만들어 내는 위험 요소: 레이저, 지면 충격파, 탄환, 기뢰
import { ARENA, DMG, W } from './config.js';

export function laserH(y, tele, active = 0.42, w = 46) {
  return { type: 'laserH', y, tele, active, w, t: 0, fired: false, dmg: DMG.laser };
}

export function laserV(x, tele, active = 0.42, w = 46) {
  return { type: 'laserV', x, tele, active, w, t: 0, fired: false, dmg: DMG.laser };
}

export function shock(x, dir, speed = 820, h = 48) {
  return { type: 'shock', x, dir, speed, h, t: 0, dmg: DMG.shock };
}

export function orb(x, y, vx, vy, r = 10) {
  return { type: 'orb', x, y, vx, vy, r, t: 0, dmg: DMG.orb };
}

export function mine(x, y, vx, vy) {
  return { type: 'mine', x, y, vx, vy, r: 15, t: 0, fuse: -1, hp: 1, dmg: DMG.mine, life: 4.8 };
}

// 탄비 경고 기둥 (피해 없음)
export function colwarn(x, w, life) {
  return { type: 'colwarn', x, w, t: 0, life, dmg: 0 };
}

export function blast(x, y, r) {
  return { type: 'blast', x, y, r, t: 0, life: 0.35, hitDone: false, dmg: DMG.mine };
}

// 각 위험 요소 갱신. false를 반환하면 제거.
export function updateHazard(h, dt, game) {
  h.t += dt;
  const p = game.player;
  switch (h.type) {
    case 'laserH':
    case 'laserV': {
      if (!h.fired && h.t >= h.tele) {
        h.fired = true;
        game.sfx.laser();
        game.fx.shake(9);
        if (h.type === 'laserH') {
          game.fx.spark(ARENA.left, h.y, 0, 16, '#ff6a9a', 900, 0.3, 0.25);
          game.fx.spark(ARENA.right, h.y, Math.PI, 16, '#ff6a9a', 900, 0.3, 0.25);
        } else {
          game.fx.spark(h.x, ARENA.floor, -Math.PI / 2, 22, '#ff6a9a', 900, 0.5, 0.3);
        }
      } else if (!h.fired && h.t < h.tele) {
        if (h.t < dt * 1.5) game.sfx.telegraph();
      }
      return h.t < h.tele + h.active + 0.18;
    }
    case 'shock': {
      h.x += h.dir * h.speed * dt;
      if (Math.random() < 0.6) game.fx.spark(h.x, ARENA.floor - 4, -Math.PI / 2 - h.dir * 0.4, 1, '#f0cf86', 400, 0.5, 0.25);
      return h.x > ARENA.left - 40 && h.x < ARENA.right + 40;
    }
    case 'orb': {
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      return h.x > ARENA.left - 30 && h.x < ARENA.right + 30 && h.y > ARENA.top - 30 && h.y < ARENA.floor + 10 && h.t < 8;
    }
    case 'mine': {
      // 처음엔 퍼져 나가다가 점점 플레이어 쪽으로 천천히 끌려감
      h.vx *= 1 - dt * 2.2;
      h.vy *= 1 - dt * 2.2;
      if (h.t > 0.6 && h.fuse < 0) {
        const a = Math.atan2(p.y - h.y, p.x - h.x);
        h.vx += Math.cos(a) * 140 * dt;
        h.vy += Math.sin(a) * 140 * dt;
        const sp = Math.hypot(h.vx, h.vy);
        const cap = 110 * (h.slow || 1);
        if (sp > cap) { h.vx *= cap / sp; h.vy *= cap / sp; }
        if (Math.hypot(p.x - h.x, p.y - h.y) < 70) h.fuse = 0.5;
      }
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.x = Math.max(ARENA.left + h.r, Math.min(ARENA.right - h.r, h.x));
      h.y = Math.max(ARENA.top + h.r, Math.min(ARENA.floor - h.r, h.y));
      if (h.fuse >= 0) {
        h.fuse -= dt;
        if (h.fuse <= 0) { game.explodeMine(h, false); return false; }
      }
      if (h.t > h.life) { game.explodeMine(h, false); return false; }
      return !h.dead;
    }
    case 'blast':
      return h.t < h.life;
    case 'colwarn':
      return h.t < h.life;
    default:
      return false;
  }
}

// 플레이어와 닿았는지
export function hazardHits(h, p) {
  switch (h.type) {
    case 'laserH':
      return h.fired && h.t < h.tele + h.active && Math.abs(p.y - h.y) < h.w / 2 + p.r * 0.7;
    case 'laserV':
      return h.fired && h.t < h.tele + h.active && Math.abs(p.x - h.x) < h.w / 2 + p.r * 0.7;
    case 'shock':
      return p.y + p.r > ARENA.floor - h.h && Math.abs(p.x - h.x) < 24 + p.r * 0.6;
    case 'orb':
      return Math.hypot(p.x - h.x, p.y - h.y) < h.r + p.r * 0.75;
    case 'mine':
      return false; // 기뢰는 폭발로만 피해
    case 'blast':
      return !h.hitDone && h.t < 0.12 && Math.hypot(p.x - h.x, p.y - h.y) < h.r + p.r * 0.5;
    default:
      return false;
  }
}

export function drawHazard(g, h, t) {
  switch (h.type) {
    case 'laserH':
    case 'laserV': {
      const horiz = h.type === 'laserH';
      if (!h.fired) {
        const k = h.t / h.tele;
        const pulse = 0.4 + 0.6 * Math.abs(Math.sin(t * (10 + k * 20)));
        g.fillStyle = `rgba(255,54,100,${0.06 + k * 0.1})`;
        if (horiz) g.fillRect(ARENA.left, h.y - h.w / 2, ARENA.right - ARENA.left, h.w);
        else g.fillRect(h.x - h.w / 2, ARENA.top, h.w, ARENA.floor - ARENA.top);
        g.strokeStyle = `rgba(255,80,120,${0.35 + pulse * 0.5})`;
        g.lineWidth = 2;
        g.setLineDash([18, 10]);
        g.beginPath();
        if (horiz) { g.moveTo(ARENA.left, h.y); g.lineTo(ARENA.right, h.y); }
        else { g.moveTo(h.x, ARENA.top); g.lineTo(h.x, ARENA.floor); }
        g.stroke();
        g.setLineDash([]);
        // 양 끝 경고 삼각형
        g.fillStyle = `rgba(255,100,140,${pulse})`;
        if (horiz) {
          tri(g, ARENA.left + 4, h.y, 1); tri(g, ARENA.right - 4, h.y, -1);
        }
      } else {
        const at = h.t - h.tele;
        const fade = at > h.active ? 1 - (at - h.active) / 0.18 : 1;
        const wob = 1 + Math.sin(t * 60) * 0.08;
        const ww = h.w * wob * (at < 0.05 ? at / 0.05 : 1);
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = `rgba(255,40,100,${0.35 * fade})`;
        if (horiz) g.fillRect(ARENA.left, h.y - ww, ARENA.right - ARENA.left, ww * 2);
        else g.fillRect(h.x - ww, ARENA.top, ww * 2, ARENA.floor - ARENA.top);
        g.fillStyle = `rgba(255,130,170,${0.8 * fade})`;
        if (horiz) g.fillRect(ARENA.left, h.y - ww / 2, ARENA.right - ARENA.left, ww);
        else g.fillRect(h.x - ww / 2, ARENA.top, ww, ARENA.floor - ARENA.top);
        g.fillStyle = `rgba(255,244,248,${fade})`;
        if (horiz) g.fillRect(ARENA.left, h.y - ww / 6, ARENA.right - ARENA.left, ww / 3);
        else g.fillRect(h.x - ww / 6, ARENA.top, ww / 3, ARENA.floor - ARENA.top);
        g.globalCompositeOperation = 'source-over';
      }
      break;
    }
    case 'shock': {
      const y = ARENA.floor;
      g.globalCompositeOperation = 'lighter';
      const grd = g.createLinearGradient(h.x, y - h.h, h.x, y);
      grd.addColorStop(0, 'rgba(240,200,130,0)');
      grd.addColorStop(1, 'rgba(240,200,130,0.9)');
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(h.x - 34 * h.dir, y);
      g.quadraticCurveTo(h.x - 6 * h.dir, y - h.h * 1.1, h.x + 20 * h.dir, y);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(255,244,220,0.9)';
      g.fillRect(h.x - 30, y - 4, 60, 4);
      g.globalCompositeOperation = 'source-over';
      break;
    }
    case 'orb': {
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = 'rgba(255,50,110,0.35)';
      g.beginPath(); g.arc(h.x, h.y, h.r * 1.9, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ff4d7e';
      g.beginPath(); g.arc(h.x, h.y, h.r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff0f4';
      g.beginPath(); g.arc(h.x, h.y, h.r * 0.45, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'source-over';
      break;
    }
    case 'mine': {
      const armed = h.fuse >= 0;
      const blinkRate = armed ? 30 : h.t > h.life - 1.2 ? 16 : 4;
      const on = Math.sin(t * blinkRate) > 0;
      g.save();
      g.translate(h.x, h.y);
      g.rotate(h.t * 2);
      g.fillStyle = '#2a1826';
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const rr = i % 2 === 0 ? h.r + 5 : h.r;
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
      g.strokeStyle = '#c9a35a';
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = on ? '#ff3d6e' : '#4a1428';
      g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.fill();
      g.restore();
      if (armed) {
        g.strokeStyle = 'rgba(255,60,110,0.5)';
        g.lineWidth = 2;
        g.beginPath(); g.arc(h.x, h.y, 95, 0, Math.PI * 2); g.stroke();
      }
      break;
    }
    case 'colwarn': {
      const k = h.t / h.life;
      const a = 0.12 + 0.18 * Math.abs(Math.sin(t * 18));
      g.fillStyle = `rgba(255,54,100,${a * (0.5 + k * 0.5)})`;
      g.fillRect(h.x - h.w / 2 + 2, ARENA.top, h.w - 4, ARENA.floor - ARENA.top);
      g.fillStyle = `rgba(255,120,160,${0.5 + 0.5 * k})`;
      g.beginPath();
      g.moveTo(h.x - 8, ARENA.top + 6); g.lineTo(h.x + 8, ARENA.top + 6); g.lineTo(h.x, ARENA.top + 20); g.closePath(); g.fill();
      break;
    }
    case 'blast': {
      const k = h.t / h.life;
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = `rgba(255,90,140,${(1 - k) * 0.6})`;
      g.beginPath(); g.arc(h.x, h.y, h.r * (0.6 + k * 0.5), 0, Math.PI * 2); g.fill();
      g.fillStyle = `rgba(255,240,220,${(1 - k) * 0.8})`;
      g.beginPath(); g.arc(h.x, h.y, h.r * 0.4 * (1 - k), 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'source-over';
      break;
    }
    default:
  }
}

function tri(g, x, y, dir) {
  g.beginPath();
  g.moveTo(x, y - 12); g.lineTo(x + dir * 18, y); g.lineTo(x, y + 12); g.closePath(); g.fill();
}

export const ARENA_W = W;
