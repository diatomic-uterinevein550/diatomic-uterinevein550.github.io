# 数据来源与核对说明 / Data provenance

## 杯款清单：来自 starbucks-mugs.com 官方 sitemap（权威）

本数据集的**杯款清单不是模型生成的**。它来自收藏者数据库
[starbucks-mugs.com](https://starbucks-mugs.com/) 的官方 sitemap：

```
https://starbucks-mugs.com/sitemap.xml   →  116 个 sitemap-pt-mug-*.xml  →  2561 个杯款页面
```

该站 `robots.txt` 公开允许抓取（仅禁止 `/wp-admin/`）。我们解析每个页面的 URL slug
得到**系列、类型（马克杯/挂饰）、地点**三项事实，并把原始 slug 存进数据的 `src` 字段，
网站详情页据此直接跳转回该杯款的原始页面查看实物照片。

抽样验证：随机 10 个 `src` 拼出的 URL 全部返回 HTTP 200。

### 收录范围

从 2561 个页面中取四大主线系列（含挂饰），排除 Icon Mini（浓缩杯）、Relief 系列、
以及 Star Wars 等虚构地点（39 条），得到 **2136 款**：

| 系列 | 马克杯 | 挂饰 |
| --- | ---: | ---: |
| Global Icon / Icon Series（全球典藏） | 448 | — |
| You Are Here（城市地标） | 562 | 172 |
| Been There（足迹） | 472 | 163 |
| Discovery Series（探索） | 177 | 142 |
| **合计** | **1659** | **477** |

覆盖 **92 个国家与地区**、**785 个地点**。地区分布：北美洲 910、亚洲 512、欧洲 510、拉丁美洲 104、中东与非洲 63、大洋洲 37。

挂饰（Ornament）共 477 款，覆盖 **59 个国家与地区**，
绝非只有美国：Australia, Austria, Azerbaijan, Bahrain, Belgium, Brazil, Brunei, Bulgaria, Cambodia, Canada, China, Cyprus, Czech Republic, Denmark, El Salvador, Finland, France, Germany, Greece, Guatemala, Hong Kong, Hungary, Iceland, Italy, Japan, Jordan, Kazakhstan, Kuwait, Laos, Lebanon, Macau, Malaysia, Malta, Morocco, Netherlands, New Zealand, Norway, Oman, Philippines, Poland, Portugal, Qatar, Romania, Russia, Saudi Arabia, Serbia, Singapore, Slovakia, South Korea, Spain, Sweden, Switzerland, Taiwan, Thailand, Turkey, United Arab Emirates, United Kingdom, United States, Vietnam。

同一地点的不同版本用 `edition` 字段标注并入同一个地图图钉，例如 `v2`（第二版设计）、
`Christmas`（圣诞版）、`Limited Edition`、`Summer Edition 2023`、`Prototype`。
这样「圣诞巴黎」不会变成一个独立于巴黎的地点。

## 发行年份：来自 sitemap 分月文件

sitemap 按年月分文件，每个杯款页面所在的文件即其被收录的年月。2017 年以后该站是
新品上市即收录，所以这个年份**接近真实发行年**。但 2016 年那批 969 条是站点早期
批量导入的历史存货，日期无意义，这部分按各系列的典型年代回退：
Global Icon → 2012，You Are Here → 2015，Been There → 2018，Discovery → 2024。

**因此年份仅供参考**，不是权威发行日期。

## 地理与中文信息：本项目补全

坐标、中文城市名/国家名、地区归属、地标名称、插画配色由模型按 987 个地点批量生成
（15 个并行任务，987 个地点全部有结果）。这部分是**世界地理常识**而非星巴克专有知识，
但仍可能有误，欢迎在 `js/data.js` 中修订。

装配时做了这些一致性处理：同一中文名下的多种英文拼写合并（Tsingtao→Qingdao、
Firenze/Florence、Lisboa/Lisbon 等 9 组）；同一 (城市, 国家) 组内的中文名、地标、
坐标统一；坐标保持**真实值**，不同地点恰好同坐标时由地图在渲染时错开，不写进数据。

## 插画说明

站内 785 个地点各有一张**原创 SVG 插画**（`js/placeArt.js`），按该地点的实际地标绘制。
生成方式：按地标名分小批交给模型绘制，每一批产出都经过两道自动校验——
元素白名单与颜色占位符检查、以及用无头浏览器实测包围盒（超框或过小的直接剔除），
并抽样目检。785 张图形两两不同，没有任何两个地点共用一张。

这些插画画的是**真实地标本身**，属于原创作品；既不是复现星巴克的杯身美术设计，
也没有参考任何第三方网站的照片。

## 图片说明（重要）

本站**不抓取、不转存、不热链** starbucks-mugs.com 或 eBay 的实拍照片。
该站页面明确声明 `© Starbucks-Mugs.com`，其照片是站方的版权内容。

本站的做法是：

1. **每款杯子直连原始页面**——详情页的绿色主按钮跳转到 `starbucks-mugs.com/mug/<src>/`，
   实物照片和资料在源站查看，版权与流量都归属源站。
2. **上传你自己的实拍照片**——你自己拍的杯子照片压缩后存在浏览器本地，
   图鉴与详情页直接显示。
3. 内置 SVG 插画只是**没有照片时的风格化占位图**，不是官方产品图。

若需在站内内嵌实拍图，正当做法是联系 starbucks-mugs.com 取得授权；
数据结构已预留 `photo` 字段（只接受 `https://` 或 `data:image/` 开头的值）。

## 早期核对轮次（已被 sitemap 数据取代）

在改用 sitemap 之前，数据集是模型生成的 309 款，经过一轮联网交叉核对，
移除了 26 条无法证实的条目（如 Been There Brooklyn 实为 Discovery 系列、
You Are Here 从未进入墨西哥市场）、修正 191 处。参考来源包括：

- https://starbucks-mugs.com/
- https://en.wikibooks.org/wiki/Guide_to_Collectible_Mugs/Starbucks_City_Mugs
- https://www.starbucksornament.com/
- https://starbucks-mugs.fandom.com/

## 已知局限

- 年份见上，仅供参考。
- Icon Mini（浓缩杯）、Relief 系列、Star Wars 系列未收录。
- 地标名称是该地点的代表性地标，**不代表该杯实际图案**；实际图案请点原始页面查看。
- 该站本身也可能有遗漏，各地限定款众多，不可能绝对完整。
