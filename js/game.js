// 전투 진행: 갱신, 충돌, 그리기
import { W, H, ARENA, BOSS, PLAYER, ULT } from './config.js';
import { Player } from './player.js';
import { Boss } from './boss.js';
import { FX } from './fx.js';
import { updateHazard, hazardHits, drawHazard, blast } from './hazards.js';
import { input, altPressed } from './input.js';
import { buildBackground, buildVignette, Motes } from './render.js';
import { weaponDef } from './weapons.js';
import { BOSSES, DUMMY } from './bosses.js';
import { Tutorial } from './tutorial.js';

export class Game {
  constructor(sfx) {
    this.sfx = sfx;
    this.fx = new FX();
    this.bg = buildBackground();
    this.vignette = buildVignette();
    this.motes = new Motes();
    this.lastDraw = 0;
    this.state = 'idle';
    this.time = 0;
    this.player = null;
    this.boss = new Boss(BOSSES[BOSSES.length - 1]); // 타이틀 화면 전시용
    this.tutorial = null;
    this.targets = [];
    this.rings = [];
    this.mode = 'boss';
    this.hazards = [];
    this.bullets = [];
    this.beams = [];
    this.banners = [];
    this.onEnd = null;
  }

  start(primary, alt, def, mode = 'boss') {
    this.mode = mode;
    this.player = new Player(primary, alt);
    this.boss = new Boss(mode === 'tutorial' ? DUMMY : def);
    this.targets = [];
    this.rings = [];
    this.hazards = [];
    this.bullets = [];
    this.beams = [];
    this.banners = [];
    this.fx.reset();
    this.time = 0;
    this.fightTime = 0;
    this.endTimer = 0;
    this.timeScale = 1;
    this.burst = 0;
    this.ult = 0;        // 극딜 게이지 0~100
    this.ultT = 0;       // 극딜 남은 시간
    this.ultUses = 0;
    this.dpsLog = [];
    this.stats = { damage: 0, taken: 0, bestBurst: 0, groggy: 0, maxHit: 0, time: 0 };
    this.state = 'play';
    this.ended = false;
    if (mode === 'tutorial') {
      this.boss.hidden = true;
      this.tutorial = new Tutorial();
      this.tutorial.start(this);
    } else {
      this.tutorial = null;
      this.banner(def.name, def.title, 2.0);
    }
  }

  activateUlt() {
    this.ult = 0;
    this.ultT = ULT.duration;
    this.ultUses++;
    const p = this.player;
    p.shells = p.aDef.shells;
    p.heat = 0;
    p.overheat = false;
    this.sfx.groggy();
    this.fx.shake(14);
    this.fx.doFlash(0.3, '255,214,150');
    this.fx.ring(p.x, p.y, 20, 160, 0.45, '255,214,150', 8);
    this.fx.spark(p.x, p.y, 0, 30, '#ffe6b0', 700, Math.PI, 0.4);
  }

  onTutorialFinish() {
    this.state = 'tutorialDone';
    if (this.onTutorialDone) this.onTutorialDone();
  }

  banner(title, sub, life = 1.5) {
    this.banners.push({ title, sub, t: 0, life });
  }

  onBossDamage(d, x, y, groggy) {
    this.stats.damage += d;
    if (d > this.stats.maxHit) this.stats.maxHit = d;
    if (groggy) this.burst += d;
    if (this.ultT <= 0 && this.ult < 100) {
      this.ult = Math.min(100, this.ult + (d / (this.boss.maxHp * ULT.fillRatio)) * 100);
      if (this.ult >= 100) { this.sfx.reload(); this.banner('극딜 준비', 'F키를 누르세요', 1.0); }
    }
    this.dpsLog.push({ t: this.time, d });
    this.fx.number(x, y, d, groggy, d >= 200);
  }

  endBurst() {
    if (this.burst > 0) {
      this.stats.groggy++;
      if (this.burst > this.stats.bestBurst) this.stats.bestBurst = this.burst;
      this.banner(`극딜 ${Math.round(this.burst).toLocaleString()}`, '그로기 구간 누적 피해', 1.6);
    }
    this.burst = 0;
  }

  onBossDead() {
    if (this.boss.groggy || this.burst > 0) this.endBurst();
    this.stats.time = this.fightTime;
    this.state = 'victory';
    this.endTimer = 0;
    this.timeScale = 0.3;
    this.sfx.bossDown();
    this.fx.doFlash(0.6, '255,236,214');
    this.fx.shake(30);
    // 남은 위험 요소 정리
    for (const h of this.hazards) h.dead = true;
  }

  explodeMine(m, byPlayer) {
    if (m.dead) return;
    m.dead = true;
    const bl = blast(m.x, m.y, 95);
    bl.dmg = m.dmg;
    this.hazards.push(bl);
    if (this.tutorial) this.tutorial.onMine(m, byPlayer, this);
    this.sfx.explode();
    this.fx.shake(10);
    this.fx.ring(m.x, m.y, 10, 110, 0.35, '255,90,140', 7);
    this.fx.spark(m.x, m.y, 0, 24, '#ffcf86', 700, Math.PI, 0.4);
    this.fx.smoke(m.x, m.y, 5, '70,46,62', 26, 1.0);
    const b = this.boss;
    if (!b.hidden && Math.hypot(b.x - m.x, b.y - m.y) < 95 + b.r) {
      // 기뢰를 보스 근처에서 터뜨리면 큰 피해 + 그로기
      b.takeDamage(byPlayer ? 340 : 200, 16, m.x, m.y, this);
    }
    // 연쇄 폭발
    for (const h of this.hazards) {
      if (h.type === 'mine' && !h.dead && h.fuse < 0 && Math.hypot(h.x - m.x, h.y - m.y) < 110) { h.fuse = 0.12; h.chain = byPlayer || m.chain; }
    }
  }

  update(rawDt) {
    if (this.state === 'idle' || this.state === 'pause') return;
    if (this.fx.hitstop > 0) {
      this.fx.hitstop -= rawDt;
      this.fx.update(rawDt * 0.2);
      return;
    }
    // 결과 연출 중 슬로우모션 복귀
    if (this.timeScale < 1) this.timeScale = Math.min(1, this.timeScale + rawDt * 0.6);
    const dt = rawDt * this.timeScale;
    this.time += dt;
    if (this.state === 'play' && this.mode === 'boss' && this.boss.state !== 'intro') this.fightTime += dt;

    const p = this.player;
    const b = this.boss;
    const groggy = b.groggy;

    // 플레이어
    const canAct = this.state === 'play';
    // 극딜 스킬 발동
    if (canAct && input.pressed.has('KeyF') && this.ult >= 100 && this.ultT <= 0) this.activateUlt();
    if (this.ultT > 0) {
      this.ultT -= dt;
      if (this.ultT <= 0) { this.ultT = 0; this.sfx.reload(); }
    }
    p.ultActive = this.ultT > 0;
    const recoilMul = p.ultActive ? 0 : groggy ? BOSS.groggyRecoilMul : 1;
    const heatMul = p.ultActive ? 0 : groggy ? 0.5 : 1;
    const shots = p.update(dt, canAct ? input : { ...input, left: false }, canAct && altPressed(), recoilMul, heatMul, this.sfx, this.fx);
    for (const s of shots) this.spawnShot(s);

    // 보스
    if (!b.hidden) b.update(dt, this);
    if (this.tutorial) this.tutorial.update(dt, this);

    // 탄환
    this.updateBullets(dt);
    for (const bm of this.beams) bm.life -= dt;
    this.beams = this.beams.filter((bm) => bm.life > 0);

    // 위험 요소
    const keep = [];
    for (const h of this.hazards) {
      if (updateHazard(h, dt, this) && !h.dead) keep.push(h);
    }
    this.hazards = keep;

    if (this.state === 'play' && !p.dead) {
      for (const h of this.hazards) {
        if (hazardHits(h, p)) {
          const hx = h.x !== undefined ? h.x : p.x;
          const hy = h.y !== undefined ? h.y : ARENA.floor;
          if (p.hurt(h.dmg, this.fx, this.sfx, hx, hy)) {
            if (h.type === 'orb') h.t = 99;
            if (h.type === 'blast') h.hitDone = true;
            if (this.tutorial) {
              // 튜토리얼에서는 체력이 줄지 않음
              p.hp = PLAYER.maxHp;
              p.dead = false;
              this.tutorial.onHit(this, h);
            } else {
              this.stats.taken += h.dmg;
            }
          }
        }
      }
      // 보스 몸통: 단단한 물체 + 접촉 피해
      if (!b.dead && !b.hidden) {
        const dx = p.x - b.x, dy = p.y - b.y;
        const d = Math.hypot(dx, dy) || 1;
        const minD = b.r * 0.95 + p.r;
        if (d < minD) {
          const nx = dx / d, ny = dy / d;
          const cd = b.contactDamage;
          if (cd > 0 && p.hurt(cd, this.fx, this.sfx, b.x, b.y)) this.stats.taken += cd;
          p.x = b.x + nx * minD;
          p.y = b.y + ny * minD;
          const vn = p.vx * nx + p.vy * ny;
          if (vn < 0) { p.vx -= vn * nx * 1.4; p.vy -= vn * ny * 1.4; }
          if (p.y > ARENA.floor - p.r) p.y = ARENA.floor - p.r;
        }
      }
      if (p.dead) {
        this.state = 'defeat';
        this.endTimer = 0;
        this.timeScale = 0.3;
        this.stats.time = this.fightTime;
        this.banner('패배', '다시 도전해 보세요', 2.0);
      }
    }

    // DPS 로그 정리
    while (this.dpsLog.length && this.time - this.dpsLog[0].t > 2) this.dpsLog.shift();

    for (const bn of this.banners) bn.t += rawDt;
    this.banners = this.banners.filter((bn) => bn.t < bn.life);

    this.fx.update(dt);

    if (this.state === 'victory' || this.state === 'defeat') {
      this.endTimer += rawDt;
      const wait = this.state === 'victory' ? 3.4 : 2.2;
      if (this.endTimer > wait && !this.ended) {
        this.ended = true;
        if (this.onEnd) this.onEnd(this.state === 'victory', this.stats);
      }
    }
  }

  get dps() {
    let s = 0;
    for (const e of this.dpsLog) if (this.time - e.t <= 1.5) s += e.d;
    return s / 1.5;
  }

  spawnShot(s) {
    if (s.kind === 'beam') {
      this.fireBeam(s);
      return;
    }
    this.bullets.push({
      x: s.x, y: s.y, vx: Math.cos(s.a) * s.speed, vy: Math.sin(s.a) * s.speed,
      life: s.life, damage: s.damage, stagger: s.stagger, size: s.size, kind: s.kind, heavy: s.heavy,
    });
  }

  fireBeam(s) {
    const b = this.boss;
    const dx = Math.cos(s.a), dy = Math.sin(s.a);
    // 벽까지 거리
    let tMax = 3000;
    if (dx > 0) tMax = Math.min(tMax, (ARENA.right - s.x) / dx);
    if (dx < 0) tMax = Math.min(tMax, (ARENA.left - s.x) / dx);
    if (dy > 0) tMax = Math.min(tMax, (ARENA.floor - s.y) / dy);
    if (dy < 0) tMax = Math.min(tMax, (ARENA.top - s.y) / dy);
    // 보스 관통
    for (const tg of this.targets) {
      const th = rayCircle(s.x, s.y, dx, dy, tg.x, tg.y, tg.r);
      if (!tg.dead && th !== null && th < tMax) this.hitTarget(tg, s.damage);
    }
    const hit = b.hidden ? null : rayCircle(s.x, s.y, dx, dy, b.x, b.y, b.r);
    if (hit !== null && hit < tMax && !b.dead) {
      const hx = s.x + dx * hit, hy = s.y + dy * hit;
      b.takeDamage(s.damage, s.stagger, hx, hy, this);
      this.sfx.bigHit();
      this.fx.spark(hx, hy, s.a + Math.PI, 20, '#fff0c8', 800, 0.8, 0.3);
      this.fx.stop(0.03);
    }
    for (const h of this.hazards) {
      if (h.type === 'mine' && !h.dead) {
        const mh = rayCircle(s.x, s.y, dx, dy, h.x, h.y, h.r + 12);
        if (mh !== null && mh < tMax) this.explodeMine(h, true);
      }
    }
    const ex = s.x + dx * tMax, ey = s.y + dy * tMax;
    this.fx.spark(ex, ey, s.a + Math.PI, 12, '#ffe6b0', 600, 0.9, 0.25);
    this.beams.push({ x1: s.x, y1: s.y, x2: ex, y2: ey, life: 0.16, max: 0.16 });
  }

  hitTarget(tg, dmg) {
    tg.hp -= dmg;
    tg.flash = 0.06;
    this.fx.number(tg.x, tg.y - tg.r, dmg, false, false);
    if (tg.hp <= 0) {
      tg.dead = true;
      this.sfx.explode();
      this.fx.ring(tg.x, tg.y, 10, 80, 0.35, '240,200,130', 6);
      this.fx.spark(tg.x, tg.y, 0, 20, '#ffe6b0', 600, Math.PI, 0.4);
      this.fx.debris(tg.x, tg.y, 8, '#4a2a3a');
    }
  }

  updateBullets(dt) {
    const b = this.boss;
    for (const bl of this.bullets) {
      const ox = bl.x, oy = bl.y;
      bl.x += bl.vx * dt;
      bl.y += bl.vy * dt;
      bl.life -= dt;
      // 연습 과녁
      let hitT = false;
      for (const tg of this.targets) {
        if (!tg.dead && segCircle(ox, oy, bl.x, bl.y, tg.x, tg.y, tg.r)) {
          this.hitTarget(tg, bl.damage);
          bl.life = 0;
          hitT = true;
          this.fx.spark(bl.x, bl.y, Math.atan2(-bl.vy, -bl.vx), 4, '#ffe6b0', 400, 0.7, 0.2);
          this.sfx.hit();
          break;
        }
      }
      if (hitT) continue;
      // 보스 충돌 (선분-원)
      if (!b.dead && !b.hidden && segCircle(ox, oy, bl.x, bl.y, b.x, b.y, b.r)) {
        b.takeDamage(bl.damage, bl.stagger, bl.x, bl.y, this);
        bl.life = 0;
        const back = Math.atan2(-bl.vy, -bl.vx);
        this.fx.spark(bl.x, bl.y, back, bl.heavy ? 10 : 4, '#ffe6b0', 500, 0.7, 0.2);
        if (bl.heavy) this.sfx.bigHit(); else this.sfx.hit();
        continue;
      }
      // 기뢰 충돌
      for (const h of this.hazards) {
        if (h.type === 'mine' && !h.dead && segCircle(ox, oy, bl.x, bl.y, h.x, h.y, h.r + 12)) {
          this.explodeMine(h, true);
          bl.life = 0;
          break;
        }
      }
      if (bl.life <= 0) continue;
      if (bl.x < ARENA.left || bl.x > ARENA.right || bl.y < ARENA.top || bl.y > ARENA.floor) {
        bl.life = 0;
        const nx = Math.max(ARENA.left, Math.min(ARENA.right, bl.x));
        const ny = Math.max(ARENA.top, Math.min(ARENA.floor, bl.y));
        this.fx.spark(nx, ny, Math.atan2(-bl.vy, -bl.vx), 3, '#c9a35a', 300, 0.8, 0.15);
      }
    }
    this.bullets = this.bullets.filter((bl) => bl.life > 0);
  }

  // ───────── 그리기 ─────────
  draw(g, t) {
    const fdt = this.lastDraw ? Math.min(0.05, t - this.lastDraw) : 0;
    this.lastDraw = t;
    g.drawImage(this.bg, 0, 0);
    this.motes.draw(g, t, this.state === 'pause' ? 0 : fdt);
    if (!this.player) {
      // 타이틀 화면용 보스 전시
      const b = this.boss;
      const ox = b.x, oy = b.y;
      b.x = 1130; b.y = 400;
      b.ringRot = t * 0.5;
      b.eyeA = Math.PI * 0.85;
      b.draw(g, t);
      b.x = ox; b.y = oy;
      g.drawImage(this.vignette, 0, 0);
      return;
    }

    const sh = this.fx.shakeAmt;
    g.save();
    if (sh > 0) g.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);

    this.boss.drawTelegraph(g, t);
    for (const h of this.hazards) if (h.type === 'laserH' || h.type === 'laserV' || h.type === 'shock') drawHazard(g, h, t);

    this.boss.draw(g, t);
    if (this.tutorial) this.tutorial.drawWorld(g, t, this);

    for (const h of this.hazards) if (h.type === 'mine') drawHazard(g, h, t);

    // 플레이어 탄
    g.globalCompositeOperation = 'lighter';
    for (const bl of this.bullets) {
      const len = bl.heavy ? 0.03 : 0.018;
      g.strokeStyle = bl.kind === 'pellet' ? 'rgba(255,220,170,0.95)' : 'rgba(255,225,160,0.95)';
      g.lineWidth = bl.size;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(bl.x, bl.y);
      g.lineTo(bl.x - bl.vx * len, bl.y - bl.vy * len);
      g.stroke();
    }
    for (const bm of this.beams) {
      const k = bm.life / bm.max;
      g.strokeStyle = `rgba(255,200,140,${0.5 * k})`;
      g.lineWidth = 18 * k;
      g.beginPath(); g.moveTo(bm.x1, bm.y1); g.lineTo(bm.x2, bm.y2); g.stroke();
      g.strokeStyle = `rgba(255,245,220,${k})`;
      g.lineWidth = 5 * k;
      g.beginPath(); g.moveTo(bm.x1, bm.y1); g.lineTo(bm.x2, bm.y2); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';

    if (this.ultT > 0) {
      const p = this.player;
      g.globalCompositeOperation = 'lighter';
      const ag = g.createRadialGradient(p.x, p.y - 6, 4, p.x, p.y - 6, 70);
      ag.addColorStop(0, `rgba(255,214,150,${0.45 + 0.15 * Math.sin(t * 20)})`);
      ag.addColorStop(1, 'rgba(255,90,140,0)');
      g.fillStyle = ag;
      g.beginPath(); g.arc(p.x, p.y - 6, 70, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'source-over';
    }
    if (!this.player.dead || Math.floor(t * 10) % 2 === 0) this.player.draw(g, t);

    this.fx.drawWorld(g);
    for (const h of this.hazards) if (h.type === 'orb' || h.type === 'blast') drawHazard(g, h, t);
    this.fx.drawNumbers(g);

    g.restore();

    g.drawImage(this.vignette, 0, 0);

    if (this.ultT > 0) {
      g.strokeStyle = `rgba(255,90,140,${0.35 + 0.15 * Math.sin(t * 16)})`;
      g.lineWidth = 16;
      g.strokeRect(8, 8, W - 16, H - 16);
    }
    // 그로기 중 화면 테두리 강조
    if (this.boss.groggy) {
      const a = 0.25 + 0.1 * Math.sin(t * 8);
      g.strokeStyle = `rgba(255,236,200,${a})`;
      g.lineWidth = 10;
      g.strokeRect(5, 5, W - 10, H - 10);
    }

    this.drawHud(g, t);
    this.drawBanners(g);
    if (this.state === 'play') this.drawCrosshair(g, t);

    if (this.fx.flash > 0) {
      g.fillStyle = `rgba(${this.fx.flashColor},${this.fx.flash * 0.5})`;
      g.fillRect(0, 0, W, H);
    }
  }

  drawHud(g, t) {
    const b = this.boss;
    const p = this.player;
    const font = (w, s) => `${w} ${s}px "Cinzel", "Noto Serif KR", serif`;

    if (!b.hidden) this.drawBossBar(g, t);
    if (this.tutorial) this.tutorial.drawHud(g, t, this);

    // 타이머 (보스전만)
    if (this.mode === 'boss') {
      g.textAlign = 'right';
      g.font = font(700, 22);
      g.fillStyle = '#e9e2d6';
      g.fillText(formatTime(this.fightTime), W - 60, 50);
    }

    // 키 안내 (항상 오른쪽 위)
    g.font = '500 13px "Noto Sans KR", sans-serif';
    const keys = [['좌클릭', '연사'], ['우클릭 / Space', '산탄 (반동 이동)'], ['F', '극딜 (게이지 가득)'], ['R', '재시작'], ['Esc', '일시정지']];
    let ky = this.mode === 'boss' ? 78 : 50;
    for (const [k, v] of keys) {
      g.fillStyle = 'rgba(16,6,16,0.55)';
      g.fillRect(W - 330, ky - 14, 274, 19);
      g.textAlign = 'right';
      g.fillStyle = '#f0d08a';
      g.fillText(k, W - 200, ky);
      g.textAlign = 'left';
      g.fillStyle = '#d8cfc4';
      g.fillText(v, W - 188, ky);
      ky += 21;
    }

    this.drawPlayerHud(g);
  }

  drawBossBar(g, t) {
    const b = this.boss;
    const font = (w, s) => `${w} ${s}px "Cinzel", "Noto Serif KR", serif`;
    const bw = 900, bh = 18, bx = (W - bw) / 2, by = 64;
    g.fillStyle = 'rgba(16,6,16,0.72)';
    g.fillRect(bx - 4, by - 30, bw + 8, bh + 46);
    g.textBaseline = 'alphabetic';
    g.textAlign = 'left';
    g.fillStyle = '#e9e2d6';
    g.font = font(700, 18);
    g.fillText(b.name, bx, by - 9);
    const nameW = g.measureText(b.name).width;
    g.fillStyle = b.phase === 2 ? '#ff5a8a' : '#a89aa4';
    g.font = font(600, 14);
    const label = b.def.phase2At ? (b.phase === 2 ? 'PHASE 2' : 'PHASE 1') : (b.def.title || '');
    g.fillText(label, bx + nameW + 18, by - 9);
    g.textAlign = 'right';
    g.fillStyle = '#e9e2d6';
    g.font = font(700, 16);
    if (b.def.id !== 'dummy') g.fillText(`${Math.ceil(b.hp).toLocaleString()} / ${b.maxHp.toLocaleString()}`, bx + bw, by - 9);

    g.fillStyle = '#1c0e1a';
    g.fillRect(bx, by, bw, bh);
    const hpK = b.hp / b.maxHp;
    const trK = b.trailHp / b.maxHp;
    g.fillStyle = 'rgba(255,240,220,0.85)';
    g.fillRect(bx, by, bw * trK, bh);
    const hpGrad = g.createLinearGradient(0, by, 0, by + bh);
    if (b.phase === 2) { hpGrad.addColorStop(0, '#ff5a8a'); hpGrad.addColorStop(1, '#9c1a46'); }
    else { hpGrad.addColorStop(0, '#f2d48e'); hpGrad.addColorStop(1, '#b88a3c'); }
    g.fillStyle = hpGrad;
    g.fillRect(bx, by, bw * hpK, bh);
    // 눈금
    g.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 1; i < 20; i++) g.fillRect(bx + (bw / 20) * i, by, 1, bh);
    if (b.def.phase2At) {
      g.fillStyle = '#e9e2d6';
      g.fillRect(bx + bw * b.def.phase2At - 1, by - 4, 2, bh + 8);
    }

    // 그로기 게이지
    const sy = by + bh + 6;
    g.fillStyle = '#1c0e1a';
    g.fillRect(bx, sy, bw, 7);
    if (b.groggy) {
      const k = Math.max(0, b.groggyT / (b.groggyMax || BOSS.groggyTime));
      g.fillStyle = `rgba(255,224,140,${0.8 + 0.2 * Math.sin(t * 12)})`;
      g.fillRect(bx, sy, bw * k, 7);
      g.textAlign = 'left';
      g.font = font(700, 13);
      g.fillStyle = '#ffe08c';
      g.fillText(b.groggyT > 100 ? 'GROGGY' : `GROGGY ${b.groggyT.toFixed(1)}s`, bx, sy + 22);
    } else {
      const k = Math.min(1, b.stagger / b.staggerMax);
      g.fillStyle = '#c9a35a';
      g.fillRect(bx, sy, bw * k, 7);
      g.textAlign = 'left';
      g.font = font(600, 13);
      g.fillStyle = '#8f8a80';
      g.fillText('그로기', bx, sy + 22);
    }
    g.textAlign = 'right';
    g.font = font(600, 14);
    g.fillStyle = '#b8b0a2';
    g.fillText(`DPS ${Math.round(this.dps).toLocaleString()}`, bx + bw, sy + 22);

    // 극딜 누적
    if (b.groggy && this.burst > 0) {
      g.textAlign = 'center';
      g.font = font(700, 44);
      g.lineWidth = 6;
      g.strokeStyle = 'rgba(16,6,16,0.9)';
      const txt = Math.round(this.burst).toLocaleString();
      g.strokeText(txt, W / 2, by + 92);
      g.fillStyle = '#ffd27a';
      g.fillText(txt, W / 2, by + 92);
      g.font = font(600, 14);
      g.fillStyle = '#e6c88a';
      g.fillText('극딜 누적', W / 2, by + 110);
    }
  }

  drawPlayerHud(g) {
    const p = this.player;
    const font = (w, s) => `${w} ${s}px "Cinzel", "Noto Serif KR", serif`;
    // 플레이어 정보
    const px = 64, py = H - 44;
    g.fillStyle = 'rgba(16,6,16,0.72)';
    g.fillRect(px - 12, py - 34, 360, 74);
    g.textAlign = 'left';
    g.font = font(700, 14);
    g.fillStyle = '#e9e2d6';
    g.fillText('HP', px, py - 14);
    g.fillStyle = '#1c0e1a';
    g.fillRect(px + 30, py - 26, 300, 14);
    const hpk = Math.min(1, p.hp / PLAYER.maxHp);
    g.fillStyle = hpk > 0.35 ? '#d8d2c6' : '#ff4d7e';
    g.fillRect(px + 30, py - 26, 300 * hpk, 14);
    g.fillStyle = '#1c0e1a';
    g.fillText('', 0, 0);
    g.font = font(700, 12);
    g.fillStyle = '#121214';
    g.fillText(`${Math.ceil(p.hp)}`, px + 34, py - 15);

    g.font = font(700, 14);
    g.fillStyle = p.overheat ? '#ff4d7e' : '#e9e2d6';
    g.fillText(p.overheat ? '과열' : '열', px, py + 8);
    g.fillStyle = '#1c0e1a';
    g.fillRect(px + 30, py - 2, 300, 8);
    g.fillStyle = p.overheat ? '#ff4d7e' : p.heat > 0.7 ? '#f0b860' : '#a8a196';
    g.fillRect(px + 30, py - 2, 300 * p.heat, 8);

    g.fillStyle = '#e9e2d6';
    g.fillText('산탄', px, py + 30);
    for (let i = 0; i < p.aDef.shells; i++) {
      g.fillStyle = i < p.shells ? '#e8c88a' : '#2b2b2f';
      g.fillRect(px + 40 + i * 22, py + 16, 16, 18);
    }
    g.font = font(600, 12);
    g.fillStyle = '#8f8a80';
    g.fillText(`${weaponDef(p.primary).name} / ${weaponDef(p.alt).name}`, px + 40 + p.aDef.shells * 22 + 8, py + 30);

    // 극딜 게이지
    const t = performance.now() / 1000;
    const cx = px + 410, cy = py + 2, R = 32;
    const ready = this.ult >= 100 && this.ultT <= 0;
    g.fillStyle = 'rgba(16,6,16,0.8)';
    g.beginPath(); g.arc(cx, cy, R + 8, 0, Math.PI * 2); g.fill();
    g.lineWidth = 7;
    g.strokeStyle = '#1c0e1a';
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    const k = this.ultT > 0 ? this.ultT / ULT.duration : this.ult / 100;
    g.strokeStyle = this.ultT > 0 ? '#ff5a8a' : ready ? `rgba(255,224,150,${0.75 + 0.25 * Math.sin(t * 8)})` : '#c9a35a';
    g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); g.stroke();
    if (ready) {
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = `rgba(255,214,150,${0.18 + 0.12 * Math.sin(t * 8)})`;
      g.beginPath(); g.arc(cx, cy, R + 14, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'source-over';
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if (this.ultT > 0) {
      g.font = font(700, 20);
      g.fillStyle = '#ff8ab0';
      g.fillText(this.ultT.toFixed(1), cx, cy + 1);
    } else {
      g.font = font(700, 22);
      g.fillStyle = ready ? '#ffe6b0' : '#6a5a64';
      g.fillText('F', cx, cy + 1);
    }
    g.textBaseline = 'alphabetic';
    g.font = '500 12px "Noto Sans KR", sans-serif';
    g.fillStyle = ready ? '#ffe6b0' : '#a89aa4';
    g.fillText(this.ultT > 0 ? '극딜 중' : ready ? '극딜 준비' : `극딜 ${Math.floor(this.ult)}%`, cx, cy + R + 24);
  }

  drawBanners(g) {
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    for (const bn of this.banners) {
      const k = bn.t / bn.life;
      const a = k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1;
      const y = H * 0.36;
      g.globalAlpha = a;
      g.fillStyle = 'rgba(16,6,16,0.6)';
      g.fillRect(0, y - 52, W, 84);
      g.font = '700 46px "Cinzel", "Noto Serif KR", serif';
      g.fillStyle = '#f2ebde';
      g.fillText(bn.title, W / 2, y);
      g.font = '500 16px "Noto Sans KR", sans-serif';
      g.fillStyle = '#c9bfae';
      g.fillText(bn.sub, W / 2, y + 22);
    }
    g.globalAlpha = 1;
  }

  drawCrosshair(g, t) {
    const p = this.player;
    const x = input.mx, y = input.my;
    const col = p.overheat ? '#ff4d7e' : '#f2ebde';
    g.strokeStyle = col;
    g.lineWidth = 2;
    const gap = 7, len = 8;
    g.beginPath();
    g.moveTo(x - gap - len, y); g.lineTo(x - gap, y);
    g.moveTo(x + gap, y); g.lineTo(x + gap + len, y);
    g.moveTo(x, y - gap - len); g.lineTo(x, y - gap);
    g.moveTo(x, y + gap); g.lineTo(x, y + gap + len);
    g.stroke();
    g.fillStyle = col;
    g.fillRect(x - 1, y - 1, 2, 2);
    // 과열 호
    if (p.heat > 0.02) {
      g.strokeStyle = p.overheat ? 'rgba(255,77,126,0.9)' : 'rgba(240,200,130,0.85)';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(x, y, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.heat);
      g.stroke();
    }
    // 산탄 점
    const n = p.aDef.shells;
    for (let i = 0; i < n; i++) {
      g.fillStyle = i < p.shells ? '#e8c88a' : 'rgba(80,80,86,0.8)';
      g.fillRect(x - (n * 10) / 2 + i * 10 + 1, y + 30, 7, 7);
    }
    if (this.ult >= 100 && this.ultT <= 0) {
      g.font = '700 13px "Cinzel", "Noto Serif KR", serif';
      g.textAlign = 'left';
      g.fillStyle = `rgba(255,230,176,${0.7 + 0.3 * Math.sin(t * 8)})`;
      g.fillText('F', x + 28, y - 18);
    }
    // 반동 방향 미리보기 (산탄을 쏘면 튕겨 나갈 방향)
    const a = p.aim + Math.PI;
    g.strokeStyle = 'rgba(240,200,130,0.35)';
    g.lineWidth = 2;
    g.setLineDash([6, 6]);
    g.beginPath();
    g.moveTo(p.x, p.y);
    g.lineTo(p.x + Math.cos(a) * 60, p.y + Math.sin(a) * 60);
    g.stroke();
    g.setLineDash([]);
  }
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s - m * 60;
  return `${String(m).padStart(2, '0')}:${sec.toFixed(2).padStart(5, '0')}`;
}

export { formatTime };

function segCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1;
  const fx = x1 - cx, fy = y1 - cy;
  const a = dx * dx + dy * dy;
  if (a === 0) return fx * fx + fy * fy <= r * r;
  let tt = -(fx * dx + fy * dy) / a;
  tt = Math.max(0, Math.min(1, tt));
  const px = fx + dx * tt, py = fy + dy * tt;
  return px * px + py * py <= r * r;
}

function rayCircle(ox, oy, dx, dy, cx, cy, r) {
  const fx = ox - cx, fy = oy - cy;
  const b = fx * dx + fy * dy;
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - c;
  if (disc < 0) return null;
  const tt = -b - Math.sqrt(disc);
  if (tt >= 0) return tt;
  const t2 = -b + Math.sqrt(disc);
  return t2 >= 0 ? 0 : null;
}
