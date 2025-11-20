
import { HandType, Joker, Rank, Suit, Blind, BossAbility, Consumable, HandLevel, Tag, Voucher, Pack } from "./types";

// --- 游戏基础常量 (Game Constants) ---
export const STARTING_HAND_SIZE = 8; // 初始手牌上限
export const MAX_HAND_SIZE = 8;      // 最大手牌上限 (UI限制)
export const STARTING_HANDS = 4;     // 初始出牌次数
export const STARTING_DISCARDS = 3;  // 初始弃牌次数
export const STARTING_MONEY = 4;     // 初始金钱
export const BASE_ANTE_SCORE = 300;  // 底注1的基础分
export const MAX_JOKERS_DEFAULT = 5; // 默认小丑槽位
export const MAX_CONSUMABLES = 2;    // 消耗牌槽位
export const BASE_REROLL_COST = 5;   // 基础刷新价格

// --- 经济系统常量 (Economy) ---
export const BASE_INTEREST_CAP = 5;  // 基础利息上限 (每$5得$1, 最多得$5)
export const INTEREST_RATE = 5;      // 利率 ($5 -> $1)

// --- 版本与增强数值 (Editions & Enhancements) ---
// 定义了卡牌不同版本的数值加成
export const EDITION_VALUES = {
    Foil: { chips: 50, mult: 0, x_mult: 1 },       // 箔金: +50 筹码
    Holographic: { chips: 0, mult: 10, x_mult: 1 },// 镭射: +10 倍率
    Polychrome: { chips: 0, mult: 0, x_mult: 1.5 },// 多彩: X1.5 倍率
    Negative: { chips: 0, mult: 0, x_mult: 1, extraSlot: 1 }, // 底片: +1 小丑槽
};

// 定义了卡牌增强功能的数值加成
export const ENHANCEMENT_VALUES = {
    Bonus: { chips: 30, mult: 0 },                 // 奖励牌
    Mult: { chips: 0, mult: 4 },                   // 倍率牌
    Glass: { x_mult: 2, breakChance: 0.25 },       // 玻璃牌 (X2, 1/4碎裂)
    Steel: { x_mult: 1.5 },                        // 钢铁牌 (手持 X1.5)
    Stone: { chips: 50 },                          // 石头牌
    Gold: { money: 3 },                            // 黄金牌 (结算+$3)
    Lucky: { moneyChance: 0.2, money: 20, multChance: 0.2, mult: 20 } // 幸运牌
};

// --- 补充包定义 (Booster Packs) ---
export const PACKS: Pack[] = [
    { id: 'p_arcana_normal', rawId: 'p_arcana_normal', type: 'Arcana', cost: 4, size: 3, choices: 1 },
    { id: 'p_celestial_normal', rawId: 'p_celestial_normal', type: 'Celestial', cost: 4, size: 3, choices: 1 },
    { id: 'p_standard_normal', rawId: 'p_standard_normal', type: 'Standard', cost: 4, size: 3, choices: 1 },
    { id: 'p_buffoon_normal', rawId: 'p_buffoon_normal', type: 'Buffoon', cost: 6, size: 2, choices: 1 },
];

// --- 盲注定义 (Blinds) ---
// 基本定义在 generateBlinds 中处理，这里仅保留 Boss 定义引用
export const BOSS_BLINDS: Array<{ nameKey: string; ability: BossAbility }> = [
    { nameKey: 'blind_name_The_Wall', ability: 'The Wall' },
    { nameKey: 'blind_name_The_Club', ability: 'The Club' },
    { nameKey: 'blind_name_The_Goad', ability: 'The Goad' },
    { nameKey: 'blind_name_The_Window', ability: 'The Window' },
    { nameKey: 'blind_name_The_Head', ability: 'The Head' },
];

// --- 标签池 (Tags) ---
export const TAGS: Tag[] = [
    { id: 'tag_uncommon', rawId: 'tag_uncommon', type: 'shop', bgClass: 'bg-green-600' },
    { id: 'tag_rare', rawId: 'tag_rare', type: 'shop', bgClass: 'bg-red-600' },
    { id: 'tag_coupon', rawId: 'tag_coupon', type: 'economy', bgClass: 'bg-teal-600' },
    { id: 'tag_investment', rawId: 'tag_investment', type: 'economy', bgClass: 'bg-gray-600' },
    { id: 'tag_speed', rawId: 'tag_speed', type: 'economy', bgClass: 'bg-blue-600' },
];

// --- 优惠券池 (Vouchers) ---
export const VOUCHERS: Voucher[] = [
    { id: 'v_overstock', rawId: 'v_overstock', cost: 10, effectId: 'overstock' },
    { id: 'v_clearance', rawId: 'v_clearance', cost: 10, effectId: 'clearance' },
    { id: 'v_hone', rawId: 'v_hone', cost: 10, effectId: 'hone' },
    { id: 'v_grabber', rawId: 'v_grabber', cost: 10, effectId: 'grabber' },
    { id: 'v_wasteful', rawId: 'v_wasteful', cost: 10, effectId: 'wasteful' },
    { id: 'v_seed', rawId: 'v_seed', cost: 10, effectId: 'seed_money' },
];


// --- 牌型基础数值与升级规则 (Hand Scaling) ---
// label 和 description 移至 i18n，使用 key
export const HAND_SCALING: Record<HandType, { baseChips: number; baseMult: number; levelChips: number; levelMult: number; nameKey: string }> = {
  [HandType.HighCard]: { 
      baseChips: 5, baseMult: 1, levelChips: 10, levelMult: 1, nameKey: 'hand_High_Card'
  },
  [HandType.Pair]: { 
      baseChips: 10, baseMult: 2, levelChips: 15, levelMult: 1, nameKey: 'hand_Pair'
  },
  [HandType.TwoPair]: { 
      baseChips: 20, baseMult: 2, levelChips: 20, levelMult: 1, nameKey: 'hand_Two_Pair'
  },
  [HandType.ThreeOfAKind]: { 
      baseChips: 30, baseMult: 3, levelChips: 20, levelMult: 2, nameKey: 'hand_Three_of_a_Kind'
  },
  [HandType.Straight]: { 
      baseChips: 30, baseMult: 4, levelChips: 30, levelMult: 3, nameKey: 'hand_Straight'
  },
  [HandType.Flush]: { 
      baseChips: 35, baseMult: 4, levelChips: 15, levelMult: 2, nameKey: 'hand_Flush'
  },
  [HandType.FullHouse]: { 
      baseChips: 40, baseMult: 4, levelChips: 25, levelMult: 2, nameKey: 'hand_Full_House'
  },
  [HandType.FourOfAKind]: { 
      baseChips: 60, baseMult: 7, levelChips: 30, levelMult: 3, nameKey: 'hand_Four_of_a_Kind'
  },
  [HandType.StraightFlush]: { 
      baseChips: 100, baseMult: 8, levelChips: 40, levelMult: 4, nameKey: 'hand_Straight_Flush'
  },
  [HandType.RoyalFlush]: { 
      baseChips: 100, baseMult: 8, levelChips: 40, levelMult: 4, nameKey: 'hand_Royal_Flush'
  },
};

// --- 星球牌池 (Planet Cards) ---
export const PLANET_CARDS: Consumable[] = [
    { id: 'p_pluto', rawId: 'p_pluto', type: 'Planet', cost: 3, targetHand: HandType.HighCard },
    { id: 'p_mercury', rawId: 'p_mercury', type: 'Planet', cost: 3, targetHand: HandType.Pair },
    { id: 'p_uranus', rawId: 'p_uranus', type: 'Planet', cost: 3, targetHand: HandType.TwoPair },
    { id: 'p_venus', rawId: 'p_venus', type: 'Planet', cost: 3, targetHand: HandType.ThreeOfAKind },
    { id: 'p_saturn', rawId: 'p_saturn', type: 'Planet', cost: 3, targetHand: HandType.Straight },
    { id: 'p_jupiter', rawId: 'p_jupiter', type: 'Planet', cost: 3, targetHand: HandType.Flush },
    { id: 'p_earth', rawId: 'p_earth', type: 'Planet', cost: 3, targetHand: HandType.FullHouse },
    { id: 'p_mars', rawId: 'p_mars', type: 'Planet', cost: 3, targetHand: HandType.FourOfAKind },
    { id: 'p_neptune', rawId: 'p_neptune', type: 'Planet', cost: 3, targetHand: HandType.StraightFlush },
];

// --- 塔罗牌池 (Tarot Cards) ---
export const TAROT_CARDS: Consumable[] = [
    { id: 't_magician', rawId: 't_magician', type: 'Tarot', cost: 3, effectId: 'enhance_lucky' },
    { id: 't_empress', rawId: 't_empress', type: 'Tarot', cost: 3, effectId: 'enhance_mult' },
    { id: 't_hierophant', rawId: 't_hierophant', type: 'Tarot', cost: 3, effectId: 'enhance_bonus' },
    { id: 't_lovers', rawId: 't_lovers', type: 'Tarot', cost: 3, effectId: 'enhance_wild' },
    { id: 't_chariot', rawId: 't_chariot', type: 'Tarot', cost: 3, effectId: 'enhance_steel' },
    { id: 't_justice', rawId: 't_justice', type: 'Tarot', cost: 3, effectId: 'enhance_glass' },
    { id: 't_hermit', rawId: 't_hermit', type: 'Tarot', cost: 3, effectId: 'economy_double' },
    { id: 't_tower', rawId: 't_tower', type: 'Tarot', cost: 3, effectId: 'enhance_stone' },
    { id: 't_devil', rawId: 't_devil', type: 'Tarot', cost: 3, effectId: 'enhance_gold' },
];

// --- 小丑牌池 (Joker Pool) ---
export const AVAILABLE_JOKERS: Joker[] = [
  {
    id: 'j_joker', rawId: 'j_joker',
    rarity: 'Common', cost: 2, type: 'flat_mult', value: 4, edition: null
  },
  {
    id: 'j_greedy', rawId: 'j_greedy',
    rarity: 'Common', cost: 4, type: 'flat_mult', value: 4, edition: null,
    triggerType: 'card_played',
    condition: (_, cards) => cards.some(c => c.suit === Suit.Diamonds)
  },
  {
    id: 'j_lusty', rawId: 'j_lusty',
    rarity: 'Common', cost: 4, type: 'flat_mult', value: 4, edition: null,
    triggerType: 'card_played',
    condition: (_, cards) => cards.some(c => c.suit === Suit.Hearts)
  },
  {
    id: 'j_wrathful', rawId: 'j_wrathful',
    rarity: 'Common', cost: 4, type: 'flat_mult', value: 4, edition: null,
    triggerType: 'card_played',
    condition: (_, cards) => cards.some(c => c.suit === Suit.Spades)
  },
  {
    id: 'j_gluttenous', rawId: 'j_gluttenous',
    rarity: 'Common', cost: 4, type: 'flat_mult', value: 4, edition: null,
    triggerType: 'card_played',
    condition: (_, cards) => cards.some(c => c.suit === Suit.Clubs)
  },
  {
    id: 'j_droll', rawId: 'j_droll',
    rarity: 'Uncommon', cost: 6, type: 'flat_mult', value: 10, edition: null,
    triggerType: 'independent',
    condition: (handType) => handType === HandType.Flush || handType === HandType.StraightFlush
  },
  {
    id: 'j_half', rawId: 'j_half',
    rarity: 'Common', cost: 4, type: 'flat_mult', value: 20, edition: null,
    triggerType: 'independent',
    condition: (_, cards) => cards.length <= 3
  },
  {
    id: 'j_stencil', rawId: 'j_stencil',
    rarity: 'Uncommon', cost: 8, type: 'x_mult', value: 1.5, edition: null,
    triggerType: 'independent'
  },
  {
    id: 'j_banner', rawId: 'j_banner',
    rarity: 'Common', cost: 5, type: 'flat_chips', value: 40, edition: null,
    triggerType: 'independent'
  },
  {
    id: 'j_abstract', rawId: 'j_abstract',
    rarity: 'Common', cost: 4, type: 'flat_mult', value: 3, edition: null,
    triggerType: 'independent'
  },
  {
    id: 'j_bull', rawId: 'j_bull',
    rarity: 'Uncommon', cost: 6, type: 'flat_chips', value: 2, edition: null,
    triggerType: 'independent'
  },
  {
    id: 'j_even_steven', rawId: 'j_even_steven',
    rarity: 'Common', cost: 4, type: 'flat_mult', value: 4, edition: null,
    triggerType: 'card_played' 
  },
  {
    id: 'j_odd_todd', rawId: 'j_odd_todd',
    rarity: 'Common', cost: 4, type: 'flat_chips', value: 30, edition: null,
    triggerType: 'card_played'
  },
  {
    id: 'j_scholar', rawId: 'j_scholar',
    rarity: 'Common', cost: 4, type: 'utility', value: 0, edition: null,
    triggerType: 'card_played'
  },
  {
    id: 'j_gros_michel', rawId: 'j_gros_michel',
    rarity: 'Common', cost: 5, type: 'flat_mult', value: 15, edition: null,
    probability: 4,
    triggerType: 'independent'
  },
  {
    id: 'j_ice_cream', rawId: 'j_ice_cream',
    rarity: 'Uncommon', cost: 5, type: 'flat_chips', value: 100, edition: null,
    triggerType: 'independent'
  }
];

// --- UI 辅助常量 ---
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
