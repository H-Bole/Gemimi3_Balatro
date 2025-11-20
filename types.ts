
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

// 蜡戳 (Seals) - 额外特效
// Red: 重新触发1次; Blue: 最后一手打出握在手中生成行星; Gold: 打出给$3; Purple: 弃掉生成塔罗
export type Seal = 'Red' | 'Blue' | 'Gold' | 'Purple' | null;

// 单张卡牌的数据结构
export interface CardData {
  id: string;           // 唯一标识符
  suit: Suit;           // 花色
  rank: Rank;           // 点数
  
  edition: Edition;     // 版本 (Foil/Holo/Poly)
  enhancement: Enhancement; // 增强 (Bonus/Mult/Wild/Glass/Steel...)
  seal: Seal;           // 蜡戳 (Seal)
  
  isDebuffed?: boolean; // 是否被削弱 (Boss 盲注效果)
  
  // 前端动画状态机
  animationState?: 'idle' | 'dealing' | 'scoring' | 'discarding' | 'destroyed'; 
  animationDelay?: number; // 动画延迟
}

// 小丑牌 (Joker) 定义
export interface Joker {
  id: string;
  name: string;         
  nameZh: string;       
  description: string;  
  descriptionZh: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Legendary'; 
  cost: number;         
  
  edition: Edition;     // Joker 也可以有版本

  type: 'flat_mult' | 'flat_chips' | 'x_mult' | 'money_gen' | 'utility'; 
  value: number;        
  
  // 触发类型：是“打出每张牌时”触发，还是“整手牌”触发
  triggerType?: 'card_played' | 'independent' | 'held' | 'discard';
  
  // 触发条件回调
  condition?: (handType: HandType, playedCards: CardData[], scoringState?: { chips: number, mult: number }) => boolean;
  
  probability?: number; // 触发概率 (如 1/4 损坏)

  isDebuffed?: boolean;
}

// 消耗牌 (Consumable) 定义
export interface Consumable {
    id: string;
    name: string;
    nameZh: string;
    description: string;
    descriptionZh: string;
    type: 'Planet' | 'Tarot';
    cost: number;
    
    targetHand?: HandType; // 星球牌专用
    
    effectId?: string; // 塔罗牌效果ID
}

// 补充包 (Booster Pack) 定义
export interface Pack {
    id: string;
    name: string;
    nameZh: string;
    type: 'Arcana' | 'Celestial' | 'Standard' | 'Buffoon' | 'Spectral';
    cost: number;
    size: number;    // 包里有几张卡
    choices: number; // 可以选几张
    description: string;
    descriptionZh: string;
}

// 标签 (Tag)
export interface Tag {
    id: string;
    name: string;
    nameZh: string;
    description: string;
    descriptionZh: string;
    type: 'economy' | 'shop' | 'utility';
    bgClass?: string;
}

// 优惠券 (Voucher)
export interface Voucher {
    id: string;
    name: string;
    nameZh: string;
    description: string;
    descriptionZh: string;
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

// --- 计分事件系统 (Scoring Event System) ---
// 用于前端逐步播放动画，而不是瞬间显示结果
export type ScoringEventType = 
    | 'hand_base'       // 基础牌型分
    | 'card_score'      // 卡牌计分 (筹码/倍率)
    | 'card_edition'    // 卡牌版本效果 (Holo/Poly等)
    | 'card_retrigger'  // 蜡戳/效果导致的重触发
    | 'held_trigger'    // 手持卡触发 (钢铁)
    | 'joker_trigger'   // 小丑触发
    | 'glass_break'     // 玻璃牌破碎
    | 'multiplier_update'; // 单纯更新倍率显示

export interface ScoringEvent {
    type: ScoringEventType;
    sourceId: string;   // 触发来源ID (Card ID 或 Joker ID)
    sourceType: 'card' | 'joker' | 'hand';
    
    chipsAdded?: number; // 增加的筹码
    multAdded?: number;  // 增加的倍率
    x_mult?: number;     // 乘以的倍率
    
    message?: string;    // 浮动文字内容 (如 "+4 Mult", "X1.5 Mult")
    isRetrigger?: boolean; 
}

// 计分报告结构体 (包含完整的时间轴)
export interface ScoreReport {
    chips: number;
    mult: number;
    total: number;
    timeline: ScoringEvent[]; // 动画时间轴
    destroyedCards: string[]; // 被摧毁的卡牌ID
    goldGained: number;       // 获得的金钱
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

// 盲注 (关卡) 定义
export interface Blind {
  id: string;
  name: string;
  nameZh: string;
  type: 'Small' | 'Big' | 'Boss'; 
  scoreBase: number;    
  reward: number;       
  bossAbility?: BossAbility; 
}

export type BossAbility = 'The Wall' | 'The Club' | 'The Goad' | 'The Window' | 'The Head' | 'None';

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

// 卡牌选择模式 (用于塔罗牌/补充包)
export interface SelectionState {
    mode: 'TAROT' | 'PACK';
    maxSelect: number; // 塔罗牌需要选几张，或包能拿几张
    sourceItemId?: string; // 来源ID
    generatedCards?: (CardData | Joker | Consumable)[]; // Pack 开出的卡
    callbackId?: string; // 效果ID (如 enhance_gold)
}

// 触发反馈状态 (用于 UI 显示触发动画)
export interface TriggerState {
    id: string;           // 触发的卡牌/Joker ID
    text: string;         // 显示的文字 (e.g., "+10")
    type: 'chips' | 'mult' | 'x_mult' | 'other';
}

// 全局游戏状态 (State Machine)
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
  
  shopItems: (Joker | Consumable | Pack)[]; // 商店物品 (混合)
  shopVoucher: Voucher | null;          
  rerollCost: number; // 当前重随价格
  
  activeTags: Tag[];                    
  redeemedVouchers: string[];           
  
  // 游戏流程状态
  status: 'MENU' | 'BLIND_SELECT' | 'PLAYING' | 'SCORING' | 'VICTORY' | 'CASHOUT' | 'SHOP' | 'GAME_OVER' | 'PACK_OPEN';
  
  cashOutReport?: CashOutReport; 
  selectionState?: SelectionState; 
  
  triggerState?: TriggerState | null; // 当前正在播放的触发动画 (Popups)
  activeCardId?: string | null;      // 当前正在计分的卡牌/Joker ID (高亮光圈)
  
  settings: GameSettings; 
}
