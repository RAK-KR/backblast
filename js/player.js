// 플레이어: 걷기·점프 없이 총 반동으로만 이동합니다.
import { ARENA, PHYS, PLAYER, ULT } from './config.js';
import { weaponDef, weaponMul } from './weapons.js';

export class Player {
  constructor(primary, alt) {
    this.primary = primary;
    this.alt = alt;
    this.pDef = weaponDef(primary);
    this.aDef = weaponDef(alt);
    this.reset();
  }

  reset() {
    this.x = 300;
    this.y = ARENA.floor - PLAYER.radius;
    this.vx = 0;
    this.vy = 0;
    this.r = PLAYER.radius;
    this.hp = PLAYER.maxHp;
    this.heat = 0;
    this.overheat = false;
    this.shells = this.aDef.shells;
    this.shellAirTimer = 0;
    this.groundTime = 0;
    this.grounded = true;
    this.iframes = 0;
    this.fireCd = 0;
    this.altCd = 0;
    this.aim = 0;
    this.face = 1;
    this.muzzle = 0;
    this.altMuzzle = 0;
    this.hurtFlash = 0;
    this.dead = false;
    this.scarf = Array.from({ length: 6 }, () => ({ x: this.x, y: this.y }));
    this.squash = 0;
    this.ultActive = false;
    this.fuel = 1;           // 분사기 연료
    this.jetting = false;
    this.jetTick = 0;
    this.pull = null;        // 앵커 건 당기기 { x, y, t, speed }
    this.hookOut = false;
    this.bounceT = 0;        // 리바운더 튕김 상태
  }

  startPull(x, y, speed) {
    this.pull = { x, y, t: 0, speed };
    this.hookOut = false;
    this.grounded = false;
    this.groundTime = 0;
  }

  get alive() { return !this.dead; }

  muzzlePos() {
    const len = 34;
    return { x: this.x + Math.cos(this.aim) * len, y: this.y - 4 + Math.sin(this.aim) * len };
  }

  // 반환값: 발사한 탄 목록 (game에서 처리)
  update(dt, input, altPressed, recoilMul, heatMul, sfx, fx, altRecoilMul = 1, altHeld = false) {
    const shots = [];
    this.aim = Math.atan2(input.my - (this.y - 4), input.mx - this.x);
    this.face = Math.cos(this.aim) >= 0 ? 1 : -1;

    this.iframes = Math.max(0, this.iframes - dt);
    this.fireCd = Math.max(0, this.fireCd - dt);
    this.altCd = Math.max(0, this.altCd - dt);
    this.muzzle = Math.max(0, this.muzzle - dt);
    this.altMuzzle = Math.max(0, this.altMuzzle - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.squash = Math.max(0, this.squash - dt * 4);
    this.bounceT = Math.max(0, this.bounceT - dt);
    this.jetting = false;

    // 과열 처리 (극딜 중에는 과열 없음)
    if (this.ultActive) { this.heat = 0; this.overheat = false; }
    if (this.overheat) {
      this.heat -= PLAYER.overheatCool * dt;
      if (this.heat <= 0) { this.heat = 0; this.overheat = false; }
    } else {
      // 쏘는 중에는 느리게, 손을 떼면 빠르게 식음
      const cool = input.left ? PLAYER.heatCool * 0.25 : PLAYER.heatCool;
      this.heat = Math.max(0, this.heat - cool * dt);
    }

    if (!this.dead) {
      const dir = { x: Math.cos(this.aim), y: Math.sin(this.aim) };
      const mul = weaponMul(this.primary);
      const amul = weaponMul(this.alt);

      // 좌클릭: 연사
      if (input.left && !this.overheat && this.fireCd <= 0) {
        const p = this.pDef;
        this.fireCd += 1 / (p.rate * (this.ultActive ? ULT.rateMul : 1));
        if (this.fireCd < 0) this.fireCd = 0;
        this.heat += p.heat * heatMul;
        if (this.heat >= 1) { this.heat = 1; this.overheat = true; }
        const mp = this.muzzlePos();
        const a = this.aim + (Math.random() - 0.5) * p.spread * 2;
        shots.push({
          kind: p.hitscan ? 'beam' : 'bullet', x: mp.x, y: mp.y, a,
          speed: p.speed, damage: p.damage * mul, stagger: p.stagger, size: p.size, life: 0.9,
          heavy: p.damage >= 30,
        });
        this.vx -= dir.x * p.recoil * recoilMul;
        this.vy -= dir.y * p.recoil * recoilMul;
        this.muzzle = 0.05;
        (sfx[this.primary.id] || sfx.rifle)();
        fx.spark(mp.x, mp.y, a, p.hitscan ? 14 : 2, '#ffe6b0', 420, 0.35, 0.12);
        if (p.recoil > 200) fx.shake(p.recoil / 90);
      }

      // 우클릭: 보조무기 (이동 핵심) — 무기마다 이동 방식이 다름
      const a2 = this.aDef;
      if (a2.mode === 'jet') {
        // 분사기: 누르고 있는 동안 계속 밀려남
        if (altHeld && (this.fuel > 0 || this.ultActive)) {
          this.jetting = true;
          if (!this.ultActive) this.fuel = Math.max(0, this.fuel - a2.drain * dt);
          this.vx -= dir.x * a2.thrust * altRecoilMul * dt;
          this.vy -= dir.y * a2.thrust * altRecoilMul * dt;
          if (this.vy < -60 || this.vx !== 0) this.grounded = false;
          this.groundTime = 0;
          this.jetTick -= dt;
          if (this.jetTick <= 0) {
            this.jetTick = a2.tick;
            const mp = this.muzzlePos();
            shots.push({
              kind: 'flame', x: mp.x, y: mp.y, a: this.aim + (Math.random() - 0.5) * a2.spread * 2,
              speed: a2.speed * (0.8 + Math.random() * 0.4), damage: a2.damage * amul,
              stagger: a2.stagger, size: 6, life: a2.life, heavy: false,
            });
            sfx.jet();
            fx.spark(mp.x, mp.y, this.aim + (Math.random() - 0.5) * 0.4, 3, '#ffcf86', 500, 0.3, 0.18);
            fx.smoke(this.x - dir.x * 10, this.y - dir.y * 10, 1, '120,80,90', 10, 0.4);
          }
          this.altMuzzle = 0.05;
        }
      } else if (a2.mode === 'anchor' && altPressed && this.altCd <= 0) {
        if (this.pull) {
          // 당기는 중 다시 누르면 놓음
          this.pull = null;
          this.altCd = 0.12;
        } else if ((this.shells > 0 || this.ultActive) && !this.hookOut) {
          if (!this.ultActive) this.shells--;
          this.altCd = 0.18;
          this.hookOut = true;
          const mp = this.muzzlePos();
          shots.push({
            kind: 'hook', x: mp.x, y: mp.y, a: this.aim, speed: a2.speed, range: a2.range,
            damage: a2.damage * amul, stagger: a2.stagger, pullSpeed: a2.pullSpeed,
          });
          this.altMuzzle = 0.07;
          sfx.hook();
          fx.spark(mp.x, mp.y, this.aim, 8, '#ffe6b0', 500, 0.3, 0.15);
        } else if (!this.hookOut) {
          this.altCd = 0.12;
          sfx.empty();
        }
      } else if (a2.mode === 'blast' && altPressed && this.altCd <= 0) {
        if (this.shells > 0 || this.ultActive) {
          if (!this.ultActive) this.shells--;
          this.altCd = this.ultActive ? ULT.altCd : 0.16;
          const mp = this.muzzlePos();
          for (let i = 0; i < a2.pellets; i++) {
            const spread = a2.pellets === 1 ? 0 : (i / (a2.pellets - 1) - 0.5) * a2.spread * 2 + (Math.random() - 0.5) * 0.05;
            shots.push({
              kind: 'pellet', x: mp.x, y: mp.y, a: this.aim + spread,
              speed: a2.speed * (0.9 + Math.random() * 0.2), damage: a2.damage * amul,
              stagger: a2.stagger, size: a2.pellets === 1 ? 7 : 3.5, life: a2.life, heavy: a2.pellets === 1,
              bounce: a2.bulletBounce || 0,
            });
          }
          // 기존 속도를 줄이고 반대 방향으로 강하게 튕김
          const keep = altRecoilMul < 1 ? 0.6 : 0.3;
          this.vx = this.vx * keep - dir.x * a2.recoil * altRecoilMul;
          this.vy = this.vy * keep - dir.y * a2.recoil * altRecoilMul;
          this.altMuzzle = 0.09;
          if (a2.bounceTime) this.bounceT = a2.bounceTime;
          this.grounded = false;
          this.groundTime = 0;
          (this.alt.id === 'slug' ? sfx.slug : sfx.blast)();
          fx.shake(7 * (altRecoilMul < 1 ? 0.5 : 1));
          fx.spark(mp.x, mp.y, this.aim, 18, '#ffd6a0', 700, 0.5, 0.2);
          fx.smoke(mp.x, mp.y, 5, '92,72,86', 14, 0.6);
          fx.ring(mp.x, mp.y, 6, 46, 0.18, '255,230,190', 5);
        } else {
          this.altCd = 0.12;
          sfx.empty();
        }
      }
    }

    // 물리
    if (this.pull) {
      // 갈고리 지점으로 끌려감 (중력 무시)
      const pl = this.pull;
      pl.t += dt;
      const dx = pl.x - this.x, dy = pl.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 34 || pl.t > 0.75 || this.dead) {
        this.vx *= 0.55; this.vy *= 0.55;
        this.pull = null;
      } else {
        this.vx = (dx / d) * pl.speed;
        this.vy = (dy / d) * pl.speed;
      }
    } else {
      this.vy += PHYS.gravity * dt;
    }
    const bouncy = this.bounceT > 0;
    const wallB = bouncy ? 0.9 : PHYS.wallBounce;
    const drag = this.grounded && !bouncy ? PHYS.groundFriction : PHYS.airDrag;
    this.vx *= Math.max(0, 1 - drag * dt);
    if (!this.grounded) this.vy *= Math.max(0, 1 - PHYS.airDrag * 0.5 * dt);
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > PHYS.maxSpeed) { this.vx *= PHYS.maxSpeed / sp; this.vy *= PHYS.maxSpeed / sp; }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 벽·천장·바닥 충돌
    if (this.x < ARENA.left + this.r) { this.x = ARENA.left + this.r; this.vx = Math.abs(this.vx) * wallB; if (this.pull) this.pull = null; if (bouncy) fx.ring(this.x, this.y, 6, 40, 0.2, '255,214,150', 4); }
    if (this.x > ARENA.right - this.r) { this.x = ARENA.right - this.r; this.vx = -Math.abs(this.vx) * wallB; if (this.pull) this.pull = null; if (bouncy) fx.ring(this.x, this.y, 6, 40, 0.2, '255,214,150', 4); }
    if (this.y < ARENA.top + this.r) { this.y = ARENA.top + this.r; this.vy = Math.abs(this.vy) * wallB; if (this.pull) this.pull = null; }

    const wasGrounded = this.grounded;
    if (this.y >= ARENA.floor - this.r) {
      this.y = ARENA.floor - this.r;
      if (this.pull) this.pull = null;
      if (bouncy && this.vy > 80) {
        this.vy = -this.vy * 0.85;
        this.grounded = false;
        sfx.land();
        this.squash = 1;
        fx.ring(this.x, ARENA.floor, 6, 50, 0.2, '255,214,150', 4);
      } else if (this.vy > 260) {
        this.vy = -this.vy * PHYS.floorBounce;
        if (!wasGrounded) { sfx.land(); this.squash = 1; fx.smoke(this.x, ARENA.floor - 4, 3, '84,60,78', 10, 0.4); }
        this.grounded = false;
      } else {
        this.vy = 0;
        this.grounded = true;
      }
    } else if (this.y < ARENA.floor - this.r - 1) {
      this.grounded = false;
    }

    // 분사기 연료 충전
    if (this.aDef.mode === 'jet') {
      if (!this.jetting) this.fuel = Math.min(1, this.fuel + (this.grounded ? 2.5 : 0.12) * dt);
    }

    // 산탄 충전
    if (this.aDef.mode === 'jet') {
      // 연료식이라 탄 충전 없음
    } else if (this.grounded) {
      this.groundTime += dt;
      if (this.groundTime >= PLAYER.shellRefillGround && this.shells < this.aDef.shells) {
        this.shells = this.aDef.shells;
        sfx.reload();
      }
      this.shellAirTimer = 0;
    } else {
      this.groundTime = 0;
      if (this.shells < this.aDef.shells) {
        this.shellAirTimer += dt;
        if (this.shellAirTimer >= PLAYER.shellRefillAir) {
          this.shellAirTimer = 0;
          this.shells++;
          sfx.reload();
        }
      } else {
        this.shellAirTimer = 0;
      }
    }

    // 스카프 꼬리
    let px = this.x - this.face * 2, py = this.y + 6;
    for (let i = 0; i < this.scarf.length; i++) {
      const s = this.scarf[i];
      const tx = px - this.vx * 0.014 - this.face * 5;
      const ty = py - this.vy * 0.014 + 2.5 + Math.sin(performance.now() / 160 + i) * 0.8;
      s.x += (tx - s.x) * Math.min(1, dt * 28);
      s.y += (ty - s.y) * Math.min(1, dt * 28);
      const dx = s.x - px, dy = s.y - py;
      const d = Math.hypot(dx, dy) || 1;
      if (d > 6) { s.x = px + dx / d * 6; s.y = py + dy / d * 6; }
      px = s.x; py = s.y;
    }

    return shots;
  }

  hurt(dmg, fx, sfx, fromX, fromY) {
    if (this.iframes > 0 || this.dead) return false;
    this.hp -= dmg;
    this.iframes = PLAYER.iframes;
    this.hurtFlash = 0.25;
    const a = Math.atan2(this.y - fromY, this.x - fromX);
    this.vx += Math.cos(a) * 380;
    this.vy += Math.sin(a) * 380 - 120;
    this.grounded = false;
    sfx.hurt();
    fx.shake(14);
    fx.doFlash(0.35, '190,30,70');
    fx.stop(0.06);
    fx.spark(this.x, this.y, a, 14, '#ff5a86', 500, 1.2, 0.3);
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
    return true;
  }

  draw(g, t) {
    const blink = this.iframes > 0 && Math.floor(t * 20) % 2 === 0;
    const f = this.face;
    g.save();
    if (blink) g.globalAlpha = 0.45;

    // 코트 자락 (속도에 따라 휘날림)
    const pts = [{ x: this.x - f * 2, y: this.y + 6 }, ...this.scarf];
    const left = [], right = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let nx = -(b.y - a.y), ny = b.x - a.x;
      const d = Math.hypot(nx, ny) || 1;
      nx /= d; ny /= d;
      const w = 10 - i * 1.2;
      left.push({ x: pts[i].x + nx * w, y: pts[i].y + ny * w });
      right.push({ x: pts[i].x - nx * w, y: pts[i].y - ny * w });
    }
    g.fillStyle = '#7a1a2e';
    g.beginPath();
    g.moveTo(left[0].x, left[0].y);
    for (const q of left) g.lineTo(q.x, q.y);
    for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i].x, right[i].y);
    g.closePath();
    g.fill();
    g.strokeStyle = '#c9a35a';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(right[0].x, right[0].y);
    for (const q of right) g.lineTo(q.x, q.y);
    g.stroke();

    g.translate(this.x, this.y);
    const sq = this.squash;
    g.scale(1.2 * (1 + sq * 0.18), 1.2 * (1 - sq * 0.15));

    // 다리와 부츠
    const legSwing = this.grounded ? 0 : Math.sin(t * 14) * 2;
    g.fillStyle = '#1e1622';
    g.fillRect(-7, 9, 5, 9 + legSwing);
    g.fillRect(2, 9, 5, 9 - legSwing);
    g.fillStyle = '#100a12';
    g.fillRect(-8 + (f > 0 ? 0 : -1), 16 + legSwing, 8, 4);
    g.fillRect(1 + (f > 0 ? 1 : 0), 16 - legSwing, 8, 4);
    g.fillStyle = '#c9a35a';
    g.fillRect(-6, 16 + legSwing, 2, 2);
    g.fillRect(4, 16 - legSwing, 2, 2);

    // 코트 몸통
    g.fillStyle = '#b8283e';
    g.beginPath();
    g.moveTo(-10, -2); g.lineTo(10, -2); g.lineTo(11, 12); g.lineTo(-11, 12); g.closePath();
    g.fill();
    // 깃과 앞섶
    g.fillStyle = '#e8e0d6';
    g.beginPath(); g.moveTo(-4, -2); g.lineTo(0, 5); g.lineTo(4, -2); g.closePath(); g.fill();
    g.fillStyle = '#8c1d30';
    g.fillRect(-0.8, 4, 1.6, 8);
    g.fillStyle = '#c9a35a';
    g.fillRect(-3.5, 6, 2, 2);
    g.fillRect(-3.5, 9.5, 2, 2);
    // 벨트
    g.fillStyle = '#2a1a22';
    g.fillRect(-11, 8, 22, 3);
    g.fillStyle = '#c9a35a';
    g.fillRect(-2, 8, 4, 3);

    // 머리 (2등신)
    const hy = -15;
    g.fillStyle = '#f3dcc8';
    g.beginPath(); g.arc(0, hy, 13, 0, Math.PI * 2); g.fill();

    // 은발: 뒷머리
    g.fillStyle = '#b4adc4';
    g.beginPath();
    g.ellipse(-f * 4, hy - 1, 14, 13, 0, Math.PI * 0.75, Math.PI * 2.25);
    g.fill();
    // 앞머리 (삐죽한 결)
    g.fillStyle = '#ece8f2';
    g.beginPath();
    g.moveTo(-14, hy + 1);
    g.quadraticCurveTo(-15, hy - 15, 0, hy - 15);
    g.quadraticCurveTo(15, hy - 15, 14, hy + 1);
    g.lineTo(f * 11, hy - 2);
    g.lineTo(f * 7, hy + 3);
    g.lineTo(f * 4, hy - 3);
    g.lineTo(f * 0, hy + 2);
    g.lineTo(-f * 4, hy - 3);
    g.lineTo(-f * 8, hy + 1);
    g.lineTo(-f * 12, hy - 1);
    g.closePath();
    g.fill();
    // 머리 하이라이트
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 1.5;
    g.beginPath(); g.arc(-f * 3, hy - 6, 8, Math.PI * 1.15, Math.PI * 1.55); g.stroke();
    // 뒤로 삐친 머리 한 가닥
    g.fillStyle = '#ece8f2';
    g.beginPath();
    g.moveTo(-f * 11, hy - 8);
    g.lineTo(-f * 21, hy - 13 + Math.sin(t * 6) * 1.5);
    g.lineTo(-f * 13, hy - 2);
    g.closePath();
    g.fill();

    // 눈 (세로로 긴 눈 + 하이라이트)
    for (const ex of [f * 3.5, f * 9]) {
      g.fillStyle = '#2a1628';
      g.beginPath(); g.ellipse(ex, hy + 4, 2.2, 3.6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c4364c';
      g.beginPath(); g.ellipse(ex, hy + 5.4, 1.5, 1.6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff';
      g.fillRect(ex - 1.2, hy + 1.6, 1.4, 1.6);
    }
    // 볼
    g.fillStyle = 'rgba(230,120,120,0.35)';
    g.beginPath(); g.ellipse(f * 11, hy + 8.5, 2.5, 1.4, 0, 0, Math.PI * 2); g.fill();

    g.restore();

    // 황동 핸드캐넌
    g.save();
    g.translate(this.x, this.y - 4);
    g.rotate(this.aim);
    if (f < 0) g.scale(1, -1);
    g.fillStyle = '#231820';
    g.fillRect(4, -3.5, 24, 7);
    g.fillStyle = '#c9a35a';
    g.fillRect(10, -4.5, 3, 9);
    g.fillRect(20, -4.5, 3, 9);
    g.fillStyle = '#3a2830';
    g.fillRect(26, -5, 6, 10);
    g.fillStyle = '#e8c88a';
    g.fillRect(26, -5, 6, 1.5);
    g.fillStyle = '#231820';
    g.fillRect(4, 2, 5, 7);
    // 손
    g.fillStyle = '#f3dcc8';
    g.beginPath(); g.arc(6, 3, 3.5, 0, Math.PI * 2); g.fill();
    // 총구 화염
    if (this.muzzle > 0 || this.altMuzzle > 0) {
      const big = this.altMuzzle > 0;
      const s = big ? 1.9 : 1;
      g.fillStyle = big ? 'rgba(255,214,150,0.95)' : 'rgba(255,236,200,0.9)';
      g.beginPath();
      g.moveTo(32, -4 * s); g.lineTo(32 + 18 * s, 0); g.lineTo(32, 4 * s); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,250,236,0.95)';
      g.beginPath(); g.arc(33, 0, 3.5 * s, 0, Math.PI * 2); g.fill();
    }
    g.restore();

    if (this.hurtFlash > 0) {
      g.fillStyle = `rgba(255,80,110,${this.hurtFlash * 2})`;
      g.beginPath(); g.arc(this.x, this.y - 6, 26, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  }
}
