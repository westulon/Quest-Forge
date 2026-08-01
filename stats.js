/* ============================================================
   stats.js — run history, route geometry and personal records
   ------------------------------------------------------------
   Pure logic only: no DOM, no storage. Everything here takes
   data in and returns data out, which keeps it testable.
   ============================================================ */

/* ---------------- route simplification ----------------
   A 30-minute run at 1 sample/sec is ~1800 points. Storing that
   for 27 quests would bloat localStorage and slow rendering, and
   the extra points add no visible detail. Ramer–Douglas–Peucker
   thins the line while preserving the SHAPE — corners survive,
   straight stretches collapse — which is exactly what matters
   for a route drawing. */

function _perpDistance(p, a, b) {
  // perpendicular distance from p to segment a-b, in degrees-ish space
  const x = p[1], y = p[0];
  const x1 = a[1], y1 = a[0], x2 = b[1], y2 = b[0];
  const dx = x2 - x1, dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

function _rdp(points, epsilon) {
  if (points.length < 3) return points.slice();
  let maxDist = 0, index = 0;
  const first = points[0], last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = _perpDistance(points[i], first, last);
    if (d > maxDist) { maxDist = d; index = i; }
  }
  if (maxDist > epsilon) {
    const left = _rdp(points.slice(0, index + 1), epsilon);
    const right = _rdp(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

/** Thin a route to at most maxPoints while preserving its shape. */
function simplifyRoute(points, maxPoints) {
  maxPoints = maxPoints || 300;
  if (!points || points.length <= 2) return (points || []).slice();
  if (points.length <= maxPoints) return points.slice();

  // Find the SMALLEST epsilon that gets us under budget, so we keep as much
  // detail as the budget allows. Escalating blindly overshoots badly — it can
  // throw away most of the shape on the step that finally drops under the cap.
  let lo = 0, hi = 0.0005, best = null;
  for (let i = 0; i < 30 && _rdp(points, hi).length > maxPoints; i++) hi *= 2;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const out = _rdp(points, mid);
    if (out.length > maxPoints) {
      lo = mid;
    } else {
      best = out;
      hi = mid;
    }
  }
  return best || _rdp(points, hi);
}

/** Round coordinates to ~1m precision so saves stay small. */
function compactRoute(points) {
  return (points || []).map(p => [
    Math.round(p[0] * 1e5) / 1e5,
    Math.round(p[1] * 1e5) / 1e5
  ]);
}

/* ---------------- projection to an SVG path ---------------- */

/**
 * Project lat/lng points into an SVG path that fits the given box.
 * Uses an equirectangular projection with a cos(latitude) correction —
 * without it, routes render horizontally squashed everywhere except
 * the equator (at ~54°N, a degree of longitude is only ~59% of a
 * degree of latitude).
 * Returns null when there isn't enough to draw.
 */
function routeToSvgPath(points, width, height, pad) {
  if (!points || points.length < 2) return null;
  pad = pad == null ? 8 : pad;

  const lats = points.map(p => p[0]);
  const lngs = points.map(p => p[1]);
  const meanLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const kx = Math.cos(meanLat * Math.PI / 180) || 1;

  // projected space: x east, y north-up (SVG y grows downward, so negate)
  const xs = lngs.map(l => l * kx);
  const ys = lats.map(l => -l);

  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  if (spanX === 0 && spanY === 0) return null;

  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  // single scale for both axes preserves the route's true proportions
  const scale = Math.min(
    spanX > 0 ? innerW / spanX : Infinity,
    spanY > 0 ? innerH / spanY : Infinity
  );
  const drawW = spanX * scale;
  const drawH = spanY * scale;
  const offX = pad + (innerW - drawW) / 2;
  const offY = pad + (innerH - drawH) / 2;

  let d = '';
  for (let i = 0; i < points.length; i++) {
    const x = offX + (xs[i] - minX) * scale;
    const y = offY + (ys[i] - minY) * scale;
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
  }

  const startX = offX + (xs[0] - minX) * scale;
  const startY = offY + (ys[0] - minY) * scale;
  const endX = offX + (xs[xs.length - 1] - minX) * scale;
  const endY = offY + (ys[ys.length - 1] - minY) * scale;

  return { d, start: [startX, startY], end: [endX, endY], width, height };
}

/* ---------------- derived run values ---------------- */

/** Average pace in seconds per km. Null when there isn't enough distance
 *  to be meaningful — a 50m GPS wobble shouldn't mint a "record" pace. */
function runPace(run) {
  if (!run || !run.distanceM || run.distanceM < 400) return null;
  const movingSec = run.runSec || run.elapsedSec;
  if (!movingSec) return null;
  return movingSec / (run.distanceM / 1000);
}

function fmtPace(secPerKm) {
  if (secPerKm == null || !isFinite(secPerKm)) return '—';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

function fmtDuration(sec) {
  if (sec == null) return '—';
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function fmtDateShort(ms) {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ---------------- personal records ----------------
   Strava-style: the best three efforts for each stat, so a good run
   is still worth something even when it isn't an outright best. */

const RECORD_CATEGORIES = [
  {
    key: 'distance', label: 'Longest Distance', iconKey: 'stat_distance',
    value: r => (r.distanceM > 0 ? r.distanceM : null),
    better: 'higher',
    format: v => (v >= 1000 ? (v / 1000).toFixed(2) + ' km' : Math.round(v) + ' m')
  },
  {
    key: 'runtime', label: 'Most Time Running', iconKey: 'ui_pause',
    value: r => r.runSec || null,
    better: 'higher',
    format: v => fmtDuration(v)
  },
  {
    key: 'session', label: 'Longest Session', iconKey: 'status_play',
    value: r => r.elapsedSec || null,
    better: 'higher',
    format: v => fmtDuration(v)
  },
  {
    key: 'pace', label: 'Fastest Pace', iconKey: 'boo2',
    value: r => runPace(r),
    better: 'lower',
    format: v => fmtPace(v)
  },
  {
    key: 'xp', label: 'Biggest XP Haul', iconKey: 'stat_xp',
    value: r => r.xp || null,
    better: 'higher',
    format: v => v + ' XP'
  }
];

/**
 * Top three efforts per category.
 * Returns [{ key, label, iconKey, entries: [{ rank, value, formatted, run }] }]
 * Categories with no qualifying runs come back with an empty entries array,
 * so the UI can show them as "not set yet" rather than hiding them.
 */
function computeRecords(runHistory) {
  const runs = runHistory || [];
  return RECORD_CATEGORIES.map(cat => {
    const scored = [];
    runs.forEach(r => {
      const v = cat.value(r);
      if (v != null && isFinite(v) && v > 0) scored.push({ value: v, run: r });
    });
    scored.sort((a, b) => (cat.better === 'lower' ? a.value - b.value : b.value - a.value));
    const entries = scored.slice(0, 3).map((e, i) => ({
      rank: i + 1,
      value: e.value,
      formatted: cat.format(e.value),
      run: e.run
    }));
    return { key: cat.key, label: cat.label, iconKey: cat.iconKey, entries };
  });
}

/**
 * Which categories would this run land in the top three of?
 * Used to congratulate the runner immediately after finishing.
 * `history` must ALREADY include the new run.
 */
function recordsAchievedBy(history, runId) {
  const hits = [];
  computeRecords(history).forEach(cat => {
    cat.entries.forEach(e => {
      if (e.run && e.run.id === runId) {
        hits.push({ label: cat.label, rank: e.rank, formatted: e.formatted });
      }
    });
  });
  return hits;
}

const MEDALS = { 1: 'Gold', 2: 'Silver', 3: 'Bronze' };

/** Lifetime totals for the summary strip. */
function summarise(runHistory) {
  const runs = runHistory || [];
  return {
    runs: runs.length,
    distanceM: runs.reduce((a, r) => a + (r.distanceM || 0), 0),
    elapsedSec: runs.reduce((a, r) => a + (r.elapsedSec || 0), 0),
    runSec: runs.reduce((a, r) => a + (r.runSec || 0), 0)
  };
}

/* ============================================================
   Interval summaries — describing a session in plain language
   ============================================================ */

function spokenDuration(sec) {
  if (sec % 60 === 0) {
    const m = sec / 60;
    return m === 1 ? '1 minute' : m + ' minutes';
  }
  if (sec < 60) return sec + ' seconds';
  const m = Math.floor(sec / 60), r = sec % 60;
  return (m === 1 ? '1 minute ' : m + ' minutes ') + r + ' seconds';
}

function shortDuration(sec) {
  if (sec % 60 === 0) return (sec / 60) + ' min';
  if (sec < 60) return sec + ' sec';
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}

/**
 * Turn a phase list into a few readable blocks, collapsing the repetition
 * that makes C25K sessions look daunting written out in full.
 * "Run 1 min, walk 90 sec" repeated eight times reads far better than
 * sixteen separate lines.
 */
function summariseIntervals(phases) {
  const core = phases.filter(p => p.type === 'run' || p.type === 'walk');
  const warmup = phases.find(p => p.type === 'warmup');
  const cooldown = phases.find(p => p.type === 'cooldown');
  const out = [];
  if (warmup) out.push({ kind: 'warmup', text: `Warm-up walk, ${shortDuration(warmup.duration)}` });

  // Collapse an alternating run/walk cycle into "N ×" when it repeats.
  let i = 0;
  while (i < core.length) {
    const a = core[i], b = core[i + 1];
    if (b && a.type !== b.type) {
      let reps = 0;
      while (
        core[i + reps * 2] && core[i + reps * 2 + 1] &&
        core[i + reps * 2].type === a.type && core[i + reps * 2].duration === a.duration &&
        core[i + reps * 2 + 1].type === b.type && core[i + reps * 2 + 1].duration === b.duration
      ) reps++;
      if (reps >= 2) {
        out.push({
          kind: 'cycle', reps,
          text: `${reps} × (${a.type === 'run' ? 'Run' : 'Walk'} ${shortDuration(a.duration)}` +
                ` + ${b.type === 'run' ? 'run' : 'walk'} ${shortDuration(b.duration)})`
        });
        i += reps * 2;
        continue;
      }
    }
    out.push({
      kind: a.type,
      text: `${a.type === 'run' ? 'Run' : 'Walk'} ${shortDuration(a.duration)}`
    });
    i++;
  }

  if (cooldown) out.push({ kind: 'cooldown', text: `Cool-down walk, ${shortDuration(cooldown.duration)}` });
  return out;
}

/** The phases still to come, for the on-screen list during a run. */
function remainingIntervals(phases, currentIndex) {
  return phases.map((p, i) => ({
    index: i,
    type: p.type,
    duration: p.duration,
    label: p.type === 'warmup' ? 'Warm-up' : p.type === 'cooldown' ? 'Cool-down' : (p.type === 'run' ? 'Run' : 'Walk'),
    short: shortDuration(p.duration),
    state: i < currentIndex ? 'done' : (i === currentIndex ? 'current' : 'upcoming')
  }));
}
