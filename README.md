# ☕ 星巴克城市杯 · 收集地图与图鉴

> Starbucks City Mugs — Collection Map & Catalog（中英双语 / bilingual）

一个托管在 GitHub Pages 上的纯静态网站，用于收集和展示星巴克四大城市杯系列：

- **Global Icon / Icon Series**（全球典藏，448 款）
- **You Are Here**（城市地标，562 杯 + 172 挂饰）
- **Been There**（足迹，472 杯 + 163 挂饰）
- **Discovery Series**（探索，177 杯 + 142 挂饰）

共 **2136 款 / 92 个国家与地区 / 785 个地点**，其中挂饰 477 款覆盖 59 个国家。
杯款清单直接来自 starbucks-mugs.com 官方 sitemap，不是模型编的——详见
**[DATA-SOURCES.md](DATA-SOURCES.md)**。

## ✨ 功能

| 功能 | 说明 |
| --- | --- |
| 🗺️ 收集地图 | **卫星影像底图**（可切街道图/地形图），标出 785 个地点，密集区自动聚合成簇（簇色反映收集进度），放大后展开；点图钉查看该地所有杯款 |
| 📷 实拍照片 | **给自己的杯子拍照上传**，自动压缩后存本地；有照片的杯款在图鉴与详情页直接显示实物，卡片右上角有 📷 角标 |
| 🔗 实物页面直链 | 每款杯子详情页有绿色主按钮，直接跳转到它在 starbucks-mugs.com 的原始页面看实拍照片与资料 |
| 🎨 地点专属插画 | **785 个地点各有一张原创插画**，按该地实际地标绘制——西雅图画太空针、罗马画斗兽场、桂林画漓江喀斯特、南达科他画拉什莫尔、休斯顿画火箭。没有任何两个地点共用同一张图 |
| ☕ 杯型风格 | 插画嵌进各系列的杯身样式：Global Icon 白杯画带 / You Are Here 彩杯白框 / Been There 浮雕拼贴 / Discovery 彩绘拱窗 / 挂饰圆球 |
| 🌐 中英切换 | **默认英文**，顶栏 `EN / ZH` 一键切换。英文模式下界面不出现任何中文（含数据里的中文城市名），有自动化测试守着 |
| 🎄 特别版开关 | 圣诞、季节限定、原型等 155 款**默认隐藏**——这些基本已经收不到，算进完成度只会让分母永远差一截。需要时点筛选栏的虚线标签纳入 |
| 🔍 多维筛选 | 按城市/国家/地标搜索；按系列、类型（杯子/挂饰）、地区、国家、收集状态过滤。系列与类型标签为「点一下只看它，再点恢复全部」 |
| ☁️ 云端账号 | 已接入 Supabase：邮箱注册登录，收藏在设备间自动同步；行级安全保证每人只能读写自己的数据。本地仍留完整副本，断网照常可用。配置见 [SUPABASE-SETUP.md](SUPABASE-SETUP.md) |
| 📤 导入/导出 | 收藏记录（含实拍照片）一键导出 JSON 备份，可在其他设备导入（合并或覆盖） |
| ↗ 分享 | 收藏数据编码进链接，转发到微博 / X / Facebook / Telegram / WhatsApp 或系统分享；对方打开即可浏览你的收藏地图（只读，不含你的照片） |
| 📊 统计 | **按类型分栏**（马克杯 / 挂饰各自的完成度，只收挂饰的人也能看进度）、四大系列进度（每个系列再拆杯与挂饰）、地区分布、国家排行 |

## 🚀 部署到 GitHub Pages

```bash
cd starbucks-city-mugs
git init && git add -A && git commit -m "init"
# 在 GitHub 新建仓库（如 starbucks-city-mugs），然后：
git remote add origin git@github.com:<你的用户名>/starbucks-city-mugs.git
git push -u origin main
```

在仓库 **Settings → Pages → Build and deployment** 中选择
`Deploy from a branch` / `main` / `/ (root)`，保存后访问
`https://<你的用户名>.github.io/starbucks-city-mugs/`。

本地预览：`python3 -m http.server 8000` 后访问 `http://localhost:8000`
（直接双击 `index.html` 也能用，但部分浏览器会限制本地文件的存储权限）。

## 🧪 测试

```bash
cd test && npm install && npm test
```

226 项无头检查，覆盖筛选、中英切换、图鉴分页、账号、收藏、照片、导入导出、
分享编解码、只读模式守卫，以及注入 Leaflet 桩后的完整地图逻辑。
这套测试做过变异验证：故意改坏 12 处代码，每一处都会让测试变红。
详见 [test/README.md](test/README.md)。

## 📦 数据结构（`js/data.js`）

每款杯子一条记录，欢迎手动增补：

```js
{
  "id": "gi-shanghai",          // 唯一 id：gi-/yah-/bt- 前缀 + 城市，挂饰加 -orn 后缀
  "series": "global-icon",      // global-icon | you-are-here | been-there | discovery
  "type": "mug",                // mug | ornament
  "city": "Shanghai",  "cityZh": "上海",
  "country": "China",  "countryZh": "中国",
  "region": "asia",             // asia | europe | north-america | latin-america | middle-east-africa | oceania
  "lat": 31.23, "lng": 121.47,  // 城市坐标（地图定位用；同名同国的条目坐标需一致）
  "year": 2010,                 // 大致发行年份
  "landmark": "Oriental Pearl Tower", "landmarkZh": "东方明珠塔",
  "glyph": "tower",             // 兜底图案类型（44 种，见 mugArt.js）。该地点在 js/placeArt.js 里
                                // 有专属插画时不会用到——目前 785 个地点全部有
  "colors": ["#c0392b", "#2c3e50", "#e6b34c"],  // 3 个主题色（插画配色）
  "src": "icon-shanghai",       // starbucks-mugs.com 上的页面 slug，详情页据此直链实物照片
  "edition": "v2",              // 可选：同一地点的第二版/限定版/季节版标注
  "photo": "https://…jpg"       // 可选：公开图片 URL（仅接受 https:// 或 data:image/…）
}
```

## 🖼️ 插画（`js/placeArt.js`）

每个地点一张原创 SVG 插画，key 为 `"City|Country"`，`{c}` 是主色占位符、`{bg}` 是底色占位符
（用来挖雪顶、门窗等负形）。渲染时按该杯款的配色填入，所以同一个地标在不同系列的杯子上
会呈现不同颜色。

想改某个地点的图，直接改那一条即可；删掉某条会自动回退到 `mugArt.js` 里按 `glyph` 取的
通用图案，不会报错。文件 620 KB（gzip 后约 88 KB）。

**这些插画是原创的**，画的是真实地标本身，不是复现星巴克的杯身设计，也没有参考任何
第三方网站的照片。

## 🛰️ 关于地图底图

默认用 **Esri World Imagery** 卫星影像，免费、不需要 API key，右上角可切换街道图与地形图。

想要 **Google Earth 那种影像**的话，得知道一件事：Google Earth 本身没有可嵌入的
网页 API（旧的 Earth 浏览器插件 2015 年就停用了）。真正可选的是：

| 方案 | 代价 |
| --- | --- |
| 现在的 Esri 卫星影像 | 免费、无需 key ✅ |
| Google Maps Platform 卫星图层 | 需 API key + 绑定信用卡（有每月免费额度） |
| Google Photorealistic 3D Tiles（最接近 Earth 的 3D 效果） | 需 API key + 计费，并用 CesiumJS 渲染 |

后两种要你去 Google Cloud 开项目并绑卡，key 还必须做域名限制否则会被盗刷。
需要的话告诉我，我来接。

## 📚 数据来源

**杯款清单（系列/类型/地点）来自 starbucks-mugs.com 的官方 sitemap**，
共解析 2561 个杯款页面，取四大主线系列 2136 款。年份来自 sitemap 的分月归档
（2017 年后接近真实发行年，更早的按系列年代回退，**仅供参考**）。
坐标、中文名、地标与配色由本项目补全。

**实拍照片不抓取、不转存、不热链**——那是 starbucks-mugs.com 的版权内容。
本站改为每款直链回原始页面，另提供上传你自己照片的功能。

完整说明见 **[DATA-SOURCES.md](DATA-SOURCES.md)**。发现错漏欢迎直接修改 `js/data.js`。

## 🔒 隐私与数据说明

- **未接入 Supabase 时**：账号、收藏与照片只存在本浏览器的 localStorage，不上传任何服务器；
  换浏览器/设备或清除数据会丢失，请定期**导出备份**。
- **接入 Supabase 后**：账号与收藏存在你自己的 Supabase 项目里，跨设备同步；
  数据库行级安全保证每位用户只能读写自己的数据。本地仍保留完整副本，断网照常可用。
- 浏览器 localStorage 通常约 5MB，照片会被压缩到最长边 520px；存满时会提示，可删除部分照片。
- 本地"注册/登录"仅用于同一设备上区分多位收藏者，**并非服务器级安全认证**，请勿使用重要密码。
- 分享链接只包含收藏状态位图与昵称，**不含密码，也不含你的实拍照片或备注**。
  为了让链接足够短（几百款收藏也只有几百字符），位图按数据集顺序编码并附带指纹；
  若对方站点的数据版本不同，会明确提示"请让对方重新分享"，而不是错误还原。

## ⚠️ 免责声明

本项目为粉丝自制，与 Starbucks Corporation 无任何关联。内置杯款插画为**原创风格化示意图**，
非官方产品图；如需查看真实杯款，请点详情页的 starbucks-mugs.com 直链，或上传自己的照片。
杯款清单数据源自 starbucks-mugs.com（同为粉丝站点），特此致谢。
