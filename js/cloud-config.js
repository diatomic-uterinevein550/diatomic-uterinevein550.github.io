/* Supabase 连接配置。
 *
 * 两个值都留空时，全站行为和没有云端时完全一样：账号存本地、不发任何网络请求。
 * 填上之后自动启用云端账号与多设备同步。
 *
 * 去哪拿：Supabase 控制台 → 你的项目 → Settings → API
 *   url      = Project URL
 *   anonKey  = Project API keys 里的 anon / public 那个
 *
 * ⚠️ anonKey 是**设计成公开**的，提交进仓库没问题——真正的防线是数据库的
 * 行级安全策略（见 supabase/schema.sql），它保证任何人只能读写自己的数据。
 * 绝对不要把 service_role key 填在这里，那个是管理员密钥，会绕过所有安全策略。 */
'use strict';

window.CLOUD_CONFIG = {
  url: '',
  anonKey: ''
};
