// 中国象棋规则引擎
// 坐标系：board[row][col]，row 0=黑方底线（顶部），row 9=红方底线（底部）
// 棋子记号（FEN 风格）：
//   大写=红方  K帅 A仕 B相 N马 R车 C炮 P兵
//   小写=黑方  k将 a士 b象 n马 r车 c炮 p卒
const RULES = (function () {
  const ROWS = 10, COLS = 9;

  const PIECE_CHAR = {
    K: '帅', A: '仕', B: '相', N: '马', R: '车', C: '炮', P: '兵',
    k: '将', a: '士', b: '象', n: '马', r: '车', c: '炮', p: '卒',
  };

  function isUpper(ch) { return ch >= 'A' && ch <= 'Z'; }
  function isLower(ch) { return ch >= 'a' && ch <= 'z'; }
  function side(p) { return p ? (isUpper(p) ? 'r' : 'b') : null; }
  function inBoard(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
  function inPalace(s, r, c) {
    if (c < 3 || c > 5) return false;
    return s === 'r' ? (r >= 7 && r <= 9) : (r >= 0 && r <= 2);
  }
  function crossedRiver(s, r) {
    return s === 'r' ? r <= 4 : r >= 5;
  }
  function emptyBoard() {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
  }
  function cloneBoard(b) { return b.map(row => row.slice()); }

  // 生成某子的伪合法走法（未过滤己方被将军）
  function pieceMoves(board, r, c) {
    const p = board[r][c];
    if (!p) return [];
    const s = side(p);
    const type = p.toUpperCase();
    const out = [];

    switch (type) {
      case 'K': {
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          const nr = r + dr, nc = c + dc;
          if (!inBoard(nr, nc) || !inPalace(s, nr, nc)) continue;
          const tp = board[nr][nc];
          if (!tp || side(tp) !== s) out.push([nr, nc]);
        }
        break;
      }
      case 'A': {
        for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
          const nr = r + dr, nc = c + dc;
          if (!inBoard(nr, nc) || !inPalace(s, nr, nc)) continue;
          const tp = board[nr][nc];
          if (!tp || side(tp) !== s) out.push([nr, nc]);
        }
        break;
      }
      case 'B': {
        for (const [dr, dc] of [[-2,-2],[-2,2],[2,-2],[2,2]]) {
          const nr = r + dr, nc = c + dc;
          if (!inBoard(nr, nc)) continue;
          if (s === 'r' && nr < 5) continue;
          if (s === 'b' && nr > 4) continue;
          if (board[r + dr/2][c + dc/2]) continue; // 象眼塞住
          const tp = board[nr][nc];
          if (!tp || side(tp) !== s) out.push([nr, nc]);
        }
        break;
      }
      case 'N': {
        const candidates = [
          { dr: -2, dc: -1, leg: [-1, 0] },
          { dr: -2, dc:  1, leg: [-1, 0] },
          { dr:  2, dc: -1, leg: [ 1, 0] },
          { dr:  2, dc:  1, leg: [ 1, 0] },
          { dr: -1, dc: -2, leg: [ 0,-1] },
          { dr:  1, dc: -2, leg: [ 0,-1] },
          { dr: -1, dc:  2, leg: [ 0, 1] },
          { dr:  1, dc:  2, leg: [ 0, 1] },
        ];
        for (const m of candidates) {
          const nr = r + m.dr, nc = c + m.dc;
          if (!inBoard(nr, nc)) continue;
          if (board[r + m.leg[0]][c + m.leg[1]]) continue; // 蹩马腿
          const tp = board[nr][nc];
          if (!tp || side(tp) !== s) out.push([nr, nc]);
        }
        break;
      }
      case 'R': {
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          let nr = r + dr, nc = c + dc;
          while (inBoard(nr, nc)) {
            const tp = board[nr][nc];
            if (!tp) { out.push([nr, nc]); }
            else { if (side(tp) !== s) out.push([nr, nc]); break; }
            nr += dr; nc += dc;
          }
        }
        break;
      }
      case 'C': {
        for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
          let nr = r + dr, nc = c + dc;
          // 无炮架：走空格
          while (inBoard(nr, nc) && !board[nr][nc]) {
            out.push([nr, nc]);
            nr += dr; nc += dc;
          }
          if (!inBoard(nr, nc)) continue;
          // 越过炮架
          nr += dr; nc += dc;
          while (inBoard(nr, nc) && !board[nr][nc]) { nr += dr; nc += dc; }
          if (inBoard(nr, nc) && side(board[nr][nc]) !== s) out.push([nr, nc]);
        }
        break;
      }
      case 'P': {
        const forward = s === 'r' ? -1 : 1;
        const fr = r + forward, fc = c;
        if (inBoard(fr, fc)) {
          const tp = board[fr][fc];
          if (!tp || side(tp) !== s) out.push([fr, fc]);
        }
        if (crossedRiver(s, r)) {
          for (const dc of [-1, 1]) {
            const nc = c + dc;
            if (!inBoard(r, nc)) continue;
            const tp = board[r][nc];
            if (!tp || side(tp) !== s) out.push([r, nc]);
          }
        }
        break;
      }
    }
    return out;
  }

  function findKing(board, s) {
    const target = s === 'r' ? 'K' : 'k';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] === target) return [r, c];
      }
    }
    return null;
  }

  function kingsFacing(board) {
    const rk = findKing(board, 'r');
    const bk = findKing(board, 'b');
    if (!rk || !bk || rk[1] !== bk[1]) return false;
    const col = rk[1];
    for (let r = Math.min(rk[0], bk[0]) + 1; r < Math.max(rk[0], bk[0]); r++) {
      if (board[r][col]) return false;
    }
    return true;
  }

  // 检查 (r,c) 是否被 attackerSide 方"威胁吃子"。
  // 关键点：若目标格当前为空，需放一个敌方哨兵，再看走法是否包含该格。
  // 这样炮的"无炮架走空格"不会被误判为攻击。
  function isAttacked(board, r, c, attackerSide) {
    let work = board;
    if (!board[r][c]) {
      work = cloneBoard(board);
      work[r][c] = attackerSide === 'r' ? 'p' : 'P';
    }
    for (let i = 0; i < ROWS; i++) {
      for (let j = 0; j < COLS; j++) {
        const p = work[i][j];
        if (!p || side(p) !== attackerSide) continue;
        for (const [mr, mc] of pieceMoves(work, i, j)) {
          if (mr === r && mc === c) return true;
        }
      }
    }
    return false;
  }

  function isInCheck(board, s) {
    const k = findKing(board, s);
    if (!k) return true;
    const enemy = s === 'r' ? 'b' : 'r';
    return isAttacked(board, k[0], k[1], enemy) || kingsFacing(board);
  }

  function makeMove(board, from, to) {
    const nb = cloneBoard(board);
    nb[to[0]][to[1]] = nb[from[0]][from[1]];
    nb[from[0]][from[1]] = null;
    return nb;
  }

  function legalMoves(board, r, c) {
    const p = board[r][c];
    if (!p) return [];
    const s = side(p);
    return pieceMoves(board, r, c).filter(([nr, nc]) => {
      const nb = makeMove(board, [r, c], [nr, nc]);
      return !isInCheck(nb, s);
    });
  }

  function allLegalMoves(board, s) {
    const result = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = board[r][c];
        if (!p || side(p) !== s) continue;
        for (const to of legalMoves(board, r, c)) {
          result.push({ from: [r, c], to });
        }
      }
    }
    return result;
  }

  function isCheckmate(board, s) {
    return isInCheck(board, s) && allLegalMoves(board, s).length === 0;
  }

  // FEN 解析：rows 用 / 分隔，由顶部到底部；数字代表连续空格
  // 例：rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w
  function parseFen(fen) {
    const parts = fen.trim().split(/\s+/);
    const rows = parts[0].split('/');
    const board = emptyBoard();
    for (let r = 0; r < ROWS && r < rows.length; r++) {
      let c = 0;
      for (const ch of rows[r]) {
        if (/\d/.test(ch)) c += parseInt(ch, 10);
        else { board[r][c] = ch; c++; }
      }
    }
    return { board, sideToMove: parts[1] === 'b' ? 'b' : 'r' };
  }

  // 将位置转为中式记号文字辅助：仅返回简单坐标 "(r,c)"
  function posToStr(p) { return `(${p[0]},${p[1]})`; }

  return {
    ROWS, COLS, PIECE_CHAR,
    side, inBoard, inPalace,
    pieceMoves, legalMoves, allLegalMoves,
    isInCheck, isCheckmate,
    makeMove, parseFen, findKing, cloneBoard, posToStr,
  };
})();
