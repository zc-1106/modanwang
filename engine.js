/**
 * ============================================================
 *  魔弹王 1v1 同人对战网页小游戏 — 底层数据与计算引擎
 *  技术栈：原生 JavaScript（无依赖）
 *  存档方案：LocalStorage
 *  用途声明：仅个人学习，禁止商用
 * ============================================================
 */

/* ============================================================
 *  一、常量定义
 * ============================================================ */

/** 共享总灵能上限（双方固定） */
const MAX_SHARED_SPIRIT = 1500;

/** 每方编队最多携带魔弹数量 */
const MAX_TEAM_SIZE = 3;

/** 单回合摇骰子获得魔能的上限 */
const MAX_DICE_ENERGY = 6;

/** 属性克制伤害倍率 */
const COUNTER_MULTIPLIER = 1.5;   // 克制目标
const RESIST_MULTIPLIER  = 0.7;   // 被克制

/** 鬼面圣君必杀打断概率 */
const INTERRUPT_CHANCE = 0.35;

/** 幻麒麟被动护盾触发概率 */
const KIRIN_SHIELD_CHANCE = 0.30;
const KIRIN_SHIELD_AMOUNT = 150;

/** 六系元素标识 */
const ELEMENTS = {
  FIRE:  'fire',
  LIGHT: 'light',
  EARTH: 'earth',
  DARK:  'dark',
  WATER: 'water',
  WIND:  'wind',
};

/** 全部元素列表（遍历用） */
const ALL_ELEMENTS = Object.values(ELEMENTS);

/* ============================================================
 *  二、属性克制表
 *      火→风→土→水→火  光↔暗互克
 * ============================================================ */

/**
 * 属性克制查找表：key = 攻击方元素, value = 被克制的元素
 * 例：火克风 → COUNTER_MAP.fire = wind
 */
const COUNTER_MAP = {
  [ELEMENTS.FIRE]:  ELEMENTS.WIND,
  [ELEMENTS.WIND]:  ELEMENTS.EARTH,
  [ELEMENTS.EARTH]: ELEMENTS.WATER,
  [ELEMENTS.WATER]: ELEMENTS.FIRE,
  [ELEMENTS.LIGHT]: ELEMENTS.DARK,
  [ELEMENTS.DARK]:  ELEMENTS.LIGHT,
};

/**
 * 获取攻击方对防御方的属性克制倍率
 * @param {string} atkElement - 攻击方元素
 * @param {string} defElement - 防御方元素
 * @returns {number} 克制倍率：1.5（克制）/ 0.7（被克）/ 1.0（无克制）
 */
function getCounterMultiplier(atkElement, defElement) {
  if (COUNTER_MAP[atkElement] === defElement) {
    return COUNTER_MULTIPLIER; // 我方克制敌方
  }
  if (COUNTER_MAP[defElement] === atkElement) {
    return RESIST_MULTIPLIER;  // 我方被敌方克制
  }
  return 1.0; // 无克制关系
}

/* ============================================================
 *  三、随机工具函数
 * ============================================================ */

/**
 * 模拟6面骰子，返回 1~6 的整数
 * @returns {number} 骰子点数（1-6）
 */
function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

/**
 * 投掷硬币判定先后手
 * @returns {string} 'heads'（正面，玩家先手） 或 'tails'（反面，AI先手）
 */
function flipCoin() {
  return Math.random() < 0.5 ? 'heads' : 'tails';
}

/**
 * 通用概率判定
 * @param {number} chance - 概率值（0~1）
 * @returns {boolean} 是否触发
 */
function rollChance(chance) {
  return Math.random() < chance;
}

/* ============================================================
 *  四、魔弹（怪物）完整数据定义
 *      字段说明：
 *      id             - 唯一标识
 *      name           - 中文名称
 *      stage          - 阶段：'基础' | '觉醒'
 *      linker         - 链接者姓名（假面/幻麒/玄翎/混沌 无链接者填 null）
 *      element        - 所属领域/元素（假面圣罗初始为 null，由玩家选择）
 *      baseAttack     - 基础领域攻击力
 *      ultimate       - 无消耗固有必杀 { name, damage, element, description, extra }
 *      passive        - 专属被动 { name, description, type, ... }
 *      exclusiveCards - 专属卡牌ID数组（无专属则为空数组）
 *      allowedElements- 可使用卡牌的元素列表（假面圣罗切换后动态变更）
 *      allCardCostMinus1 - 全卡消耗-1（假面圣罗被动）
 *      allAttackBonus - 全部攻击额外加成（假面圣罗+200）
 *      switchableElements - 可切换的元素列表（仅假面圣罗）
 */
const ALL_MONSTERS = [
  // ===================== 火系 =====================
  {
    id: 'baoyanlong',
    name: '爆炎龙',
    stage: '基础',
    linker: '凌奇力',
    element: ELEMENTS.FIRE,
    baseAttack: 300,
    ultimate: {
      name: '爆炎弹',
      damage: 350,
      element: ELEMENTS.FIRE,
      description: '350火伤',
      extra: null,
    },
    passive: null,
    exclusiveCards: [],
    allowedElements: [ELEMENTS.FIRE],
    allCardCostMinus1: false,
    allAttackBonus: 0,
    switchableElements: null,
  },
  {
    id: 'huoyilongwang',
    name: '火翼龙王',
    stage: '觉醒',
    linker: '凌奇力',
    element: ELEMENTS.FIRE,
    baseAttack: 400,
    ultimate: {
      name: '强化爆炎弹',
      damage: 550,
      element: ELEMENTS.FIRE,
      description: '550火伤',
      extra: null,
    },
    passive: null,
    exclusiveCards: ['longwangfentian'], // 龙王焚天
    allowedElements: [ELEMENTS.FIRE],
    allCardCostMinus1: false,
    allAttackBonus: 0,
    switchableElements: null,
  },

  // ===================== 光系 =====================
  {
    id: 'dujiaotianma',
    name: '独角天马',
    stage: '基础',
    linker: '逸凡',
    element: ELEMENTS.LIGHT,
    baseAttack: 300,
    ultimate: {
      name: '空境三杀',
      damage: 400,        // 合计400（三连击总和）
      element: ELEMENTS.LIGHT,
      description: '合计400光伤（三连击）',
      extra: { multiHit: 3 },
    },
    passive: {
      name: '圣光自愈',
      description: '每回合回复共享灵能150',
      type: 'healPerTurn',
      healAmount: 150,
    },
    exclusiveCards: [],
    allowedElements: [ELEMENTS.LIGHT],
    allCardCostMinus1: false,
    allAttackBonus: 0,
    switchableElements: null,
  },
  {
    id: 'shengguangtianma',
    name: '圣光天马',
    stage: '觉醒',
    linker: '逸凡',
    element: ELEMENTS.LIGHT,
    baseAttack: 400,
    ultimate: {
      name: '空境三杀',
      damage: 400,
      element: ELEMENTS.LIGHT,
      description: '合计400光伤（三连击）',
      extra: { multiHit: 3 },
    },
    passive: {
      name: '圣光自愈',
      description: '每回合回复共享灵能150',
      type: 'healPerTurn',
      healAmount: 150,
    },
    exclusiveCards: ['shenghuijingshi'], // 圣辉净世
    allowedElements: [ELEMENTS.LIGHT],
    allCardCostMinus1: false,
    allAttackBonus: 0,
    switchableElements: null,
  },

  // ===================== 土系 =====================
  {
    id: 'chaonengzhanhu',
    name: '超能战虎',
    stage: '基础',
    linker: '唐菲菲',
    element: ELEMENTS.EARTH,
    baseAttack: 300,
    ultimate: {
      name: '霸极神拳',
      damage: 380,
      element: ELEMENTS.EARTH,
      description: '380土伤，敌方攻击-100',
      extra: {
        debuff: { type: 'atkDown', amount: 100, duration: 1 },
      },
    },
    passive: null,
    exclusiveCards: [],
    allowedElements: [ELEMENTS.EARTH],
    allCardCostMinus1: false,
    allAttackBonus: 0,
    switchableElements: null,
  },
  {
    id: 'bajihuanghu',
    name: '霸极皇虎',
    stage: '觉醒',
    linker: '唐菲菲',
    element: ELEMENTS.EARTH,
    baseAttack: 400,
    ultimate: {
      name: '霸极神拳',
      damage: 380,
      element: ELEMENTS.EARTH,
      description: '380土伤，敌方攻击-100',
      extra: {
        debuff: { type: 'atkDown', amount: 100, duration: 1 },
      },
    },
    passive: null,
    exclusiveCards: ['huanghuzhendi'], // 皇虎震地
    allowedElements: [ELEMENTS.EARTH],
    allCardCostMinus1: false,
    allAttackBonus: 0,
    switchableElements: null,
  },

  // ===================== 暗系 =====================
  {
    id: 'shenmoshuangti',
    name: '神魔双体',
    stage: '基础',
    linker: '黑鹰',
    element: ELEMENTS.DARK,
    baseAttack: 300,
    ultimate: {
      name: '魔影重重',
      damage: 320,
      element: ELEMENTS.DARK,
      description: '320暗伤，持续每回合流失80灵能2回合',
      extra: {
        debuff: { type: 'dot', amount: 80, duration: 2 },
      },
    },
    passive: null,
    exclusiveCards: [],
    allowedElements: [ELEMENTS.DARK],
    allCardCostMinus1: false,
    allAttackBonus: 0,
    switchableElements: null,
  },
  {
    id: 'moyuduxie',
    name: '魔域毒蝎',
    stage: '基础',
    linker: '雷煌',
    element: ELEMENTS.DARK,
    baseAttack: 300,
    ultimate: {
      name: '恶灵毒针',
      damage: 280,
      element: ELEMENTS.DARK,
      description: '280暗伤，敌方卡牌消耗永久+2',
      extra: {
        debuff: { type: 'costUp', amount: 2, permanent: true },
      },
    },
    passive: null,
    exclusiveCards: [],
    allowedElements: [ELEMENTS.DARK],
    allCardCostMinus1: false,
    allAttackBonus: 0,
    switchableElements: null,
  },

  // ===================== 水系 =====================
  {
    id: 'jibingtengshe',
    name: '极冰腾蛇',
    stage: '基础',
    linker: '花费罗',
    element: ELEMENTS.WATER,
    baseAttack: 300,
    ultimate: {
      name: '追魂寒冰',
      damage: 260,
      element: ELEMENTS.WATER,
      description: '260水伤，封敌方必杀一回合',
      extra: {
        debuff: { type: 'ultimateSeal', duration: 1 },
      },
    },
    passive: null,
    exclusiveCards: [],
    allowedElements: [ELEMENTS.WATER],
    allCardCostMinus1: false,
    allAttackBonus: 0,
    switchableElements: null,
  },
  {
    id: 'guimianshengjun',
    name: '鬼面圣君',
    stage: '基础',
    linker: '红罗',
    element: ELEMENTS.WIND,
    baseAttack: 300,
    ultimate: {
      name: '风裂龙卷',
      damage: 300,
      element: ELEMENTS.WIND,
      description: '300风伤，概率打断敌方卡牌',
      extra: {
        interruptChance: INTERRUPT_CHANCE,
      },
    },
    passive: null,
    exclusiveCards: [],
    allowedElements: [ELEMENTS.WIND],
    allCardCostMinus1: false,
    allAttackBonus: 0,
    switchableElements: null,
  },

  // ===================== 土系（摩岩巨象） =====================
  {
    id: 'moyanjuxiang',
    name: '摩岩巨象',
    stage: '基础',
    linker: '斑龙',
    element: ELEMENTS.EARTH,
    baseAttack: 300,
    ultimate: {
      name: '石化暴击',
      damage: 290,
      element: ELEMENTS.EARTH,
      description: '290土伤，敌方卡牌伤害减半一回合',
      extra: {
        debuff: { type: 'damageHalved', duration: 1 },
      },
    },
    passive: null,
    exclusiveCards: [],
    allowedElements: [ELEMENTS.EARTH],
    allCardCostMinus1: false,
    allAttackBonus: 0,
    switchableElements: null,
  },

  // ===================== 水系（幻麒麟·无链接者） =====================
  {
    id: 'huanqilin',
    name: '幻麒麟',
    stage: '基础',
    linker: null,
    element: ELEMENTS.WATER,
    baseAttack: 320,
    ultimate: {
      name: '水月幻冲',
      damage: 330,
      element: ELEMENTS.WATER,
      description: '330水伤',
      extra: null,
    },
    passive: {
      name: '水月护盾',
      description: '被击时30%概率生成150水盾',
      type: 'reactiveShield',
      triggerChance: KIRIN_SHIELD_CHANCE,
      shieldAmount: KIRIN_SHIELD_AMOUNT,
      shieldElement: ELEMENTS.WATER,
    },
    exclusiveCards: ['jihanhuanlang'], // 极寒幻浪
    allowedElements: [ELEMENTS.WATER],
    allCardCostMinus1: false,
    allAttackBonus: 0,
    switchableElements: null,
  },

  // ===================== 风系（玄翎凤凰·无链接者） =====================
  {
    id: 'xuanlingfenghuang',
    name: '玄翎凤凰',
    stage: '基础',
    linker: null,
    element: ELEMENTS.WIND,
    baseAttack: 320,
    ultimate: {
      name: '翎羽飓火',
      damage: 340,
      element: ELEMENTS.WIND,
      description: '340风伤',
      extra: null,
    },
    passive: {
      name: '风之翎羽',
      description: '自身风系卡牌消耗-1（可与假面圣罗叠加，最低0）',
      type: 'windCostReduction',
      reductionAmount: 1,
    },
    exclusiveCards: ['xuanlingfengbao'], // 玄翎风暴
    allowedElements: [ELEMENTS.WIND],
    allCardCostMinus1: false,
    allAttackBonus: 0,
    switchableElements: null,
  },

  // ===================== 全属性切换（假面圣罗·无链接者） =====================
  {
    id: 'jiamianshengluo',
    name: '假面圣罗',
    stage: '特殊',
    linker: null,
    element: null, // 初始未选择领域，由玩家在战前/切换时决定
    baseAttack: 400,
    ultimate: null, // 无固定必杀
    passive: {
      name: '全领域掌控',
      description: '无固定必杀；所有攻击+200；全卡消耗-1；可切换领域',
      type: 'multiDomain',
      allAttackBonus: 200,
      allCardCostMinus1: true,
    },
    exclusiveCards: [],
    allowedElements: [], // 切换后动态设置
    allCardCostMinus1: true,  // 全局卡牌消耗-1
    allAttackBonus: 200,      // 所有攻击+200
    switchableElements: ALL_ELEMENTS, // 可切换至任意元素
  },

  // ===================== 暗系（混沌恶灵·无链接者） =====================
  {
    id: 'hundreduneling',
    name: '混沌恶灵',
    stage: '基础',
    linker: null,
    element: ELEMENTS.DARK,
    baseAttack: 200,
    ultimate: {
      name: '黑暗侵蚀',
      damage: 0, // 无直接伤害
      element: ELEMENTS.DARK,
      description: '敌方每回合流失60灵能（永久持续）',
      extra: {
        debuff: { type: 'dot', amount: 60, permanent: true },
      },
    },
    passive: null,
    exclusiveCards: [],
    allowedElements: [ELEMENTS.DARK],
    allCardCostMinus1: false,
    allAttackBonus: 0,
    switchableElements: null,
  },
];

/* ============================================================
 *  五、全六系魔能卡牌完整数据定义
 *      字段说明：
 *      id          - 唯一标识
 *      name        - 中文名称
 *      cost        - 原始魔能消耗
 *      element     - 所属元素/领域
 *      type        - 卡牌类型：'damage'|'shield'|'heal'|'drain'|'buff'|'debuff'|
 *                    'negate'|'lock'|'clear'|'dodge'|'aoe'|'multiHit'
 *      damage      - 基础伤害（无则0）
 *      description - 效果描述
 *      exclusiveTo - 专属限定魔弹ID（null=通用卡）
 *      effects     - 效果明细对象
 * ============================================================ */

const ALL_CARDS = [
  // ===================== 火系（7张） =====================
  {
    id: 'lieyan',
    name: '烈焰',
    cost: 1,
    element: ELEMENTS.FIRE,
    type: 'damage',
    damage: 200,
    description: '200火伤',
    exclusiveTo: null,
    effects: {},
  },
  {
    id: 'huoqiu',
    name: '火球',
    cost: 2,
    element: ELEMENTS.FIRE,
    type: 'aoe',
    damage: 200,
    description: '200范围火伤',
    exclusiveTo: null,
    effects: { aoe: true },
  },
  {
    id: 'baoyanfuti',
    name: '爆炎附体',
    cost: 5,
    element: ELEMENTS.FIRE,
    type: 'buff',
    damage: 0,
    description: '本回合火系攻击+500',
    exclusiveTo: null,
    effects: { fireAttackBonus: 500, duration: 1 }, // 本回合有效
  },
  {
    id: 'yanlongpo',
    name: '炎龙破',
    cost: 3,
    element: ELEMENTS.FIRE,
    type: 'damage',
    damage: 100, // 基础伤害
    description: '基础100，每多一张火系卡+300',
    exclusiveTo: null,
    effects: { perFireCardBonus: 300 }, // 每多一张火系卡+300
  },
  {
    id: 'honglianfengbao',
    name: '红莲风暴',
    cost: 3,
    element: ELEMENTS.FIRE,
    type: 'negate',
    damage: 0,
    description: '无效敌方当前卡牌（无法清除持续debuff）',
    exclusiveTo: null,
    effects: { negateEnemyCard: true },
  },
  {
    id: 'fenshaolieyan',
    name: '焚烧烈焰',
    cost: 4,
    element: ELEMENTS.FIRE,
    type: 'damage',
    damage: 400,
    description: '400火伤',
    exclusiveTo: null,
    effects: {},
  },
  {
    id: 'longwangfentian',
    name: '龙王焚天',
    cost: 5,
    element: ELEMENTS.FIRE,
    type: 'damage',
    damage: 600,
    description: '600火伤，清空敌方护盾',
    exclusiveTo: 'huoyilongwang', // 火翼龙王限定
    effects: { clearEnemyShield: true },
  },

  // ===================== 光系（5张） =====================
  {
    id: 'shengguangshouhu',
    name: '圣光守护',
    cost: 2,
    element: ELEMENTS.LIGHT,
    type: 'shield',
    damage: 0,
    description: '300护盾，攻击+50',
    exclusiveTo: null,
    effects: { shieldAmount: 300, attackBonus: 50 },
  },
  {
    id: 'gongzhengzhijian',
    name: '公正之剑',
    cost: 3,
    element: ELEMENTS.LIGHT,
    type: 'damage',
    damage: 350,
    description: '350光伤',
    exclusiveTo: null,
    effects: {},
  },
  {
    id: 'guangzhiganzhao',
    name: '光之感召',
    cost: 2,
    element: ELEMENTS.LIGHT,
    type: 'drain',
    damage: 0,
    description: '扣除敌方100共享灵能',
    exclusiveTo: null,
    effects: { drainSpirit: 100 },
  },
  {
    id: 'guangnengxili',
    name: '光能洗礼',
    cost: 3,
    element: ELEMENTS.LIGHT,
    type: 'heal',
    damage: 0,
    description: '回复己方200共享灵能',
    exclusiveTo: null,
    effects: { healSpirit: 200 },
  },
  {
    id: 'shenghuijingshi',
    name: '圣辉净世',
    cost: 4,
    element: ELEMENTS.LIGHT,
    type: 'clear',
    damage: 0,
    description: '清除敌方全部debuff，回复己方300灵能',
    exclusiveTo: 'shengguangtianma', // 圣光天马限定
    effects: { clearAllEnemyDebuffs: true, healSpirit: 300 },
  },

  // ===================== 土系（6张） =====================
  {
    id: 'yanshikaijia',
    name: '岩石铠甲',
    cost: 1,
    element: ELEMENTS.EARTH,
    type: 'shield',
    damage: 0,
    description: '250护盾',
    exclusiveTo: null,
    effects: { shieldAmount: 250 },
  },
  {
    id: 'feicuihudun',
    name: '翡翠护盾',
    cost: 3,
    element: ELEMENTS.EARTH,
    type: 'shield',
    damage: 0,
    description: '400护盾',
    exclusiveTo: null,
    effects: { shieldAmount: 400 },
  },
  {
    id: 'dadihuichun',
    name: '大地回春',
    cost: 2,
    element: ELEMENTS.EARTH,
    type: 'heal',
    damage: 0,
    description: '回复180共享灵能',
    exclusiveTo: null,
    effects: { healSpirit: 180 },
  },
  {
    id: 'dadidiweiya',
    name: '大地威压',
    cost: 2,
    element: ELEMENTS.EARTH,
    type: 'debuff',
    damage: 0,
    description: '敌方攻击-150',
    exclusiveTo: null,
    effects: { enemyAtkDown: 150, duration: 1 },
  },
  {
    id: 'nishiliu',
    name: '泥石流',
    cost: 3,
    element: ELEMENTS.EARTH,
    type: 'damage',
    damage: 300,
    description: '300土伤',
    exclusiveTo: null,
    effects: {},
  },
  {
    id: 'huanghuzhendi',
    name: '皇虎震地',
    cost: 4,
    element: ELEMENTS.EARTH,
    type: 'damage',
    damage: 420,
    description: '420土伤，敌方下回合攻击-150',
    exclusiveTo: 'bajihuanghu', // 霸极皇虎限定
    effects: {
      debuff: { type: 'atkDown', amount: 150, duration: 1 },
    },
  },

  // ===================== 暗系（4张） =====================
  {
    id: 'anyingzhili',
    name: '暗影之力',
    cost: 1,
    element: ELEMENTS.DARK,
    type: 'damage',
    damage: 200,
    description: '200暗伤，持续流失50灵能',
    exclusiveTo: null,
    effects: {
      debuff: { type: 'dot', amount: 50, duration: 1 },
    },
  },
  {
    id: 'heianfengyin',
    name: '黑暗封印',
    cost: 2,
    element: ELEMENTS.DARK,
    type: 'lock',
    damage: 0,
    description: '锁定敌方一张可用卡牌（使其不可使用）',
    exclusiveTo: null,
    effects: { lockEnemyCard: true },
  },
  {
    id: 'kongjuzhiyuan',
    name: '恐惧之源',
    cost: 3,
    element: ELEMENTS.DARK,
    type: 'debuff',
    damage: 0,
    description: '敌方攻击-200',
    exclusiveTo: null,
    effects: { enemyAtkDown: 200, duration: 1 },
  },
  {
    id: 'hundredunheng',
    name: '混沌均衡',
    cost: 4,
    element: ELEMENTS.DARK,
    type: 'clear',
    damage: 0,
    description: '抵消全场所有攻防加成（buff与debuff中攻防部分）',
    exclusiveTo: null,
    effects: { clearAllAtkDefModifiers: true },
  },

  // ===================== 水系（4张） =====================
  {
    id: 'shenhaizhibi',
    name: '深海之障壁',
    cost: 2,
    element: ELEMENTS.WATER,
    type: 'shield',
    damage: 0,
    description: '300护盾',
    exclusiveTo: null,
    effects: { shieldAmount: 300 },
  },
  {
    id: 'bingzhikaijia',
    name: '冰之铠甲',
    cost: 1,
    element: ELEMENTS.WATER,
    type: 'shield',
    damage: 0,
    description: '200护盾',
    exclusiveTo: null,
    effects: { shieldAmount: 200 },
  },
  {
    id: 'jihanfengbao',
    name: '极寒风暴',
    cost: 3,
    element: ELEMENTS.WATER,
    type: 'aoe',
    damage: 320,
    description: '320群体水伤',
    exclusiveTo: null,
    effects: { aoe: true },
  },
  {
    id: 'jihanhuanlang',
    name: '极寒幻浪',
    cost: 4,
    element: ELEMENTS.WATER,
    type: 'aoe',
    damage: 360,
    description: '360群体水伤，敌方水系卡伤害-100',
    exclusiveTo: 'huanqilin', // 幻麒麟限定
    effects: {
      aoe: true,
      debuff: { type: 'waterDamageDown', amount: 100, duration: 2 },
    },
  },

  // ===================== 风系（6张） =====================
  {
    id: 'xunjiefeng',
    name: '迅捷之风',
    cost: 1,
    element: ELEMENTS.WIND,
    type: 'buff',
    damage: 0,
    description: '提速（本回合先手权提升），风伤+100',
    exclusiveTo: null,
    effects: { windDamageBonus: 100, speedUp: true, duration: 1 },
  },
  {
    id: 'qiyuezhifeng',
    name: '契约之风',
    cost: 2,
    element: ELEMENTS.WIND,
    type: 'buff',
    damage: 0,
    description: '风系卡牌伤害+120',
    exclusiveTo: null,
    effects: { windCardDamageBonus: 120, duration: 1 },
  },
  {
    id: 'fengzhiyi',
    name: '风之翼',
    cost: 2,
    element: ELEMENTS.WIND,
    type: 'dodge',
    damage: 0,
    description: '闪避最高350伤害',
    exclusiveTo: null,
    effects: { dodgeAmount: 350 },
  },
  {
    id: 'baofengsongge',
    name: '暴风颂歌',
    cost: 4,
    element: ELEMENTS.WIND,
    type: 'multiHit',
    damage: 400, // 合计400
    description: '合计400风伤（多段攻击）',
    exclusiveTo: null,
    effects: { multiHit: true },
  },
  {
    id: 'fengrenliandan',
    name: '风刃连弹',
    cost: 3,
    element: ELEMENTS.WIND,
    type: 'multiHit',
    damage: 330, // 合计330
    description: '合计330风伤（多段攻击）',
    exclusiveTo: null,
    effects: { multiHit: true },
  },
  {
    id: 'xuanlingfengbao',
    name: '玄翎风暴',
    cost: 4,
    element: ELEMENTS.WIND,
    type: 'damage',
    damage: 370,
    description: '370风伤，无视≤150护盾',
    exclusiveTo: 'xuanlingfenghuang', // 玄翎凤凰限定
    effects: { ignoreShieldUpTo: 150 },
  },
];

/* ============================================================
 *  六、便捷查找工具函数
 * ============================================================ */

/** 按ID查找魔弹 */
function getMonsterById(id) {
  return ALL_MONSTERS.find(m => m.id === id) || null;
}

/** 按ID查找卡牌 */
function getCardById(id) {
  return ALL_CARDS.find(c => c.id === id) || null;
}

/** 获取某元素下全部通用卡牌（不含专属卡，或含指定魔弹的专属卡） */
function getCardsByElement(element, monsterId) {
  return ALL_CARDS.filter(c => {
    if (c.element !== element) return false;
    if (c.exclusiveTo !== null && c.exclusiveTo !== monsterId) return false;
    return true;
  });
}

/** 获取某魔弹可使用的全部卡牌 */
function getAvailableCardsForMonster(monster) {
  // 假面圣罗：allowedElements 动态决定
  const elements = monster.allowedElements || [];
  const cards = [];
  for (const el of elements) {
    cards.push(...getCardsByElement(el, monster.id));
  }
  return cards;
}

/** 获取某魔弹实际卡牌消耗（经减耗被动计算后） */
function getEffectiveCardCost(card, monster) {
  let cost = card.cost;

  // 假面圣罗：全卡消耗-1
  if (monster.allCardCostMinus1) {
    cost -= 1;
  }

  // 玄翎凤凰：风系卡额外-1
  if (
    monster.passive &&
    monster.passive.type === 'windCostReduction' &&
    card.element === ELEMENTS.WIND
  ) {
    cost -= monster.passive.reductionAmount;
  }

  // 最低消耗为0
  return Math.max(0, cost);
}

/* ============================================================
 *  七、护盾计算工具
 *      规则：仅主战持有护盾，不叠加，高数值覆盖低数值
 *            切换主战护盾清空
 * ============================================================ */

/**
 * 为主战魔弹设置护盾值（高数值覆盖低数值）
 * @param {object} playerState - 玩家/AI状态对象
 * @param {number} shieldAmount - 新护盾值
 * @param {string} [shieldElement] - 护盾元素（可选，幻麒麟水盾标记用）
 */
function applyShield(playerState, shieldAmount, shieldElement) {
  if (shieldAmount > playerState.shield) {
    playerState.shield = shieldAmount;
    playerState.shieldElement = shieldElement || null;
    return true; // 护盾已更新
  }
  return false; // 新护盾较低，维持原护盾
}

/**
 * 护盾吸收伤害，返回剩余伤害
 * @param {object} playerState - 玩家/AI状态对象
 * @param {number} incomingDamage - 即将造成的伤害
 * @param {number} [ignoreShieldUpTo] - 无视護盾上限（玄翎风暴效果）
 * @returns {number} 穿透护盾后剩余伤害
 */
function absorbDamageByShield(playerState, incomingDamage, ignoreShieldUpTo) {
  if (incomingDamage <= 0) return 0;

  let effectiveShield = playerState.shield;

  // 玄翎风暴：无视 ≤150 护盾
  if (ignoreShieldUpTo && effectiveShield <= ignoreShieldUpTo) {
    effectiveShield = 0;
  }

  if (effectiveShield <= 0) return incomingDamage;

  if (effectiveShield >= incomingDamage) {
    // 护盾完全吸收
    playerState.shield -= incomingDamage;
    return 0;
  } else {
    // 护盾部分吸收
    const remainder = incomingDamage - effectiveShield;
    playerState.shield = 0;
    return remainder;
  }
}

/** 清空护盾（切换主战时调用） */
function clearShield(playerState) {
  playerState.shield = 0;
  playerState.shieldElement = null;
}

/* ============================================================
 *  八、伤害结算核心函数
 *      结算顺序（严格按规则）：
 *      卡牌/必杀基础伤害 → 领域攻击加成 → 克制倍率
 *      → 增伤buff → 敌方减伤debuff → 护盾抵扣
 *      → 剩余伤害扣共享总灵能
 * ============================================================ */

/**
 * 完整伤害结算流水线
 * @param {object}  params
 * @param {number}  params.baseDamage       - 卡牌/必杀基础伤害
 * @param {string}  params.damageElement    - 伤害元素
 * @param {object}  params.attacker         - 攻击方状态对象
 * @param {object}  params.defender         - 防御方状态对象
 * @param {number}  [params.ignoreShieldUpTo] - 无视护盾阈值
 * @returns {object} { totalDamage, shieldAbsorbed, spiritDamage, breakdown }
 */
function calculateDamage({
  baseDamage,
  damageElement,
  attacker,
  defender,
  ignoreShieldUpTo,
}) {
  if (baseDamage <= 0) {
    return { totalDamage: 0, shieldAbsorbed: 0, spiritDamage: 0, breakdown: [] };
  }

  const breakdown = [];
  let currentDamage = baseDamage;

  // --- 步骤1：基础伤害 ---
  breakdown.push({ step: '基础伤害', value: currentDamage });

  // --- 步骤2：领域攻击加成（当前主战魔弹的基础领域攻击） ---
  const domainAttack = attacker.activeMonster ? attacker.activeMonster.baseAttack : 0;
  // 假面圣罗额外攻击加成
  const extraAttackBonus = attacker.activeMonster
    ? (attacker.activeMonster.allAttackBonus || 0)
    : 0;
  currentDamage += domainAttack + extraAttackBonus;
  breakdown.push({
    step: '领域攻击加成',
    domainAttack,
    extraAttackBonus,
    afterBonus: currentDamage,
  });

  // --- 步骤3：属性克制倍率 ---
  const defElement = defender.activeMonster
    ? defender.activeMonster.element
    : null;
  const multiplier = defElement
    ? getCounterMultiplier(damageElement, defElement)
    : 1.0;
  currentDamage = Math.floor(currentDamage * multiplier);
  breakdown.push({
    step: '克制倍率',
    multiplier,
    value: currentDamage,
  });

  // --- 步骤4：增伤buff（攻击方身上的增伤效果） ---
  let totalBuffBonus = 0;

  // 火系增伤buff（爆炎附体）
  if (attacker.fireAttackBonus && damageElement === ELEMENTS.FIRE) {
    totalBuffBonus += attacker.fireAttackBonus;
  }
  // 风系增伤buff（迅捷之风）
  if (attacker.windDamageBonus) {
    totalBuffBonus += attacker.windDamageBonus;
  }
  // 风系卡牌增伤（契约之风）
  if (attacker.windCardDamageBonus && damageElement === ELEMENTS.WIND) {
    totalBuffBonus += attacker.windCardDamageBonus;
  }
  // 圣光守护攻击+50
  if (attacker.lightAttackBonus) {
    totalBuffBonus += attacker.lightAttackBonus;
  }

  currentDamage += totalBuffBonus;
  breakdown.push({
    step: '增伤buff',
    buffBonus: totalBuffBonus,
    value: currentDamage,
  });

  // --- 步骤5：敌方减伤debuff ---
  //   “减伤debuff”指攻击方身上被敌方施加的攻击降低/伤害减半等效果
  //   应读取 attacker 的 debuff 快捷字段，而非 defender
  let totalReduction = 0;

  // 攻击降低debuff（超能战虎/霸极皇虎必杀、大地威压、恐惧之源等）
  if (attacker.atkDown) {
    totalReduction += attacker.atkDown;
  }
  // 伤害减半debuff（摩岩巨象必杀）
  if (attacker.damageHalved) {
    currentDamage = Math.floor(currentDamage / 2);
    breakdown.push({
      step: '敌方减伤（伤害减半）',
      value: currentDamage,
    });
  }
  // 水系卡伤害降低（幻麒麟必杀极寒幻浪）
  if (attacker.waterDamageDown && damageElement === ELEMENTS.WATER) {
    totalReduction += attacker.waterDamageDown;
  }

  if (totalReduction > 0 && !attacker.damageHalved) {
    currentDamage = Math.max(0, currentDamage - totalReduction);
    breakdown.push({
      step: '敌方减伤debuff',
      reduction: totalReduction,
      value: currentDamage,
    });
  } else if (totalReduction > 0 && attacker.damageHalved) {
    // 减半后再减固定值
    currentDamage = Math.max(0, currentDamage - totalReduction);
    breakdown.push({
      step: '敌方减伤debuff（减半后）',
      reduction: totalReduction,
      value: currentDamage,
    });
  }

  // --- 步骤6：护盾抵扣 ---
  const preShieldDamage = currentDamage;
  const shieldBefore = defender.shield;
  const remainingDamage = absorbDamageByShield(defender, currentDamage, ignoreShieldUpTo);
  const shieldAbsorbed = preShieldDamage - remainingDamage;
  breakdown.push({
    step: '护盾抵扣',
    shieldBefore,
    shieldAbsorbed,
    shieldAfter: defender.shield,
    remainingDamage,
  });

  // --- 步骤7：扣除共享总灵能 ---
  const spiritDamage = remainingDamage;
  breakdown.push({
    step: '扣除共享灵能',
    spiritDamage,
  });

  return {
    totalDamage: preShieldDamage,   // 护盾抵扣前总伤害
    shieldAbsorbed,
    spiritDamage,                   // 最终扣除灵能的伤害
    breakdown,
  };
}

/* ============================================================
 *  九、Debuff / Buff 持续结算系统
 *      规则：持续debuff每回合行动前结算，统一扣除共享灵能
 * ============================================================ */

/**
 * 回合开始前结算持续型debuff（dot流失等）
 * @param {object} playerState - 玩家/AI状态对象
 */
function settleContinuousDebuffs(playerState) {
  let totalDrain = 0;

  // 处理所有dot类型debuff
  const remainingDebuffs = [];
  for (const debuff of playerState.debuffs) {
    if (debuff.type === 'dot') {
      // 持续流失灵能
      totalDrain += debuff.amount;
      // 扣减持续回合数
      if (!debuff.permanent) {
        debuff.duration -= 1;
      }
      if (debuff.permanent || debuff.duration > 0) {
        remainingDebuffs.push(debuff);
      }
    } else {
      // 非dot debuff：检查是否过期
      if (!debuff.permanent && debuff.duration !== undefined) {
        debuff.duration -= 1;
      }
      if (debuff.permanent || debuff.duration === undefined || debuff.duration > 0) {
        remainingDebuffs.push(debuff);
      }
    }
  }

  // 应用流失伤害到共享灵能
  if (totalDrain > 0) {
    playerState.sharedSpirit = Math.max(0, playerState.sharedSpirit - totalDrain);
  }

  // 更新debuff列表
  playerState.debuffs = remainingDebuffs;

  // 同步计算属性快捷字段
  syncDebuffQuickFields(playerState);

  return { totalDrain, remainingDebuffs };
}

/**
 * 回合开始前结算持续型buff（过期处理）
 * @param {object} playerState - 玩家/AI状态对象
 */
function settleContinuousBuffs(playerState) {
  const remainingBuffs = [];
  for (const buff of playerState.buffs) {
    if (buff.duration !== undefined && !buff.permanent) {
      buff.duration -= 1;
    }
    if (buff.permanent || buff.duration === undefined || buff.duration > 0) {
      remainingBuffs.push(buff);
    }
  }
  playerState.buffs = remainingBuffs;

  // 同步计算属性快捷字段
  syncBuffQuickFields(playerState);
}

/**
 * 从debuff列表同步快捷计算字段
 * （方便伤害计算时快速查询而不必遍历数组）
 */
function syncDebuffQuickFields(playerState) {
  // 重置
  playerState.atkDown = 0;
  playerState.damageHalved = false;
  playerState.waterDamageDown = 0;
  playerState.ultimateSealed = false;
  playerState.costUp = 0;
  playerState.lockedCardIds = [];

  for (const debuff of playerState.debuffs) {
    switch (debuff.type) {
      case 'atkDown':
        playerState.atkDown = Math.max(playerState.atkDown, debuff.amount);
        break;
      case 'damageHalved':
        playerState.damageHalved = true;
        break;
      case 'waterDamageDown':
        playerState.waterDamageDown = Math.max(playerState.waterDamageDown, debuff.amount);
        break;
      case 'ultimateSeal':
        playerState.ultimateSealed = true;
        break;
      case 'costUp':
        playerState.costUp = Math.max(playerState.costUp, debuff.amount);
        break;
      case 'cardLocked':
        playerState.lockedCardIds.push(debuff.cardId);
        break;
      default:
        break;
    }
  }
}

/**
 * 从buff列表同步快捷计算字段
 */
function syncBuffQuickFields(playerState) {
  // 重置回合性buff
  playerState.fireAttackBonus = 0;
  playerState.windDamageBonus = 0;
  playerState.windCardDamageBonus = 0;
  playerState.lightAttackBonus = 0;
  playerState.dodgeAmount = 0;

  for (const buff of playerState.buffs) {
    switch (buff.type) {
      case 'fireAttackBonus':
        playerState.fireAttackBonus = Math.max(playerState.fireAttackBonus, buff.amount);
        break;
      case 'windDamageBonus':
        playerState.windDamageBonus = Math.max(playerState.windDamageBonus, buff.amount);
        break;
      case 'windCardDamageBonus':
        playerState.windCardDamageBonus = Math.max(playerState.windCardDamageBonus, buff.amount);
        break;
      case 'lightAttackBonus':
        playerState.lightAttackBonus = Math.max(playerState.lightAttackBonus, buff.amount);
        break;
      case 'dodge':
        playerState.dodgeAmount = Math.max(playerState.dodgeAmount, buff.amount);
        break;
      case 'speedUp':
        playerState.speedUp = true;
        break;
      default:
        break;
    }
  }
}

/**
 * 向玩家状态添加一个debuff
 */
function addDebuff(playerState, debuffDef) {
  playerState.debuffs.push({ ...debuffDef });
  syncDebuffQuickFields(playerState);
}

/**
 * 向玩家状态添加一个buff
 */
function addBuff(playerState, buffDef) {
  playerState.buffs.push({ ...buffDef });
  syncBuffQuickFields(playerState);
}

/** 清除某玩家全部debuff */
function clearAllDebuffs(playerState) {
  playerState.debuffs = [];
  syncDebuffQuickFields(playerState);
}

/** 清除全场所有攻防加成（混沌均衡效果） */
function clearAllAtkDefModifiers(playerState) {
  // 清除攻防相关的buff
  playerState.buffs = playerState.buffs.filter(b =>
    !['fireAttackBonus', 'windDamageBonus', 'windCardDamageBonus', 'lightAttackBonus'].includes(b.type)
  );
  // 清除攻防相关的debuff
  playerState.debuffs = playerState.debuffs.filter(d =>
    !['atkDown', 'damageHalved', 'waterDamageDown'].includes(d.type)
  );
  syncBuffQuickFields(playerState);
  syncDebuffQuickFields(playerState);
}

/* ============================================================
 *  十、编队管理
 *      每方最多3只魔弹，记录当前主战索引
 * ============================================================ */

/**
 * 创建一个新的队伍（玩家或AI）
 * @param {string} owner - 'player' | 'ai'
 * @returns {object} 队伍状态对象
 */
function createTeam(owner) {
  return {
    owner,                        // 队伍归属
    monsters: [],                 // 编队魔弹对象数组（ALL_MONSTERS的引用副本）
    activeIndex: 0,               // 当前主战魔弹索引（0~2）
    sharedSpirit: MAX_SHARED_SPIRIT, // 共享总灵能
    magicEnergy: 0,               // 当前魔能
    shield: 0,                    // 当前主战护盾值
    shieldElement: null,          // 护盾元素类型
    buffs: [],                    // 当前生效的buff列表
    debuffs: [],                  // 当前生效的debuff列表
    // --- 快捷查询字段（由 sync函数自动同步） ---
    atkDown: 0,
    damageHalved: false,
    waterDamageDown: 0,
    ultimateSealed: false,
    costUp: 0,
    lockedCardIds: [],
    fireAttackBonus: 0,
    windDamageBonus: 0,
    windCardDamageBonus: 0,
    lightAttackBonus: 0,
    dodgeAmount: 0,
    speedUp: false,
    // --- 便捷访问 ---
    get activeMonster() {
      return this.monsters[this.activeIndex] || null;
    },
  };
}

/**
 * 向编队添加魔弹
 * @param {object} team     - 队伍状态对象
 * @param {string} monsterId - 魔弹ID
 * @returns {boolean} 是否添加成功
 */
function addMonsterToTeam(team, monsterId) {
  if (team.monsters.length >= MAX_TEAM_SIZE) {
    console.warn(`编队已满（最多${MAX_TEAM_SIZE}只）`);
    return false;
  }

  // 禁止重复添加同一魔弹
  if (team.monsters.some(m => m.id === monsterId)) {
    console.warn(`魔弹"${monsterId}"已在编队中`);
    return false;
  }

  const monster = getMonsterById(monsterId);
  if (!monster) {
    console.warn(`未找到魔弹："${monsterId}"`);
    return false;
  }

  // 深拷贝魔弹数据（避免多处引用同一对象）
  const monsterCopy = JSON.parse(JSON.stringify(monster));

  // 假面圣罗特殊处理：初始元素为null，由玩家后续选择
  if (monsterCopy.id === 'jiamianshengluo') {
    monsterCopy.element = null;
    monsterCopy.allowedElements = [];
  }

  team.monsters.push(monsterCopy);
  return true;
}

/**
 * 从编队移除魔弹
 * @param {object} team     - 队伍状态对象
 * @param {number} index    - 要移除的索引
 * @returns {boolean}
 */
function removeMonsterFromTeam(team, index) {
  if (index < 0 || index >= team.monsters.length) return false;
  team.monsters.splice(index, 1);
  // 调整主战索引
  if (team.activeIndex >= team.monsters.length) {
    team.activeIndex = Math.max(0, team.monsters.length - 1);
  }
  return true;
}

/* ============================================================
 *  十一、主战切换
 *       规则：
 *       - 仅自身回合全部操作结束后可切换
 *       - 切换无消耗
 *       - 切换会清空当前护盾
 *       - 战斗中途、敌方回合不可切换
 *       - 假面圣罗切换后需选择领域
 * ============================================================ */

/**
 * 切换主战魔弹
 * @param {object} team      - 队伍状态对象
 * @param {number} newIndex  - 新主战索引
 * @param {string} [newElement] - （假面圣罗专用）切换后选择的元素
 * @returns {object} { success, message, oldMonster, newMonster }
 */
function switchActiveMonster(team, newIndex, newElement) {
  if (newIndex < 0 || newIndex >= team.monsters.length) {
    return { success: false, message: '无效的魔弹索引' };
  }

  if (newIndex === team.activeIndex) {
    return { success: false, message: '已是当前主战魔弹' };
  }

  const oldMonster = team.monsters[team.activeIndex];
  const newMonster = team.monsters[newIndex];

  // 切换主战 → 清空护盾
  clearShield(team);

  // 假面圣罗切换领域处理
  if (newMonster.id === 'jiamianshengluo') {
    if (newElement && ALL_ELEMENTS.includes(newElement)) {
      newMonster.element = newElement;
      newMonster.allowedElements = [newElement];
    } else if (!newMonster.element) {
      return {
        success: false,
        message: '假面圣罗需要选择一个领域元素',
      };
    }
    // 如果已有元素且未指定新元素，保持当前元素
  }

  team.activeIndex = newIndex;

  return {
    success: true,
    message: `主战切换为「${newMonster.name}」`,
    oldMonster,
    newMonster,
  };
}

/**
 * 判断当前是否允许切换主战
 * @param {object} gameState - 游戏全局状态
 * @param {string} playerSide - 'player' | 'ai'
 * @returns {boolean}
 */
function canSwitchMonster(gameState, playerSide) {
  // 仅当前回合方可切换
  if (gameState.currentTurn !== playerSide) return false;
  // 仅在回合操作全部完成后可切换
  if (!gameState.phase === 'switchPhase') return false;
  return true;
}

/* ============================================================
 *  十二、卡牌系别校验与可用性判断
 * ============================================================ */

/**
 * 校验某张卡牌是否可被当前主战魔弹使用
 * @param {object} card       - 卡牌数据对象
 * @param {object} monster    - 当前主战魔弹
 * @param {object} playerState - 玩家/AI状态对象
 * @param {number} availableEnergy - 当前可用魔能
 * @returns {object} { valid, reason, effectiveCost }
 */
function validateCardUsage(card, monster, playerState, availableEnergy) {
  // 1. 检查卡牌专属限制
  if (card.exclusiveTo !== null && card.exclusiveTo !== monster.id) {
    return {
      valid: false,
      reason: `「${card.name}」仅限「${getMonsterById(card.exclusiveTo)?.name || card.exclusiveTo}」使用`,
      effectiveCost: null,
    };
  }

  // 2. 检查元素系别
  if (!monster.allowedElements.includes(card.element)) {
    return {
      valid: false,
      reason: `当前主战「${monster.name}」无法使用${card.element}系卡牌`,
      effectiveCost: null,
    };
  }

  // 3. 检查卡牌是否被锁定
  if (playerState.lockedCardIds.includes(card.id)) {
    return {
      valid: false,
      reason: `「${card.name}」已被黑暗封印锁定`,
      effectiveCost: null,
    };
  }

  // 4. 计算实际消耗
  let effectiveCost = getEffectiveCardCost(card, monster);

  // 5. 魔域毒蝎debuff：卡牌消耗永久+2
  effectiveCost += (playerState.costUp || 0);

  // 6. 检查魔能是否足够
  if (effectiveCost > availableEnergy) {
    return {
      valid: false,
      reason: `魔能不足（需要${effectiveCost}，当前${availableEnergy}）`,
      effectiveCost,
    };
  }

  return { valid: true, reason: null, effectiveCost };
}

/**
 * 获取当前主战可用的全部卡牌（已过滤系别+专属+锁定）
 * @param {object} monster       - 当前主战魔弹
 * @param {object} playerState   - 玩家/AI状态对象
 * @param {number} availableEnergy - 可用魔能
 * @returns {object[]} 可用卡牌列表（含effectiveCost字段）
 */
function getUsableCards(monster, playerState, availableEnergy) {
  const allAvailable = getAvailableCardsForMonster(monster);
  return allAvailable
    .map(card => {
      const validation = validateCardUsage(card, monster, playerState, availableEnergy);
      return { ...card, effectiveCost: validation.effectiveCost, usable: validation.valid };
    })
    .filter(c => c.usable);
}

/* ============================================================
 *  十三、必杀（Ultimate）使用校验
 * ============================================================ */

/**
 * 检查当前主战是否可使用必杀
 * @param {object} monster      - 当前主战魔弹
 * @param {object} playerState  - 玩家/AI状态对象
 * @param {boolean} ultimateUsedThisTurn - 本回合是否已使用过必杀
 * @returns {object} { canUse, reason }
 */
function canUseUltimate(monster, playerState, ultimateUsedThisTurn) {
  if (!monster.ultimate) {
    return { canUse: false, reason: '当前魔弹无必杀技' };
  }

  if (ultimateUsedThisTurn) {
    return { canUse: false, reason: '本回合已使用过必杀' };
  }

  if (playerState.ultimateSealed) {
    return { canUse: false, reason: '必杀已被封印（追魂寒冰效果）' };
  }

  return { canUse: true, reason: null };
}

/* ============================================================
 *  十四、炎龙破特殊伤害计算
 *      基础100，每多一张火系卡+300
 *      "火系卡"定义为该方可使用的全部火系卡牌种类数
 * @param {object} playerState - 使用方状态
 * @param {object} monster     - 当前主战魔弹
 * @returns {number} 最终伤害
 */
function calculateYanLongPoDamage(playerState, monster) {
  const fireCards = getAvailableCardsForMonster(monster)
    .filter(c => c.element === ELEMENTS.FIRE && c.id !== 'yanlongpo');
  const bonusCount = fireCards.length; // 每多一张火系卡
  return 100 + bonusCount * 300;
}

/* ============================================================
 *  十五、游戏全局状态管理
 * ============================================================ */

/**
 * 创建新游戏状态
 * @returns {object} gameState
 */
function createGameState() {
  return {
    // --- 双方队伍 ---
    player: createTeam('player'),
    ai: createTeam('ai'),

    // --- 回合与先后手 ---
    currentTurn: null,        // 'player' | 'ai'
    firstMover: null,         // 'player' | 'ai'（整局不变）
    turnNumber: 0,            // 当前回合数（每方各行动一次为一个完整回合）
    phase: 'init',            // 当前阶段：'init'|'draw'|'action'|'switchPhase'|'end'

    // --- 本回合状态 ---
    ultimateUsedThisTurn: false, // 当前回合方是否已使用必杀
    hasSwitchedThisTurn: false,  // 当前回合方是否已切换过主战
    negateNextEnemyCard: false,  // 红莲风暴效果：抵消敌方下一张卡牌

    // --- 游戏结果 ---
    winner: null,             // 'player' | 'ai' | null
    gameOver: false,
  };
}

/**
 * 初始化对战：投掷硬币决定先后手
 * @param {object} gameState - 游戏状态
 * @returns {string} 先手方 'player' | 'ai'
 */
function initBattle(gameState) {
  const coinResult = flipCoin();
  if (coinResult === 'heads') {
    gameState.firstMover = 'player';
    gameState.currentTurn = 'player';
  } else {
    gameState.firstMover = 'ai';
    gameState.currentTurn = 'ai';
  }
  gameState.turnNumber = 1;
  gameState.phase = 'draw';
  return gameState.firstMover;
}

/**
 * 回合开始阶段：摇骰子获得魔能
 * @param {object} gameState
 * @returns {object} { diceResult, energyGained }
 */
function startTurnDrawPhase(gameState) {
  const diceResult = rollDice();
  const currentSide = gameState.currentTurn;
  const team = gameState[currentSide];

  team.magicEnergy += diceResult;
  gameState.phase = 'action';
  gameState.ultimateUsedThisTurn = false;
  gameState.hasSwitchedThisTurn = false;

  return { diceResult, energyGained: diceResult, totalEnergy: team.magicEnergy };
}

/**
 * 回合开始前：结算持续debuff + 被动回血
 * @param {object} gameState
 */
function preTurnSettlement(gameState) {
  const currentSide = gameState.currentTurn;
  const team = gameState[currentSide];

  // 1. 结算dot流失
  const dotResult = settleContinuousDebuffs(team);
  // 2. 结算buff过期
  settleContinuousBuffs(team);

  // 3. 检查灵能是否归零
  if (team.sharedSpirit <= 0) {
    gameState.winner = currentSide === 'player' ? 'ai' : 'player';
    gameState.gameOver = true;
  }

  return { dotDrain: dotResult.totalDrain };
}

/**
 * 回合结束后：被动回血结算、切换阶段
 * @param {object} gameState
 */
function postTurnSettlement(gameState) {
  const currentSide = gameState.currentTurn;
  const team = gameState[currentSide];
  const monster = team.activeMonster;

  // 独角天马/圣光天马被动回血
  if (monster && monster.passive && monster.passive.type === 'healPerTurn') {
    team.sharedSpirit = Math.min(
      MAX_SHARED_SPIRIT,
      team.sharedSpirit + monster.passive.healAmount
    );
  }

  // 进入切换阶段
  gameState.phase = 'switchPhase';
}

/**
 * 结束回合，传给对方
 * @param {object} gameState
 */
function endTurn(gameState) {
  // 清除回合性buff（如speedUp等标记）
  const currentSide = gameState.currentTurn;
  const team = gameState[currentSide];
  team.speedUp = false;

  // 切换回合方
  gameState.currentTurn = gameState.currentTurn === 'player' ? 'ai' : 'player';
  gameState.turnNumber += 1;
  gameState.phase = 'draw';
  gameState.negateNextEnemyCard = false; // 红莲风暴效果仅持续到对方回合结束
}

/* ============================================================
 *  十六、卡牌/必杀执行引擎
 * ============================================================ */

/**
 * 执行一张卡牌的效果
 * @param {object} gameState  - 全局游戏状态
 * @param {string} cardId     - 卡牌ID
 * @param {string} usedBy     - 'player' | 'ai'
 * @returns {object} 执行结果
 */
function playCard(gameState, cardId, usedBy) {
  const card = getCardById(cardId);
  if (!card) return { success: false, message: `未找到卡牌"${cardId}"` };

  const userTeam = gameState[usedBy];
  const enemyTeam = gameState[usedBy === 'player' ? 'ai' : 'player'];
  const monster = userTeam.activeMonster;
  if (!monster) return { success: false, message: '无当前主战魔弹' };

  // 校验卡牌可用性
  const validation = validateCardUsage(card, monster, userTeam, userTeam.magicEnergy);
  if (!validation.valid) {
    return { success: false, message: validation.reason };
  }

  // 检查是否被红莲风暴抵消
  if (gameState.negateNextEnemyCard && usedBy !== gameState.currentTurn) {
    // 红莲风暴仅抵消敌方本回合未结算卡牌
    // 此处简化：如果对方设了negate标记且轮到本方使用，则被抵消
    // 实际逻辑：negateNextEnemyCard在对方回合开始时检查
    // 此处按卡牌执行时判断
  }

  const effectiveCost = validation.effectiveCost;

  // 扣除魔能
  userTeam.magicEnergy -= effectiveCost;

  // 执行卡牌效果
  const result = executeCardEffect(card, monster, userTeam, enemyTeam, gameState);

  // 检查敌方是否败北
  if (enemyTeam.sharedSpirit <= 0) {
    gameState.winner = usedBy;
    gameState.gameOver = true;
  }

  return {
    success: true,
    cardName: card.name,
    cost: effectiveCost,
    remainingEnergy: userTeam.magicEnergy,
    ...result,
  };
}

/**
 * 执行必杀（Ultimate）
 * @param {object} gameState
 * @param {string} usedBy - 'player' | 'ai'
 * @returns {object} 执行结果
 */
function useUltimate(gameState, usedBy) {
  const userTeam = gameState[usedBy];
  const enemyTeam = gameState[usedBy === 'player' ? 'ai' : 'player'];
  const monster = userTeam.activeMonster;
  if (!monster) return { success: false, message: '无当前主战魔弹' };

  const ultCheck = canUseUltimate(monster, userTeam, gameState.ultimateUsedThisTurn);
  if (!ultCheck.canUse) {
    return { success: false, message: ultCheck.reason };
  }

  const ultimate = monster.ultimate;

  // 必杀无消耗，直接执行
  gameState.ultimateUsedThisTurn = true;

  // 构造伪卡牌对象用于伤害计算
  const pseudoCard = {
    id: `ultimate_${monster.id}`,
    name: ultimate.name,
    cost: 0,
    element: ultimate.element,
    type: 'damage',
    damage: ultimate.damage,
    description: ultimate.description,
    exclusiveTo: null,
    effects: {},
  };

  const result = executeCardEffect(
    pseudoCard, monster, userTeam, enemyTeam, gameState,
    ultimate.extra // 传入必杀额外效果
  );

  // 检查敌方败北
  if (enemyTeam.sharedSpirit <= 0) {
    gameState.winner = usedBy;
    gameState.gameOver = true;
  }

  return {
    success: true,
    ultimateName: ultimate.name,
    cost: 0,
    ...result,
  };
}

/**
 * 核心：执行卡牌/必杀效果
 * @param {object} card       - 卡牌/伪卡牌数据
 * @param {object} monster    - 使用者魔弹
 * @param {object} userTeam   - 使用方状态
 * @param {object} enemyTeam  - 敌方状态
 * @param {object} gameState  - 全局状态
 * @param {object} [extraEffects] - 必杀额外效果
 * @returns {object} 效果执行详情
 */
function executeCardEffect(card, monster, userTeam, enemyTeam, gameState, extraEffects) {
  const effectsDetail = {
    cardName: card.name,
    damageDealt: 0,
    shieldAbsorbed: 0,
    spiritDamage: 0,
    shieldApplied: 0,
    healApplied: 0,
    drainApplied: 0,
    buffsApplied: [],
    debuffsApplied: [],
    negated: false,
    breakdown: null,
  };

  // --- 红莲风暴抵消逻辑 ---
  // 如果敌方设置了negate标记且卡牌是敌方使用的（当前为敌方回合时被抵消）
  // 简化处理：检查标记，如果存在则抵消
  // 注：红莲风暴只能抵消本回合未结算卡牌，无法清除debuff
  // 此处以 gameState 中的 negateNextEnemyCard 标记实现
  if (gameState.negateNextEnemyCard) {
    gameState.negateNextEnemyCard = false;
    effectsDetail.negated = true;
    effectsDetail.message = `「${card.name}」被红莲风暴抵消！`;
    return effectsDetail;
  }

  // --- 根据卡牌类型执行效果 ---
  switch (card.type) {
    case 'damage':
    case 'aoe':
    case 'multiHit': {
      // 计算实际基础伤害
      let baseDamage = card.damage;

      // 炎龙破特殊计算
      if (card.id === 'yanlongpo') {
        baseDamage = calculateYanLongPoDamage(userTeam, monster);
      }

      // 暗影之力：额外debuff
      if (card.effects && card.effects.debuff) {
        addDebuff(enemyTeam, card.effects.debuff);
        effectsDetail.debuffsApplied.push(card.effects.debuff);
      }

      // 皇虎震地：额外debuff
      if (card.effects && card.effects.debuff && card.id === 'huanghuzhendi') {
        addDebuff(enemyTeam, card.effects.debuff);
        effectsDetail.debuffsApplied.push(card.effects.debuff);
      }

      // 玄翎风暴：无视护盾阈值
      const ignoreShield = card.effects && card.effects.ignoreShieldUpTo
        ? card.effects.ignoreShieldUpTo
        : undefined;

      // 伤害结算
      const dmgResult = calculateDamage({
        baseDamage,
        damageElement: card.element,
        attacker: userTeam,
        defender: enemyTeam,
        ignoreShieldUpTo: ignoreShield,
      });

      // 风之翼闪避：若敌方有闪避buff，抵扣伤害
      if (enemyTeam.dodgeAmount > 0 && dmgResult.spiritDamage > 0) {
        const dodged = Math.min(enemyTeam.dodgeAmount, dmgResult.spiritDamage);
        dmgResult.spiritDamage -= dodged;
        enemyTeam.dodgeAmount -= dodged;
        dmgResult.shieldAbsorbed += dodged; // 归入吸收量展示
      }

      // 扣除共享灵能
      enemyTeam.sharedSpirit = Math.max(0, enemyTeam.sharedSpirit - dmgResult.spiritDamage);

      effectsDetail.damageDealt = dmgResult.totalDamage;
      effectsDetail.shieldAbsorbed = dmgResult.shieldAbsorbed;
      effectsDetail.spiritDamage = dmgResult.spiritDamage;
      effectsDetail.breakdown = dmgResult.breakdown;

      // 龙王焚天：清空敌方护盾
      if (card.effects && card.effects.clearEnemyShield) {
        clearShield(enemyTeam);
        effectsDetail.shieldCleared = true;
      }

      // 幻麒麟被动：被击时30%概率出150水盾
      if (enemyTeam.activeMonster && enemyTeam.activeMonster.passive &&
          enemyTeam.activeMonster.passive.type === 'reactiveShield') {
        const passive = enemyTeam.activeMonster.passive;
        if (rollChance(passive.triggerChance)) {
          applyShield(enemyTeam, passive.shieldAmount, passive.shieldElement);
          effectsDetail.reactiveShieldTriggered = true;
          effectsDetail.reactiveShieldAmount = passive.shieldAmount;
        }
      }
      break;
    }

    case 'shield': {
      const shieldAmt = card.effects.shieldAmount || 0;
      const applied = applyShield(userTeam, shieldAmt, card.element);
      effectsDetail.shieldApplied = shieldAmt;
      effectsDetail.shieldOverwritten = !applied;

      // 圣光守护额外攻击+50
      if (card.effects.attackBonus) {
        addBuff(userTeam, {
          type: 'lightAttackBonus',
          amount: card.effects.attackBonus,
          duration: 1,
          name: card.name,
        });
        effectsDetail.buffsApplied.push({
          type: 'lightAttackBonus',
          amount: card.effects.attackBonus,
        });
      }
      break;
    }

    case 'heal': {
      const healAmt = card.effects.healSpirit || 0;
      const beforeHeal = userTeam.sharedSpirit;
      userTeam.sharedSpirit = Math.min(MAX_SHARED_SPIRIT, userTeam.sharedSpirit + healAmt);
      effectsDetail.healApplied = userTeam.sharedSpirit - beforeHeal;
      break;
    }

    case 'drain': {
      const drainAmt = card.effects.drainSpirit || 0;
      enemyTeam.sharedSpirit = Math.max(0, enemyTeam.sharedSpirit - drainAmt);
      effectsDetail.drainApplied = drainAmt;
      break;
    }

    case 'buff': {
      // 爆炎附体
      if (card.effects.fireAttackBonus) {
        addBuff(userTeam, {
          type: 'fireAttackBonus',
          amount: card.effects.fireAttackBonus,
          duration: card.effects.duration || 1,
          name: card.name,
        });
        effectsDetail.buffsApplied.push({
          type: 'fireAttackBonus',
          amount: card.effects.fireAttackBonus,
        });
      }
      // 迅捷之风
      if (card.effects.windDamageBonus) {
        addBuff(userTeam, {
          type: 'windDamageBonus',
          amount: card.effects.windDamageBonus,
          duration: card.effects.duration || 1,
          name: card.name,
        });
        effectsDetail.buffsApplied.push({
          type: 'windDamageBonus',
          amount: card.effects.windDamageBonus,
        });
      }
      if (card.effects.speedUp) {
        userTeam.speedUp = true;
        effectsDetail.buffsApplied.push({ type: 'speedUp' });
      }
      // 契约之风
      if (card.effects.windCardDamageBonus) {
        addBuff(userTeam, {
          type: 'windCardDamageBonus',
          amount: card.effects.windCardDamageBonus,
          duration: card.effects.duration || 1,
          name: card.name,
        });
        effectsDetail.buffsApplied.push({
          type: 'windCardDamageBonus',
          amount: card.effects.windCardDamageBonus,
        });
      }
      break;
    }

    case 'debuff': {
      // 大地威压 / 恐惧之源
      if (card.effects.enemyAtkDown) {
        addDebuff(enemyTeam, {
          type: 'atkDown',
          amount: card.effects.enemyAtkDown,
          duration: card.effects.duration || 1,
        });
        effectsDetail.debuffsApplied.push({
          type: 'atkDown',
          amount: card.effects.enemyAtkDown,
        });
      }
      break;
    }

    case 'negate': {
      // 红莲风暴：标记下次抵消敌方卡牌
      if (card.effects.negateEnemyCard) {
        gameState.negateNextEnemyCard = true;
        effectsDetail.negateSet = true;
      }
      break;
    }

    case 'lock': {
      // 黑暗封印：锁定敌方一张卡（简化：随机锁定一张可用卡）
      if (card.effects.lockEnemyCard) {
        const enemyCards = getAvailableCardsForMonster(enemyTeam.activeMonster);
        const unlockedCards = enemyCards.filter(
          c => !enemyTeam.lockedCardIds.includes(c.id)
        );
        if (unlockedCards.length > 0) {
          const targetCard = unlockedCards[Math.floor(Math.random() * unlockedCards.length)];
          addDebuff(enemyTeam, {
            type: 'cardLocked',
            cardId: targetCard.id,
            cardName: targetCard.name,
            permanent: true,
          });
          effectsDetail.debuffsApplied.push({
            type: 'cardLocked',
            cardId: targetCard.id,
            cardName: targetCard.name,
          });
        }
      }
      break;
    }

    case 'clear': {
      // 圣辉净世
      if (card.effects.clearAllEnemyDebuffs) {
        clearAllDebuffs(enemyTeam);
        effectsDetail.clearedDebuffs = true;
      }
      if (card.effects.healSpirit) {
        const beforeHeal = userTeam.sharedSpirit;
        userTeam.sharedSpirit = Math.min(MAX_SHARED_SPIRIT, userTeam.sharedSpirit + card.effects.healSpirit);
        effectsDetail.healApplied = userTeam.sharedSpirit - beforeHeal;
      }
      // 混沌均衡
      if (card.effects.clearAllAtkDefModifiers) {
        clearAllAtkDefModifiers(userTeam);
        clearAllAtkDefModifiers(enemyTeam);
        effectsDetail.clearedAtkDef = true;
      }
      break;
    }

    case 'dodge': {
      // 风之翼
      if (card.effects.dodgeAmount) {
        addBuff(userTeam, {
          type: 'dodge',
          amount: card.effects.dodgeAmount,
          duration: 1,
          name: card.name,
        });
        effectsDetail.buffsApplied.push({
          type: 'dodge',
          amount: card.effects.dodgeAmount,
        });
      }
      break;
    }

    default:
      break;
  }

  // --- 处理必杀额外效果 ---
  if (extraEffects) {
    // 鬼面圣君：概率打断
    if (extraEffects.interruptChance && rollChance(extraEffects.interruptChance)) {
      effectsDetail.interrupted = true;
      effectsDetail.interruptMessage = '风裂龙卷打断了敌方卡牌！';
    }
    // 必杀附加的debuff
    if (extraEffects.debuff) {
      addDebuff(enemyTeam, extraEffects.debuff);
      effectsDetail.debuffsApplied.push(extraEffects.debuff);
    }
  }

  return effectsDetail;
}

/* ============================================================
 *  十七、鬼面圣君打断逻辑
 *      当敌方使用卡牌时，若己方主战为鬼面圣君且已使用必杀
 *      则有机率打断（在上一节 executeCardEffect 已处理）
 *      此处提供独立的打断判定函数供UI层调用
 * ============================================================ */

/**
 * 判定鬼面圣君必杀是否触发打断
 * @param {object} defenderMonster - 防御方主战魔弹
 * @returns {boolean}
 */
function checkInterrupt(defenderMonster) {
  if (!defenderMonster || defenderMonster.id !== 'guimianshengjun') return false;
  if (!defenderMonster.ultimate || !defenderMonster.ultimate.extra) return false;
  return rollChance(defenderMonster.ultimate.extra.interruptChance || INTERRUPT_CHANCE);
}

/* ============================================================
 *  十八、AI 简易决策引擎
 *      提供基础AI行为：选择卡牌、使用必杀、切换主战
 *      （后期可替换为更复杂的AI）
 * ============================================================ */

/**
 * AI选择最优行动
 * @param {object} gameState
 * @returns {object} { action: 'card'|'ultimate'|'switch'|'end', cardId?, switchIndex?, switchElement? }
 */
function aiDecideAction(gameState) {
  const aiTeam = gameState.ai;
  const playerTeam = gameState.player;
  const monster = aiTeam.activeMonster;
  if (!monster) return { action: 'end' };

  const availableEnergy = aiTeam.magicEnergy;

  // 获取可用卡牌
  const usableCards = getUsableCards(monster, aiTeam, availableEnergy);

  // --- 优先使用必杀 ---
  const ultCheck = canUseUltimate(monster, aiTeam, gameState.ultimateUsedThisTurn);
  if (ultCheck.canUse && monster.ultimate && monster.ultimate.damage > 0) {
    return { action: 'ultimate' };
  }

  // --- 选择伤害最高的可用卡牌 ---
  if (usableCards.length > 0) {
    // 优先选高伤害卡牌
    const damageCards = usableCards.filter(c => c.damage > 0);
    if (damageCards.length > 0) {
      damageCards.sort((a, b) => b.damage - a.damage);
      return { action: 'card', cardId: damageCards[0].id };
    }
    // 其次选治疗/护盾
    const defensiveCards = usableCards.filter(
      c => c.type === 'heal' || c.type === 'shield'
    );
    if (defensiveCards.length > 0 && aiTeam.sharedSpirit < MAX_SHARED_SPIRIT * 0.5) {
      return { action: 'card', cardId: defensiveCards[0].id };
    }
    // 使用任意卡牌
    return { action: 'card', cardId: usableCards[0].id };
  }

  // --- 无可用卡牌：考虑切换主战 ---
  if (aiTeam.monsters.length > 1 && !gameState.hasSwitchedThisTurn) {
    // 找另一个有可用卡牌的魔弹
    for (let i = 0; i < aiTeam.monsters.length; i++) {
      if (i === aiTeam.activeIndex) continue;
      const altMonster = aiTeam.monsters[i];
      // 假面圣罗需要选元素
      if (altMonster.id === 'jiamianshengluo') {
        // 随机选一个元素
        const randomElement = ALL_ELEMENTS[Math.floor(Math.random() * ALL_ELEMENTS.length)];
        return { action: 'switch', switchIndex: i, switchElement: randomElement };
      }
      return { action: 'switch', switchIndex: i };
    }
  }

  // --- 结束回合 ---
  return { action: 'end' };
}

/* ============================================================
 *  十九、LocalStorage 存档系统
 *       结构：{ version, timestamp, gameState }
 * ============================================================ */

const SAVE_KEY = 'modanwang_save';
const SAVE_VERSION = '1.0.0';

/**
 * 保存游戏到 LocalStorage
 * @param {object} gameState - 全局游戏状态
 * @returns {boolean} 是否保存成功
 */
function saveGame(gameState) {
  try {
    // 深拷贝并清理循环引用/不可序列化字段
    const saveData = {
      version: SAVE_VERSION,
      timestamp: new Date().toISOString(),
      gameState: serializeGameState(gameState),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    console.log('游戏已保存');
    return true;
  } catch (e) {
    console.error('保存失败：', e);
    return false;
  }
}

/**
 * 从 LocalStorage 加载游戏
 * @returns {object|null} 恢复的 gameState 或 null
 */
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      console.log('无存档记录');
      return null;
    }
    const saveData = JSON.parse(raw);
    if (saveData.version !== SAVE_VERSION) {
      console.warn('存档版本不匹配');
      return null;
    }
    const gameState = deserializeGameState(saveData.gameState);
    console.log('游戏已加载，存档时间：', saveData.timestamp);
    return gameState;
  } catch (e) {
    console.error('加载失败：', e);
    return null;
  }
}

/**
 * 删除存档
 */
function deleteSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
    console.log('存档已删除');
  } catch (e) {
    console.error('删除存档失败：', e.message);
  }
}

/**
 * 检查是否存在存档
 * @returns {boolean}
 */
function hasSaveData() {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch (e) {
    return false;
  }
}

/**
 * 序列化游戏状态（保留getter无法序列化的部分，手动提取关键数据）
 */
function serializeGameState(gs) {
  return {
    // 玩家队伍
    player: serializeTeamState(gs.player),
    // AI队伍
    ai: serializeTeamState(gs.ai),
    // 回合信息
    currentTurn: gs.currentTurn,
    firstMover: gs.firstMover,
    turnNumber: gs.turnNumber,
    phase: gs.phase,
    ultimateUsedThisTurn: gs.ultimateUsedThisTurn,
    hasSwitchedThisTurn: gs.hasSwitchedThisTurn,
    negateNextEnemyCard: gs.negateNextEnemyCard,
    winner: gs.winner,
    gameOver: gs.gameOver,
  };
}

/**
 * 序列化单方队伍状态
 */
function serializeTeamState(team) {
  return {
    owner: team.owner,
    monsters: team.monsters.map(m => ({
      id: m.id,
      name: m.name,
      element: m.element,
      allowedElements: m.allowedElements,
    })),
    activeIndex: team.activeIndex,
    sharedSpirit: team.sharedSpirit,
    magicEnergy: team.magicEnergy,
    shield: team.shield,
    shieldElement: team.shieldElement,
    buffs: team.buffs,
    debuffs: team.debuffs,
    // 快捷字段
    atkDown: team.atkDown,
    damageHalved: team.damageHalved,
    waterDamageDown: team.waterDamageDown,
    ultimateSealed: team.ultimateSealed,
    costUp: team.costUp,
    lockedCardIds: team.lockedCardIds,
    fireAttackBonus: team.fireAttackBonus,
    windDamageBonus: team.windDamageBonus,
    windCardDamageBonus: team.windCardDamageBonus,
    lightAttackBonus: team.lightAttackBonus,
    dodgeAmount: team.dodgeAmount,
    speedUp: team.speedUp,
  };
}

/**
 * 反序列化游戏状态：从存档数据恢复完整gameState对象
 */
function deserializeGameState(savedGS) {
  const gameState = createGameState();

  // 恢复队伍
  restoreTeamState(gameState.player, savedGS.player);
  restoreTeamState(gameState.ai, savedGS.ai);

  // 恢复回合信息
  gameState.currentTurn = savedGS.currentTurn;
  gameState.firstMover = savedGS.firstMover;
  gameState.turnNumber = savedGS.turnNumber;
  gameState.phase = savedGS.phase;
  gameState.ultimateUsedThisTurn = savedGS.ultimateUsedThisTurn;
  gameState.hasSwitchedThisTurn = savedGS.hasSwitchedThisTurn;
  gameState.negateNextEnemyCard = savedGS.negateNextEnemyCard;
  gameState.winner = savedGS.winner;
  gameState.gameOver = savedGS.gameOver;

  return gameState;
}

/**
 * 从存档恢复单方队伍状态
 */
function restoreTeamState(team, savedTeam) {
  team.owner = savedTeam.owner;

  // 根据保存的monster id重新构建魔弹对象
  team.monsters = [];
  for (const sm of savedTeam.monsters) {
    const template = getMonsterById(sm.id);
    if (!template) continue;
    const monsterCopy = JSON.parse(JSON.stringify(template));
    // 恢复运行时状态
    monsterCopy.element = sm.element;
    monsterCopy.allowedElements = sm.allowedElements;
    team.monsters.push(monsterCopy);
  }

  team.activeIndex = savedTeam.activeIndex;
  team.sharedSpirit = savedTeam.sharedSpirit;
  team.magicEnergy = savedTeam.magicEnergy;
  team.shield = savedTeam.shield;
  team.shieldElement = savedTeam.shieldElement;
  team.buffs = savedTeam.buffs || [];
  team.debuffs = savedTeam.debuffs || [];
  team.atkDown = savedTeam.atkDown || 0;
  team.damageHalved = savedTeam.damageHalved || false;
  team.waterDamageDown = savedTeam.waterDamageDown || 0;
  team.ultimateSealed = savedTeam.ultimateSealed || false;
  team.costUp = savedTeam.costUp || 0;
  team.lockedCardIds = savedTeam.lockedCardIds || [];
  team.fireAttackBonus = savedTeam.fireAttackBonus || 0;
  team.windDamageBonus = savedTeam.windDamageBonus || 0;
  team.windCardDamageBonus = savedTeam.windCardDamageBonus || 0;
  team.lightAttackBonus = savedTeam.lightAttackBonus || 0;
  team.dodgeAmount = savedTeam.dodgeAmount || 0;
  team.speedUp = savedTeam.speedUp || false;
}

/* ============================================================
 *  二十、便捷调试：打印当前双方状态摘要
 * ============================================================ */

/**
 * 输出当前对局状态（控制台调试用）
 * @param {object} gameState
 */
function printGameStatus(gameState) {
  const p = gameState.player;
  const a = gameState.ai;

  console.log('========== 魔弹王对局状态 ==========');
  console.log(`回合：${gameState.turnNumber} | 当前方：${gameState.currentTurn} | 阶段：${gameState.phase}`);
  console.log(`先手：${gameState.firstMover} | 游戏结束：${gameState.gameOver} | 胜者：${gameState.winner || '—'}`);

  console.log('\n--- 玩家 ---');
  console.log(`  灵能：${p.sharedSpirit}/${MAX_SHARED_SPIRIT} | 魔能：${p.magicEnergy} | 护盾：${p.shield}`);
  console.log(`  主战：[${p.activeIndex}] ${p.activeMonster?.name || '无'} (${p.activeMonster?.element || '?'}) ATK:${p.activeMonster?.baseAttack || 0}`);
  console.log(`  编队：${p.monsters.map(m => m.name).join(' / ')}`);

  console.log('\n--- AI ---');
  console.log(`  灵能：${a.sharedSpirit}/${MAX_SHARED_SPIRIT} | 魔能：${a.magicEnergy} | 护盾：${a.shield}`);
  console.log(`  主战：[${a.activeIndex}] ${a.activeMonster?.name || '无'} (${a.activeMonster?.element || '?'}) ATK:${a.activeMonster?.baseAttack || 0}`);
  console.log(`  编队：${a.monsters.map(m => m.name).join(' / ')}`);

  console.log('====================================');
}

/* ============================================================
 *  二十一、完整对战流程示例（演示各函数调用顺序）
 * ============================================================ */

/**
 * 运行一场示例对战（控制台演示）
 * 展示完整API调用流程，供UI开发者参考
 */
function runDemoBattle() {
  console.log('===== 魔弹王 1v1 对战演示 =====\n');

  // 1. 创建游戏
  const game = createGameState();

  // 2. 玩家编队：爆炎龙 + 幻麒麟 + 玄翎凤凰
  addMonsterToTeam(game.player, 'baoyanlong');
  addMonsterToTeam(game.player, 'huanqilin');
  addMonsterToTeam(game.player, 'xuanlingfenghuang');

  // 3. AI编队：魔域毒蝎 + 摩岩巨象 + 鬼面圣君
  addMonsterToTeam(game.ai, 'moyuduxie');
  addMonsterToTeam(game.ai, 'moyanjuxiang');
  addMonsterToTeam(game.ai, 'guimianshengjun');

  // 4. 初始化先后手
  const first = initBattle(game);
  console.log(`硬币结果：${first === 'player' ? '玩家' : 'AI'}先手\n`);

  // 5. 模拟几个回合
  for (let round = 0; round < 3; round++) {
    if (game.gameOver) break;

    const side = game.currentTurn;
    const sideName = side === 'player' ? '玩家' : 'AI';

    console.log(`--- 第${game.turnNumber}回合（${sideName}方） ---`);

    // 回合前debuff结算
    const preSettle = preTurnSettlement(game);
    if (preSettle.dotDrain > 0) {
      console.log(`持续流失：${preSettle.dotDrain} 灵能`);
    }

    // 摇骰子
    const draw = startTurnDrawPhase(game);
    console.log(`骰子点数：${draw.diceResult}，获得${draw.energyGained}魔能（总计：${draw.totalEnergy}）`);

    if (side === 'player') {
      // 玩家模拟：优先使用必杀，其次选可用卡牌
      const monster = game.player.activeMonster;
      const energy = game.player.magicEnergy;
      const ultCheck = canUseUltimate(monster, game.player, game.ultimateUsedThisTurn);

      if (ultCheck.canUse && monster.ultimate && monster.ultimate.damage > 0) {
        const ultResult = useUltimate(game, 'player');
        if (ultResult.success) {
          console.log(`玩家使用必杀「${ultResult.ultimateName}」造成${ultResult.spiritDamage}灵能伤害`);
        }
      } else {
        const usableCards = getUsableCards(monster, game.player, energy);
        if (usableCards.length > 0) {
          const cardResult = playCard(game, usableCards[0].id, 'player');
          if (cardResult.success) {
            console.log(`玩家使用「${cardResult.cardName}」消耗${cardResult.cost}魔能，造成${cardResult.spiritDamage || 0}灵能伤害`);
          }
        } else {
          // 尝试切换主战
          const altIdx = game.player.monsters.findIndex((m, i) => i !== game.player.activeIndex);
          if (altIdx >= 0 && !game.hasSwitchedThisTurn) {
            const sw = switchActiveMonster(game.player, altIdx);
            console.log('玩家' + sw.message);
          } else {
            console.log('玩家无可用卡牌，结束回合');
          }
        }
      }
    } else {
      // AI自动决策
      const aiAction = aiDecideAction(game);
      console.log(`AI决策：${aiAction.action}`);

      if (aiAction.action === 'card') {
        const aiCardResult = playCard(game, aiAction.cardId, 'ai');
        if (aiCardResult.success) {
          console.log(`AI使用卡牌「${aiCardResult.cardName}」消耗${aiCardResult.cost}魔能`);
          if (aiCardResult.spiritDamage) {
            console.log(`  造成${aiCardResult.spiritDamage}灵能伤害`);
          }
        } else {
          console.log(`AI卡牌失败：${aiCardResult.message}`);
        }
      } else if (aiAction.action === 'ultimate') {
        const ultResult = useUltimate(game, 'ai');
        if (ultResult.success) {
          console.log(`AI使用必杀「${ultResult.ultimateName}」`);
          if (ultResult.spiritDamage) {
            console.log(`  造成${ultResult.spiritDamage}灵能伤害`);
          }
        } else {
          console.log(`AI必杀失败：${ultResult.message}`);
        }
      } else if (aiAction.action === 'switch') {
        const swResult = switchActiveMonster(game.ai, aiAction.switchIndex, aiAction.switchElement);
        console.log(`AI切换主战：${swResult.message}`);
      } else {
        console.log('AI结束回合');
      }
    }

    // 回合后被动结算
    postTurnSettlement(game);

    // 切换阶段（简化：直接结束回合）
    if (!game.gameOver) {
      endTurn(game);
    }

    printGameStatus(game);
    console.log('');
  }

  console.log('===== 对战演示结束 =====');
  return game;
}

/* ============================================================
 *  导出接口（浏览器环境挂载到 window，Node环境挂载到 module.exports）
 * ============================================================ */

if (typeof window !== 'undefined') {
  // 浏览器环境
  window.MoDanWang = {
    // 常量
    MAX_SHARED_SPIRIT,
    MAX_TEAM_SIZE,
    MAX_DICE_ENERGY,
    ELEMENTS,
    ALL_ELEMENTS,
    COUNTER_MAP,
    COUNTER_MULTIPLIER,
    RESIST_MULTIPLIER,

    // 数据
    ALL_MONSTERS,
    ALL_CARDS,

    // 查找
    getMonsterById,
    getCardById,
    getCardsByElement,
    getAvailableCardsForMonster,
    getEffectiveCardCost,
    getUsableCards,

    // 随机
    rollDice,
    flipCoin,
    rollChance,

    // 伤害/护盾
    calculateDamage,
    applyShield,
    absorbDamageByShield,
    clearShield,
    getCounterMultiplier,

    // Debuff/Buff
    settleContinuousDebuffs,
    settleContinuousBuffs,
    addDebuff,
    addBuff,
    clearAllDebuffs,
    clearAllAtkDefModifiers,
    syncDebuffQuickFields,
    syncBuffQuickFields,

    // 编队
    createTeam,
    addMonsterToTeam,
    removeMonsterFromTeam,

    // 主战切换
    switchActiveMonster,
    canSwitchMonster,

    // 卡牌校验
    validateCardUsage,
    canUseUltimate,
    calculateYanLongPoDamage,

    // 游戏状态
    createGameState,
    initBattle,
    startTurnDrawPhase,
    preTurnSettlement,
    postTurnSettlement,
    endTurn,

    // 执行
    playCard,
    useUltimate,
    executeCardEffect,
    checkInterrupt,

    // AI
    aiDecideAction,

    // 存档
    saveGame,
    loadGame,
    deleteSave,
    hasSaveData,

    // 调试
    printGameStatus,
    runDemoBattle,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MAX_SHARED_SPIRIT,
    MAX_TEAM_SIZE,
    MAX_DICE_ENERGY,
    ELEMENTS,
    ALL_ELEMENTS,
    COUNTER_MAP,
    COUNTER_MULTIPLIER,
    RESIST_MULTIPLIER,
    ALL_MONSTERS,
    ALL_CARDS,
    getMonsterById,
    getCardById,
    getCardsByElement,
    getAvailableCardsForMonster,
    getEffectiveCardCost,
    getUsableCards,
    rollDice,
    flipCoin,
    rollChance,
    calculateDamage,
    applyShield,
    absorbDamageByShield,
    clearShield,
    getCounterMultiplier,
    settleContinuousDebuffs,
    settleContinuousBuffs,
    addDebuff,
    addBuff,
    clearAllDebuffs,
    clearAllAtkDefModifiers,
    syncDebuffQuickFields,
    syncBuffQuickFields,
    createTeam,
    addMonsterToTeam,
    removeMonsterFromTeam,
    switchActiveMonster,
    canSwitchMonster,
    validateCardUsage,
    canUseUltimate,
    calculateYanLongPoDamage,
    createGameState,
    initBattle,
    startTurnDrawPhase,
    preTurnSettlement,
    postTurnSettlement,
    endTurn,
    playCard,
    useUltimate,
    executeCardEffect,
    checkInterrupt,
    aiDecideAction,
    saveGame,
    loadGame,
    deleteSave,
    hasSaveData,
    printGameStatus,
    runDemoBattle,
  };
}
