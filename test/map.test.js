/* 地图逻辑测试：注入一个最小 Leaflet 桩（含 markerClusterGroup），
 * 让 map.js 走真实分支——分组、聚合图标着色、popup 内容、focus 展开簇。 */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { webcrypto } = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
  url: 'https://example.github.io/starbucks-city-mugs/',
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

/* ---- Leaflet 桩 ---- */
const created = { markers: [], clusterOpts: null, tileUrl: null, view: null, popupsOpened: [],
  singleAdds: 0, bulkAdds: 0, clears: 0, refreshes: 0, iconSets: 0 };
function Marker(latlng, opts) {
  this._latlng = latlng; this.options = opts || {}; this._popup = null; this._popupOpen = false;
  this._content = null;
  this.bindPopup = function (fn, o) { this._popup = { fn, o }; return this; };
  this.openPopup = function () { this._popupOpen = true; created.popupsOpened.push(this); return this; };
  this.isPopupOpen = function () { return this._popupOpen; };
  this.setPopupContent = function (h) { this._content = h; return this; };
  this.setIcon = function (i) { this.options.icon = i; created.iconSets++; return this; };
  this.addTo = function (l) { l.addLayer(this); return this; };
  created.markers.push(this);
}
function ClusterGroup(opts) {
  created.clusterOpts = opts;
  this._layers = [];
  this.addLayer = function (m) { created.singleAdds++; this._layers.push(m); return this; };
  this.addLayers = function (arr) { created.bulkAdds++; this._layers.push(...arr); return this; };
  this.clearLayers = function () { created.clears++; this._layers.forEach(m => { m._popupOpen = false; }); this._layers = []; return this; };
  this.refreshClusters = function () { created.refreshes++; return this; };
  this.addTo = function () { return this; };
  this.zoomToShowLayer = function (m, cb) { this._zoomed = m; cb(); };
}
window.L = {
  map: () => ({
    setView(v, z) { created.view = { v, z }; return this; },
    getZoom: () => 3,
    invalidateSize() {},
    addLayer() { return this; },
  }),
  tileLayer: (url) => { created.tileUrl = url; return { addTo() { return this; } }; },
  layerGroup: () => new ClusterGroup({}),
  markerClusterGroup: (o) => new ClusterGroup(o),
  marker: (ll, o) => new Marker(ll, o),
  divIcon: (o) => ({ __divIcon: o }),
};

for (const f of ['data.js', 'mugArt.js', 'auth.js', 'i18n.js', 'photos.js', 'collection.js', 'map.js', 'app.js']) {
  try { window.eval(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8')); }
  catch (e) { check('load ' + f, false, e.message); }
}

const M = window.MUG_DATA;
const $ = (id) => window.document.getElementById(id);
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

console.log('— 地图初始化 —');
check('使用聚合图层', created.clusterOpts !== null && created.clusterOpts.maxClusterRadius === 45);
check('底图为 https CDN', /^https:\/\//.test(created.tileUrl || ''), created.tileUrl);
check('地图未走离线降级', !$('map').textContent.includes('加载失败'));

console.log('— 图钉分组 —');
const uniquePlaces = new Set(M.map(m => m.city + '|' + m.country)).size;
check('图钉数 = 地点数 ' + uniquePlaces, created.markers.length === uniquePlaces, created.markers.length);
const totalGrouped = created.markers.length;
check('无重复坐标图钉', new Set(created.markers.map(m => m._latlng.join(','))).size === totalGrouped,
  totalGrouped - new Set(created.markers.map(m => m._latlng.join(','))).size + ' 重复');
check('图钉带收集状态供聚合着色', created.markers.every(m => typeof m.options.sbState === 'string'));
check('未收集时状态为 none', created.markers.every(m => m.options.sbState === 'none'));

console.log('— 聚合图标着色 —');
const iconFn = created.clusterOpts.iconCreateFunction;
const mkCluster = (states) => ({
  getAllChildMarkers: () => states.map(s => ({ options: { sbState: s } })),
  getChildCount: () => states.length,
});
check('全拥有 → 绿色簇', iconFn(mkCluster(['owned', 'owned'])).__divIcon.html.includes('cluster-owned'));
check('部分拥有 → 半色簇', iconFn(mkCluster(['owned', 'none'])).__divIcon.html.includes('cluster-partial'));
check('仅愿望单 → 金色簇', iconFn(mkCluster(['wish', 'none'])).__divIcon.html.includes('cluster-wish'));
check('全未收集 → 灰色簇', iconFn(mkCluster(['none', 'none'])).__divIcon.html.includes('cluster-none'));
check('簇上显示数量', iconFn(mkCluster(new Array(37).fill('none'))).__divIcon.html.includes('>37<'));

console.log('— popup 内容 —');
const withPopup = created.markers.find(m => m._popup);
const html = withPopup._popup.fn();
check('popup 有城市标题', html.includes('popup-city'));
check('popup 条目可点开详情', html.includes('data-action="open-mug"'));
check('popup 含 SVG 缩略图', html.includes('<svg'));

console.log('— 收集状态联动 —');
const target = M[0];
const sameCity = M.filter(m => m.city === target.city && m.country === target.country);
window.Collection.set(target.id, 'owned');
created.markers.length = 0;            /* 只看本次重绘产生的图钉 */
click(window.document.querySelector('[data-view="map"]'));
const mk = created.markers.find(m => m.options.title === (target.cityZh || target.city));
const expected = sameCity.length === 1 ? 'owned' : 'partial';
check('标记后图钉状态更新为 ' + expected, mk && mk.options.sbState === expected, mk && mk.options.sbState);
check('重绘产生完整图钉集', created.markers.length === uniquePlaces, created.markers.length);

console.log('— 批量加入与增量更新（v2 修复） —');
check('使用批量 addLayers 而非逐个 addLayer', created.bulkAdds > 0 && created.singleAdds === 0,
  'bulk=' + created.bulkAdds + ' single=' + created.singleAdds);

const c0 = { clears: created.clears, bulk: created.bulkAdds };
const mk2 = created.markers.find(m => m.options.sbKey);
mk2.openPopup();
created.iconSets = 0;
const target2 = M.find(m => m.city + '|' + m.country === mk2.options.sbKey);
window.Collection.set(target2.id, 'wish');
window.MapView.updateMug(target2);
check('增量更新未清空图层', created.clears === c0.clears, created.clears + ' vs ' + c0.clears);
check('增量更新未重新批量加入', created.bulkAdds === c0.bulk);
check('只重设了受影响图钉的图标', created.iconSets === 1, created.iconSets);
check('已打开的 popup 未被销毁', mk2.isPopupOpen() === true);
check('popup 内容已刷新', typeof mk2._content === 'string' && mk2._content.includes('popup-city'));
check('通知聚合层刷新该簇', created.refreshes >= 1);

console.log('— 定位到地图 —');
created.popupsOpened.length = 0;
window.MapView.focus(target);
check('setView 到该坐标', created.view && created.view.v[0] === target.lat && created.view.v[1] === target.lng,
  JSON.stringify(created.view));
check('聚合模式下展开簇再开 popup', created.popupsOpened.length === 1);

console.log('— 语言切换后重绘 —');
click($('btn-lang'));
const enMarker = created.markers[created.markers.length - 1];
check('图钉 title 跟随语言', /^[\x00-\x7F\s.'-]+$/.test(enMarker.options.title), enMarker.options.title);

console.log(failures === 0 ? '\n✅ 地图测试全部通过' : '\n❌ ' + failures + ' 项失败');
process.exit(failures === 0 ? 0 : 1);
