
// --- 枚举定义 (Enums) ---

// 花色枚举
export enum Suit {
  Hearts = 'Hearts',     // 红桃
  Diamonds = 'Diamonds', // 方块
  Clubs = 'Clubs',       // 梅花
  Spades = 'Spades'      // 黑桃
}

// 点数枚举 (2-14, 14代表A)
export enum Rank {
  Two = 2, Three = 3, Four = 4, Five = 5, Six = 6, Seven = 7, Eight = 8,
  Nine = 9, Ten = 10, Jack = 11, Queen = 12, King = 13, Ace = 14
}

// 版本 (Editions) - 视觉和数值特效
export type Edition = 'Foil' | 'Holographic' | 'Polychrome' | 'Negative' | null;

// 增强 (Enhancements) - 改变卡牌功能
export type Enhancement = 'Bonus' | 'Mult' | 'Wild' | 'Glass' | 'Steel' | 'Stone' | 'Gold' | 'Lucky' | null;

// 蜡戳 (Seals)
export type Seal = 'Red' | 'Blue' | 'Gold' | 'Purple' | null;

// 单张卡牌的数据结构
export interface CardData {
  id: string;           // 唯一标识符
  suit: Suit;           // 花色
  rank: Rank;           // 点数
  
  edition: Edition;     // 版本
  enhancement: Enhancement; // 增强
  seal: Seal;           // 蜡戳
  
  isDebuffed?: boolean; // 是否被削弱 (Boss 盲注效果)
  isFaceDown?: boolean; // 是否背面朝上 (The Mark Boss效果)
  
  // 前端动画状态机
  animationState?: 'idle' | 'dealing' | 'scoring' | 'discarding' | 'destroyed'; 
  animationDelay?: number; // 动画延迟
}

// 小丑牌 (Joker) 定义
export interface Joker {
  id: string;
  rawId: string; 
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Legendary'; 
  cost: number;         
  
  edition: Edition;     

  type: 'flat_mult' | 'flat_chips' | 'x_mult' | 'money_gen' | 'utility'; 
  value: number;        
  
  triggerType?: 'card_played' | 'independent' | 'held' | 'discard';
  
  condition?: (handType: HandType, playedCards: CardData[], scoringState?: { chips: number, mult: number }) => boolean;
  
  probability?: number; 
  isDebuffed?: boolean;
}

// 消耗牌 (Consumable) 定义
export interface Consumable {
    id: string;
    rawId: string;
    type: 'Planet' | 'Tarot';
    cost: number;
    targetHand?: HandType; 
    effectId?: string; 
}

// 补充包 (Booster Pack) 定义
export interface Pack {
    id: string;
    rawId: string;
    type: 'Arcana' | 'Celestial' | 'Standard' | 'Buffoon' | 'Spectral';
    cost: number;
    size: number;    
    choices: number; 
}

// 标签 (Tag)
export interface Tag {
    id: string;
    rawId: string;
    type: 'economy' | 'shop' | 'utility';
    bgClass?: string;
}

// 优惠券 (Voucher)
export interface Voucher {
    id: string;
    rawId: string;
    cost: number;
    effectId: string; 
}

// 牌型枚举
export enum HandType {
  HighCard = 'High Card',
  Pair = 'Pair',
  TwoPair = 'Two Pair',
  ThreeOfAKind = 'Three of a Kind',
  Straight = 'Straight',
  Flush = 'Flush',
  FullHouse = 'Full House',
  FourOfAKind = 'Four of a Kind',
  StraightFlush = 'Straight Flush',
  RoyalFlush = 'Royal Flush'
}

// 牌型等级数据
export interface HandLevel {
    level: number;
    baseChips: number;
    baseMult: number;
}

// 手牌结算结果
export interface HandResult {
  handType: HandType;   
  baseChips: number;    
  baseMult: number;     
  cards: CardData[];    
  level: number;        
}

// 计分事件类型
export type ScoringEventType = 
    | 'hand_base'       
    | 'card_score'      
    | 'card_edition'    
    | 'card_retrigger'  
    | 'held_trigger'    
    | 'joker_trigger'   
    | 'glass_break'     
    | 'multiplier_update'
    | 'boss_effect'; // 新增 Boss 效果事件

export interface ScoringEvent {
    type: ScoringEventType;
    sourceId: string;   
    sourceType: 'card' | 'joker' | 'hand' | 'boss';
    
    chipsAdded?: number; 
    multAdded?: number;  
    x_mult?: number;     
    
    message?: string;    
    isRetrigger?: boolean; 
}

// 计分报告
export interface ScoreReport {
    chips: number;
    mult: number;
    total: number;
    timeline: ScoringEvent[]; 
    destroyedCards: string[]; 
    goldGained: number;       
    moneyLoss: number; // The Tooth Boss 效果
}

// 游戏设置
export interface GameSettings {
  volume: number;       
  bgmVolume: number;    
  enableCrt: boolean;   
  enableMotion: boolean;
  sortBy: 'RANK' | 'SUIT'; 
  language: 'ZH' | 'EN';   
}

// Boss 能力枚举 (完整版)
export type BossAbility = 
  | 'The Wall' 
  | 'The Club' 
  | 'The Goad' 
  | 'The Window' 
  | 'The Head' 
  | 'The Needle' 
  | 'The Water' 
  | 'The Manacle' 
  | 'The Plant' 
  | 'The Eye'     // 无重复牌型
  | 'The Mouth'   // 只能打出一种牌型
  | 'The Serpent' // 弃牌/出牌后抽3张
  | 'The Pillar'  // 本局打过的牌 debuff (未完全实现逻辑，暂留)
  | 'The Psychic' // 必须打5张
  | 'The Tooth'   // 每打一张 -$1
  | 'The Mark'    // 人头牌背面朝上
  | 'The Flint'   // 基础筹码倍率减半
  | 'The Arm'     // 降低牌型等级
  | 'The Ox'      // 归零金钱
  | 'None';

// 盲注定义
export interface Blind {
  id: string;
  nameKey: string;
  type: 'Small' | 'Big' | 'Boss'; 
  scoreBase: number;    
  reward: number;       
  bossAbility?: BossAbility; 
}

// 结算清单项
export interface CashOutItem {
    label: string;
    amount: number;
}

export interface CashOutReport {
    items: CashOutItem[];
    total: number;
    currentStep: number; 
}

// 选择状态
export interface SelectionState {
    mode: 'TAROT' | 'PACK';
    maxSelect: number; 
    sourceItemId?: string; 
    generatedCards?: (CardData | Joker | Consumable)[]; 
    callbackId?: string; 
}

// 触发状态
export interface TriggerState {
    id: string;           
    text: string;         
    type: 'chips' | 'mult' | 'x_mult' | 'other';
}

// 全局游戏状态
export interface GameState {
  deck: CardData[];       
  hand: CardData[];       
  discardPile: CardData[];
  selectedCardIds: string[]; 
  
  money: number;          
  round: number;          
  ante: number;           
  
  currentBlind: Blind | null; 
  upcomingBlinds: Blind[];    
  
  handsLeft: number;      
  discardsLeft: number;   
  
  currentScore: number;   
  targetScore: number;    
  roundScore: number;     
  
  jokers: Joker[];        
  consumables: Consumable[]; 
  
  handLevels: Record<HandType, HandLevel>; 
  
  shopItems: (Joker | Consumable | Pack)[]; 
  shopVoucher: Voucher | null;          
  rerollCost: number; 
  
  activeTags: Tag[];                    
  redeemedVouchers: string[];           
  
  // 状态追踪 (Boss 机制需要)
  playedHandTypes: HandType[]; // 本轮已打出的牌型 (The Eye, The Mouth)
  
  status: 'MENU' | 'BLIND_SELECT' | 'PLAYING' | 'SCORING' | 'VICTORY' | 'CASHOUT' | 'SHOP' | 'GAME_OVER' | 'PACK_OPEN';
  
  cashOutReport?: CashOutReport; 
  selectionState?: SelectionState; 
  
  triggerState?: TriggerState | null; 
  activeCardId?: string | null;      
  
  settings: GameSettings; 
}
