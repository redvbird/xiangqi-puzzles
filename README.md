# 象棋杀棋练习 (Xiangqi Puzzles)

中国象棋杀棋练习应用，移动端优先的 Web App，无需安装、浏览器直接打开即可使用。

## 功能

- 内置题库：一步杀 / 两步杀 / 三步杀 / 多步杀
- 触摸友好的棋盘交互，选子高亮合法走法
- 提示、查看答案、自动演示
- 通关记录（localStorage）
- PWA 配置，可加到主屏当 App 使用

## 本地运行

```bash
python3 -m http.server 8000
# 然后浏览器打开 http://localhost:8000
```

手机访问局域网 IP 即可（同 Wi-Fi 下）。

## 题库自检

```bash
node scripts/verify.js
```

会跑一遍每道题的主线走法，确认最终为将杀局面。

## 扩充题库

在 [`js/puzzles.js`](js/puzzles.js) 的 `PUZZLES` 数组追加题目：

```js
{
  id: 'm1-04',
  title: '题目名',
  category: 1,                    // 1/2/3/'n'
  hint: '提示文本',
  fen: '...',                     // FEN 格式局面，红方在底
  mainLine: [
    { side: 'r', from: [r, c], to: [r, c] },
    { side: 'b', from: [r, c], to: [r, c] },
    ...
  ],
}
```

加完跑一次 `node scripts/verify.js` 验证。

## 项目结构

```
.
├── index.html              # 入口
├── manifest.webmanifest    # PWA 配置
├── css/style.css           # 移动端样式
├── js/
│   ├── rules.js            # 象棋规则引擎
│   ├── puzzles.js          # 题库 + 自检
│   ├── board.js            # 棋盘渲染与交互
│   └── app.js              # 主流程
└── scripts/verify.js       # Node 自检脚本
```

## 坐标与 FEN 约定

- 内部表示 `board[row][col]`：`row=0` 为顶端（黑方底线），`row=9` 为红方底线
- FEN 行序由顶到底，以 `/` 分隔；数字代表连续空格
- 棋子记号：大写 = 红方，小写 = 黑方
  - K/k 帅将, A/a 仕士, B/b 相象, N/n 马, R/r 车, C/c 炮, P/p 兵卒
