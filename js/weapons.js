// 무기 정의와 드랍 굴림.
// primary: 좌클릭 연사 무기 (작은 반동, 과열 있음)
// alt: 우클릭 산탄 계열 (큰 반동, 탄 수 제한) — 이동의 핵심

export const RARITY = [
  { key: 'common',    name: '일반', color: '#a7adb4', mul: 1.00 },
  { key: 'rare',      name: '희귀', color: '#5fb4ff', mul: 1.08 },
  { key: 'epic',      name: '영웅', color: '#c27bff', mul: 1.16 },
  { key: 'legendary', name: '전설', color: '#ffa733', mul: 1.26 },
];

export const PRIMARY = {
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
    rate: 1.6, damage: 260, recoil: 640, heat: 0.18, spread: 0,
    speed: 0, stagger: 9, bullets: 1, size: 0, hitscan: true,
  },
};

export const ALT = {
  scatter: {
    name: '기본 산탄총', desc: '7발 산탄. 반동으로 크게 튀어 오릅니다.',
    pellets: 7, damage: 12, recoil: 1050, shells: 2, spread: 0.24,
    speed: 1700, life: 0.42, stagger: 1.4,
  },
  slug: {
    name: '슬러그 캐논', desc: '단발 대구경. 그로기 게이지를 크게 채웁니다.',
    pellets: 1, damage: 120, recoil: 1250, shells: 1, spread: 0,
    speed: 2300, life: 0.9, stagger: 14,
  },
  twin: {
    name: '트윈 블래스터', desc: '반동은 약하지만 세 번까지 연속으로 쏠 수 있습니다.',
    pellets: 5, damage: 10, recoil: 820, shells: 3, spread: 0.2,
    speed: 1700, life: 0.4, stagger: 1.1,
  },
  flak: {
    name: '플랙 버스터', desc: '사거리가 짧은 대신 근접에서 엄청난 딜이 들어갑니다.',
    pellets: 11, damage: 15, recoil: 1150, shells: 2, spread: 0.34,
    speed: 1500, life: 0.22, stagger: 1.6,
  },
};

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
const TIER_SCALE = [[1, 0.8, 0.35, 0.15], [1, 1, 0.65, 0.45], [1, 1, 1, 1]];

export function rollDrops(grade, tier = 2) {
  const count = grade === 'S' ? 2 : 1;
  const drops = [];
  for (let i = 0; i < count; i++) {
    const slot = Math.random() < 0.5 ? 'primary' : 'alt';
    const pool = Object.keys(slot === 'primary' ? PRIMARY : ALT);
    const id = pool[Math.floor(Math.random() * pool.length)];
    const base = RARITY_TABLE[grade] || RARITY_TABLE.C;
    const sc = TIER_SCALE[tier] || TIER_SCALE[2];
    const wts = base.map((w, j) => w * sc[j]);
    const sum = wts.reduce((a, b) => a + b, 0);
    const rarity = pickWeighted(wts.map((w) => w / sum));
    const quality = 0.94 + Math.random() * 0.12;
    drops.push(makeWeapon(slot, id, rarity, quality));
  }
  return drops;
}
