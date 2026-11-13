// 진입점: 화면 크기, 루프, 저장, 화면 전환
import { W, H } from './config.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { input, initInput, setMapper, endFrame } from './input.js';
import { initAudio, setVolume, sfx } from './audio.js';
import { loadSave, writeSave } from './save.js';
import { rollDrops } from './weapons.js';

const canvas = document.getElementById('game');
const stage = document.getElementById('stage');
const g = canvas.getContext('2d');

let save = loadSave();
setVolume(save.settings.volume);

const game = new Game(sfx);
game.fx.shakeMul = save.settings.shake;

let scale = 1;
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  scale = Math.min(vw / W, vh / H);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  stage.style.transform = `translate(${(vw - W * scale) / 2}px, ${(vh - H * scale) / 2}px) scale(${scale})`;
  canvas.width = Math.round(W * scale * dpr);
  canvas.height = Math.round(H * scale * dpr);
  g.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
}
window.addEventListener('resize', resize);
window.addEventListener('blur', () => pause());
resize();

setMapper((cx, cy) => {
  const r = canvas.getBoundingClientRect();
  return { x: ((cx - r.left) / r.width) * W, y: ((cy - r.top) / r.height) * H };
});
initInput(canvas);

function equippedWeapons() {
  const p = save.inventory.find((w) => w.uid === save.equip.primary) || save.inventory.find((w) => w.slot === 'primary');
  const a = save.inventory.find((w) => w.uid === save.equip.alt) || save.inventory.find((w) => w.slot === 'alt');
  return [p, a];
}

function gradeOf(stats) {
  const tp = stats.time < 95 ? 3 : stats.time < 135 ? 2 : stats.time < 190 ? 1 : 0;
  const dp = stats.taken <= 20 ? 3 : stats.taken <= 45 ? 2 : stats.taken <= 75 ? 1 : 0;
  const s = tp + dp;
  return s >= 5 ? 'S' : s >= 4 ? 'A' : s >= 2 ? 'B' : 'C';
}

const ui = new UI({
  sfx: () => { initAudio(); sfx.ui(); },
  dropSfx: (r) => sfx.drop(r),
  start: () => startFight(),
  resume: () => resume(),
  toTitle: () => toTitle(),
  getSave: () => save,
  equip: (w) => {
    if (!save.inventory.find((x) => x.uid === w.uid)) save.inventory.push(w);
    save.equip[w.slot] = w.uid;
    writeSave(save);
  },
  discard: (w) => {
    if (save.equip[w.slot] === w.uid) return;
    save.inventory = save.inventory.filter((x) => x.uid !== w.uid);
    writeSave(save);
  },
  setVolume: (v) => { save.settings.volume = v; setVolume(v); writeSave(save); },
  setShake: (v) => { save.settings.shake = v; game.fx.shakeMul = v; writeSave(save); },
});
ui.syncSettings(save.settings);
ui.updateTitle(save);
ui.show('title');

game.onEnd = (win, stats) => {
  document.body.classList.remove('playing');
  if (!win) {
    ui.showResult(false, stats, 'C', [], false);
    return;
  }
  const grade = gradeOf(stats);
  const drops = rollDrops(grade);
  // 드랍은 바로 인벤토리에 들어감
  for (const d of drops) save.inventory.push(d);
  save.clears++;
  let isBest = false;
  if (!save.best || stats.time < save.best.time) { save.best = { time: stats.time, grade }; isBest = true; }
  writeSave(save);
  ui.showResult(true, stats, grade, drops, isBest);
};

function startFight() {
  initAudio();
  const [p, a] = equippedWeapons();
  game.start(p, a);
  ui.hideAll();
  document.body.classList.add('playing');
}

function pause() {
  if (game.state !== 'play') return;
  game.prevState = 'play';
  game.state = 'pause';
  input.left = false;
  ui.showPause();
  document.body.classList.remove('playing');
}

function resume() {
  if (game.state !== 'pause') return;
  game.state = game.prevState || 'play';
  ui.hideAll();
  document.body.classList.add('playing');
}

function toTitle() {
  game.state = 'idle';
  game.player = null;
  game.boss.reset();
  ui.updateTitle(save);
  ui.show('title');
  document.body.classList.remove('playing');
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(1 / 30, (now - last) / 1000);
  last = now;
  const t = now / 1000;

  if (input.pressed.has('Escape')) {
    if (game.state === 'play') pause();
    else if (game.state === 'pause') resume();
  }
  if (input.pressed.has('KeyR') && (game.state === 'play' || game.state === 'pause' || game.state === 'defeat')) startFight();

  game.update(dt);
  g.clearRect(0, 0, W, H);
  game.draw(g, t);
  endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 테스트용 핸들
window.__bb = { game, getSave: () => save };
