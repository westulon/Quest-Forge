/* ============================================================
   app.js — Quest Forge: Runner's Path
   ============================================================ */
'use strict';

const STORAGE_PREFIX = 'questforge_';
const PHASE_LABELS = { warmup: 'WARM UP', run: 'RUN!', walk: 'WALK', cooldown: 'COOL DOWN' };
const PHASE_NEXT_VERB = { warmup: 'Run', run: 'Walk', walk: 'Run', cooldown: 'Done!' };

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function fmtTime(totalSeconds) {
  const t = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
function fmtDistance(meters) {
  if (meters >= 1000) return (meters / 1000).toFixed(2) + ' km';
  return Math.round(meters) + ' m';
}

/* ---------------- storage ---------------- */
function loadProfileIndex() {
  try { return JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'profiles')) || []; }
  catch (e) { return []; }
}
function saveProfileIndex(idx) {
  localStorage.setItem(STORAGE_PREFIX + 'profiles', JSON.stringify(idx));
}
function loadSave(id) {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'save_' + id));
    return s ? migrateSave(s) : null;
  }
  catch (e) { return null; }
}
function writeSave(id, data) {
  localStorage.setItem(STORAGE_PREFIX + 'save_' + id, JSON.stringify(data));
}
function newSaveData(name, avatarConfig) {
  return {
    name,
    avatarConfig,
    xp: 0,
    gold: 0,
    equipped: defaultEquipped(),
    owned: { weapon: ['wpn0'], armor: ['arm0'], head: ['hat0'], boots: ['boo0'], cape: ['cap0'], companion: ['pet0'] },
    completedQuestIds: [],
    lifetimeDistanceMeters: 0,
    storySeen: [],
    runHistory: [],
    settings: { gpsEnabled: false, bgTheme: 'none' },
    createdAt: Date.now(),
    lastPlayedAt: Date.now()
  };
}
function migrateSave(save) {
  // Defensive: fills in fields added after a save may have been created.
  if (!save.storySeen) save.storySeen = [];
  if (!Array.isArray(save.runHistory)) save.runHistory = [];
  if (!save.settings) save.settings = {};
  if (!save.settings.bgTheme) save.settings.bgTheme = 'none';
  return save;
}

/* ---------------- app state ---------------- */
const App = {
  profileId: null,
  save: null,
  createConfig: { skinTone: SKIN_TONES[1], hairColor: HAIR_COLORS[0], hairStyle: 'short', gender: 'girl' }
};

function getNextQuestIndex(save) {
  const done = new Set(save.completedQuestIds);
  return QUESTS.findIndex(q => !done.has(q.id));
}

/* ---------------- navigation ---------------- */
const SCREEN_IDS = ['profile-select', 'character-create', 'home', 'map', 'shop', 'log', 'hero', 'run'];
function showScreen(name) {
  SCREEN_IDS.forEach(id => {
    document.getElementById('screen-' + id).classList.toggle('hidden', id !== name);
  });
  const nav = document.getElementById('bottom-nav');
  const navScreens = ['home', 'map', 'shop', 'log', 'hero'];
  nav.classList.toggle('hidden', !navScreens.includes(name));
  syncNavSpace();
  if (navScreens.includes(name)) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.screen === name);
    });
  }
  if (name === 'home') renderHome();
  if (name === 'map') renderMap();
  if (name === 'shop') renderShop();
  if (name === 'log') renderLog();
  if (name === 'hero') renderHero();
}

/* ---------------- toast ---------------- */
function showToast(msg, duration) {
  duration = duration || 2600;
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  root.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

/* ---------------- modal ---------------- */
function showModal(innerHtml, onMount) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-backdrop"><div class="modal-card">${innerHtml}</div></div>`;
  if (onMount) onMount(root);
}
function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
}
function showStoryModal(title, bodyText, buttonLabel, onContinue) {
  const paragraphs = bodyText.split(/\n\n+/).map(p => `<p class="story-text">${escapeHtml(p)}</p>`).join('');
  showModal(`
    <div class="story-modal">
      <div class="eyebrow">${icon('scroll',15)} ${escapeHtml(title)}</div>
      <div class="mt-12">${paragraphs}</div>
      <button class="btn btn-primary mt-16" id="modal-story-continue">${escapeHtml(buttonLabel)}</button>
    </div>
  `, () => {
    document.getElementById('modal-story-continue').addEventListener('click', () => {
      closeModal();
      if (onContinue) onContinue();
    });
  });
}

/* ================= PROFILE SELECT ================= */
function renderProfileList() {
  const idx = loadProfileIndex();
  const list = document.getElementById('profile-list');
  if (idx.length === 0) {
    list.innerHTML = `<p class="empty-note">No adventurers yet — create the first one below!</p>`;
    return;
  }
  list.innerHTML = idx.map(p => {
    const save = loadSave(p.id);
    if (!save) return '';
    const avatar = renderCharacterSVG(save.avatarConfig ? Object.assign({}, save.avatarConfig, { equipped: save.equipped }) : { equipped: save.equipped });
    const info = xpProgress(save.xp);
    const runs = (save.runHistory || []).length;
    return `<button class="profile-card" data-profile-id="${p.id}">
      <div class="profile-avatar-sm">${avatar}</div>
      <div>
        <div class="profile-name">${escapeHtml(save.name)}</div>
        <div class="profile-meta">Level ${info.level} · ${levelTitle(info.level)}</div>
        <div class="t-micro on-dark-dim">${save.completedQuestIds.length} quests · ${runs} runs logged</div>
      </div>
    </button>`;
  }).join('');
}
document.addEventListener('click', e => {
  const card = e.target.closest('[data-profile-id]');
  if (card) selectProfile(card.dataset.profileId);
});
function selectProfile(id) {
  const save = loadSave(id);
  if (!save) { showToast("Couldn't find that adventurer."); return; }
  App.profileId = id;
  App.save = save;
  applyBgTheme(save.settings.bgTheme);
  showScreen('home');
  offerRunResume();
}

/* ================= CHARACTER CREATE ================= */
function renderCreatePickers() {
  const genderWrap = document.getElementById('picker-gender');
  const GENDER_OPTIONS = [['girl', 'Girl'], ['boy', 'Boy'], ['neither', 'Neither']];
  genderWrap.innerHTML = GENDER_OPTIONS.map(([val, label]) =>
    `<button class="option-pill ${App.createConfig.gender === val ? 'active' : ''}" data-pick="gender" data-value="${val}">${label}</button>`
  ).join('');

  const skinWrap = document.getElementById('picker-skin');
  skinWrap.innerHTML = SKIN_TONES.map(c =>
    `<button class="swatch ${App.createConfig.skinTone === c ? 'selected' : ''}" style="background:${c};" data-pick="skinTone" data-value="${c}" aria-label="Skin tone"></button>`
  ).join('');

  const hairWrap = document.getElementById('picker-haircolor');
  hairWrap.innerHTML = HAIR_COLORS.map(c =>
    `<button class="swatch ${App.createConfig.hairColor === c ? 'selected' : ''}" style="background:${c};" data-pick="hairColor" data-value="${c}" aria-label="Hair color"></button>`
  ).join('');

  const styleWrap = document.getElementById('picker-hairstyle');
  styleWrap.innerHTML = HAIR_STYLES.map(s =>
    `<button class="option-pill ${App.createConfig.hairStyle === s ? 'active' : ''}" data-pick="hairStyle" data-value="${s}">${s[0].toUpperCase()+s.slice(1)}</button>`
  ).join('');

  updateCreatePreview();
}
function updateCreatePreview() {
  document.getElementById('create-preview').innerHTML = renderCharacterSVG(App.createConfig);
}
document.addEventListener('click', e => {
  const pick = e.target.closest('[data-pick]');
  if (pick) {
    App.createConfig[pick.dataset.pick] = pick.dataset.value;
    renderCreatePickers();
  }
});
/* Show the Back control only when there IS somewhere to go back to —
   on very first launch there are no profiles yet. */
function openCharacterCreate() {
  document.getElementById('input-name').value = '';
  renderCreatePickers();
  const hasProfiles = loadProfileIndex().length > 0;
  document.getElementById('btn-create-back').classList.toggle('hidden', !hasProfiles);
  showScreen('character-create');
}
document.getElementById('btn-new-profile').addEventListener('click', () => {
  App.createConfig = { skinTone: SKIN_TONES[1], hairColor: HAIR_COLORS[0], hairStyle: 'short', gender: 'girl' };
  openCharacterCreate();
});
document.getElementById('btn-create-back').addEventListener('click', () => {
  renderProfileList();
  showScreen('profile-select');
});
document.getElementById('btn-confirm-create').addEventListener('click', () => {
  const name = document.getElementById('input-name').value.trim();
  if (!name) { showToast('Give your adventurer a name first!'); return; }
  const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const save = newSaveData(name, {
    skinTone: App.createConfig.skinTone,
    hairColor: App.createConfig.hairColor,
    hairStyle: App.createConfig.hairStyle,
    gender: App.createConfig.gender
  });
  writeSave(id, save);
  const idx = loadProfileIndex();
  idx.push({ id });
  saveProfileIndex(idx);
  App.profileId = id;
  App.save = save;
  applyBgTheme('none');
  showScreen('home');
  showStoryModal(PROLOGUE.title, PROLOGUE.text, "Let's Go!", () => {
    App.save.storySeen.push('prologue');
    persistCurrentSave();
  });
});

/* ================= HOME ================= */
function renderHome() {
  const save = App.save;
  document.getElementById('home-avatar').innerHTML = renderCharacterSVG(Object.assign({}, save.avatarConfig, { equipped: save.equipped }));
  document.getElementById('home-name').textContent = save.name;
  const info = xpProgress(save.xp);
  document.getElementById('home-title').textContent = levelTitle(info.level);
  document.getElementById('home-level-pill').innerHTML = `${icon('stat_xp',15)} Lv ${info.level}`;
  document.getElementById('home-gold-pill').innerHTML = `${icon('stat_gold',15)} ${save.gold}`;
  const pct = info.needed > 0 ? Math.round((info.current / info.needed) * 100) : 100;
  document.getElementById('home-xp-fill').style.width = pct + '%';
  document.getElementById('home-xp-label').textContent = `${info.current} / ${info.needed} XP`;

  const nextIdx = getNextQuestIndex(save);
  if (nextIdx === -1) {
    document.getElementById('home-quest-panel').classList.add('hidden');
    document.getElementById('home-all-done-card').classList.remove('hidden');
  } else {
    document.getElementById('home-quest-panel').classList.remove('hidden');
    document.getElementById('home-all-done-card').classList.add('hidden');
    const q = QUESTS[nextIdx];
    document.getElementById('home-quest-title').textContent = q.title;
    document.getElementById('home-quest-region').textContent = `Week ${q.week} · ${q.region}`;
    document.getElementById('home-quest-flavor').textContent = q.flavor;
    document.getElementById('home-quest-meta').textContent =
      `${fmtTime(q.totalSeconds)} total${q.milestone ? ' · Milestone Quest' : ''}`;
  }
}
document.getElementById('btn-start-quest').addEventListener('click', () => {
  const nextIdx = getNextQuestIndex(App.save);
  if (nextIdx === -1) { showToast("You've completed every quest — legend!"); return; }
  startQuest(QUESTS[nextIdx]);
});
document.getElementById('btn-settings').addEventListener('click', () => showScreen('hero'));

/* ================= MAP ================= */
function renderMap() {
  const save = App.save;
  const done = new Set(save.completedQuestIds);
  const nextIdx = getNextQuestIndex(save);
  const nextQuest = nextIdx === -1 ? null : QUESTS[nextIdx];
  document.getElementById('map-progress-pill').textContent = `${done.size} / ${QUESTS.length}`;

  const html = REGIONS.map(region => {
    const quests = QUESTS.filter(q => q.week === region.week);
    const regionDone = quests.every(q => done.has(q.id));
    const isCurrentRegion = nextQuest && nextQuest.week === region.week;
    const badgeClass = regionDone ? 'done' : (isCurrentRegion ? 'current' : 'locked');
    const badgeContent = regionDone ? icon('status_done',26) : icon('region_' + region.week, 28);

    const questRows = quests.map(q => {
      let status = 'locked';
      if (done.has(q.id)) status = 'done';
      else if (nextQuest && q.id === nextQuest.id) status = 'current';
      const seal = icon(status === 'done' ? 'status_done' : (status === 'current' ? 'status_play' : 'status_locked'), 15);
      const clickable = status === 'current';
      return `<div class="quest-chip ${status}" ${clickable ? `data-start-quest="${q.id}"` : ''}>
        <span>${escapeHtml(q.title)}${q.milestone ? ' ' + icon('ui_sparkle',13,'ico-milestone') : ''}</span>
        <span class="seal">${seal}</span>
      </div>`;
    }).join('');

    return `<div class="region-node">
      <div class="region-badge ${badgeClass}">${badgeContent}</div>
      <div class="region-body">
        <div class="region-title">${escapeHtml(region.name)}</div>
        ${questRows}
      </div>
    </div>`;
  }).join('');
  document.getElementById('map-regions').innerHTML = html;
}
document.addEventListener('click', e => {
  const el = e.target.closest('[data-start-quest]');
  if (el) {
    const quest = QUESTS.find(q => q.id === el.dataset.startQuest);
    if (quest) startQuest(quest);
  }
});
/* Region artwork now comes from the icon registry: icon('region_' + week). */

/* ================= SHOP ================= */
const SHOP_TAB_META = {
  weapon: { label: 'Weapon' }, armor: { label: 'Armor' },
  head: { label: 'Head' }, boots: { label: 'Boots' },
  cape: { label: 'Cape' }, companion: { label: 'Companion' }
};
let shopActiveTab = 'weapon';
function renderShop() {
  document.getElementById('shop-gold-pill').innerHTML = `${icon('stat_gold',15)} ${App.save.gold}`;
  document.getElementById('shop-intro').innerHTML = `<p class="story-text on-dark">${escapeHtml(SHOP_INTRO)}</p>`;
  document.getElementById('shop-tabs').innerHTML = EQUIPMENT_SLOTS.map(slot =>
    `<button class="shop-tab ${slot === shopActiveTab ? 'active' : ''}" data-shop-tab="${slot}">${icon('slot_' + slot, 15)} ${SHOP_TAB_META[slot].label}</button>`
  ).join('');
  renderShopItems();
}
function renderShopItems() {
  const save = App.save;
  const items = EQUIPMENT[shopActiveTab];
  const owned = new Set(save.owned[shopActiveTab]);
  const equippedId = save.equipped[shopActiveTab];
  document.getElementById('shop-items').innerHTML = items.map(item => {
    const isOwned = owned.has(item.id);
    const isEquipped = equippedId === item.id;
    let rowClass = '', actionHtml = '';
    if (isEquipped) {
      rowClass = 'equipped';
      actionHtml = `<span class="item-tag">Equipped</span>`;
    } else if (isOwned) {
      rowClass = 'owned';
      actionHtml = `<button class="btn btn-teal btn-sm" data-equip="${shopActiveTab}:${item.id}">Equip</button>`;
    } else {
      const afford = save.gold >= item.price;
      rowClass = afford ? '' : 'locked';
      actionHtml = `<button class="btn btn-sm ${afford ? 'btn-gold' : 'btn-outline'}" ${afford ? `data-buy="${shopActiveTab}:${item.id}"` : 'disabled'}>${icon('stat_gold',14)} ${item.price}</button>`;
    }
    return `<div class="card item-row ${rowClass}">
      <div class="item-icon">${icon(item.id, 30)}</div>
      <div class="item-info">
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="item-desc">${escapeHtml(item.desc)}</div>
      </div>
      ${actionHtml}
    </div>`;
  }).join('');
}
document.addEventListener('click', e => {
  const tab = e.target.closest('[data-shop-tab]');
  if (tab) { shopActiveTab = tab.dataset.shopTab; renderShop(); return; }
  const buy = e.target.closest('[data-buy]');
  if (buy) {
    const [slot, id] = buy.dataset.buy.split(':');
    buyItem(slot, id);
    return;
  }
  const equip = e.target.closest('[data-equip]');
  if (equip) {
    const [slot, id] = equip.dataset.equip.split(':');
    equipItem(slot, id);
  }
});
function buyItem(slot, id) {
  const save = App.save;
  const item = EQUIPMENT[slot].find(i => i.id === id);
  if (!item || save.gold < item.price) return;
  save.gold -= item.price;
  save.owned[slot].push(id);
  save.equipped[slot] = id;
  persistCurrentSave();
  renderShop();
  showToast(`${item.name} equipped!`);
}
function equipItem(slot, id) {
  App.save.equipped[slot] = id;
  persistCurrentSave();
  renderShop();
}

/* ================= HERO ================= */
function renderHero() {
  const save = App.save;
  document.getElementById('hero-avatar').innerHTML = renderCharacterSVG(Object.assign({}, save.avatarConfig, { equipped: save.equipped }));
  document.getElementById('hero-name').textContent = save.name;
  const info = xpProgress(save.xp);
  document.getElementById('hero-title').textContent = `Level ${info.level} · ${levelTitle(info.level)}`;
  const questsDone = save.completedQuestIds.length;
  const nextIdx = getNextQuestIndex(save);
  const weekLabel = nextIdx === -1 ? 'Complete!' : `Week ${QUESTS[nextIdx].week} of 9`;
  document.getElementById('hero-stats').innerHTML = `
    <div class="stat-line"><span>Quests completed</span><strong>${questsDone} / ${QUESTS.length}</strong></div>
    <div class="stat-line"><span>Current progress</span><strong>${weekLabel}</strong></div>
    <div class="stat-line"><span>Total XP earned</span><strong>${save.xp}</strong></div>
    <div class="stat-line"><span>Runs logged</span><strong>${(save.runHistory || []).length}</strong></div>
    <div class="stat-line"><span>Distance explored</span><strong>${fmtDistance(save.lifetimeDistanceMeters)}</strong></div>
  `;
  document.getElementById('chk-gps').checked = !!save.settings.gpsEnabled;
  renderBgThemePicker();
}
const BG_THEMES = [['none', 'Plain'], ['quatrefoil', 'Quatrefoil'], ['lattice', 'Lattice'], ['stars', 'Stars']];
function renderBgThemePicker() {
  const wrap = document.getElementById('picker-bgtheme');
  const current = App.save.settings.bgTheme || 'none';
  wrap.innerHTML = BG_THEMES.map(([val, label]) =>
    `<button class="option-pill ${current === val ? 'active' : ''}" data-bgtheme="${val}">${label}</button>`
  ).join('');
}
function applyBgTheme(theme) {
  document.body.classList.remove('bg-quatrefoil', 'bg-lattice', 'bg-stars');
  if (theme && theme !== 'none') document.body.classList.add('bg-' + theme);
}
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-bgtheme]');
  if (!btn) return;
  const theme = btn.dataset.bgtheme;
  App.save.settings.bgTheme = theme;
  persistCurrentSave();
  applyBgTheme(theme);
  renderBgThemePicker();
});
document.getElementById('chk-gps').addEventListener('change', e => {
  App.save.settings.gpsEnabled = e.target.checked;
  persistCurrentSave();
  if (e.target.checked && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(() => {}, err => {
      if (err.code === err.PERMISSION_DENIED) {
        showToast('Location permission was denied — GPS distance will be skipped.');
      }
    });
  }
});
document.getElementById('btn-switch-profile').addEventListener('click', () => {
  App.profileId = null;
  App.save = null;
  applyBgTheme('none');
  renderProfileList();
  showScreen('profile-select');
});
document.getElementById('btn-test-cues').addEventListener('click', () => {
  showToast('Testing cues: Run in 1s...');
  setTimeout(() => { playRunCue(); vibrate([150, 80, 150, 80, 150]); }, 900);
  setTimeout(() => { playWalkCue(); vibrate([400]); }, 2400);
});

/* ================= GUILD JOURNAL ================= */
function getJournalEntries(save) {
  const entries = [];
  if (save.storySeen.includes('prologue')) entries.push({ title: PROLOGUE.title, text: PROLOGUE.text });
  REGIONS.forEach(region => {
    if (region.arrival && save.storySeen.includes('arrival-' + region.week)) {
      entries.push({ title: region.name, text: region.arrival });
    }
    if (region.beacon && save.storySeen.includes('beacon-' + region.week)) {
      let text = region.beacon;
      if (region.week === 9) text += '\n\n' + FINALE_SPEECH;
      entries.push({ title: `${region.name} — Beacon Lit`, text, iconKey: 'ui_flame' });
    }
  });
  return entries;
}
function showJournal() {
  const entries = getJournalEntries(App.save);
  const body = entries.length === 0
    ? `<p class="t-small muted mt-12">Nothing written yet — start your first quest to begin the story.</p>`
    : `<div class="journal-list mt-12">${entries.map(e => `
        <div class="journal-entry">
          <div class="eyebrow">${e.iconKey ? icon(e.iconKey,14) + ' ' : ''}${escapeHtml(e.title)}</div>
          ${e.text.split(/\n\n+/).map(p => `<p class="story-text">${escapeHtml(p)}</p>`).join('')}
        </div>`).join('')}</div>`;
  showModal(`
    <div class="modal-title">${icon('ui_book',20)} Guild Journal</div>
    ${body}
    <button class="btn btn-primary mt-16" id="modal-journal-close">Close</button>
  `, () => document.getElementById('modal-journal-close').addEventListener('click', closeModal));
}
document.getElementById('btn-journal').addEventListener('click', showJournal);

function persistCurrentSave() {
  App.save.lastPlayedAt = Date.now();
  writeSave(App.profileId, App.save);
}

/* ================= AUDIO + VIBRATION ================= */
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function beep(freq, startTime, duration, volume, type) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  volume = volume || 0.35; type = type || 'sine';
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ctx.currentTime + startTime;
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.03);
}
function playRunCue() { beep(880, 0, 0.15); beep(1046, 0.18, 0.15); beep(1318, 0.36, 0.22); }
function playWalkCue() { beep(392, 0, 0.5, 0.3); }
function playHeadsUpCue() { beep(660, 0, 0.12, 0.18); }
function playCompleteFanfare() { beep(523, 0, 0.15); beep(659, 0.15, 0.15); beep(784, 0.3, 0.15); beep(1046, 0.45, 0.45); }
function playLevelUpFanfare() { beep(523, 0, 0.12); beep(659, 0.12, 0.12); beep(784, 0.24, 0.12); beep(1046, 0.36, 0.12); beep(1318, 0.48, 0.5); }
function vibrate(pattern) { if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} } }

/* ================= KEEPING THE SCREEN ON =================
   Two mechanisms, in order of preference:

   1. The Screen Wake Lock API. Supported by Chrome on Android and Safari
      16.4+, which covers essentially every phone this will run on.

   2. A muted, looping, inline video. This is the old trick — a device won't
      sleep while it believes video is playing — and it covers older phones
      that predate the proper API. The clip is a 32x32 black square, one
      second long, roughly 1.5KB, sitting invisibly off-screen.

   The important part is not acquiring the lock; it's KEEPING it. The OS
   drops a wake lock whenever the page is hidden — during a notification
   shade pull-down, an incoming call, an app switch — and does not give it
   back on its own. Without re-acquisition the screen starts sleeping again
   partway through a run, which is exactly what it looks like from the
   outside when a run "gets cancelled".
   ============================================================ */

const WakeLock = {
  sentinel: null,
  video: null,
  wanted: false,
  method: 'none',      // 'api' | 'video' | 'none'

  supported() {
    return ('wakeLock' in navigator) || !!document.createElement('video').canPlayType;
  },

  async enable() {
    this.wanted = true;
    await this._acquire();
  },

  disable() {
    this.wanted = false;
    this._releaseApi();
    this._stopVideo();
    this.method = 'none';
  },

  async _acquire() {
    if (!this.wanted) return;
    // The API can reject even when present — a hidden page or a low battery
    // will both refuse — so the video fallback backs it up rather than
    // replacing it.
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
      try {
        this.sentinel = await navigator.wakeLock.request('screen');
        this.method = 'api';
        // Fired when the OS takes the lock away. Re-acquire on return.
        this.sentinel.addEventListener('release', () => {
          this.sentinel = null;
          if (this.wanted && document.visibilityState === 'visible') {
            this._acquire();
          }
        });
        this._stopVideo();   // don't burn battery on both at once
        return;
      } catch (e) {
        this.sentinel = null;
      }
    }
    this._startVideo();
  },

  _releaseApi() {
    if (this.sentinel) {
      const s = this.sentinel;
      this.sentinel = null;
      try {
        const p = s.release();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (e) { /* already released */ }
    }
  },

  _startVideo() {
    // play() returns a promise in browsers but not in every environment, so
    // never assume it's thenable.
    const safePlay = (el) => {
      try {
        const p = el.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (e) { /* autoplay blocked or unsupported */ }
    };
    if (this.video) {
      safePlay(this.video);
      this.method = 'video';
      return;
    }
    try {
      const v = document.createElement('video');
      v.setAttribute('playsinline', '');
      v.setAttribute('muted', '');
      v.setAttribute('loop', '');
      v.setAttribute('title', 'Keeps the screen awake during a run');
      v.muted = true;
      v.loop = true;
      v.className = 'nosleep-video';
      v.innerHTML =
        '<source src="data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAHjEU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHYTbuMU6uEElTDZ1OsggEeTbuMU6uEHFO7a1OsggHN7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsirXsYMPQkBNgI1MYXZmNjAuMTYuMTAwV0GNTGF2ZjYwLjE2LjEwMESJiECPQAAAAAAAFlSua8GuAQAAAAAAADjXgQFzxYgJibX+FlJKZ5yBACK1nIN1bmSIgQCGhVZfVlA4g4EBI+ODhDuaygDgibCBILqBIJqBAhJUw2f8c3OgY8CAZ8iaRaOHRU5DT0RFUkSHjUxhdmY2MC4xNi4xMDBzc9ZjwItjxYgJibX+FlJKZ2fIoUWjh0VOQ09ERVJEh5RMYXZjNjAuMzEuMTAyIGxpYnZweGfIoUWjiERVUkFUSU9ORIeTMDA6MDA6MDEuMDAwMDAwMDAwAB9DtnWp54EAo6SBAACAMAIAnQEqIAAgAABHCIWFiJmEiAICAAeQ88nA/v+rUIAcU7trkbuPs4EAt4r3gQHxggGf8IED" type="video/webm">' +
        '<source src="data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAMPbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAA+gAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAjl0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAACAAAAAgAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAPoAAAAAAABAAAAAAGxbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAABAAAAAQABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABXG1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAARxzdGJsAAAAuHN0c2QAAAAAAAAAAQAAAKhhdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAACAAIABIAAAASAAAAAAAAAABFUxhdmM2MC4zMS4xMDIgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAALmF2Y0MBQsAe/+EAFmdCwB7ZCWwEQAAAAwBAAAADAIPFi5IBAAVoy4PLIAAAABBwYXNwAAAAAQAAAAEAAAAUYnRydAAAAAAAABRAAAAUQAAAABhzdHRzAAAAAAAAAAEAAAABAABAAAAAABxzdHNjAAAAAAAAAAEAAAABAAAAAQAAAAEAAAAUc3RzegAAAAAAAAKIAAAAAQAAABRzdGNvAAAAAAAAAAEAAAM/AAAAYnVkdGEAAABabWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAbWRpcmFwcGwAAAAAAAAAAAAAAAAtaWxzdAAAACWpdG9vAAAAHWRhdGEAAAABAAAAAExhdmY2MC4xNi4xMDAAAAAIZnJlZQAAApBtZGF0AAACcAYF//9s3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE2NCByMzEwOCAzMWUxOWY5IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAyMyAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTAgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MToweDExMSBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MCBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0wIHdlaWdodHA9MCBrZXlpbnQ9MjUwIGtleWludF9taW49MSBzY2VuZWN1dD00MCBpbnRyYV9yZWZyZXNoPTAgcmNfbG9va2FoZWFkPTQwIHJjPWNyZiBtYnRyZWU9MSBjcmY9MjMuMCBxY29tcD0wLjYwIHFwbWluPTAgcXBtYXg9NjkgcXBzdGVwPTQgaXBfcmF0aW89MS40MCBhcT0xOjEuMDAAgAAAABBliIQFf///D0UAAULfJ114" type="video/mp4">';
      document.body.appendChild(v);
      this.video = v;
      safePlay(v);
      this.method = 'video';
    } catch (e) {
      this.method = 'none';
    }
  },

  _stopVideo() {
    if (this.video) {
      try { this.video.pause(); } catch (e) {}
    }
  },

  /* Is the screen actually being held awake right now? */
  isHeld() {
    if (this.sentinel) return true;
    if (this.video && !this.video.paused) return true;
    return false;
  }
};

// Backwards-compatible helpers used elsewhere in the app.
function requestWakeLock() { WakeLock.enable(); }
function releaseWakeLock() { WakeLock.disable(); }

/* ================= GPS ================= */
let gpsWatchId = null;
let lastGpsPos = null;
let sessionDistanceMeters = 0;
let sessionRoute = [];
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function startGpsTracking() {
  if (!navigator.geolocation) return;
  sessionDistanceMeters = 0; lastGpsPos = null; sessionRoute = [];
  document.getElementById('run-route-wrap').classList.remove('hidden');
  updateDistanceDisplay();
  gpsWatchId = navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude, accuracy } = pos.coords;
    if (accuracy && accuracy > 30) return;
    let moved = null;
    if (lastGpsPos) {
      moved = haversine(lastGpsPos.lat, lastGpsPos.lon, latitude, longitude);
      // ignore sub-metre jitter and impossible jumps (tunnels, signal bounce)
      if (moved > 1 && moved < 100) sessionDistanceMeters += moved;
    }
    if (!lastGpsPos || (moved != null && moved > 2 && moved < 100)) {
      sessionRoute.push([latitude, longitude]);
      // keep the in-memory trace bounded on very long sessions
      if (sessionRoute.length > 4000) sessionRoute = simplifyRoute(sessionRoute, 2000);
      drawLiveRoute();
    }
    lastGpsPos = { lat: latitude, lon: longitude };
    updateDistanceDisplay();
  }, () => { /* silently degrade — timer still works without GPS */ }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 });
}
function stopGpsTracking() {
  if (gpsWatchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(gpsWatchId);
  gpsWatchId = null;
}
/* Draw a route into an <svg>. Shared by the live trace, history thumbnails
   and the run-detail view, so they always look consistent. */
function paintRoute(svgEl, points, opts) {
  if (!svgEl) return false;
  opts = opts || {};
  const vw = opts.vw || 240, vh = opts.vh || 130;
  svgEl.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  const geo = routeToSvgPath(points, vw, vh, opts.pad == null ? 10 : opts.pad);
  if (!geo) { svgEl.innerHTML = ''; return false; }
  const dot = opts.dots === false ? '' :
    `<circle class="route-start" cx="${geo.start[0].toFixed(1)}" cy="${geo.start[1].toFixed(1)}" r="${opts.dotR || 4}"/>
     <circle class="route-head" cx="${geo.end[0].toFixed(1)}" cy="${geo.end[1].toFixed(1)}" r="${opts.dotR || 4}"/>`;
  svgEl.innerHTML = `<path class="route-line" d="${geo.d}"/>${dot}`;
  return true;
}

function drawLiveRoute() {
  paintRoute(document.getElementById('run-route-svg'), sessionRoute, { vw: 240, vh: 130 });
}

function updateDistanceDisplay() {
  document.getElementById('run-distance').innerHTML = `${icon('stat_distance',15)} ${fmtDistance(sessionDistanceMeters)} explored`;
}

/* ================= RUN ENGINE =================
   The engine holds ONE piece of truth: when the quest started (plus how long
   it has been paused). Everything else — which phase we're in, how much is
   left, overall progress — is derived from the clock on each tick.

   This matters because phone screens lock. Browsers throttle or suspend
   timers in a backgrounded tab, so anything that advances state
   incrementally ("this phase ends 90s from now") quietly loses whatever time
   passed while the screen was off. Deriving from elapsed time instead means
   a locked screen costs nothing: come back and the run is exactly where it
   should be.
   ============================================================ */
const ACTIVE_RUN_KEY = STORAGE_PREFIX + 'active_run';
const RESUME_MAX_AGE_MS = 6 * 60 * 60 * 1000;   // ignore anything older than 6h
const RESUME_OVERRUN_GRACE_MS = 15 * 60 * 1000; // finished long ago = abandoned

const RunEngine = {
  active: false,
  quest: null,
  paused: false,
  startedAt: 0,
  pausedTotalMs: 0,
  pauseStartedAt: null,
  phaseIndex: 0,
  headsUpPhase: -1,
  intervalId: null,
  _lastPersistAt: 0,

  start(quest, restore) {
    this.active = true;
    this.quest = quest;
    this.headsUpPhase = -1;
    this._lastPersistAt = 0;

    if (restore) {
      this.startedAt = restore.startedAt;
      this.pausedTotalMs = restore.pausedTotalMs || 0;
      this.paused = !!restore.paused;
      this.pauseStartedAt = restore.pauseStartedAt || null;
      sessionRoute = (restore.route || []).slice();
      sessionDistanceMeters = restore.distanceM || 0;
      lastGpsPos = null;
    } else {
      this.startedAt = Date.now();
      this.pausedTotalMs = 0;
      this.pauseStartedAt = null;
      this.paused = false;
      sessionRoute = [];
      sessionDistanceMeters = 0;
      lastGpsPos = null;
    }

    this.phaseIndex = this._positionAt(this._elapsedMs()).index;

    document.getElementById('run-quest-title').textContent = `${quest.region} — ${quest.title}`;
    document.getElementById('run-route-wrap').classList.add('hidden');
    showScreen('run');

    if (App.save.settings.gpsEnabled) {
      startGpsTracking();
      if (sessionRoute.length > 1) drawLiveRoute();
    }
    WakeLock.enable().then(updateWakeIndicator);
    this.intervalId = setInterval(() => this.tick(), 250);
    this._setPauseButton(this.paused);
    this._persist();
    this.render();
  },

  /* Active running time: real time minus any time spent paused. */
  _elapsedMs() {
    const pausedNow = (this.paused && this.pauseStartedAt) ? Date.now() - this.pauseStartedAt : 0;
    return Math.max(0, Date.now() - this.startedAt - this.pausedTotalMs - pausedNow);
  },

  /* Which phase does this elapsed time land in, and how far through it? */
  _positionAt(elapsedMs) {
    const phases = this.quest.phases;
    let acc = 0;
    for (let i = 0; i < phases.length; i++) {
      const d = phases[i].duration * 1000;
      if (elapsedMs < acc + d) {
        return { index: i, remainingMs: acc + d - elapsedMs, elapsedMs, done: false };
      }
      acc += d;
    }
    return { index: phases.length - 1, remainingMs: 0, elapsedMs, done: true };
  },

  _cueForPhase(phase) {
    if (phase.type === 'run') { playRunCue(); vibrate([150, 80, 150, 80, 150]); }
    else if (phase.type === 'walk') { playWalkCue(); vibrate([400]); }
    else { beep(494, 0, 0.4, 0.25); vibrate([250]); }
  },

  tick() {
    if (this.paused || !this.active) return;
    const pos = this._positionAt(this._elapsedMs());

    if (pos.done) { this.complete(); return; }

    if (pos.index !== this.phaseIndex) {
      const advancedBy = pos.index - this.phaseIndex;
      this.phaseIndex = pos.index;
      this.headsUpPhase = -1;
      // Only cue a normal one-step transition. Jumping several phases means the
      // app was backgrounded, and firing a "RUN!" cue for a phase that already
      // started minutes ago would be worse than saying nothing.
      if (advancedBy === 1) this._cueForPhase(this.quest.phases[pos.index]);
    }

    const remainingSec = pos.remainingMs / 1000;
    const isLastPhase = pos.index >= this.quest.phases.length - 1;
    if (remainingSec <= 5 && remainingSec > 0.3 && this.headsUpPhase !== pos.index && !isLastPhase) {
      this.headsUpPhase = pos.index;
      playHeadsUpCue();
      vibrate(60);
    }

    this.render();
    this._maybePersist();
    if (!this._wakeCheckAt || Date.now() - this._wakeCheckAt > 10000) {
      this._wakeCheckAt = Date.now();
      if (this.wanted !== false) updateWakeIndicator();
    }
  },

  render() {
    if (!this.active) return;
    const pos = this._positionAt(this._elapsedMs());
    const phase = this.quest.phases[pos.index];
    const screenEl = document.getElementById('screen-run');
    screenEl.className = 'timer-screen phase-' + phase.type;
    document.getElementById('run-phase-label').textContent = PHASE_LABELS[phase.type];
    document.getElementById('run-clock').textContent = fmtTime(pos.remainingMs / 1000);
    const nextPhase = this.quest.phases[pos.index + 1];
    document.getElementById('run-nextup').textContent =
      nextPhase ? `Then: ${PHASE_LABELS[nextPhase.type]}` : 'Final stretch!';
    const overallElapsed = Math.min(pos.elapsedMs / 1000, this.quest.totalSeconds);
    document.getElementById('run-overall-fill').style.width =
      Math.min(100, (overallElapsed / this.quest.totalSeconds) * 100) + '%';
    document.getElementById('run-elapsed').textContent =
      `${fmtTime(overallElapsed)} of ${fmtTime(this.quest.totalSeconds)}`;
  },

  /* ---- crash / discard recovery ----
     Android will happily throw away a backgrounded page when the screen
     locks. Keeping a snapshot on disk means that costs the run nothing. */
  _persist() {
    if (!this.active || !App.profileId) return;
    try {
      localStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify({
        profileId: App.profileId,
        questId: this.quest.id,
        startedAt: this.startedAt,
        pausedTotalMs: this.pausedTotalMs,
        paused: this.paused,
        pauseStartedAt: this.pauseStartedAt,
        distanceM: sessionDistanceMeters,
        route: compactRoute(simplifyRoute(sessionRoute, 300)),
        savedAt: Date.now()
      }));
    } catch (e) { /* storage full or unavailable — the run still works */ }
  },
  _maybePersist() {
    const now = Date.now();
    if (now - this._lastPersistAt > 5000) {
      this._lastPersistAt = now;
      this._persist();
    }
  },
  _clearPersisted() {
    try { localStorage.removeItem(ACTIVE_RUN_KEY); } catch (e) {}
  },

  pause() {
    if (this.paused || !this.active) return;
    this.paused = true;
    this.pauseStartedAt = Date.now();
    clearInterval(this.intervalId);
    this._setPauseButton(true);
    this._persist();
  },
  resume() {
    if (!this.paused) return;
    this.paused = false;
    if (this.pauseStartedAt) {
      this.pausedTotalMs += Date.now() - this.pauseStartedAt;
      this.pauseStartedAt = null;
    }
    this.intervalId = setInterval(() => this.tick(), 250);
    this._setPauseButton(false);
    WakeLock.enable();
    this._persist();
    this.render();
  },
  _setPauseButton(isPaused) {
    document.getElementById('btn-pause-run').innerHTML = isPaused
      ? `${icon('status_play',18)} Resume`
      : `${icon('ui_pause',18)} Pause`;
  },
  _stopAll() {
    this.active = false;
    clearInterval(this.intervalId);
    stopGpsTracking();
    releaseWakeLock();
    this._clearPersisted();
  },
  endEarly() {
    this._stopAll();
    showScreen('home');
    showToast("No worries — that quest will be waiting whenever you're ready!");
  },
  complete() {
    const quest = this.quest;
    this._stopAll();
    const rewards = questRewards(quest);
    const save = App.save;
    const beforeLevel = xpProgress(save.xp).level;
    save.xp += rewards.xp;
    save.gold += rewards.gold;
    if (!save.completedQuestIds.includes(quest.id)) save.completedQuestIds.push(quest.id);
    const distanceThisRun = sessionDistanceMeters;
    if (distanceThisRun > 0) save.lifetimeDistanceMeters += distanceThisRun;
    const afterLevel = xpProgress(save.xp).level;
    const leveledUp = afterLevel > beforeLevel;

    // ---- log this run ----
    const elapsedSec = Math.max(
      1,
      Math.round((Date.now() - (this.startedAt || Date.now()) - (this.pausedTotalMs || 0)) / 1000)
    );
    const record = {
      id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      questId: quest.id,
      questTitle: quest.title,
      week: quest.week,
      region: quest.region,
      completedAt: Date.now(),
      elapsedSec,
      plannedSec: quest.totalSeconds,
      runSec: quest.runSeconds,
      distanceM: Math.round(distanceThisRun),
      route: compactRoute(simplifyRoute(sessionRoute, 300)),
      xp: rewards.xp,
      gold: rewards.gold
    };
    save.runHistory.unshift(record);
    const prs = recordsAchievedBy(save.runHistory, record.id);

    // Beacon-lit: true the moment every quest in this quest's region is done.
    const region = REGIONS.find(r => r.week === quest.week);
    const regionQuestIds = QUESTS.filter(q => q.week === quest.week).map(q => q.id);
    const regionNowDone = regionQuestIds.every(id => save.completedQuestIds.includes(id));
    const beaconKey = 'beacon-' + quest.week;
    let beaconText = null;
    if (regionNowDone && region && region.beacon && !save.storySeen.includes(beaconKey)) {
      save.storySeen.push(beaconKey);
      beaconText = region.beacon;
    }

    persistCurrentSave();

    playCompleteFanfare();
    vibrate([200, 100, 200, 100, 400]);
    showScreen('home');
    showQuestCompleteModal(quest, rewards, leveledUp, afterLevel, distanceThisRun, beaconText, prs, record);
  }
};
/* ---- resuming a run that was interrupted ---- */
function loadActiveRun() {
  try { return JSON.parse(localStorage.getItem(ACTIVE_RUN_KEY)); }
  catch (e) { return null; }
}
function discardActiveRun() {
  try { localStorage.removeItem(ACTIVE_RUN_KEY); } catch (e) {}
}
function offerRunResume() {
  const saved = loadActiveRun();
  if (!saved || saved.profileId !== App.profileId) return false;
  const quest = QUESTS.find(q => q.id === saved.questId);
  if (!quest) { discardActiveRun(); return false; }

  const age = Date.now() - (saved.savedAt || saved.startedAt || 0);
  if (age > RESUME_MAX_AGE_MS) { discardActiveRun(); return false; }

  const pausedNow = (saved.paused && saved.pauseStartedAt) ? Date.now() - saved.pauseStartedAt : 0;
  const elapsedMs = Date.now() - saved.startedAt - (saved.pausedTotalMs || 0) - pausedNow;
  // Finished ages ago with nobody watching: treat as abandoned rather than
  // silently awarding a quest nobody actually ran.
  if (elapsedMs > quest.totalSeconds * 1000 + RESUME_OVERRUN_GRACE_MS) {
    discardActiveRun();
    return false;
  }

  const doneSec = Math.min(Math.round(elapsedMs / 1000), quest.totalSeconds);
  showModal(`
    <div class="modal-title">Pick up where you left off?</div>
    <div class="modal-sub">${escapeHtml(quest.title)}</div>
    <p class="t-small mt-8">You were ${fmtTime(doneSec)} into this quest when the app closed.</p>
    <div class="flex gap-8 mt-16">
      <button class="btn btn-outline grow" id="modal-discard-run">Start Over</button>
      <button class="btn btn-primary grow" id="modal-resume-run">Resume</button>
    </div>
  `, () => {
    document.getElementById('modal-discard-run').addEventListener('click', () => {
      closeModal();
      discardActiveRun();
    });
    document.getElementById('modal-resume-run').addEventListener('click', () => {
      closeModal();
      RunEngine.start(quest, saved);
    });
  });
  return true;
}

/* Save a snapshot the moment we're backgrounded — this is the instant before
   a screen lock, and the last chance to write anything down. */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    if (RunEngine.active) RunEngine._persist();
  } else if (RunEngine.active) {
    // Coming back into view: the OS will have dropped any wake lock while we
    // were hidden, so take it again, then resync the clock.
    WakeLock.enable();
    RunEngine.tick();
    updateWakeIndicator();
  }
});
window.addEventListener('pagehide', () => { if (RunEngine.active) RunEngine._persist(); });

document.getElementById('btn-pause-run').addEventListener('click', () => {
  if (RunEngine.paused) RunEngine.resume(); else RunEngine.pause();
});
document.getElementById('btn-end-run').addEventListener('click', () => {
  RunEngine.pause();
  showModal(`
    <div class="modal-title">Leave this quest?</div>
    <p class="t-small mt-8">Your progress on this run won't be saved, but you can jump back in anytime.</p>
    <div class="flex gap-8 mt-16">
      <button class="btn btn-outline grow" id="modal-keep-going">Keep Going</button>
      <button class="btn btn-primary grow" id="modal-end-quest">End Quest</button>
    </div>
  `, () => {
    document.getElementById('modal-keep-going').addEventListener('click', () => { closeModal(); RunEngine.resume(); });
    document.getElementById('modal-end-quest').addEventListener('click', () => { closeModal(); RunEngine.endEarly(); });
  });
});
function startQuest(quest) {
  const save = App.save;
  const region = REGIONS.find(r => r.week === quest.week);
  const arrivalKey = 'arrival-' + quest.week;
  if (quest.runNumber === 1 && region && region.arrival && !save.storySeen.includes(arrivalKey)) {
    save.storySeen.push(arrivalKey);
    persistCurrentSave();
    showStoryModal(region.name, region.arrival, 'Begin', () => RunEngine.start(quest));
  } else {
    RunEngine.start(quest);
  }
}

function showQuestCompleteModal(quest, rewards, leveledUp, newLevel, distanceMeters, beaconText, prs, record) {
  const isFinale = quest.id === 'w9r3';

  const milestoneHtml = quest.milestone
    ? `<div class="milestone-note">${icon('ui_sparkle',15)} Milestone: ${escapeHtml(quest.milestone)}</div>`
    : '';

  const levelUpHtml = leveledUp
    ? `<div class="levelup-note">${icon('ui_sparkle',20)} LEVEL UP! Level ${newLevel}</div>
       <p class="t-small muted">${escapeHtml(levelTitle(newLevel))}</p>`
    : '';

  const distanceHtml = distanceMeters > 0
    ? `<p class="t-small muted mt-8">${icon('stat_distance',14)} You explored ${fmtDistance(distanceMeters)} on this quest!</p>`
    : '';

  const beaconHtml = beaconText
    ? `<div class="beacon-note">${icon('ui_flame', 22, 'ico-flame')}<p class="story-text">${escapeHtml(beaconText)}</p></div>`
    : '';

  // Personal bests earned by this run — the "you beat yourself" moment.
  const prHtml = (prs && prs.length)
    ? `<div class="pr-note">${prs.map(p =>
         `${MEDALS[p.rank]} — ${escapeHtml(p.label)}: ${escapeHtml(p.formatted)}`
       ).join('<br>')}</div>`
    : '';

  const routeHtml = (record && record.route && record.route.length > 1)
    ? `<svg class="detail-route mt-12" id="complete-route" viewBox="0 0 240 130"></svg>`
    : '';

  const finaleHtml = isFinale
    ? `<div class="finale-note">${icon('trophy',22)} WINDRUNNER OF THE REALM ${icon('trophy',22)}</div>
       <p class="story-text mt-8">${escapeHtml(FINALE_SPEECH)}</p>
       <div class="stat-pill mt-8">27 / 27 Quests Complete</div>`
    : '';

  showModal(`
    <div class="modal-title">Quest Complete!</div>
    <div class="modal-sub">${escapeHtml(quest.title)}</div>
    <div class="reward-row">
      <span class="reward-pill reward-pill--xp"><span data-countup="${rewards.xp}">0</span> XP</span>
      <span class="reward-pill reward-pill--gold">${icon('stat_gold',15)} <span data-countup="${rewards.gold}">0</span></span>
    </div>
    ${distanceHtml}
    ${routeHtml}
    ${prHtml}
    ${milestoneHtml}
    ${beaconHtml}
    ${levelUpHtml}
    ${finaleHtml}
    <button class="btn btn-primary mt-20" id="modal-continue">Continue</button>
  `, () => {
    runCountUps();
    if (record && record.route && record.route.length > 1) {
      paintRoute(document.getElementById('complete-route'), record.route, { vw: 240, vh: 130 });
    }
    if (leveledUp) setTimeout(() => { playLevelUpFanfare(); vibrate([100, 60, 100, 60, 100, 60, 300]); }, 400);
    document.getElementById('modal-continue').addEventListener('click', () => { closeModal(); renderHome(); });
  });
}

/* Numbers that tick up read as "earned" rather than "assigned" — worth the
   few lines for the audience this is built for. */
function runCountUps() {
  document.querySelectorAll('[data-countup]').forEach(el => {
    const target = parseInt(el.dataset.countup, 10) || 0;
    if (target <= 0) { el.textContent = String(target); return; }
    const durationMs = 700;
    const started = Date.now();
    const step = () => {
      const t = Math.min(1, (Date.now() - started) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* ================= RUN LOG ================= */
function renderLog() {
  const hist = App.save.runHistory || [];
  const countEl = document.getElementById('log-count-pill');
  countEl.textContent = hist.length === 1 ? '1 run' : `${hist.length} runs`;

  const sum = summarise(hist);
  document.getElementById('log-summary').innerHTML = `
    <div class="summary-grid">
      <div class="summary-cell">
        <div class="summary-value">${sum.runs}</div>
        <div class="summary-label">Runs</div>
      </div>
      <div class="summary-cell">
        <div class="summary-value">${sum.distanceM >= 1000 ? (sum.distanceM/1000).toFixed(1) : Math.round(sum.distanceM)}</div>
        <div class="summary-label">${sum.distanceM >= 1000 ? 'km total' : 'm total'}</div>
      </div>
      <div class="summary-cell">
        <div class="summary-value">${Math.round(sum.runSec / 60)}</div>
        <div class="summary-label">Min running</div>
      </div>
    </div>`;

  document.getElementById('log-records').innerHTML = computeRecords(hist).map(cat => {
    const rows = cat.entries.length
      ? cat.entries.map(e => `
          <div class="record-row">
            <span class="medal medal-${e.rank}">${e.rank}</span>
            <span class="record-value">${escapeHtml(e.formatted)}</span>
            <span class="record-when">${escapeHtml(fmtDateShort(e.run.completedAt))}</span>
          </div>`).join('')
      : `<div class="record-empty">Not set yet — get out there!</div>`;
    return `<div class="record-card">
      <div class="record-head">${icon(cat.iconKey, 17)} ${escapeHtml(cat.label)}</div>
      ${rows}
    </div>`;
  }).join('');

  const histEl = document.getElementById('log-history');
  if (!hist.length) {
    histEl.innerHTML = `<p class="empty-note">No runs logged yet. Finish a quest and it'll appear here.</p>`;
    return;
  }
  histEl.innerHTML = hist.map(r => {
    const hasRoute = r.route && r.route.length > 1;
    const thumb = hasRoute
      ? `<svg class="history-thumb" data-route-for="${r.id}" viewBox="0 0 56 56"></svg>`
      : `<div class="history-thumb history-thumb-empty">${icon('status_done', 20)}</div>`;
    const pace = runPace(r);
    const bits = [fmtDuration(r.elapsedSec)];
    if (r.distanceM > 0) bits.push(fmtDistance(r.distanceM));
    if (pace) bits.push(fmtPace(pace));
    return `<button class="history-row" data-run-id="${r.id}">
      ${thumb}
      <div class="history-info">
        <div class="history-title">${escapeHtml(r.questTitle)}</div>
        <div class="history-meta">${escapeHtml(fmtDateShort(r.completedAt))} · Week ${r.week}</div>
        <div class="history-stats">${escapeHtml(bits.join(' · '))}</div>
      </div>
    </button>`;
  }).join('');

  // paint thumbnails after the markup exists
  hist.forEach(r => {
    if (r.route && r.route.length > 1) {
      const el = histEl.querySelector(`[data-route-for="${r.id}"]`);
      paintRoute(el, r.route, { vw: 56, vh: 56, pad: 6, dots: false });
    }
  });
}

function showRunDetail(runId) {
  const r = (App.save.runHistory || []).find(x => x.id === runId);
  if (!r) return;
  const pace = runPace(r);
  const hasRoute = r.route && r.route.length > 1;
  showModal(`
    <div class="modal-title">${escapeHtml(r.questTitle)}</div>
    <div class="modal-sub">${escapeHtml(r.region)} · Week ${r.week}</div>
    <p class="t-small muted mt-4">${escapeHtml(fmtDateShort(r.completedAt))}</p>
    ${hasRoute
      ? `<svg class="detail-route mt-12" id="detail-route" viewBox="0 0 240 200"></svg>`
      : `<p class="t-small muted mt-12">No route recorded for this run — GPS was off, or there wasn't a signal.</p>`}
    <div class="detail-grid mt-12">
      <div class="detail-cell"><div class="detail-value">${fmtDuration(r.elapsedSec)}</div><div class="detail-label">Time</div></div>
      <div class="detail-cell"><div class="detail-value">${r.distanceM > 0 ? fmtDistance(r.distanceM) : '—'}</div><div class="detail-label">Distance</div></div>
      <div class="detail-cell"><div class="detail-value">${pace ? fmtPace(pace).replace(' /km','') : '—'}</div><div class="detail-label">Pace /km</div></div>
      <div class="detail-cell"><div class="detail-value">${r.xp}</div><div class="detail-label">XP earned</div></div>
    </div>
    <button class="btn btn-primary mt-16" id="modal-detail-close">Close</button>
  `, () => {
    if (hasRoute) paintRoute(document.getElementById('detail-route'), r.route, { vw: 240, vh: 200, pad: 14, dotR: 5 });
    document.getElementById('modal-detail-close').addEventListener('click', closeModal);
  });
}
document.addEventListener('click', e => {
  const row = e.target.closest('[data-run-id]');
  if (row) showRunDetail(row.dataset.runId);
});

/* ================= DELETE ADVENTURER ================= */
function deleteCurrentProfile() {
  const id = App.profileId;
  const name = App.save ? App.save.name : 'this adventurer';
  if (!id) return;
  localStorage.removeItem(STORAGE_PREFIX + 'save_' + id);
  saveProfileIndex(loadProfileIndex().filter(p => p.id !== id));
  App.profileId = null;
  App.save = null;
  applyBgTheme('none');
  showToast(`${name} has been deleted.`);
  if (loadProfileIndex().length === 0) {
    App.createConfig = { skinTone: SKIN_TONES[1], hairColor: HAIR_COLORS[0], hairStyle: 'short', gender: 'girl' };
    openCharacterCreate();
  } else {
    renderProfileList();
    showScreen('profile-select');
  }
}
document.getElementById('btn-delete-profile').addEventListener('click', () => {
  const name = App.save ? App.save.name : 'this adventurer';
  const runs = (App.save.runHistory || []).length;
  const quests = App.save.completedQuestIds.length;
  showModal(`
    <div class="modal-title">Delete ${escapeHtml(name)}?</div>
    <p class="t-small mt-8">This erases ${quests} completed quest${quests === 1 ? '' : 's'}, ${runs} logged run${runs === 1 ? '' : 's'}, all gear and all records.</p>
    <p class="t-small mt-8"><strong>This cannot be undone.</strong></p>
    <div class="flex gap-8 mt-16">
      <button class="btn btn-outline grow" id="modal-cancel-delete">Keep</button>
      <button class="btn btn-danger grow" id="modal-confirm-delete">Delete</button>
    </div>
  `, () => {
    document.getElementById('modal-cancel-delete').addEventListener('click', closeModal);
    document.getElementById('modal-confirm-delete').addEventListener('click', () => {
      closeModal();
      deleteCurrentProfile();
    });
  });
});

/* ================= BOTTOM NAV ================= */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => showScreen(btn.dataset.screen));
});

/* The nav bar's real height varies with the device's font-size setting and
   its gesture-bar inset, so a hardcoded gap was always going to be wrong on
   some phones. Measure it instead. */
/* Tell the runner plainly whether the screen will stay on, rather than
   leaving them to discover mid-run that it won't. */
function updateWakeIndicator() {
  const el = document.getElementById('run-wake-status');
  if (!el) return;
  if (!RunEngine.active) { el.classList.add('hidden'); return; }
  const held = WakeLock.isHeld();
  el.classList.toggle('hidden', held);
  if (!held) {
    el.textContent = "Your screen may dim — that's fine, the quest keeps running.";
  }
}

function syncNavSpace() {
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;
  const visible = !nav.classList.contains('hidden');
  // offsetHeight already includes the nav's own safe-area padding
  const h = visible ? nav.offsetHeight : 0;
  document.documentElement.style.setProperty('--nav-space', (h + 24) + 'px');
}
window.addEventListener('resize', syncNavSpace);
window.addEventListener('orientationchange', () => setTimeout(syncNavSpace, 150));

/* ================= INIT ================= */
function hydrateIcons(root) {
  (root || document).querySelectorAll('[data-icon]').forEach(el => {
    const key = el.dataset.icon;
    const size = parseInt(el.dataset.iconSize || '', 10) || 20;
    el.innerHTML = icon(key, size);
  });
}

function init() {
  hydrateIcons();
  syncNavSpace();
  const idx = loadProfileIndex();
  if (idx.length === 0) {
    App.createConfig = { skinTone: SKIN_TONES[1], hairColor: HAIR_COLORS[0], hairStyle: 'short', gender: 'girl' };
    openCharacterCreate();
  } else {
    renderProfileList();
    showScreen('profile-select');
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
document.addEventListener('DOMContentLoaded', init);
