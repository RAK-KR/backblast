// 전역 수치. 밸런스는 여기서만 조절합니다.
export const W = 1600;
export const H = 900;

export const ARENA = {
  left: 40,
  right: W - 40,
  top: 40,
  floor: H - 170,   // 바닥 아래 공간을 넉넉히 두어 아래 조준이 편하도록
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
  iframes: 1.0,
  shellRefillGround: 0.22, // 바닥에 닿고 이 시간 뒤 산탄 전부 충전
  shellRefillAir: 1.8,     // 공중에서 산탄 1발 자연 충전 시간
  heatCool: 0.55,          // 초당 냉각량
  overheatCool: 0.42,      // 과열 상태 냉각량
};

// 모든 보스 공통 규칙 (보스별 수치는 bosses.js)
export const BOSS = {
  groggyTime: 6.0,
  groggyDamageMul: 1.6,   // 그로기 중 받는 피해 배율
  groggyCooldown: 8,      // 그로기가 끝난 뒤 이 시간 동안은 그로기 게이지가 차지 않음 (패턴을 볼 시간)
  groggyRecoilMul: 0.3,   // 그로기 중 주무기 반동 배율 (산탄 반동은 그대로)
};

// 뚝떨: 공중에서 잠깐 멈췄다가 수직 낙하
export const DROP = {
  freeze: 0.1,       // 멈추는 시간(초)
  speed: 1800,       // 낙하 속도
};

// 극딜 스킬 (궁극기)
export const ULT = {
  duration: 5,       // 지속 시간(초)
  fillRatio: 0.3,    // 보스 최대 체력의 이 비율만큼 피해를 주면 게이지가 가득 참
  rateMul: 1.15,     // 극딜 중 연사 속도 배율
  altCd: 0.3,        // 극딜 중 보조무기 연사 간격 (탄수 제한은 없음)
};

export const DMG = {
  laser: 18,
  shock: 15,
  orb: 8,
  mine: 16,
  charge: 20,
};
