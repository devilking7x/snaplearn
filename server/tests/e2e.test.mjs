// SnapLearn E2E tests (plain JS) — run: node tests/e2e.test.mjs
const BASE = process.env.TEST_URL || 'http://localhost:3001';
let pass = 0, fail = 0;

async function post(path, body, isForm = false) {
  const opts = { method: 'POST' };
  if (isForm) opts.body = body;
  else { opts.headers = { 'Content-Type': 'application/json' }; opts.body = JSON.stringify(body); }
  const r = await fetch(BASE + path, opts);
  return { status: r.status, json: await r.json().catch(() => ({})) };
}
function ok(name, cond) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ FAIL: ${name}`); }
}

const health = await (await fetch(BASE + '/api/health')).json();
ok('health check', health.ok && health.service === 'snaplearn');

// missing image → 400
let r = await post('/api/analyze', new FormData(), true);
ok('missing image → 400', r.status === 400);

// analyze en
let fd = new FormData();
fd.append('image', new Blob([Buffer.from('x')], { type: 'image/jpeg' }), 'd.jpg');
fd.append('lang', 'en');
r = await post('/api/analyze', fd, true);
ok('analyze en: topic+explanation', r.status === 200 && r.json.topic && r.json.explanation.en && r.json.explanation.hi);
ok('analyze en: keyPoints≥3', r.json.keyPoints?.length >= 3);
ok('analyze en: labels≥3', r.json.diagramLabels?.length >= 3);

// analyze hi
fd = new FormData();
fd.append('image', new Blob([Buffer.from('x')], { type: 'image/jpeg' }), 'd.jpg');
fd.append('lang', 'hi');
r = await post('/api/analyze', fd, true);
ok('analyze hi ok', r.status === 200 && r.json.keyPoints?.length >= 3);

// quiz
r = await post('/api/quiz', { topic: 't', lang: 'en' });
ok('quiz: 3 valid questions', r.status === 200 && r.json.quiz?.length === 3 &&
  r.json.quiz.every(q => q.question && q.options.length === 4 && q.answer >= 0 && q.answer < 4));

// flashcards
r = await post('/api/flashcards', { topic: 't', lang: 'hi' });
ok('flashcards: 4 valid cards', r.status === 200 && r.json.cards?.length === 4 &&
  r.json.cards.every(c => c.front && c.back));

// ask
r = await post('/api/ask', { question: 'What is this?', topic: 'Bio', lang: 'en' });
ok('ask: answer received', r.status === 200 && r.json.answer?.length > 20);

// empty question → 400
r = await post('/api/ask', { question: '', topic: 'x', lang: 'en' });
ok('empty question → 400', r.status === 400);

// oversized → rejected
fd = new FormData();
fd.append('image', new Blob([Buffer.alloc(9 * 1024 * 1024)], { type: 'image/jpeg' }), 'big.jpg');
const rr = await fetch(BASE + '/api/analyze', { method: 'POST', body: fd });
ok('oversized 9MB rejected', rr.status >= 400);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
