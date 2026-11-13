// 기초 튜토리얼: 단계별로 조작과 회피를 직접 해 보며 익힘
import { W, ARENA } from './config.js';
import { input } from './input.js';
import { shock, laserH, orb, mine } from './hazards.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function target(x, y, r = 26, hp = 60) { return { x, y, r, hp, max: hp, dead: false, flash: 0 }; }
function ring(x, y, r = 46) { return { x, y, r, hit: false }; }

const STEPS = [
  {
    title: '조준과 연사',
    text: ['마우스로 조준하고, 좌클릭을 누르고 있으면 주무기를 연사합니다.', '과녁 3개를 모두 부수세요.'],
    setup(game) {
      game.targets = [target(820, 420), target(1120, 260), target(1380, 520)];
    },
    progress: (game) => [game.targets.filter((t) => t.dead).length, 3],
    update: (game) => game.targets.every((t) => t.dead),
  },
  {
    title: '산탄 점프',
    text: ['우클릭(또는 Space)을 누르면 산탄이 나가고, 쏜 반대쪽으로 크게 튕겨 나갑니다.', '마우스를 발밑 아래로 내려 조준하고 쏴서 점선 높이까지 뛰어오르세요.'],
    setup(game, tu) { tu.lineY = ARENA.floor - 250; tu.arrow = true; },
    update: (game, tu) => game.player.y < tu.lineY,
  },
  {
    title: '이단 점프',
    text: ['공중에서 한 번 더 쏘면 더 높이 올라갑니다.', '산탄은 2발이고, 바닥에 닿으면 다시 채워집니다. 높이 떠 있는 고리를 통과하세요.'],
    setup(game) { game.rings = [ring(800, ARENA.top + 170)]; },
    update: (game) => game.rings.every((r) => r.hit),
  },
  {
    title: '좌우 이동',
    text: ['옆을 조준하고 쏘면 반대쪽으로 날아갑니다.', '왼쪽과 오른쪽 고리를 모두 통과하세요.'],
    setup(game) { game.rings = [ring(170, ARENA.floor - 150), ring(1430, ARENA.floor - 150)]; },
    progress: (game) => [game.rings.filter((r) => r.hit).length, 2],
    update: (game) => game.rings.every((r) => r.hit),
  },
  {
    title: '낙하 늦추기',
    text: ['공중에서 좌클릭으로 아래를 쏘면 연사 반동으로 천천히 떨어집니다.', '산탄으로 뛰어오른 뒤, 아래로 연사하면서 공중에 머무르세요.'],
    setup(game, tu) { tu.prog = 0; },
    bar: (game, tu) => tu.prog / 2,
    update(game, tu, dt) {
      const p = game.player;
      if (!p.grounded && input.left && Math.sin(p.aim) > 0.4 && !p.overheat) tu.prog += dt;
      return tu.prog >= 2;
    },
  },
  {
    title: '충격파 넘기',
    text: ['바닥을 타고 오는 충격파는 공중으로 떠서 넘어야 합니다.', '충격파가 오면 산탄으로 뛰어올라 3번 넘기세요.'],
    goal: 3,
    setup(game, tu) { tu.spawnT = 1.0; tu.dir = 1; },
    update(game, tu, dt) {
      const p = game.player;
      tu.spawnT -= dt;
      if (tu.spawnT <= 0) {
        tu.spawnT = 2.8;
        const h = shock(tu.dir > 0 ? ARENA.left + 10 : ARENA.right - 10, tu.dir, 470);
        h.tut = { counted: false, hit: false };
        game.hazards.push(h);
        game.sfx.slam();
        game.fx.shake(8);
        tu.dir *= -1;
      }
      for (const h of game.hazards) {
        if (h.type !== 'shock' || !h.tut || h.tut.counted) continue;
        const passed = h.dir > 0 ? h.x > p.x + 40 : h.x < p.x - 40;
        if (passed) {
          h.tut.counted = true;
          if (!h.tut.hit) tu.count++;
        }
      }
      return tu.count >= 3;
    },
    onHit(game, tu, h) { if (h.tut) h.tut.hit = true; },
  },
  {
    title: '레이저 피하기',
    text: ['붉은 점선 경고가 뜨고 잠시 뒤 그 줄로 레이저가 지나갑니다.', '경고가 보이면 그 높이에서 벗어나세요. 3번 피하세요.'],
    goal: 3,
    setup(game, tu) { tu.spawnT = 0.8; },
    update(game, tu, dt) {
      const p = game.player;
      tu.spawnT -= dt;
      if (tu.spawnT <= 0) {
        tu.spawnT = 3.0;
        const h = laserH(clamp(p.y, ARENA.top + 40, ARENA.floor - 24), 1.5);
        h.tut = { counted: false, hit: false };
        game.hazards.push(h);
      }
      for (const h of game.hazards) {
        if (h.type !== 'laserH' || !h.tut || h.tut.counted) continue;
        if (h.t > h.tele + h.active) {
          h.tut.counted = true;
          if (!h.tut.hit) tu.count++;
        }
      }
      return tu.count >= 3;
    },
    onHit(game, tu, h) { if (h.tut) h.tut.hit = true; },
  },
  {
    title: '탄환 피하기',
    text: ['사방으로 퍼지는 탄환의 빈틈으로 빠져나가세요.', '맞지 않고 3번 피하세요.'],
    goal: 3,
    setup(game, tu) { tu.spawnT = 0.8; tu.waves = []; tu.emitter = { x: 1000, y: 300 }; },
    update(game, tu, dt) {
      tu.spawnT -= dt;
      if (tu.spawnT <= 0) {
        tu.spawnT = 2.8;
        const wave = { hit: false, done: false };
        const n = 10, base = Math.random() * Math.PI * 2;
        for (let i = 0; i < n; i++) {
          const a = base + (i / n) * Math.PI * 2;
          const h = orb(tu.emitter.x, tu.emitter.y, Math.cos(a) * 220, Math.sin(a) * 220);
          h.tut = wave;
          game.hazards.push(h);
        }
        tu.waves.push(wave);
        game.sfx.orb();
        game.fx.ring(tu.emitter.x, tu.emitter.y, 20, 70, 0.25, '255,70,120', 4);
      }
      for (const w of tu.waves) {
        if (w.done) continue;
        if (!game.hazards.some((h) => h.tut === w)) {
          w.done = true;
          if (!w.hit) tu.count++;
        }
      }
      return tu.count >= 3;
    },
    onHit(game, tu, h) { if (h.tut) h.tut.hit = true; },
  },
  {
    title: '기뢰',
    text: ['기뢰는 천천히 다가오고, 가까이 가면 터집니다. 총으로 쏘면 바로 터집니다.', '가까이 오기 전에 멀리서 쏴서 3개를 터뜨리세요.'],
    goal: 3,
    setup(game, tu) {
      tu.spawnMine = () => {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2;
        const h = mine(1150, 300, Math.cos(a) * 400, Math.sin(a) * 400);
        h.life = 999;
        h.slow = 0.55; // 튜토리얼 기뢰는 느리게
        game.hazards.push(h);
      };
      for (let i = 0; i < 3; i++) tu.spawnMine();
    },
    update: (game, tu) => tu.count >= 3,
    onMine(game, tu, m, byPlayer) {
      if (byPlayer || m.chain) tu.count++;
      else {
        game.banner('너무 가까웠습니다', '기뢰는 멀리서 쏴서 터뜨리세요', 1.2);
        tu.spawnMine();
      }
    },
  },
  {
    title: '그로기와 극딜',
    text: ['과녁을 계속 맞히면 체력바 아래 그로기 게이지가 찹니다. 산탄은 게이지를 많이 채웁니다.', '그로기가 되면 받는 피해가 2배, 주무기 반동이 줄어듭니다. 산탄으로 붙어서 몰아서 쏘세요!'],
    setup(game) {
      game.boss.hidden = false;
      game.boss.reset();
    },
    update: (game) => game.boss.groggyCount >= 1 && !game.boss.groggy,
  },
  {
    title: '극딜 스킬',
    text: ['과녁이 그로기로 바닥에 쓰러졌습니다. 극딜 게이지(오른쪽 아래)가 가득 찼습니다.', '과녁 가까이 붙은 뒤 F키를 누르고, 5초 동안 반동 없이 몰아서 쏘세요.'],
    setup(game, tu) {
      game.ult = 100;
      tu.used = false;
      const b = game.boss;
      // 극딜을 다 쓸 때까지 쓰러진 상태 유지
      if (!b.groggy) b.enterGroggy(game);
      b.groggyT = 999;
      b.groggyMax = 999;
    },
    update(game, tu) {
      if (game.ultT > 0) tu.used = true;
      if (tu.used && game.ultT <= 0) {
        game.boss.groggyT = 0.6; // 극딜이 끝나면 일어남
        return true;
      }
      return false;
    },
    bar: (game, tu) => (tu.used ? 1 - game.ultT / 5 : 0),
  },
  {
    title: '튜토리얼 완료',
    text: ['이제 첫 번째 보스 울림종에 도전해 보세요.', '조작법은 언제나 화면 오른쪽 위에 표시됩니다.'],
    update: (game, tu) => tu.t > 3.2,
    silent: true,
  },
];

export class Tutorial {
  constructor() {
    this.i = 0;
    this.t = 0;
    this.count = 0;
    this.passed = false;
    this.doneT = 0;
    this.finished = false;
  }

  get step() { return STEPS[this.i]; }
  get total() { return STEPS.length; }

  start(game) { this.enter(game); }

  enter(game) {
    this.t = 0;
    this.count = 0;
    this.passed = false;
    this.lineY = null;
    this.arrow = false;
    this.emitter = null;
    for (const h of game.hazards) h.dead = true;
    game.targets = [];
    game.rings = [];
    if (this.step.setup) this.step.setup(game, this);
  }

  update(dt, game) {
    if (this.finished) return;
    this.t += dt;
    const p = game.player;
    for (const r of game.rings) {
      if (!r.hit && Math.hypot(p.x - r.x, p.y - r.y) < r.r + p.r * 0.6) {
        r.hit = true;
        game.sfx.reload();
        game.fx.ring(r.x, r.y, r.r, r.r + 50, 0.35, '240,200,130', 6);
      }
    }
    for (const tg of game.targets) tg.flash = Math.max(0, tg.flash - dt);

    if (this.passed) {
      this.doneT += dt;
      if (this.doneT > 1.3) {
        this.i++;
        if (this.i >= STEPS.length) {
          this.finished = true;
          game.onTutorialFinish();
          return;
        }
        this.enter(game);
      }
      return;
    }
    if (this.step.update(game, this, dt)) {
      this.passed = true;
      this.doneT = 0;
      if (!this.step.silent) {
        game.banner('좋습니다!', `${this.step.title} 완료`, 1.2);
        game.sfx.drop(1);
      }
    }
  }

  onHit(game, h) {
    if (this.passed) return;
    if (this.step.onHit) {
      this.step.onHit(game, this, h);
      game.banner('맞았습니다', '이번 회는 횟수에 들어가지 않습니다', 1.0);
    }
  }

  onMine(m, byPlayer, game) {
    if (this.passed) return;
    if (this.step.onMine) this.step.onMine(game, this, m, byPlayer);
  }

  drawWorld(g, t, game) {
    const p = game.player;
    // 높이 기준선
    if (this.lineY !== null && !this.passed) {
      g.strokeStyle = 'rgba(240,208,138,0.8)';
      g.lineWidth = 2;
      g.setLineDash([14, 10]);
      g.beginPath(); g.moveTo(ARENA.left, this.lineY); g.lineTo(ARENA.right, this.lineY); g.stroke();
      g.setLineDash([]);
      g.textAlign = 'left';
      g.font = '500 15px "Noto Sans KR", sans-serif';
      g.fillStyle = '#f0d08a';
      g.fillText('이 높이까지', ARENA.left + 14, this.lineY - 10);
    }
    // 아래 조준 안내 화살표
    if (this.arrow && !this.passed && p.grounded) {
      const a = 0.5 + 0.5 * Math.sin(t * 6);
      g.fillStyle = `rgba(240,208,138,${a})`;
      const ax = p.x, ay = ARENA.floor + 40 + Math.sin(t * 6) * 4;
      g.beginPath(); g.moveTo(ax - 12, ay - 8); g.lineTo(ax + 12, ay - 8); g.lineTo(ax, ay + 6); g.closePath(); g.fill();
      g.textAlign = 'center';
      g.font = '500 13px "Noto Sans KR", sans-serif';
      g.fillText('여기를 조준하고 우클릭', ax, ay + 26);
    }
    // 고리
    for (const r of game.rings) {
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = r.hit ? 'rgba(160,220,170,0.5)' : `rgba(240,200,130,${0.6 + 0.3 * Math.sin(t * 5)})`;
      g.lineWidth = 6;
      g.beginPath(); g.arc(r.x, r.y, r.r, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 2;
      g.beginPath(); g.arc(r.x, r.y, r.r - 9, 0, Math.PI * 2); g.stroke();
      g.globalCompositeOperation = 'source-over';
    }
    // 과녁
    for (const tg of game.targets) {
      if (tg.dead) continue;
      const cols = ['#d8b066', '#3a2232', '#c4364c', '#f3ece2'];
      cols.forEach((c, i) => {
        g.fillStyle = c;
        g.beginPath(); g.arc(tg.x, tg.y, tg.r * (1 - i * 0.24), 0, Math.PI * 2); g.fill();
      });
      if (tg.flash > 0) {
        g.fillStyle = 'rgba(255,255,255,0.7)';
        g.beginPath(); g.arc(tg.x, tg.y, tg.r, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#1c0e1a';
      g.fillRect(tg.x - tg.r, tg.y + tg.r + 6, tg.r * 2, 4);
      g.fillStyle = '#f0d08a';
      g.fillRect(tg.x - tg.r, tg.y + tg.r + 6, tg.r * 2 * (tg.hp / tg.max), 4);
    }
    // 탄환 발사 지점
    if (this.emitter) {
      const e = this.emitter;
      g.save();
      g.translate(e.x, e.y);
      g.rotate(t);
      g.fillStyle = '#3a2232';
      g.beginPath(); g.moveTo(0, -22); g.lineTo(16, 0); g.lineTo(0, 22); g.lineTo(-16, 0); g.closePath(); g.fill();
      g.strokeStyle = '#d8b066';
      g.lineWidth = 2;
      g.stroke();
      g.restore();
      g.fillStyle = `rgba(255,70,120,${0.6 + 0.4 * Math.sin(t * 8)})`;
      g.beginPath(); g.arc(e.x, e.y, 6, 0, Math.PI * 2); g.fill();
    }
  }

  drawHud(g, t, game) {
    const st = this.step;
    const w = 860;
    const x = (W - w) / 2;
    const y = game.boss.hidden ? 28 : 150;
    const h = 116;
    g.fillStyle = 'rgba(16,6,16,0.8)';
    g.fillRect(x, y, w, h);
    g.fillStyle = '#c9a35a';
    g.fillRect(x, y, 3, h);
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.font = '700 13px "Cinzel", "Noto Serif KR", serif';
    g.fillStyle = '#c9a35a';
    g.fillText(`TUTORIAL  ${this.i + 1} / ${this.total}`, x + 24, y + 26);
    g.font = '700 24px "Noto Serif KR", serif';
    g.fillStyle = this.passed ? '#9fe0a8' : '#f3ece2';
    g.fillText(st.title, x + 24, y + 56);
    g.font = '400 15px "Noto Sans KR", sans-serif';
    g.fillStyle = '#d8cfc4';
    st.text.forEach((line, i) => g.fillText(line, x + 24, y + 82 + i * 22));

    // 진행도
    g.textAlign = 'right';
    let prog = null;
    if (st.progress) prog = st.progress(game, this);
    else if (st.goal) prog = [this.count, st.goal];
    if (prog) {
      g.font = '700 26px "Cinzel", "Noto Serif KR", serif';
      g.fillStyle = '#f0d08a';
      g.fillText(`${Math.min(prog[0], prog[1])} / ${prog[1]}`, x + w - 24, y + 56);
    }
    if (st.bar) {
      const k = clamp(st.bar(game, this), 0, 1);
      g.fillStyle = '#1c0e1a';
      g.fillRect(x + w - 224, y + 40, 200, 10);
      g.fillStyle = '#f0d08a';
      g.fillRect(x + w - 224, y + 40, 200 * k, 10);
    }
  }
}
