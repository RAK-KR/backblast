// 보스 공통 동작. 보스별 수치와 패턴 목록은 bosses.js, 그림은 bossart.js
import { ARENA, BOSS, DMG } from './config.js';
import { laserH, laserV, shock, orb, mine } from './hazards.js';
import { ART } from './bossart.js';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Boss {
  constructor(def) {
    this.def = def;
    this.name = def.name;
    this.r = def.r;
    this.maxHp = def.maxHp;
    this.hidden = false;
    this.reset();
  }

  reset() {
    this.x = this.def.fixed ? this.def.fixed.x : 1150;
    this.y = -160;
    this.vx = 0;
    this.vy = 0;
    this.hp = this.maxHp;
    this.trailHp = this.maxHp;
    this.stagger = 0;
    this.staggerMax = this.def.staggerMax;
    this.phase = 1;
    this.state = 'intro';
    this.timer = 0;
    this.step = 0;
    this.queue = [];
    this.endAt = 0;
    this.lastPattern = '';
    this.sinceHit = 99;
    this.hitFlash = 0;
    this.ringRot = 0;
    this.open = 0;          // 그로기 연출 0~1
    this.groggyT = 0;
    this.groggyCount = 0;
    this.deadT = 0;
    this.eyeA = Math.PI;
    this.tx = this.x;
    this.ty = 260;
    this.chargeA = 0;
    this.chargeTele = 1;
    this.slamCount = 0;
    this.grounded = false;
    this.dashing = false;
  }

  // 현재 페이즈의 패턴 설정
  get cfg() {
    return this.phase === 2 && this.def.p2 ? this.def.p2 : this.def.p1;
  }

  get hovering() {
    return !['groggy', 'dead', 'slam', 'charge'].includes(this.state) || (this.state === 'slam' && this.step === 0);
  }

  get groggy() { return this.state === 'groggy'; }
  get dead() { return this.state === 'dead'; }

  get contactDamage() {
    if (this.state === 'groggy' || this.state === 'dead' || this.state === 'intro') return 0;
    const m = this.def.dmgMul;
    if (this.dashing) return Math.round(DMG.charge * m);
    if (this.state === 'slam' && this.step === 2) return Math.round(DMG.charge * m);
    return this.def.contact;
  }

  setState(s) {
    this.state = s;
    this.timer = 0;
    this.step = 0;
    this.queue = [];
    this.dashing = false;
    this.slamCount = 0;
  }

  pickAnchor(player) {
    if (this.def.fixed) { this.tx = this.def.fixed.x; this.ty = this.def.fixed.y; return; }
    const side = player.x < 800 ? 1 : -1;
    this.tx = clamp(800 + side * rand(150, 520), ARENA.left + 140, ARENA.right - 140);
    this.ty = rand(ARENA.top + this.r + 70, 340);
  }

  choosePattern() {
    const pool = this.cfg.pool;
    if (!pool.length) { this.timer = 0; return; }
    let p;
    let guard = 0;
    do { p = pool[Math.floor(Math.random() * pool.length)]; guard++; } while (p === this.lastPattern && guard < 10);
    this.lastPattern = p;
    this.setState(p);
  }

  schedule(at, fn) { this.queue.push({ at, fn, done: false }); }

  runQueue() {
    for (const q of this.queue) {
      if (!q.done && this.timer >= q.at) { q.done = true; q.fn(); }
    }
  }

  // 보스가 만든 위험 요소의 피해량은 보스 배율을 따름
  push(game, h) {
    h.dmg = Math.max(1, Math.round(h.dmg * this.def.dmgMul));
    game.hazards.push(h);
  }

  update(dt, game) {
    const p = game.player;
    this.timer += dt;
    this.sinceHit += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    const fast = this.phase === 2 ? 1.25 : 1;
    this.ringRot += dt * (this.groggy ? 0.2 : 0.6 * fast);

    if (this.trailHp > this.hp) {
      this.trailHp -= Math.max((this.trailHp - this.hp) * 2.2 * dt, 300 * dt);
      if (this.trailHp < this.hp) this.trailHp = this.hp;
    }

    const ea = Math.atan2(p.y - this.y, p.x - this.x);
    let diff = ea - this.eyeA;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.eyeA += diff * Math.min(1, dt * 6);

    this.open += ((this.groggy ? 1 : 0) - this.open) * Math.min(1, dt * 6);

    if (!this.groggy && this.sinceHit > 2.5) this.stagger = Math.max(0, this.stagger - 8 * dt);

    const glide = (k) => {
      this.x += (this.tx - this.x) * Math.min(1, dt * k);
      this.y += (this.ty - this.y) * Math.min(1, dt * k);
    };

    switch (this.state) {
      case 'intro': {
        if (this.timer < dt * 1.5) this.pickAnchor(p);
        glide(2.2);
        if (this.timer > 1.8) { this.pickAnchor(p); this.setState('move'); }
        break;
      }
      case 'move': {
        glide(2.6 * fast);
        if (this.timer > this.cfg.rest) this.choosePattern();
        break;
      }
      case 'phase': {
        this.x += Math.sin(this.timer * 70) * 2;
        if (this.timer > 1.3) { this.pickAnchor(p); this.setState('move'); }
        break;
      }
      case 'sweep': this.doSweep(dt, game); break;
      case 'slam': this.doSlam(dt, game); break;
      case 'radial': this.doRadial(dt, game); break;
      case 'mines': this.doMines(dt, game); break;
      case 'charge': this.doCharge(dt, game); break;
      case 'groggy': this.doGroggy(dt, game); break;
      case 'dead': this.doDead(dt, game); break;
      default:
    }

    this.x = clamp(this.x, ARENA.left + this.r, ARENA.right - this.r);
    if (this.state !== 'intro') this.y = Math.min(this.y, ARENA.floor - this.r);
  }

  doSweep(dt, game) {
    const p = game.player;
    const c = this.cfg.sweep;
    if (this.step === 0) {
      this.step = 1;
      const yOf = () => clamp(p.y, ARENA.top + 40, ARENA.floor - 24);
      for (const s of c.shots) {
        this.schedule(s.at, () => {
          if (s.v) this.push(game, laserV(clamp(p.x, ARENA.left + 40, ARENA.right - 40), c.tele + 0.15));
          else this.push(game, laserH(yOf(), c.tele));
        });
      }
      this.endAt = c.end;
    }
    this.y += (ARENA.top + this.r + 70 - this.y) * Math.min(1, dt * 2);
    this.runQueue();
    if (this.timer >= this.endAt) { this.pickAnchor(p); this.setState('move'); }
  }

  doSlam(dt, game) {
    const p = game.player;
    const c = this.cfg.slam;
    if (this.step === 0) {
      this.tx = p.x;
      this.ty = ARENA.top + this.r + 80;
      this.x += (this.tx - this.x) * Math.min(1, dt * 4.5);
      this.y += (this.ty - this.y) * Math.min(1, dt * 5);
      if (this.timer > c.track) { this.step = 1; this.timer = 0; game.sfx.telegraph(); }
    } else if (this.step === 1) {
      this.x += Math.sin(this.timer * 80) * 1.5;
      if (this.timer > c.tele) { this.step = 2; this.timer = 0; this.vy = 600; }
    } else if (this.step === 2) {
      this.vy += 5200 * dt;
      this.y += this.vy * dt;
      if (this.y >= ARENA.floor - this.r) {
        this.y = ARENA.floor - this.r;
        this.vy = 0;
        this.step = 3;
        this.timer = 0;
        this.push(game, shock(this.x - this.r * 0.6, -1, c.shock));
        this.push(game, shock(this.x + this.r * 0.6, 1, c.shock));
        game.sfx.slam();
        game.fx.shake(24);
        game.fx.stop(0.05);
        game.fx.debris(this.x, ARENA.floor - 6, 16);
        game.fx.smoke(this.x, ARENA.floor - 10, 10, '70,46,62', 30, 1.0);
        game.fx.ring(this.x, ARENA.floor, 30, 260, 0.4, '240,200,130', 8);
      }
    } else if (this.step === 3) {
      if (this.timer > 0.4) {
        this.slamCount++;
        if (this.slamCount < c.repeats) {
          this.step = 0; this.timer = 0;
        } else {
          this.pickAnchor(p);
          this.setState('move');
        }
      }
    }
  }

  doRadial(dt, game) {
    const p = game.player;
    const c = this.cfg.radial;
    if (this.step === 0) {
      this.step = 1;
      const base = Math.random() * Math.PI * 2;
      for (let w = 0; w < c.waves; w++) {
        this.schedule(0.5 + w * c.gap, () => {
          const off = base + w * (Math.PI / c.n);
          for (let i = 0; i < c.n; i++) {
            const a = off + (i / c.n) * Math.PI * 2;
            this.push(game, orb(this.x + Math.cos(a) * this.r * 0.8, this.y + Math.sin(a) * this.r * 0.8, Math.cos(a) * c.speed, Math.sin(a) * c.speed));
          }
          game.sfx.orb();
          game.fx.ring(this.x, this.y, this.r, this.r + 50, 0.25, '255,70,120', 4);
        });
      }
      this.endAt = 0.5 + c.waves * c.gap + 0.5;
    }
    this.runQueue();
    if (this.timer >= this.endAt) { this.pickAnchor(p); this.setState('move'); }
  }

  doMines(dt, game) {
    const p = game.player;
    const c = this.cfg.mines;
    if (this.step === 0) {
      this.step = 1;
      this.schedule(0.35, () => {
        const n = c.n;
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * Math.PI * 1.6) + rand(-0.1, 0.1);
          const s = rand(520, 720);
          this.push(game, mine(this.x, this.y, Math.cos(a) * s, Math.sin(a) * s + 120));
        }
        game.sfx.orb();
        game.fx.ring(this.x, this.y, this.r, this.r + 70, 0.3, '255,70,120', 5);
      });
      this.endAt = 1.5;
    }
    this.runQueue();
    if (this.timer >= this.endAt) { this.pickAnchor(p); this.setState('move'); }
  }

  doCharge(dt, game) {
    const p = game.player;
    const c = this.cfg.charge;
    this.chargeTele = c.tele;
    if (this.step === 0) {
      if (this.timer < c.tele - 0.25) this.chargeA = Math.atan2(p.y - this.y, p.x - this.x);
      if (this.timer < dt * 1.5) game.sfx.telegraph();
      this.x += Math.sin(this.timer * 60) * 1.2;
      if (this.timer > c.tele) {
        this.step = 1; this.timer = 0;
        this.vx = Math.cos(this.chargeA) * 2400;
        this.vy = Math.sin(this.chargeA) * 2400;
        this.dashing = true;
        game.sfx.blast();
      }
    } else if (this.step === 1) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (Math.random() < 0.7) game.fx.smoke(this.x - this.vx * 0.03, this.y - this.vy * 0.03, 1, '80,50,72', 26, 0.5);
      const hitWall = this.x <= ARENA.left + this.r || this.x >= ARENA.right - this.r ||
        this.y <= ARENA.top + this.r || this.y >= ARENA.floor - this.r;
      if (hitWall || this.timer > 1.2) {
        this.x = clamp(this.x, ARENA.left + this.r, ARENA.right - this.r);
        this.y = clamp(this.y, ARENA.top + this.r, ARENA.floor - this.r);
        this.dashing = false;
        this.step = 2; this.timer = 0;
        game.sfx.slam();
        game.fx.shake(20);
        game.fx.debris(this.x, this.y, 10);
        for (let i = 0; i < c.burst; i++) {
          const a = (i / c.burst) * Math.PI * 2;
          this.push(game, orb(this.x, this.y, Math.cos(a) * 280, Math.sin(a) * 280));
        }
        if (this.y >= ARENA.floor - this.r - 2) {
          this.push(game, shock(this.x - this.r * 0.6, -1, 700));
          this.push(game, shock(this.x + this.r * 0.6, 1, 700));
        }
      }
    } else if (this.step === 2) {
      if (this.timer > 0.55) { this.pickAnchor(p); this.setState('move'); }
    }
  }

  enterGroggy(game) {
    this.setState('groggy');
    this.groggyT = this.def.groggyTime || BOSS.groggyTime;
    this.groggyMax = this.groggyT;
    this.vy = 0;
    this.grounded = false;
    this.groggyCount++;
    game.burst = 0;
    for (const h of game.hazards) if ((h.type === 'laserH' || h.type === 'laserV') && !h.fired) h.dead = true;
    game.sfx.groggy();
    game.fx.shake(18);
    game.fx.doFlash(0.4, '255,236,200');
    game.fx.stop(0.12);
    game.fx.ring(this.x, this.y, this.r, this.r + 220, 0.6, '255,240,214', 10);
    game.fx.spark(this.x, this.y, 0, 40, '#ffe6b0', 900, Math.PI, 0.5);
    game.banner('GROGGY', '지금 몰아서 쏘세요', 1.6);
  }

  doGroggy(dt, game) {
    const p = game.player;
    if (!this.grounded) {
      this.vy += 2600 * dt;
      this.y += this.vy * dt;
      if (this.y >= ARENA.floor - this.r) {
        this.y = ARENA.floor - this.r;
        this.vy = 0;
        this.grounded = true;
        game.sfx.slam();
        game.fx.shake(16);
        game.fx.debris(this.x, ARENA.floor - 4, 12);
        game.fx.smoke(this.x, ARENA.floor - 10, 8, '70,46,62', 30, 1.0);
      }
    }
    if (Math.random() < 0.25) game.fx.spark(this.x + rand(-50, 50), this.y + rand(-50, 30), -Math.PI / 2 + rand(-1, 1), 2, '#ffe6b0', 300, 0.4, 0.4);
    this.groggyT -= dt;
    if (this.groggyT <= 0) {
      this.stagger = 0;
      this.staggerMax = this.def.staggerMax * (1 + this.groggyCount * 0.25);
      if (!this.def.noRiseShock) {
        this.push(game, shock(this.x - this.r * 0.6, -1, 640));
        this.push(game, shock(this.x + this.r * 0.6, 1, 640));
        game.sfx.slam();
        game.fx.shake(14);
        game.fx.ring(this.x, this.y, this.r, this.r + 160, 0.4, '255,70,120', 6);
      }
      game.endBurst();
      this.pickAnchor(p);
      this.setState('move');
    }
  }

  doDead(dt, game) {
    this.deadT += dt;
    if (!this.grounded) {
      this.vy += 1800 * dt;
      this.y += this.vy * dt;
      if (this.y >= ARENA.floor - this.r) { this.y = ARENA.floor - this.r; this.vy = 0; this.grounded = true; game.fx.shake(20); }
    }
    if (this.deadT < 2.4 && Math.random() < dt * 9) {
      const ex = this.x + rand(-70, 70), ey = this.y + rand(-70, 50);
      game.sfx.explode();
      game.fx.ring(ex, ey, 10, 90, 0.35, '255,200,150', 6);
      game.fx.spark(ex, ey, rand(0, 6.28), 14, '#ffcf86', 700, Math.PI, 0.4);
      game.fx.smoke(ex, ey, 4, '60,40,56', 28, 1.2);
      game.fx.shake(8);
    }
  }

  takeDamage(dmg, stagger, hx, hy, game) {
    if (this.state === 'dead' || this.state === 'intro' || this.hidden) return 0;
    const mul = this.groggy ? BOSS.groggyDamageMul : 1;
    const d = dmg * mul;
    this.hp -= d;
    this.sinceHit = 0;
    this.hitFlash = 0.05;
    if (!this.groggy && this.state !== 'phase') this.stagger += stagger;
    game.onBossDamage(d, hx, hy, this.groggy);

    if (this.hp <= 0) {
      this.hp = 0;
      this.setState('dead');
      this.deadT = 0;
      this.grounded = false;
      this.vy = -200;
      game.onBossDead();
      return d;
    }
    if (this.def.phase2At && this.phase === 1 && this.hp <= this.maxHp * this.def.phase2At && !this.groggy) {
      this.phase = 2;
      this.setState('phase');
      for (const h of game.hazards) if ((h.type === 'laserH' || h.type === 'laserV') && !h.fired) h.dead = true;
      game.sfx.groggy();
      game.fx.shake(20);
      game.fx.doFlash(0.3, '255,54,100');
      game.fx.ring(this.x, this.y, this.r, this.r + 300, 0.7, '255,54,100', 12);
      game.banner('PHASE 2', `${this.name}이(가) 폭주합니다`, 1.6);
      return d;
    }
    if (!this.groggy && this.stagger >= this.staggerMax) this.enterGroggy(game);
    return d;
  }

  drawTelegraph(g, t) {
    if (this.state === 'charge' && this.step === 0) {
      const k = this.timer / this.chargeTele;
      const len = 2200;
      g.save();
      g.translate(this.x, this.y);
      g.rotate(this.chargeA);
      g.fillStyle = `rgba(255,54,100,${0.08 + k * 0.14})`;
      g.fillRect(0, -this.r, len, this.r * 2);
      g.strokeStyle = `rgba(255,80,120,${0.4 + 0.5 * Math.abs(Math.sin(t * 30))})`;
      g.lineWidth = 2;
      g.setLineDash([20, 12]);
      g.beginPath(); g.moveTo(0, -this.r); g.lineTo(len, -this.r); g.moveTo(0, this.r); g.lineTo(len, this.r); g.stroke();
      g.setLineDash([]);
      g.restore();
    }
    if (this.state === 'slam' && (this.step === 0 || this.step === 1)) {
      const k = this.step === 1 ? 1 : Math.min(1, this.timer / this.cfg.slam.track);
      g.fillStyle = `rgba(255,54,100,${0.05 + k * 0.12})`;
      g.fillRect(this.x - this.r, this.y, this.r * 2, ARENA.floor - this.y);
      g.fillStyle = `rgba(255,100,140,${0.3 + 0.5 * Math.abs(Math.sin(t * 25))})`;
      g.fillRect(this.x - this.r, ARENA.floor - 5, this.r * 2, 5);
    }
  }

  draw(g, t) {
    if (this.hidden) return;
    ART[this.def.art](this, g, t);
  }
}
