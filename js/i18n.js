/* 全站中英双语：t(key) 取当前语言文案，data-i18n / data-i18n-ph 驱动静态文案，
 * 动态文案由 app.js 等在渲染时取用。语言偏好存 localStorage。 */
'use strict';

window.I18N = (function () {
  var DICT = {
    zh: {
      'app.title': '星巴克城市杯 · 收集地图与图鉴',
      'brand.h1': '城市杯图鉴',
      'tab.map': '🗺️ 地图', 'tab.gallery': '📚 图鉴', 'tab.stats': '📊 统计',
      'btn.io': '⇅ 导入/导出', 'btn.share': '↗ 分享', 'btn.auth': '登录 / 注册', 'btn.logout': '退出',
      'share.pre': '👀 正在查看', 'share.post': '分享的收藏（只读）', 'btn.exitShare': '退出查看',
      'search.ph': '🔍 搜索城市 / 国家 / 地标…',
      'chip.mug': '☕ 马克杯', 'chip.ornament': '🎄 挂饰',
      'status.all': '全部状态', 'status.owned': '✅ 已拥有', 'status.wish': '💛 愿望单', 'status.none': '⬜ 未收集',
      'region.all': '全部地区', 'region.asia': '亚洲', 'region.europe': '欧洲',
      'region.north-america': '北美洲', 'region.latin-america': '拉丁美洲',
      'region.middle-east-africa': '中东与非洲', 'region.oceania': '大洋洲',
      'country.all': '全部国家',
      'sort.country': '按国家排序', 'sort.city': '按城市排序', 'sort.year': '按年份排序', 'sort.series': '按系列排序',
      'btn.reset': '重置', 'count.tpl': '显示 {a} / {b} 款',
      'legend.owned': '已拥有', 'legend.partial': '部分拥有', 'legend.wish': '愿望单', 'legend.none': '未收集',
      'empty': '😢 没有符合条件的杯子，试试放宽筛选条件',
      'auth.login': '登录', 'auth.register': '注册',
      'auth.username': '用户名', 'auth.password': '密码', 'auth.password2': '确认密码',
      'auth.usernamePh': '2-20 位，中英文/数字/下划线', 'auth.passwordPh': '至少 6 位',
      'auth.registerBtn': '注册并登录',
      'auth.hint': '⚠️ 账号数据保存在本浏览器（localStorage），不会上传服务器。请定期使用「导出」备份收藏记录。',
      'io.title': '导入 / 导出收藏',
      'io.exportTitle': '📤 导出', 'io.exportDesc': '将当前账号的收藏记录导出为 JSON 文件，可用于备份或迁移到其他设备。',
      'io.exportBtn': '下载收藏记录 (.json)',
      'io.importTitle': '📥 导入', 'io.importDesc': '选择之前导出的 JSON 文件，可选择与当前记录合并或完全覆盖。',
      'io.importBtn': '选择文件…',
      'shareM.title': '分享我的收藏', 'shareM.linkLabel': '收藏链接',
      'shareM.copy': '📋 复制链接', 'shareM.native': '📲 系统分享',
      'shareM.hint': '💡 链接中已编码你的收藏数据，对方打开即可看到你的收藏地图。部署到 GitHub Pages 后链接才能被他人访问。',
      'shareM.summary': '已拥有 <b>{o}</b> 款 · 愿望单 <b>{w}</b> 款。把下方链接发给朋友，对方可直接查看你的收藏地图。',
      'shareM.text': '我在星巴克城市杯图鉴收集了 {o}/{t} 款城市杯☕ 来看看我的收藏地图！',
      'shareM.anon': '一位收藏家', 'shareM.anonOwner': '匿名收藏家',
      'footer': '本站为粉丝自制项目，与 Starbucks Corporation 无关。杯款插画为原创示意图，非官方图片。数据由社区整理，可能存在遗漏或错误，欢迎补充。',
      'confirm.mergeTitle': '并入游客记录？', 'confirm.mergeBody': '检测到未登录时标记的 {n} 条记录，是否并入当前账号？',
      'confirm.merge': '并入', 'confirm.ignore': '忽略',
      'confirm.importTitle': '导入方式',
      'confirm.importBody': '「合并」保留现有记录并叠加导入内容；「覆盖」将清空现有记录后导入。',
      'confirm.mergeMode': '合并', 'confirm.replaceMode': '覆盖', 'confirm.cancel': '取消',
      'badge.owned': '✓ 已拥有', 'badge.wish': '♥ 愿望单',
      'type.mug': '马克杯', 'type.ornament': '挂饰',
      'act.own': '✓ 拥有', 'act.wish': '♥ 想要',
      'detail.landmark': '地标图案', 'detail.year': '发行年份', 'detail.yearVal': '约 {y} 年',
      'detail.region': '所在地区', 'detail.added': '收录日期', 'detail.unknown': '未知',
      'detail.own': '✓ 已拥有', 'detail.want': '♥ 想要', 'detail.locate': '📍 在地图上看',
      'detail.noteLabel': '备注（自动保存）', 'detail.notePh': '购入价格、地点、杯况……',
      'detail.refs': '实拍图与资料（外部链接）', 'detail.gimg': '📷 Google 实拍图', 'detail.wiki': '📖 收藏百科 Fandom',
      'photo.mine': '我的实拍照片', 'photo.upload': '📷 上传实拍照片', 'photo.replace': '🔄 换一张',
      'photo.delete': '🗑 删除照片', 'photo.art': '示意图', 'photo.by': '📷 照片由 {n} 提供', 'photo.hint': '照片仅保存在本浏览器，导出时会一并备份。',
      'toast.photoSaved': '📷 照片已保存', 'toast.photoRemoved': '照片已删除',
      'toast.photoFail': '照片处理失败：{m}',
      'toast.photoQuota': '⚠️ 浏览器存储空间不足，照片未能保存（可删除部分旧照片）',
      'err.notImage': '请选择图片文件', 'err.readFail': '图片读取失败',
      'io.photoNote': '（包含 {n} 张实拍照片）',
      'chip.guest': '游客',
      'map.offline': '🌐 地图组件加载失败（可能无网络）。图鉴与统计视图不受影响。',
      'stats.owned': '已拥有', 'stats.wish': '愿望单', 'stats.completion': '总完成度（共 {n} 款）',
      'stats.countries': '已集国家/地区', 'stats.seriesProgress': '系列进度', 'stats.regionDist': '地区分布',
      'stats.ownedOf': '已拥有 {a} / {b} 款',
      'stats.countryRank': '国家/地区排行（按杯款数）', 'stats.country': '国家/地区',
      'stats.ownedTotal': '已拥有 / 总数', 'stats.progress': '进度',
      'series.sub.global-icon': '全球典藏系列', 'series.sub.you-are-here': '城市地标系列',
      'series.sub.been-there': '足迹系列', 'series.sub.discovery': '探索系列',
      'detail.source': '🔗 在 starbucks-mugs.com 查看实物照片',
      'detail.sourceNote': '实物照片托管于收藏者数据库 starbucks-mugs.com（版权归该站所有），本站仅提供跳转链接。',
      'card.source': '实物照片',
      'gallery.more': '再加载 {n} 款（还剩 {r} 款）',
      'shareM.tooLong': '⚠️ 链接较长，个别平台可能会截断。若对方打开后显示异常，请改用「导入/导出」的 JSON 文件传给对方。',
      'toast.shareStale': '该分享链接由不同版本的杯款数据生成，无法准确还原，请让对方重新分享',
      'filter.toggle': '🔍 筛选',
      'toast.collected': '✓ 已收入「{c}」', 'toast.wished': '♥ 已加入愿望单「{c}」', 'toast.removed': '已移除「{c}」',
      'toast.readonly': '正在查看他人收藏，无法修改', 'toast.exitFirst': '正在查看他人收藏，请先退出查看',
      'toast.exported': '已导出收藏记录', 'toast.imported': '成功导入 {n} 条记录', 'toast.importFail': '导入失败：{m}',
      'toast.copied': '链接已复制，快去分享吧！', 'toast.copyFail': '复制失败，请手动复制',
      'toast.loggedOut': '已退出登录', 'toast.welcome': '欢迎，{n}！', 'toast.welcomeNew': '🎉 注册成功，欢迎，{n}！',
      'toast.merged': '已并入 {n} 条记录', 'toast.shareInvalid': '分享链接无效或已损坏',
      'toast.storage': '⚠️ 无法保存到浏览器存储（可能被禁用或已满），修改不会被记住',
      'err.nameInvalid': '用户名需 2-20 位，支持中英文、数字、下划线',
      'err.nameReserved': '该用户名为系统保留，请换一个',
      'err.pwShort': '密码至少 6 位', 'err.userExists': '用户名已存在，请直接登录',
      'err.userNotFound': '用户不存在', 'err.wrongPw': '密码错误', 'err.pwMismatch': '两次输入的密码不一致',
      'err.badJson': '文件不是有效的 JSON', 'err.notOurs': '不是本站导出的收藏记录文件',
      'toast.syncing': '☁️ 正在同步收藏…', 'toast.synced': '☁️ 已同步 {n} 条收藏',
      'toast.syncFail': '同步失败，收藏仍保存在本机', 'toast.cloudErr': '⚠️ 云端写入失败，本地已保存',
      'toast.confirmEmail': '📧 确认邮件已发出，请点开邮件里的链接完成注册',
      'err.badEmail': '请输入有效的邮箱地址', 'err.cloudDown': '云端暂时连不上，可先用本地模式',
      'auth.email': '邮箱', 'auth.emailPh': 'you@example.com',
      'auth.cloudHint': '☁️ 账号存于 Supabase，收藏会在你的设备间自动同步。',
      'auth.localHint': '⚠️ 账号数据保存在本浏览器（localStorage），不会上传服务器。请定期使用「导出」备份收藏记录。',
      'chip.special': '🎄 特别版', 'chip.specialTitle': '圣诞、季节限定、原型等，默认不显示',
      'stats.byType': '按类型', 'stats.mugs': '马克杯', 'stats.ornaments': '挂饰',
      'stats.specialNote': '（不含特别版；打开筛选栏的「🎄 特别版」可纳入统计）',
      'stats.scopeOn': '统计范围：{s}', 'stats.scopeOff': '未计入：{s}（已停产）',
      'stats.scopeNoSpecial': '未计入特别版（圣诞/季节限定）',
      'share.weibo': '微博',
      'map.satellite': '卫星影像', 'map.street': '街道地图', 'map.terrain': '地形',
      'lang.btn': 'EN'
    },
    en: {
      'app.title': 'Starbucks City Mugs · Collection Map & Catalog',
      'brand.h1': 'City Mug Catalog',
      'tab.map': '🗺️ Map', 'tab.gallery': '📚 Catalog', 'tab.stats': '📊 Stats',
      'btn.io': '⇅ Import/Export', 'btn.share': '↗ Share', 'btn.auth': 'Log in / Sign up', 'btn.logout': 'Log out',
      'share.pre': '👀 Viewing the collection of', 'share.post': '(read-only)', 'btn.exitShare': 'Exit view',
      'search.ph': '🔍 Search city / country / landmark…',
      'chip.mug': '☕ Mugs', 'chip.ornament': '🎄 Ornaments',
      'status.all': 'Any status', 'status.owned': '✅ Owned', 'status.wish': '💛 Wishlist', 'status.none': '⬜ Not collected',
      'region.all': 'All regions', 'region.asia': 'Asia', 'region.europe': 'Europe',
      'region.north-america': 'North America', 'region.latin-america': 'Latin America',
      'region.middle-east-africa': 'Middle East & Africa', 'region.oceania': 'Oceania',
      'country.all': 'All countries',
      'sort.country': 'Sort by country', 'sort.city': 'Sort by city', 'sort.year': 'Sort by year', 'sort.series': 'Sort by series',
      'btn.reset': 'Reset', 'count.tpl': 'Showing {a} of {b}',
      'legend.owned': 'Owned', 'legend.partial': 'Partially owned', 'legend.wish': 'Wishlist', 'legend.none': 'Not collected',
      'empty': '😢 Nothing matches these filters — try relaxing them',
      'auth.login': 'Log in', 'auth.register': 'Sign up',
      'auth.username': 'Username', 'auth.password': 'Password', 'auth.password2': 'Confirm password',
      'auth.usernamePh': '2–20 chars: letters, digits, _, Chinese', 'auth.passwordPh': 'At least 6 characters',
      'auth.registerBtn': 'Sign up & log in',
      'auth.hint': '⚠️ Accounts live in this browser (localStorage) and are never uploaded. Export regularly to back up your collection.',
      'io.title': 'Import / Export collection',
      'io.exportTitle': '📤 Export', 'io.exportDesc': 'Download your collection as a JSON file for backup or moving to another device.',
      'io.exportBtn': 'Download collection (.json)',
      'io.importTitle': '📥 Import', 'io.importDesc': 'Pick a previously exported JSON file, then choose merge or replace.',
      'io.importBtn': 'Choose file…',
      'shareM.title': 'Share my collection', 'shareM.linkLabel': 'Collection link',
      'shareM.copy': '📋 Copy link', 'shareM.native': '📲 System share',
      'shareM.hint': '💡 Your collection is encoded in the link — anyone opening it sees your map. The link works for others once the site is deployed to GitHub Pages.',
      'shareM.summary': 'Owned <b>{o}</b> · wishlist <b>{w}</b>. Send the link below to a friend to show your collection map.',
      'shareM.text': 'I have collected {o}/{t} Starbucks city mugs ☕ Check out my collection map!',
      'shareM.anon': 'A collector', 'shareM.anonOwner': 'Anonymous collector',
      'footer': 'Unofficial fan project, not affiliated with Starbucks Corporation. Mug artworks are original stylized illustrations, not official photos. Community-maintained data may contain errors — contributions welcome.',
      'confirm.mergeTitle': 'Merge guest records?', 'confirm.mergeBody': 'Found {n} records marked while logged out. Merge them into this account?',
      'confirm.merge': 'Merge', 'confirm.ignore': 'Ignore',
      'confirm.importTitle': 'Import mode',
      'confirm.importBody': '"Merge" keeps existing records and layers the import on top; "Replace" clears everything first.',
      'confirm.mergeMode': 'Merge', 'confirm.replaceMode': 'Replace', 'confirm.cancel': 'Cancel',
      'badge.owned': '✓ Owned', 'badge.wish': '♥ Wishlist',
      'type.mug': 'Mug', 'type.ornament': 'Ornament',
      'act.own': '✓ Own', 'act.wish': '♥ Want',
      'detail.landmark': 'Landmark', 'detail.year': 'Released', 'detail.yearVal': 'c. {y}',
      'detail.region': 'Region', 'detail.added': 'Added', 'detail.unknown': 'Unknown',
      'detail.own': '✓ Owned', 'detail.want': '♥ Want', 'detail.locate': '📍 Show on map',
      'detail.noteLabel': 'Notes (auto-saved)', 'detail.notePh': 'Price, where bought, condition…',
      'detail.refs': 'Real photos & references (external)', 'detail.gimg': '📷 Google Images', 'detail.wiki': '📖 Fandom wiki',
      'photo.mine': 'My photo', 'photo.upload': '📷 Upload a photo', 'photo.replace': '🔄 Replace',
      'photo.delete': '🗑 Delete photo', 'photo.art': 'Illustration', 'photo.by': '📷 Photo by {n}', 'photo.hint': 'Photos stay in this browser and are included in exports.',
      'toast.photoSaved': '📷 Photo saved', 'toast.photoRemoved': 'Photo deleted',
      'toast.photoFail': 'Could not process photo: {m}',
      'toast.photoQuota': '⚠️ Browser storage is full — photo not saved (try deleting older photos)',
      'err.notImage': 'Please choose an image file', 'err.readFail': 'Could not read the image',
      'io.photoNote': '(includes {n} photos)',
      'chip.guest': 'Guest',
      'map.offline': '🌐 Map failed to load (network?). Catalog and stats still work.',
      'stats.owned': 'Owned', 'stats.wish': 'Wishlist', 'stats.completion': 'Completion (of {n})',
      'stats.countries': 'Countries collected', 'stats.seriesProgress': 'Series progress', 'stats.regionDist': 'By region',
      'stats.ownedOf': 'Owned {a} / {b}',
      'stats.countryRank': 'Top countries (by designs)', 'stats.country': 'Country',
      'stats.ownedTotal': 'Owned / Total', 'stats.progress': 'Progress',
      'series.sub.global-icon': 'Global Icon Series', 'series.sub.you-are-here': 'You Are Here Collection',
      'series.sub.been-there': 'Been There Series', 'series.sub.discovery': 'Discovery Series',
      'detail.source': '🔗 See real photos on starbucks-mugs.com',
      'detail.sourceNote': 'Real photos are hosted by the collector database starbucks-mugs.com (their copyright); this site only links out.',
      'card.source': 'Real photos',
      'gallery.more': 'Load {n} more ({r} remaining)',
      'shareM.tooLong': '⚠️ This link is long and some platforms may truncate it. If it opens broken for the recipient, send them the JSON file from Import/Export instead.',
      'toast.shareStale': 'This share link was made with a different version of the mug data and cannot be decoded — ask them to share again',
      'filter.toggle': '🔍 Filters',
      'toast.collected': '✓ Added "{c}" to owned', 'toast.wished': '♥ Added "{c}" to wishlist', 'toast.removed': 'Removed "{c}"',
      'toast.readonly': "Viewing someone else's collection — read-only", 'toast.exitFirst': 'Exit the shared view first',
      'toast.exported': 'Collection exported', 'toast.imported': 'Imported {n} records', 'toast.importFail': 'Import failed: {m}',
      'toast.copied': 'Link copied — go share it!', 'toast.copyFail': 'Copy failed — please copy manually',
      'toast.loggedOut': 'Logged out', 'toast.welcome': 'Welcome, {n}!', 'toast.welcomeNew': '🎉 Account created — welcome, {n}!',
      'toast.merged': 'Merged {n} records', 'toast.shareInvalid': 'Share link is invalid or corrupted',
      'toast.storage': '⚠️ Cannot write to browser storage (blocked or full) — changes will not persist',
      'err.nameInvalid': 'Username: 2–20 chars (letters, digits, _, Chinese)',
      'err.nameReserved': 'That username is reserved — pick another',
      'err.pwShort': 'Password must be at least 6 characters', 'err.userExists': 'Username already exists — log in instead',
      'err.userNotFound': 'User not found', 'err.wrongPw': 'Wrong password', 'err.pwMismatch': 'Passwords do not match',
      'err.badJson': 'File is not valid JSON', 'err.notOurs': 'Not a collection file exported from this site',
      'toast.syncing': '☁️ Syncing your collection…', 'toast.synced': '☁️ Synced {n} records',
      'toast.syncFail': 'Sync failed — your collection is still saved locally',
      'toast.cloudErr': '⚠️ Cloud write failed; saved locally',
      'toast.confirmEmail': '📧 Confirmation email sent — click the link to finish signing up',
      'err.badEmail': 'Please enter a valid email address',
      'err.cloudDown': 'Cloud is unreachable right now; local mode still works',
      'auth.email': 'Email', 'auth.emailPh': 'you@example.com',
      'auth.cloudHint': '☁️ Accounts live in Supabase; your collection syncs across your devices.',
      'auth.localHint': '⚠️ Accounts live in this browser (localStorage) and are never uploaded. Export regularly to back up your collection.',
      'chip.special': '🎄 Special editions', 'chip.specialTitle': 'Christmas, seasonal and prototype releases — hidden by default',
      'stats.byType': 'By type', 'stats.mugs': 'Mugs', 'stats.ornaments': 'Ornaments',
      'stats.specialNote': '(excludes special editions — enable the 🎄 chip in the filter bar to include them)',
      'stats.scopeOn': 'Counting: {s}', 'stats.scopeOff': 'Excluded: {s} (discontinued)',
      'stats.scopeNoSpecial': 'Excluding special editions (Christmas / seasonal)',
      'share.weibo': 'Weibo',
      'map.satellite': 'Satellite', 'map.street': 'Street map', 'map.terrain': 'Terrain',
      'lang.btn': 'ZH'
    }
  };

  var lang = SafeStore.get('sbmug_lang');
  if (lang !== 'zh' && lang !== 'en') lang = 'en';   /* 默认英文 */

  function t(key) {
    return (DICT[lang] && DICT[lang][key]) || DICT.zh[key] || key;
  }

  /* 模板替换：tf('count.tpl', {a:1, b:2}) */
  function tf(key, params) {
    var s = t(key), k;
    for (k in params) s = s.split('{' + k + '}').join(String(params[k]));
    return s;
  }

  function apply() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = t('app.title');
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      el.placeholder = t(el.getAttribute('data-i18n-ph'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.title = t(el.getAttribute('data-i18n-title'));
    });
    var lb = document.getElementById('btn-lang');
    if (lb) lb.textContent = t('lang.btn');
  }

  function setLang(l) {
    if (l !== 'zh' && l !== 'en') return;
    lang = l;
    SafeStore.set('sbmug_lang', l);
    apply();
  }

  return {
    t: t, tf: tf, apply: apply, setLang: setLang,
    get lang() { return lang; }
  };
})();
