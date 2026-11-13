// 마우스 / 키보드 입력
export const input = {
  mx: 800, my: 450,      // 논리 좌표 (1600x900)
  left: false,
  right: false,
  rightPressed: false,   // 이번 프레임에 눌렸는지
  keys: new Set(),
  pressed: new Set(),
};

let toLogical = (x, y) => ({ x, y });

export function setMapper(fn) { toLogical = fn; }

export function initInput(canvas) {
  const move = (e) => {
    const p = toLogical(e.clientX, e.clientY);
    input.mx = p.x; input.my = p.y;
  };
  window.addEventListener('mousemove', move);
  canvas.addEventListener('mousedown', (e) => {
    move(e);
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
