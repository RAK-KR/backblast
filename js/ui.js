// 메뉴 화면 (타이틀 / 장비 / 일시정지 / 결과·드랍)
import { RARITY, weaponDef, weaponMul, DROP_CHANCE, PRIMARY, ALT, bestOwned } from './weapons.js';
import { formatTime } from './game.js';
import { BOSSES } from './bosses.js';
import { ACTIONS, DEFAULT_BINDS, getBinds, setBinds, assignBind, clearBind, captureNext, keyName, bindLabel, lastCaptureAt } from './input.js';

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
  if (w.slot === 'primary') return d.damage * m * d.rate * (d.bullets || 1);
  if (d.mode === 'jet') return (d.damage * m) / d.tick;
  return d.damage * m * d.pellets;
}

function statLines(w) {
  const d = weaponDef(w);
  const m = weaponMul(w);
  if (w.slot === 'primary') {
    return [
      ['피해', (d.bullets || 1) > 1 ? `${Math.round(d.damage * m)} × ${d.bullets}` : Math.round(d.damage * m)],
      ['연사', `${d.rate}/s`],
      ['반동', d.recoil],
      ['초당 피해', Math.round(d.damage * m * d.rate * (d.bullets || 1))],
    ];
  }
  if (d.mode === 'jet') {
    return [
      ['이동', d.move],
      ['불꽃 피해', Math.round(d.damage * m)],
      ['연료', `${(1 / d.drain).toFixed(1)}초`],
      ['초당 피해', Math.round((d.damage * m) / d.tick)],
    ];
  }
  if (d.mode === 'blink') {
    return [
      ['이동', d.move],
      ['폭발 피해', Math.round(d.damage * m)],
      ['장탄', d.shells],
      ['거리', d.range],
    ];
  }
  if (d.mode === 'anchor') {
    return [
      ['이동', d.move],
      ['갈고리 피해', Math.round(d.damage * m)],
      ['장탄', d.shells],
      ['사거리', d.range],
    ];
  }
  return [
    ['이동', d.move],
    ['피해', d.pellets > 1 ? `${Math.round(d.damage * m)} × ${d.pellets}` : Math.round(d.damage * m)],
    ['장탄', d.shells],
    ['반동', d.recoil],
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
  if (opts.tag) card.append(el('div', `wcard-tag ${opts.tagCls || ''}`, opts.tag));
  return card;
}

export class UI {
  constructor(handlers) {
    this.h = handlers;
    this.screens = ['title', 'loadout', 'pause', 'result', 'help', 'stages', 'keys'];
    this.keysReturn = 'title';
    this.loadoutReturn = 'title';

    $('#btn-start').onclick = () => { this.h.sfx(); this.openStages(); };
    $('#btn-stages-back').onclick = () => { this.h.sfx(); this.show('title'); };
    $('#btn-stages-loadout').onclick = () => { this.h.sfx(); this.openLoadout('stages'); };
    $('#btn-next').onclick = () => { this.h.sfx(); this.h.next(); };
    $('#btn-loadout').onclick = () => { this.h.sfx(); this.openLoadout('title'); };
    $('#btn-help').onclick = () => { this.h.sfx(); this.renderHelp(); this.show('help'); };
    $('#btn-keys').onclick = () => { this.h.sfx(); this.openKeys('title'); };
    $('#btn-pause-keys').onclick = () => { this.h.sfx(); this.openKeys('pause'); };
    $('#btn-keys-back').onclick = () => { this.h.sfx(); this.show(this.keysReturn); };
    $('#btn-keys-reset').onclick = () => {
      this.h.sfx();
      setBinds(DEFAULT_BINDS);
      this.h.saveBinds();
      this.renderKeys();
    };
    $('#btn-help-back').onclick = () => { this.h.sfx(); this.show('title'); };
    $('#btn-loadout-back').onclick = () => { this.h.sfx(); this.show(this.loadoutReturn); };
    $('#btn-loadout-start').onclick = () => { this.h.sfx(); this.openStages(); };
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
    for (const id of ['#sens-title', '#sens-pause']) {
      const s = $(id);
      s.oninput = () => {
        $('#sens-title').value = s.value;
        $('#sens-pause').value = s.value;
        const txt = (Number(s.value) / 100).toFixed(2);
        $('#sens-title-v').textContent = txt;
        $('#sens-pause-v').textContent = txt;
        this.h.setSens(Number(s.value) / 100);
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
    const sv = Math.round((settings.sens || 1) * 100);
    $('#sens-title').value = sv;
    $('#sens-pause').value = sv;
    $('#sens-title-v').textContent = (sv / 100).toFixed(2);
    $('#sens-pause-v').textContent = (sv / 100).toFixed(2);
    $('#shake-title').checked = settings.shake > 0;
    $('#shake-pause').checked = settings.shake > 0;
  }

  show(name) {
    this.cur = name;
    for (const s of this.screens) $(`#${s}`).classList.toggle('hidden', s !== name);
    document.body.classList.toggle('in-menu', !!name);
  }

  hideAll() { this.show(null); }

  updateTitle(save) {
    const n = BOSSES.filter((b) => save.cleared[b.id]).length;
    $('#title-best').textContent = n ? `처치한 보스 ${n} / ${BOSSES.length} · 총 처치 ${save.clears}회` : '아직 처치한 보스가 없습니다';
  }

  renderHelp() {
    const rows = [
      ['마우스', '조준'],
      [bindLabel('fire'), '주무기 연사 (누르고 있기) · 작은 반동'],
      [bindLabel('alt'), '보조무기 · 조준한 방향으로 발사 (기본 산탄총은 반대쪽으로 튕겨 나감)'],
      [bindLabel('drop'), '뚝떨 · 공중에서 그 자리에 0.1초 멈췄다가 수직으로 떨어짐'],
      [bindLabel('ult'), '극딜 스킬 · 게이지가 가득 차면 5초 동안 반동 없이 무제한 사격'],
      [bindLabel('restart'), '즉시 재시작'],
      ['Esc', '일시정지'],
    ];
    const box = $('#help-list');
    box.innerHTML = '';
    for (const [k, v] of rows) {
      const d = el('div');
      d.append(el('b', '', k), el('span', '', v));
      box.append(d);
    }
  }

  openKeys(from) {
    this.keysReturn = from;
    this.renderKeys();
    this.show('keys');
  }

  renderKeys() {
    const list = $('#keys-list');
    list.innerHTML = '';
    const binds = getBinds();
    for (const a of ACTIONS) {
      const row = el('div', 'keys-row');
      row.append(el('div', 'nm', a.name));
      for (let slot = 0; slot < 2; slot++) {
        const code = binds[a.id][slot];
        const btn = el('div', `kslot ${code ? '' : 'empty'}`, code ? keyName(code) : '없음');
        btn.onclick = () => {
          // 직전 입력(마우스 버튼으로 지정할 때의 클릭)이 다시 칸을 누르는 것 방지
          if (performance.now() - lastCaptureAt < 300) return;
          this.h.sfx();
          for (const k of list.querySelectorAll('.kslot.wait')) k.classList.remove('wait');
          btn.classList.add('wait');
          btn.textContent = '키를 누르세요';
          captureNext((c) => {
            if (c) {
              assignBind(a.id, slot, c);
              this.h.saveBinds();
            }
            this.renderKeys();
          });
        };
        if (code) {
          const x = el('span', 'x', '✕');
          x.title = '지우기';
          x.onclick = (e) => {
            e.stopPropagation();
            clearBind(a.id, slot);
            this.h.saveBinds();
            this.renderKeys();
          };
          btn.append(x);
        }
        row.append(btn);
      }
      list.append(row);
    }
    const esc = el('div', 'keys-row fixed');
    esc.append(el('div', 'nm', '일시정지 (변경 불가)'), el('div', 'kslot', 'Esc'), el('div', 'kslot empty', ''));
    list.append(esc);
  }

  openStages() {
    const save = this.h.getSave();
    const list = $('#stage-list');
    list.innerHTML = '';
    // 튜토리얼
    const tut = el('div', 'stage tutorial');
    if (!save.tutorialDone) tut.classList.add('recommend');
    tut.innerHTML = `<div class="no">TUTORIAL</div><div class="name">기초 훈련</div><div class="sub">조작과 회피 익히기</div>
      <div class="desc">조준, 연사, 산탄 점프, 좌우 이동, 낙하 늦추기, 충격파·레이저·탄환·기뢰 피하기, 그로기와 극딜까지 단계별로 직접 해 봅니다. 맞아도 체력이 줄지 않습니다.</div>
      <div class="rec ${save.tutorialDone ? '' : 'none'}">${save.tutorialDone ? '완료함' : '아직 하지 않음'}</div>`;
    tut.onclick = () => { this.h.sfx(); this.h.startStage(-1); };
    list.append(tut);

    BOSSES.forEach((b, i) => {
      const unlocked = i === 0 || !!save.cleared[BOSSES[i - 1].id];
      const rec = save.records[b.id];
      const card = el('div', 'stage');
      const stars = '◆'.repeat(b.stars) + `<i>${'◆'.repeat(Math.max(0, 4 - b.stars))}</i>`;
      card.innerHTML = `<div class="no">${b.label || `STAGE ${i + 1}`}</div>
        <div class="name">${b.name}</div><div class="sub">${b.title}</div>
        <div class="stars">${stars}</div>
        <div class="desc">${b.desc}</div>
        <div class="loot">${(b.loot || []).map((id) => {
          const own = bestOwned(save.inventory, id);
          const nm = (PRIMARY[id] || ALT[id]).name;
          return own >= 0 ? `<span style="color:${RARITY[own].color}">${nm}</span>` : `<span class="unk">${nm}</span>`;
        }).join('')}</div>
        <div class="rec ${rec ? '' : 'none'}">${rec ? `최고 ${formatTime(rec.time)} · ${rec.grade} 등급` : '기록 없음'}</div>`;
      if (!unlocked) {
        card.classList.add('locked');
        card.append(el('div', 'lock', `${BOSSES[i - 1].name}을(를) 처치하면 열립니다`));
      } else {
        card.onclick = () => { this.h.sfx(); this.h.startStage(i); };
      }
      list.append(card);
    });
    this.show('stages');
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

  showResult(win, stats, grade, drops, isBest, hasNext) {
    $('#btn-next').style.display = win && hasNext ? '' : 'none';
    $('#btn-retry').classList.toggle('primary', !(win && hasNext));
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
    const dropNote = $('#drop-note');
    dropBox.innerHTML = '';
    dropNote.textContent = '';
    this.pendingDrops = [];
    const res = drops || { drops: [] };
    const list = res.drops || [];
    $('#drop-section').style.display = win ? '' : 'none';
    $('#btn-reveal-all').style.display = list.length > 1 ? '' : 'none';
    const chanceText = `다시 잡으면 드랍 확률 S ${DROP_CHANCE.S * 100}% · A ${DROP_CHANCE.A * 100}% · B ${DROP_CHANCE.B * 100}% · C ${DROP_CHANCE.C * 100}%`;
    if (win && !list.length) {
      dropNote.textContent = res.complete
        ? '이 보스의 무기를 모두 최고 등급으로 모았습니다.'
        : `이번에는 드랍이 없습니다. ${chanceText}`;
    } else if (win) {
      dropNote.textContent = res.first ? `첫 처치 보상 · ${chanceText}` : chanceText;
    }
    if (win && list.length) {
      list.forEach(({ weapon: w, kind }) => {
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
          // 등급 상승이면 같은 무기의 이전 최고 등급과 비교
          let compare;
          if (kind === 'upgrade') {
            const prev = save.inventory.filter((x) => x.id === w.id && x.uid !== w.uid).sort((a, b) => b.rarity - a.rarity)[0];
            if (prev) compare = (weaponPower(w) / weaponPower(prev) - 1) * 100;
          }
          const card = weaponCard(w, {
            compare,
            tag: kind === 'upgrade' ? '등급 상승' : '새 무기',
            tagCls: kind === 'upgrade' ? 'up' : 'new',
          });
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
      });
    }
    this.show('result');
  }

  revealAll() {
    (this.pendingDrops || []).forEach((fn, i) => setTimeout(fn, i * 260));
    $('#btn-reveal-all').style.display = 'none';
  }
}
