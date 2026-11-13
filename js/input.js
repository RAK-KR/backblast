// 마우스 / 키보드 입력 + 키 설정(바인딩)
// 전투 중에는 포인터 잠금을 써서 커서가 화면 밖으로 나가지 않게 합니다.
import { W, H } from './config.js';

export const input = {
  mx: 800, my: 450,      // 논리 좌표 (1600x900)
  left: false,           // 연사 키가 눌려 있는지 (매 프레임 바인딩에서 계산)
  right: false,          // 보조무기 키가 눌려 있는지
  keys: new Set(),       // 눌려 있는 키 (키보드 e.code, 마우스는 Mouse0/Mouse1/Mouse2...)
  pressed: new Set(),    // 이번 프레임에 새로 눌린 키
};

// ───── 키 설정 ─────
// 행동마다 키 2개까지. Esc(일시정지)는 고정.
export const ACTIONS = [
  { id: 'fire', name: '연사 (주무기)' },
  { id: 'alt', name: '보조무기 (이동)' },
  { id: 'drop', name: '뚝떨 (수직 낙하)' },
  { id: 'ult', name: '극딜' },
  { id: 'restart', name: '재시작' },
];

export const DEFAULT_BINDS = {
  fire: ['Mouse0', null],
  alt: ['Mouse2', 'Space'],
  drop: ['KeyS', null],
  ult: ['KeyF', null],
  restart: ['KeyR', null],
};

let binds = JSON.parse(JSON.stringify(DEFAULT_BINDS));

export function setBinds(b) {
  binds = JSON.parse(JSON.stringify(DEFAULT_BINDS));
  if (b) for (const a of ACTIONS) if (Array.isArray(b[a.id])) binds[a.id] = [b[a.id][0] || null, b[a.id][1] || null];
}
export function getBinds() { return JSON.parse(JSON.stringify(binds)); }

// 같은 키가 다른 행동에 있으면 그쪽에서 빼고 지정
export function assignBind(action, slot, code) {
  for (const a of ACTIONS) {
    binds[a.id] = binds[a.id].map((c) => (c === code ? null : c));
  }
  binds[action][slot] = code;
}
export function clearBind(action, slot) { binds[action][slot] = null; }

export function isDown(action) { return binds[action].some((c) => c && input.keys.has(c)); }
export function wasPressed(action) { return binds[action].some((c) => c && input.pressed.has(c)); }

const KEY_NAMES = {
  Mouse0: '좌클릭', Mouse1: '휠클릭', Mouse2: '우클릭', Mouse3: '마우스 뒤로', Mouse4: '마우스 앞으로',
  Space: 'Space', ShiftLeft: '왼쪽 Shift', ShiftRight: '오른쪽 Shift', ControlLeft: '왼쪽 Ctrl', ControlRight: '오른쪽 Ctrl',
  AltLeft: '왼쪽 Alt', AltRight: '오른쪽 Alt', Tab: 'Tab', CapsLock: 'CapsLock', Enter: 'Enter', Backspace: 'Backspace',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Backquote: '`', Minus: '-', Equal: '=',
  BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\',
};
export function keyName(code) {
  if (!code) return '';
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `숫자패드 ${code.slice(6)}`;
  return code;
}
// 행동의 키 이름 (예: "우클릭 / Space")
export function bindLabel(action) {
  return binds[action].filter(Boolean).map(keyName).join(' / ') || '없음';
}

// 키 입력 대기 (설정 화면에서 사용)
let capture = null;
export let lastCaptureAt = 0;
export function captureNext(cb) { capture = cb; }
export const isCapturing = () => !!capture;

// ───── 마우스 ─────
let canvasEl = null;
let toLogical = (x, y) => ({ x, y });
let sens = 1;
const OVER = 300;       // 화면 밖으로 나갈 수 있는 거리
const OVER_DOWN = 500;  // 아래쪽은 더 넉넉하게

export function setMapper(fn) { toLogical = fn; }
export function setSensitivity(v) { sens = v; }
export const isLocked = () => !!canvasEl && document.pointerLockElement === canvasEl;

export function lockPointer() {
  if (!canvasEl || isLocked() || !canvasEl.requestPointerLock) return;
  try {
    const r = canvasEl.requestPointerLock();
    if (r && r.catch) r.catch(() => {});
  } catch (e) { /* 지원 안 하면 일반 마우스로 동작 */ }
}

export function unlockPointer() {
  if (isLocked()) document.exitPointerLock();
}

const BLOCKED = new Set(['Escape']); // 바꿀 수 없는 키

export function initInput(canvas, onCanvasDown) {
  canvasEl = canvas;
  const move = (e) => {
    if (isLocked()) {
      const r = canvas.getBoundingClientRect();
      const k = (W / r.width) * sens;
      // 고정 상태에서는 커서가 화면 밖까지 나갈 수 있음 (바닥에서 아래 조준이 편하도록)
      input.mx = Math.max(-OVER, Math.min(W + OVER, input.mx + e.movementX * k));
      input.my = Math.max(-OVER, Math.min(H + OVER_DOWN, input.my + e.movementY * k));
    } else {
      const p = toLogical(e.clientX, e.clientY);
      input.mx = Math.max(0, Math.min(W, p.x));
      input.my = Math.max(0, Math.min(H, p.y));
    }
  };
  window.addEventListener('mousemove', move);

  // 키 설정 대기 중에는 마우스 버튼도 받음
  window.addEventListener('mousedown', (e) => {
    if (capture) {
      e.preventDefault();
      e.stopPropagation();
      const cb = capture; capture = null;
      lastCaptureAt = performance.now(); // 마우스로 지정한 클릭이 다른 칸을 누르지 않도록
      cb(`Mouse${e.button}`);
    }
  }, true);

  canvas.addEventListener('mousedown', (e) => {
    if (!isLocked()) move(e);
    if (onCanvasDown) onCanvasDown();
    const code = `Mouse${e.button}`;
    if (!input.keys.has(code)) input.pressed.add(code);
    input.keys.add(code);
    if (e.button === 1) e.preventDefault();
  });
  window.addEventListener('mouseup', (e) => input.keys.delete(`Mouse${e.button}`));
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('contextmenu', (e) => { if (capture || performance.now() - lastCaptureAt < 600) e.preventDefault(); });
  window.addEventListener('blur', () => { input.keys.clear(); });

  window.addEventListener('keydown', (e) => {
    const k = e.code;
    if (capture) {
      e.preventDefault();
      const cb = capture; capture = null;
      cb(BLOCKED.has(k) ? null : k);
      return;
    }
    if (!input.keys.has(k)) input.pressed.add(k);
    input.keys.add(k);
    if (k === 'Space' || k === 'Tab' || k.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
}

// 매 프레임 시작: 바인딩에서 연사/보조무기 상태 계산
export function beginFrame() {
  input.left = isDown('fire');
  input.right = isDown('alt');
}

// 보조무기를 이번 프레임에 눌렀는지
export function altPressed() { return wasPressed('alt'); }

export function endFrame() {
  input.pressed.clear();
}
