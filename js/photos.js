/* 实拍照片：用户为自己的杯子上传照片，压缩后按账号存于 localStorage。
 * 只接受 data:image/... URI，渲染前一律校验，避免导入文件注入其他协议。 */
'use strict';

window.Photos = (function () {
  var MAX_EDGE = 520;      /* 压缩后最长边 */
  var QUALITY = 0.72;
  var MAX_BYTES = 260000;  /* 单张压缩后上限，超出则降质重试 */

  var user = null;
  var data = {};

  function key(u) { return 'sbmug_photos_' + (u || 'guest'); }

  function load(u) {
    user = u;
    try { data = JSON.parse(SafeStore.get(key(u))) || {}; }
    catch (e) { data = {}; }
  }

  function persist() {
    if (!SafeStore.set(key(user), JSON.stringify(data))) {
      window.dispatchEvent(new CustomEvent('sbmug:storage-error'));
      return false;
    }
    return true;
  }

  function isImageData(s) {
    return typeof s === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s);
  }

  function get(id) {
    var v = data[id];
    return isImageData(v) ? v : null;
  }

  function has(id) { return !!get(id); }

  /* 读取用户选择的图片文件，等比缩放并压缩为 JPEG data URI */
  function fromFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) {
        reject(new Error(I18N.t('err.notImage')));
        return;
      }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error(I18N.t('err.readFail'))); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error(I18N.t('err.readFail'))); };
        img.onload = function () {
          var w = img.naturalWidth || img.width;
          var h = img.naturalHeight || img.height;
          if (!w || !h) { reject(new Error(I18N.t('err.readFail'))); return; }
          var scale = Math.min(1, MAX_EDGE / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * scale));
          var ch = Math.max(1, Math.round(h * scale));
          var canvas = document.createElement('canvas');
          canvas.width = cw;
          canvas.height = ch;
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, cw, ch);
          ctx.drawImage(img, 0, 0, cw, ch);
          var q = QUALITY, uri = canvas.toDataURL('image/jpeg', q);
          while (uri.length > MAX_BYTES && q > 0.35) {
            q -= 0.12;
            uri = canvas.toDataURL('image/jpeg', q);
          }
          resolve(uri);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function set(id, uri) {
    if (!isImageData(uri)) return false;
    var prev = data[id];
    data[id] = uri;
    if (!persist()) {          /* 配额不足时回滚，避免内存与存储不一致 */
      if (prev === undefined) delete data[id]; else data[id] = prev;
      return false;
    }
    return true;
  }

  function remove(id) {
    if (!(id in data)) return;
    delete data[id];
    persist();
  }

  function count() { return Object.keys(data).length; }

  function raw() { return data; }

  /* 导入：只接受合法图片 data URI；写不进去（配额满）就整体回滚，
   * 不能报告"成功导入"却在下次刷新后消失。 */
  function importAll(obj, mode) {
    var clean = {}, id, n = 0;
    if (obj && typeof obj === 'object') {
      for (id in obj) {
        if (isImageData(obj[id])) { clean[id] = obj[id]; n++; }
      }
    }
    if (!n) return 0;
    var prev = data;
    var next = {};
    if (mode !== 'replace') for (id in prev) next[id] = prev[id];
    for (id in clean) next[id] = clean[id];
    data = next;
    if (!persist()) {
      data = prev;
      persist();
      return 0;
    }
    return n;
  }

  return {
    load: load, get: get, has: has, set: set, remove: remove,
    fromFile: fromFile, count: count, raw: raw, importAll: importAll,
    isImageData: isImageData
  };
})();
