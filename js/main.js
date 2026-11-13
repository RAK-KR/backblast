// 진입점: 화면 크기, 루프, 저장, 화면 전환
import { W, H } from './config.js';
import { Game } from './game.js';
import { Boss } from './boss.js';
import { UI } from './ui.js';
import { input, initInput, setMapper, endFrame, setSensitivity, lockPointer, unlockPointer, isLocked } from './input.js';
import { initAudio, setVolume, sfx } from './audio.js';
import { loadSave, writeSave } from './save.js';
import { rollBossDrop } from './weapons.js';
import { BOSSES } from './bosses.js';

const canvas = document.getElementById('game');
const stage = document.getElementById('stage');
const g = canvas.getContext('2d');

let save = loadSave();
setVolume(save.settings.volume);
setSensitivity(save.settings.sens || 1);

const game = new Game(sfx);
game.fx.shakeMul = save.settings.shake;

let current = 0; // 진행 중인 스테이지 (-1: 튜토리얼)

function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const scale = Math.min(vw / W, vh / H);
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
// 전투 중 캔버스를 클릭하면 커서 잠금 (잠금이 풀린 상태였을 때)
initInput(canvas, () => { if (game.state === 'play') lockPointer(); });

// Esc로 잠금이 풀리면 일시정지
let lockLostAt = 0;
document.addEventListener('pointerlockchange', () => {
  if (!isLocked() && game.state === 'play') {
    lockLostAt = performance.now();
    pause();
  }
});

function equippedWeapons() {
  const p = save.inventory.find((w) => w.uid === save.equip.primary) || save.inventory.find((w) => w.slot === 'primary');
  const a = save.inventory.find((w) => w.uid === save.equip.alt) || save.inventory.find((w) => w.slot === 'alt');
  return [p, a];
}

function gradeOf(stats, def) {
  const [ts, ta, tb] = def.gradeTimes;
  const tp = stats.time < ts ? 3 : stats.time < ta ? 2 : stats.time < tb ? 1 : 0;
  const dp = stats.taken <= 20 ? 3 : stats.taken <= 45 ? 2 : stats.taken <= 75 ? 1 : 0;
  const s = tp + dp;
  return s >= 5 ? 'S' : s >= 4 ? 'A' : s >= 2 ? 'B' : 'C';
}

const ui = new UI({
  sfx: () => { initAudio(); sfx.ui(); },
  dropSfx: (r) => sfx.drop(r),
  start: () => startStage(current),
  startStage: (i) => startStage(i),
  next: () => startStage(Math.min(current + 1, BOSSES.length - 1)),
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
  setSens: (v) => { save.settings.sens = v; setSensitivity(v); writeSave(save); },
});
ui.syncSettings(save.settings);
ui.updateTitle(save);
ui.show('title');

game.onEnd = (win, stats) => {
  document.body.classList.remove('playing');
  unlockPointer();
  const def = BOSSES[current];
  const hasNext = current < BOSSES.length - 1;
  if (!win) {
    ui.showResult(false, stats, 'C', null, false, false);
    return;
  }
  const grade = gradeOf(stats, def);
  const firstClear = !save.cleared[def.id];
  const res = rollBossDrop(def, grade, save.inventory, firstClear);
  res.first = firstClear;
  for (const d of res.drops) save.inventory.push(d.weapon);
  save.clears++;
  save.cleared[def.id] = true;
  let isBest = false;
  const rec = save.records[def.id];
  if (!rec || stats.time < rec.time) { save.records[def.id] = { time: stats.time, grade }; isBest = true; }
  writeSave(save);
  ui.showResult(true, stats, grade, res, isBest, hasNext);
};

game.onTutorialDone = () => {
  document.body.classList.remove('playing');
  unlockPointer();
  save.tutorialDone = true;
  writeSave(save);
  game.state = 'idle';
  game.player = null;
  game.boss = new Boss(BOSSES[BOSSES.length - 1]);
  ui.openStages();
};

function startStage(i) {
  initAudio();
  current = i;
  const [p, a] = equippedWeapons();
  if (i < 0) game.start(p, a, null, 'tutorial');
  else game.start(p, a, BOSSES[i], 'boss');
  ui.hideAll();
  document.body.classList.add('playing');
  lockPointer();
}

function pause() {
  if (game.state !== 'play') return;
  game.prevState = 'play';
  game.state = 'pause';
  input.left = false;
  input.right = false;
  unlockPointer();
  ui.showPause();
  document.body.classList.remove('playing');
}

function resume() {
  if (game.state !== 'pause') return;
  game.state = game.prevState || 'play';
  ui.hideAll();
  document.body.classList.add('playing');
  lockPointer();
}

function toTitle() {
  unlockPointer();
  game.state = 'idle';
  game.player = null;
  game.tutorial = null;
  game.boss = new Boss(BOSSES[BOSSES.length - 1]);
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
    // 잠금 해제와 같은 Esc 입력으로 바로 다시 재개되지 않도록
    if (game.state === 'play') pause();
    else if (game.state === 'pause' && performance.now() - lockLostAt > 400) resume();
  }
  if (input.pressed.has('KeyR') && (game.state === 'play' || game.state === 'pause' || game.state === 'defeat')) startStage(current);

  game.update(dt);
  g.clearRect(0, 0, W, H);
  game.draw(g, t);
  endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 테스트용 핸들
window.__bb = { game, input, getSave: () => save, startStage };
