// ─── Constants ────────────────────────────────────────────────────────────────

const TILE_SIZE    = 72;
const BOARD_PADDING = 72;

// 28 tiles, each [top, right, bottom, left], flowers 0-7.
// Every tile has 4 UNIQUE edge values.
// Built from 6 rotation-groups of 4 + 4 bridge tiles:
//   each flower appears exactly 14 times total, 3-4 times per side.
const TILES = [
  // Group 1 — {0,1,2,3} rotations
  [0, 1, 2, 3],  //  0
  [1, 2, 3, 0],  //  1
  [2, 3, 0, 1],  //  2
  [3, 0, 1, 2],  //  3
  // Group 2 — {4,5,6,7} rotations
  [4, 5, 6, 7],  //  4
  [5, 6, 7, 4],  //  5
  [6, 7, 4, 5],  //  6
  [7, 4, 5, 6],  //  7
  // Group 3 — {0,1,4,5} rotations
  [0, 1, 4, 5],  //  8
  [1, 4, 5, 0],  //  9
  [4, 5, 0, 1],  // 10
  [5, 0, 1, 4],  // 11
  // Group 4 — {2,3,6,7} rotations
  [2, 3, 6, 7],  // 12
  [3, 6, 7, 2],  // 13
  [6, 7, 2, 3],  // 14
  [7, 2, 3, 6],  // 15
  // Group 5 — {0,2,4,6} rotations
  [0, 2, 4, 6],  // 16
  [2, 4, 6, 0],  // 17
  [4, 6, 0, 2],  // 18
  [6, 0, 2, 4],  // 19
  // Group 6 — {1,3,5,7} rotations
  [1, 3, 5, 7],  // 20
  [3, 5, 7, 1],  // 21
  [5, 7, 1, 3],  // 22
  [7, 1, 3, 5],  // 23
  // Bridge tiles
  [0, 2, 5, 7],  // 24
  [1, 3, 4, 6],  // 25
  [3, 7, 0, 4],  // 26
  [2, 6, 1, 5],  // 27
];

const FLOWER_COLORS = [
  '#ff006e', // 0 Rose    — neon magenta
  '#4d9fff', // 1 Iris    — electric blue
  '#00f5ff', // 2 Lotus   — neon cyan
  '#f700ff', // 3 Cherry  — hot violet
  '#9b5de5', // 4 Plum    — deep neon purple
  '#39ff14', // 5 Lily    — acid green
  '#ff6b00', // 6 Orchid  — electric orange
  '#ffe600', // 7 Peony   — neon yellow
];

const FLOWER_NAMES = ['Rose','Iris','Lotus','Cherry','Plum','Lily','Orchid','Peony'];

const EDGE_IDX = { t: 0, r: 1, b: 2, l: 3 };
const OPPOSITE = { t: 'b', r: 'l', b: 't', l: 'r' };
const NEIGHBORS = [
  { dc:  0, dr: -1, side: 't' },
  { dc:  1, dr:  0, side: 'r' },
  { dc:  0, dr:  1, side: 'b' },
  { dc: -1, dr:  0, side: 'l' },
];

// Per-direction: [traceX1, traceY1, traceX2, traceY2, padCX, padCY, padW, padH]
// Trace runs from hex edge to inner edge of terminal pad; pad sits at tile border.
const TRACE_DIRS = [
  [50, 37, 50, 12,   50,  6.5, 13, 8],   // top
  [61, 50, 88, 50,   93.5, 50,  8, 13],  // right
  [50, 63, 50, 88,   50, 93.5, 13, 8],   // bottom
  [39, 50, 12, 50,    6.5, 50,  8, 13],  // left
];

// ─── High scores ───────────────────────────────────────────────────────────────

// SUPABASE_KEY is the public anon key — intentionally client-side visible.
// Security depends on RLS: anon role has SELECT + INSERT only (no UPDATE/DELETE).
// If RLS policies change, rotate this key immediately.
const SUPABASE_URL = 'https://vmtnxtmjfsnuyqgtgazz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdG54dG1qZnNudXlxZ3RnYXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMzM3NzksImV4cCI6MjA5MDkwOTc3OX0.mpRZ0osV9jUNCYpuI_mkwBixMOe6_g8_ChP7617d09k';
const SB_HEADERS   = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
const SCORES_URL   = `${SUPABASE_URL}/rest/v1/rain_scores`;
const HS_KEY       = 'agr-highscores'; // localStorage fallback key
const HS_MAX       = 10;

let cachedScores = [];

async function fetchScores() {
  try {
    const res = await fetch(
      `${SCORES_URL}?select=initials,score&order=score.desc&limit=${HS_MAX}`,
      { headers: SB_HEADERS, signal: AbortSignal.timeout(4000) }
    );
    if (res.ok) { cachedScores = await res.json(); return; }
  } catch {}
  try { cachedScores = JSON.parse(localStorage.getItem(HS_KEY)) || []; }
  catch { cachedScores = []; }
}

async function saveScore(initials, score) {
  const entry = { initials: initials.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || '???', score };
  try {
    const res = await fetch(SCORES_URL, {
      method: 'POST',
      headers: { ...SB_HEADERS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(entry),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) { await fetchScores(); return; }
  } catch {}
  // localStorage fallback
  cachedScores = [...cachedScores, entry];
  cachedScores.sort((a, b) => b.score - a.score);
  cachedScores.splice(HS_MAX);
  try { localStorage.setItem(HS_KEY, JSON.stringify(cachedScores)); } catch {}
}

function qualifiesForLeaderboard(score) {
  if (score <= 0) return false;
  return cachedScores.length < HS_MAX || score >= cachedScores[cachedScores.length - 1].score;
}

function renderLeaderboard(highlightIdx) {
  const list = document.getElementById('score-list');
  list.innerHTML = '';
  if (cachedScores.length === 0) {
    const li = document.createElement('li');
    li.className   = 'hs-empty';
    li.textContent = 'No scores yet';
    list.appendChild(li);
    return;
  }
  const mk = (cls, text) => {
    const s = document.createElement('span');
    s.className = cls; s.textContent = text; return s;
  };
  for (let i = 0; i < cachedScores.length; i++) {
    const { initials, score } = cachedScores[i];
    const li = document.createElement('li');
    if (i === highlightIdx) li.classList.add('hs-highlight');
    li.append(mk('hs-rank', i + 1), mk('hs-initials', initials), mk('hs-score', score));
    list.appendChild(li);
  }
}

// ─── State ─────────────────────────────────────────────────────────────────────

const state = {
  deck:            [],
  board:           new Map(),  // "col,row" → {idx, rot}
  currentTile:     null,
  currentRotation: 0,          // 0-3 (×90° CW)
  validSpots:      [],
  tokens:          new Array(8).fill(false),
  boardBounds:     { minCol: 0, maxCol: 0, minRow: 0, maxRow: 0 },
  panOffset:       { x: 0, y: 0 },
  phase:           'playing',
  score:           0,
  blossoms:        new Map(),  // "col,row" → flowerIdx claimed (-1 none, -2 pending)
  pendingChoices:  [],         // [{key, flowers:[flowerIdx,...]}] awaiting player pick
};

// ─── View state (not game state) ──────────────────────────────────────────────

let zoom = 1;

// ─── DOM caches ────────────────────────────────────────────────────────────────

const tileElements    = new Map();
const spotElements    = new Map();
const blossomElements = new Map();

// ─── Utilities ─────────────────────────────────────────────────────────────────

// Returns [top, right, bottom, left] for a tile index at a given rotation (0-3).
// Rotation is clockwise: 1 = 90° CW, 2 = 180°, 3 = 270° CW.
function getTileEdges(tileIdx, rotation) {
  const [t, r, b, l] = TILES[tileIdx];
  switch (rotation & 3) {
    case 1: return [l, t, r, b];
    case 2: return [b, l, t, r];
    case 3: return [r, b, l, t];
    default: return [t, r, b, l];
  }
}

// Edge value for a board entry {idx, rot}.
function boardEdge(entry, side) {
  return getTileEdges(entry.idx, entry.rot)[EDGE_IDX[side]];
}

function boardKey(col, row) { return `${col},${row}`; }

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Placement validation ──────────────────────────────────────────────────────

function isValidPlacement(tileIdx, col, row, rotation) {
  if (state.board.has(boardKey(col, row))) return false;
  const edges = getTileEdges(tileIdx, rotation);
  let hasNeighbor = false;
  for (const { dc, dr, side } of NEIGHBORS) {
    const neighbor = state.board.get(boardKey(col + dc, row + dr));
    if (neighbor) {
      hasNeighbor = true;
      if (edges[EDGE_IDX[side]] !== boardEdge(neighbor, OPPOSITE[side])) return false;
    }
  }
  return hasNeighbor;
}

function findValidSpots(tileIdx, rotation) {
  const candidates = new Set();
  for (const key of state.board.keys()) {
    const [col, row] = key.split(',').map(Number);
    for (const { dc, dr } of NEIGHBORS) {
      const nk = boardKey(col + dc, row + dr);
      if (!state.board.has(nk)) candidates.add(nk);
    }
  }
  const spots = [];
  for (const key of candidates) {
    const [col, row] = key.split(',').map(Number);
    if (isValidPlacement(tileIdx, col, row, rotation)) spots.push({ col, row });
  }
  return spots;
}

// ─── Board bounds ──────────────────────────────────────────────────────────────

function updateBounds(col, row) {
  const b = state.boardBounds;
  const oldMinCol = b.minCol, oldMinRow = b.minRow;
  b.minCol = Math.min(b.minCol, col);
  b.maxCol = Math.max(b.maxCol, col);
  b.minRow = Math.min(b.minRow, row);
  b.maxRow = Math.max(b.maxRow, row);
  if (b.minCol < oldMinCol) state.panOffset.x -= (oldMinCol - b.minCol) * TILE_SIZE;
  if (b.minRow < oldMinRow) state.panOffset.y -= (oldMinRow - b.minRow) * TILE_SIZE;
}

// ─── Blossom detection ─────────────────────────────────────────────────────────

function getBlossomFlowers(cx, cy) {
  const tl = state.board.get(boardKey(cx - 1, cy - 1));
  const tr = state.board.get(boardKey(cx,     cy - 1));
  const bl = state.board.get(boardKey(cx - 1, cy    ));
  const br = state.board.get(boardKey(cx,     cy    ));
  const flowers = new Set();
  if (tl) { flowers.add(boardEdge(tl, 'r')); flowers.add(boardEdge(tl, 'b')); }
  if (tr) { flowers.add(boardEdge(tr, 'l')); flowers.add(boardEdge(tr, 'b')); }
  if (bl) { flowers.add(boardEdge(bl, 'r')); flowers.add(boardEdge(bl, 't')); }
  if (br) { flowers.add(boardEdge(br, 'l')); flowers.add(boardEdge(br, 't')); }
  return flowers;
}

function checkBlossoms(placedCol, placedRow) {
  const corners = [
    [placedCol,     placedRow    ],
    [placedCol + 1, placedRow    ],
    [placedCol,     placedRow + 1],
    [placedCol + 1, placedRow + 1],
  ];
  for (const [cx, cy] of corners) {
    const tl = state.board.get(boardKey(cx - 1, cy - 1));
    const tr = state.board.get(boardKey(cx,     cy - 1));
    const bl = state.board.get(boardKey(cx - 1, cy    ));
    const br = state.board.get(boardKey(cx,     cy    ));
    if (!tl || !tr || !bl || !br) continue;

    const ck = boardKey(cx, cy);
    if (state.blossoms.has(ck)) continue;

    const available = [...getBlossomFlowers(cx, cy)].filter(f => !state.tokens[f]);
    if (available.length === 0) {
      state.blossoms.set(ck, -1);
    } else if (available.length === 1) {
      state.tokens[available[0]] = true;
      state.blossoms.set(ck, available[0]);
    } else {
      state.blossoms.set(ck, -2);  // pending — player must choose
      state.pendingChoices.push({ key: ck, flowers: available });
    }
  }

  if (state.tokens.every(Boolean)) {
    state.score = 8 + state.deck.length;
    state.phase = 'won';
  } else {
    state.score = state.tokens.filter(Boolean).length;
  }
}

// ─── Game flow ─────────────────────────────────────────────────────────────────

function drawNextTile() {
  while (state.deck.length > 0) {
    const candidate = state.deck.shift();
    // Try every rotation — only discard if truly unplaceable in all orientations
    for (let rot = 0; rot < 4; rot++) {
      const spots = findValidSpots(candidate, rot);
      if (spots.length > 0) {
        state.currentTile     = candidate;
        state.currentRotation = rot;
        state.validSpots      = spots;
        return;
      }
    }
    // Genuinely unplaceable in any orientation — discard silently
  }
  state.currentTile = null;
  state.validSpots  = [];
  state.phase       = 'ended';
  state.score       = state.tokens.filter(Boolean).length;
}

function rotateCurrentTile() {
  if (state.currentTile === null || state.phase !== 'playing') return;
  // Advance to the next rotation that actually has valid spots
  for (let i = 1; i <= 3; i++) {
    const newRot = (state.currentRotation + i) & 3;
    const spots = findValidSpots(state.currentTile, newRot);
    if (spots.length > 0) {
      state.currentRotation = newRot;
      state.validSpots = spots;
      render();
      return;
    }
  }
  // Only one valid rotation — nothing to change
}

function placeTile(col, row) {
  if (state.phase !== 'playing') return;
  if (state.currentTile === null) return;
  if (!state.validSpots.some(s => s.col === col && s.row === row)) return;

  const entry = { idx: state.currentTile, rot: state.currentRotation };
  state.currentTile = null;
  state.validSpots  = [];

  state.board.set(boardKey(col, row), entry);
  updateBounds(col, row);
  checkBlossoms(col, row);

  if (state.phase !== 'won' && state.pendingChoices.length === 0) drawNextTile();

  render();

  if (state.phase !== 'playing' && state.pendingChoices.length === 0) {
    setTimeout(showOverlay, 600);
  } else {
    autoPanToTile(col, row);
  }
}

function claimPendingToken(flowerIdx) {
  if (state.pendingChoices.length === 0) return;
  const { key, flowers } = state.pendingChoices[0];
  if (!flowers.includes(flowerIdx)) return;

  state.tokens[flowerIdx] = true;
  state.blossoms.set(key, flowerIdx);
  if (blossomElements.has(key)) {
    const el = blossomElements.get(key);
    el.style.setProperty('--blossom-color', FLOWER_COLORS[flowerIdx]);
    el.classList.remove('pending');
  }

  state.pendingChoices.shift();

  if (state.tokens.every(Boolean)) {
    state.score = 8 + state.deck.length;
    state.phase = 'won';
    render();
    setTimeout(showOverlay, 600);
    return;
  }
  state.score = state.tokens.filter(Boolean).length;

  if (state.pendingChoices.length > 0) { render(); return; }

  drawNextTile();
  render();
  if (state.phase !== 'playing') setTimeout(showOverlay, 600);
}

function initGame() {
  tileElements.clear();
  spotElements.clear();
  blossomElements.clear();
  document.getElementById('board').innerHTML = '';

  const fullDeck = shuffleArray([...Array(TILES.length).keys()]);
  state.deck            = fullDeck;
  state.board           = new Map();
  state.currentTile     = null;
  state.currentRotation = 0;
  state.validSpots      = [];
  state.tokens          = new Array(8).fill(false);
  state.boardBounds     = { minCol: 0, maxCol: 0, minRow: 0, maxRow: 0 };
  state.panOffset       = { x: 0, y: 0 };
  state.phase           = 'playing';
  zoom                  = 1;
  state.score           = 0;
  state.blossoms        = new Map();
  state.pendingChoices  = [];

  // Place first tile at origin with rotation 0
  const firstIdx = state.deck.shift();
  state.board.set(boardKey(0, 0), { idx: firstIdx, rot: 0 });

  hideOverlay();
  drawNextTile();
  render();
  centerBoard();
}

// ─── Pixel helpers ─────────────────────────────────────────────────────────────

function tileX(col) { return (col - state.boardBounds.minCol) * TILE_SIZE + BOARD_PADDING; }
function tileY(row) { return (row - state.boardBounds.minRow) * TILE_SIZE + BOARD_PADDING; }

// ─── Rendering ─────────────────────────────────────────────────────────────────

// Linear congruential generator — deterministic PCB decoration per tile.
function lcg(seed) {
  let s = (seed * 1664525 + 1013904223) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
}

function svgEl(ns, tag, attrs) {
  const el = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

// Subtle PCB traces, pads, and vias in the four corner quadrants.
function addPCBCorners(svg, ns, seed) {
  const rng = lcg(seed);
  const corners = [
    { x: 7,  y: 7,  w: 30, h: 28 },  // top-left
    { x: 63, y: 7,  w: 30, h: 28 },  // top-right
    { x: 7,  y: 65, w: 30, h: 28 },  // bottom-left
    { x: 63, y: 65, w: 30, h: 28 },  // bottom-right
  ];
  for (const c of corners) {
    const r = () => c.x + rng() * c.w;
    const d = () => c.y + rng() * c.h;
    // L-shaped trace
    const [ax, ay, bx, by] = [r(), d(), r(), d()];
    svg.appendChild(svgEl(ns, 'path', {
      d: `M ${ax.toFixed(1)},${ay.toFixed(1)} L ${bx.toFixed(1)},${ay.toFixed(1)} L ${bx.toFixed(1)},${by.toFixed(1)}`,
      fill: 'none', stroke: 'rgba(0,245,255,0.09)', 'stroke-width': '0.7',
    }));
    // Two SMD pads
    for (let p = 0; p < 2; p++) {
      const [px, py] = [r(), d()];
      svg.appendChild(svgEl(ns, 'rect', {
        x: (px-2).toFixed(1), y: (py-1.2).toFixed(1), width: '4', height: '2.4', rx: '0.4',
        fill: 'rgba(0,245,255,0.06)', stroke: 'rgba(0,245,255,0.13)', 'stroke-width': '0.4',
      }));
    }
    // Via hole
    const [vx, vy] = [r(), d()];
    svg.appendChild(svgEl(ns, 'circle', { cx: vx.toFixed(1), cy: vy.toFixed(1), r: '2', fill: 'none', stroke: 'rgba(0,245,255,0.13)', 'stroke-width': '0.5' }));
    svg.appendChild(svgEl(ns, 'circle', { cx: vx.toFixed(1), cy: vy.toFixed(1), r: '0.7', fill: 'rgba(0,245,255,0.22)' }));
  }
}

function createTileElement(tileIdx, rotation) {
  const wrap  = document.createElement('div');
  wrap.className = 'tile';
  const edges = getTileEdges(tileIdx, rotation);
  const ns    = 'http://www.w3.org/2000/svg';

  const svg = svgEl(ns, 'svg', { viewBox: '0 0 100 100', width: '100%', height: '100%' });

  // Background
  svg.appendChild(svgEl(ns, 'rect', { width: '100', height: '100', fill: '#080810' }));

  // PCB corner decorations (deterministic per tile)
  addPCBCorners(svg, ns, tileIdx * 7 + 3);

  // Coloured neon traces + terminal pads
  for (let i = 0; i < 4; i++) {
    const color = FLOWER_COLORS[edges[i]];
    const [x1, y1, x2, y2, cx, cy, pw, ph] = TRACE_DIRS[i];

    // Outer glow
    svg.appendChild(svgEl(ns, 'line', { x1, y1, x2, y2, stroke: color, 'stroke-width': '8', 'stroke-opacity': '0.2' }));
    // Core trace
    svg.appendChild(svgEl(ns, 'line', { x1, y1, x2, y2, stroke: color, 'stroke-width': '3' }));

    // Terminal pad (square connector at tile edge)
    svg.appendChild(svgEl(ns, 'rect', {
      x: (cx - pw / 2).toFixed(1), y: (cy - ph / 2).toFixed(1),
      width: pw, height: ph, rx: '1.5',
      fill: '#060612', stroke: color, 'stroke-width': '1.5',
    }));
    // Via inside pad
    svg.appendChild(svgEl(ns, 'circle', { cx, cy, r: '3', fill: color, 'fill-opacity': '0.9' }));
  }

  // Centre hex (pointy-top, r=13)
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI / 180 * (60 * i - 30);
    return `${(50 + 13 * Math.cos(a)).toFixed(2)},${(50 + 13 * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
  svg.appendChild(svgEl(ns, 'polygon', { points: pts, fill: '#050510', stroke: 'rgba(0,245,255,0.5)', 'stroke-width': '1.2' }));

  // Target ring
  svg.appendChild(svgEl(ns, 'circle', { cx: '50', cy: '50', r: '6.5', fill: 'none', stroke: 'rgba(0,245,255,0.6)', 'stroke-width': '0.8' }));

  // Crosshair
  for (const [x1, y1, x2, y2] of [[43,50,57,50],[50,43,50,57]]) {
    svg.appendChild(svgEl(ns, 'line', { x1, y1, x2, y2, stroke: 'rgba(0,245,255,0.45)', 'stroke-width': '0.7' }));
  }

  // Centre glow + dot
  svg.appendChild(svgEl(ns, 'circle', { cx: '50', cy: '50', r: '4', fill: 'rgba(0,245,255,0.12)' }));
  svg.appendChild(svgEl(ns, 'circle', { cx: '50', cy: '50', r: '2', fill: '#00f5ff' }));

  wrap.appendChild(svg);
  return wrap;
}

function renderBoard() {
  const board = document.getElementById('board');
  const b = state.boardBounds;
  board.style.width  = (b.maxCol - b.minCol + 1) * TILE_SIZE + 2 * BOARD_PADDING + 'px';
  board.style.height = (b.maxRow - b.minRow + 1) * TILE_SIZE + 2 * BOARD_PADDING + 'px';

  for (const [key, entry] of state.board) {
    const [col, row] = key.split(',').map(Number);
    const x = tileX(col), y = tileY(row);
    if (!tileElements.has(key)) {
      const el = createTileElement(entry.idx, entry.rot);
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
      el.classList.add('placing');
      board.appendChild(el);
      tileElements.set(key, el);
      el.addEventListener('animationend', () => el.classList.remove('placing'), { once: true });
    } else {
      const el = tileElements.get(key);
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
    }
  }
}

function renderValidSpots() {
  const board = document.getElementById('board');
  const currentKeys = new Set(state.validSpots.map(s => boardKey(s.col, s.row)));

  for (const [key, el] of spotElements) {
    if (!currentKeys.has(key)) { el.remove(); spotElements.delete(key); }
  }
  for (const { col, row } of state.validSpots) {
    const key = boardKey(col, row);
    const x = tileX(col), y = tileY(row);
    if (!spotElements.has(key)) {
      const el = document.createElement('div');
      el.className = 'valid-spot';
      el.dataset.col = col;
      el.dataset.row = row;
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
      board.appendChild(el);
      spotElements.set(key, el);
    } else {
      const el = spotElements.get(key);
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
    }
  }
}

function renderBlossomLayer() {
  const board = document.getElementById('board');
  for (const [key, flowerIdx] of state.blossoms) {
    const [cx, cy] = key.split(',').map(Number);
    const x = tileX(cx), y = tileY(cy);
    if (!blossomElements.has(key)) {
      const el = document.createElement('div');
      const pending = flowerIdx === -2;
      el.className = 'blossom-dot new' + (pending ? ' pending' : '');
      const color = flowerIdx >= 0 ? FLOWER_COLORS[flowerIdx]
                  : pending        ? 'rgba(0,245,255,0.8)'
                  :                  'rgba(255,255,255,0.35)';
      el.style.setProperty('--blossom-color', color);
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
      board.appendChild(el);
      blossomElements.set(key, el);
      el.addEventListener('animationend', () => el.classList.remove('new'), { once: true });
    } else {
      const el = blossomElements.get(key);
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
    }
  }
}

function renderCurrentTile() {
  const container = document.getElementById('current-tile-container');
  const label     = document.getElementById('current-tile-label');
  container.innerHTML = '';

  if (state.pendingChoices.length > 0) {
    label.textContent = 'Pick a token';
    return;
  }

  if (state.currentTile === null) {
    container.textContent = '—';
    label.textContent = 'Next';
    return;
  }

  const el = createTileElement(state.currentTile, state.currentRotation);
  el.style.position = 'relative';
  el.style.width    = '52px';
  el.style.height   = '52px';
  container.appendChild(el);

  label.textContent = 'Tap to rotate';
}

function renderTokenRack() {
  const rack     = document.getElementById('token-rack');
  const existing = rack.children;
  const choices  = state.pendingChoices.length > 0 ? state.pendingChoices[0].flowers : null;

  for (let i = 0; i < 8; i++) {
    let token = existing[i];
    if (!token) {
      token = document.createElement('div');
      token.className = 'token';
      token.style.background = FLOWER_COLORS[i];
      token.style.setProperty('--token-color', FLOWER_COLORS[i]);
      token.title = FLOWER_NAMES[i];
      rack.appendChild(token);
    }
    token.classList.toggle('placed',       state.tokens[i]);
    token.classList.toggle('choosable',    !!choices && choices.includes(i));
    token.classList.toggle('not-choosable',!!choices && !choices.includes(i));
  }
}

function renderUI() {
  document.getElementById('deck-count').textContent = `Deck: ${state.deck.length}`;
  document.getElementById('score').textContent      = `Score: ${state.score}`;
}

function render() {
  renderBoard();
  renderValidSpots();
  renderBlossomLayer();
  renderCurrentTile();
  renderTokenRack();
  renderUI();
  applyPan(false);
}

// ─── Pan / center ──────────────────────────────────────────────────────────────

function applyPan(animate) {
  const board = document.getElementById('board');
  if (!board) return;
  board.style.transition   = animate ? 'transform 0.3s ease-out' : 'none';
  board.style.transformOrigin = '0 0';
  board.style.transform    = `translate(${state.panOffset.x}px, ${state.panOffset.y}px) scale(${zoom})`;
}

function centerBoard() {
  const vp = document.getElementById('board-viewport');
  const b  = state.boardBounds;
  const bw = (b.maxCol - b.minCol + 1) * TILE_SIZE + 2 * BOARD_PADDING;
  const bh = (b.maxRow - b.minRow + 1) * TILE_SIZE + 2 * BOARD_PADDING;
  state.panOffset.x = Math.round((vp.clientWidth  - bw * zoom) / 2);
  state.panOffset.y = Math.round((vp.clientHeight - bh * zoom) / 2);
  applyPan(true);
}

function autoPanToTile(col, row) {
  const vp = document.getElementById('board-viewport');
  state.panOffset.x = Math.round(vp.clientWidth  / 2 - (tileX(col) + TILE_SIZE / 2) * zoom);
  state.panOffset.y = Math.round(vp.clientHeight / 2 - (tileY(row) + TILE_SIZE / 2) * zoom);
  applyPan(true);
}

// ─── Touch / mouse interaction ─────────────────────────────────────────────────

const touch = {
  active: false, startX: 0, startY: 0,
  startPanX: 0, startPanY: 0,
  startTime: 0, isPanning: false, targetEl: null,
  // pinch state
  pinching: false, startDist: 0, startZoom: 1,
  pinchMidX: 0, pinchMidY: 0,
};

const PAN_THRESHOLD    = 8;
const TAP_MAX_DURATION = 300;

function onPointerDown(clientX, clientY, target) {
  touch.active    = true;
  touch.startX    = clientX;
  touch.startY    = clientY;
  touch.startPanX = state.panOffset.x;
  touch.startPanY = state.panOffset.y;
  touch.startTime = Date.now();
  touch.isPanning = false;
  touch.targetEl  = target;
}

function onPointerMove(clientX, clientY) {
  if (!touch.active) return;
  const dx = clientX - touch.startX, dy = clientY - touch.startY;
  if (Math.abs(dx) > PAN_THRESHOLD || Math.abs(dy) > PAN_THRESHOLD) touch.isPanning = true;
  if (touch.isPanning) {
    state.panOffset.x = touch.startPanX + dx;
    state.panOffset.y = touch.startPanY + dy;
    applyPan(false);
  }
}

function onPointerUp() {
  if (!touch.active) return;
  if (!touch.isPanning && Date.now() - touch.startTime < TAP_MAX_DURATION) {
    handleTap(touch.targetEl);
  }
  touch.active = false;
}

function handleTap(el) {
  if (!el) return;
  let target = el;
  while (target && !target.classList.contains('valid-spot')) {
    if (target.id === 'board-viewport') return;
    target = target.parentElement;
  }
  if (target && target.classList.contains('valid-spot')) {
    placeTile(parseInt(target.dataset.col), parseInt(target.dataset.row));
  }
}

function initInteraction() {
  const vp = document.getElementById('board-viewport');

  const ZOOM_MIN = 0.4, ZOOM_MAX = 3;

  function applyZoomAt(newZoom, vpX, vpY) {
    newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
    const bx = (vpX - state.panOffset.x) / zoom;
    const by = (vpY - state.panOffset.y) / zoom;
    zoom = newZoom;
    state.panOffset.x = vpX - bx * zoom;
    state.panOffset.y = vpY - by * zoom;
    applyPan(false);
  }

  vp.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length === 1) {
      touch.pinching = false;
      const t = e.touches[0];
      onPointerDown(t.clientX, t.clientY, document.elementFromPoint(t.clientX, t.clientY));
    } else if (e.touches.length === 2) {
      touch.active   = false;
      touch.pinching = true;
      const [t0, t1] = [e.touches[0], e.touches[1]];
      const vpRect   = vp.getBoundingClientRect();
      touch.startDist  = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      touch.startZoom  = zoom;
      touch.startPanX  = state.panOffset.x;
      touch.startPanY  = state.panOffset.y;
      touch.pinchMidX  = (t0.clientX + t1.clientX) / 2 - vpRect.left;
      touch.pinchMidY  = (t0.clientY + t1.clientY) / 2 - vpRect.top;
    }
  }, { passive: false });

  vp.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 2 && touch.pinching) {
      const [t0, t1] = [e.touches[0], e.touches[1]];
      const vpRect   = vp.getBoundingClientRect();
      const dist     = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const midX     = (t0.clientX + t1.clientX) / 2 - vpRect.left;
      const midY     = (t0.clientY + t1.clientY) / 2 - vpRect.top;
      const newZoom  = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, touch.startZoom * dist / touch.startDist));

      // Zoom around initial pinch point, also allow mid-point pan
      const bx = (touch.pinchMidX - touch.startPanX) / touch.startZoom;
      const by = (touch.pinchMidY - touch.startPanY) / touch.startZoom;
      zoom = newZoom;
      state.panOffset.x = touch.pinchMidX - bx * zoom + (midX - touch.pinchMidX);
      state.panOffset.y = touch.pinchMidY - by * zoom + (midY - touch.pinchMidY);
      applyPan(false);
    } else if (e.touches.length === 1 && !touch.pinching) {
      const t = e.touches[0];
      onPointerMove(t.clientX, t.clientY);
    }
  }, { passive: false });

  vp.addEventListener('touchend', e => {
    e.preventDefault();
    if (e.touches.length === 0) { touch.pinching = false; onPointerUp(); }
    else if (e.touches.length === 1 && touch.pinching) { touch.pinching = false; }
  }, { passive: false });

  // Mouse wheel zoom (desktop)
  vp.addEventListener('wheel', e => {
    e.preventDefault();
    const vpRect  = vp.getBoundingClientRect();
    const vpX     = e.clientX - vpRect.left;
    const vpY     = e.clientY - vpRect.top;
    const factor  = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    applyZoomAt(zoom * factor, vpX, vpY);
  }, { passive: false });

  vp.addEventListener('mousedown', e => onPointerDown(e.clientX, e.clientY, e.target));
  window.addEventListener('mousemove', e => onPointerMove(e.clientX, e.clientY));
  window.addEventListener('mouseup', () => onPointerUp());

  // Token rack — claim pending token on click/tap
  const rack = document.getElementById('token-rack');
  rack.addEventListener('click', e => {
    const token = e.target.closest('.token');
    if (!token || !token.classList.contains('choosable')) return;
    claimPendingToken([...rack.children].indexOf(token));
  });
  rack.addEventListener('touchend', e => {
    e.preventDefault();
    const token = document.elementFromPoint(
      e.changedTouches[0].clientX, e.changedTouches[0].clientY
    )?.closest('.token');
    if (!token || !token.classList.contains('choosable')) return;
    claimPendingToken([...rack.children].indexOf(token));
  }, { passive: false });

  // Tap on current tile preview → rotate
  document.getElementById('current-tile-area').addEventListener('click', rotateCurrentTile);
  document.getElementById('current-tile-area').addEventListener('touchend', e => {
    e.preventDefault();
    e.stopPropagation();
    rotateCurrentTile();
  });
}

// ─── Overlay ───────────────────────────────────────────────────────────────────

async function showOverlay() {
  const overlay         = document.getElementById('overlay');
  const title           = document.getElementById('overlay-title');
  const message         = document.getElementById('overlay-message');
  const initialsSection = document.getElementById('initials-section');
  const leaderboard     = document.getElementById('leaderboard');
  const n = state.tokens.filter(Boolean).length;

  if (state.phase === 'won') {
    title.textContent   = 'All Flowers Bloomed!';
    message.textContent = `Score: ${state.score}  (8 blooms + ${state.deck.length} remaining)`;
  } else {
    const labels = ['No blooms','One bloom','Two blooms','Three blooms',
                    'Four blooms','Five blooms','Six blooms','So close…','All bloomed!'];
    title.textContent   = labels[n] || `${n} blooms`;
    message.textContent = `${n} of 8 flowers bloomed  ·  Score: ${state.score}`;
  }

  // Show overlay immediately; fetch scores then reveal the right section.
  initialsSection.classList.add('hidden');
  leaderboard.classList.add('hidden');
  overlay.classList.remove('hidden');

  await fetchScores();

  const submitBtn = document.getElementById('initials-submit');
  if (qualifiesForLeaderboard(state.score)) {
    initialsSection.classList.remove('hidden');
    submitBtn.disabled = false;
    const input = document.getElementById('initials-input');
    input.value = '';
    setTimeout(() => input.focus(), 150);
  } else {
    leaderboard.classList.remove('hidden');
    renderLeaderboard(-1);
  }
}

function hideOverlay() {
  document.getElementById('overlay').classList.add('hidden');
}

function toggleHelp() {
  document.getElementById('help-modal').classList.toggle('hidden');
}

// ─── Entry point ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initInteraction();
  document.getElementById('new-game-btn').addEventListener('click', initGame);
  document.getElementById('play-again-btn').addEventListener('click', initGame);
  document.getElementById('help-btn').addEventListener('click', toggleHelp);
  document.getElementById('help-close').addEventListener('click', toggleHelp);

  async function submitInitials() {
    const input     = document.getElementById('initials-input');
    const submitBtn = document.getElementById('initials-submit');
    const val       = input.value.trim().toUpperCase();
    if (!val || submitBtn.disabled) return;
    submitBtn.disabled = true;  // prevent double-submit

    await saveScore(val, state.score);
    const idx = cachedScores.findIndex(s => s.initials === val && s.score === state.score);
    document.getElementById('initials-section').classList.add('hidden');
    document.getElementById('leaderboard').classList.remove('hidden');
    renderLeaderboard(idx);
  }

  document.getElementById('initials-submit').addEventListener('click', submitInitials);
  document.getElementById('initials-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitInitials();
  });

  initGame();
});
