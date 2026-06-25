/**
 * 魔弹王 图鉴立绘 SVG 生成器
 * 输出 1080×1080 动漫风格矢量图，按属性分组存放
 * 用法：node scripts/generate_svgs.js
 */
const fs = require('fs');
const path = require('path');

const SIZE = 1080;
const OUT_DIR = path.join(__dirname, '..', 'images', 'monsters');

// ============ 元素配色方案 ============
const ELEM = {
  fire:  { name:'火', icon:'🔥', hex:'#e74c3c', hex2:'#c0392b', hexLight:'#ff6b6b', hexDark:'#8b1a1a', hexGlow:'rgba(231,76,60,.4)', bgGrad:['#2d0a0a','#1a0505'], accent:'#ff9f43' },
  water: { name:'水', icon:'💧', hex:'#2e86c1', hex2:'#1a5276', hexLight:'#5dade2', hexDark:'#0d3b5e', hexGlow:'rgba(46,134,193,.4)', bgGrad:['#0a1a2d','#050d1a'], accent:'#48dbfb' },
  wind:  { name:'风', icon:'🍃', hex:'#27ae60', hex2:'#1a6e3a', hexLight:'#58d68d', hexDark:'#0d4a22', hexGlow:'rgba(39,174,96,.4)', bgGrad:['#0a1a0d','#050d06'], accent:'#a8e6cf' },
  earth: { name:'土', icon:'🪨', hex:'#c0852e', hex2:'#8b5e24', hexLight:'#e6b85c', hexDark:'#5c3810', hexGlow:'rgba(192,133,46,.4)', bgGrad:['#1a1008','#0d0804'], accent:'#f0c040' },
  light: { name:'光', icon:'✨', hex:'#f1c40f', hex2:'#d4a017', hexLight:'#ffe066', hexDark:'#8b7500', hexGlow:'rgba(241,196,15,.5)', bgGrad:['#1a1505','#0d0a02'], accent:'#fff9c4' },
  dark:  { name:'暗', icon:'🌑', hex:'#7d3c98', hex2:'#512e6b', hexLight:'#c39bd3', hexDark:'#2d1240', hexGlow:'rgba(125,60,152,.4)', bgGrad:['#120a18','#09050d'], accent:'#e040fb' },
};

// ============ 全魔弹名单（按属性分组） ============
const MONSTERS = {
  fire: [
    { id:'baoyanlong',       name:'爆焱龙',   nick:'烈焰的咆哮',   category:'dragon' },
    { id:'chiyanliehuang',   name:'赤焰烈凰',   nick:'不死鸟之焰',   category:'phoenix' },
    { id:'huoyilongwang',    name:'火翼龙王',   nick:'苍穹霸主',     category:'dragon' },
    { id:'lieyanxiongshi',   name:'烈焰雄狮',   nick:'草原支配者',   category:'beast' },
    { id:'ronghuojuxi',      name:'熔火巨蜥',   nick:'熔岩潜伏者',   category:'reptile' },
    { id:'yanmolingzhu',     name:'炎魔领主',   nick:'地狱烈焰之主', category:'demon' },
    { id:'fentianhuolong',   name:'焚天火龙',   nick:'天空焚尽者',   category:'dragon' },
    { id:'jinhuohu',         name:'烬火狐',     nick:'余烬之舞',     category:'beast' },
  ],
  water: [
    { id:'huanqilin',        name:'幻麒麟',     nick:'水月幻境',     category:'mythical' },
    { id:'jibingtengshe',    name:'极冰腾蛇',   nick:'寒冰追魂',     category:'serpent' },
    { id:'binglinhaishou',   name:'冰麟海兽',   nick:'深海霸主',     category:'beast' },
    { id:'canglanjiaolong',  name:'沧澜蛟龙',   nick:'沧海之怒',     category:'dragon' },
    { id:'bingjingxuanguei', name:'冰晶玄龟',   nick:'永冻守护者',   category:'beast' },
    { id:'chaoxirenyu',      name:'潮汐人鱼',   nick:'海之旋律',     category:'humanoid' },
    { id:'hanshuanglinge',   name:'寒霜灵鳄',   nick:'冰河猎手',     category:'reptile' },
    { id:'shenyuanshuilong', name:'深渊水龙',   nick:'深渊之眼',     category:'dragon' },
  ],
  wind: [
    { id:'xuanlingfenghuang',name:'玄翎凤凰',   nick:'翎羽飓火',     category:'phoenix' },
    { id:'guimianshengjun',  name:'鬼面圣君',   nick:'风裂龙卷',     category:'demon' },
    { id:'jifengshenying',   name:'疾风神鹰',   nick:'苍穹之瞳',     category:'bird' },
    { id:'xuanfengleisun',   name:'旋风雷隼',   nick:'雷霆疾风',     category:'bird' },
    { id:'yunyitianma',      name:'云翼天马',   nick:'天空行者',     category:'mythical' },
    { id:'baofenglinghu',    name:'暴风灵狐',   nick:'风之诡计',     category:'beast' },
    { id:'liuyunfeiyuan',    name:'流云飞鸢',   nick:'苍穹之舞',     category:'bird' },
    { id:'leitingfenglang',  name:'雷霆风狼',   nick:'风暴猎手',     category:'beast' },
  ],
  earth: [
    { id:'chaonengzhanhu',   name:'超能战虎',   nick:'霸极之力',     category:'beast' },
    { id:'bajihuanghu',      name:'霸极皇虎',   nick:'皇者降临',     category:'beast' },
    { id:'moyanjuxiang',     name:'摩岩巨象',   nick:'大地守护者',   category:'beast' },
    { id:'changweiyinhu',    name:'长尾银狐',   nick:'狡黠之影',     category:'beast' },
    { id:'zhuangjiayangui',  name:'装甲岩龟',   nick:'不破之盾',     category:'beast' },
    { id:'moyuduxie',        name:'魔域毒蝎',   nick:'暗影毒针',     category:'reptile' },
    { id:'yanjiajuxiong',    name:'岩甲巨熊',   nick:'山岳之怒',     category:'beast' },
    { id:'shanyueshixi',     name:'山岳石犀',   nick:'大地冲锋',     category:'beast' },
  ],
  light: [
    { id:'dujiaotianma',     name:'独角天马',   nick:'圣光自愈',     category:'mythical' },
    { id:'shengguangtianma', name:'圣光天马',   nick:'荣耀之光',     category:'mythical' },
    { id:'shengguangqilin',  name:'圣光麒麟',   nick:'神圣庇护',     category:'mythical' },
    { id:'tianyaoshenlong',  name:'天耀神龙',   nick:'苍穹之光',     category:'dragon' },
    { id:'huiguangtianshi',  name:'辉光天使',   nick:'光明之翼',     category:'humanoid' },
    { id:'xingchenbailu',    name:'星辰白鹿',   nick:'星之引导',     category:'mythical' },
    { id:'yaojingshijiu',    name:'耀晶狮鹫',   nick:'光之审判',     category:'mythical' },
    { id:'xiguanglinglu',    name:'曦光灵鹿',   nick:'晨光使者',     category:'mythical' },
  ],
  dark: [
    { id:'anheimolong',      name:'暗黑魔龙',   nick:'虚无之翼',     category:'dragon' },
    { id:'xieyingxiuluo',    name:'邪影修罗',   nick:'影之支配者',   category:'demon' },
    { id:'hundreduneling',   name:'混沌恶灵',   nick:'黑暗侵蚀',     category:'demon' },
    { id:'shenmoshuangti',   name:'神魔双体',   nick:'魔影重重',     category:'demon' },
    { id:'anyingmofu',       name:'暗影魔蝠',   nick:'夜幕猎手',     category:'beast' },
    { id:'shihunyelang',     name:'噬魂夜狼',   nick:'月下狂啸',     category:'beast' },
    { id:'youmingmolong',    name:'幽冥魔龙',   nick:'冥界之门',     category:'dragon' },
    { id:'shenyuanmozhu',    name:'深渊魔主',   nick:'万魔之主',     category:'demon' },
  ],
};

// ============ SVG 模板：各形态装饰元素 ============

function svgHeader(el) { return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">`; }
function svgFooter() { return '</svg>'; }

function defs(el) {
  const e = ELEM[el];
  return `<defs>
    <radialGradient id="bgGlow" cx="50%" cy="45%"> <stop offset="0%" stop-color="${e.hex}" stop-opacity=".35"/> <stop offset="60%" stop-color="${e.hex2}" stop-opacity=".12"/> <stop offset="100%" stop-color="#0a0a14" stop-opacity="1"/> </radialGradient>
    <radialGradient id="coreGlow" cx="50%" cy="50%"> <stop offset="0%" stop-color="${e.hexLight}" stop-opacity=".9"/> <stop offset="50%" stop-color="${e.hex}" stop-opacity=".4"/> <stop offset="100%" stop-color="${e.hex}" stop-opacity="0"/> </radialGradient>
    <radialGradient id="innerLight" cx="50%" cy="40%"> <stop offset="0%" stop-color="#fff" stop-opacity=".4"/> <stop offset="100%" stop-color="#fff" stop-opacity="0"/> </radialGradient>
    <linearGradient id="titleBar" x1="0" y1="0" x2="1" y2="0"> <stop offset="0%" stop-color="${e.hex}" stop-opacity="0"/> <stop offset="20%" stop-color="${e.hex}" stop-opacity=".8"/> <stop offset="80%" stop-color="${e.hex}" stop-opacity=".8"/> <stop offset="100%" stop-color="${e.hex}" stop-opacity="0"/> </linearGradient>
    <linearGradient id="cardBorder" x1="0" y1="0" x2="1" y2="1"> <stop offset="0%" stop-color="${e.hexLight}"/> <stop offset="50%" stop-color="${e.hex}"/> <stop offset="100%" stop-color="${e.hexDark}"/> </linearGradient>
    <linearGradient id="nameGlow" x1="0" y1="0" x2="0" y2="1"> <stop offset="0%" stop-color="${e.hexLight}"/> <stop offset="100%" stop-color="${e.hex}"/> </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="8" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="softGlow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="bigGlow"><feGaussianBlur stdDeviation="20"/></filter>
  </defs>`;
}

// 背景
function bg(el) {
  const e = ELEM[el];
  return `<rect width="${SIZE}" height="${SIZE}" fill="url(#bgGlow)"/>
    <!-- 网格线 -->
    <g opacity=".03">${Array.from({length:10},(_,i)=>
      `<line x1="0" y1="${i*108}" x2="${SIZE}" y2="${i*108}" stroke="${e.hex}" stroke-width="1"/>
       <line x1="${i*108}" y1="0" x2="${i*108}" y2="${SIZE}" stroke="${e.hex}" stroke-width="1"/>`).join('')}</g>`;
}

// 底部卡片框
function cardFrame(el) {
  const e = ELEM[el];
  return `<rect x="40" y="750" width="1000" height="300" rx="20" fill="rgba(10,10,20,.85)" stroke="url(#cardBorder)" stroke-width="3"/>
    <rect x="40" y="750" width="1000" height="300" rx="20" fill="url(#innerLight)" opacity=".06"/>`;
}

// 名称文字
function nameText(el, mon) {
  const e = ELEM[el];
  return `<text x="540" y="835" text-anchor="middle" font-size="64" font-weight="900" fill="url(#nameGlow)" font-family="'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif" filter="url(#glow)">${mon.name}</text>
    <text x="540" y="890" text-anchor="middle" font-size="28" fill="${e.hexLight}" font-family="'PingFang SC','Microsoft YaHei',sans-serif" opacity=".85">${mon.nick}</text>
    <text x="540" y="940" text-anchor="middle" font-size="22" fill="${e.hexLight}" opacity=".5">${e.icon} ${e.name}属性</text>
    <!-- 底部属性色条 -->
    <rect x="300" y="970" width="480" height="4" rx="2" fill="${e.hex}" opacity=".6"/>
    <rect x="350" y="984" width="380" height="2" rx="1" fill="${e.hex}" opacity=".3"/>`;
}

// 装饰光环
function haloRings(el) {
  const e = ELEM[el];
  return `<ellipse cx="540" cy="400" rx="320" ry="320" fill="none" stroke="${e.hex}" stroke-width="2" opacity=".15">
      <animateTransform attributeName="transform" type="rotate" from="0 540 400" to="360 540 400" dur="60s" repeatCount="indefinite"/>
    </ellipse>
    <ellipse cx="540" cy="400" rx="280" ry="280" fill="none" stroke="${e.hexLight}" stroke-width="1" opacity=".1" stroke-dasharray="20 10">
      <animateTransform attributeName="transform" type="rotate" from="360 540 400" to="0 540 400" dur="40s" repeatCount="indefinite"/>
    </ellipse>
    <ellipse cx="540" cy="400" rx="360" ry="360" fill="none" stroke="${e.hex}" stroke-width="1" opacity=".06" stroke-dasharray="8 16"/>`;
}

// 核心光球
function coreGlow(el) {
  return `<circle cx="540" cy="380" r="180" fill="url(#coreGlow)" filter="url(#bigGlow)" opacity=".6"/>
    <circle cx="540" cy="380" r="100" fill="url(#coreGlow)" opacity=".3"/>`;
}

// 元素图标
function elementIcon(el) {
  const e = ELEM[el];
  return `<text x="540" y="420" text-anchor="middle" font-size="140" filter="url(#glow)">${e.icon}</text>`;
}

// ============ 各形态特色装饰 ============

// 龙形态：翅膀 + 火焰/水流喷吐
function dragonForm(el) {
  const e = ELEM[el];
  const h = el==='fire'?'#ff6b6b':el==='water'?'#5dade2':el==='dark'?'#c39bd3':'#ffe066';
  return `<g opacity=".5">
    <!-- 左翼 -->
    <path d="M540,380 Q380,200 250,140 Q320,260 380,340 Q300,180 180,120 Q280,260 360,360" fill="none" stroke="${h}" stroke-width="2" opacity=".3"/>
    <path d="M540,380 Q400,220 280,160 Q340,270 390,340" fill="${h}" opacity=".08"/>
    <!-- 右翼 -->
    <path d="M540,380 Q700,200 830,140 Q760,260 700,340 Q780,180 900,120 Q800,260 720,360" fill="none" stroke="${h}" stroke-width="2" opacity=".3"/>
    <path d="M540,380 Q680,220 800,160 Q740,270 690,340" fill="${h}" opacity=".08"/>
    <!-- 龙息 -->
    <path d="M540,480 Q520,540 500,600 Q540,560 560,520" fill="${e.hex}" opacity=".15" filter="url(#softGlow)"/>
  </g>`;
}

// 凤凰/鸟形态：华丽尾羽
function phoenixForm(el) {
  const e = ELEM[el];
  const c = el==='fire'?'#ff9f43':el==='wind'?'#58d68d':'#ffe066';
  return `<g opacity=".4">
    <path d="M420,460 Q350,580 280,680" fill="none" stroke="${c}" stroke-width="3" opacity=".4"><animate attributeName="opacity" values=".2;.5;.2" dur="3s" repeatCount="indefinite"/></path>
    <path d="M460,470 Q400,600 340,700" fill="none" stroke="${e.hexLight}" stroke-width="2" opacity=".3"><animate attributeName="opacity" values=".3;.6;.3" dur="2.5s" repeatCount="indefinite"/></path>
    <path d="M500,465 Q460,590 420,690" fill="none" stroke="${c}" stroke-width="2.5" opacity=".35"><animate attributeName="opacity" values=".25;.55;.25" dur="3.5s" repeatCount="indefinite"/></path>
    <path d="M660,460 Q730,580 800,680" fill="none" stroke="${c}" stroke-width="3" opacity=".4"><animate attributeName="opacity" values=".2;.5;.2" dur="3s" repeatCount="indefinite"/></path>
    <path d="M620,470 Q680,600 740,700" fill="none" stroke="${e.hexLight}" stroke-width="2" opacity=".3"><animate attributeName="opacity" values=".3;.6;.3" dur="2.5s" repeatCount="indefinite"/></path>
    <path d="M580,465 Q620,590 660,690" fill="none" stroke="${c}" stroke-width="2.5" opacity=".35"><animate attributeName="opacity" values=".25;.55;.25" dur="3.5s" repeatCount="indefinite"/></path>
  </g>`;
}

// 兽形态：利爪/鬃毛
function beastForm(el) {
  const e = ELEM[el];
  return `<g opacity=".25">
    <circle cx="380" cy="320" r="30" fill="none" stroke="${e.hexLight}" stroke-width="2"/>
    <circle cx="700" cy="320" r="30" fill="none" stroke="${e.hexLight}" stroke-width="2"/>
    <!-- 能量鬃毛 -->
    <path d="M540,280 Q450,200 380,160" fill="none" stroke="${e.hex}" stroke-width="3" opacity=".3"/>
    <path d="M540,280 Q630,200 700,160" fill="none" stroke="${e.hex}" stroke-width="3" opacity=".3"/>
    <path d="M540,280 Q500,180 460,140" fill="none" stroke="${e.hexLight}" stroke-width="2" opacity=".2"/>
    <path d="M540,280 Q580,180 620,140" fill="none" stroke="${e.hexLight}" stroke-width="2" opacity=".2"/>
  </g>`;
}

// 恶魔/暗影形态
function demonForm(el) {
  const e = ELEM[el];
  return `<g opacity=".35">
    <path d="M440,300 Q400,200 340,120" fill="none" stroke="${e.hex}" stroke-width="3" opacity=".4"><animate attributeName="opacity" values=".2;.5;.2" dur="2s" repeatCount="indefinite"/></path>
    <path d="M640,300 Q680,200 740,120" fill="none" stroke="${e.hex}" stroke-width="3" opacity=".4"><animate attributeName="opacity" values=".2;.5;.2" dur="2s" repeatCount="indefinite"/></path>
    <!-- 暗影触须 -->
    <path d="M540,500 Q480,600 420,680" fill="none" stroke="${e.hexLight}" stroke-width="2" opacity=".3"><animate attributeName="opacity" values=".15;.4;.15" dur="2.8s" repeatCount="indefinite"/></path>
    <path d="M540,500 Q600,600 660,680" fill="none" stroke="${e.hexLight}" stroke-width="2" opacity=".3"><animate attributeName="opacity" values=".15;.4;.15" dur="2.8s" repeatCount="indefinite"/></path>
    <path d="M540,500 Q520,620 500,700" fill="none" stroke="${e.hex}" stroke-width="1.5" opacity=".2"><animate attributeName="opacity" values=".1;.35;.1" dur="3.2s" repeatCount="indefinite"/></path>
  </g>`;
}

// 神兽形态
function mythicalForm(el) {
  const e = ELEM[el];
  return `<g opacity=".3">
    <!-- 神圣光环 -->
    <ellipse cx="540" cy="310" rx="200" ry="40" fill="none" stroke="${e.hexLight}" stroke-width="1.5" opacity=".3">
      <animate attributeName="rx" values="200;220;200" dur="4s" repeatCount="indefinite"/>
    </ellipse>
    <ellipse cx="540" cy="310" rx="230" ry="55" fill="none" stroke="${e.hex}" stroke-width="1" opacity=".15">
      <animate attributeName="rx" values="230;210;230" dur="3.5s" repeatCount="indefinite"/>
    </ellipse>
    <!-- 圣光粒子 -->
    ${Array.from({length:8},(_,i)=>{
      const angle = (i/8)*Math.PI*2;
      const x=540+Math.cos(angle)*160, y=310+Math.sin(angle)*160;
      return `<circle cx="${x}" cy="${y}" r="4" fill="${e.hexLight}" opacity=".5"><animate attributeName="opacity" values=".2;.7;.2" dur="${2+i*.3}s" repeatCount="indefinite"/></circle>`;
    }).join('')}
  </g>`;
}

// 人形态
function humanoidForm(el) {
  const e = ELEM[el];
  return `<g opacity=".3">
    <!-- 人形能量轮廓 -->
    <ellipse cx="540" cy="310" rx="60" ry="80" fill="none" stroke="${e.hexLight}" stroke-width="2" opacity=".3"/>
    <ellipse cx="540" cy="230" rx="40" ry="45" fill="none" stroke="${e.hexLight}" stroke-width="1.5" opacity=".25"/>
    <!-- 双臂 -->
    <path d="M480,280 Q420,300 380,340" fill="none" stroke="${e.hex}" stroke-width="2" opacity=".25"/>
    <path d="M600,280 Q660,300 700,340" fill="none" stroke="${e.hex}" stroke-width="2" opacity=".25"/>
  </g>`;
}

// 蛇形
function serpentForm(el) {
  const e = ELEM[el];
  return `<g opacity=".3">
    <path d="M540,300 Q580,400 540,500 Q500,580 460,640" fill="none" stroke="${e.hexLight}" stroke-width="3" opacity=".3">
      <animate attributeName="d" values="M540,300 Q580,400 540,500 Q500,580 460,640;M540,300 Q560,400 540,500 Q520,580 480,640;M540,300 Q580,400 540,500 Q500,580 460,640" dur="4s" repeatCount="indefinite"/>
    </path>
    <path d="M540,300 Q500,400 540,500 Q580,580 620,640" fill="none" stroke="${e.hex}" stroke-width="2" opacity=".2"/>
  </g>`;
}

// 爬虫形态
function reptileForm(el) {
  const e = ELEM[el];
  return `<g opacity=".3">
    <!-- 甲壳纹理 -->
    <path d="M440,380 L540,340 L640,380 L540,420 Z" fill="none" stroke="${e.hexLight}" stroke-width="1.5" opacity=".2"/>
    <path d="M460,420 L540,390 L620,420 L540,450 Z" fill="none" stroke="${e.hexLight}" stroke-width="1" opacity=".15"/>
    <circle cx="460" cy="360" r="8" fill="${e.hex}" opacity=".1"/>
    <circle cx="620" cy="360" r="8" fill="${e.hex}" opacity=".1"/>
  </g>`;
}

// 合击形态
function comboForm(el) {
  const e = ELEM[el];
  return `<g opacity=".4">
    <!-- 多重能量汇聚 -->
    <circle cx="400" cy="360" r="60" fill="none" stroke="${e.hexLight}" stroke-width="2" opacity=".3">
      <animate attributeName="r" values="60;75;60" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="680" cy="360" r="60" fill="none" stroke="${e.hex}" stroke-width="2" opacity=".3">
      <animate attributeName="r" values="60;75;60" dur="2.2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="540" cy="300" r="60" fill="none" stroke="${e.hexLight}" stroke-width="2" opacity=".3">
      <animate attributeName="r" values="60;75;60" dur="1.8s" repeatCount="indefinite"/>
    </circle>
    <!-- 连接线 -->
    <line x1="400" y1="360" x2="680" y2="360" stroke="${e.hex}" stroke-width="1" opacity=".2"/>
    <line x1="400" y1="360" x2="540" y2="300" stroke="${e.hexLight}" stroke-width="1" opacity=".2"/>
    <line x1="680" y1="360" x2="540" y2="300" stroke="${e.hex}" stroke-width="1" opacity=".2"/>
  </g>`;
}

// 能量粒子
function particles(el) {
  const e = ELEM[el];
  return Array.from({length:12},(_,i)=>{
    const x = 200 + Math.random()*680;
    const y = 100 + Math.random()*580;
    const r = 1.5 + Math.random()*3;
    const dur = 2 + Math.random()*4;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${e.hexLight}" opacity=".3">
      <animate attributeName="opacity" values=".1;.5;.1" dur="${dur}s" repeatCount="indefinite"/>
      <animate attributeName="cy" values="${y};${y-10-Math.random()*20};${y}" dur="${dur}s" repeatCount="indefinite"/>
    </circle>`;
  }).join('');
}

// ============ 组装 SVG ============
function buildSVG(el, mon) {
  let formFn;
  switch(mon.category) {
    case 'dragon': formFn = dragonForm; break;
    case 'phoenix': formFn = phoenixForm; break;
    case 'bird': formFn = phoenixForm; break; // 鸟类用凤凰羽毛风格
    case 'beast': formFn = beastForm; break;
    case 'demon': formFn = demonForm; break;
    case 'mythical': formFn = mythicalForm; break;
    case 'humanoid': formFn = humanoidForm; break;
    case 'serpent': formFn = serpentForm; break;
    case 'reptile': formFn = reptileForm; break;
    case 'combo': formFn = comboForm; break;
    default: formFn = beastForm;
  }

  return svgHeader(el)
    + defs(el)
    + bg(el)
    + haloRings(el)
    + coreGlow(el)
    + formFn(el)
    + elementIcon(el)
    + particles(el)
    + cardFrame(el)
    + nameText(el, mon)
    + svgFooter();
}

// ============ 主程序 ============
function main() {
  // 清空输出目录
  if (fs.existsSync(OUT_DIR)) {
    fs.rmSync(OUT_DIR, { recursive: true });
  }

  let total = 0;
  for (const [group, mons] of Object.entries(MONSTERS)) {
    const elDir = path.join(OUT_DIR, group);
    fs.mkdirSync(elDir, { recursive: true });

    mons.forEach(mon => {
      const el = mon.el || group; // 联动魔弹用自带属性，普通魔弹用分组属性
      const svg = buildSVG(el, mon);
      const filename = `${group}_${mon.name}.svg`;
      const filepath = path.join(elDir, filename);
      fs.writeFileSync(filepath, svg, 'utf-8');
      total++;
      console.log(`  ✅ ${group}/${filename}`);
    });
  }

  console.log(`\n🎉 全部 ${total} 个魔弹 SVG 图鉴生成完毕！`);
  console.log(`📁 输出目录: ${OUT_DIR}`);
  console.log(`    ├── fire/     (${MONSTERS.fire.length} 个)`);
  console.log(`    ├── water/    (${MONSTERS.water.length} 个)`);
  console.log(`    ├── wind/     (${MONSTERS.wind.length} 个)`);
  console.log(`    ├── earth/    (${MONSTERS.earth.length} 个)`);
  console.log(`    ├── light/    (${MONSTERS.light.length} 个)`);
  console.log(`    ├── dark/     (${MONSTERS.dark.length} 个)`);
  console.log(`    └── combo/    (${MONSTERS.combo.length} 个)`);
}

main();
