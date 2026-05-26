// 内置杀棋题库
// category: 1=一步杀, 2=两步杀, 3=三步杀, 'n'=多步杀
// fen: 局面，行用 / 分隔，由顶部（黑方）到底部（红方）
// sideToMove: 谁先走（红方'r'/黑方'b'），约定题目都是红先
// mainLine: 主线走法，红黑交替；最后一步必须由红方将杀

const PUZZLES = [
  // ===================== 一步杀 =====================
  {
    id: 'm1-01',
    title: '闷宫马后炮',
    category: 1,
    hint: '红炮平移一格，借马为架直射黑将。',
    fen: '4k4/3a1a3/4N4/9/3C5/9/9/9/9/3K5 w',
    mainLine: [
      { side: 'r', from: [4, 3], to: [4, 4] },
    ],
  },
  {
    id: 'm1-02',
    title: '双马拱士',
    category: 1,
    hint: '红车一路杀入中宫，吃掉守护的黑士。',
    fen: '4k4/4a4/2N3N2/9/9/9/9/4R4/9/3K5 w',
    mainLine: [
      { side: 'r', from: [7, 4], to: [1, 4] },
    ],
  },
  {
    id: 'm1-03',
    title: '车马同心',
    category: 1,
    hint: '红车沿邻线沉底，右侧之马已埋伏好。',
    fen: '4k4/4a4/5RN2/9/9/9/9/9/9/4K4 w',
    mainLine: [
      { side: 'r', from: [2, 5], to: [0, 5] },
    ],
  },

  // ===================== 两步杀 =====================
  {
    id: 'm2-01',
    title: '兵线开路',
    category: 2,
    hint: '先把挡路的黑卒吃掉，再深入吃士。',
    fen: '4k4/4a4/2N3N2/4p4/9/9/9/4R3p/9/3K5 w',
    mainLine: [
      { side: 'r', from: [7, 4], to: [3, 4] },
      { side: 'b', from: [7, 8], to: [8, 8] },
      { side: 'r', from: [3, 4], to: [1, 4] },
    ],
  },

  // ===================== 三步杀 =====================
  {
    id: 'm3-01',
    title: '层层推进',
    category: 3,
    hint: '红车顺中路连下三层卒，逼士入瓮。',
    fen: '4k4/3apa3/2N1p1N2/4p4/9/9/9/4R3p/9/3K5 w',
    mainLine: [
      { side: 'r', from: [7, 4], to: [3, 4] },
      { side: 'b', from: [7, 8], to: [8, 8] },
      { side: 'r', from: [3, 4], to: [2, 4] },
      { side: 'b', from: [8, 8], to: [9, 8] },
      { side: 'r', from: [2, 4], to: [1, 4] },
    ],
  },

  // ===================== 多步杀 =====================
  {
    id: 'mN-01',
    title: '中路突击',
    category: 'n',
    hint: '红车连吃四个挡子，一路推平到底。',
    fen: '4k4/3apa3/2N1p1N2/4p4/4p4/9/9/4R3p/8p/3K5 w',
    mainLine: [
      { side: 'r', from: [7, 4], to: [4, 4] },
      { side: 'b', from: [7, 8], to: [7, 7] },
      { side: 'r', from: [4, 4], to: [3, 4] },
      { side: 'b', from: [7, 7], to: [7, 6] },
      { side: 'r', from: [3, 4], to: [2, 4] },
      { side: 'b', from: [8, 8], to: [8, 7] },
      { side: 'r', from: [2, 4], to: [1, 4] },
    ],
  },
];

// 按分类标签返回中文描述
const CATEGORY_LABEL = {
  1: '一步杀',
  2: '两步杀',
  3: '三步杀',
  'n': '多步杀',
};

// 自检：跑一遍每个题目主线，确认最后局面是黑被将死
function verifyPuzzles() {
  const results = [];
  for (const p of PUZZLES) {
    try {
      let { board } = RULES.parseFen(p.fen);
      let ok = true;
      for (const step of p.mainLine) {
        const legal = RULES.legalMoves(board, step.from[0], step.from[1]);
        const found = legal.some(([r, c]) => r === step.to[0] && c === step.to[1]);
        if (!found) { ok = false; break; }
        board = RULES.makeMove(board, step.from, step.to);
      }
      const mate = ok && RULES.isCheckmate(board, 'b');
      results.push({ id: p.id, ok: mate, reason: ok ? (mate ? 'mate' : 'no mate') : 'illegal move' });
    } catch (e) {
      results.push({ id: p.id, ok: false, reason: e.message });
    }
  }
  return results;
}
