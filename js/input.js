// 마우스 / 키보드 입력
// 전투 중에는 포인터 잠금을 써서 커서가 화면 밖으로 나가지 않게 합니다.
import { W, H } from './config.js';

export const input = {
  mx: 800, my: 450,      // 논리 좌표 (1600x900)
  left: false,
  right: false,
  rightPressed: false,   // 이번 프레임에 눌렸는지
  keys: new Set(),
  pressed: new Set(),
};

let canvasEl = null;
let toLogical = (x, y) => ({ x, y });
let sens = 1;

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

export function initInput(canvas, onCanvasDown) {
  canvasEl = canvas;
  const move = (e) => {
    if (isLocked()) {
      const r = canvas.getBoundingClientRect();
      const k = (W / r.width) * sens;
      input.mx = Math.max(0, Math.min(W, input.mx + e.movementX * k));
      input.my = Math.max(0, Math.min(H, input.my + e.movementY * k));
    } else {
      const p = toLogical(e.clientX, e.clientY);
      input.mx = Math.max(0, Math.min(W, p.x));
      input.my = Math.max(0, Math.min(H, p.y));
    }
  };
  window.addEventListener('mousemove', move);
  canvas.addEventListener('mousedown', (e) => {
    if (!isLocked()) move(e);
    if (onCanvasDown) onCanvasDown();
    if (e.button === 0) input.left = true;
    if (e.button === 2) { if (!input.right) input.rightPressed = true; input.right = true; }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.left = false;
    if (e.button === 2) input.right = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('blur', () => { input.left = false; input.right = false; input.keys.clear(); });

  window.addEventListener('keydown', (e) => {
    const k = e.code;
    if (!input.keys.has(k)) input.pressed.add(k);
    input.keys.add(k);
    if (k === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
}

// 우클릭 대신 Space / Shift도 산탄으로 사용 가능
export function altPressed() {
  return input.rightPressed || input.pressed.has('Space') || input.pressed.has('ShiftLeft');
}

export function endFrame() {
  input.rightPressed = false;
  input.pressed.clear();
}
