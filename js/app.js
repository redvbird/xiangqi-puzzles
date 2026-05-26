// 主程序：列表 / 练习 / 解答流程
(function () {
  const STORAGE_KEY = 'xq-puzzle-solved';

  let solved = loadSolved();
  let currentFilter = 'all';

  // 当前练习状态
  let state = null;

  function loadSolved() {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
    catch { return new Set(); }
  }
  function saveSolved() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...solved])); } catch {}
  }

  // ---------- 列表页 ----------
  function renderList() {
    const list = document.getElementById('puzzle-list');
    list.innerHTML = '';
    const filtered = PUZZLES.filter(p => {
      if (currentFilter === 'all') return true;
      return String(p.category) === currentFilter;
    });
    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;padding:32px;color:#7a3b0c;opacity:0.6;font-size:14px;';
      empty.textContent = '该分类暂无题目，敬请期待';
      list.appendChild(empty);
      return;
    }
    filtered.forEach((p, idx) => {
      const card = document.createElement('div');
      card.className = 'puzzle-card' + (solved.has(p.id) ? ' solved' : '');
      card.innerHTML = `
        <div class="pcard-no">${idx + 1}</div>
        <div class="pcard-main">
          <div class="pcard-name">${p.title}</div>
          <div class="pcard-desc">${CATEGORY_LABEL[p.category]} · 红先 · ${solved.has(p.id) ? '已通过' : '点击挑战'}</div>
        </div>
        <div class="pcard-tag">${CATEGORY_LABEL[p.category]}</div>
      `;
      card.addEventListener('click', () => openPuzzle(p));
      list.appendChild(card);
    });
  }

  function setupCategoryTabs() {
    const tabs = document.querySelectorAll('#category-tabs .tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.cat;
        renderList();
      });
    });
  }

  // ---------- 练习页 ----------
  function openPuzzle(puzzle) {
    const { board } = RULES.parseFen(puzzle.fen);
    state = {
      puzzle,
      board,
      step: 0,                  // mainLine 中下一步索引
      finished: false,
      selectedFrom: null,
      revealedAnswer: false,
    };
    document.getElementById('puzzle-title').textContent = puzzle.title;
    const total = puzzle.mainLine.filter(s => s.side === 'r').length;
    document.getElementById('puzzle-meta').textContent =
      `${CATEGORY_LABEL[puzzle.category]} · 红先 · 共 ${total} 步`;
    showPage('page-puzzle');
    BoardView.init(document.getElementById('board'), handleTap);
    BoardView.render(state.board);
    BoardView.setLastMove(null, null);
    setStatus('请走红方棋子', '');
  }

  function setStatus(text, type) {
    const bar = document.getElementById('status-bar');
    bar.textContent = text;
    bar.className = 'status-bar' + (type ? ' ' + type : '');
  }

  function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  function handleTap(r, c) {
    if (!state || state.finished) return;
    const expected = state.puzzle.mainLine[state.step];
    if (!expected || expected.side !== 'r') return; // 不是红方走棋

    const piece = state.board[r][c];

    if (state.selectedFrom) {
      // 第二次点击 = 落子位置
      const [fr, fc] = state.selectedFrom;
      // 同色棋子：改选
      if (piece && RULES.side(piece) === 'r') {
        state.selectedFrom = [r, c];
        BoardView.setSelected([r, c]);
        BoardView.setHints(RULES.legalMoves(state.board, r, c));
        return;
      }
      const moves = RULES.legalMoves(state.board, fr, fc);
      const ok = moves.some(([mr, mc]) => mr === r && mc === c);
      if (!ok) {
        // 非法走法：取消选择
        state.selectedFrom = null;
        BoardView.setSelected(null);
        BoardView.setHints([]);
        return;
      }
      tryRedMove([fr, fc], [r, c]);
    } else {
      // 第一次点击 = 选子
      if (!piece || RULES.side(piece) !== 'r') return;
      state.selectedFrom = [r, c];
      BoardView.setSelected([r, c]);
      BoardView.setHints(RULES.legalMoves(state.board, r, c));
    }
  }

  function tryRedMove(from, to) {
    const expected = state.puzzle.mainLine[state.step];
    const isMainLine =
      from[0] === expected.from[0] && from[1] === expected.from[1] &&
      to[0] === expected.to[0] && to[1] === expected.to[1];

    if (!isMainLine) {
      // 若不是主线，但走完后达成将死，也算成功（适用于一步杀有多解）
      const nb = RULES.makeMove(state.board, from, to);
      if (RULES.isCheckmate(nb, 'b')) {
        applyMove(from, to, true);
        finishWin();
        return;
      }
      // 否则：拒绝并提示
      state.selectedFrom = null;
      BoardView.setSelected(null);
      BoardView.setHints([]);
      setStatus('这步不是最佳着法，再想想', 'error');
      return;
    }

    applyMove(from, to);
    state.step += 1;

    // 检查是否已完成
    if (state.step >= state.puzzle.mainLine.length) {
      if (RULES.isCheckmate(state.board, 'b')) {
        finishWin();
      } else {
        setStatus('走完所有步骤但未将杀，可查看答案', 'error');
      }
      return;
    }

    // 自动播放黑方主线回应
    const next = state.puzzle.mainLine[state.step];
    if (next.side === 'b') {
      setStatus('黑方应对中…', '');
      setTimeout(() => {
        applyMove(next.from, next.to);
        state.step += 1;
        if (state.step >= state.puzzle.mainLine.length) {
          if (RULES.isCheckmate(state.board, 'b')) finishWin();
          else setStatus('走完所有步骤但未将杀', 'error');
        } else {
          setStatus('继续走红方', '');
        }
      }, 450);
    }
  }

  function applyMove(from, to) {
    state.board = RULES.makeMove(state.board, from, to);
    BoardView.render(state.board);
    BoardView.setLastMove(from, to);
    BoardView.setSelected(null);
    BoardView.setHints([]);
    state.selectedFrom = null;
  }

  function finishWin() {
    state.finished = true;
    if (!state.revealedAnswer) {
      solved.add(state.puzzle.id);
      saveSolved();
    }
    setStatus('将杀成功！点击「下一题」继续', 'success');
  }

  // ---------- 操作按钮 ----------
  function setupActions() {
    document.getElementById('btn-back').addEventListener('click', () => {
      showPage('page-list');
      renderList();
    });
    document.getElementById('btn-restart').addEventListener('click', () => {
      if (state) openPuzzle(state.puzzle);
    });
    document.getElementById('btn-hint').addEventListener('click', () => {
      if (!state || state.finished) return;
      const expected = state.puzzle.mainLine[state.step];
      if (!expected || expected.side !== 'r') return;
      BoardView.setSelected(expected.from);
      BoardView.setHints([expected.to]);
      setStatus('提示：' + state.puzzle.hint, 'hint');
    });
    document.getElementById('btn-answer').addEventListener('click', () => {
      if (!state) return;
      state.revealedAnswer = true;
      // 自动播放完整解答
      playSolution();
    });
    document.getElementById('btn-next').addEventListener('click', () => {
      if (!state) return;
      const idx = PUZZLES.findIndex(p => p.id === state.puzzle.id);
      // 在当前过滤下找下一题
      const filtered = currentFilter === 'all'
        ? PUZZLES
        : PUZZLES.filter(p => String(p.category) === currentFilter);
      const curInFiltered = filtered.findIndex(p => p.id === state.puzzle.id);
      if (curInFiltered === -1) { showPage('page-list'); renderList(); return; }
      const next = filtered[(curInFiltered + 1) % filtered.length];
      openPuzzle(next);
    });
  }

  function playSolution() {
    // 重置局面，从第一步开始演示
    const { board } = RULES.parseFen(state.puzzle.fen);
    state.board = board;
    state.step = 0;
    state.finished = false;
    state.selectedFrom = null;
    BoardView.render(state.board);
    BoardView.setLastMove(null, null);
    BoardView.setHints([]);
    setStatus('演示中…', 'hint');

    const line = state.puzzle.mainLine.slice();
    let i = 0;
    const tick = () => {
      if (i >= line.length) {
        if (RULES.isCheckmate(state.board, 'b')) {
          setStatus('演示完毕：将杀！', 'success');
          state.finished = true;
        } else {
          setStatus('演示完毕', '');
        }
        return;
      }
      const m = line[i++];
      state.board = RULES.makeMove(state.board, m.from, m.to);
      BoardView.render(state.board);
      BoardView.setLastMove(m.from, m.to);
      setTimeout(tick, 700);
    };
    setTimeout(tick, 500);
  }

  // ---------- 启动 ----------
  function start() {
    // 自检题库（开发期间排错用，控制台可见）
    try {
      const r = verifyPuzzles();
      const bad = r.filter(x => !x.ok);
      if (bad.length) console.warn('[puzzle-self-check] 异常题目：', bad);
      else console.log('[puzzle-self-check] 全部 %d 题主线均成立将杀', r.length);
    } catch (e) {
      console.warn('自检失败', e);
    }

    setupCategoryTabs();
    setupActions();
    renderList();

    // 注册 service worker 不做（保持轻量），仅声明 manifest
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
