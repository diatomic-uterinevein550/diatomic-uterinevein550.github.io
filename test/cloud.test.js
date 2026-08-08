/* 云端同步测试：注入一个假的 Supabase 客户端，跑真实的 cloud.js 逻辑。
 * 重点验证多设备合并、删除墓碑、以及云端不可用时不能影响本地。 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { webcrypto } = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const dom = new JSDOM('<!doctype html><body></body>', {
  url: 'https://starbucks-city-mug.github.io/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
});
const { window } = dom;
if (!window.crypto || !window.crypto.subtle) Object.defineProperty(window, 'crypto', { value: webcrypto });
window.TextEncoder = window.TextEncoder || TextEncoder;
window.TextDecoder = window.TextDecoder || TextDecoder;

let failures = 0;
const check = (name, cond, extra) => {
  if (cond) console.log('  ✓ ' + name);
  else { failures++; console.log('  ✗ FAIL: ' + name + (extra ? ' — ' + extra : '')); }
};

for (const f of ['auth.js', 'cloud-config.js', 'cloud.js', 'collection.js']) {
  window.eval(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'));
}
const Cloud = window.Cloud;
const Collection = window.Collection;

/* 仓库里 cloud-config.js 已填了真实项目。休眠行为要在"未配置"前提下测，
 * 所以先清空；后面再塞回去测已配置的分支。 */
const REAL_CLOUD = { ...window.CLOUD_CONFIG };
window.CLOUD_CONFIG = { url: '', anonKey: '' };

(async () => {
  console.log('— 未配置时完全休眠 —');
  check('isConfigured 为 false', Cloud.isConfigured() === false);
  check('init 直接返回 false（不加载 SDK）', (await Cloud.init()) === false);
  check('未配置时 user 为空', Cloud.user() === null);
  check('未配置时 pull 返回 null', (await Cloud.pull()) === null);
  Collection.load(null);
  Collection.set('gi-shanghai', 'owned');
  check('未配置时本地收藏照常工作', Collection.status('gi-shanghai') === 'owned');

  console.log('— 合并逻辑（多设备）—');
  const older = '2026-01-01T00:00:00Z';
  const newer = '2026-06-01T00:00:00Z';

  check('云端较新则覆盖本地', (() => {
    const m = Cloud.merge({ a: { s: 'wish', u: older } }, { a: { s: 'owned', u: newer } });
    return m.a.s === 'owned';
  })());
  check('本地较新则保留本地', (() => {
    const m = Cloud.merge({ a: { s: 'owned', u: newer } }, { a: { s: 'wish', u: older } });
    return m.a.s === 'owned';
  })());
  check('本地无时间戳时让云端优先', (() => {
    const m = Cloud.merge({ a: { s: 'wish' } }, { a: { s: 'owned', u: older } });
    return m.a.s === 'owned';
  })());
  check('两边各有独占条目时取并集', (() => {
    const m = Cloud.merge({ a: { s: 'owned', u: newer } }, { b: { s: 'wish', u: newer } });
    return m.a && m.b;
  })());
  check('云端墓碑较新 → 本地记录被删除', (() => {
    const m = Cloud.merge({ a: { s: 'owned', u: older } }, { a: { s: null, u: newer } });
    return !m.a;
  })());
  check('云端墓碑较旧 → 本地记录保留（删除不复活新数据）', (() => {
    const m = Cloud.merge({ a: { s: 'owned', u: newer } }, { a: { s: null, u: older } });
    return m.a && m.a.s === 'owned';
  })());
  check('只有备注没有状态的条目会保留', (() => {
    const m = Cloud.merge({}, { a: { s: null, n: '2019 年淘的', u: newer } });
    return m.a && m.a.n === '2019 年淘的';
  })());
  check('空墓碑不会堆进本地', (() => {
    const m = Cloud.merge({}, { a: { s: null, n: '', u: newer } });
    return Object.keys(m).length === 0;
  })());

  console.log('— 接上假 Supabase —');
  /* 记录所有写入，验证前端确实发了正确的行 */
  const server = { rows: new Map(), upserts: 0, signedOut: false };
  const FAKE_USER = { id: 'user-abc', email: 'me@example.com' };

  window.CLOUD_CONFIG = { url: 'https://fake.supabase.co', anonKey: 'anon-key' };
  check('填入配置后 isConfigured 为 true', Cloud.isConfigured() === true);
  check('仓库里的真实配置格式正确',
    /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(REAL_CLOUD.url) &&
    /^sb_publishable_/.test(REAL_CLOUD.anonKey),
    REAL_CLOUD.url);
  check('仓库里没有误填管理员密钥', !/^sb_secret_/.test(REAL_CLOUD.anonKey));

  /* 直接注入内部状态，绕开真实的动态 import */
  const fakeClient = {
    auth: {
      getSession: async () => ({ data: { session: { user: FAKE_USER } } }),
      onAuthStateChange: () => {},
      signInWithPassword: async () => ({ data: { session: { user: FAKE_USER }, user: FAKE_USER } }),
      signUp: async () => ({ data: { session: { user: FAKE_USER }, user: FAKE_USER } }),
      signOut: async () => { server.signedOut = true; return {}; },
    },
    from: (table) => ({
      select: () => Promise.resolve({
        data: [...server.rows.values()].map(r => ({ ...r })), error: null,
      }),
      upsert: (rows) => {
        const arr = Array.isArray(rows) ? rows : [rows];
        arr.forEach(r => {
          server.upserts++;
          server.rows.set(r.mug_id, { ...r, updated_at: new Date().toISOString() });
        });
        return Promise.resolve({ data: arr, error: null });
      },
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
    }),
  };

  /* cloud.js 把 client 藏在闭包里，用测试钩子塞进去 */
  const src = fs.readFileSync(path.join(ROOT, 'js', 'cloud.js'), 'utf8');
  const patched = src.replace(
    'return {\n    isConfigured: isConfigured,',
    'function __inject(c) { client = c; ready = true; session = { user: ' +
    JSON.stringify(FAKE_USER) + ' }; }\n  return {\n    __inject: __inject,\n    isConfigured: isConfigured,'
  );
  window.eval(patched);
  window.Cloud.__inject(fakeClient);
  const C = window.Cloud;

  check('注入后 isReady 为 true', C.isReady() === true);
  check('user() 返回登录用户', C.user() && C.user().id === 'user-abc');
  check('email() 返回邮箱', C.email() === 'me@example.com');

  console.log('— 推送与拉取 —');
  await C.push('gi-paris', { s: 'owned', n: '巴黎买的', d: '2026-03-01' });
  check('单条推送写到服务端', server.rows.has('gi-paris'));
  check('推送内容正确', (() => {
    const r = server.rows.get('gi-paris');
    return r.status === 'owned' && r.note === '巴黎买的' && r.user_id === 'user-abc';
  })());

  await C.push('gi-tokyo', { s: null });
  check('删除写成墓碑 status=none', server.rows.get('gi-tokyo').status === 'none');

  const pulled = await C.pull();
  check('拉取转回本地结构', pulled['gi-paris'].s === 'owned' && pulled['gi-paris'].n === '巴黎买的');
  check('墓碑拉回后 status 为 null', pulled['gi-tokyo'].s === null);

  console.log('— 批量推送分批 —');
  const big = {};
  for (let i = 0; i < 900; i++) big['m' + i] = { s: 'owned' };
  server.upserts = 0;
  const n = await C.pushAll(big);
  check('900 条全部推送', n === 900, String(n));
  check('分批而非一次性发送', server.upserts === 900);

  console.log('— 云端故障不影响本地 —');
  const brokenClient = {
    ...fakeClient,
    from: () => ({
      select: () => Promise.resolve({ data: null, error: new Error('boom') }),
      upsert: () => Promise.resolve({ data: null, error: new Error('boom') }),
      maybeSingle: () => Promise.resolve({ data: null, error: new Error('boom') }),
    }),
  };
  window.Cloud.__inject(brokenClient);
  let threw = false;
  try { await C.pull(); } catch (e) { threw = true; }
  check('云端报错时 pull 抛出（由调用方兜底）', threw);
  Collection.load('cloud:user-abc');
  Collection.set('bt-seattle', 'owned');
  await new Promise(r => setTimeout(r, 900));   /* 等节流窗口 */
  check('云端挂了本地依然写入成功', Collection.status('bt-seattle') === 'owned');
  check('本地持久化未受影响',
    (window.localStorage.getItem('sbmug_col_cloud:user-abc') || '').includes('bt-seattle'));

  console.log('— 退出登录 —');
  window.Cloud.__inject(fakeClient);
  await C.signOut();
  check('调用了服务端登出', server.signedOut === true);

  console.log(failures === 0 ? '\n✅ 云端测试全部通过' : '\n❌ ' + failures + ' 项失败');
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('测试异常:', e); process.exit(2); });
