/* 风格化 SVG 杯子插画：按系列（Global Icon / You Are Here / Been There）
 * 与地标类型（glyph）绘制示意图，配色来自数据中的 colors 字段。 */
'use strict';

window.escHtml = function (s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

window.MugArt = (function () {
  var uid = 0;
  var esc = window.escHtml;

  /* 角落点缀图案（a- 前缀），由变体引擎随机取用 */
  var ACCENTS = {};
  var ACCENT_KEYS = [];

  /* 地标图形：均绘制在 60×60 坐标框内，{c} 为颜色占位符 */
  var GLYPHS = {
    /* 通用现代塔：刻意不做成埃菲尔造型，埃菲尔另有专属图案 */
    tower:
      '<line x1="30" y1="4" x2="30" y2="12" stroke="{c}" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M25,13 L35,13 L34,22 L26,22 Z" fill="{c}"/>' +
      '<path d="M21,26 L39,26 L36,33 L24,33 Z" fill="{c}"/>' +
      '<path d="M27,33 L33,33 L36,55 L24,55 Z" fill="{c}"/>' +
      '<rect x="17" y="54" width="26" height="4" rx="1" fill="{c}"/>',
    bridge:
      '<g fill="none" stroke="{c}" stroke-width="3.5" stroke-linecap="round">' +
      '<path d="M4 40 H56 M14 40 V12 M46 40 V12"/>' +
      '<path d="M14 14 Q30 34 46 14 M22 25 V40 M30 29 V40 M38 25 V40"/></g>',
    temple:
      '<g fill="{c}"><path d="M12 22 Q30 4 48 22 Z"/><path d="M15 34 Q30 18 45 34 Z"/>' +
      '<path d="M18 46 Q30 32 42 46 Z"/><rect x="26" y="46" width="8" height="9" rx="1"/></g>',
    skyline:
      '<g fill="{c}"><rect x="5" y="30" width="9" height="25"/><rect x="17" y="14" width="10" height="41"/>' +
      '<rect x="30" y="24" width="9" height="31"/><rect x="42" y="34" width="12" height="21"/>' +
      '<rect x="19.5" y="8" width="5" height="6"/></g>',
    mountain:
      '<g fill="none" stroke="{c}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round">' +
      '<path d="M4 52 L22 16 L32 36 L40 22 L56 52 Z"/><path d="M17 26 L22 30 L27 26"/></g>',
    statue:
      '<g stroke="{c}" stroke-width="3.5" fill="none" stroke-linecap="round">' +
      '<circle cx="28" cy="13" r="5" fill="{c}" stroke="none"/>' +
      '<path d="M28 19 V36 M28 25 L16 31 M28 23 L40 10"/></g>' +
      '<circle cx="42" cy="7" r="3" fill="{c}"/>' +
      '<g fill="{c}"><rect x="20" y="40" width="16" height="6" rx="1"/><rect x="15" y="49" width="26" height="6" rx="1"/></g>',
    castle:
      '<g fill="{c}"><rect x="8" y="22" width="10" height="32"/><rect x="42" y="22" width="10" height="32"/>' +
      '<rect x="18" y="33" width="24" height="21"/>' +
      '<path d="M8 22 v-7 h3 v3.5 h4 v-3.5 h3 v7 z M42 22 v-7 h3 v3.5 h4 v-3.5 h3 v7 z M18 33 v-6 h4.5 v3 h5 v-3 h5 v3 h5 v-3 h4.5 v6 z"/></g>' +
      '<rect x="26" y="42" width="8" height="12" rx="4" fill="{bg}"/>',
    nature:
      '<path d="M30 7 C17 13 12 26 15 35 C18 43 25 46 29 46 L31 46 C36 46 43 41 45 32 C47 23 43 13 30 7 Z" fill="{c}"/>' +
      '<path d="M30 46 V56 M30 38 Q24 32 22 24" fill="none" stroke="{c}" stroke-width="3" stroke-linecap="round"/>',
    beach:
      '<circle cx="38" cy="17" r="8" fill="{c}"/>' +
      '<g fill="none" stroke="{c}" stroke-width="3.5" stroke-linecap="round">' +
      '<path d="M4 40 q6 -7 12 0 t12 0 t12 0 t12 0"/><path d="M4 50 q6 -7 12 0 t12 0 t12 0 t12 0"/></g>',
    monument:
      '<g fill="{c}"><path d="M26 12 L30 4 L34 12 L33 44 H27 Z"/>' +
      '<rect x="21" y="46" width="18" height="4"/><rect x="16" y="52" width="28" height="4"/></g>',
    harbor:
      '<g fill="{c}"><path d="M10 42 h40 l-8 10 h-24 z"/><path d="M28 8 V40 Z" stroke="{c}" stroke-width="3"/>' +
      '<path d="M31 10 Q46 24 31 38 Z"/><path d="M25 16 Q13 27 25 38 Z"/></g>',
    palm:
      '<path d="M32 24 C29 36 29 45 31 54" stroke="{c}" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<g fill="{c}"><path d="M32 24 Q20 12 8 16 Q21 21 32 24 Z"/><path d="M32 24 Q28 8 16 6 Q26 13 32 24 Z"/>' +
      '<path d="M32 24 Q40 8 52 8 Q42 17 32 24 Z"/><path d="M32 24 Q46 16 54 25 Q43 27 32 24 Z"/></g>',

    /* ---- 专属地标图案（比通用图案更贴近实际地点） ---- */
    'arch-gateway':
      '<path d="M11,53 C12,20 22,6 30,6 C38,6 48,20 49,53" fill="none" stroke="{c}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<line x1="5" y1="55" x2="55" y2="55" stroke="{c}" stroke-width="3.2" stroke-linecap="round"/>',
    'bigben':
      '<path d="M24,54 L24,20 L30,8 L36,20 L36,54" fill="none" stroke="{c}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="30" cy="27" r="4.4" fill="{c}"/>' +
      '<line x1="24" y1="34" x2="36" y2="34" stroke="{c}" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="30" y1="8" x2="30" y2="3" stroke="{c}" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="18" y="53" width="24" height="4" rx="1" fill="{c}"/>',
    'cable-car':
      '<g fill="none" stroke="{c}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M4 6L56 12"/>' +
      '<path d="M30 10V22"/>' +
      '<rect x="12" y="22" width="36" height="27" rx="4"/>' +
      '</g>' +
      '<circle cx="30" cy="9" r="3.5" fill="{c}"/>' +
      '<rect x="17" y="27" width="10" height="12" rx="1.5" fill="{c}"/>' +
      '<rect x="33" y="27" width="10" height="12" rx="1.5" fill="{c}"/>',
    'cactus':
      '<circle cx="51" cy="10" r="5" fill="{c}"/>' +
      '<rect x="25.5" y="8" width="9" height="44" rx="4.5" fill="{c}"/>' +
      '<path d="M26,38 L21,38 A8,8 0 0 1 13,30 L13,17 A4,4 0 0 1 21,17 L21,30 L26,30 Z" fill="{c}"/>' +
      '<path d="M34,38 L39,38 A8,8 0 0 0 47,30 L47,21 A4,4 0 0 0 39,21 L39,30 L34,30 Z" fill="{c}"/>' +
      '<line x1="10" y1="54" x2="50" y2="54" stroke="{c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
    'cathedral':
      '<polygon points="13,52 13,26 18,13 23,26 23,52" fill="{c}"/>' +
      '<polygon points="37,52 37,26 42,13 47,26 47,52" fill="{c}"/>' +
      '<path d="M24,52 L24,30 Q30,20 36,30 L36,52 Z" fill="{c}"/>' +
      '<circle cx="30" cy="32" r="3.6" fill="{bg}"/>' +
      '<path d="M27,52 L27,43 Q30,39 33,43 L33,52 Z" fill="{bg}"/>' +
      '<line x1="10" y1="54.5" x2="50" y2="54.5" stroke="{c}" stroke-width="3.4" stroke-linecap="round"/>',
    'cherry-blossom':
      '<path d="M4,53 C16,48 24,40 30,30 C36,20 42,12 50,6" fill="none" stroke="{c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M18.2,42.6 A3.1,3.1 0 1 1 20.1,48.3 A3.1,3.1 0 1 1 15.2,51.8 A3.1,3.1 0 1 1 10.3,48.3 A3.1,3.1 0 1 1 12.2,42.6 A3.1,3.1 0 1 1 18.2,42.6 Z" fill="{c}"/>' +
      '<path d="M33,25.9 A3.1,3.1 0 1 1 34.9,31.6 A3.1,3.1 0 1 1 30,35.1 A3.1,3.1 0 1 1 25.1,31.6 A3.1,3.1 0 1 1 27,25.9 A3.1,3.1 0 1 1 33,25.9 Z" fill="{c}"/>' +
      '<path d="M44.2,10.1 A3.1,3.1 0 1 1 46.1,15.8 A3.1,3.1 0 1 1 41.2,19.3 A3.1,3.1 0 1 1 36.3,15.8 A3.1,3.1 0 1 1 38.2,10.1 A3.1,3.1 0 1 1 44.2,10.1 Z" fill="{c}"/>' +
      '<ellipse cx="26" cy="50" rx="3.6" ry="2.6" fill="{c}"/>' +
      '<ellipse cx="38" cy="41" rx="3.6" ry="2.6" fill="{c}"/>',
    'clock-tower':
      '<polygon points="11,23 30,8 49,23" fill="{c}"/>' +
      '<path d="M30 8V3" fill="none" stroke="{c}" stroke-width="3" stroke-linecap="round"/>' +
      '<polygon points="31,2.5 41,5.5 31,8.5" fill="{c}"/>' +
      '<rect x="17" y="23" width="26" height="33" fill="none" stroke="{c}" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<circle cx="30" cy="35" r="7.5" fill="none" stroke="{c}" stroke-width="3"/>' +
      '<path d="M30 30V35H34" fill="none" stroke="{c}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
    'coffee-cherry':
      '<path d="M30 8V36" fill="none" stroke="{c}" stroke-width="3.5" stroke-linecap="round"/>' +
      '<path d="M30 24C26 14 20 10 12 10C12 19 19 25 30 24Z" fill="{c}"/>' +
      '<path d="M30 24C34 14 40 10 48 10C48 19 41 25 30 24Z" fill="{c}"/>' +
      '<circle cx="18" cy="41" r="7.5" fill="{c}"/>' +
      '<circle cx="42" cy="41" r="7.5" fill="{c}"/>' +
      '<circle cx="30" cy="50" r="7" fill="{c}"/>',
    'colosseum':
      '<path d="M7,50 L7,26 Q7,15 30,15 Q46,15 50,21 L50,50" fill="none" stroke="{c}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<line x1="8" y1="33" x2="50" y2="33" stroke="{c}" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="14" y1="23" x2="14" y2="32" stroke="{c}" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="24" y1="20" x2="24" y2="32" stroke="{c}" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="35" y1="20" x2="35" y2="32" stroke="{c}" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="44" y1="23" x2="44" y2="32" stroke="{c}" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="18" y1="38" x2="18" y2="49" stroke="{c}" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="30" y1="38" x2="30" y2="49" stroke="{c}" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="41" y1="38" x2="41" y2="49" stroke="{c}" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="5" y1="53" x2="53" y2="53" stroke="{c}" stroke-width="3.5" stroke-linecap="round"/>',
    'cruise-ship':
      '<path d="M5 32H55L48 45H12Z" fill="{c}"/>' +
      '<rect x="14" y="24" width="32" height="8" fill="{c}"/>' +
      '<rect x="20" y="17" width="19" height="7" fill="{c}"/>' +
      '<rect x="25" y="8" width="8" height="9" rx="1.5" fill="{c}"/>' +
      '<path d="M5 51Q11 47 17 51T29 51T41 51T53 51" fill="none" stroke="{c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    'desert-dunes':
      '<circle cx="45" cy="12" r="6.5" fill="{c}"/>' +
      '<path d="M5,38 C13,27 23,24 32,29 C39,33 46,35 55,31" fill="none" stroke="{c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M3,56 L3,48 C13,39 24,37 33,43 C41,48 49,49 57,45 L57,56 Z" fill="{c}"/>',
    'eiffel':
      '<path d="M13,54 C14,42 24,32 30,7" fill="none" stroke="{c}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M47,54 C46,42 36,32 30,7" fill="none" stroke="{c}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M15,52 Q30,34 45,52" fill="none" stroke="{c}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<line x1="15" y1="38" x2="45" y2="38" stroke="{c}" stroke-width="3.5" stroke-linecap="round"/>' +
      '<line x1="23" y1="22" x2="37" y2="22" stroke="{c}" stroke-width="3.5" stroke-linecap="round"/>' +
      '<line x1="30" y1="8" x2="30" y2="4" stroke="{c}" stroke-width="3" stroke-linecap="round"/>',
    'ferris-wheel':
      '<circle cx="30" cy="25" r="20" fill="none" stroke="{c}" stroke-width="3.5"/>' +
      '<circle cx="30" cy="25" r="3.4" fill="{c}"/>' +
      '<line x1="30" y1="6" x2="30" y2="44" stroke="{c}" stroke-width="2.6"/>' +
      '<line x1="11" y1="25" x2="49" y2="25" stroke="{c}" stroke-width="2.6"/>' +
      '<line x1="17" y1="12" x2="43" y2="38" stroke="{c}" stroke-width="2.6"/>' +
      '<line x1="43" y1="12" x2="17" y2="38" stroke="{c}" stroke-width="2.6"/>' +
      '<path d="M22,52 L30,28 L38,52" fill="none" stroke="{c}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<line x1="17" y1="53" x2="43" y2="53" stroke="{c}" stroke-width="3.5" stroke-linecap="round"/>',
    'fortress':
      '<path d="M8 10H13V15H17V10H22V32H27V37H33V32H38V20H43V25H47V20H52V49H8Z" fill="{c}"/>' +
      '<path d="M4 56L10 46H50L56 56Z" fill="{c}"/>',
    'great-wall':
      '<path d="M3,50 C10,50 14,34 22,32 L22,50 Z" fill="{c}"/>' +
      '<path d="M38,50 C44,44 50,40 57,40 L57,50 Z" fill="{c}"/>' +
      '<path d="M4,44 C12,42 16,28 26,25 C36,22 44,32 56,31" fill="none" stroke="{c}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<rect x="24" y="12" width="14" height="14" fill="{c}"/>' +
      '<path d="M24,12 v-4 h3.2 v2 h3.4 v-2 h3.4 v2 h3.2 v2 z" fill="{c}"/>' +
      '<line x1="3" y1="53" x2="57" y2="53" stroke="{c}" stroke-width="3" stroke-linecap="round"/>',
    'hot-air-balloon':
      '<g fill="none" stroke="{c}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M30 4C42 4 50 13 50 24C50 34 40 38 35 44H25C20 38 10 34 10 24C10 13 18 4 30 4Z"/>' +
      '<path d="M22 6C17 17 17 34 25 44"/>' +
      '<path d="M38 6C43 17 43 34 35 44"/>' +
      '<path d="M25 44V50"/>' +
      '<path d="M35 44V50"/>' +
      '<rect x="24" y="50" width="12" height="6" rx="1.5"/>' +
      '</g>',
    'karst':
      '<path d="M2,47 C4,38 6,26 9,26 C12,26 14,38 15,47 Z" fill="{c}"/>' +
      '<path d="M14,47 C17,31 21,6 26,6 C31,6 35,31 37,47 Z" fill="{c}"/>' +
      '<path d="M34,47 C36,36 39,20 42,20 C45,20 48,36 50,47 Z" fill="{c}"/>' +
      '<path d="M47,47 C49,40 51,30 53,30 C55,30 56,40 57,47 Z" fill="{c}"/>' +
      '<line x1="5" y1="49" x2="55" y2="49" stroke="{c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<line x1="17" y1="56" x2="43" y2="56" stroke="{c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    'lighthouse':
      '<path d="M24,17 L36,17 L40,47 L20,47 Z" fill="{c}"/>' +
      '<rect x="22" y="9" width="16" height="8" fill="{c}"/>' +
      '<polygon points="20,9 40,9 30,3" fill="{c}"/>' +
      '<line x1="18" y1="9" x2="6" y2="5" stroke="{c}" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="42" y1="9" x2="54" y2="5" stroke="{c}" stroke-width="3" stroke-linecap="round"/>' +
      '<line x1="22" y1="31" x2="38" y2="31" stroke="{bg}" stroke-width="3.4"/>' +
      '<path d="M8,54 C14,45 22,47 30,47 C38,47 46,45 52,54 Z" fill="{c}"/>',
    'maple-leaf':
      '<line x1="30" y1="44" x2="30" y2="54" stroke="{c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<polygon points="30,4 37,19 52,14 43,29 53,35 39,40 34,48 26,48 21,40 7,35 17,29 8,14 23,19" fill="{c}"/>',
    'mosque':
      '<path d="M15,40 C15,29 20,24 25,17 C30,24 35,29 35,40 Z" fill="{c}"/>' +
      '<path d="M25,13 a4.2,4.2 0 1,0 3.4,6.6 a3.2,3.2 0 1,1 -3.4,-6.6 Z" fill="{c}"/>' +
      '<rect x="13" y="40" width="24" height="14" fill="{c}"/>' +
      '<rect x="44" y="24" width="7" height="30" fill="{c}"/>' +
      '<path d="M43,24 C43,19 45,17 47.5,14 C50,17 52,19 52,24 Z" fill="{c}"/>' +
      '<line x1="8" y1="55.5" x2="54" y2="55.5" stroke="{c}" stroke-width="3" stroke-linecap="round"/>',
    'opera-house':
      '<rect x="5.5" y="47" width="49" height="4.5" fill="{c}"/>' +
      '<path d="M7.5,47 C7.5,33 11.5,22 21.5,16 C23.5,26 21.5,38 23.5,47 Z" fill="{c}"/>' +
      '<path d="M27,47 C27,36 29.5,28 37.5,24 C39.5,31 37.5,40 39.5,47 Z" fill="{c}"/>' +
      '<path d="M43,47 C43,41 44.5,36 50.5,32 C52,37 50.5,42 52.5,47 Z" fill="{c}"/>',
    'pagoda':
      '<line x1="30" y1="10" x2="30" y2="4" stroke="{c}" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M19,19 L24,11 L36,11 L41,19 Q37,16 30,16 Q23,16 19,19 Z" fill="{c}"/>' +
      '<rect x="26" y="19" width="8" height="6" fill="{c}"/>' +
      '<path d="M13,32 L20,24 L40,24 L47,32 Q40,29 30,29 Q20,29 13,32 Z" fill="{c}"/>' +
      '<rect x="24" y="32" width="12" height="7" fill="{c}"/>' +
      '<path d="M6,46 L16,38 L44,38 L54,46 Q43,43 30,43 Q17,43 6,46 Z" fill="{c}"/>' +
      '<rect x="22" y="46" width="16" height="9" fill="{c}"/>',
    'pine-forest':
      '<rect x="10.5" y="42" width="5" height="10" fill="{c}"/>' +
      '<rect x="28" y="44" width="6" height="8" fill="{c}"/>' +
      '<rect x="46.5" y="44" width="5" height="8" fill="{c}"/>' +
      '<polygon points="13,15 4,44 22,44" fill="{c}"/>' +
      '<polygon points="31,4 19,46 43,46" fill="{c}"/>' +
      '<polygon points="49,20 41,46 57,46" fill="{c}"/>',
    'pyramid':
      '<polygon points="44,26 55,50 35,50" fill="{c}"/>' +
      '<polygon points="26,11 48,50 4,50" fill="{c}"/>' +
      '<rect x="3" y="50" width="54" height="3.5" fill="{c}"/>',
    'space-needle':
      '<line x1="30" y1="4" x2="30" y2="12" stroke="{c}" stroke-width="3" stroke-linecap="round"/>' +
      '<ellipse cx="30" cy="16" rx="15" ry="4.2" fill="{c}"/>' +
      '<path d="M26,19 C27,30 27.5,38 26,44 C24.5,49 22,51 20.5,53 L39.5,53 C38,51 35.5,49 34,44 C32.5,38 33,30 34,19 Z" fill="{c}"/>' +
      '<rect x="17" y="52" width="26" height="4" fill="{c}"/>',
    'stadium':
      '<ellipse cx="30" cy="38" rx="25" ry="15" fill="none" stroke="{c}" stroke-width="3.5"/>' +
      '<ellipse cx="30" cy="38" rx="12" ry="6.5" fill="{c}"/>' +
      '<path d="M11 28V13" fill="none" stroke="{c}" stroke-width="3.5" stroke-linecap="round"/>' +
      '<path d="M49 28V13" fill="none" stroke="{c}" stroke-width="3.5" stroke-linecap="round"/>' +
      '<rect x="5" y="6" width="12" height="7" rx="1.5" fill="{c}"/>' +
      '<rect x="43" y="6" width="12" height="7" rx="1.5" fill="{c}"/>',
    'surfboard':
      '<path d="M40 4C50 16 50 39 40 51C30 39 30 16 40 4Z" fill="none" stroke="{c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M40 13V42" fill="none" stroke="{c}" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M5 54H55" fill="none" stroke="{c}" stroke-width="3.5" stroke-linecap="round"/>' +
      '<path d="M8 49C4 32 9 18 24 19C17 23 13 30 15 38" fill="none" stroke="{c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
    'taj':
      '<path d="M19,32 C19,23 24,18 30,12 C36,18 41,23 41,32 Z" fill="{c}"/>' +
      '<line x1="30" y1="12" x2="30" y2="6" stroke="{c}" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M17,50 L17,34 L43,34 L43,50 Z" fill="{c}"/>' +
      '<path d="M26,50 L26,43 Q30,38 34,43 L34,50 Z" fill="{bg}"/>' +
      '<rect x="7" y="26" width="5.5" height="24" fill="{c}"/>' +
      '<path d="M6,26 C6,22 8,20 9.7,17 C11.5,20 13.5,22 13.5,26 Z" fill="{c}"/>' +
      '<rect x="47.5" y="26" width="5.5" height="24" fill="{c}"/>' +
      '<path d="M46.5,26 C46.5,22 48.5,20 50.2,17 C52,20 54,22 54,26 Z" fill="{c}"/>' +
      '<line x1="4" y1="52.5" x2="56" y2="52.5" stroke="{c}" stroke-width="3.4" stroke-linecap="round"/>',
    'torii':
      '<path d="M6,12 Q30,18 54,12" fill="none" stroke="{c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<line x1="11" y1="26" x2="49" y2="26" stroke="{c}" stroke-width="4" stroke-linecap="round"/>' +
      '<line x1="15" y1="54" x2="17.5" y2="17" stroke="{c}" stroke-width="4" stroke-linecap="round"/>' +
      '<line x1="45" y1="54" x2="42.5" y2="17" stroke="{c}" stroke-width="4" stroke-linecap="round"/>' +
      '<line x1="30" y1="18" x2="30" y2="24" stroke="{c}" stroke-width="3.5" stroke-linecap="round"/>',
    'volcano':
      '<polygon points="3,54 19,30 25,34 35,34 41,30 57,54" fill="{c}"/>' +
      '<path d="M30,32 C30,27 25,24 27,18 C29,13 34,11 33,6" fill="none" stroke="{c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M36,32 C38,27 43,25 42,19" fill="none" stroke="{c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
    'waterfall':
      '<path d="M4,47 L4,16 L11,7 L18,14 L18,47 Z" fill="{c}"/>' +
      '<path d="M56,47 L56,16 L49,7 L42,14 L42,47 Z" fill="{c}"/>' +
      '<path d="M22,12 C22,24 21,34 24,42" fill="none" stroke="{c}" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M30,11 C30,24 30,34 30,43" fill="none" stroke="{c}" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M38,12 C38,24 39,34 36,42" fill="none" stroke="{c}" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M9,51 q6,-4 12,0 t12,0 t12,0 t6,0" fill="none" stroke="{c}" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M16,57 q6,-4 12,0 t12,0 t6,0" fill="none" stroke="{c}" stroke-width="2.8" stroke-linecap="round"/>',
    'windmill':
      '<line x1="17" y1="8" x2="43" y2="34" stroke="{c}" stroke-width="4" stroke-linecap="round"/>' +
      '<line x1="43" y1="8" x2="17" y2="34" stroke="{c}" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="30" cy="21" r="3" fill="{c}"/>' +
      '<path d="M24,29 C24.5,20 35.5,20 36,29 Z" fill="{c}"/>' +
      '<polygon points="25,29 35,29 39,51 21,51" fill="{c}"/>' +
      '<rect x="16" y="51" width="28" height="4.5" fill="{c}"/>',
  };

  function glyph(name, color, x, y, scale, bg) {
    var g = (GLYPHS[name] || GLYPHS.skyline).split('{c}').join(color)
      .split('{bg}').join(bg || '#fdfaf4');
    return '<g transform="translate(' + x + ',' + y + ') scale(' + scale + ')">' + g + '</g>';
  }

  /* ---- 每个地点的专属变体 ----
   * 图案库再大也盖不住 785 个地点（大量地标就是"某某大教堂""某某桥"），
   * 所以在图案之外再叠一层由地点名派生的构图变化：配景、点缀、镜像、疏密。
   * 种子只取自 城市|国家，因此同一地点每次渲染完全一致，换语言/刷新都不变。 */
  function seedOf(m) {
    var s = (m.city || '') + '|' + (m.country || '');
    var h = 2166136261, i;
    for (i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
    }
    return h >>> 0;
  }

  /* 从种子里按位取值，各维度互不相关 */
  function pick(seed, shift, n) {
    return Math.floor(((seed >>> shift) & 0xff) / 256 * n);
  }

  /* 主图案背后的配景：地平线、丘陵、水面、光晕…… */
  function backdrop(m, seed, color) {
    var kind = pick(seed, 3, 6);
    var o = ' opacity=".16"';
    if (kind === 0) return '';
    if (kind === 1) {
      return '<path d="M4 46 q14 -10 28 -2 t24 -4 V54 H4 Z" fill="' + color + '"' + o + '/>';
    }
    if (kind === 2) {
      return '<circle cx="30" cy="26" r="21" fill="none" stroke="' + color + '" stroke-width="2"' + o + '/>';
    }
    if (kind === 3) {
      return '<path d="M2 50 q8 -5 16 0 t16 0 t16 0 t8 0" fill="none" stroke="' + color +
        '" stroke-width="2.4"' + o + '/><path d="M2 56 q8 -5 16 0 t16 0 t16 0 t8 0" fill="none" stroke="' +
        color + '" stroke-width="2"' + o + '/>';
    }
    if (kind === 4) {
      return '<path d="M2 52 L18 34 L30 46 L42 30 L58 52 Z" fill="' + color + '"' + o + '/>';
    }
    var bars = '', i;
    for (i = 0; i < 5; i++) {
      bars += '<line x1="' + (6 + i * 12) + '" y1="52" x2="' + (6 + i * 12) + '" y2="' +
        (36 + (i % 3) * 5) + '" stroke="' + color + '" stroke-width="2.6"' + o + '/>';
    }
    return bars;
  }

  /* 角落点缀：小鸟、云、太阳…… 由 ACCENTS 提供，缺失时退化为简单圆点 */
  function accent(m, seed, color) {
    var keys = ACCENT_KEYS;
    if (!keys.length) return '';
    if (pick(seed, 11, 5) === 0) return '';          /* 五分之一不加点缀，避免千篇一律 */
    var a = ACCENTS[keys[pick(seed, 13, keys.length)]];
    if (!a) return '';
    var corner = pick(seed, 19, 4);
    var x = corner % 2 ? 40 : 6;
    var y = corner < 2 ? 4 : 40;
    var body = a.split('{c}').join(color).split('{bg}').join('#fdfaf4');
    return '<g transform="translate(' + x + ',' + y + ') scale(0.28)" opacity=".55">' + body + '</g>';
  }

  /* 主图案本身的构图微调：左右镜像与轻微缩放，让同图案的不同地点不完全重合 */
  function placeKey(m) { return (m.city || '') + '|' + (m.country || ''); }

  function hasPlaceArt(m) {
    return !!(window.PLACE_ART && window.PLACE_ART[placeKey(m)]);
  }

  function composeGlyph(m, seed, color, x, y, scale, bg) {
    var bespoke = window.PLACE_ART && window.PLACE_ART[placeKey(m)];
    var art = bespoke || GLYPHS[m.glyph] || GLYPHS.skyline;
    var inner = art.split('{c}').join(color).split('{bg}').join(bg || '#fdfaf4');
    /* 专属插画本身已经贴合该地点，不再镜像或缩放，避免破坏构图 */
    if (bespoke) {
      return '<g transform="translate(' + x + ',' + y + ') scale(' + scale + ')">' + inner + '</g>';
    }
    var mirror = pick(seed, 23, 2) === 1;
    var s = scale * (0.92 + pick(seed, 29, 4) * 0.045);
    var t = 'translate(' + x + ',' + y + ') scale(' + s.toFixed(3) + ')';
    if (mirror) t += ' translate(60,0) scale(-1,1)';
    return '<g transform="' + t + '">' + inner + '</g>';
  }

  /* 图案区整体：配景 + 主图案 + 点缀，画在 60×60 的图案框内 */
  function scene(m, color, x, y, scale, bg) {
    var seed = seedOf(m);
    if (hasPlaceArt(m)) return composeGlyph(m, seed, color, x, y, scale, bg);
    var g = '<g transform="translate(' + x + ',' + y + ') scale(' + scale + ')">' +
      backdrop(m, seed, color) + '</g>';
    g += composeGlyph(m, seed, color, x, y, scale, bg);
    g += '<g transform="translate(' + x + ',' + y + ') scale(' + scale + ')">' +
      accent(m, seed, color) + '</g>';
    return g;
  }

  /* ---- 配色对比度 ----
   * 数据里的配色取自当地旗帜/风物，约四分之一的条目主色是白或极浅色
   * （如日本 #FFFFFF），直接画在米白杯身上会完全看不见。
   * 这里保证前两个色位足够深：优先从同一组配色里换一个深色（保住地域感），
   * 实在没有再把原色压暗。 */
  var MAX_LUM = 150;      /* 画在米白底上的最大可接受亮度 */
  var FALLBACK = ['#1e3932', '#00754a', '#8a6d3b'];

  function lum(hex) {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return 255;
    return 0.2126 * parseInt(hex.slice(1, 3), 16) +
           0.7152 * parseInt(hex.slice(3, 5), 16) +
           0.0722 * parseInt(hex.slice(5, 7), 16);
  }

  function darken(hex, factor) {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return FALLBACK[0];
    var out = '#', i, v;
    for (i = 1; i < 7; i += 2) {
      v = Math.round(parseInt(hex.slice(i, i + 2), 16) * factor);
      out += Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
    }
    return out;
  }

  function ensureDark(hex) {
    var L = lum(hex);
    if (L <= MAX_LUM) return hex;
    if (L < 12) return hex;                       /* 已经很黑 */
    var d = darken(hex, MAX_LUM / L);
    /* 纯白/近中性色压暗只会变灰，用品牌深绿兜底 */
    return lum(d) > MAX_LUM + 10 ? FALLBACK[0] : d;
  }

  function palette(m) {
    var src = (m.colors && m.colors.length >= 3) ? m.colors.slice(0, 3) : FALLBACK.slice();
    var out = [];
    var used = {};
    var i, j, cand;
    for (i = 0; i < 2; i++) {
      cand = src[i];
      if (lum(cand) > MAX_LUM) {
        /* 先在同组里找一个够深且没被占用的颜色 */
        for (j = 0; j < 3; j++) {
          if (!used[src[j]] && lum(src[j]) <= MAX_LUM) { cand = src[j]; break; }
        }
      }
      if (lum(cand) > MAX_LUM || used[cand]) cand = ensureDark(src[i]);
      if (used[cand]) cand = darken(cand, 0.62);
      if (used[cand]) cand = FALLBACK[i];
      used[cand] = true;
      out.push(cand);
    }
    /* 第三色只作点缀，允许亮一些，但不能亮到看不见 */
    out.push(lum(src[2]) > 225 ? darken(src[2], 0.72) : src[2]);
    return out;
  }

  /* 城市名字号自适应 */
  function nameSize(name, base, maxChars) {
    if (name.length <= maxChars) return base;
    return Math.max(10, Math.round(base * maxChars / name.length));
  }

  /* 估算文本宽度（粗体 Trebuchet ≈ 0.63em/字符 + 字距），超出容器时用
   * textLength 强制压缩到 maxW，避免长城市名（如 DISNEY CALIFORNIA
   * ADVENTURE）溢出杯身。 */
  function fit(text, fs, ls, maxW) {
    var est = text.length * (fs * 0.63 + ls);
    return est > maxW ? ' textLength="' + maxW + '" lengthAdjust="spacingAndGlyphs"' : '';
  }

  var HANDLE = 'M186 76 C218 70 228 92 226 112 C224 134 208 150 186 152';

  function handle(strokeOuter, strokeInner) {
    return '<path d="' + HANDLE + '" fill="none" stroke="' + strokeOuter + '" stroke-width="15" stroke-linecap="round"/>' +
           '<path d="' + HANDLE + '" fill="none" stroke="' + strokeInner + '" stroke-width="8" stroke-linecap="round"/>';
  }

  var FONT = 'font-family="Trebuchet MS, Avenir Next, Verdana, sans-serif"';

  /* ---- Global Icon：白杯 + 彩色画带 ---- */
  function giBody(m, P, u) {
    var name = esc(m.city.toUpperCase());
    var fs = nameSize(m.city, 21, 11);
    return handle('#d9d1c1', '#fbf8f1') +
      '<clipPath id="mclip' + u + '"><rect x="44" y="38" width="140" height="150" rx="16"/></clipPath>' +
      '<rect x="44" y="38" width="140" height="150" rx="16" fill="#fbf8f1" stroke="#d9d1c1" stroke-width="2"/>' +
      '<text x="114" y="57" ' + FONT + ' font-size="8" letter-spacing="3" text-anchor="middle" fill="#a89f90">GLOBAL ICON</text>' +
      '<text x="114" y="86" ' + FONT + ' font-size="' + fs + '" font-weight="700" letter-spacing="1" text-anchor="middle" fill="' + P[0] + '"' + fit(m.city, fs, 1, 132) + '>' + name + '</text>' +
      '<g clip-path="url(#mclip' + u + ')">' +
      '<rect x="44" y="97" width="140" height="4" fill="' + P[2] + '"/>' +
      '<rect x="44" y="101" width="140" height="62" fill="' + P[1] + '" opacity=".12"/>' +
      '<rect x="44" y="163" width="140" height="4" fill="' + P[2] + '"/>' +
      '</g>' +
      scene(m, P[1], 84, 102, 1, '#fbf8f1') +
      '<text x="114" y="181" ' + FONT + ' font-size="9.5" letter-spacing="2" text-anchor="middle" fill="' + P[1] + '"' + fit(m.country, 9.5, 2, 134) + '>' + esc(m.country.toUpperCase()) + '</text>';
  }

  /* ---- You Are Here：彩色杯身 + 白色画框 ---- */
  function yahBody(m, P, u) {
    var name = esc(m.city.toUpperCase());
    var fs = nameSize(m.city, 13, 13);
    return handle(P[0], P[0]) +
      '<clipPath id="mclip' + u + '"><rect x="44" y="38" width="140" height="150" rx="16"/></clipPath>' +
      '<rect x="44" y="38" width="140" height="150" rx="16" fill="' + P[0] + '"/>' +
      '<g clip-path="url(#mclip' + u + ')"><rect x="44" y="38" width="140" height="10" fill="' + P[1] + '"/></g>' +
      '<path id="yarc' + u + '" d="M68 76 Q114 52 160 76" fill="none"/>' +
      '<text ' + FONT + ' font-size="9.5" letter-spacing="2.5" fill="#fdfaf4">' +
      '<textPath href="#yarc' + u + '" startOffset="50%" text-anchor="middle">YOU ARE HERE</textPath></text>' +
      '<rect x="60" y="82" width="108" height="64" rx="9" fill="#fdfaf4"/>' +
      '<rect x="65" y="87" width="98" height="54" rx="6" fill="none" stroke="' + P[1] + '" stroke-width="1.5" stroke-dasharray="4 3"/>' +
      scene(m, P[0], 89, 89, 0.83, '#fdfaf4') +
      '<rect x="60" y="152" width="108" height="22" rx="5" fill="' + P[1] + '"/>' +
      '<text x="114" y="167" ' + FONT + ' font-size="' + fs + '" font-weight="700" letter-spacing="1" text-anchor="middle" fill="#fdfaf4"' + fit(m.city, fs, 1, 100) + '>' + name + '</text>' +
      '<text x="114" y="184" ' + FONT + ' font-size="7.5" letter-spacing="2" text-anchor="middle" fill="#fdfaf4" opacity=".75"' + fit(m.country, 7.5, 2, 130) + '>' + esc(m.country.toUpperCase()) + '</text>';
  }

  /* ---- Been There：浮雕拼贴风 ---- */
  function btBody(m, P, u) {
    var name = esc(m.city.toUpperCase());
    var big = esc(m.city.slice(0, 3).toUpperCase());
    var fs = nameSize(m.city, 15, 12);
    var stripes = '';
    for (var sx = 52; sx < 184; sx += 11) {
      stripes += '<line x1="' + sx + '" y1="38" x2="' + sx + '" y2="188" stroke="#000" stroke-width="4" opacity=".035"/>';
    }
    return handle('#e8dfc8', '#f6f0e0') +
      '<clipPath id="mclip' + u + '"><rect x="44" y="38" width="140" height="150" rx="18"/></clipPath>' +
      '<rect x="44" y="38" width="140" height="150" rx="18" fill="#f6f0e0" stroke="#ddd0b2" stroke-width="2"/>' +
      '<g clip-path="url(#mclip' + u + ')">' + stripes +
      '<text x="114" y="150" ' + FONT + ' font-size="86" font-weight="800" text-anchor="middle" fill="' + P[0] + '" opacity=".18">' + big + '</text>' +
      '<circle cx="70" cy="70" r="7" fill="' + P[2] + '" opacity=".85"/>' +
      '<circle cx="162" cy="120" r="9" fill="' + P[2] + '" opacity=".6"/>' +
      '<circle cx="66" cy="132" r="5" fill="' + P[1] + '" opacity=".5"/>' +
      '<rect x="44" y="152" width="140" height="36" fill="' + P[0] + '"/>' +
      '</g>' +
      '<text x="114" y="56" ' + FONT + ' font-size="8" letter-spacing="3.5" text-anchor="middle" fill="' + P[1] + '">BEEN THERE</text>' +
      scene(m, P[1], 78, 68, 1.2, '#f6f0e0') +
      '<text x="114" y="172" ' + FONT + ' font-size="' + fs + '" font-weight="700" letter-spacing="1" text-anchor="middle" fill="#fdfaf4"' + fit(m.city, fs, 1, 132) + '>' + name + '</text>' +
      '<text x="114" y="183" ' + FONT + ' font-size="7" letter-spacing="2" text-anchor="middle" fill="#fdfaf4" opacity=".7"' + fit(m.country, 7, 2, 130) + '>' + esc(m.country.toUpperCase()) + '</text>';
  }

  /* ---- Discovery：彩绘拱窗风 ---- */
  function dcBody(m, P, u) {
    var name = esc(m.city.toUpperCase());
    var fs = nameSize(m.city, 14, 12);
    return handle(P[0], P[0]) +
      '<clipPath id="mclip' + u + '"><rect x="44" y="38" width="140" height="150" rx="16"/></clipPath>' +
      '<rect x="44" y="38" width="140" height="150" rx="16" fill="#fbf8f1" stroke="#d9d1c1" stroke-width="2"/>' +
      '<g clip-path="url(#mclip' + u + ')">' +
      '<rect x="44" y="38" width="140" height="150" fill="' + P[0] + '" opacity=".10"/>' +
      '<path d="M44 150 q35 -22 70 0 t70 0 v38 h-140 z" fill="' + P[0] + '" opacity=".22"/>' +
      '<path d="M44 162 q35 -20 70 0 t70 0 v26 h-140 z" fill="' + P[0] + '"/>' +
      '</g>' +
      '<path d="M74 130 v-32 a40 40 0 0 1 80 0 v32 z" fill="#fdfaf4" stroke="' + P[1] + '" stroke-width="2.5"/>' +
      scene(m, P[1], 84, 74, 0.83, '#fdfaf4') +
      '<text x="114" y="56" ' + FONT + ' font-size="7.5" letter-spacing="3" text-anchor="middle" fill="' + P[1] + '">DISCOVERY</text>' +
      '<circle cx="114" cy="140" r="2.5" fill="' + P[2] + '"/>' +
      '<line x1="82" y1="140" x2="105" y2="140" stroke="' + P[2] + '" stroke-width="1.5"/>' +
      '<line x1="123" y1="140" x2="146" y2="140" stroke="' + P[2] + '" stroke-width="1.5"/>' +
      '<text x="114" y="177" ' + FONT + ' font-size="' + fs + '" font-weight="700" letter-spacing="1" text-anchor="middle" fill="#fdfaf4"' + fit(m.city, fs, 1, 130) + '>' + name + '</text>' +
      '<text x="114" y="186" ' + FONT + ' font-size="6.5" letter-spacing="2" text-anchor="middle" fill="#fdfaf4" opacity=".8"' + fit(m.country, 6.5, 2, 128) + '>' + esc(m.country.toUpperCase()) + '</text>';
  }

  /* ---- 挂饰：圆球造型 ---- */
  function ornamentBody(m, P, u) {
    var name = esc(m.city.toUpperCase());
    var fs = nameSize(m.city, 12, 13);
    return '<path d="M114 6 Q126 16 114 26" fill="none" stroke="#b8a06a" stroke-width="2.5"/>' +
      '<rect x="103" y="26" width="22" height="15" rx="4" fill="#c9ab66"/>' +
      '<circle cx="114" cy="122" r="80" fill="#fdfaf4" stroke="' + P[0] + '" stroke-width="6"/>' +
      '<circle cx="114" cy="122" r="68" fill="none" stroke="' + P[2] + '" stroke-width="1.5" stroke-dasharray="5 4"/>' +
      '<path id="oarc' + u + '" d="M64 104 Q114 62 164 104" fill="none"/>' +
      '<text ' + FONT + ' font-size="9" letter-spacing="2" fill="' + P[1] + '">' +
      '<textPath href="#oarc' + u + '" startOffset="50%" text-anchor="middle">' + esc(seriesLabel(m.series)) + '</textPath></text>' +
      scene(m, P[1], 87, 96, 0.9, '#fdfaf4') +
      '<text x="114" y="168" ' + FONT + ' font-size="' + fs + '" font-weight="700" letter-spacing="1" text-anchor="middle" fill="' + P[0] + '"' + fit(m.city, fs, 1, 116) + '>' + name + '</text>' +
      '<text x="114" y="182" ' + FONT + ' font-size="8" text-anchor="middle" fill="' + P[2] + '">' + (m.year || '') + '</text>';
  }

  function seriesLabel(s) {
    if (s === 'global-icon') return 'GLOBAL ICON';
    if (s === 'you-are-here') return 'YOU ARE HERE';
    if (s === 'been-there') return 'BEEN THERE';
    if (s === 'discovery') return 'DISCOVERY';
    return 'CITY MUG';
  }

  function svg(m, size) {
    size = size || 200;
    var u = ++uid;
    var P = palette(m);
    var inner;
    if (m.type === 'ornament') inner = ornamentBody(m, P, u);
    else if (m.series === 'you-are-here') inner = yahBody(m, P, u);
    else if (m.series === 'been-there') inner = btBody(m, P, u);
    else if (m.series === 'discovery') inner = dcBody(m, P, u);
    else inner = giBody(m, P, u);
    var h = Math.round(size * 220 / 260);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 220" width="' + size + '" height="' + h +
      '" role="img" aria-label="' + esc(m.city) + ' ' + (m.type === 'ornament' ? 'ornament' : 'mug') + '">' + inner + '</svg>';
  }

  return { svg: svg, seriesLabel: seriesLabel, _seed: seedOf, hasPlaceArt: hasPlaceArt };
})();
