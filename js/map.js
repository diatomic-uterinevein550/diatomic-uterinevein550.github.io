/* Leaflet 地图视图：同城多杯合并为一个图钉，密集区聚合成簇。
 * 收藏状态变化时只更新受影响的那一个图钉，不重建整层。 */
'use strict';

window.MapView = (function () {
  var map = null;
  var layer = null;
  var ready = false;
  var markersByKey = {};
  var listByKey = {};

  function init() {
    var el = document.getElementById('map');
    if (typeof L === 'undefined') {
      el.innerHTML = '<div class="map-offline">' + window.escHtml(I18N.t('map.offline')) + '</div>';
      return;
    }
    map = L.map('map', {
      worldCopyJump: true,
      minZoom: 2,
      maxBounds: [[-78, -220], [86, 220]],
      maxBoundsViscosity: 0.6
    }).setView([28, 12], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 18
    }).addTo(map);

    /* 八百多个地点，用聚合层；插件没加载上就退回普通图层组 */
    if (L.markerClusterGroup) {
      layer = L.markerClusterGroup({
        maxClusterRadius: 45,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        disableClusteringAtZoom: 9,
        chunkedLoading: true,
        iconCreateFunction: function (cluster) {
          var kids = cluster.getAllChildMarkers();
          var owned = 0, any = 0, i, st;
          for (i = 0; i < kids.length; i++) {
            st = kids[i].options.sbState;
            if (st === 'owned') owned++;
            if (st !== 'none') any++;
          }
          var cls = owned === kids.length ? 'owned' : (owned > 0 ? 'partial' : (any > 0 ? 'wish' : 'none'));
          var n = cluster.getChildCount();
          var size = n < 10 ? 34 : (n < 100 ? 40 : 48);
          return L.divIcon({
            className: '',
            html: '<div class="cluster cluster-' + cls + '" style="width:' + size + 'px;height:' + size + 'px">' + n + '</div>',
            iconSize: [size, size]
          });
        }
      }).addTo(map);
    } else {
      layer = L.layerGroup().addTo(map);
    }
    ready = true;
  }

  function cityKey(m) { return m.city + '|' + m.country; }

  function pinClass(list) {
    var owned = 0, wish = 0, i, s;
    for (i = 0; i < list.length; i++) {
      s = App.statusOf(list[i].id);
      if (s === 'owned') owned++;
      else if (s === 'wish') wish++;
    }
    if (owned === list.length) return 'owned';
    if (owned > 0) return 'partial';
    if (wish > 0) return 'wish';
    return 'none';
  }

  function pinIcon(list, cls) {
    return L.divIcon({
      className: '',
      html: '<div class="pin pin-' + cls + '"><span>' + list.length + '</span></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 28],
      popupAnchor: [0, -26]
    });
  }

  function popupHTML(list) {
    var m0 = list[0];
    var esc = window.escHtml;
    var items = list.map(function (m) {
      return '<div class="popup-item" data-action="open-mug" data-id="' + esc(m.id) + '">' +
        '<div class="popup-thumb">' + MugArt.svg(m, 62) + '</div>' +
        '<div class="popup-meta"><b>' + esc(App.seriesName(m.series)) + '</b>' +
        '<span>' + (m.type === 'ornament' ? '🎄 ' : '☕ ') + esc(App.typeLabel(m)) +
        (m.year ? ' · ' + m.year : '') + '</span>' +
        (m.edition ? '<span class="popup-ed">' + esc(m.edition) + '</span>' : '') +
        App.statusBadge(m.id) + '</div></div>';
    }).join('');
    var sub = App.citySub(m0);
    return '<div class="popup"><div class="popup-city">' + esc(App.cityMain(m0)) +
      '<small>' + (sub ? esc(sub) + ' · ' : '') + esc(App.countryDisp(m0)) + '</small></div>' +
      '<div class="popup-list">' + items + '</div></div>';
  }

  function render(mugs) {
    if (!ready) return;
    layer.clearLayers();
    markersByKey = {};
    listByKey = {};

    var order = [];
    mugs.forEach(function (m) {
      var k = cityKey(m);
      if (!listByKey[k]) { listByKey[k] = []; order.push(k); }
      listByKey[k].push(m);
    });

    /* 不同地点撞在同一坐标时错开，杯款多的那个保留真实坐标（顺序稳定，与筛选无关） */
    order.sort(function (a, b) {
      return listByKey[b].length - listByKey[a].length || (a < b ? -1 : a > b ? 1 : 0);
    });

    var usedCoords = {};
    var batch = [];
    order.forEach(function (k) {
      var list = listByKey[k];
      var m0 = list[0];
      if (typeof m0.lat !== 'number' || typeof m0.lng !== 'number') return;
      var lat = m0.lat, lng = m0.lng;
      var ck = lat.toFixed(3) + ',' + lng.toFixed(3);
      var dup = usedCoords[ck] || 0;
      usedCoords[ck] = dup + 1;
      if (dup > 0) { lng += 0.09 * dup; lat -= 0.03 * dup; }

      var cls = pinClass(list);
      var mk = L.marker([lat, lng], {
        icon: pinIcon(list, cls),
        title: App.cityMain(m0),
        sbState: cls,
        sbKey: k
      });
      mk.bindPopup(function () { return popupHTML(listByKey[k] || list); }, { maxWidth: 330, minWidth: 250 });
      batch.push(mk);
      markersByKey[k] = mk;
    });

    /* 逐个 addLayer 会让 markercluster 每次重算整棵簇树；批量加入快一个数量级 */
    if (layer.addLayers) layer.addLayers(batch);
    else batch.forEach(function (mk) { layer.addLayer(mk); });
  }

  /* 只更新某个杯款所在地点的图钉，保留地图视野与已打开的 popup */
  function updateMug(m) {
    if (!ready || !m) return;
    var k = cityKey(m);
    var mk = markersByKey[k];
    var list = listByKey[k];
    if (!mk || !list) return;
    var cls = pinClass(list);
    mk.options.sbState = cls;
    mk.setIcon(pinIcon(list, cls));
    if (mk.isPopupOpen && mk.isPopupOpen()) mk.setPopupContent(popupHTML(list));
    if (layer.refreshClusters) layer.refreshClusters(mk);
  }

  function refresh() {
    if (ready && map) map.invalidateSize();
  }

  function focus(m) {
    if (!ready) return;
    map.setView([m.lat, m.lng], Math.max(map.getZoom(), 10), { animate: true });
    var mk = markersByKey[cityKey(m)];
    if (!mk) return;
    /* 聚合模式下需先展开所在簇，否则 popup 打不开 */
    if (layer.zoomToShowLayer) layer.zoomToShowLayer(mk, function () { mk.openPopup(); });
    else mk.openPopup();
  }

  return {
    init: init, render: render, updateMug: updateMug,
    refresh: refresh, focus: focus,
    isReady: function () { return ready; }
  };
})();
