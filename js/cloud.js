/* Supabase 云端账号与多设备同步。
 *
 * 设计原则是**本地优先**：localStorage 始终是工作副本，所有读写先落本地、
 * 界面立即响应；云端只是同步层。断网、Supabase 宕机、或者没配置云端时，
 * 站点行为和纯本地版完全一致，不会卡住也不会丢数据。
 *
 * 合并策略：每行带数据库维护的 updated_at，同一杯款以较新的一方为准。
 * 删除写成 status='none' 的墓碑行而不是真删，否则旧设备同步时会把
 * 你已经删掉的记录又复活回来。 */
'use strict';

window.Cloud = (function () {
  var client = null;
  var ready = false;
  var loading = null;
  var session = null;
  var listeners = [];

  var SDK = 'https://esm.sh/@supabase/supabase-js@2.45.4';

  function cfg() { return window.CLOUD_CONFIG || {}; }

  function isConfigured() {
    var c = cfg();
    return !!(c.url && c.anonKey && /^https:\/\//.test(c.url));
  }

  function emit(evt, payload) {
    listeners.forEach(function (fn) {
      try { fn(evt, payload); } catch (e) { /* 监听器自己的错不该影响同步 */ }
    });
  }

  function onChange(fn) { listeners.push(fn); }

  /* 动态加载 SDK：没配置云端就一个字节都不下载 */
  function init() {
    if (!isConfigured()) return Promise.resolve(false);
    if (ready) return Promise.resolve(true);
    if (loading) return loading;
    loading = import(/* webpackIgnore: true */ SDK)
      .then(function (mod) {
        client = mod.createClient(cfg().url, cfg().anonKey, {
          auth: { persistSession: true, autoRefreshToken: true }
        });
        return client.auth.getSession();
      })
      .then(function (res) {
        session = (res && res.data && res.data.session) || null;
        client.auth.onAuthStateChange(function (_evt, s) {
          session = s || null;
          emit('auth', session);
        });
        ready = true;
        return true;
      })
      .catch(function (err) {
        loading = null;
        emit('error', err);
        return false;
      });
    return loading;
  }

  function user() {
    return session && session.user ? session.user : null;
  }

  function email() {
    var u = user();
    return u ? u.email : null;
  }

  /* ---------- 认证 ---------- */
  function signUp(mail, password) {
    return init().then(function (ok) {
      if (!ok) throw new Error('cloud_unavailable');
      return client.auth.signUp({ email: mail, password: password });
    }).then(function (res) {
      if (res.error) throw res.error;
      /* 项目开了邮箱验证时 session 为空，需要用户先去收件箱点确认 */
      return { needsConfirm: !res.data.session, user: res.data.user };
    });
  }

  function signIn(mail, password) {
    return init().then(function (ok) {
      if (!ok) throw new Error('cloud_unavailable');
      return client.auth.signInWithPassword({ email: mail, password: password });
    }).then(function (res) {
      if (res.error) throw res.error;
      session = res.data.session;
      return res.data.user;
    });
  }

  function signOut() {
    if (!ready) return Promise.resolve();
    return client.auth.signOut().then(function () { session = null; });
  }

  /* ---------- 收藏同步 ---------- */
  function pull() {
    if (!ready || !user()) return Promise.resolve(null);
    return client.from('collections')
      .select('mug_id,status,note,added_on,updated_at')
      .then(function (res) {
        if (res.error) throw res.error;
        var out = {};
        (res.data || []).forEach(function (r) {
          out[r.mug_id] = {
            s: r.status === 'none' ? null : r.status,
            n: r.note || '',
            d: r.added_on || '',
            u: r.updated_at
          };
        });
        return out;
      });
  }

  function push(mugId, entry) {
    if (!ready || !user()) return Promise.resolve(false);
    return client.from('collections').upsert({
      user_id: user().id,
      mug_id: mugId,
      status: (entry && entry.s) || 'none',
      note: (entry && entry.n) || '',
      added_on: (entry && entry.d) || null
    }, { onConflict: 'user_id,mug_id' }).then(function (res) {
      if (res.error) throw res.error;
      return true;
    });
  }

  function pushAll(data) {
    if (!ready || !user()) return Promise.resolve(0);
    var uid = user().id;
    var rows = Object.keys(data).map(function (id) {
      var e = data[id] || {};
      return {
        user_id: uid, mug_id: id,
        status: e.s || 'none', note: e.n || '', added_on: e.d || null
      };
    });
    if (!rows.length) return Promise.resolve(0);
    /* 分批，避免单次请求过大 */
    var chunks = [];
    for (var i = 0; i < rows.length; i += 400) chunks.push(rows.slice(i, i + 400));
    return chunks.reduce(function (p, chunk) {
      return p.then(function (n) {
        return client.from('collections')
          .upsert(chunk, { onConflict: 'user_id,mug_id' })
          .then(function (res) {
            if (res.error) throw res.error;
            return n + chunk.length;
          });
      });
    }, Promise.resolve(0));
  }

  /* 本地与云端合并：同一杯款取 updated_at 较新的一方。
   * 本地条目没有 u 字段时视为"很旧"，让云端优先，避免旧设备覆盖新数据。 */
  function merge(local, remote) {
    var out = {}, id;
    var ts = function (e) { return e && e.u ? Date.parse(e.u) || 0 : 0; };
    for (id in local) out[id] = local[id];
    for (id in remote) {
      if (!out[id] || ts(remote[id]) >= ts(out[id])) out[id] = remote[id];
    }
    /* 丢掉两边都认定已删除的墓碑，别让本地无限膨胀 */
    var clean = {};
    for (id in out) {
      if (out[id] && (out[id].s === 'owned' || out[id].s === 'wish' || out[id].n)) {
        clean[id] = out[id];
      }
    }
    return clean;
  }

  /* ---------- 昵称 ---------- */
  function getProfile() {
    if (!ready || !user()) return Promise.resolve(null);
    return client.from('profiles').select('display_name').maybeSingle()
      .then(function (res) {
        if (res.error) throw res.error;
        return res.data ? res.data.display_name : null;
      });
  }

  function setProfile(name) {
    if (!ready || !user()) return Promise.resolve(false);
    return client.from('profiles')
      .upsert({ user_id: user().id, display_name: name || '' }, { onConflict: 'user_id' })
      .then(function (res) {
        if (res.error) throw res.error;
        return true;
      });
  }

  /* ---------- 实拍照片 ---------- */
  function photoPath(mugId) { return user().id + '/' + mugId + '.jpg'; }

  function uploadPhoto(mugId, dataUri) {
    if (!ready || !user()) return Promise.resolve(false);
    return fetch(dataUri).then(function (r) { return r.blob(); })
      .then(function (blob) {
        return client.storage.from('mug-photos')
          .upload(photoPath(mugId), blob, { upsert: true, contentType: 'image/jpeg' });
      })
      .then(function (res) {
        if (res.error) throw res.error;
        return true;
      });
  }

  function deletePhoto(mugId) {
    if (!ready || !user()) return Promise.resolve(false);
    return client.storage.from('mug-photos').remove([photoPath(mugId)])
      .then(function () { return true; });
  }

  function listPhotos() {
    if (!ready || !user()) return Promise.resolve([]);
    return client.storage.from('mug-photos').list(user().id, { limit: 1000 })
      .then(function (res) {
        if (res.error) throw res.error;
        return (res.data || []).map(function (f) { return f.name.replace(/\.jpg$/, ''); });
      });
  }

  /* 私有桶用签名 URL，默认一小时有效 */
  function photoUrl(mugId, seconds) {
    if (!ready || !user()) return Promise.resolve(null);
    return client.storage.from('mug-photos')
      .createSignedUrl(photoPath(mugId), seconds || 3600)
      .then(function (res) {
        return res.error ? null : res.data.signedUrl;
      });
  }

  return {
    isConfigured: isConfigured, init: init, onChange: onChange,
    user: user, email: email,
    signUp: signUp, signIn: signIn, signOut: signOut,
    pull: pull, push: push, pushAll: pushAll, merge: merge,
    getProfile: getProfile, setProfile: setProfile,
    uploadPhoto: uploadPhoto, deletePhoto: deletePhoto,
    listPhotos: listPhotos, photoUrl: photoUrl,
    isReady: function () { return ready; }
  };
})();
