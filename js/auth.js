/* 本地账号系统：账号与口令散列均存于本浏览器 localStorage，
 * 仅用于在同一设备上区分多位收藏者，并非服务器级安全认证。 */
'use strict';

/* localStorage 安全封装：隐私模式/屏蔽 Cookie 的浏览器访问 localStorage 会抛异常，
 * 全站统一走这里，保证页面仍可浏览（只是无法持久化）。 */
window.SafeStore = (function () {
  function get(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function set(k, v) {
    try { localStorage.setItem(k, v); return true; } catch (e) { return false; }
  }
  function remove(k) {
    try { localStorage.removeItem(k); } catch (e) { /* 忽略 */ }
  }
  return { get: get, set: set, remove: remove };
})();

window.Auth = (function () {
  var USERS_KEY = 'sbmug_users';
  var SESSION_KEY = 'sbmug_session';

  /* i18n 兜底：I18N 尚未加载时返回 key 本身 */
  function T(k) { return window.I18N ? I18N.t(k) : k; }

  function loadUsers() {
    try { return JSON.parse(SafeStore.get(USERS_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveUsers(u) { SafeStore.set(USERS_KEY, JSON.stringify(u)); }

  function randSalt() {
    var a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function hash(pw, salt) {
    var msg = salt + '::' + pw;
    if (crypto.subtle) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg)).then(function (d) {
        return Array.prototype.map.call(new Uint8Array(d), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      });
    }
    /* 非安全上下文的兜底散列（明显弱化，仅保证功能可用） */
    var h1 = 5381, h2 = 52711, i, c;
    for (i = 0; i < msg.length; i++) {
      c = msg.charCodeAt(i);
      h1 = ((h1 << 5) + h1 + c) >>> 0;
      h2 = ((h2 << 7) + h2 + c) >>> 0;
    }
    return Promise.resolve('x' + h1.toString(16) + h2.toString(16));
  }

  function register(name, pw) {
    name = name.trim();
    if (!/^[A-Za-z0-9_一-龥-]{2,20}$/.test(name)) {
      return Promise.reject(new Error(T('err.nameInvalid')));
    }
    if (name.toLowerCase() === 'guest') {
      return Promise.reject(new Error(T('err.nameReserved')));
    }
    if (pw.length < 6) return Promise.reject(new Error(T('err.pwShort')));
    var users = loadUsers();
    if (users[name]) return Promise.reject(new Error(T('err.userExists')));
    var salt = randSalt();
    return hash(pw, salt).then(function (h) {
      users[name] = { salt: salt, hash: h, created: new Date().toISOString() };
      saveUsers(users);
      SafeStore.set(SESSION_KEY, name);
      return name;
    });
  }

  function login(name, pw) {
    name = name.trim();
    var users = loadUsers();
    var u = users[name];
    if (!u) return Promise.reject(new Error(T('err.userNotFound')));
    return hash(pw, u.salt).then(function (h) {
      if (h !== u.hash) throw new Error(T('err.wrongPw'));
      SafeStore.set(SESSION_KEY, name);
      return name;
    });
  }

  function logout() { SafeStore.remove(SESSION_KEY); }
  function current() { return SafeStore.get(SESSION_KEY) || null; }

  return { register: register, login: login, logout: logout, current: current };
})();
