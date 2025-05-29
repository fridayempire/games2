// Dusk Til Gone - Classic Block Fit Puzzle
const GRID_SIZE = 6;
const MIN_PIECES = 6;
const MAX_PIECES = 10;

let gridState = [];
let pieces = [];
let piecePositions = {}; // { pieceId: {x, y} | null (in tray) }
let dragging = null; // { id, anchorOffset: {x, y}, ghostEl, fromGrid: bool }
let lastTouchXY = null; // Store last touch position for touchend

function randomInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function getCellSize() {
  return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell-size'));
}

// Seed-then-connect: start with 36 single-cell regions, merge until 6-10 remain, no region > 10 cells
function generatePuzzle() {
  while (true) {
    const NUM_PIECES = randomInt(MIN_PIECES, MAX_PIECES);
    let regionId = 0;
    let grid = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
    let regions = {};
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        grid[y][x] = regionId;
        regions[regionId] = [[x, y]];
        regionId++;
      }
    }

    function getAdjacentRegions() {
      let adj = [];
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          let id = grid[y][x];
          for (const [dx, dy] of [[1,0],[0,1]]) {
            let nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
              let nid = grid[ny][nx];
              if (id !== nid && regions[id] && regions[nid]) {
                // Only allow merge if resulting region will not exceed 10 cells
                if (regions[id].length + regions[nid].length <= 10) {
                  adj.push([[x, y], [nx, ny]]);
                }
              }
            }
          }
        }
      }
      return adj;
    }

    while (Object.keys(regions).length > NUM_PIECES) {
      let adj = getAdjacentRegions();
      if (adj.length === 0) break; // No valid merges, must restart
      let [[x1, y1], [x2, y2]] = adj[randomInt(0, adj.length-1)];
      let id1 = grid[y1][x1];
      let id2 = grid[y2][x2];
      // Merge region id2 into id1
      for (const [mx, my] of regions[id2]) {
        grid[my][mx] = id1;
        regions[id1].push([mx, my]);
      }
      delete regions[id2];
    }

    // If any region is larger than 10, or we didn't reach the target number, restart
    let regionArr = Object.values(regions);
    if (
      regionArr.length === NUM_PIECES &&
      regionArr.every(cells => cells.length <= 10)
    ) {
      return regionArr.map((cells, i) => {
        let minX = Math.min(...cells.map(([x])=>x));
        let minY = Math.min(...cells.map(([,y])=>y));
        return {
          id: `P${i+1}`,
          shape: cells.map(([x,y])=>({x:x-minX, y:y-minY})),
          anchor: {x: minX, y: minY},
          original: cells
        };
      });
    }
    // else, retry
  }
}

function resetGame() {
  gridState = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
  pieces = generatePuzzle();
  piecePositions = {};
  pieces.forEach(p => piecePositions[p.id] = null);
  render();
}

function restartCurrentPuzzle() {
  // Set all piece positions to null (all in tray)
  Object.keys(piecePositions).forEach(pid => piecePositions[pid] = null);
  updateGridState();
  render();
}

function render() {
  // Remove any ghost piece
  document.querySelectorAll('.ghost-piece').forEach(el => el.remove());
  // Remove all overlays
  document.querySelectorAll('.piece-overlay').forEach(el => el.remove());
  // Grid
  const grid = document.getElementById('gameGrid');
  grid.innerHTML = '';
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.x = x;
      cell.dataset.y = y;
      grid.appendChild(cell);
    }
  }
  // Pieces on grid (as colored cells only, except the one being dragged)
  pieces.forEach(piece => {
    const pos = piecePositions[piece.id];
    if (pos && (!dragging || dragging.id !== piece.id)) {
      piece.shape.forEach(offset => {
        const x = pos.x + offset.x;
        const y = pos.y + offset.y;
        const cell = grid.querySelector(`.grid-cell[data-x="${x}"][data-y="${y}"]`);
        if (cell) {
          cell.style.background = "url('./images/wood_texture.png') center/cover";
          cell.style.backgroundColor = 'var(--piece-color)'; // fallback if image missing
        }
        // Add overlay cell for drag
        const overlayCell = document.createElement('div');
        overlayCell.className = 'piece-overlay-cell';
        overlayCell.style.position = 'absolute';
        overlayCell.style.left = `${x * getCellSize()}px`;
        overlayCell.style.top = `${y * getCellSize()}px`;
        overlayCell.style.width = `${getCellSize()}px`;
        overlayCell.style.height = `${getCellSize()}px`;
        overlayCell.style.cursor = 'grab';
        overlayCell.style.background = 'rgba(0,0,0,0)';
        overlayCell.style.zIndex = 100;
        overlayCell.addEventListener('mousedown', e => startDrag(e, piece.id, pos.x, pos.y));
        overlayCell.addEventListener('touchstart', e => {
          e.preventDefault();
          startDrag(e, piece.id, pos.x, pos.y);
        }, {passive: false});
        grid.appendChild(overlayCell);
      });
    }
  });
  // Tray
  const tray = document.getElementById('pieceTray');
  tray.innerHTML = '';
  pieces.forEach(piece => {
    if (!piecePositions[piece.id]) {
      const el = makePieceElement(piece);
      tray.appendChild(el);
    }
  });
  // Only show ghost piece if dragging
  if (dragging && dragging.ghostEl) {
    document.body.appendChild(dragging.ghostEl);
  }

  // Darkness overlay effect
  const duskLayer = document.getElementById('duskLayer');
  if (duskLayer) {
    const total = pieces.length;
    const placed = Object.values(piecePositions).filter(pos => pos).length;
    let opacity = 0;
    if (placed === 0) {
      opacity = 0;
    } else if (placed === 1) {
      opacity = 0.5;
    } else {
      let t2 = (placed - 1) / (total - 1);
      opacity = 0.5 + 0.49 * Math.pow(t2, 1.5);
    }
    duskLayer.style.opacity = opacity;
  }
}

function makePieceElement(piece, gridX, gridY) {
  // Calculate bounding box for the piece
  const minX = Math.min(...piece.shape.map(s => s.x));
  const minY = Math.min(...piece.shape.map(s => s.y));
  const maxX = Math.max(...piece.shape.map(s => s.x));
  const maxY = Math.max(...piece.shape.map(s => s.y));
  const width = (maxX - minX + 1) * getCellSize();
  const height = (maxY - minY + 1) * getCellSize();

  const el = document.createElement('div');
  el.className = 'piece';
  el.dataset.id = piece.id;
  el.style.width = width + 'px';
  el.style.height = height + 'px';
  el.style.position = 'relative';
  el.style.display = 'inline-block';
  el.style.minWidth = '0';
  el.style.minHeight = '0';
  el.style.margin = '0';
  el.style.padding = '0';

  piece.shape.forEach(offset => {
    const cell = document.createElement('div');
    cell.className = 'piece-cell';
    cell.style.left = `${(offset.x - minX) * getCellSize()}px`;
    cell.style.top = `${(offset.y - minY) * getCellSize()}px`;
    el.appendChild(cell);
  });
  el.addEventListener('mousedown', e => startDrag(e, piece.id, gridX, gridY));
  el.addEventListener('touchstart', e => {
    e.preventDefault();
    startDrag(e, piece.id, gridX, gridY);
  }, {passive: false});
  return el;
}

function getEventXY(e) {
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else if (e.changedTouches && e.changedTouches.length > 0) {
    // For touchend
    return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  } else {
    return { x: e.clientX, y: e.clientY };
  }
}

function startDrag(e, pieceId, gridX, gridY) {
  // Remove any existing ghost (but NOT overlays yet)
  document.querySelectorAll('.ghost-piece').forEach(el => el.remove());
  const piece = pieces.find(p => p.id === pieceId);
  // Calculate anchor offset (mouse position relative to anchor cell)
  let {x: clientX, y: clientY} = getEventXY(e);
  let anchorOffset = {x: 0, y: 0};
  if (gridX !== undefined && gridY !== undefined) {
    // Dragging from grid: mouse - anchor cell position
    const grid = document.getElementById('gameGrid');
    const gridRect = grid.getBoundingClientRect();
    anchorOffset.x = clientX - (gridRect.left + gridX * getCellSize());
    anchorOffset.y = clientY - (gridRect.top + gridY * getCellSize());
    // Remove piece from board immediately
    piecePositions[pieceId] = null;
    updateGridState();
    render();
  } else {
    // Dragging from tray: mouse - top left of piece
    const trayRect = e.target.getBoundingClientRect();
    anchorOffset.x = clientX - trayRect.left;
    anchorOffset.y = clientY - trayRect.top;
  }
  // Create ghost
  const ghost = makePieceElement(piece);
  ghost.classList.add('ghost-piece', 'dragging');
  ghost.style.position = 'fixed';
  ghost.style.pointerEvents = 'none';
  ghost.style.left = `${clientX - anchorOffset.x}px`;
  ghost.style.top = `${clientY - anchorOffset.y}px`;
  dragging = {
    id: pieceId,
    anchorOffset,
    fromGrid: gridX !== undefined && gridY !== undefined,
    ghostEl: ghost
  };
  document.body.appendChild(ghost);
  document.addEventListener('mousemove', dragMove);
  document.addEventListener('mouseup', dragEnd);
  document.addEventListener('touchmove', dragMove, {passive: false});
  document.addEventListener('touchend', dragEnd);
}

function dragMove(e) {
  if (!dragging || !dragging.ghostEl) return;
  if (e.touches && e.touches.length > 0) e.preventDefault();
  let {x, y} = getEventXY(e);
  lastTouchXY = {x, y}; // Store last touch position
  dragging.ghostEl.style.left = `${x - dragging.anchorOffset.x}px`;
  dragging.ghostEl.style.top = `${y - dragging.anchorOffset.y}px`;
}

function dragEnd(e) {
  document.removeEventListener('mousemove', dragMove);
  document.removeEventListener('mouseup', dragEnd);
  document.removeEventListener('touchmove', dragMove);
  document.removeEventListener('touchend', dragEnd);
  if (!dragging) return;
  if (dragging.ghostEl) dragging.ghostEl.remove();
  // Remove all overlays (now, after drag is complete)
  document.querySelectorAll('.piece-overlay').forEach(el => el.remove());
  let x, y;
  if (e.type === 'touchend' && lastTouchXY) {
    x = lastTouchXY.x;
    y = lastTouchXY.y;
  } else {
    ({x, y} = getEventXY(e));
  }
  const grid = document.getElementById('gameGrid');
  const gridRect = grid.getBoundingClientRect();
  // Snap anchor cell to nearest grid cell
  const gx = Math.round((x - gridRect.left - dragging.anchorOffset.x) / getCellSize());
  const gy = Math.round((y - gridRect.top - dragging.anchorOffset.y) / getCellSize());
  const piece = pieces.find(p => p.id === dragging.id);
  // Try to place on grid
  if (isValidPlacement(piece, gx, gy)) {
    piecePositions[piece.id] = {x: gx, y: gy};
  } else {
    piecePositions[piece.id] = null;
  }
  updateGridState();
  dragging = null;
  lastTouchXY = null;
  render();
  checkWin();
}

function isValidPlacement(piece, anchorX, anchorY) {
  if (anchorX == null || anchorY == null) return false;
  for (const offset of piece.shape) {
    const x = anchorX + offset.x;
    const y = anchorY + offset.y;
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
    if (gridState[y][x] && gridState[y][x] !== piece.id) return false;
  }
  return true;
}

function updateGridState() {
  gridState = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
  Object.entries(piecePositions).forEach(([pid, pos]) => {
    if (pos) {
      const piece = pieces.find(p => p.id === pid);
      piece.shape.forEach(offset => {
        const x = pos.x + offset.x;
        const y = pos.y + offset.y;
        gridState[y][x] = pid;
      });
    }
  });
}

function checkWin() {
  for (let y = 0; y < GRID_SIZE; y++)
    for (let x = 0; x < GRID_SIZE; x++)
      if (!gridState[y][x]) return;
  setTimeout(() => alert('Congratulations! You solved Dusk Til Gone!'), 100);
}

window.addEventListener('load', resetGame); 