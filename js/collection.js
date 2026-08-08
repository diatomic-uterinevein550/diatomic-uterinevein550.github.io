/* 收藏记录：按账号（未登录为 guest）存于 localStorage。
 * 条目结构 { s: 'owned'|'wish', d: '收录日期', n: '备注' } */
'use strict';

window.Collection = (function () {
  var user = null;
  var data = {};
  var storageWarned = false;

  function key(u) { return 'sbmug_col_' + (u || 'guest'); }

  function load(u) {
    user = u;
    try { data = JSON.parse(SafeStore.get(key(u))) || {}; }
    catch (e) { data = {}; }
  }
  function persist() {
    if (!SafeStore.set(key(user), JSON.stringify(data)) && !storageWarned) {
      storageWarned = true;
      window.dispatchEvent(new CustomEvent('sbmug:storage-error'));
    }
  }

  function status(id) { return data[id] ? data[id].s : null; }
  function entry(id) { return data[id] || null; }

  function set(id, s) {
    if (!data[id]) data[id] = {};
    data[id].s = s;
    if (!data[id].d) data[id].d = new Date().toISOString().slice(0, 10);
    persist();
  }

  function remove(id) {
    if (data[id] && data[id].n) { delete data[id].s; }
    else delete data[id];
    persist();
  }

  function setNote(id, n) {
    n = (n || '').trim();
    if (!data[id] && !n) return;
    if (!data[id]) data[id] = {};
    if (n) data[id].n = n; else delete data[id].n;
    if (!data[id].s && !data[id].n) delete data[id];
    persist();
  }

  function counts() {
    var owned = 0, wish = 0, id;
    for (id in data) {
      if (data[id].s === 'owned') owned++;
      else if (data[id].s === 'wish') wish++;
    }
    return { owned: owned, wish: wish };
  }

  function raw() { return data; }

  function exportJSON() {
    var out = {
      app: 'sbmug',
      version: 2,
      user: user || 'guest',
      exportedAt: new Date().toISOString(),
      collection: data
    };
    if (window.Photos && Photos.count()) out.photos = Photos.raw();
    return JSON.stringify(out, null, 2);
  }

  /* mode: 'merge'（导入的条目覆盖同名条目，其余保留）| 'replace' */
  function importJSON(text, mode) {
    var T = function (k) { return window.I18N ? I18N.t(k) : k; };
    var obj;
    try { obj = JSON.parse(text); }
    catch (e) { throw new Error(T('err.badJson')); }
    if (!obj || obj.app !== 'sbmug' || typeof obj.collection !== 'object' || obj.collection === null) {
      throw new Error(T('err.notOurs'));
    }
    var clean = {}, id, e2, n = 0;
    for (id in obj.collection) {
      e2 = obj.collection[id];
      if (!e2 || typeof e2 !== 'object') continue;
      if (e2.s !== 'owned' && e2.s !== 'wish' && !e2.n) continue;
      clean[id] = {};
      if (e2.s === 'owned' || e2.s === 'wish') clean[id].s = e2.s;
      if (typeof e2.d === 'string') clean[id].d = e2.d.slice(0, 10);
      if (typeof e2.n === 'string') clean[id].n = e2.n.slice(0, 500);
      n++;
    }
    if (mode === 'replace') data = clean;
    else { for (id in clean) data[id] = clean[id]; }
    persist();
    var photos = 0;
    if (window.Photos) photos = Photos.importAll(obj.photos, mode);
    return { records: n, photos: photos };
  }

  function readGuest() {
    try { return JSON.parse(SafeStore.get(key(null))) || {}; }
    catch (e) { return {}; }
  }

  /* 游客记录中尚未存在于当前账号的条目数（用于决定是否提示并入） */
  function mergeableGuestCount() {
    var g = readGuest(), id, n = 0;
    for (id in g) { if (!data[id]) n++; }
    return n;
  }

  /* 把游客数据并入当前账号（不覆盖账号中已有条目），并清空游客记录 */
  function adoptGuest() {
    var g = readGuest(), id, n = 0;
    for (id in g) {
      if (!data[id]) { data[id] = g[id]; n++; }
    }
    persist();
    SafeStore.remove(key(null));
    return n;
  }

  return {
    load: load, status: status, entry: entry, set: set, remove: remove,
    setNote: setNote, counts: counts, raw: raw,
    exportJSON: exportJSON, importJSON: importJSON,
    mergeableGuestCount: mergeableGuestCount, adoptGuest: adoptGuest,
    currentUser: function () { return user; }
  };
})();

/* 分享编码：把收藏压缩为 URL hash（base64url） */
window.Share = (function () {
  function b64uEncode(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64uDecode(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /* 逐个写 id 的话，收藏几百款链接就会长到被微博/WhatsApp 截断。
   * 改为按数据集顺序打位图：2000 多款也只有几百字符。
   * 位图依赖数据集顺序，因此带一个指纹；对不上时明确报错而不是静默解出错误结果。 */
  function fingerprint() {
    var list = window.MUG_DATA || [];
    var h1 = 5381, h2 = 52711, i, j, s;
    for (i = 0; i < list.length; i++) {
      s = list[i].id;
      for (j = 0; j < s.length; j++) {
        h1 = ((h1 << 5) + h1 + s.charCodeAt(j)) >>> 0;
        h2 = ((h2 << 7) + h2 + s.charCodeAt(j)) >>> 0;
      }
    }
    return list.length.toString(36) + '.' + h1.toString(36) + h2.toString(36);
  }

  function packBits(flags) {
    var last = -1, i;
    for (i = flags.length - 1; i >= 0; i--) { if (flags[i]) { last = i; break; } }
    var bytes = new Uint8Array(last < 0 ? 0 : ((last >> 3) + 1));
    for (i = 0; i <= last; i++) if (flags[i]) bytes[i >> 3] |= (1 << (i & 7));
    var bin = '';
    for (i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return bin;
  }

  function unpackBits(bin, ids, out) {
    for (var i = 0; i < ids.length; i++) {
      var b = i >> 3;
      if (b < bin.length && (bin.charCodeAt(b) & (1 << (i & 7)))) out.add(ids[i]);
    }
  }

  function encodeCollection(name, dataObj) {
    var list = window.MUG_DATA || [];
    var owned = new Array(list.length), wish = new Array(list.length);
    var i, e;
    for (i = 0; i < list.length; i++) {
      e = dataObj[list[i].id];
      owned[i] = !!(e && e.s === 'owned');
      wish[i] = !!(e && e.s === 'wish');
    }
    var o = packBits(owned), w = packBits(wish);
    /* 用 \x01 分隔，名字里的分隔符先转义 */
    var payload = 'B\x01' + fingerprint() + '\x01' + String(name || '').replace(/[\x00-\x02]/g, '') +
      '\x01' + o + '\x02' + w;
    return b64uEncode(payload);
  }

  function decodeShare(hashVal) {
    var raw;
    try { raw = b64uDecode(hashVal); }
    catch (e) { return null; }

    if (raw.charAt(0) === 'B' && raw.charAt(1) === '\x01') {
      var head = raw.split('\x01');
      if (head.length < 4) return null;
      var ids = (window.MUG_DATA || []).map(function (m) { return m.id; });
      if (head[1] !== fingerprint()) return { stale: true, name: head[2] || null };
      var body = head.slice(3).join('\x01').split('\x02');
      var owned = new Set(), wish = new Set();
      unpackBits(body[0] || '', ids, owned);
      unpackBits(body[1] || '', ids, wish);
      return { name: head[2] || null, owned: owned, wish: wish };
    }

    /* 旧版明文 id 列表链接 */
    try {
      var obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.o)) return null;
      return {
        name: obj.n || null,   /* 空名由 UI 按当前语言显示"匿名收藏家" */
        owned: new Set(obj.o),
        wish: new Set(Array.isArray(obj.w) ? obj.w : [])
      };
    } catch (e) { return null; }
  }

  return { encodeCollection: encodeCollection, decodeShare: decodeShare };
})();
