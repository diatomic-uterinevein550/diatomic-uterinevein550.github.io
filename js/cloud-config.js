/* Supabase 连接配置。
 *
 * 两个值都留空时，全站行为和没有云端时完全一样：账号存本地、不发任何网络请求。
 * 填上之后自动启用云端账号与多设备同步。
 *
 * 去哪拿：Supabase 控制台 → 你的项目 → Settings → API
 *   url      = Project URL
 *   anonKey  = Publishable key（新版命名）或 anon / public key（旧版命名）
 *
 * ⚠️ 这个 key 是**设计成公开**的（它会出现在网页源码里），提交进仓库没问题——
 * 真正的防线是数据库的行级安全策略（见 supabase/schema.sql），
 * 它保证任何人只能读写自己的数据。
 *
 * 绝对不要填 sb_secret_ 开头的（旧版叫 service_role）——那是管理员密钥，
 * 会绕过所有安全策略。CI 里有一道检查会拦下它。 */
'use strict';

window.CLOUD_CONFIG = {
  url: 'https://gjxyqfzcrazvqkeqcrsl.supabase.co',
  anonKey: 'sb_publishable_hMetsdlQ2CshsoKLjROUJw_PhYgDyLM'
};
