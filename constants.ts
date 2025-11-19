
import { HandType, Joker, Rank, Suit, Blind, BossAbility, Consumable, HandLevel, Tag, Voucher, Pack } from "./types";

// --- 游戏基础常量 (Game Constants) ---
export const STARTING_HAND_SIZE = 8; 
export const MAX_HAND_SIZE = 8;      
export const STARTING_HANDS = 4;     
export const STARTING_DISCARDS = 3;  
export const STARTING_MONEY = 4;     
export const BASE_ANTE_SCORE = 300;  
export const MAX_JOKERS_DEFAULT = 5; // 默认小丑槽位，可通过 Negative 版本增加
export const MAX_CONSUMABLES = 2;
export const BASE_REROLL_COST = 5;

// --- 版本与增强数值 (Editions & Enhancements) ---
export const EDITION_VALUES = {
    Foil: { chips: 50, mult: 0, x_mult: 1 },
    Holographic: { chips: 0, mult: 10, x_mult: 1 },
    Polychrome: { chips: 0, mult: 0, x_mult: 1.5 },
    Negative: { chips: 0, mult: 0, x_mult: 1, extraSlot: 1 }, // Negative 提供额外槽位
};

export const ENHANCEMENT_VALUES = {
    Bonus: { chips: 30, mult: 0 },
    Mult: { chips: 0, mult: 4 },
    Glass: { x_mult: 2, breakChance: 0.25 }, // 1/4 几率破碎
    Steel: { x_mult: 1.5 }, // 在手牌时生效
    Stone: { chips: 50 }, // 石头牌+50筹码，无点数花色
    Gold: { money: 3 }, // 结算时 +$3
    Lucky: { moneyChance: 0.2, money: 20, multChance: 0.2, mult: 20 }
};

// --- 补充包 (Booster Packs) ---
export const PACKS: Pack[] = [
    { id: 'p_arcana_normal', name: 'Arcana Pack', nameZh: '奥秘包', type: 'Arcana', cost: 4, size: 3, choices: 1, description: 'Choose 1 of 3 Tarot cards', descriptionZh: '3选1 塔罗牌' },
    { id: 'p_celestial_normal', name: 'Celestial Pack', nameZh: '天体包', type: 'Celestial', cost: 4, size: 3, choices: 1, description: 'Choose 1 of 3 Planet cards', descriptionZh: '3选1 星球牌' },
    { id: 'p_standard_normal', name: 'Standard Pack', nameZh: '标准包', type: 'Standard', cost: 4, size: 3, choices: 1, description: 'Choose 1 of 3 Playing cards', descriptionZh: '3选1 扑克牌 (可能含特效)' },
    { id: 'p_buffoon_normal', name: 'Buffoon Pack', nameZh: '小丑包', type: 'Buffoon', cost: 6, size: 2, choices: 1, description: 'Choose 1 of 2 Joker cards', descriptionZh: '2选1 小丑牌' },
];

// --- 盲注定义 ---
export const BLIND_DEFINITIONS: Record<string, Partial<Blind>> = {
    'Small': { name: 'Small Blind', nameZh: '小盲注', type: 'Small', scoreBase: 1, reward: 3 },
    'Big': { name: 'Big Blind', nameZh: '大盲注', type: 'Big', scoreBase: 1.5, reward: 4 },
};

// --- Boss 盲注列表 ---
export const BOSS_BLINDS: Array<{ name: string; nameZh: string; ability: BossAbility; description: string; descriptionZh: string }> = [
    { name: 'The Wall', nameZh: '高墙', ability: 'The Wall', description: 'Extra large blind (4x Score)', descriptionZh: '特大盲注 (分数要求 4x)' },
    { name: 'The Club', nameZh: '梅花', ability: 'The Club', description: 'All Club cards are debuffed', descriptionZh: '所有梅花牌被削弱' },
    { name: 'The Goad', nameZh: '刺棒', ability: 'The Goad', description: 'All Spade cards are debuffed', descriptionZh: '所有黑桃牌被削弱' },
    { name: 'The Window', nameZh: '窗口', ability: 'The Window', description: 'All Diamond cards are debuffed', descriptionZh: '所有方块牌被削弱' },
    { name: 'The Head', nameZh: '头像', ability: 'The Head', description: 'All Heart cards are debuffed', descriptionZh: '所有红桃牌被削弱' },
];

// --- 标签池 (Tags) ---
export const TAGS: Tag[] = [
    { id: 'tag_uncommon', name: 'Uncommon Tag', nameZh: '罕见标签', description: 'Next shop has Uncommon Joker', descriptionZh: '下一次商店出现罕见小丑', type: 'shop', bgClass: 'bg-green-600' },
    { id: 'tag_rare', name: 'Rare Tag', nameZh: '稀有标签', description: 'Next shop has Rare Joker', descriptionZh: '下一次商店出现稀有小丑', type: 'shop', bgClass: 'bg-red-600' },
    { id: 'tag_coupon', name: 'Coupon Tag', nameZh: '优惠券标签', description: 'Initial cards in next shop are free', descriptionZh: '下一次商店初始物品免费', type: 'economy', bgClass: 'bg-teal-600' },
    { id: 'tag_investment', name: 'Investment Tag', nameZh: '投资标签', description: 'Gain $15', descriptionZh: '获得 $15', type: 'economy', bgClass: 'bg-gray-600' },
    { id: 'tag_speed', name: 'Speed Tag', nameZh: '速度标签', description: 'Gain $5', descriptionZh: '获得 $5', type: 'economy', bgClass: 'bg-blue-600' },
];

// --- 优惠券池 (Vouchers) ---
export const VOUCHERS: Voucher[] = [
    { id: 'v_overstock', name: 'Overstock', nameZh: '积压货', description: '+1 Card slot in shop', descriptionZh: '商店增加 1 个卡牌槽位', cost: 10, effectId: 'overstock' },
    { id: 'v_clearance', name: 'Clearance Sale', nameZh: '清仓大甩卖', description: 'All cards and packs in shop are 25% off', descriptionZh: '商店所有物品 75 折', cost: 10, effectId: 'clearance' },
    { id: 'v_hone', name: 'Hone', nameZh: '磨刀石', description: 'Foil cards appear 2x more often', descriptionZh: '箔金卡牌出现率翻倍 (视觉效果)', cost: 10, effectId: 'hone' },
    { id: 'v_grabber', name: 'Grabber', nameZh: '抓取者', description: 'Permanently gain +1 Hand per round', descriptionZh: '每回合永久 +1 出牌次数', cost: 10, effectId: 'grabber' },
    { id: 'v_wasteful', name: 'Wasteful', nameZh: '浪费者', description: 'Permanently gain +1 Discard per round', descriptionZh: '每回合永久 +1 弃牌次数', cost: 10, effectId: 'wasteful' },
];


// --- 牌型基础数值与升级规则 ---
export const HAND_SCALING: Record<HandType, { baseChips: number; baseMult: number; levelChips: number; levelMult: number; label: string; labelZh: string; description: string; descriptionZh: string }> = {
  [HandType.HighCard]: { 
      baseChips: 5, baseMult: 1, levelChips: 10, levelMult: 1,
      label: "High Card", labelZh: "高牌", description: "Highest value card", descriptionZh: "单张点数最大的牌" 
  },
  [HandType.Pair]: { 
      baseChips: 10, baseMult: 2, levelChips: 15, levelMult: 1,
      label: "Pair", labelZh: "对子", description: "2 cards of same rank", descriptionZh: "2张点数相同的牌"
  },
  [HandType.TwoPair]: { 
      baseChips: 20, baseMult: 2, levelChips: 20, levelMult: 1,
      label: "Two Pair", labelZh: "两对", description: "2 pairs", descriptionZh: "2组对子"
  },
  [HandType.ThreeOfAKind]: { 
      baseChips: 30, baseMult: 3, levelChips: 20, levelMult: 2,
      label: "Three of a Kind", labelZh: "三条", description: "3 cards of same rank", descriptionZh: "3张点数相同的牌"
  },
  [HandType.Straight]: { 
      baseChips: 30, baseMult: 4, levelChips: 30, levelMult: 3,
      label: "Straight", labelZh: "顺子", description: "5 consecutive cards", descriptionZh: "5张点数连续的牌"
  },
  [HandType.Flush]: { 
      baseChips: 35, baseMult: 4, levelChips: 15, levelMult: 2,
      label: "Flush", labelZh: "同花", description: "5 cards of same suit", descriptionZh: "5张花色相同的牌"
  },
  [HandType.FullHouse]: { 
      baseChips: 40, baseMult: 4, levelChips: 25, levelMult: 2,
      label: "Full House", labelZh: "葫芦", description: "Three of a kind + Pair", descriptionZh: "三条 + 对子"
  },
  [HandType.FourOfAKind]: { 
      baseChips: 60, baseMult: 7, levelChips: 30, levelMult: 3,
      label: "Four of a Kind", labelZh: "四条", description: "4 cards of same rank", descriptionZh: "4张点数相同的牌"
  },
  [HandType.StraightFlush]: { 
      baseChips: 100, baseMult: 8, levelChips: 40, levelMult: 4,
      label: "Straight Flush", labelZh: "同花顺", description: "Straight + Flush", descriptionZh: "5张点数连续且花色相同的牌"
  },
  [HandType.RoyalFlush]: { 
      baseChips: 100, baseMult: 8, levelChips: 40, levelMult: 4,
      label: "Royal Flush", labelZh: "皇家同花顺", description: "A, K, Q, J, 10 Flush", descriptionZh: "A, K, Q, J, 10 组成的同花顺"
  },
};

// --- 星球牌池 (Planet Cards) ---
export const PLANET_CARDS: Consumable[] = [
    { id: 'p_pluto', name: 'Pluto', nameZh: '冥王星', description: 'Level up High Card', descriptionZh: '升级 高牌', type: 'Planet', cost: 3, targetHand: HandType.HighCard },
    { id: 'p_mercury', name: 'Mercury', nameZh: '水星', description: 'Level up Pair', descriptionZh: '升级 对子', type: 'Planet', cost: 3, targetHand: HandType.Pair },
    { id: 'p_uranus', name: 'Uranus', nameZh: '天王星', description: 'Level up Two Pair', descriptionZh: '升级 两对', type: 'Planet', cost: 3, targetHand: HandType.TwoPair },
    { id: 'p_venus', name: 'Venus', nameZh: '金星', description: 'Level up Three of a Kind', descriptionZh: '升级 三条', type: 'Planet', cost: 3, targetHand: HandType.ThreeOfAKind },
    { id: 'p_saturn', name: 'Saturn', nameZh: '土星', description: 'Level up Straight', descriptionZh: '升级 顺子', type: 'Planet', cost: 3, targetHand: HandType.Straight },
    { id: 'p_jupiter', name: 'Jupiter', nameZh: '木星', description: 'Level up Flush', descriptionZh: '升级 同花', type: 'Planet', cost: 3, targetHand: HandType.Flush },
    { id: 'p_earth', name: 'Earth', nameZh: '地球', description: 'Level up Full House', descriptionZh: '升级 葫芦', type: 'Planet', cost: 3, targetHand: HandType.FullHouse },
    { id: 'p_mars', name: 'Mars', nameZh: '火星', description: 'Level up Four of a Kind', descriptionZh: '升级 四条', type: 'Planet', cost: 3, targetHand: HandType.FourOfAKind },
    { id: 'p_neptune', name: 'Neptune', nameZh: '海王星', description: 'Level up Straight Flush', descriptionZh: '升级 同花顺', type: 'Planet', cost: 3, targetHand: HandType.StraightFlush },
];

// --- 塔罗牌池 (Tarot Cards) ---
export const TAROT_CARDS: Consumable[] = [
    { id: 't_magician', name: 'The Magician', nameZh: '魔术师', description: 'Enhance 2 cards to Lucky', descriptionZh: '将2张牌增强为幸运牌 (1/5 $20, 1/15 +20倍)', type: 'Tarot', cost: 3, effectId: 'enhance_lucky' },
    { id: 't_empress', name: 'The Empress', nameZh: '皇后', description: 'Enhance 2 cards to Mult (+4 Mult)', descriptionZh: '将2张牌增强为倍率牌 (+4 倍率)', type: 'Tarot', cost: 3, effectId: 'enhance_mult' },
    { id: 't_hierophant', name: 'The Hierophant', nameZh: '教皇', description: 'Enhance 2 cards to Bonus (+30 Chips)', descriptionZh: '将2张牌增强为奖励牌 (+30 筹码)', type: 'Tarot', cost: 3, effectId: 'enhance_bonus' },
    { id: 't_lovers', name: 'The Lovers', nameZh: '恋人', description: 'Enhance 1 card to Wild', descriptionZh: '将1张牌增强为万能牌', type: 'Tarot', cost: 3, effectId: 'enhance_wild' },
    { id: 't_chariot', name: 'The Chariot', nameZh: '战车', description: 'Enhance 1 card to Steel', descriptionZh: '将1张牌增强为钢铁牌 (在手牌时 X1.5倍)', type: 'Tarot', cost: 3, effectId: 'enhance_steel' },
    { id: 't_justice', name: 'Justice', nameZh: '正义', description: 'Enhance 1 card to Glass', descriptionZh: '将1张牌增强为玻璃牌 (X2倍, 1/4碎裂)', type: 'Tarot', cost: 3, effectId: 'enhance_glass' },
    { id: 't_hermit', name: 'The Hermit', nameZh: '隐者', description: 'Double your money (Max $20)', descriptionZh: '金钱翻倍 (最多 $20)', type: 'Tarot', cost: 3, effectId: 'economy_double' },
    { id: 't_tower', name: 'The Tower', nameZh: '塔', description: 'Enhance 1 card to Stone', descriptionZh: '将1张牌增强为石头牌 (+50筹码)', type: 'Tarot', cost: 3, effectId: 'enhance_stone' },
    { id: 't_devil', name: 'The Devil', nameZh: '恶魔', description: 'Enhance 1 card to Gold', descriptionZh: '将1张牌增强为黄金牌 (结算+$3)', type: 'Tarot', cost: 3, effectId: 'enhance_gold' },
];

// --- 小丑牌池 ---
export const AVAILABLE_JOKERS: Joker[] = [
  {
    id: 'j_joker',
    name: 'Joker', nameZh: '小丑',
    description: '+4 Mult', descriptionZh: '+4 倍率',
    rarity: 'Common', cost: 2, type: 'flat_mult', value: 4, edition: null
  },
  {
    id: 'j_greedy',
    name: 'Greedy Joker', nameZh: '贪婪小丑',
    description: '+4 Mult if played card is Diamond', descriptionZh: '打出方块牌时 +4 倍率',
    rarity: 'Common', cost: 4, type: 'flat_mult', value: 4, edition: null,
    trigger: 'played',
    condition: (_, cards) => cards.some(c => c.suit === Suit.Diamonds)
  },
  {
    id: 'j_lusty',
    name: 'Lusty Joker', nameZh: '好色小丑',
    description: '+4 Mult if played card is Heart', descriptionZh: '打出红桃牌时 +4 倍率',
    rarity: 'Common', cost: 4, type: 'flat_mult', value: 4, edition: null,
    trigger: 'played',
    condition: (_, cards) => cards.some(c => c.suit === Suit.Hearts)
  },
  {
    id: 'j_wrathful',
    name: 'Wrathful Joker', nameZh: '暴怒小丑',
    description: '+4 Mult if played card is Spade', descriptionZh: '打出黑桃牌时 +4 倍率',
    rarity: 'Common', cost: 4, type: 'flat_mult', value: 4, edition: null,
    trigger: 'played',
    condition: (_, cards) => cards.some(c => c.suit === Suit.Spades)
  },
  {
    id: 'j_gluttenous',
    name: 'Gluttonous Joker', nameZh: '暴食小丑',
    description: '+4 Mult if played card is Club', descriptionZh: '打出梅花牌时 +4 倍率',
    rarity: 'Common', cost: 4, type: 'flat_mult', value: 4, edition: null,
    trigger: 'played',
    condition: (_, cards) => cards.some(c => c.suit === Suit.Clubs)
  },
  {
    id: 'j_droll',
    name: 'Droll Joker', nameZh: '滑稽小丑',
    description: '+10 Mult if played hand contains a Flush', descriptionZh: '如果打出的牌包含同花，+10 倍率',
    rarity: 'Uncommon', cost: 6, type: 'flat_mult', value: 10, edition: null,
    condition: (handType) => handType === HandType.Flush || handType === HandType.StraightFlush
  },
  {
    id: 'j_half',
    name: 'Half Joker', nameZh: '半个小丑',
    description: '+20 Mult if played hand has 3 or fewer cards', descriptionZh: '如果打出的牌不超过3张，+20 倍率',
    rarity: 'Common', cost: 4, type: 'flat_mult', value: 20, edition: null,
    condition: (_, cards) => cards.length <= 3
  },
  {
    id: 'j_stencil',
    name: 'Joker Stencil', nameZh: '小丑模版',
    description: 'X1.5 Mult for each empty Joker slot', descriptionZh: '每个空的小丑槽位提供 X1.5 倍率',
    rarity: 'Uncommon', cost: 8, type: 'x_mult', value: 1.5, edition: null
  },
  {
    id: 'j_banner',
    name: 'Banner', nameZh: '旗帜',
    description: '+40 Chips for each remaining Discard', descriptionZh: '每次剩余的弃牌机会提供 +40 筹码',
    rarity: 'Common', cost: 5, type: 'flat_chips', value: 40, edition: null
  },
  {
    id: 'j_abstract',
    name: 'Abstract Joker', nameZh: '抽象小丑',
    description: '+3 Mult for each Joker card', descriptionZh: '每张小丑牌提供 +3 倍率',
    rarity: 'Common', cost: 4, type: 'flat_mult', value: 3, edition: null
  },
  {
    id: 'j_bull',
    name: 'Bull', nameZh: '公牛',
    description: '+2 Chips for each $1 you have', descriptionZh: '每拥有 $1 提供 +2 筹码',
    rarity: 'Uncommon', cost: 6, type: 'flat_chips', value: 2, edition: null
  },
  {
    id: 'j_even_steven',
    name: 'Even Steven', nameZh: '偶数史蒂文',
    description: '+4 Mult for each even ranked card played', descriptionZh: '打出的每一张偶数点数牌提供 +4 倍率',
    rarity: 'Common', cost: 4, type: 'flat_mult', value: 4, edition: null,
    trigger: 'played'
  },
  {
    id: 'j_odd_todd',
    name: 'Odd Todd', nameZh: '奇数托德',
    description: '+30 Chips for each odd ranked card played', descriptionZh: '打出的每一张奇数点数牌提供 +30 筹码',
    rarity: 'Common', cost: 4, type: 'flat_chips', value: 30, edition: null,
    trigger: 'played'
  },
  {
    id: 'j_scholar',
    name: 'Scholar', nameZh: '学者',
    description: 'Played Aces give +20 Chips and +4 Mult', descriptionZh: '打出的每张 A 提供 +4 倍率 和 +20 筹码',
    rarity: 'Common', cost: 4, type: 'utility', value: 0, edition: null,
    trigger: 'played'
  },
  {
    id: 'j_gros_michel',
    name: 'Gros Michel', nameZh: '格罗斯·米歇尔',
    description: '+15 Mult. 1 in 4 chance to destroy at end of round', descriptionZh: '+15 倍率，回合结束时有 1/4 几率被摧毁',
    rarity: 'Common', cost: 5, type: 'flat_mult', value: 15, edition: null,
    probability: 4 
  },
  {
    id: 'j_ice_cream',
    name: 'Ice Cream', nameZh: '冰淇淋',
    description: '+100 Chips. -5 Chips for every hand played', descriptionZh: '+100 筹码，每打出一手牌 -5 筹码',
    rarity: 'Uncommon', cost: 5, type: 'flat_chips', value: 100, edition: null
  }
];

// UI 辅助常量
export const SUIT_COLORS = {
  [Suit.Hearts]: 'text-[#FE5F55]',    
  [Suit.Diamonds]: 'text-[#FE5F55]',  
  [Suit.Clubs]: 'text-[#2C3E50]',     
  [Suit.Spades]: 'text-[#2C3E50]',    
};

export const SUIT_ICONS = {
  [Suit.Hearts]: '♥',
  [Suit.Diamonds]: '♦',
  [Suit.Clubs]: '♣',
  [Suit.Spades]: '♠',
};