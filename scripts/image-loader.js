/**
 * ============================================================
 *  魔弹王 — 立绘图片加载与缓存模块
 *  功能：按魔弹名称自动匹配图片路径，三级回退，预加载+缓存
 *  素材规范：1080×1080 透明 PNG，命名 = 魔弹名称.png
 *  当前回退：PNG → JPG → SVG（确保始终有图可显）
 * ============================================================
 */

/* ============================================================
 *  一、元素与目录映射
 * ============================================================ */
const ELEMENT_TO_DIR = {
  '火': 'fire',
  '水': 'water',
  '风': 'wind',
  '土': 'earth',
  '光': 'light',
  '暗': 'dark',
};

const MATERIAL_DIR = '素材';           // 主素材目录（PNG/JPG）
const SVG_DIR = 'images/monsters';    // SVG 回退目录

/** SVG 文件名纠正表（当前无差异，保留字段供日后扩展） */
const SVG_NAME_OVERRIDE = {};

/* ============================================================
 *  二、魔弹基础数据（54只）
 *      name       - 中文名称（与素材文件名一致）
 *      element    - 属性：火/水/风/土/光/暗/全
 * ============================================================ */
const MONSTER_DATA = [
  // ==================== 火属性（8只） ====================
  { name: '爆炎龙',     element: '火' },
  { name: '火翼龙王',   element: '火' },
  { name: '赤焰烈凰',   element: '火' },
  { name: '熔火巨蜥',   element: '火' },
  { name: '炎魔领主',   element: '火' },
  { name: '焚天火龙',   element: '火' },
  { name: '烬火狐',     element: '火' },
  { name: '烈焰雄狮',   element: '火' },

  // ==================== 水属性（8只） ====================
  { name: '幻麒麟',     element: '水' },
  { name: '极冰腾蛇',   element: '水' },
  { name: '沧澜蛟龙',   element: '水' },
  { name: '冰晶玄龟',   element: '水' },
  { name: '潮汐人鱼',   element: '水' },
  { name: '寒霜灵鳄',   element: '水' },
  { name: '深渊水龙',   element: '水' },
  { name: '冰麟海兽',   element: '水' },

  // ==================== 风属性（8只） ====================
  { name: '玄翎凤凰',   element: '风' },
  { name: '疾风神鹰',   element: '风' },
  { name: '旋风雷隼',   element: '风' },
  { name: '云翼天马',   element: '风' },
  { name: '暴风灵狐',   element: '风' },
  { name: '流云飞鸢',   element: '风' },
  { name: '雷霆风狼',   element: '风' },
  { name: '鬼面圣君',   element: '风' },

  // ==================== 土属性（7只） ====================
  { name: '超能战虎',   element: '土' },
  { name: '霸极皇虎',   element: '土' },
  { name: '摩岩巨象',   element: '土' },
  { name: '长尾银狐',   element: '土' },
  { name: '装甲岩龟',   element: '土' },
  { name: '岩甲巨熊',   element: '土' },
  { name: '山岳石犀',   element: '土' },

  // ==================== 光属性（8只） ====================
  { name: '独角天马',   element: '光' },
  { name: '圣光天马',   element: '光' },
  { name: '圣光麒麟',   element: '光' },
  { name: '天耀神龙',   element: '光' },
  { name: '辉光天使',   element: '光' },
  { name: '星辰白鹿',   element: '光' },
  { name: '耀晶狮鹫',   element: '光' },
  { name: '曦光灵鹿',   element: '光' },

  // ==================== 暗属性（9只） ====================
  { name: '神魔双体',   element: '暗' },
  { name: '魔域毒蝎',   element: '暗' },
  { name: '混沌恶灵',   element: '暗' },
  { name: '暗黑魔龙',   element: '暗' },
  { name: '邪影修罗',   element: '暗' },
  { name: '幽冥魔龙',   element: '暗' },
  { name: '深渊魔主',   element: '暗' },
  { name: '暗影魔蝠',   element: '暗' },
  { name: '噬魂夜狼',   element: '暗' },

  // ==================== 全属性（1只） ====================
  { name: '假面圣罗',   element: '全' },

];

/* ============================================================
 *  三、图片路径自动解析
 *      回退链：PNG → JPG → SVG
 * ============================================================ */

/**
 * 获取魔弹可能存在的全部图片候选路径（按优先级排序）
 * @param {object} monster - MONSTER_DATA 条目
 * @returns {string[]} 候选路径数组
 */
function getImageCandidates(monster) {
  const name = monster.name;
  const candidates = [];

  // Tier 1: 素材目录 PNG（规范目标格式）
  candidates.push(`${MATERIAL_DIR}/${name}.png`);

  // Tier 2: 素材目录 JPG（当前实际格式）
  candidates.push(`${MATERIAL_DIR}/${name}.jpg`);

  // Tier 3: SVG 占位图（按属性分目录）
  const el = monster.element;
  let svgSubDir = null;
  let svgPrefix = null;

  if (el in ELEMENT_TO_DIR) {
    svgSubDir = ELEMENT_TO_DIR[el];
    svgPrefix = ELEMENT_TO_DIR[el];
  }
  // 全属性（假面圣罗）无 SVG 回退

  if (svgSubDir && svgPrefix) {
    // 已知命名差异纠正表
    const svgName = SVG_NAME_OVERRIDE[name] || name;
    candidates.push(`${SVG_DIR}/${svgSubDir}/${svgPrefix}_${svgName}.svg`);
  }

  return candidates;
}

/**
 * 按名称查找魔弹数据
 * @param {string} name - 魔弹名称
 * @returns {object|null} MONSTER_DATA 条目
 */
function getMonsterDataByName(name) {
  return MONSTER_DATA.find(m => m.name === name) || null;
}

/* ============================================================
 *  四、图片缓存与加载
 * ============================================================ */

/** 图片缓存：key = 魔弹名称, value = { img, src, loaded } */
const imageCache = new Map();

/**
 * 加载单张图片（尝试多个候选路径，取第一个成功的）
 * @param {string} name - 魔弹名称
 * @param {string[]} candidates - 候选路径列表
 * @returns {Promise<{img: HTMLImageElement, src: string}>}
 */
function loadImageFromCandidates(name, candidates) {
  return new Promise((resolve) => {
    if (candidates.length === 0) {
      console.warn(`[ImageLoader] 「${name}」无可用图片路径`);
      resolve({ img: null, src: null });
      return;
    }

    let index = 0;

    function tryNext() {
      if (index >= candidates.length) {
        console.warn(`[ImageLoader] 「${name}」所有路径均加载失败：${candidates.join(', ')}`);
        resolve({ img: null, src: null });
        return;
      }

      const src = candidates[index];
      const img = new Image();

      img.onload = () => resolve({ img, src });
      img.onerror = () => { index++; tryNext(); };

      img.src = src;
    }

    tryNext();
  });
}

/**
 * 获取魔弹立绘（优先缓存，否则加载）
 * @param {string} name - 魔弹名称
 * @returns {Promise<{img: HTMLImageElement|null, src: string|null, cached: boolean}>}
 */
async function getMonsterImage(name) {
  // 命中缓存
  if (imageCache.has(name)) {
    const cached = imageCache.get(name);
    if (cached.img && cached.loaded) {
      return { img: cached.img, src: cached.src, cached: true };
    }
  }

  // 查找魔弹数据
  const monster = getMonsterDataByName(name);
  if (!monster) {
    console.warn(`[ImageLoader] 未知魔弹：「${name}」`);
    return { img: null, src: null, cached: false };
  }

  // 获取候选路径并加载
  const candidates = getImageCandidates(monster);
  const { img, src } = await loadImageFromCandidates(name, candidates);

  // 写入缓存
  imageCache.set(name, { img, src, loaded: !!img });

  return { img, src, cached: false };
}

/**
 * 同步获取已缓存的图片（不触发加载）
 * @param {string} name - 魔弹名称
 * @returns {HTMLImageElement|null}
 */
function getCachedImage(name) {
  const entry = imageCache.get(name);
  return (entry && entry.loaded) ? entry.img : null;
}

/**
 * 批量预加载魔弹立绘（后台加载，返回进度回调）
 * @param {string[]} [names] - 要预加载的名称列表，不传则加载全部
 * @param {function} [onProgress] - 进度回调 (loaded, total, name)
 * @returns {Promise<Map>} 图片缓存 Map
 */
async function preloadMonsterImages(names, onProgress) {
  const targetList = names || MONSTER_DATA.map(m => m.name);
  const total = targetList.length;
  let loaded = 0;

  // 分批并发加载（每批8张，避免浏览器限流）
  const BATCH_SIZE = 8;
  const batches = [];

  for (let i = 0; i < targetList.length; i += BATCH_SIZE) {
    batches.push(targetList.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    const batchPromises = batch.map(async (name) => {
      // 跳过已缓存的
      if (imageCache.has(name) && imageCache.get(name).loaded) {
        loaded++;
        if (onProgress) onProgress(loaded, total, name);
        return;
      }
      await getMonsterImage(name);
      loaded++;
      if (onProgress) onProgress(loaded, total, name);
    });

    await Promise.allSettled(batchPromises);
  }

  console.log(`[ImageLoader] 预加载完成：${loaded}/${total}`);
  return imageCache;
}

/**
 * 为 DOM 元素设置魔弹立绘
 * 自动处理加载中→成功→失败回退的完整状态
 * @param {HTMLElement} container - 图片容器元素
 * @param {string} name - 魔弹名称
 * @param {object} [opts]
 * @param {string} [opts.fallbackText] - 加载失败时显示的文字
 * @param {boolean} [opts.showLoader] - 是否显示加载中状态
 */
async function setMonsterImageToElement(container, name, opts = {}) {
  if (!container) return;

  const fallbackText = opts.fallbackText || name || '?';

  // 设置加载中状态
  if (opts.showLoader) {
    container.classList.add('img-loading');
    container.innerHTML = `<span style="color:var(--dim);font-size:12px">⏳</span>`;
  }

  // 先检查缓存
  const cached = getCachedImage(name);
  if (cached) {
    renderImage(container, cached, name, fallbackText);
    return;
  }

  // 异步加载
  const { img, src } = await getMonsterImage(name);

  if (container.classList.contains('img-loading')) {
    container.classList.remove('img-loading');
  }

  if (img) {
    renderImage(container, img, name, fallbackText);
  } else {
    // 全部失败，显示回退文字
    container.classList.add('img-err');
    container.innerHTML = `<span class="mimg-fb">${fallbackText.slice(0, 2)}</span>`;
  }
}

/**
 * 渲染 Image 元素到容器
 */
function renderImage(container, img, name, fallbackText) {
  container.classList.remove('img-err');
  container.innerHTML = '';

  // 克隆 image 节点（避免引用冲突）
  const imgEl = img.cloneNode();
  imgEl.className = 'mimg';
  imgEl.alt = name;
  imgEl.title = name;
  imgEl.loading = 'lazy';

  // 加载失败时显示回退文字
  imgEl.onerror = () => {
    container.classList.add('img-err');
    container.innerHTML = `<span class="mimg-fb">${fallbackText.slice(0, 2)}</span>`;
  };

  container.appendChild(imgEl);
}

/**
 * 清空所有缓存（释放内存）
 */
function clearImageCache() {
  imageCache.clear();
  console.log('[ImageLoader] 图片缓存已清空');
}

/**
 * 获取缓存统计信息
 * @returns {{ total: number, loaded: number, failed: number }}
 */
function getCacheStats() {
  let loaded = 0, failed = 0;
  imageCache.forEach(v => v.loaded ? loaded++ : failed++);
  return { total: imageCache.size, loaded, failed };
}

/**
 * 获取魔弹的推荐图片路径（用于 img src 属性直接设置）
 * 注意：不保证图片一定存在，需配合 onerror 使用
 * @param {object} monster - MONSTER_DATA 条目
 * @returns {string} 推荐路径（PNG 优先）
 */
function getMonsterImageSrc(monster) {
  return `${MATERIAL_DIR}/${monster.name}.png`;
}

/* ============================================================
 *  五、工具：按属性获取魔弹列表
 * ============================================================ */

function getMonstersByElement(element) {
  return MONSTER_DATA.filter(m => m.element === element);
}

function getAllElements() {
  return ['火', '水', '风', '土', '光', '暗', '全'];
}

function getMonsterCount() {
  return MONSTER_DATA.length;
}

/* ============================================================
 *  六、导出到全局
 * ============================================================ */
if (typeof window !== 'undefined') {
  window.MonsterImages = {
    // 数据
    MONSTER_DATA,
    ELEMENT_TO_DIR,
    getMonsterDataByName,
    getMonstersByElement,
    getAllElements,
    getMonsterCount,

    // 图片路径
    getImageCandidates,
    getMonsterImageSrc,
    SVG_NAME_OVERRIDE,

    // 加载 & 缓存
    getMonsterImage,
    getCachedImage,
    preloadMonsterImages,
    setMonsterImageToElement,
    clearImageCache,
    getCacheStats,

    // 预加载全部（页面初始化时调用）
    preloadAll: (onProgress) => preloadMonsterImages(null, onProgress),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MONSTER_DATA,
    ELEMENT_TO_DIR,
    getMonsterDataByName,
    getMonstersByElement,
    getAllElements,
    getMonsterCount,
    getImageCandidates,
    getMonsterImageSrc,
    getMonsterImage,
    getCachedImage,
    preloadMonsterImages,
    setMonsterImageToElement,
    clearImageCache,
    getCacheStats,
  };
}
