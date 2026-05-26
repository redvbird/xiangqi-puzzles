// 在 Node 中跑一次题库自检；通过把 rules / puzzles 注入到一个共享对象里运行
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { console };
vm.createContext(ctx);

function load(file) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8');
  vm.runInContext(code, ctx, { filename: file });
}

load('rules.js');
load('puzzles.js');

const r = ctx.verifyPuzzles();
console.log('总题数:', r.length);
let bad = 0;
for (const x of r) {
  console.log(`  ${x.ok ? '✓' : '✗'}  ${x.id}: ${x.reason}`);
  if (!x.ok) bad++;
}
console.log(bad === 0 ? '全部通过 ✓' : `${bad} 题未通过 ✗`);
process.exit(bad === 0 ? 0 : 1);
