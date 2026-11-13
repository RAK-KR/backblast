// 무기 정의와 드랍 굴림.
// primary: 좌클릭 연사 무기 (작은 반동, 과열 있음)
// alt: 우클릭 산탄 계열 (큰 반동, 탄 수 제한) — 이동의 핵심

export const RARITY = [
  { key: 'common',    name: '일반', color: '#a7adb4', mul: 1.00 },
  { key: 'rare',      name: '희귀', color: '#5fb4ff', mul: 1.05 },
  { key: 'epic',      name: '영웅', color: '#c27bff', mul: 1.10 },
  { key: 'legendary', name: '전설', color: '#ffa733', mul: 1.15 },
];

export const PRIMARY = {
  hellfire: {
    name: '헬파이어', desc: '느리게 날아가는 대형 화염탄. 한 발 피해와 그로기 수치가 매우 큽니다.',
    rate: 2.4, damage: 75, recoil: 320, heat: 0.12, spread: 0.01,
    speed: 1250, stagger: 6, bullets: 1, size: 9,
  },
  splitter: {
    name: '스플리터', desc: '한 번에 탄 3발을 부채꼴로 쏩니다. 가까이 붙어서 쏠수록 강합니다.',
    rate: 6, damage: 9, recoil: 150, heat: 0.05, spread: 0.12,
    speed: 2000, stagger: 0.8, bullets: 3, size: 3,
  },
  rifle: {
    name: '기본 소총', desc: '무난한 연사. 아래로 쏘면 낙하를 늦출 수 있습니다.',
    rate: 11, damage: 14, recoil: 92, heat: 0.035, spread: 0.035,
    speed: 2100, stagger: 0.55, bullets: 1, size: 3,
  },
  repeater: {
    name: '볼트 리피터', desc: '느리지만 한 발이 묵직합니다. 반동으로 짧게 끊어 이동할 수 있습니다.',
    rate: 5.5, damage: 36, recoil: 230, heat: 0.06, spread: 0.012,
    speed: 2500, stagger: 1.6, bullets: 1, size: 4,
  },
  needle: {
    name: '니들 SMG', desc: '아주 빠른 연사, 퍼짐이 큽니다. 반동이 작아 자리를 지키기 좋습니다.',
    rate: 22, damage: 7.5, recoil: 40, heat: 0.018, spread: 0.09,
    speed: 1900, stagger: 0.3, bullets: 1, size: 2.5,
  },
  lance: {
    name: '레일 랜스', desc: '즉시 관통하는 광선. 한 발마다 몸이 크게 밀립니다.',
    rate: 1.6, damage: 150, recoil: 640, heat: 0.18, spread: 0,
    speed: 0, stagger: 5, bullets: 1, size: 0, hitscan: true,
  },
};

// mode: blast(반동으로 튕김, 기본) / anchor(갈고리로 끌려감) / jet(누르는 동안 분사)
export const ALT = {
  scatter: {
    name: '기본 산탄총', desc: '7발 산탄. 쏜 반대 방향으로 크게 튕겨 나갑니다.',
    mode: 'blast', move: '반동 점프',
    pellets: 7, damage: 12, recoil: 1050, shells: 2, spread: 0.24,
    speed: 1700, life: 0.42, stagger: 1.4,
  },
  twin: {
    name: '트윈 블래스터', desc: '반동은 약하지만 세 번까지 연속으로 쏠 수 있어 짧게 끊어 움직입니다.',
    mode: 'blast', move: '짧은 3단 점프',
    pellets: 5, damage: 10, recoil: 820, shells: 3, spread: 0.2,
    speed: 1700, life: 0.4, stagger: 1.1,
  },
  anchor: {
    name: '앵커 건', desc: '조준한 곳에 갈고리를 박고 그쪽으로 끌려갑니다. 반동과 반대로, 조준한 방향으로 날아갑니다. 보스에 박으면 피해와 함께 보스에게 붙습니다.',
    mode: 'anchor', move: '갈고리 당기기',
    pellets: 1, damage: 45, recoil: 0, shells: 2, spread: 0,
    speed: 2800, range: 1250, pullSpeed: 1450, life: 0.6, stagger: 8,
  },
  slug: {
    name: '슬러그 캐논', desc: '단발 대구경. 한 방에 아주 멀리 날아가고 그로기 게이지를 크게 채웁니다.',
    mode: 'blast', move: '한 방 장거리 점프',
    pellets: 1, damage: 90, recoil: 1250, shells: 1, spread: 0,
    speed: 2300, life: 0.9, stagger: 9,
  },
  jet: {
    name: '분사기', desc: '누르고 있는 동안 조준 반대 방향으로 계속 분사해 공중에 떠 있을 수 있습니다. 가까이 있는 적을 불꽃으로 태웁니다. 바닥에 닿으면 연료가 찹니다.',
    mode: 'jet', move: '지속 비행',
    pellets: 1, damage: 9, recoil: 0, shells: 0, spread: 0.18,
    speed: 900, life: 0.22, stagger: 0.5, thrust: 2350, drain: 0.6, tick: 0.05,
  },
  flak: {
    name: '플랙 버스터', desc: '사거리가 짧은 대신 근접에서 엄청난 피해가 들어갑니다.',
    mode: 'blast', move: '반동 점프',
    pellets: 11, damage: 10, recoil: 1150, shells: 2, spread: 0.34,
    speed: 1500, life: 0.22, stagger: 1.6,
  },
  blink: {
    name: '블링크 코어', desc: '조준한 방향으로 짧게 순간이동합니다. 이동하는 순간 잠깐 무적이 되고, 떠난 자리에 작은 폭발을 남깁니다.',
    mode: 'blink', move: '순간이동',
    pellets: 1, damage: 40, recoil: 0, shells: 2, spread: 0,
    speed: 0, life: 0, stagger: 5, range: 290, carry: 420, iframes: 0.3,
  },
  bounce: {
    name: '리바운더', desc: '쏘면 1.5초 동안 몸이 고무공처럼 되어 벽·바닥·천장에서 크게 튕깁니다. 탄도 벽에 한 번 튕깁니다.',
    mode: 'blast', move: '튕기는 몸',
    pellets: 6, damage: 12, recoil: 950, shells: 2, spread: 0.22,
    speed: 1700, life: 0.6, stagger: 1.3, bounceTime: 1.5, bulletBounce: 1,
  },
};

export const slotOf = (id) => (PRIMARY[id] ? 'primary' : 'alt');

let uidCounter = Date.now() % 100000;
const newUid = () => `w${(uidCounter++).toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

export function makeWeapon(slot, id, rarityIdx = 0, quality = 1) {
  return { uid: newUid(), slot, id, rarity: rarityIdx, quality: Math.round(quality * 100) / 100 };
}

export function starterWeapons() {
  return [makeWeapon('primary', 'rifle', 0, 1), makeWeapon('alt', 'scatter', 0, 1)];
}

export function weaponDef(w) {
  return w.slot === 'primary' ? PRIMARY[w.id] : ALT[w.id];
}

// 레어도·품질을 반영한 최종 피해 배율
export function weaponMul(w) {
  return RARITY[w.rarity].mul * w.quality;
}

export function weaponTitle(w) {
  return `${weaponDef(w).name}`;
}

// 전투 등급(S/A/B/C)에 따른 레어도 확률
const RARITY_TABLE = {
  S: [0.10, 0.35, 0.35, 0.20],
  A: [0.25, 0.40, 0.27, 0.08],
  B: [0.45, 0.38, 0.14, 0.03],
  C: [0.65, 0.28, 0.06, 0.01],
};

function pickWeighted(weights) {
  let r = Math.random();
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

// tier: 보스 단계 (0=1단계, 1=2단계, 2=최종). 앞 단계일수록 높은 등급이 덜 나옴
const TIER_SCALE = [[1, 0.8, 0.35, 0.15], [1, 1, 0.65, 0.45], [1, 1, 1, 1], [0.7, 1, 1.3, 1.7]];
// 첫 처치 이후 드랍 확률 (등급별)
export const DROP_CHANCE = { S: 0.45, A: 0.32, B: 0.25, C: 0.18 };

function rollRarity(grade, tier) {
  const base = RARITY_TABLE[grade] || RARITY_TABLE.C;
  const sc = TIER_SCALE[tier] || TIER_SCALE[2];
  const wts = base.map((w, j) => w * sc[j]);
  const sum = wts.reduce((a, b) => a + b, 0);
  return pickWeighted(wts.map((w) => w / sum));
}

// 보유한 같은 무기 중 가장 높은 등급 (없으면 -1)
export function bestOwned(inventory, id) {
  let best = -1;
  for (const w of inventory) if (w.id === id && w.rarity > best) best = w.rarity;
  return best;
}

// 보스 처치 드랍. 결과: { drops: [{ weapon, kind: 'new' | 'upgrade' }], chance }
export function rollBossDrop(def, grade, inventory, firstClear) {
  const chance = firstClear ? 1 : (DROP_CHANCE[grade] || DROP_CHANCE.C);
  const loot = def.loot || [];
  if (!loot.length || Math.random() > chance) return { drops: [], chance };
  const unowned = loot.filter((id) => bestOwned(inventory, id) < 0);
  let id;
  let rarity = rollRarity(grade, def.tier);
  let kind = 'new';
  if (unowned.length) {
    id = unowned[Math.floor(Math.random() * unowned.length)];
  } else {
    // 모두 가지고 있으면 더 높은 등급만 나옴
    const up = loot.filter((x) => bestOwned(inventory, x) < RARITY.length - 1);
    if (!up.length) return { drops: [], chance, complete: true };
    id = up[Math.floor(Math.random() * up.length)];
    const owned = bestOwned(inventory, id);
    if (rarity <= owned) rarity = owned + 1;
    kind = 'upgrade';
  }
  const quality = 0.94 + Math.random() * 0.12;
  return { drops: [{ weapon: makeWeapon(slotOf(id), id, rarity, quality), kind }], chance };
}
