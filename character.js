/* ============================================================
   character.js — layered SVG "paper doll" character renderer
   ============================================================ */

const SKIN_TONES = ['#F5D6B0', '#E0A972', '#B87A4B', '#7A4A2B'];
const HAIR_COLORS = ['#3B2A20', '#1A1A1A', '#C9972E', '#A6402E', '#6B4E8E'];
const HAIR_STYLES = ['short', 'long', 'braids'];
const INK = '#2b2119';

function tierNum(id) { return parseInt(id.slice(-1), 10); }

function renderCompanion(id) {
  if (!id || id === 'pet0') return '';
  const t = tierNum(id);
  const groups = {
    1: `<g transform="translate(20,205)"> <!-- fox cub -->
      <ellipse cx="20" cy="30" rx="19" ry="14" fill="#D9722C" stroke="${INK}" stroke-width="3.5"/>
      <circle cx="20" cy="14" r="13" fill="#D9722C" stroke="${INK}" stroke-width="3.5"/>
      <path d="M10 6 L15 -4 L19 7 Z" fill="#D9722C" stroke="${INK}" stroke-width="3"/>
      <path d="M30 6 L25 -4 L21 7 Z" fill="#D9722C" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="20" cy="17" rx="6" ry="5" fill="#FBEFE0"/>
      <circle cx="16" cy="12" r="2" fill="${INK}"/><circle cx="24" cy="12" r="2" fill="${INK}"/>
      <path d="M38 32 Q50 22 46 8" fill="none" stroke="#D9722C" stroke-width="8" stroke-linecap="round"/>
      <path d="M38 32 Q50 22 46 8" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" opacity="0"/>
    </g>`,
    2: `<g transform="translate(18,195)"> <!-- owl -->
      <ellipse cx="22" cy="30" rx="18" ry="20" fill="#8A6E4E" stroke="${INK}" stroke-width="3.5"/>
      <circle cx="15" cy="16" r="10" fill="#F2E6C9" stroke="${INK}" stroke-width="3"/>
      <circle cx="29" cy="16" r="10" fill="#F2E6C9" stroke="${INK}" stroke-width="3"/>
      <circle cx="15" cy="16" r="4" fill="${INK}"/><circle cx="29" cy="16" r="4" fill="${INK}"/>
      <path d="M20 22 L22 27 L24 22 Z" fill="#D9972E"/>
    </g>`,
    3: `<g transform="translate(14,190)"> <!-- wolf pup -->
      <ellipse cx="24" cy="34" rx="22" ry="16" fill="#9AA0A6" stroke="${INK}" stroke-width="3.5"/>
      <circle cx="24" cy="16" r="14" fill="#9AA0A6" stroke="${INK}" stroke-width="3.5"/>
      <path d="M12 8 L18 -6 L23 9 Z" fill="#9AA0A6" stroke="${INK}" stroke-width="3"/>
      <path d="M36 8 L30 -6 L25 9 Z" fill="#9AA0A6" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="24" cy="20" rx="7" ry="6" fill="#EDEFF1"/>
      <circle cx="19" cy="14" r="2.3" fill="${INK}"/><circle cx="29" cy="14" r="2.3" fill="${INK}"/>
      <circle cx="24" cy="21" r="2" fill="${INK}"/>
    </g>`,
    4: `<g transform="translate(14,185)"> <!-- baby dragon -->
      <ellipse cx="26" cy="36" rx="22" ry="16" fill="#4E8F63" stroke="${INK}" stroke-width="3.5"/>
      <circle cx="24" cy="16" r="13" fill="#4E8F63" stroke="${INK}" stroke-width="3.5"/>
      <path d="M14 8 Q10 -4 20 2 Z" fill="#376B49" stroke="${INK}" stroke-width="2.5"/>
      <path d="M34 8 Q38 -4 28 2 Z" fill="#376B49" stroke="${INK}" stroke-width="2.5"/>
      <circle cx="18" cy="15" r="2.3" fill="${INK}"/><circle cx="29" cy="15" r="2.3" fill="${INK}"/>
      <path d="M44 30 Q56 24 54 12" fill="none" stroke="#4E8F63" stroke-width="9" stroke-linecap="round"/>
      <path d="M4 40 Q0 20 10 8" fill="none" stroke="#4E8F63" stroke-width="10" stroke-linecap="round"/>
    </g>`
  };
  return groups[t] || '';
}

function renderCape(id) {
  if (!id || id === 'cap0') return '';
  const t = tierNum(id);
  const colors = { 1: '#7A2E2E', 2: '#A6402E', 3: '#3B3B6B' };
  const fill = colors[t];
  let stars = '';
  if (t === 3) {
    stars = `<circle cx="95" cy="150" r="2" fill="#F2E6C9"/><circle cx="120" cy="170" r="2" fill="#F2E6C9"/>
              <circle cx="105" cy="190" r="2" fill="#F2E6C9"/><circle cx="128" cy="140" r="1.6" fill="#F2E6C9"/>`;
  }
  return `<path d="M82 108 Q60 150 70 215 Q110 228 150 215 Q160 150 138 108 Q110 122 82 108 Z"
            fill="${fill}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>${stars}`;
}

function renderLegs(skin) {
  return `<rect x="88" y="182" width="26" height="58" rx="13" fill="${skin}" stroke="${INK}" stroke-width="4"/>
          <rect x="118" y="182" width="26" height="58" rx="13" fill="${skin}" stroke="${INK}" stroke-width="4"/>`;
}

function renderBoots(id) {
  const t = tierNum(id);
  const styles = {
    0: { fill: '#D9C39A', trim: null },
    1: { fill: '#7A4A2B', trim: null },
    2: { fill: '#2E6E72', trim: '#BFE3E5' },
    3: { fill: '#D7E6EC', trim: '#8FB6C4' },
    4: { fill: '#8B5E2B', trim: '#C9972E' }
  };
  const s = styles[t] || styles[0];
  const trim = s.trim
    ? `<rect x="83" y="232" width="35" height="6" fill="${s.trim}"/><rect x="114" y="232" width="35" height="6" fill="${s.trim}"/>`
    : '';
  return `<rect x="83" y="232" width="35" height="22" rx="9" fill="${s.fill}" stroke="${INK}" stroke-width="4"/>
          <rect x="114" y="232" width="35" height="22" rx="9" fill="${s.fill}" stroke="${INK}" stroke-width="4"/>${trim}`;
}

function renderArms(skin) {
  return `<rect x="62" y="120" width="24" height="66" rx="12" fill="${skin}" stroke="${INK}" stroke-width="4" transform="rotate(6 74 120)"/>
          <rect x="146" y="120" width="24" height="66" rx="12" fill="${skin}" stroke="${INK}" stroke-width="4" transform="rotate(-6 158 120)"/>`;
}

function renderBody(id) {
  const t = tierNum(id);
  const fills = ['#D9B36C', '#8B5E34', '#3F6B4A', '#8A94A6', '#C9972E'];
  const fill = fills[t] || fills[0];
  let texture = '';
  if (t === 3) { // chainmail dots
    let dots = '';
    for (let row = 0; row < 4; row++) {
      for (let c = 0; c < 5; c++) {
        dots += `<circle cx="${88 + c * 12}" cy="${128 + row * 16}" r="1.6" fill="${INK}" opacity="0.35"/>`;
      }
    }
    texture = dots;
  } else if (t === 4) { // plate segment lines
    texture = `<path d="M80 130 L140 130 M78 152 L142 152 M77 174 L143 174" stroke="#8a6a1e" stroke-width="2.5" opacity="0.6"/>`;
  } else if (t === 2) { // ranger coat pocket lines
    texture = `<path d="M92 140 L92 185 M128 140 L128 185" stroke="#2c4d34" stroke-width="2.5" opacity="0.6"/>`;
  }
  return `<path d="M84 112 Q110 100 136 112 L144 196 Q110 210 76 196 Z" fill="${fill}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
          ${texture}
          <path d="M96 112 Q110 122 124 112" fill="none" stroke="#f2e6c9" stroke-width="4" stroke-linecap="round" opacity="0.85"/>`;
}

function renderWeapon(id) {
  const t = tierNum(id);
  const shapes = {
    0: `<g transform="translate(150,95) rotate(18)">
          <rect x="-4" y="0" width="8" height="55" rx="3" fill="#C9A16B" stroke="${INK}" stroke-width="3"/>
          <rect x="-14" y="50" width="28" height="6" rx="3" fill="#7A4A2B" stroke="${INK}" stroke-width="2.5"/>
        </g>`,
    1: `<g transform="translate(150,90) rotate(18)">
          <rect x="-4" y="-38" width="8" height="46" rx="2" fill="#C7CDD6" stroke="${INK}" stroke-width="3"/>
          <rect x="-16" y="8" width="32" height="7" rx="3" fill="#7A4A2B" stroke="${INK}" stroke-width="2.5"/>
          <rect x="-4" y="15" width="8" height="20" rx="3" fill="#5B3A22" stroke="${INK}" stroke-width="2.5"/>
        </g>`,
    2: `<g transform="translate(158,110)">
          <path d="M0 -40 Q26 0 0 40" fill="none" stroke="#8B5E34" stroke-width="5" stroke-linecap="round"/>
          <path d="M0 -40 L0 40" fill="none" stroke="${INK}" stroke-width="2" opacity="0.5"/>
        </g>`,
    3: `<g transform="translate(150,90) rotate(18)">
          <rect x="-4.5" y="-40" width="9" height="48" rx="2" fill="#F2CB53" stroke="${INK}" stroke-width="3"/>
          <circle cx="0" cy="-38" r="4.5" fill="#FFF3C4"/>
          <rect x="-16" y="8" width="32" height="7" rx="3" fill="#8a6a1e" stroke="${INK}" stroke-width="2.5"/>
          <rect x="-4.5" y="15" width="9" height="20" rx="3" fill="#C9972E" stroke="${INK}" stroke-width="2.5"/>
        </g>`,
    4: `<g transform="translate(152,60)">
          <rect x="-4" y="0" width="8" height="88" rx="3" fill="#7A4A2B" stroke="${INK}" stroke-width="3"/>
          <circle cx="0" cy="-6" r="9" fill="#8E6BB8" stroke="${INK}" stroke-width="3"/>
          <circle cx="0" cy="-6" r="3.5" fill="#E9DDF5"/>
        </g>`
  };
  return shapes[t] || '';
}

function renderHead(skin) {
  return `<circle cx="65" cy="80" r="8" fill="${skin}" stroke="${INK}" stroke-width="4"/>
          <circle cx="155" cy="80" r="8" fill="${skin}" stroke="${INK}" stroke-width="4"/>
          <circle cx="110" cy="75" r="44" fill="${skin}" stroke="${INK}" stroke-width="4"/>`;
}

/* Hair is drawn in TWO passes, which is the fix for it reading as pasted on:
   - renderHairBack: the bulk, drawn BEHIND the head and cut as a crescent, so
     only a rim shows around the skull and down beside the jaw. This is what
     creates a silhouette rather than a decal.
   - renderHairFront: a shallow fringe on the forehead only, drawn over the
     head but stopping well clear of the eyes.
   Previously it was one shape stacked on top of the face. */
function renderHairBack(color, style, headgearId) {
  if (tierNum(headgearId) === 3) return '';   // full helm covers everything
  const shadow = shadeColor(color, -18);

  // Outer edge sits ~15px proud of the skull; inner edge tucks inside it, so
  // the join between hair and head can never show as a seam.
  const rim = `<path d="M52 112 C48 40,76 12,110 12 C144 12,172 40,168 112
                        C164 119,154 119,152 108 C154 58,133 38,110 38
                        C87 38,66 58,68 108 C66 119,56 119,52 112 Z"
        fill="${color}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;

  let fall = '';
  if (style === 'long') {
    fall = `
      <path d="M62 74 C52 112,50 150,57 178 C65 184,74 179,71 168 C64 138,64 104,74 78 Z"
            fill="${color}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M158 74 C168 112,170 150,163 178 C155 184,146 179,149 168 C156 138,156 104,146 78 Z"
            fill="${color}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M59 102 C54 126,54 152,59 170" fill="none" stroke="${shadow}" stroke-width="2.2" opacity="0.45" stroke-linecap="round"/>
      <path d="M161 102 C166 126,166 152,161 170" fill="none" stroke="${shadow}" stroke-width="2.2" opacity="0.45" stroke-linecap="round"/>`;
  } else if (style === 'braids') {
    fall = `
      <path d="M62 76 C54 104,58 128,54 148 C53 161,57 170,64 174 C71 170,72 160,69 150 C73 128,70 104,75 80 Z"
            fill="${color}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M158 76 C166 104,162 128,166 148 C167 161,163 170,156 174 C149 170,148 160,151 150 C147 128,150 104,145 80 Z"
            fill="${color}" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M56 108 L68 110 M54 128 L67 129 M57 148 L66 149"
            stroke="${INK}" stroke-width="2" opacity="0.45" stroke-linecap="round"/>
      <path d="M164 108 L152 110 M166 128 L153 129 M163 148 L154 149"
            stroke="${INK}" stroke-width="2" opacity="0.45" stroke-linecap="round"/>`;
  }
  return fall + rim;
}

function renderHairFront(color, style, headgearId) {
  if (tierNum(headgearId) === 3) return '';
  const shadow = shadeColor(color, -20);
  // Deliberately asymmetric: a perfectly mirrored fringe was part of what made
  // the old head look like a sticker. Bottom edge stays above y=62 and the
  // eyes sit at y=80, so it never crowds the face.
  return `<path d="M70 58 C72 34,90 25,112 27 C134 29,149 41,149 60
                   C142 45,126 39,110 43 C94 47,78 50,70 58 Z"
        fill="${color}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M97 30 C91 37,87 46,88 54" fill="none" stroke="${shadow}" stroke-width="2.5" opacity="0.5" stroke-linecap="round"/>
    <path d="M125 31 C131 37,134 45,132 53" fill="none" stroke="${shadow}" stroke-width="2.5" opacity="0.45" stroke-linecap="round"/>`;
}

function shadeColor(hex, amt) {
  const n = parseInt(hex.replace('#',''), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

function renderHeadgear(id) {
  const t = tierNum(id);
  if (t === 0) return '';
  const shapes = {
    1: `<path d="M64 74 A48 48 0 1 1 156 74 Q150 34 110 36 Q70 34 64 74 Z" fill="#5C6B3F" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
    2: `<path d="M66 66 A46 46 0 0 1 154 66 Q148 44 110 44 Q72 44 66 66 Z" fill="#5C7A4F" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
        <path d="M150 46 Q168 30 160 12" fill="none" stroke="#E8DDB5" stroke-width="4" stroke-linecap="round"/>`,
    3: `<path d="M60 82 A50 50 0 1 1 160 82 L156 60 Q110 24 64 60 Z" fill="#9AA0A6" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
        <rect x="92" y="72" width="36" height="8" rx="3" fill="${INK}" opacity="0.7"/>`,
    4: `<path d="M66 58 Q110 44 154 58 L150 68 Q110 56 70 68 Z" fill="#E8C24A" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
        <circle cx="110" cy="52" r="5" fill="#A6402E" stroke="${INK}" stroke-width="2"/>`
  };
  return shapes[t] || '';
}

function renderFace(skin) {
  return `<circle cx="94" cy="80" r="5.5" fill="${INK}"/>
          <circle cx="126" cy="80" r="5.5" fill="${INK}"/>
          <path d="M95 98 Q110 108 125 98" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
          <circle cx="80" cy="90" r="7" fill="#e8a598" opacity="0.55"/>
          <circle cx="140" cy="90" r="7" fill="#e8a598" opacity="0.55"/>`;
}

function renderCharacterSVG(config, opts) {
  opts = opts || {};
  const skin = config.skinTone || SKIN_TONES[1];
  const hairColor = config.hairColor || HAIR_COLORS[0];
  const hairStyle = config.hairStyle || 'short';
  const eq = Object.assign(defaultEquipped(), config.equipped || {});
  const bg = opts.transparent ? '' : `<rect width="220" height="280" rx="20" fill="${opts.bg || 'none'}"/>`;

  return `<svg viewBox="0 0 220 280" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Your adventurer">
    ${bg}
    ${renderCompanion(eq.companion)}
    ${renderCape(eq.cape)}
    ${renderLegs(skin)}
    ${renderBoots(eq.boots)}
    ${renderArms(skin)}
    ${renderBody(eq.armor)}
    ${renderWeapon(eq.weapon)}
    ${renderHairBack(hairColor, hairStyle, eq.head)}
    ${renderHead(skin)}
    ${renderHairFront(hairColor, hairStyle, eq.head)}
    ${renderHeadgear(eq.head)}
    ${renderFace(skin)}
  </svg>`;
}
