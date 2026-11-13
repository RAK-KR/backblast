// 로컬 저장 (브라우저 저장소가 막혀 있어도 게임은 돌아가도록 try/catch)
import { starterWeapons } from './weapons.js';

const KEY = 'backblast-save-v1';

function defaults() {
  const inv = starterWeapons();
  return {
    inventory: inv,
    equip: { primary: inv[0].uid, alt: inv[1].uid },
    best: null,      // { time, grade }
    clears: 0,
    settings: { volume: 0.7, shake: 1 },
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const data = JSON.parse(raw);
    const base = defaults();
    const merged = { ...base, ...data, settings: { ...base.settings, ...(data.settings || {}) } };
    if (!Array.isArray(merged.inventory) || merged.inventory.length === 0) return base;
    return merged;
  } catch (e) {
    return defaults();
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    // 저장 실패는 무시
  }
}

export function resetSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ }
  return defaults();
}
