# 向 starbucks-mugs.com 申请图片授权（邮件草稿）

网站底部有联系方式 / Contact 页面。以下草稿可直接改名字发出。
拿到授权后告诉我，我可以一次性把 2136 条数据的 `photo` 字段全部填好。

---

**Subject:** Permission request — using your mug photos in a small fan-made collection tracker

Hi,

I'm a Starbucks city-mug collector. I've built a small, non-commercial fan site that
lets collectors track which mugs they own on a world map:

- Repo: `https://github.com/<你的用户名>/starbucks-city-mugs`
- Live: `https://<你的用户名>.github.io/starbucks-city-mugs/`

The mug list itself comes from your site's public sitemap, and **every mug in my
catalog already links back to its page on starbucks-mugs.com** — that's how users
see the real photos today. I built the site that way deliberately, because the
photos are yours and I didn't want to copy them without asking.

What I'd like to ask: would you allow me to display your mug photos inline in the
catalog (roughly 2,000 images), with visible credit and a link back to the
corresponding starbucks-mugs.com page on every single one?

I'm happy to work within whatever you're comfortable with, for example:

- **Hotlinking** from your server so the images stay under your control (I'd keep
  request volume low, and I'd stop immediately if it costs you bandwidth);
- **Self-hosting downscaled thumbnails** (e.g. max 400 px) with credit + backlink,
  so your server carries no load;
- **Only a subset** — say the three main series — if the full set is too much;
- Any attribution wording, logo, or link format you prefer.

The site is free, has no ads, no tracking, and no revenue. It's a hobby project and
your database is by far the most complete reference out there — I'd rather send
people to you than compete with you.

If the answer is no, that's completely fine; the site will keep linking out to you
exactly as it does now.

Thanks for maintaining such a thorough archive.

Best,
<你的名字>

---

## 如果拿到授权

告诉我授权范围（热链 / 自托管缩略图 / 子集），我会：

1. 从每个杯款页面的 `og:image` 抓取图片地址（2136 个页面，限速抓取）；
2. 按授权方式填 `js/data.js` 的 `photo` 字段（热链就写他们的 URL；
   自托管就下载并压缩到 `img/` 目录再写相对路径）；
3. 在图鉴卡片与详情页加上署名与回链，页脚补上致谢。

现有代码已经支持：`photo` 字段存在时，图鉴与详情页会直接显示实拍图，
只接受 `https://` 或 `data:image/` 开头的值。
