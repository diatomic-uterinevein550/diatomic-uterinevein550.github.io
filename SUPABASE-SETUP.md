# ☁️ 接入 Supabase（云端账号与多设备同步）

不配置也能用——留空时站点行为和纯本地版完全一样，不会发任何网络请求。
配上之后才启用云端账号、多设备同步和云端照片。

全程约 10 分钟。

## 1. 建项目

1. https://supabase.com → 用 GitHub 登录 → **New project**
2. Name 随意（如 `city-mugs`），Region 选离你近的（国内建议 Singapore / Tokyo）
3. 数据库密码存好——**这个不是网站要用的 key**，是你直连数据库用的

## 2. 建表和安全策略

控制台 → **SQL Editor** → New query → 把 [`supabase/schema.sql`](supabase/schema.sql)
全文粘贴 → **Run**。

执行完最后会输出三行 `rowsecurity = true`，说明行级安全已生效。
**这一步是整个安全模型的核心**：它在数据库层面强制"每个人只能读写自己的行"，
不依赖前端代码自觉。

## 3. 填 key

控制台 → **Settings → API**，把两个值填进 [`js/cloud-config.js`](js/cloud-config.js)：

```js
window.CLOUD_CONFIG = {
  url: 'https://xxxxxxxxxxxx.supabase.co',   // Project URL
  anonKey: 'eyJhbGciOi...'                    // anon / public 那一个
};
```

⚠️ **只能填 anon key。** 它是设计成公开的，提交进仓库没问题——真正的防线是上一步的
行级安全策略。旁边那个 `service_role` key 是管理员密钥，会绕过所有安全策略，
**绝对不要填在这里、也不要提交进任何仓库**。

## 4. 邮箱验证（建议先关）

控制台 → **Authentication → Providers → Email**：

- 想让注册后立刻能用：关掉 **Confirm email**
- 想防垃圾注册：保持开启，用户注册后要去邮箱点确认链接（站点会提示）

免费版自带的邮件发送额度很低（每小时几封），认真上线的话在
**Authentication → Emails → SMTP Settings** 里接自己的 SMTP。

## 5. 提交并部署

```bash
git add js/cloud-config.js && git commit -m "接入 Supabase" && git push
```

Pages 一两分钟后自动更新。打开站点点「登录/注册」，表单会自动从"用户名"变成"邮箱"。

---

## 它是怎么工作的

**本地优先。** localStorage 始终是工作副本，所有操作先落本地、界面立即响应，
云端只是同步层。断网、Supabase 宕机、免费项目被暂停，站点都照常能用，不卡不丢数据。

| 时机 | 行为 |
| --- | --- |
| 标记收藏 | 立刻写本地 → 600ms 内批量推云端（失败只提示，不回滚） |
| 登录 | 拉云端 → 与本地按时间戳合并 → 两边回写 |
| 打开页面 | 恢复会话 → 后台拉取合并 |
| 退出 | 清本地会话，云端数据留着 |

**合并规则**：每行带数据库维护的 `updated_at`，同一杯款取较新的一方。
删除写成 `status='none'` 的墓碑行而不是真删——否则旧设备同步回来会把你
已经删掉的记录又复活。这两条都有测试覆盖（`test/cloud.test.js`）。

## 免费额度与注意事项

- 500MB 数据库、1GB 存储、5 万月活——这个项目用不掉零头
- **免费项目闲置一周会自动暂停**，需要有人访问才唤醒；认真运营建议升级或挂个定时唤醒
- 用户的邮箱和收藏记录会存在 Supabase 服务器上，**你成了数据保管者**，
  建议在站点页脚补一句隐私说明
- 导出/导入功能保留着：云端只是便利，不是唯一副本

## 出问题时

| 现象 | 原因 |
| --- | --- |
| 注册后没反应 | 开着邮箱验证，去收件箱点链接 |
| 提示「云端暂时连不上」 | key 填错，或免费项目被暂停（进控制台点恢复） |
| 登录成功但收藏没同步 | schema.sql 没执行，或 RLS 策略没建 |
| 别人能看到我的收藏 | **立刻检查 RLS**：控制台 Table Editor 里三张表都应显示 "RLS enabled" |
