// 보스: W-07 감시자
import { ARENA, BOSS, DMG } from './config.js';
import { laserH, laserV, shock, orb, mine } from './hazards.js';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Boss {
  constructor() {
    this.name = '잿빛 수호자';
    this.r = BOSS.radius;
    this.maxHp = BOSS.maxHp;
    this.reset();
  }

  reset() {
    this.x = 1150;
    this.y = -160;
    this.vx = 0;
    this.vy = 0;
    this.hp = this.maxHp;
    this.trailHp = this.maxHp;
    this.stagger = 0;
    this.staggerMax = BOSS.staggerMax;
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
    this.open = 0;          // 그로기 시 장갑 벌어짐 0~1
    this.groggyT = 0;
    this.groggyCount = 0;
    this.deadT = 0;
    this.eyeA = Math.PI;
    this.tx = 1150;
    this.ty = 260;
    this.chargeA = 0;
    this.slamCount = 0;
    this.grounded = false;
    this.dashing = false;
    this.rage = 0;
  }

  get hovering() {
    return !['groggy', 'dead', 'slam', 'charge'].includes(this.state) || (this.state === 'slam' && this.step === 0);
  }

  get groggy() { return this.state === 'groggy'; }
  get dead() { return this.state === 'dead'; }
  get contactDamage() {
    if (this.state === 'groggy' || this.state === 'dead' || this.state === 'intro') return 0;
    if (this.dashing) return DMG.charge;
    if (this.state === 'slam' && this.step === 2) return DMG.charge;
    return BOSS.contactDamage;
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
    // 플레이어와 적당히 떨어진 위쪽 공간
    const side = player.x < 800 ? 1 : -1;
    this.tx = clamp(800 + side * rand(150, 520), ARENA.left + 140, ARENA.right - 140);
    this.ty = rand(ARENA.top + 130, 380);
  }

  choosePattern() {
    const pool = this.phase === 1
      ? ['sweep', 'slam', 'radial', 'mines', 'sweep', 'radial']
      : ['sweep', 'slam', 'radial', 'mines', 'charge', 'charge', 'slam'];
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

  update(dt, game) {
    const p = game.player;
    this.timer += dt;
    this.sinceHit += dt;
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.rage = Math.max(0, this.rage - dt);
    const fast = this.phase === 2 ? 1.25 : 1;
    this.ringRot += dt * (this.groggy ? 0.2 : 0.6 * fast);

    // 체력바 잔상
    if (this.trailHp > this.hp) {
      this.trailHp -= Math.max((this.trailHp - this.hp) * 2.2 * dt, 400 * dt);
      if (this.trailHp < this.hp) this.trailHp = this.hp;
    }

    // 눈은 플레이어를 바라봄
    const ea = Math.atan2(p.y - this.y, p.x - this.x);
    let diff = ea - this.eyeA;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.eyeA += diff * Math.min(1, dt * 6);

    this.open += ((this.groggy ? 1 : 0) - this.open) * Math.min(1, dt * 6);

    // 그로기 게이지 자연 감소
    if (!this.groggy && this.sinceHit > 2.5) this.stagger = Math.max(0, this.stagger - 8 * dt);

    const glide = (k) => {
      this.x += (this.tx - this.x) * Math.min(1, dt * k);
      this.y += (this.ty - this.y) * Math.min(1, dt * k);
    };

    switch (this.state) {
      case 'intro': {
        this.ty = 260; this.tx = 1150;
        glide(2.2);
        if (this.timer > 1.8) { this.pickAnchor(p); this.setState('move'); }
        break;
      }
      case 'move': {
        glide(2.6 * fast);
        if (this.timer > (this.phase === 2 ? 0.55 : 0.9)) this.choosePattern();
        break;
      }
      case 'phase': {
        // 2페이즈 진입 연출
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
    const two = this.phase === 2;
    const tele = two ? 0.7 : 0.85;
    if (this.step === 0) {
      this.step = 1;
      const yOf = () => clamp(p.y, ARENA.top + 40, ARENA.floor - 24);
      this.schedule(0, () => game.hazards.push(laserH(yOf(), tele)));
      this.schedule(0.75, () => game.hazards.push(laserH(yOf(), tele)));
      if (two) {
        this.schedule(1.25, () => game.hazards.push(laserH(yOf(), tele)));
        this.schedule(1.25, () => game.hazards.push(laserV(clamp(p.x, ARENA.left + 40, ARENA.right - 40), tele + 0.15)));
      }
      this.endAt = two ? 2.4 : 2.0;
    }
    this.ty = ARENA.top + 120;
    this.tx = this.x;
    this.x += (this.tx - this.x) * Math.min(1, dt * 2);
    this.y += (this.ty - this.y) * Math.min(1, dt * 2);
    this.runQueue();
    if (this.timer >= this.endAt) { this.pickAnchor(p); this.setState('move'); }
  }

  doSlam(dt, game) {
    const p = game.player;
    const two = this.phase === 2;
    if (this.step === 0) {
      // 플레이어 위로 추적
      this.tx = p.x;
      this.ty = ARENA.top + 150;
      this.x += (this.tx - this.x) * Math.min(1, dt * (two ? 6 : 4.5));
      this.y += (this.ty - this.y) * Math.min(1, dt * 5);
      if (this.timer > (two ? 0.6 : 0.85)) { this.step = 1; this.timer = 0; game.sfx.telegraph(); }
    } else if (this.step === 1) {
      this.x += Math.sin(this.timer * 80) * 1.5;
      if (this.timer > 0.28) { this.step = 2; this.timer = 0; this.vy = 600; }
    } else if (this.step === 2) {
      this.vy += 5200 * dt;
      this.y += this.vy * dt;
      if (this.y >= ARENA.floor - this.r) {
        this.y = ARENA.floor - this.r;
        this.vy = 0;
        this.step = 3;
        this.timer = 0;
        const sp = two ? 900 : 800;
        game.hazards.push(shock(this.x - this.r * 0.6, -1, sp));
        game.hazards.push(shock(this.x + this.r * 0.6, 1, sp));
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
        if (two && this.slamCount < 2) {
          this.step = 0; this.timer = 0;
        } else {
          this.slamCount = 0;
          this.pickAnchor(p);
          this.setState('move');
        }
      }
    }
  }

  doRadial(dt, game) {
    const p = game.player;
    const two = this.phase === 2;
    if (this.step === 0) {
      this.step = 1;
      const waves = two ? 4 : 3;
      const n = two ? 18 : 15;
      const sp = two ? 360 : 310;
      const base = Math.random() * Math.PI * 2;
      for (let w = 0; w < waves; w++) {
        this.schedule(0.5 + w * 0.36, () => {
          const off = base + w * (Math.PI / n);
          for (let i = 0; i < n; i++) {
            const a = off + (i / n) * Math.PI * 2;
            game.hazards.push(orb(this.x + Math.cos(a) * this.r * 0.8, this.y + Math.sin(a) * this.r * 0.8, Math.cos(a) * sp, Math.sin(a) * sp));
          }
          game.sfx.orb();
          game.fx.ring(this.x, this.y, this.r, this.r + 50, 0.25, '255,70,120', 4);
        });
      }
      this.endAt = 0.5 + waves * 0.36 + 0.5;
    }
    this.runQueue();
    if (this.timer >= this.endAt) { this.pickAnchor(p); this.setState('move'); }
  }

  doMines(dt, game) {
    const p = game.player;
    const two = this.phase === 2;
    if (this.step === 0) {
      this.step = 1;
      this.schedule(0.35, () => {
        const n = two ? 7 : 5;
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * Math.PI * 1.6 + rand(-0.1, 0.1);
          const s = rand(520, 720);
          game.hazards.push(mine(this.x, this.y, Math.cos(a) * s, Math.sin(a) * s + 120));
        }
        game.sfx.orb();
        game.fx.ring(this.x, this.y, this.r, this.r + 70, 0.3, '255,70,120', 5);
      });
      this.endAt = 1.5;
    }
    this.tx += (p.x > this.x ? -1 : 1) * 40 * dt;
    this.runQueue();
    if (this.timer >= this.endAt) { this.pickAnchor(p); this.setState('move'); }
  }

  doCharge(dt, game) {
    const p = game.player;
    if (this.step === 0) {
      const tele = 0.75;
      if (this.timer < tele - 0.25) this.chargeA = Math.atan2(p.y - this.y, p.x - this.x);
      if (this.timer < dt * 1.5) game.sfx.telegraph();
      this.x += Math.sin(this.timer * 60) * 1.2;
      if (this.timer > tele) {
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
        // 충돌 지점에서 탄환 산개
        const n = 12;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          game.hazards.push(orb(this.x, this.y, Math.cos(a) * 300, Math.sin(a) * 300));
        }
        if (this.y >= ARENA.floor - this.r - 2) {
          game.hazards.push(shock(this.x - this.r * 0.6, -1, 760));
          game.hazards.push(shock(this.x + this.r * 0.6, 1, 760));
        }
      }
    } else if (this.step === 2) {
      if (this.timer > 0.55) { this.pickAnchor(p); this.setState('move'); }
    }
  }

  enterGroggy(game) {
    this.setState('groggy');
    this.groggyT = BOSS.groggyTime;
    this.vy = 0;
    this.grounded = false;
    this.groggyCount++;
    game.burst = 0;
    // 아직 발사되지 않은 레이저는 취소
    for (const h of game.hazards) if ((h.type === 'laserH' || h.type === 'laserV') && !h.fired) h.dead = true;
    game.sfx.groggy();
    game.fx.shake(18);
    game.fx.doFlash(0.4, '255,236,200');
    game.fx.stop(0.12);
    game.fx.ring(this.x, this.y, this.r, this.r + 220, 0.6, '255,240,214', 10);
    game.fx.spark(this.x, this.y, 0, 40, '#ffe6b0', 900, Math.PI, 0.5);
    game.banner('GROGGY', '지금 몰아넣으세요', 1.6);
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
    if (Math.random() < 0.25) game.fx.spark(this.x + rand(-50, 50), this.y + rand(-50, 30), -Math.PI / 2 + rand(-1, 1), 2, '#ffd27a', 300, 0.4, 0.4);
    this.groggyT -= dt;
    if (this.groggyT <= 0) {
      // 일어나며 지면 충격파
      this.stagger = 0;
      this.staggerMax = BOSS.staggerMax * (1 + this.groggyCount * 0.25);
      game.hazards.push(shock(this.x - this.r * 0.6, -1, 700));
      game.hazards.push(shock(this.x + this.r * 0.6, 1, 700));
      game.sfx.slam();
      game.fx.shake(14);
      game.fx.ring(this.x, this.y, this.r, this.r + 160, 0.4, '255,70,120', 6);
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
    if (this.state === 'dead' || this.state === 'intro') return 0;
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
    if (this.phase === 1 && this.hp <= this.maxHp * BOSS.phase2At && !this.groggy) {
      this.phase = 2;
      this.setState('phase');
      for (const h of game.hazards) if ((h.type === 'laserH' || h.type === 'laserV') && !h.fired) h.dead = true;
      game.sfx.groggy();
      game.fx.shake(20);
      game.fx.doFlash(0.3, '255,54,100');
      game.fx.ring(this.x, this.y, this.r, this.r + 300, 0.7, '255,54,100', 12);
      game.banner('PHASE 2', '감시자가 폭주합니다', 1.6);
      return d;
    }
    if (!this.groggy && this.stagger >= this.staggerMax) this.enterGroggy(game);
    return d;
  }

  drawTelegraph(g, t) {
    if (this.state === 'charge' && this.step === 0) {
      const k = this.timer / 0.75;
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
      const k = this.step === 1 ? 1 : Math.min(1, this.timer / 0.85);
      g.fillStyle = `rgba(255,54,100,${0.05 + k * 0.12})`;
      g.fillRect(this.x - this.r, this.y, this.r * 2, ARENA.floor - this.y);
      g.fillStyle = `rgba(255,100,140,${0.3 + 0.5 * Math.abs(Math.sin(t * 25))})`;
      g.fillRect(this.x - this.r, ARENA.floor - 5, this.r * 2, 5);
    }
  }

  draw(g, t) {
    const dead = this.state === 'dead';
    if (dead && this.deadT > 2.6) return;
    const bob = this.hovering ? Math.sin(t * 2.2) * 6 : 0;
    const x = this.x, y = this.y + bob;
    const red = this.phase === 2;
    const coreCol = this.groggy ? '255,240,214' : red ? '255,64,108' : '255,200,128';
    const open = this.open * 18 + (dead ? this.deadT * 26 : 0);

    // 바닥 그림자
    const hgt = Math.max(0, ARENA.floor - (y + this.r));
    const sa = Math.max(0.08, 0.45 - hgt / 1400);
    g.fillStyle = `rgba(10,4,12,${sa})`;
    g.beginPath(); g.ellipse(x, ARENA.floor + 2, 90 - Math.min(40, hgt / 20), 10, 0, 0, Math.PI * 2); g.fill();

    g.save();
    g.translate(x, y);

    // 공전하는 돌 파편 (뒤쪽 절반)
    this.drawShards(g, t, false, open);

    // 금색 고리 (뒤쪽 절반)
    const ringTilt = this.groggy ? 0.5 + this.open * 0.6 : 0.35;
    const r1 = this.ringRot, r2 = -this.ringRot * 1.3 + 1.2;
    const ringDrop = this.open * 40;
    this.drawRing(g, 0, ringDrop, 118, r1, ringTilt, false);
    this.drawRing(g, 0, ringDrop * 0.6, 100, r2, ringTilt + 0.25, false);

    // 코어 후광
    g.globalCompositeOperation = 'lighter';
    const pulse = this.groggy ? 0.8 + 0.2 * Math.sin(t * 12) : 0.75 + 0.25 * Math.sin(t * 3);
    const halo = g.createRadialGradient(0, 0, 6, 0, 0, this.groggy ? 130 : 110);
    halo.addColorStop(0, `rgba(${coreCol},${0.55 * pulse})`);
    halo.addColorStop(1, `rgba(${coreCol},0)`);
    g.fillStyle = halo;
    g.beginPath(); g.arc(0, 0, this.groggy ? 130 : 110, 0, Math.PI * 2); g.fill();
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
    const eh = this.groggy ? 34 : 26, ew = this.groggy ? 16 + open * 0.5 : 11;
    g.fillStyle = '#0e0810';
    g.beginPath();
    g.moveTo(0, -eh); g.quadraticCurveTo(ew * 1.6, 0, 0, eh); g.quadraticCurveTo(-ew * 1.6, 0, 0, -eh);
    g.fill();
    g.globalCompositeOperation = 'lighter';
    const ex = Math.cos(this.eyeA) * 5, ey = Math.sin(this.eyeA) * 10;
    const eg = g.createRadialGradient(ex, ey, 1, ex, ey, ew * 1.4);
    eg.addColorStop(0, 'rgba(255,250,240,1)');
    eg.addColorStop(0.35, `rgba(${coreCol},1)`);
    eg.addColorStop(1, `rgba(${coreCol},0)`);
    g.fillStyle = eg;
    g.beginPath(); g.ellipse(ex, ey, ew * 0.9, eh * 0.55, 0, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'source-over';

    if (this.hitFlash > 0) {
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = `rgba(255,255,255,${this.hitFlash * 5})`;
      g.beginPath(); g.moveTo(-open, T); g.lineTo(-L - open, -8); g.lineTo(-open, B); g.lineTo(open, B); g.lineTo(L + open, -8); g.lineTo(open, T); g.closePath(); g.fill();
      g.globalCompositeOperation = 'source-over';
    }

    // 금색 고리 (앞쪽 절반)
    this.drawRing(g, 0, ringDrop, 118, r1, ringTilt, true);
    this.drawRing(g, 0, ringDrop * 0.6, 100, r2, ringTilt + 0.25, true);

    // 공전하는 돌 파편 (앞쪽 절반)
    this.drawShards(g, t, true, open);

    if (this.state === 'phase' || (this.state === 'charge' && this.step === 0)) {
      g.strokeStyle = `rgba(255,64,108,${0.5 + 0.5 * Math.sin(t * 40)})`;
      g.lineWidth = 3;
      g.beginPath(); g.ellipse(0, 0, 112 + Math.sin(t * 30) * 4, 124 + Math.sin(t * 30) * 4, 0, 0, Math.PI * 2); g.stroke();
    }

    g.restore();
  }

  // 기울어진 고리: front=true면 앞쪽 반원만
  drawRing(g, cx, cy, r, rot, tilt, front) {
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

  drawShards(g, t, front, open) {
    for (let i = 0; i < SHARDS.length; i++) {
      const sh = SHARDS[i];
      const a = this.ringRot * sh.sp + sh.ph;
      const z = Math.sin(a);
      if ((z >= 0) !== front) continue;
      const rr = sh.r + open * 1.5;
      const sx = Math.cos(a) * rr;
      const sy = z * rr * 0.28 + sh.oy + (this.groggy ? this.open * 50 : 0);
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
