// 메뉴 화면 (타이틀 / 장비 / 일시정지 / 결과·드랍)
import { RARITY, weaponDef, weaponMul } from './weapons.js';
import { formatTime } from './game.js';

const $ = (sel) => document.querySelector(sel);

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

export function weaponPower(w) {
  const d = weaponDef(w);
  const m = weaponMul(w);
  if (w.slot === 'primary') return d.damage * m * d.rate;
  return d.damage * m * d.pellets;
}

function statLines(w) {
  const d = weaponDef(w);
  const m = weaponMul(w);
  if (w.slot === 'primary') {
    return [
      ['피해', Math.round(d.damage * m)],
      ['연사', `${d.rate}/s`],
      ['반동', d.recoil],
      ['초당 피해', Math.round(d.damage * m * d.rate)],
    ];
  }
  return [
    ['피해', d.pellets > 1 ? `${Math.round(d.damage * m)} × ${d.pellets}` : Math.round(d.damage * m)],
    ['장탄', d.shells],
    ['반동', d.recoil],
    ['한 발 총합', Math.round(d.damage * m * d.pellets)],
  ];
}

function weaponCard(w, opts = {}) {
  const d = weaponDef(w);
  const r = RARITY[w.rarity];
  const card = el('div', 'wcard');
  card.style.setProperty('--rc', r.color);
  if (opts.equipped) card.classList.add('equipped');
  const head = el('div', 'wcard-head');
  head.append(el('span', 'wcard-rarity', r.name));
  head.append(el('span', 'wcard-slot', w.slot === 'primary' ? '주무기 · 좌클릭' : '보조무기 · 우클릭'));
  card.append(head);
  card.append(el('div', 'wcard-name', d.name));
  card.append(el('div', 'wcard-desc', d.desc));
  const stats = el('div', 'wcard-stats');
  for (const [k, v] of statLines(w)) {
    const row = el('div', 'stat');
    row.append(el('span', 'k', k), el('span', 'v', String(v)));
    stats.append(row);
  }
  card.append(stats);
  card.append(el('div', 'wcard-quality', `품질 ${Math.round(w.quality * 100)}% · 등급 보정 ×${r.mul.toFixed(2)}`));
  if (opts.compare !== undefined) {
    const diff = opts.compare;
    const cls = diff > 0.5 ? 'up' : diff < -0.5 ? 'down' : 'same';
    const txt = cls === 'same' ? '현재 장비와 비슷함' : `현재 장비 대비 ${diff > 0 ? '+' : ''}${diff.toFixed(0)}%`;
    card.append(el('div', `wcard-compare ${cls}`, txt));
  }
  if (opts.equipped) card.append(el('div', 'wcard-badge', '장착 중'));
  return card;
}

export class UI {
  constructor(handlers) {
    this.h = handlers;
    this.screens = ['title', 'loadout', 'pause', 'result', 'help'];
    this.loadoutReturn = 'title';

    $('#btn-start').onclick = () => { this.h.sfx(); this.h.start(); };
    $('#btn-loadout').onclick = () => { this.h.sfx(); this.openLoadout('title'); };
    $('#btn-help').onclick = () => { this.h.sfx(); this.show('help'); };
    $('#btn-help-back').onclick = () => { this.h.sfx(); this.show('title'); };
    $('#btn-loadout-back').onclick = () => { this.h.sfx(); this.show(this.loadoutReturn); };
    $('#btn-loadout-start').onclick = () => { this.h.sfx(); this.h.start(); };
    $('#btn-resume').onclick = () => { this.h.sfx(); this.h.resume(); };
    $('#btn-restart').onclick = () => { this.h.sfx(); this.h.start(); };
    $('#btn-quit').onclick = () => { this.h.sfx(); this.h.toTitle(); };
    $('#btn-retry').onclick = () => { this.h.sfx(); this.h.start(); };
    $('#btn-result-loadout').onclick = () => { this.h.sfx(); this.openLoadout('result'); };
    $('#btn-result-title').onclick = () => { this.h.sfx(); this.h.toTitle(); };
    $('#btn-reveal-all').onclick = () => this.revealAll();

    for (const id of ['#vol-title', '#vol-pause']) {
      const s = $(id);
      s.oninput = () => {
        const v = Number(s.value) / 100;
        $('#vol-title').value = s.value;
        $('#vol-pause').value = s.value;
        this.h.setVolume(v);
      };
    }
    for (const id of ['#shake-title', '#shake-pause']) {
      const c = $(id);
      c.onchange = () => {
        $('#shake-title').checked = c.checked;
        $('#shake-pause').checked = c.checked;
        this.h.setShake(c.checked ? 1 : 0);
      };
    }
  }

  syncSettings(settings) {
    const v = Math.round(settings.volume * 100);
    $('#vol-title').value = v;
    $('#vol-pause').value = v;
    $('#shake-title').checked = settings.shake > 0;
    $('#shake-pause').checked = settings.shake > 0;
  }

  show(name) {
    for (const s of this.screens) $(`#${s}`).classList.toggle('hidden', s !== name);
    document.body.classList.toggle('in-menu', !!name);
  }

  hideAll() { this.show(null); }

  updateTitle(save) {
    const best = save.best;
    $('#title-best').textContent = best ? `최고 기록 ${formatTime(best.time)} · ${best.grade} 등급 · 처치 ${save.clears}회` : '아직 처치 기록이 없습니다';
  }

  openLoadout(from) {
    this.loadoutReturn = from;
    this.renderLoadout();
    this.show('loadout');
  }

  renderLoadout() {
    const save = this.h.getSave();
    for (const slot of ['primary', 'alt']) {
      const box = $(slot === 'primary' ? '#inv-primary' : '#inv-alt');
      box.innerHTML = '';
      const items = save.inventory
        .filter((w) => w.slot === slot)
        .sort((a, b) => (b.uid === save.equip[slot]) - (a.uid === save.equip[slot]) || b.rarity - a.rarity || weaponPower(b) - weaponPower(a));
      for (const w of items) {
        const equipped = save.equip[slot] === w.uid;
        const card = weaponCard(w, { equipped });
        card.classList.add('clickable');
        card.onclick = () => {
          if (equipped) return;
          this.h.sfx();
          this.h.equip(w);
          this.renderLoadout();
        };
        if (!equipped) {
          const del = el('button', 'wcard-del', '버리기');
          del.onclick = (e) => {
            e.stopPropagation();
            this.h.sfx();
            this.h.discard(w);
            this.renderLoadout();
          };
          card.append(del);
        }
        box.append(card);
      }
    }
  }

  showPause() { this.show('pause'); }

  showResult(win, stats, grade, drops, isBest) {
    $('#result-title').textContent = win ? '처치 성공' : '패배';
    $('#result-title').className = win ? 'win' : 'lose';
    const gradeEl = $('#result-grade');
    gradeEl.textContent = win ? grade : '';
    gradeEl.className = `grade g-${grade}`;
    gradeEl.style.display = win ? '' : 'none';
    $('#result-best').textContent = win && isBest ? '최고 기록 갱신' : '';

    const rows = [
      ['전투 시간', formatTime(stats.time)],
      ['총 피해', Math.round(stats.damage).toLocaleString()],
      ['최고 극딜', Math.round(stats.bestBurst).toLocaleString()],
      ['그로기', `${stats.groggy}회`],
      ['최대 한 방', Math.round(stats.maxHit).toLocaleString()],
      ['받은 피해', Math.round(stats.taken).toLocaleString()],
    ];
    const tbl = $('#result-stats');
    tbl.innerHTML = '';
    for (const [k, v] of rows) {
      const r = el('div', 'stat');
      r.append(el('span', 'k', k), el('span', 'v', v));
      tbl.append(r);
    }

    const dropBox = $('#result-drops');
    dropBox.innerHTML = '';
    this.pendingDrops = [];
    if (win && drops.length) {
      $('#drop-section').style.display = '';
      $('#btn-reveal-all').style.display = '';
      drops.forEach((w, i) => {
        const slot = el('div', 'drop-slot');
        const back = el('div', 'drop-back', '<span>?</span><em>클릭해서 확인</em>');
        back.style.setProperty('--rc', RARITY[w.rarity].color);
        if (w.rarity >= 2) back.classList.add('glow');
        slot.append(back);
        dropBox.append(slot);
        const reveal = () => {
          if (slot.dataset.open) return;
          slot.dataset.open = '1';
          this.h.dropSfx(w.rarity);
          const save = this.h.getSave();
          const eq = save.inventory.find((x) => x.uid === save.equip[w.slot]);
          const diff = eq ? (weaponPower(w) / weaponPower(eq) - 1) * 100 : 0;
          const card = weaponCard(w, { compare: diff });
          card.classList.add('reveal');
          const btn = el('button', 'btn small', '바로 장착');
          btn.onclick = () => {
            this.h.sfx();
            this.h.equip(w);
            btn.textContent = '장착함';
            btn.disabled = true;
          };
          card.append(btn);
          slot.innerHTML = '';
          slot.append(card);
        };
        back.onclick = reveal;
        this.pendingDrops.push(reveal);
        void i;
      });
    } else {
      $('#drop-section').style.display = 'none';
    }
    this.show('result');
  }

  revealAll() {
    (this.pendingDrops || []).forEach((fn, i) => setTimeout(fn, i * 260));
    $('#btn-reveal-all').style.display = 'none';
  }
}
