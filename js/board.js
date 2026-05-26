// 棋盘渲染与触摸交互
const BoardView = (function () {
  const ROWS = 10, COLS = 9;
  let container = null;
  let gridSvg = null;
  let squares = [];           // [r][c] -> 格子 DOM
  let pieces = [];            // [r][c] -> 棋子 DOM 或 null
  let selected = null;        // [r, c] | null
  let lastMove = null;        // {from, to} | null
  let hints = [];             // [[r,c], ...]
  let onTap = null;           // (r, c) => void

  function init(el, onTapHandler) {
    container = el;
    onTap = onTapHandler;
    container.innerHTML = '';
    renderGrid();
    renderSquares();
  }

  // 绘制棋盘线、河界、九宫线
  function renderGrid() {
    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.classList.add('grid');
    svg.setAttribute('viewBox', '0 0 900 1000');
    svg.setAttribute('preserveAspectRatio', 'none');

    const ux = 100, uy = 100; // 每格像素（viewBox 单位）
    const ox = 50, oy = 50;   // 左/上偏移（让线和棋子格中心对齐）

    function line(x1, y1, x2, y2, w = 2) {
      const l = document.createElementNS(svgNs, 'line');
      l.setAttribute('x1', x1); l.setAttribute('y1', y1);
      l.setAttribute('x2', x2); l.setAttribute('y2', y2);
      l.setAttribute('stroke', '#5e2c08');
      l.setAttribute('stroke-width', w);
      svg.appendChild(l);
    }

    // 横线 10 条
    for (let r = 0; r < ROWS; r++) {
      line(ox, oy + r * uy, ox + (COLS - 1) * ux, oy + r * uy);
    }
    // 竖线：边线整通；中间 7 条仅画到河两岸
    for (let c = 0; c < COLS; c++) {
      if (c === 0 || c === COLS - 1) {
        line(ox + c * ux, oy, ox + c * ux, oy + (ROWS - 1) * uy);
      } else {
        line(ox + c * ux, oy, ox + c * ux, oy + 4 * uy);
        line(ox + c * ux, oy + 5 * uy, ox + c * ux, oy + (ROWS - 1) * uy);
      }
    }
    // 九宫斜线（黑方）
    line(ox + 3 * ux, oy + 0 * uy, ox + 5 * ux, oy + 2 * uy);
    line(ox + 5 * ux, oy + 0 * uy, ox + 3 * ux, oy + 2 * uy);
    // 九宫斜线（红方）
    line(ox + 3 * ux, oy + 7 * uy, ox + 5 * ux, oy + 9 * uy);
    line(ox + 5 * ux, oy + 7 * uy, ox + 3 * ux, oy + 9 * uy);

    // 河界文字
    const t1 = document.createElementNS(svgNs, 'text');
    t1.setAttribute('x', ox + 1.5 * ux);
    t1.setAttribute('y', oy + 4.7 * uy);
    t1.setAttribute('fill', '#7a3b0c');
    t1.setAttribute('font-size', '50');
    t1.setAttribute('font-family', 'serif');
    t1.setAttribute('text-anchor', 'middle');
    t1.textContent = '楚 河';
    svg.appendChild(t1);
    const t2 = document.createElementNS(svgNs, 'text');
    t2.setAttribute('x', ox + 6.5 * ux);
    t2.setAttribute('y', oy + 4.7 * uy);
    t2.setAttribute('fill', '#7a3b0c');
    t2.setAttribute('font-size', '50');
    t2.setAttribute('font-family', 'serif');
    t2.setAttribute('text-anchor', 'middle');
    t2.textContent = '汉 界';
    svg.appendChild(t2);

    container.appendChild(svg);
    gridSvg = svg;
  }

  // 每格一个 div，便于绑定点击与放置棋子
  function renderSquares() {
    squares = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
    pieces = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const sq = document.createElement('div');
        sq.className = 'square';
        // 让格子中心对应棋点：每格宽 1/9，高 1/10；偏移使中心落在线的交点
        sq.style.left = `calc(${c} * (100% / 9) - (100% / 18))`;
        sq.style.top = `calc(${r} * (100% / 10) - (100% / 20))`;
        sq.style.width = `calc(100% / 9)`;
        sq.style.height = `calc(100% / 10)`;
        sq.addEventListener('click', () => onTap && onTap(r, c));
        container.appendChild(sq);
        squares[r][c] = sq;
      }
    }
  }

  function clearPieces() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (pieces[r][c]) {
          pieces[r][c].remove();
          pieces[r][c] = null;
        }
      }
    }
  }

  function placePiece(r, c, ch) {
    const el = document.createElement('div');
    el.className = 'piece ' + (ch === ch.toUpperCase() ? 'red' : 'black');
    el.textContent = RULES.PIECE_CHAR[ch] || ch;
    squares[r][c].appendChild(el);
    pieces[r][c] = el;
  }

  function render(board) {
    clearPieces();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = board[r][c];
        if (ch) placePiece(r, c, ch);
      }
    }
    refreshDecorations();
  }

  function refreshDecorations() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const sq = squares[r][c];
        sq.classList.remove('selected', 'hint', 'last', 'has-piece');
      }
    }
    if (selected) squares[selected[0]][selected[1]].classList.add('selected');
    if (lastMove) {
      squares[lastMove.from[0]][lastMove.from[1]].classList.add('last');
      squares[lastMove.to[0]][lastMove.to[1]].classList.add('last');
    }
    for (const [r, c] of hints) {
      squares[r][c].classList.add('hint');
      if (pieces[r][c]) squares[r][c].classList.add('has-piece');
    }
  }

  function setSelected(pos) { selected = pos; refreshDecorations(); }
  function setHints(positions) { hints = positions || []; refreshDecorations(); }
  function setLastMove(from, to) { lastMove = from && to ? { from, to } : null; refreshDecorations(); }

  return { init, render, setSelected, setHints, setLastMove };
})();
