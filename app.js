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
    settings: { gpsEnabled: false },
    createdAt: Date.now(),
    lastPlayedAt: Date.now()
  };
}
function migrateSave(save) {
  // Defensive: fills in fields added after a save may have been created.
  if (!save.storySeen) save.storySeen = [];
  return save;
}

/* ---------------- app state ---------------- */
const App = {
  profileId: null,
  save: null,
  createConfig: { skinTone: SKIN_TONES[1], hairColor: HAIR_COLORS[0], hairStyle: 'short' }
};

function getNextQuestIndex(save) {
  const done = new Set(save.completedQuestIds);
  return QUESTS.findIndex(q => !done.has(q.id));
}

/* ---------------- navigation ---------------- */
const SCREEN_IDS = ['profile-select', 'character-create', 'home', 'map', 'shop', 'hero', 'run'];
function showScreen(name) {
  SCREEN_IDS.forEach(id => {
    document.getElementById('screen-' + id).classList.toggle('hidden', id !== name);
  });
  const nav = document.getElementById('bottom-nav');
  const navScreens = ['home', 'map', 'shop', 'hero'];
  nav.classList.toggle('hidden', !navScreens.includes(name));
  if (navScreens.includes(name)) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.screen === name);
    });
  }
  if (name === 'home') renderHome();
  if (name === 'map') renderMap();
  if (name === 'shop') renderShop();
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
      <div class="eyebrow" style="color:var(--gold);opacity:1;">📜 ${escapeHtml(title)}</div>
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
    list.innerHTML = `<p class="text-center" style="color:var(--parchment);opacity:0.7;">No adventurers yet — create the first one below!</p>`;
    return;
  }
  list.innerHTML = idx.map(p => {
    const save = loadSave(p.id);
    if (!save) return '';
    const avatar = renderCharacterSVG(save.avatarConfig ? Object.assign({}, save.avatarConfig, { equipped: save.equipped }) : { equipped: save.equipped });
    const info = xpProgress(save.xp);
    return `<button class="profile-card" style="width:100%;text-align:left;border:1px solid rgba(242,230,201,0.18);" data-profile-id="${p.id}">
      <div class="profile-avatar-sm">${avatar}</div>
      <div>
        <div class="display" style="font-size:17px;color:var(--parchment);">${escapeHtml(save.name)}</div>
        <div style="font-size:13px;color:var(--gold-bright);">Level ${info.level} · ${levelTitle(info.level)}</div>
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
  showScreen('home');
}

/* ================= CHARACTER CREATE ================= */
function renderCreatePickers() {
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
    `<button class="shop-tab ${App.createConfig.hairStyle === s ? 'active' : ''}" data-pick="hairStyle" data-value="${s}">${s[0].toUpperCase()+s.slice(1)}</button>`
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
document.getElementById('btn-new-profile').addEventListener('click', () => {
  App.createConfig = { skinTone: SKIN_TONES[1], hairColor: HAIR_COLORS[0], hairStyle: 'short' };
  document.getElementById('input-name').value = '';
  renderCreatePickers();
  showScreen('character-create');
});
document.getElementById('btn-confirm-create').addEventListener('click', () => {
  const name = document.getElementById('input-name').value.trim();
  if (!name) { showToast('Give your adventurer a name first!'); return; }
  const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const save = newSaveData(name, {
    skinTone: App.createConfig.skinTone,
    hairColor: App.createConfig.hairColor,
    hairStyle: App.createConfig.hairStyle
  });
  writeSave(id, save);
  const idx = loadProfileIndex();
  idx.push({ id });
  saveProfileIndex(idx);
  App.profileId = id;
  App.save = save;
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
  document.getElementById('home-level-pill').textContent = `⭐ Lv ${info.level}`;
  document.getElementById('home-gold-pill').textContent = `🪙 ${save.gold}`;
  const pct = info.needed > 0 ? Math.round((info.current / info.needed) * 100) : 100;
  document.getElementById('home-xp-fill').style.width = pct + '%';
  document.getElementById('home-xp-label').textContent = `${info.current} / ${info.needed} XP`;

  const nextIdx = getNextQuestIndex(save);
  if (nextIdx === -1) {
    document.getElementById('home-next-quest').closest('.panel-dark').classList.add('hidden');
    document.getElementById('home-all-done-card').style.display = 'block';
  } else {
    document.getElementById('home-next-quest').closest('.panel-dark').classList.remove('hidden');
    document.getElementById('home-all-done-card').style.display = 'none';
    const q = QUESTS[nextIdx];
    document.getElementById('home-quest-title').textContent = q.title;
    document.getElementById('home-quest-region').textContent = `Week ${q.week} · ${q.region}`;
    document.getElementById('home-quest-flavor').textContent = q.flavor;
    document.getElementById('home-quest-meta').textContent =
      `${fmtTime(q.totalSeconds)} total${q.milestone ? ' · ✨ Milestone Quest' : ''}`;
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
    const badgeClass = regionDone ? 'done' : (isCurrentRegion ? '' : 'locked');
    const badgeContent = regionDone ? '✅' : (ICONS[region.icon] || '⛺');

    const questRows = quests.map(q => {
      let status = 'locked';
      if (done.has(q.id)) status = 'done';
      else if (nextQuest && q.id === nextQuest.id) status = 'current';
      const seal = status === 'done' ? '🟢' : (status === 'current' ? '▶️' : '🔒');
      const clickable = status === 'current';
      return `<div class="quest-chip ${status}" ${clickable ? `data-start-quest="${q.id}"` : ''} style="${clickable ? 'cursor:pointer;' : ''}">
        <span>${escapeHtml(q.title)}${q.milestone ? ' ✨' : ''}</span>
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
const ICONS = {
  village: '🏘️', woods: '🌲', hills: '🏞️', bridge: '🌉', grove: '✨',
  foothills: '🐾', peaks: '⛰️', lair: '🐉', kingdom: '🏰'
};

/* ================= SHOP ================= */
const SHOP_TAB_META = {
  weapon: { label: 'Weapon', icon: '⚔️' }, armor: { label: 'Armor', icon: '🛡️' },
  head: { label: 'Head', icon: '🎩' }, boots: { label: 'Boots', icon: '👢' },
  cape: { label: 'Cape', icon: '🧣' }, companion: { label: 'Companion', icon: '🐾' }
};
let shopActiveTab = 'weapon';
function renderShop() {
  document.getElementById('shop-gold-pill').textContent = `🪙 ${App.save.gold}`;
  document.getElementById('shop-intro').innerHTML = `<p class="story-text" style="margin:0;font-size:13px;">${escapeHtml(SHOP_INTRO)}</p>`;
  document.getElementById('shop-tabs').innerHTML = EQUIPMENT_SLOTS.map(slot =>
    `<button class="shop-tab ${slot === shopActiveTab ? 'active' : ''}" data-shop-tab="${slot}">${SHOP_TAB_META[slot].icon} ${SHOP_TAB_META[slot].label}</button>`
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
      actionHtml = `<span class="eyebrow" style="color:var(--gold);opacity:1;">Equipped</span>`;
    } else if (isOwned) {
      rowClass = 'owned';
      actionHtml = `<button class="btn btn-teal btn-sm" data-equip="${shopActiveTab}:${item.id}">Equip</button>`;
    } else {
      const afford = save.gold >= item.price;
      rowClass = afford ? '' : 'locked';
      actionHtml = `<button class="btn ${afford ? 'btn-gold' : 'btn-ghost'} btn-sm" ${afford ? `data-buy="${shopActiveTab}:${item.id}"` : 'disabled'} style="${afford ? '' : 'color:var(--ink-text);border-color:rgba(28,43,33,0.2);'}">🪙 ${item.price}</button>`;
    }
    return `<div class="card item-row ${rowClass}">
      <div class="item-icon">${SHOP_TAB_META[shopActiveTab].icon}</div>
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
  const weekLabel = nextIdx === -1 ? 'Complete! 🏆' : `Week ${QUESTS[nextIdx].week} of 9`;
  document.getElementById('hero-stats').innerHTML = `
    <div class="flex" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.08);"><span>Quests completed</span><strong>${questsDone} / ${QUESTS.length}</strong></div>
    <div class="flex" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.08);"><span>Current progress</span><strong>${weekLabel}</strong></div>
    <div class="flex" style="justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(0,0,0,0.08);"><span>Total XP earned</span><strong>${save.xp}</strong></div>
    <div class="flex" style="justify-content:space-between;padding:6px 0;"><span>Distance explored</span><strong>${fmtDistance(save.lifetimeDistanceMeters)}</strong></div>
  `;
  document.getElementById('chk-gps').checked = !!save.settings.gpsEnabled;
}
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
      entries.push({ title: `${region.name} — Beacon Lit`, text });
    }
  });
  return entries;
}
function showJournal() {
  const entries = getJournalEntries(App.save);
  const body = entries.length === 0
    ? `<p style="margin-top:10px;color:var(--paper-text);">Nothing written yet — start your first quest to begin the story.</p>`
    : `<div class="journal-list mt-12">${entries.map(e => `
        <div class="journal-entry">
          <div class="eyebrow" style="color:var(--gold);opacity:1;">${escapeHtml(e.title)}</div>
          ${e.text.split(/\n\n+/).map(p => `<p class="story-text">${escapeHtml(p)}</p>`).join('')}
        </div>`).join('')}</div>`;
  showModal(`
    <div class="display" style="font-size:20px;color:var(--ink-text);">📖 Guild Journal</div>
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

/* ================= WAKE LOCK ================= */
let wakeLockSentinel = null;
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) wakeLockSentinel = await navigator.wakeLock.request('screen');
  } catch (e) { /* not critical */ }
}
function releaseWakeLock() {
  if (wakeLockSentinel) { wakeLockSentinel.release().catch(() => {}); wakeLockSentinel = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && RunEngine.active && !RunEngine.paused) requestWakeLock();
});

/* ================= GPS ================= */
let gpsWatchId = null;
let lastGpsPos = null;
let sessionDistanceMeters = 0;
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function startGpsTracking() {
  if (!navigator.geolocation) return;
  sessionDistanceMeters = 0; lastGpsPos = null;
  document.getElementById('run-distance').style.display = 'block';
  updateDistanceDisplay();
  gpsWatchId = navigator.geolocation.watchPosition(pos => {
    const { latitude, longitude, accuracy } = pos.coords;
    if (accuracy && accuracy > 30) return;
    if (lastGpsPos) {
      const d = haversine(lastGpsPos.lat, lastGpsPos.lon, latitude, longitude);
      if (d > 1 && d < 100) sessionDistanceMeters += d;
    }
    lastGpsPos = { lat: latitude, lon: longitude };
    updateDistanceDisplay();
  }, () => { /* silently degrade — timer still works without GPS */ }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 });
}
function stopGpsTracking() {
  if (gpsWatchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(gpsWatchId);
  gpsWatchId = null;
}
function updateDistanceDisplay() {
  document.getElementById('run-distance').textContent = `🧭 ${fmtDistance(sessionDistanceMeters)} explored`;
}

/* ================= RUN ENGINE ================= */
const RunEngine = {
  active: false,
  quest: null,
  phaseIndex: 0,
  phaseEndAt: 0,
  pausedRemainingMs: null,
  paused: false,
  intervalId: null,
  elapsedBeforePhase: 0,
  headsUpPlayed: false,

  start(quest) {
    this.active = true;
    this.quest = quest;
    this.phaseIndex = 0;
    this.elapsedBeforePhase = 0;
    this.paused = false;
    document.getElementById('run-quest-title').textContent = `${quest.region} — ${quest.title}`;
    document.getElementById('run-distance').style.display = 'none';
    showScreen('run');
    this._beginPhase();
    if (App.save.settings.gpsEnabled) startGpsTracking();
    requestWakeLock();
    this.intervalId = setInterval(() => this.tick(), 250);
    this._setPauseButton(false);
    this.render();
  },
  _beginPhase() {
    const phase = this.quest.phases[this.phaseIndex];
    this.phaseEndAt = Date.now() + phase.duration * 1000;
    this.headsUpPlayed = false;
    if (this.phaseIndex > 0) this._cueForPhase(phase);
  },
  _cueForPhase(phase) {
    if (phase.type === 'run') { playRunCue(); vibrate([150, 80, 150, 80, 150]); }
    else if (phase.type === 'walk') { playWalkCue(); vibrate([400]); }
    else { beep(494, 0, 0.4, 0.25); vibrate([250]); }
  },
  tick() {
    if (this.paused || !this.active) return;
    const phase = this.quest.phases[this.phaseIndex];
    const remainingMs = this.phaseEndAt - Date.now();
    const remainingSec = Math.max(0, remainingMs / 1000);
    const isLastPhase = this.phaseIndex >= this.quest.phases.length - 1;
    if (remainingSec <= 5 && remainingSec > 0.3 && !this.headsUpPlayed && !isLastPhase) {
      this.headsUpPlayed = true; playHeadsUpCue(); vibrate(60);
    }
    if (remainingMs <= 0) {
      this.elapsedBeforePhase += phase.duration;
      this.phaseIndex++;
      if (this.phaseIndex >= this.quest.phases.length) { this.complete(); return; }
      this._beginPhase();
    }
    this.render();
  },
  render() {
    if (!this.active) return;
    const phase = this.quest.phases[this.phaseIndex];
    const remainingSec = Math.max(0, (this.phaseEndAt - Date.now()) / 1000);
    const screenEl = document.getElementById('screen-run');
    screenEl.className = 'timer-screen phase-' + phase.type;
    document.getElementById('run-phase-label').textContent = PHASE_LABELS[phase.type];
    document.getElementById('run-clock').textContent = fmtTime(remainingSec);
    const nextPhase = this.quest.phases[this.phaseIndex + 1];
    document.getElementById('run-nextup').textContent = nextPhase ? `Then: ${PHASE_LABELS[nextPhase.type]}` : 'Final stretch!';
    const overallElapsed = this.elapsedBeforePhase + (phase.duration - remainingSec);
    document.getElementById('run-overall-fill').style.width = Math.min(100, (overallElapsed / this.quest.totalSeconds) * 100) + '%';
  },
  pause() {
    if (this.paused || !this.active) return;
    this.paused = true;
    this.pausedRemainingMs = this.phaseEndAt - Date.now();
    clearInterval(this.intervalId);
    this._setPauseButton(true);
  },
  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.phaseEndAt = Date.now() + this.pausedRemainingMs;
    this.intervalId = setInterval(() => this.tick(), 250);
    this._setPauseButton(false);
    requestWakeLock();
  },
  _setPauseButton(isPaused) {
    document.getElementById('btn-pause-run').textContent = isPaused ? '▶ Resume' : '⏸ Pause';
  },
  _stopAll() {
    this.active = false;
    clearInterval(this.intervalId);
    stopGpsTracking();
    releaseWakeLock();
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
    showQuestCompleteModal(quest, rewards, leveledUp, afterLevel, distanceThisRun, beaconText);
  }
};
document.getElementById('btn-pause-run').addEventListener('click', () => {
  if (RunEngine.paused) RunEngine.resume(); else RunEngine.pause();
});
document.getElementById('btn-end-run').addEventListener('click', () => {
  RunEngine.pause();
  showModal(`
    <h3 style="color:var(--ink-text);font-size:20px;">Leave this quest?</h3>
    <p style="color:var(--paper-text);font-size:14px;">Your progress on this run won't be saved, but you can jump back in anytime.</p>
    <div class="flex gap-8 mt-16">
      <button class="btn btn-ghost grow" id="modal-keep-going" style="color:var(--ink-text);border-color:rgba(28,43,33,0.3);">Keep Going</button>
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

function showQuestCompleteModal(quest, rewards, leveledUp, newLevel, distanceMeters, beaconText) {
  const isFinale = quest.id === 'w9r3';
  const milestoneHtml = quest.milestone
    ? `<div class="mt-8" style="background:rgba(201,151,46,0.18);border:1px solid var(--gold);border-radius:12px;padding:8px;font-weight:800;color:#7a5a10;">✨ Milestone: ${escapeHtml(quest.milestone)}</div>`
    : '';
  const levelUpHtml = leveledUp
    ? `<div class="mt-12" style="font-family:var(--font-display);font-size:22px;color:var(--ember);">🎉 LEVEL UP! Level ${newLevel}</div>
       <div style="font-size:14px;color:var(--paper-text);">${escapeHtml(levelTitle(newLevel))}</div>`
    : '';
  const distanceHtml = distanceMeters > 0
    ? `<div style="font-size:13px;color:var(--paper-text);opacity:0.8;margin-top:6px;">🧭 You explored ${fmtDistance(distanceMeters)} on this quest!</div>`
    : '';
  const beaconHtml = beaconText
    ? `<p class="story-text mt-12" style="text-align:left;">${escapeHtml(beaconText)}</p>`
    : '';
  const finaleHtml = isFinale
    ? `<div class="mt-12" style="font-family:var(--font-display);font-size:20px;color:var(--gold);">🏆 WINDRUNNER OF THE REALM 🏆</div>
       <p class="story-text mt-8" style="text-align:left;">${escapeHtml(FINALE_SPEECH)}</p>
       <div class="stat-pill mt-8" style="background:rgba(92,122,79,0.15);color:#3E5432;border-color:rgba(92,122,79,0.3);display:inline-flex;">27 / 27 Quests Complete</div>`
    : '';
  showModal(`
    <div class="display" style="font-size:24px;color:var(--ink-text);">Quest Complete!</div>
    <div style="font-size:15px;color:var(--paper-text);font-weight:700;margin-top:4px;">${escapeHtml(quest.title)}</div>
    <div class="flex gap-12 mt-16" style="justify-content:center;">
      <div class="stat-pill" style="background:rgba(92,122,79,0.15);color:#3E5432;border-color:rgba(92,122,79,0.3);">+${rewards.xp} XP</div>
      <div class="stat-pill gold" style="background:rgba(201,151,46,0.15);border-color:rgba(201,151,46,0.3);">+${rewards.gold} 🪙</div>
    </div>
    ${distanceHtml}
    ${milestoneHtml}
    ${beaconHtml}
    ${levelUpHtml}
    ${finaleHtml}
    <button class="btn btn-primary mt-20" id="modal-continue">Continue</button>
  `, () => {
    if (leveledUp) setTimeout(() => { playLevelUpFanfare(); vibrate([100, 60, 100, 60, 100, 60, 300]); }, 400);
    document.getElementById('modal-continue').addEventListener('click', () => { closeModal(); renderHome(); });
  });
}

/* ================= BOTTOM NAV ================= */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => showScreen(btn.dataset.screen));
});

/* ================= INIT ================= */
function init() {
  const idx = loadProfileIndex();
  if (idx.length === 0) {
    App.createConfig = { skinTone: SKIN_TONES[1], hairColor: HAIR_COLORS[0], hairStyle: 'short' };
    renderCreatePickers();
    showScreen('character-create');
  } else {
    renderProfileList();
    showScreen('profile-select');
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
document.addEventListener('DOMContentLoaded', init);
