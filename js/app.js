/* 主逻辑：筛选、图鉴/统计渲染、详情弹窗、账号、导入导出、分享与中英切换 */
'use strict';

(function () {
  var esc = window.escHtml;
  var DATA = window.MUG_DATA || [];
  var t = I18N.t, tf = I18N.tf;

  var SERIES_ALL = ['global-icon', 'you-are-here', 'been-there', 'discovery'];
  var TYPE_ALL = ['mug', 'ornament'];
  var SERIES = {
    'global-icon': { name: 'Global Icon', badge: 'b-gi' },
    'you-are-here': { name: 'You Are Here', badge: 'b-yah' },
    'been-there': { name: 'Been There', badge: 'b-bt' },
    'discovery': { name: 'Discovery', badge: 'b-dc' }
  };

  var state = {
    view: 'map',
    filtered: DATA.slice(),
    shareView: null,   /* {name, owned:Set, wish:Set} 查看他人收藏时 */
    filters: {
      q: '',
      series: new Set(SERIES_ALL),
      types: new Set(TYPE_ALL),
      status: 'all',
      region: 'all',
      country: 'all',
      sort: 'country'
    }
  };

  /* ---------- 小工具 ---------- */
  function $(id) { return document.getElementById(id); }

  function toast(msg, isErr) {
    var root = $('toast-root');
    var el = document.createElement('div');
    el.className = 'toast' + (isErr ? ' err' : '');
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; }, 2400);
    setTimeout(function () { el.remove(); }, 2900);
  }

  function showConfirm(title, body, buttons) {
    return new Promise(function (resolve) {
      $('confirm-title').textContent = title;
      $('confirm-body').textContent = body;
      var box = $('confirm-buttons');
      box.innerHTML = '';
      buttons.forEach(function (b) {
        var btn = document.createElement('button');
        btn.className = 'btn ' + (b.kind || 'plain');
        btn.textContent = b.label;
        btn.addEventListener('click', function () {
          $('modal-confirm').hidden = true;
          resolve(b.value);
        });
        box.appendChild(btn);
      });
      $('modal-confirm').hidden = false;
    });
  }

  function statusOf(id) {
    if (state.shareView) {
      if (state.shareView.owned.has(id)) return 'owned';
      if (state.shareView.wish.has(id)) return 'wish';
      return null;
    }
    return Collection.status(id);
  }

  function seriesName(s) { return SERIES[s] ? SERIES[s].name : s; }
  function typeLabel(m) { return t(m.type === 'ornament' ? 'type.ornament' : 'type.mug'); }

  /* 当前语言下的主/副显示名 */
  function cityMain(m) { return I18N.lang === 'en' ? m.city : (m.cityZh || m.city); }
  function citySub(m) {
    var sub = I18N.lang === 'en' ? m.cityZh : m.city;
    return (sub && sub !== cityMain(m)) ? sub : '';
  }
  function countryDisp(m) { return I18N.lang === 'en' ? m.country : (m.countryZh || m.country); }
  function landmarkDisp(m) {
    if (I18N.lang === 'en') return m.landmark || m.landmarkZh || '—';
    var zh = m.landmarkZh || m.landmark || '—';
    return zh + (m.landmark && m.landmark !== zh ? ' (' + m.landmark + ')' : '');
  }

  function statusBadge(id) {
    var s = statusOf(id);
    if (s === 'owned') return '<span class="badge b-owned">' + esc(t('badge.owned')) + '</span>';
    if (s === 'wish') return '<span class="badge b-wish">' + esc(t('badge.wish')) + '</span>';
    return '';
  }

  function findMug(id) {
    for (var i = 0; i < DATA.length; i++) if (DATA[i].id === id) return DATA[i];
    return null;
  }

  /* ---------- 筛选 ---------- */
  function applyFilters() {
    var f = state.filters;
    var q = f.q.trim().toLowerCase();
    state.filtered = DATA.filter(function (m) {
      if (!f.series.has(m.series)) return false;
      if (!f.types.has(m.type)) return false;
      if (f.region !== 'all' && m.region !== f.region) return false;
      if (f.country !== 'all' && m.country !== f.country) return false;
      if (f.status !== 'all') {
        var s = statusOf(m.id) || 'none';
        if (s !== f.status) return false;
      }
      if (q) {
        var hay = (m.city + ' ' + (m.cityZh || '') + ' ' + m.country + ' ' + (m.countryZh || '') + ' ' +
          (m.landmark || '') + ' ' + (m.landmarkZh || '')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    sortFiltered();
    var countText = tf('count.tpl', { a: state.filtered.length, b: DATA.length });
    $('result-count').textContent = countText;
    $('filter-toggle').textContent = t('filter.toggle') + ' · ' + countText;
    $('map-empty').hidden = state.filtered.length > 0;
    renderCurrentView();
  }

  function sortFiltered() {
    var s = state.filters.sort;
    var loc = I18N.lang === 'en' ? 'en' : 'zh';
    state.filtered.sort(function (a, b) {
      if (s === 'city') return cityMain(a).localeCompare(cityMain(b), loc);
      if (s === 'year') return (a.year || 0) - (b.year || 0) || a.city.localeCompare(b.city);
      if (s === 'series') return a.series.localeCompare(b.series) || a.country.localeCompare(b.country) || a.city.localeCompare(b.city);
      return countryDisp(a).localeCompare(countryDisp(b), loc) ||
        cityMain(a).localeCompare(cityMain(b), loc) || a.series.localeCompare(b.series);
    });
  }

  /* 芯片交互：全选状态下点某个＝只看它；取消最后一个＝恢复全选 */
  function chipToggle(set, all, value) {
    if (set.size === all.length) {
      set.clear();
      set.add(value);
    } else if (set.has(value)) {
      set.delete(value);
      if (!set.size) all.forEach(function (v) { set.add(v); });
    } else {
      set.add(value);
    }
  }

  function syncChips() {
    document.querySelectorAll('#f-series .chip').forEach(function (c) {
      c.classList.toggle('active', state.filters.series.has(c.dataset.value));
    });
    document.querySelectorAll('#f-type .chip').forEach(function (c) {
      c.classList.toggle('active', state.filters.types.has(c.dataset.value));
    });
  }

  function rebuildCountryOptions() {
    var sel = $('f-country');
    var region = state.filters.region;
    var seen = {}, list = [];
    DATA.forEach(function (m) {
      if (region !== 'all' && m.region !== region) return;
      if (!seen[m.country]) {
        seen[m.country] = true;
        list.push({ en: m.country, zh: m.countryZh || m.country });
      }
    });
    var enMode = I18N.lang === 'en';
    list.sort(function (a, b) {
      return enMode ? a.en.localeCompare(b.en, 'en') : a.zh.localeCompare(b.zh, 'zh');
    });
    var cur = state.filters.country;
    sel.innerHTML = '<option value="all">' + esc(t('country.all')) + '</option>' + list.map(function (c) {
      var label = enMode ? c.en : (c.zh + ' ' + c.en);
      return '<option value="' + esc(c.en) + '">' + esc(label) + '</option>';
    }).join('');
    sel.value = seen[cur] ? cur : 'all';
    state.filters.country = sel.value;
  }

  /* ---------- 视图渲染 ---------- */
  function switchView(v) {
    state.view = v;
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.view === v);
    });
    $('view-map').hidden = v !== 'map';
    $('view-gallery').hidden = v !== 'gallery';
    $('view-stats').hidden = v !== 'stats';
    renderCurrentView();
    if (v === 'map') MapView.refresh();
  }

  function renderCurrentView() {
    if (state.view === 'map') MapView.render(state.filtered);
    else if (state.view === 'gallery') renderGallery();
    else renderStats();
  }

  /* 有实拍照片就用照片，否则用风格化插画（分享只读模式不显示本机照片） */
  /* 社区贡献的实拍图（img/ 目录，由 tools/build_photos.py 生成索引） */
  function communityPhoto(m) {
    var idx = window.PHOTO_INDEX && window.PHOTO_INDEX[m.id];
    return idx && idx.src && idx.src.length ? idx.src[0] : null;
  }

  function artHTML(m, size) {
    var p = (state.shareView ? null : Photos.get(m.id)) || communityPhoto(m);
    if (p) {
      return '<img class="real-photo" src="' + esc(p) + '" alt="' + esc(cityMain(m)) + '" ' +
        'style="max-width:' + size + 'px;max-height:' + Math.round(size * 220 / 260) + 'px">';
    }
    return MugArt.svg(m, size);
  }

  function cardHTML(m) {
    var s = statusOf(m.id);
    var sMeta = SERIES[m.series] || { name: m.series, badge: 'b-type' };
    var sub = citySub(m);
    var hasPhoto = !state.shareView && Photos.has(m.id);
    return '<article class="card" data-action="open-mug" data-id="' + esc(m.id) + '">' +
      '<div class="card-art">' + artHTML(m, 150) +
      (hasPhoto ? '<span class="photo-flag" title="' + esc(t('photo.mine')) + '">📷</span>' : '') + '</div>' +
      '<div class="card-body">' +
      '<div class="card-title">' + esc(cityMain(m)) + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</div>' +
      '<div class="card-sub">' + esc(countryDisp(m)) + (m.year ? ' · ' + m.year : '') + '</div>' +
      '<div class="card-badges">' +
      '<span class="badge ' + sMeta.badge + '">' + esc(sMeta.name) + '</span>' +
      '<span class="badge b-type">' + esc(typeLabel(m)) + '</span>' +
      (m.edition ? '<span class="badge b-ed">' + esc(m.edition) + '</span>' : '') +
      statusBadge(m.id) +
      '</div></div>' +
      '<div class="card-actions">' +
      '<button class="stbtn' + (s === 'owned' ? ' on-owned' : '') + '" data-action="set-status" data-status="owned" data-id="' + esc(m.id) + '">' + esc(t('act.own')) + '</button>' +
      '<button class="stbtn' + (s === 'wish' ? ' on-wish' : '') + '" data-action="set-status" data-status="wish" data-id="' + esc(m.id) + '">' + esc(t('act.wish')) + '</button>' +
      '</div></article>';
  }

  /* 数据集有两千多款，图鉴分批渲染，避免一次性插入上千个 SVG 卡死页面 */
  var PAGE = 120;
  var shown = 0;

  function renderGallery(reset) {
    var grid = $('gallery-grid');
    if (reset !== false) { shown = 0; grid.innerHTML = ''; }
    var next = state.filtered.slice(shown, shown + PAGE);
    if (next.length) {
      var frag = document.createElement('div');
      frag.innerHTML = next.map(cardHTML).join('');
      while (frag.firstChild) grid.appendChild(frag.firstChild);
      shown += next.length;
    }
    $('gallery-empty').hidden = state.filtered.length > 0;
    var more = $('gallery-more');
    var rest = state.filtered.length - shown;
    more.hidden = rest <= 0;
    if (rest > 0) more.textContent = tf('gallery.more', { n: Math.min(PAGE, rest), r: rest });
  }

  function onGalleryScroll() {
    var v = $('view-gallery');
    if (state.view !== 'gallery' || shown >= state.filtered.length) return;
    if (v.scrollTop + v.clientHeight >= v.scrollHeight - 400) renderGallery(false);
  }

  /* ---------- 统计 ---------- */
  function renderStats() {
    var owned = 0, wish = 0;
    var ownedCountries = {}, allCountries = {};
    var bySeries = {}, byRegion = {};
    DATA.forEach(function (m) {
      var s = statusOf(m.id);
      var cn = countryDisp(m);
      if (!bySeries[m.series]) bySeries[m.series] = { total: 0, owned: 0 };
      bySeries[m.series].total++;
      if (!byRegion[m.region]) byRegion[m.region] = { total: 0, owned: 0 };
      byRegion[m.region].total++;
      if (!allCountries[cn]) allCountries[cn] = { total: 0, owned: 0 };
      allCountries[cn].total++;
      if (s === 'owned') {
        owned++;
        bySeries[m.series].owned++;
        byRegion[m.region].owned++;
        allCountries[cn].owned++;
        ownedCountries[cn] = true;
      } else if (s === 'wish') wish++;
    });
    var pct = DATA.length ? Math.round(owned * 100 / DATA.length) : 0;

    var html = '<div class="stat-cards">' +
      '<div class="stat-card"><div class="num">' + owned + '</div><div class="lbl">' + esc(t('stats.owned')) + '</div></div>' +
      '<div class="stat-card"><div class="num">' + wish + '</div><div class="lbl">' + esc(t('stats.wish')) + '</div></div>' +
      '<div class="stat-card"><div class="num">' + pct + '%</div><div class="lbl">' + esc(tf('stats.completion', { n: DATA.length })) + '</div></div>' +
      '<div class="stat-card"><div class="num">' + Object.keys(ownedCountries).length + '</div><div class="lbl">' + esc(t('stats.countries')) + '</div></div>' +
      '</div>';

    html += '<h3>' + esc(t('stats.seriesProgress')) + '</h3>';
    SERIES_ALL.forEach(function (k) {
      var v = bySeries[k] || { total: 0, owned: 0 };
      var p = v.total ? Math.round(v.owned * 100 / v.total) : 0;
      html += '<div class="series-row"><div class="sname">' + esc(SERIES[k].name) + ' · ' + esc(t('series.sub.' + k)) + '</div>' +
        '<div class="pbar"><i style="width:' + p + '%"></i></div>' +
        '<div class="pnum">' + v.owned + ' / ' + v.total + '</div></div>';
    });

    html += '<h3>' + esc(t('stats.regionDist')) + '</h3><div class="region-grid">';
    ['asia', 'europe', 'north-america', 'latin-america', 'middle-east-africa', 'oceania'].forEach(function (r) {
      var v = byRegion[r];
      if (!v) return;
      html += '<div class="region-cell"><b>' + esc(t('region.' + r)) + '</b>' + esc(tf('stats.ownedOf', { a: v.owned, b: v.total })) + '</div>';
    });
    html += '</div>';

    var countries = Object.keys(allCountries).map(function (c) {
      return { name: c, total: allCountries[c].total, owned: allCountries[c].owned };
    }).sort(function (a, b) { return b.total - a.total || b.owned - a.owned; }).slice(0, 15);
    html += '<h3>' + esc(t('stats.countryRank')) + '</h3><table class="country-table"><tr><th>' + esc(t('stats.country')) + '</th><th>' + esc(t('stats.ownedTotal')) + '</th><th class="bar-cell">' + esc(t('stats.progress')) + '</th></tr>';
    countries.forEach(function (c) {
      var p = c.total ? Math.round(c.owned * 100 / c.total) : 0;
      html += '<tr><td>' + esc(c.name) + '</td><td>' + c.owned + ' / ' + c.total + '</td>' +
        '<td class="bar-cell"><div class="mini-bar"><i style="width:' + p + '%"></i></div></td></tr>';
    });
    html += '</table>';
    $('stats-wrap').innerHTML = html;
  }

  /* ---------- 详情弹窗 ---------- */
  var currentMugId = null;

  function sourceUrl(m) {
    return m.src ? 'https://starbucks-mugs.com/mug/' + encodeURIComponent(m.src) + '/' : null;
  }

  function refLinksHTML(m) {
    var q = 'Starbucks ' + seriesName(m.series) + ' ' + m.city + (m.type === 'ornament' ? ' ornament' : ' mug');
    var gimg = 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(q);
    var src = sourceUrl(m);
    var html = '<div class="note-label">' + esc(t('detail.refs')) + '</div><div class="ref-links">';
    if (src) html += '<a class="pbtn primary" target="_blank" rel="noopener" href="' + esc(src) + '">' + esc(t('detail.source')) + '</a>';
    html += '<a class="pbtn" target="_blank" rel="noopener" href="' + esc(gimg) + '">' + esc(t('detail.gimg')) + '</a></div>';
    if (src) html += '<p class="form-hint">' + esc(t('detail.sourceNote')) + '</p>';
    return html;
  }

  function detailSubline(m) {
    if (I18N.lang === 'en') {
      var sub = citySub(m);
      return (sub ? esc(sub) + ' · ' : '') + esc(m.country);
    }
    return esc(m.city) + ' · ' + esc(m.countryZh || m.country) + ' ' + esc(m.country);
  }

  function openMug(id) {
    var m = findMug(id);
    if (!m) return;
    currentMugId = id;
    var s = statusOf(id);
    var entry = state.shareView ? null : Collection.entry(id);
    var sMeta = SERIES[m.series] || { name: m.series, badge: 'b-type' };
    var photo = (state.shareView ? null : Photos.get(id)) || communityPhoto(m);
    var isCommunity = !photo || photo === communityPhoto(m);
    var credit = window.PHOTO_INDEX && window.PHOTO_INDEX[id] && window.PHOTO_INDEX[id].credit;
    var html = '<div class="mug-detail">' +
      '<div class="mug-detail-art">' +
      (photo ? '<img class="real-photo big" src="' + esc(photo) + '" alt="' + esc(cityMain(m)) + '">' : MugArt.svg(m, 250)) +
      '<div class="art-caption">' +
      esc(photo ? (isCommunity && credit ? tf('photo.by', { n: credit.by }) : t('photo.mine')) : t('photo.art')) +
      '</div>' +
      (state.shareView ? '' :
        '<div class="photo-actions">' +
        '<button class="btn tiny ghost" data-action="photo-pick" data-id="' + esc(id) + '">' +
        esc(photo ? t('photo.replace') : t('photo.upload')) + '</button>' +
        (photo ? '<button class="btn tiny ghost" data-action="photo-del" data-id="' + esc(id) + '">' + esc(t('photo.delete')) + '</button>' : '') +
        '</div>') +
      '</div>' +
      '<div class="mug-detail-info">' +
      '<h2>' + esc(cityMain(m)) + '</h2>' +
      '<div class="en">' + detailSubline(m) + '</div>' +
      '<div class="card-badges">' +
      '<span class="badge ' + sMeta.badge + '">' + esc(sMeta.name) + ' ' + esc(t('series.sub.' + m.series)) + '</span>' +
      '<span class="badge b-type">' + (m.type === 'ornament' ? '🎄 ' : '☕ ') + esc(typeLabel(m)) + '</span>' +
      (m.edition ? '<span class="badge b-ed">' + esc(m.edition) + '</span>' : '') +
      statusBadge(id) + '</div>' +
      (Photos.isImageData(m.photo) || /^https:\/\//.test(m.photo || '') ?
        '<img class="mug-detail-photo" src="' + esc(m.photo) + '" alt="photo">' : '') +
      '<dl class="kv">' +
      '<dt>' + esc(t('detail.landmark')) + '</dt><dd>' + esc(landmarkDisp(m)) + '</dd>' +
      '<dt>' + esc(t('detail.year')) + '</dt><dd>' + (m.year ? esc(tf('detail.yearVal', { y: m.year })) : esc(t('detail.unknown'))) + '</dd>' +
      '<dt>' + esc(t('detail.region')) + '</dt><dd>' + esc(t('region.' + m.region)) + '</dd>' +
      (entry && entry.d && entry.s ? '<dt>' + esc(t('detail.added')) + '</dt><dd>' + esc(entry.d) + '</dd>' : '') +
      '</dl>';
    if (!state.shareView) {
      html += '<div class="detail-actions">' +
        '<button class="stbtn' + (s === 'owned' ? ' on-owned' : '') + '" data-action="set-status" data-status="owned" data-id="' + esc(id) + '">' + esc(t('detail.own')) + '</button>' +
        '<button class="stbtn' + (s === 'wish' ? ' on-wish' : '') + '" data-action="set-status" data-status="wish" data-id="' + esc(id) + '">' + esc(t('detail.want')) + '</button>' +
        '<button class="stbtn" data-action="locate" data-id="' + esc(id) + '">' + esc(t('detail.locate')) + '</button>' +
        '</div>' +
        '<label class="note-label" for="note-input">' + esc(t('detail.noteLabel')) + '</label>' +
        '<textarea class="note-box" id="note-input" placeholder="' + esc(t('detail.notePh')) + '">' + esc(entry && entry.n ? entry.n : '') + '</textarea>';
    } else {
      html += '<div class="detail-actions"><button class="stbtn" data-action="locate" data-id="' + esc(id) + '">' + esc(t('detail.locate')) + '</button></div>';
    }
    html += refLinksHTML(m) + '</div></div>';
    $('mug-detail').innerHTML = html;
    $('modal-mug').hidden = false;
    var note = $('note-input');
    if (note) {
      note.addEventListener('input', function () {
        if (state.shareView) return;   /* 详情框开着时进入只读模式，备注也要停写 */
        Collection.setNote(id, note.value);
      });
    }
  }

  function setStatus(id, s) {
    if (state.shareView) { toast(t('toast.readonly'), true); return; }
    var cur = Collection.status(id);
    if (cur === s) Collection.remove(id);
    else Collection.set(id, s);
    patchMug(id);
    var now = Collection.status(id);
    var m = findMug(id);
    var label = m ? cityMain(m) : id;
    if (now === 'owned') toast(tf('toast.collected', { c: label }));
    else if (now === 'wish') toast(tf('toast.wished', { c: label }));
    else toast(tf('toast.removed', { c: label }));
  }

  /* 单个杯款状态变化：只补这一张卡片和它所在的图钉，
   * 不重建整个图鉴（会丢掉已加载的分页与滚动位置）或整层地图。 */
  function patchMug(id) {
    updateUserChip();
    var m = findMug(id);
    var card = $('gallery-grid').querySelector('.card[data-id="' + id + '"]');
    if (card && m) {
      var tmp = document.createElement('div');
      tmp.innerHTML = cardHTML(m);
      card.replaceWith(tmp.firstChild);
    }
    if (m && state.view === 'map') MapView.updateMug(m);
    if (state.view === 'stats') renderStats();
    if (!$('modal-mug').hidden && currentMugId) openMug(currentMugId);
    /* 正在按收集状态筛选时，改状态会改变结果集，必须整体重算 */
    if (state.filters.status !== 'all') applyFilters();
  }

  /* 收藏批量变化（导入、登录、退出）时的整体刷新 */
  function refreshAfterChange() {
    updateUserChip();
    renderCurrentView();
    if (!$('modal-mug').hidden && currentMugId) openMug(currentMugId);
  }

  /* ---------- 账号 ---------- */
  function updateUserChip() {
    var chip = $('user-chip');
    var c = Collection.counts();
    if (state.shareView) {
      chip.hidden = true;
      $('btn-auth').hidden = true;
      $('btn-logout').hidden = true;
      return;
    }
    var u = Collection.currentUser();
    chip.hidden = false;
    chip.innerHTML = (u ? '👤 <b>' + esc(u) + '</b>' : '👤 ' + esc(t('chip.guest'))) +
      ' · ✓' + c.owned + ' ♥' + c.wish;
    $('btn-auth').hidden = !!u;
    $('btn-logout').hidden = !u;
  }

  function afterLogin(name, isNew) {
    Collection.load(name);
    Photos.load(name);
    $('modal-auth').hidden = true;
    var gc = Collection.mergeableGuestCount();
    var done = function () {
      updateUserChip();
      applyFilters();
      toast(tf(isNew ? 'toast.welcomeNew' : 'toast.welcome', { n: name }));
    };
    if (gc > 0) {
      showConfirm(t('confirm.mergeTitle'), tf('confirm.mergeBody', { n: gc }),
        [{ label: t('confirm.merge'), value: 'yes', kind: 'solid' }, { label: t('confirm.ignore'), value: 'no' }]
      ).then(function (v) {
        if (v === 'yes') {
          var n = Collection.adoptGuest();
          toast(tf('toast.merged', { n: n }));
        }
        done();
      });
    } else done();
  }

  /* ---------- 导入导出 ---------- */
  function doExport() {
    var blob = new Blob([Collection.exportJSON()], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'starbucks-mugs-' + (Collection.currentUser() || 'guest') + '-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast(t('toast.exported'));
  }

  function handleImportFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var text = reader.result;
      showConfirm(t('confirm.importTitle'), t('confirm.importBody'),
        [{ label: t('confirm.mergeMode'), value: 'merge', kind: 'solid' },
         { label: t('confirm.replaceMode'), value: 'replace', kind: 'danger' },
         { label: t('confirm.cancel'), value: 'cancel' }]
      ).then(function (mode) {
        if (mode === 'cancel') return;
        try {
          var r = Collection.importJSON(text, mode);
          $('modal-io').hidden = true;
          refreshAfterChange();
          toast(tf('toast.imported', { n: r.records }) +
            (r.photos ? ' ' + tf('io.photoNote', { n: r.photos }) : ''));
        } catch (e) {
          toast(tf('toast.importFail', { m: e.message }), true);
        }
      });
    };
    reader.readAsText(file);
  }

  /* ---------- 分享 ---------- */
  function baseUrl() {
    return location.href.split('#')[0];
  }

  function openShare() {
    if (state.shareView) { toast(t('toast.exitFirst'), true); return; }
    var c = Collection.counts();
    var name = Collection.currentUser() || t('shareM.anon');
    var url = baseUrl() + '#share=' + Share.encodeCollection(name, Collection.raw());
    var text = tf('shareM.text', { o: c.owned, t: DATA.length });
    $('share-summary').innerHTML = tf('shareM.summary', { o: c.owned, w: c.wish });
    $('share-url').value = url;
    $('btn-share-native').hidden = !navigator.share;
    var links = {
      weibo: 'https://service.weibo.com/share/share.php?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(text),
      x: 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url),
      facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url),
      telegram: 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text),
      whatsapp: 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + url)
    };
    document.querySelectorAll('.pbtn[data-platform]').forEach(function (a) {
      a.href = links[a.dataset.platform] || '#';
    });
    /* 少数平台对 URL 长度很敏感，超长时提醒改用导出文件 */
    $('share-toolong').hidden = url.length <= 1800;
    $('modal-share').hidden = false;
  }

  function copyShareUrl() {
    var input = $('share-url');
    var done = function () { toast(t('toast.copied')); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(input.value).then(done, function () { fallbackCopy(input, done); });
    } else fallbackCopy(input, done);
  }
  function fallbackCopy(input, done) {
    input.select();
    try { document.execCommand('copy'); done(); }
    catch (e) { toast(t('toast.copyFail'), true); }
  }

  function nativeShare() {
    var c = Collection.counts();
    navigator.share({
      title: t('app.title'),
      text: tf('shareM.text', { o: c.owned, t: DATA.length }),
      url: $('share-url').value
    }).catch(function () { /* 用户取消 */ });
  }

  /* ---------- 查看他人分享 ---------- */
  function checkShareHash() {
    var h = location.hash;
    if (h.indexOf('#share=') === 0) {
      var sv = Share.decodeShare(h.slice(7));
      if (sv && sv.stale) {
        toast(t('toast.shareStale'), true);
        return;
      }
      if (sv) {
        state.shareView = sv;
        $('share-owner').textContent = sv.name || t('shareM.anonOwner');
        $('share-banner').hidden = false;
        updateUserChip();
        applyFilters();
        /* 详情框开着时进入只读模式，要重绘掉里面的编辑控件 */
        if (!$('modal-mug').hidden && currentMugId) openMug(currentMugId);
        return;
      }
      toast(t('toast.shareInvalid'), true);
    }
  }

  function exitShareView() {
    state.shareView = null;
    $('share-banner').hidden = true;
    if (location.hash) history.replaceState(null, '', baseUrl());
    updateUserChip();
    applyFilters();
  }

  /* ---------- 语言切换 ---------- */
  function onLangChanged() {
    I18N.apply();
    rebuildCountryOptions();
    updateUserChip();
    if (state.shareView) $('share-owner').textContent = state.shareView.name || t('shareM.anonOwner');
    applyFilters();
    if (!$('modal-mug').hidden && currentMugId) openMug(currentMugId);
    if (!$('modal-share').hidden) openShare();
  }

  /* ---------- 事件绑定 ---------- */
  function closeModals() {
    document.querySelectorAll('.modal-backdrop').forEach(function (m) {
      if (m.id !== 'modal-confirm') m.hidden = true;
    });
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) {
      if (e.target.classList && e.target.classList.contains('modal-backdrop') && e.target.id !== 'modal-confirm') {
        e.target.hidden = true;
      }
      return;
    }
    var act = el.dataset.action;
    switch (act) {
      case 'tab': switchView(el.dataset.view); break;
      case 'open-mug': openMug(el.dataset.id); break;
      case 'set-status': setStatus(el.dataset.id, el.dataset.status); break;
      case 'locate': {
        var m = findMug(el.dataset.id);
        if (m) { closeModals(); switchView('map'); MapView.focus(m); }
        break;
      }
      case 'close-modal': closeModals(); break;
      case 'chip-series':
        chipToggle(state.filters.series, SERIES_ALL, el.dataset.value);
        syncChips();
        applyFilters();
        break;
      case 'chip-type':
        chipToggle(state.filters.types, TYPE_ALL, el.dataset.value);
        syncChips();
        applyFilters();
        break;
      case 'reset-filters': resetFilters(); break;
      case 'auth-open':
        $('login-error').textContent = '';
        $('register-error').textContent = '';
        $('modal-auth').hidden = false;
        break;
      case 'auth-tab': {
        var tab = el.dataset.tab;
        document.querySelectorAll('.auth-tab').forEach(function (b) {
          b.classList.toggle('active', b.dataset.tab === tab);
        });
        $('form-login').hidden = tab !== 'login';
        $('form-register').hidden = tab !== 'register';
        break;
      }
      case 'logout':
        Auth.logout();
        Collection.load(null);
        Photos.load(null);
        updateUserChip();
        applyFilters();
        toast(t('toast.loggedOut'));
        break;
      case 'io-open':
        if (state.shareView) { toast(t('toast.exitFirst'), true); break; }
        $('modal-io').hidden = false;
        break;
      case 'export': doExport(); break;
      case 'import-trigger': $('import-file').click(); break;
      case 'photo-pick': {
        if (state.shareView) { toast(t('toast.readonly'), true); break; }
        var pf = $('photo-file');
        pf.dataset.target = el.dataset.id;
        pf.click();
        break;
      }
      case 'photo-del':
        if (state.shareView) { toast(t('toast.readonly'), true); break; }
        Photos.remove(el.dataset.id);
        patchMug(el.dataset.id);
        toast(t('toast.photoRemoved'));
        break;
      case 'share-open': openShare(); break;
      case 'share-copy': copyShareUrl(); break;
      case 'share-native': nativeShare(); break;
      case 'exit-share-view': exitShareView(); break;
      case 'toggle-lang':
        I18N.setLang(I18N.lang === 'zh' ? 'en' : 'zh');
        onLangChanged();
        break;
      case 'load-more': renderGallery(false); break;
      case 'toggle-filters': {
        var open = $('filterbar').classList.toggle('open');
        el.setAttribute('aria-expanded', open ? 'true' : 'false');
        MapView.refresh();
        break;
      }
    }
  });

  function resetFilters() {
    var f = state.filters;
    f.q = ''; $('f-search').value = '';
    f.series = new Set(SERIES_ALL);
    f.types = new Set(TYPE_ALL);
    f.status = 'all'; $('f-status').value = 'all';
    f.region = 'all'; $('f-region').value = 'all';
    f.country = 'all';
    syncChips();
    rebuildCountryOptions();
    applyFilters();
  }

  /* 两千多条数据，每敲一个键都全量筛选 + 重绘会明显卡顿，做防抖 */
  var searchTimer = null;
  $('f-search').addEventListener('input', function () {
    var v = this.value;
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      searchTimer = null;
      state.filters.q = v;
      applyFilters();
    }, 180);
  });
  $('f-status').addEventListener('change', function () { state.filters.status = this.value; applyFilters(); });
  $('f-region').addEventListener('change', function () {
    state.filters.region = this.value;
    rebuildCountryOptions();
    applyFilters();
  });
  $('f-country').addEventListener('change', function () { state.filters.country = this.value; applyFilters(); });
  $('f-sort').addEventListener('change', function () { state.filters.sort = this.value; applyFilters(); });

  $('form-login').addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(this);
    Auth.login(fd.get('username'), fd.get('password')).then(function (name) {
      afterLogin(name, false);
    }, function (err) { $('login-error').textContent = err.message; });
  });

  $('form-register').addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(this);
    if (fd.get('password') !== fd.get('password2')) {
      $('register-error').textContent = t('err.pwMismatch');
      return;
    }
    Auth.register(fd.get('username'), fd.get('password')).then(function (name) {
      afterLogin(name, true);
    }, function (err) { $('register-error').textContent = err.message; });
  });

  $('import-file').addEventListener('change', function () {
    if (this.files && this.files[0]) handleImportFile(this.files[0]);
    this.value = '';
  });

  $('photo-file').addEventListener('change', function () {
    var id = this.dataset.target;
    var file = this.files && this.files[0];
    this.value = '';
    if (!file || !id) return;
    if (state.shareView) { toast(t('toast.readonly'), true); return; }
    Photos.fromFile(file).then(function (uri) {
      if (Photos.set(id, uri)) {
        patchMug(id);
        toast(t('toast.photoSaved'));
      } else {
        toast(t('toast.photoQuota'), true);
      }
    }, function (err) {
      toast(tf('toast.photoFail', { m: err.message }), true);
    });
  });

  $('view-gallery').addEventListener('scroll', onGalleryScroll, { passive: true });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModals();
  });

  window.addEventListener('hashchange', function () {
    if (location.hash.indexOf('#share=') === 0) checkShareHash();
    else if (state.shareView) exitShareView();  /* 浏览器后退移除 hash 时同步退出只读模式 */
  });

  window.addEventListener('sbmug:storage-error', function () {
    toast(t('toast.storage'), true);
  });

  /* 供 map.js 调用 */
  window.App = {
    statusOf: statusOf, seriesName: seriesName, statusBadge: statusBadge,
    cityMain: cityMain, citySub: citySub, countryDisp: countryDisp, typeLabel: typeLabel
  };

  /* ---------- 启动 ---------- */
  I18N.apply();
  Collection.load(Auth.current());
  Photos.load(Auth.current());
  MapView.init();
  rebuildCountryOptions();
  updateUserChip();
  checkShareHash();
  applyFilters();
})();
