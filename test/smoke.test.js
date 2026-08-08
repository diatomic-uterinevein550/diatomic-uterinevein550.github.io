/* 无头冒烟测试：加载 index.html + 全部 JS（不加载 Leaflet，走离线降级路径）。
 * 覆盖：启动、筛选（新芯片交互）、中英切换、图鉴、详情+外链、账号、收藏、
 * 导入导出、分享编解码、只读模式守卫、统计、SVG 渲染。计数从数据推导。 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { webcrypto } = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const dom = new JSDOM(html, {
  url: 'https://example.github.io/starbucks-city-mugs/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
});
const { window } = dom;

if (!window.crypto || !window.crypto.subtle) {
  Object.defineProperty(window, 'crypto', { value: webcrypto });
}
if (!window.TextEncoder) window.TextEncoder = TextEncoder;
if (!window.TextDecoder) window.TextDecoder = TextDecoder;
window.URL.createObjectURL = () => 'blob:fake';
window.URL.revokeObjectURL = () => {};

let failures = 0;
function check(name, cond, extra) {
  if (cond) console.log('  ✓ ' + name);
  else { failures++; console.log('  ✗ FAIL: ' + name + (extra ? ' — ' + extra : '')); }
}

for (const f of ['data.js', 'photos-index.js', 'placeArt.js', 'mugArt.js', 'cloud-config.js', 'cloud.js', 'auth.js', 'i18n.js', 'photos.js', 'collection.js', 'map.js', 'app.js']) {
  const code = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
  try { window.eval(code); }
  catch (e) { check('load ' + f, false, e.message); }
}

const $ = (id) => window.document.getElementById(id);
const q = (sel) => window.document.querySelector(sel);
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const input = (el, v) => { el.value = v; el.dispatchEvent(new window.Event('input', { bubbles: true })); };
const search = async (v) => { input($('f-search'), v); await new Promise(r => setTimeout(r, 260)); };
const change = (el, v) => { el.value = v; el.dispatchEvent(new window.Event('change', { bubbles: true })); };
const cnt = (fn) => window.MUG_DATA.filter(fn).length;

(async () => {
  const M = window.MUG_DATA;
  const N = M.length;
  const N_ORN = cnt(m => m.type === 'ornament');
  const N_GI = cnt(m => m.series === 'global-icon');
  const N_YAH = cnt(m => m.series === 'you-are-here');
  const N_ASIA = cnt(m => m.region === 'asia');
  const N_CN = cnt(m => m.country === 'China');

  console.log('— 启动 —');
  check('数据集非空 (' + N + ' 款)', N >= 2000);
  check('地图离线降级提示', $('map').textContent.length > 5);
  check('结果计数', $('result-count').textContent.includes(N + ' ') || $('result-count').textContent.includes('/ ' + N), $('result-count').textContent);
  check('国家下拉已填充', $('f-country').options.length > 40, $('f-country').options.length + ' options');
  check('游客身份显示', $('user-chip').textContent.includes('游客'));

  console.log('— 图鉴与筛选（新芯片交互） —');
  click(q('[data-view="gallery"]'));
  const PAGE = 120;
  const firstPage = (n) => Math.min(PAGE, n);
  check('图鉴首屏渲染 ' + firstPage(N) + ' 张', $('gallery-grid').children.length === firstPage(N), $('gallery-grid').children.length);
  check('剩余可加载', $('gallery-more').hidden === (N <= PAGE));
  check('卡片含 SVG 插画', $('gallery-grid').querySelector('svg') !== null);

  await search('上海');
  const nSh = cnt(m => (m.cityZh||'').includes('上海'));
  check('搜索「上海」= ' + nSh, $('result-count').textContent.includes(String(nSh)), $('result-count').textContent);
  await search('');

  /* 全选状态下点挂饰 = 只看挂饰 */
  click(q('[data-value="ornament"]'));
  check('点「挂饰」只看挂饰 = ' + N_ORN, $('result-count').textContent.includes(String(N_ORN)), $('result-count').textContent);
  click(q('[data-value="ornament"]'));
  check('再点一次恢复全部', $('result-count').textContent.includes(String(N)));
  click(q('[data-value="global-icon"]'));
  check('点 Global Icon 只看 GI = ' + N_GI, $('result-count').textContent.includes(String(N_GI)), $('result-count').textContent);
  click(q('[data-value="you-are-here"]'));
  check('再点 YAH 追加 = ' + (N_GI + N_YAH), $('result-count').textContent.includes(String(N_GI + N_YAH)), $('result-count').textContent);
  click(q('[data-value="global-icon"]'));
  check('取消 GI 剩 YAH = ' + N_YAH, $('result-count').textContent.includes(String(N_YAH)));
  click(q('[data-value="you-are-here"]'));
  check('取消最后一个自动恢复全选', $('result-count').textContent.includes(String(N)));

  change($('f-region'), 'asia');
  check('亚洲过滤 = ' + N_ASIA, $('result-count').textContent.includes(String(N_ASIA)), $('result-count').textContent);
  change($('f-country'), 'China');
  check('中国过滤 = ' + N_CN, $('result-count').textContent.includes(String(N_CN)), $('result-count').textContent);
  click(q('[data-action="reset-filters"]'));
  check('重置筛选恢复全部', $('result-count').textContent.includes(String(N)));

  /* 空结果状态：地图空态覆盖层 + 图鉴空态 */
  await search('zzzz不存在的城市zzzz');
  check('无结果时地图显示空态提示', !$('map-empty').hidden);
  check('无结果时图鉴显示空态提示', !$('gallery-empty').hidden);
  await search('');
  check('恢复后空态隐藏', $('map-empty').hidden);

  console.log('— 中英文切换 —');
  click($('btn-lang'));
  check('html lang 切到 en', window.document.documentElement.lang === 'en');
  check('页面标题切换', window.document.title.includes('Starbucks City Mugs'));
  check('标签页文案切换', q('[data-view="map"]').textContent.includes('Map'));
  check('搜索占位符切换', $('f-search').placeholder.includes('Search'));
  check('结果计数英文', $('result-count').textContent.includes('Showing'), $('result-count').textContent);
  check('用户徽章英文', $('user-chip').textContent.includes('Guest'));
  const enCard = $('gallery-grid').querySelector('.card-title');
  check('卡片城市名英文优先', enCard && /^[\x00-\x7F]/.test(enCard.textContent.trim()), enCard && enCard.textContent);
  check('国家下拉英文', $('f-country').options[0].textContent === 'All countries');
  click($('btn-lang'));
  check('切回中文', window.document.documentElement.lang === 'zh-CN' && q('[data-view="map"]').textContent.includes('地图'));

  console.log('— 详情弹窗与外链 —');
  click($('gallery-grid').querySelector('[data-action="open-mug"]'));
  check('详情弹窗打开', !$('modal-mug').hidden);
  check('详情含备注框', $('note-input') !== null);
  const detailHTML = $('mug-detail').innerHTML;
  check('含 Google 实拍图外链', detailHTML.includes('tbm=isch'));
  check('含 starbucks-mugs.com 原始页面直链', detailHTML.includes('starbucks-mugs.com/mug/'));
  const openedId = $('gallery-grid').querySelector('[data-action="open-mug"]').dataset.id;
  const openedMug = M.find(x => x.id === openedId);
  check('直链 slug 与数据一致', openedMug && detailHTML.includes('starbucks-mugs.com/mug/' + openedMug.src + '/'), openedMug && openedMug.src);
  check('标注图片版权归属', detailHTML.includes('starbucks-mugs.com') && $('mug-detail').textContent.includes('版权'));
  click(q('#modal-mug [data-action="close-modal"]'));
  check('详情弹窗关闭', $('modal-mug').hidden);

  console.log('— 收藏标记（游客） —');
  const firstBtn = $('gallery-grid').querySelector('[data-action="set-status"][data-status="owned"]');
  const mugId = firstBtn.dataset.id;
  click(firstBtn);
  check('标记已拥有', window.Collection.status(mugId) === 'owned');
  check('计数徽章更新', $('user-chip').textContent.includes('✓1'));
  check('localStorage 持久化', window.localStorage.getItem('sbmug_col_guest').includes(mugId));

  console.log('— 注册 / 登录 —');
  click(q('[data-action="auth-open"]'));
  check('登录弹窗打开', !$('modal-auth').hidden);
  click(q('[data-tab="register"]'));
  const regForm = $('form-register');
  regForm.querySelector('[name=username]').value = '测试者huajian';
  regForm.querySelector('[name=password]').value = 'secret123';
  regForm.querySelector('[name=password2]').value = 'secret123';
  regForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise(r => setTimeout(r, 300));
  check('注册成功进入登录态', window.Auth.current() === '测试者huajian', window.Auth.current());
  check('弹出并入游客记录确认框', !$('modal-confirm').hidden);
  click($('confirm-buttons').querySelector('.btn'));
  await new Promise(r => setTimeout(r, 100));
  check('游客记录已并入', window.Collection.status(mugId) === 'owned');
  check('头部显示用户名', $('user-chip').textContent.includes('测试者huajian'));

  const wishBtn = $('gallery-grid').querySelectorAll('[data-action="set-status"][data-status="wish"]')[3];
  const wishId = wishBtn.dataset.id;
  click(wishBtn);
  check('愿望单标记', window.Collection.status(wishId) === 'wish');

  console.log('— 登出 / 再登录 —');
  click($('btn-logout'));
  check('登出后回到游客', window.Auth.current() === null);
  click(q('[data-action="auth-open"]'));
  click(q('[data-tab="login"]'));
  const loginForm = $('form-login');
  loginForm.querySelector('[name=username]').value = '测试者huajian';
  loginForm.querySelector('[name=password]').value = 'wrongpass';
  loginForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise(r => setTimeout(r, 300));
  check('错误密码被拒绝', $('login-error').textContent === '密码错误' && window.Auth.current() === null);
  loginForm.querySelector('[name=password]').value = 'secret123';
  loginForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise(r => setTimeout(r, 300));
  check('正确密码登录成功', window.Auth.current() === '测试者huajian');
  check('登录后收藏恢复', window.Collection.status(mugId) === 'owned' && window.Collection.status(wishId) === 'wish');

  console.log('— 实拍照片 —');
  /* jsdom 无 canvas，直接注入合法 data URI 验证存储/渲染/校验逻辑 */
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  check('拒绝非图片 data URI', !window.Photos.isImageData('javascript:alert(1)') && !window.Photos.isImageData('data:text/html;base64,PHNjcmlwdD4='));
  check('接受合法图片 data URI', window.Photos.isImageData(PNG));
  check('拒绝写入非法 URI', window.Photos.set(mugId, 'javascript:alert(1)') === false);
  check('get() 对已落库的非法值也返回 null', (() => {
    /* 绕过 set() 直接污染存储，模拟旧数据或人为改过的 localStorage */
    window.localStorage.setItem('sbmug_photos_guest', JSON.stringify({ evil: 'javascript:alert(1)' }));
    window.Photos.load(window.Collection.currentUser());
    const leaked = window.Photos.get('evil');
    window.localStorage.removeItem('sbmug_photos_guest');
    window.Photos.load(window.Collection.currentUser());
    return leaked === null;
  })());
  check('写入照片成功', window.Photos.set(mugId, PNG) === true && window.Photos.get(mugId) === PNG);
  click(q('[data-view="gallery"]'));
  const photoCard = $('gallery-grid').querySelector('.card img.real-photo');
  check('图鉴卡片显示实拍照片', photoCard !== null);
  check('卡片显示照片角标', $('gallery-grid').querySelector('.photo-flag') !== null);
  click($('gallery-grid').querySelector('[data-action="open-mug"][data-id="' + mugId + '"]'));
  check('详情页显示实拍大图', $('mug-detail').querySelector('img.real-photo.big') !== null);
  check('详情页有换图/删图按钮', q('[data-action="photo-del"]') !== null && q('[data-action="photo-pick"]') !== null);
  click(q('#modal-mug [data-action="close-modal"]'));

  console.log('— 导出 / 导入（含照片） —');
  const exported = window.Collection.exportJSON();
  const parsed = JSON.parse(exported);
  check('导出 JSON 结构', parsed.app === 'sbmug' && Object.keys(parsed.collection).length === 2);
  check('导出包含照片', parsed.photos && parsed.photos[mugId] === PNG);
  window.Collection.remove(mugId);
  window.Photos.remove(mugId);
  check('删除后已拥有清零', window.Collection.counts().owned === 0 && !window.Photos.has(mugId));
  const r = window.Collection.importJSON(exported, 'merge');
  check('导入合并恢复记录', r.records === 2 && window.Collection.status(mugId) === 'owned');
  check('导入恢复照片', r.photos === 1 && window.Photos.get(mugId) === PNG);
  const evil = JSON.stringify({ app: 'sbmug', collection: {}, photos: { x: 'javascript:alert(1)' } });
  const r2 = window.Collection.importJSON(evil, 'merge');
  check('导入过滤恶意照片 URI', r2.photos === 0 && !window.Photos.get('x'));
  const importErr = (text) => {
    try { window.Collection.importJSON(text, 'merge'); return null; }
    catch (e) { return e.message; }
  };
  check('拒绝非本站导出的文件', importErr('{"app":"other"}') === '不是本站导出的收藏记录文件',
    importErr('{"app":"other"}'));
  check('拒绝结构合法但来源不符的文件',
    importErr(JSON.stringify({ app: 'other', collection: { x: { s: 'owned' } } })) === '不是本站导出的收藏记录文件');
  check('拒绝非 JSON 文件', importErr('not json at all') === '文件不是有效的 JSON');
  check('拒绝 collection 字段缺失的文件',
    importErr(JSON.stringify({ app: 'sbmug' })) === '不是本站导出的收藏记录文件');

  console.log('— 分享编解码 —');
  const enc = window.Share.encodeCollection('测试者huajian', window.Collection.raw());
  const dec = window.Share.decodeShare(enc);
  check('分享链接编解码往返', dec && dec.name === '测试者huajian' && dec.owned.has(mugId) && dec.wish.has(wishId));
  check('非法分享串返回 null', window.Share.decodeShare('!!!not-base64!!!') === null);

  click(q('[data-action="share-open"]'));
  check('分享链接含 #share=', $('share-url').value.includes('#share='));
  const weibo = q('[data-platform="weibo"]').href;
  check('微博分享链接', weibo.startsWith('https://service.weibo.com/share'));
  click(q('#modal-share [data-action="close-modal"]'));

  console.log('— 查看他人分享（只读） —');
  window.location.hash = '#share=' + enc;
  window.dispatchEvent(new window.Event('hashchange'));
  check('分享横幅出现', !$('share-banner').hidden && $('share-owner').textContent === '测试者huajian');
  check('只读状态读取分享数据', window.App.statusOf(mugId) === 'owned');
  check('分享链接不含照片数据', !$('share-url').value.includes('data:image'));
  click(q('[data-view="gallery"]'));
  check('只读模式不显示本机照片', $('gallery-grid').querySelector('img.real-photo') === null);
  click(q('[data-action="io-open"]'));
  check('分享模式下导入导出被拦截', $('modal-io').hidden);
  const roId = M[7].id;
  const roBefore = JSON.stringify(window.Collection.raw());
  click(q('[data-view="gallery"]'));
  const roBtn = $('gallery-grid').querySelector('[data-action="set-status"][data-status="owned"]');
  const roTargetId = roBtn.dataset.id;
  const roTargetBefore = window.Collection.status(roTargetId);
  click(roBtn);
  check('只读模式下点「拥有」不改动自己的收藏',
    window.Collection.status(roTargetId) === roTargetBefore &&
    JSON.stringify(window.Collection.raw()) === roBefore);
  check('只读模式下提示无法修改', $('toast-root').textContent.includes('无法修改'));
  window.Photos.set(roId, PNG);
  click($('gallery-grid').querySelector('[data-action="open-mug"]'));
  check('只读模式详情页无编辑控件',
    q('[data-action="photo-pick"]') === null && q('[data-action="photo-del"]') === null &&
    $('note-input') === null);
  click(q('#modal-mug [data-action="close-modal"]'));
  window.Photos.remove(roId);
  window.location.hash = '';
  window.dispatchEvent(new window.Event('hashchange'));
  check('后退移除 hash 自动退出只读', $('share-banner').hidden);
  click(q('[data-action="io-open"]'));
  check('退出后导入导出恢复可用', !$('modal-io').hidden);
  click(q('#modal-io [data-action="close-modal"]'));

  console.log('— 回归：其余审查修复 —');
  const dca = M.find(m => m.id === 'bt-disney-california-adventure');
  check('长城市名启用 textLength 压缩', !dca || window.MugArt.svg(dca, 200).includes('textLength'));
  const coordGroups = new Map();
  for (const m of M) coordGroups.set(m.city + '|' + m.country, m.lat + ',' + m.lng);
  const sameCityCoords = M.every(m => coordGroups.get(m.city + '|' + m.country) === m.lat + ',' + m.lng);
  check('同城条目坐标一致', sameCityCoords);
  check('Christmas 版本已并入本体并标 edition',
    M.some(m => m.city === 'Paris' && m.edition === 'Christmas') && !M.some(m => m.city.startsWith('Christmas ')));
  check('含 -ornament- 的 src 全部标为挂饰',
    M.filter(m => m.src.includes('-ornament-')).every(m => m.type === 'ornament'));
  check('同中文名无多种英文拼写', (() => {
    const g = new Map();
    for (const m of M) { const k = m.cityZh + '|' + m.country; if (!g.has(k)) g.set(k, new Set()); g.get(k).add(m.city); }
    return [...g.values()].every(s => s.size === 1);
  })());

  click($('btn-logout'));
  click(q('[data-action="auth-open"]'));
  click(q('[data-tab="register"]'));
  regForm.querySelector('[name=username]').value = 'guest';
  regForm.querySelector('[name=password]').value = 'secret123';
  regForm.querySelector('[name=password2]').value = 'secret123';
  regForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise(r => setTimeout(r, 200));
  check('拒绝注册保留用户名 guest', $('register-error').textContent.includes('保留') && window.Auth.current() === null);
  click(q('#modal-auth [data-action="close-modal"]'));

  click(q('[data-view="gallery"]'));
  const gBtn = $('gallery-grid').querySelectorAll('[data-action="set-status"][data-status="owned"]')[10];
  const gid = gBtn.dataset.id;
  click(gBtn);
  check('游客可标记', window.Collection.status(gid) === 'owned');
  click(q('[data-action="auth-open"]'));
  click(q('[data-tab="login"]'));
  loginForm.querySelector('[name=password]').value = 'secret123';
  loginForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise(r => setTimeout(r, 300));
  check('登录提示并入游客记录', !$('modal-confirm').hidden);
  click($('confirm-buttons').querySelector('.btn'));
  await new Promise(r => setTimeout(r, 100));
  check('并入后游客存储已清空', !window.localStorage.getItem('sbmug_col_guest'));
  check('并入条目生效', window.Collection.status(gid) === 'owned');
  click($('btn-logout'));
  click(q('[data-action="auth-open"]'));
  click(q('[data-tab="login"]'));
  loginForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise(r => setTimeout(r, 300));
  check('再次登录不再重复提示并入', $('modal-confirm').hidden && window.Auth.current() === '测试者huajian');

  window.dispatchEvent(new window.CustomEvent('sbmug:storage-error'));
  check('存储失败 toast 提示', $('toast-root').textContent.includes('无法保存'));

  console.log('— 回归：审查 v2 修复 —');
  /* 分页不因收藏动作被重置 */
  click(q('[data-view="gallery"]'));
  click(q('[data-action="load-more"]'));
  click(q('[data-action="load-more"]'));
  const before = $('gallery-grid').children.length;
  check('已加载三页 = 360', before === 360, before);
  const pgBtn = $('gallery-grid').querySelectorAll('[data-action="set-status"][data-status="owned"]')[200];
  const pgId = pgBtn.dataset.id;
  click(pgBtn);
  check('收藏后仍保留已加载分页', $('gallery-grid').children.length === before, $('gallery-grid').children.length);
  check('该卡片状态已更新', window.Collection.status(pgId) === 'owned');
  const patched = $('gallery-grid').querySelector('.card[data-id="' + pgId + '"]');
  check('卡片就地更新出已拥有徽章', patched && patched.textContent.includes('已拥有'));
  check('其余卡片未被重建', $('gallery-grid').children.length === before);

  /* 按状态筛选时改状态必须整体重算 */
  change($('f-status'), 'owned');
  const ownedN = window.Collection.counts().owned;
  check('状态筛选下结果 = 已拥有数 ' + ownedN, $('result-count').textContent.includes(String(ownedN)), $('result-count').textContent);
  click($('gallery-grid').querySelector('[data-action="set-status"][data-status="owned"]'));
  check('取消收藏后从筛选结果中移除', $('result-count').textContent.includes(String(ownedN - 1)), $('result-count').textContent);
  change($('f-status'), 'all');

  /* 分享链接压缩 */
  const many = {};
  M.slice(0, 400).forEach(m => { many[m.id] = { s: 'owned' }; });
  M.slice(400, 500).forEach(m => { many[m.id] = { s: 'wish' }; });
  const bigEnc = window.Share.encodeCollection('大户', many);
  check('500 款收藏的分享串 < 1200 字符', bigEnc.length < 1200, bigEnc.length + ' 字符');
  const bigDec = window.Share.decodeShare(bigEnc);
  check('大收藏往返无损', bigDec && bigDec.owned.size === 400 && bigDec.wish.size === 100 &&
    bigDec.owned.has(M[0].id) && bigDec.wish.has(M[400].id) && bigDec.name === '大户');
  check('旧版明文链接仍可解', (() => {
    const legacy = Buffer.from(JSON.stringify({ n: '老链接', o: [M[5].id], w: [] })).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const d = window.Share.decodeShare(legacy);
    return d && d.name === '老链接' && d.owned.has(M[5].id);
  })());
  check('数据集指纹不符时报 stale', (() => {
    const enc2 = window.Share.encodeCollection('x', many);
    const saved = window.MUG_DATA;
    window.MUG_DATA = saved.slice(0, 100);
    const d = window.Share.decodeShare(enc2);
    window.MUG_DATA = saved;
    return d && d.stale === true;
  })());

  /* 照片导入配额失败必须回滚 */
  check('照片导入写入失败时回滚并返回 0', (() => {
    const realSet = window.SafeStore.set;
    window.SafeStore.set = (k) => k.startsWith('sbmug_photos_') ? false : realSet(k, arguments[1]);
    const n = window.Photos.importAll({ zz: PNG }, 'merge');
    window.SafeStore.set = realSet;
    return n === 0 && !window.Photos.get('zz');
  })());

  console.log('— SVG 插画（四种模板） —');
  const gi = M.find(m => m.series === 'global-icon' && m.type === 'mug');
  const yah = M.find(m => m.series === 'you-are-here' && m.type === 'mug');
  const bt = M.find(m => m.series === 'been-there' && m.type === 'mug');
  const orn = M.find(m => m.type === 'ornament');
  check('GI 模板', window.MugArt.svg(gi, 200).includes('GLOBAL ICON'));
  check('YAH 模板', window.MugArt.svg(yah, 200).includes('YOU ARE HERE'));
  check('BT 模板', window.MugArt.svg(bt, 200).includes('BEEN THERE'));
  check('挂饰模板', orn && window.MugArt.svg(orn, 200).includes('<circle'));
  let svgErr = null;
  const leaked = [];
  for (const m of M) {
    try {
      const out = window.MugArt.svg(m, 100);
      if (/\{c\}|\{bg\}/.test(out)) leaked.push(m.id);
    } catch (e) { svgErr = m.id + ': ' + e.message; break; }
  }
  check('全部杯款可渲染', svgErr === null, svgErr);
  check('无残留 SVG 占位符', leaked.length === 0, leaked.slice(0, 3).join(', '));
  /* 深色保障：地标图案画在米白杯身上必须看得见。
   * 只量图案那一组（<g transform=...>）内的颜色，忽略挖洞用的底色。 */
  const luma = (hex) => 0.2126 * parseInt(hex.slice(1, 3), 16) +
    0.7152 * parseInt(hex.slice(3, 5), 16) + 0.0722 * parseInt(hex.slice(5, 7), 16);
  const SURFACES = ['#fdfaf4', '#fbf8f1', '#f6f0e0'];
  const paleGlyphs = [];
  for (const m of M) {
    const svg = window.MugArt.svg(m, 100);
    const g = svg.match(/<g transform="translate\([^"]*\)[^"]*">([\s\S]*?)<\/g>\s*(?:<text|<rect|<circle|<line|<path|$)/);
    const inner = g ? g[1] : '';
    const cols = [...inner.matchAll(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g)].map(x => x[1].toLowerCase());
    const drawn = cols.filter(c => SURFACES.indexOf(c) === -1);
    if (drawn.length && drawn.every(c => luma(c) > 165)) paleGlyphs.push(m.id + ' ' + drawn[0]);
  }
  check('图案配色对比度足够', paleGlyphs.length === 0, paleGlyphs.slice(0, 4).join(', '));
  /* 反证：把日本那条的白色直接当图案色用会被判为过浅 */
  check('对比度检查确实有效', luma('#FFFFFF') > 165 && luma('#1e3932') <= 165);
  /* 图案多样性：不能再出现一个图案盖住三成条目的情况 */
  const gc = {};
  M.forEach(m => { gc[m.glyph] = (gc[m.glyph] || 0) + 1; });
  const kinds = Object.keys(gc).length;
  const biggest = Math.max(...Object.values(gc));
  check('图案种类 >= 40（实际 ' + kinds + '）', kinds >= 40, String(kinds));
  check('单一图案占比 < 20%（最大 ' + biggest + '）', biggest / M.length < 0.2,
    (biggest / M.length * 100).toFixed(1) + '%');
  /* 标志性城市必须用专属图案，不能再出现西雅图画成巴黎 */
  const iconic = { Seattle: 'space-needle', Paris: 'eiffel', London: 'bigben', Rome: 'colosseum',
    Cairo: 'pyramid', Sydney: 'opera-house', 'Niagara Falls': 'waterfall', Guilin: 'karst' };
  const wrong = Object.entries(iconic).filter(([city, g]) => {
    const m = M.find(x => x.city === city);
    return m && m.glyph !== g;
  });
  check('标志性城市使用专属图案', wrong.length === 0,
    wrong.map(([c, g]) => c + ' 应为 ' + g).join('; '));
  /* 地点专属插画：有则优先于通用图案，且不能有残留占位符 */
  const withArt = M.filter(m => window.MugArt.hasPlaceArt(m));
  check('已有地点专属插画（' + withArt.length + ' 款）', withArt.length > 0);
  check('专属插画覆盖的地点渲染正常', withArt.every(m => {
    const out = window.MugArt.svg(m, 100);
    return !/\{c\}|\{bg\}/.test(out) && out.indexOf('<svg') === 0;
  }));
  check('专属插画确实取代了通用图案', (() => {
    const m = withArt[0];
    if (!m) return false;
    const real = window.MugArt.svg(m, 100);
    const saved = window.PLACE_ART[m.city + '|' + m.country];
    delete window.PLACE_ART[m.city + '|' + m.country];
    const fallback = window.MugArt.svg(m, 100);
    window.PLACE_ART[m.city + '|' + m.country] = saved;
    return real !== fallback;
  })());
  /* 现已 100% 覆盖，靠临时摘掉一条来验证回退路径仍然可用 */
  check('无专属插画的地点回退到通用图案', (() => {
    const m = M[0];
    const k = m.city + '|' + m.country;
    const saved = window.PLACE_ART[k];
    delete window.PLACE_ART[k];
    const fellBack = !window.MugArt.hasPlaceArt(m);
    const out = window.MugArt.svg(m, 100);
    window.PLACE_ART[k] = saved;
    return fellBack && out.indexOf('<svg') === 0 && !/\{c\}|\{bg\}/.test(out);
  })());
  check('全部地点都有专属插画（' + M.filter(x => window.MugArt.hasPlaceArt(x)).length + ' 款）',
    M.every(x => window.MugArt.hasPlaceArt(x)));
  /* 每个地点的图形必须互不相同 */
  const byPlace = new Map();
  for (const m of M) {
    const k = m.city + '|' + m.country;
    if (!byPlace.has(k)) byPlace.set(k, m);
  }
  const shapes = new Set();
  for (const m of byPlace.values()) {
    shapes.add(window.MugArt.svg(m, 200)
      .replace(/<text[\s\S]*?<\/text>/g, '')
      .replace(/mclip\d+|yarc\d+|oarc\d+/g, ''));
  }
  check('每个地点图形互不相同（' + byPlace.size + ' 个地点）',
    shapes.size === byPlace.size, shapes.size + ' / ' + byPlace.size);

  console.log(failures === 0 ? '\n✅ 全部通过' : '\n❌ ' + failures + ' 项失败');
  process.exit(failures === 0 ? 0 : 1);
})().catch(e => { console.error('测试脚本异常:', e); process.exit(2); });
