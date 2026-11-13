// 전역 수치. 밸런스는 여기서만 조절합니다.
export const W = 1600;
export const H = 900;

export const ARENA = {
  left: 40,
  right: W - 40,
  top: 40,
  floor: H - 90,
};

export const PHYS = {
  gravity: 1500,
  maxSpeed: 1500,
  airDrag: 0.12,        // 초당 감쇠 비율
  groundFriction: 7.5,  // 바닥에 닿아 있을 때 감쇠
  wallBounce: 0.35,
  floorBounce: 0.18,
};

export const PLAYER = {
  radius: 18,
  maxHp: 100,
  iframes: 0.8,
  shellRefillGround: 0.22, // 바닥에 닿고 이 시간 뒤 산탄 전부 충전
  shellRefillAir: 2.4,     // 공중에서 산탄 1발 자연 충전 시간
  heatCool: 0.55,          // 초당 냉각량
  overheatCool: 0.42,      // 과열 상태 냉각량
};

export const BOSS = {
  maxHp: 16000,
  radius: 86,
  staggerMax: 100,
  groggyTime: 6.0,
  groggyDamageMul: 2.0,   // 그로기 중 받는 피해 배율
  groggyRecoilMul: 0.3,   // 그로기 중 플레이어 반동 배율 (극딜 구간)
  phase2At: 0.5,
  contactDamage: 15,
};

export const DMG = {
  laser: 24,
  shock: 20,
  orb: 10,
  mine: 22,
  charge: 26,
};
