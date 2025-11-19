
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

// 单张卡牌的数据结构
export interface CardData {
  id: string;           // 唯一标识符
  suit: Suit;           // 花色
  rank: Rank;           // 点数
  
  edition: Edition;     // 版本 (Foil/Holo/Poly)
  enhancement: Enhancement; // 增强 (Bonus/Mult/Wild/Glass/Steel...)
  
  chipsBonus?: number;  // 额外筹码加成 (Legacy field, mostly replaced by enhancement logic)
  multBonus?: number;   // 额外倍率加成
  
  isDebuffed?: boolean; // 是否被削弱 (Boss 盲注效果)
  
  // 前端动画状态机
  animationState?: 'idle' | 'dealing' | 'scoring' | 'discarding'; 
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
  
  trigger?: 'played' | 'held' | 'discard'; 
  
  condition?: (handType: HandType, playedCards: CardData[]) => boolean;
  
  probability?: number; 

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

// 补充包 (Booster Pack)
export interface Pack {
    id: string;
    name: string;
    nameZh: string;
    type: 'Arcana' | 'Celestial' | 'Standard' | 'Buffoon' | 'Spectral';
    cost: number;
    size: number; // 包里有几张卡
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
    maxSelect: number;
    sourceItemId?: string; // 塔罗牌ID 或 Pack ID
    generatedCards?: (CardData | Joker | Consumable)[]; // Pack 开出的卡
    callbackId?: string; // 效果ID
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
  
  status: 'MENU' | 'BLIND_SELECT' | 'PLAYING' | 'SCORING' | 'VICTORY' | 'CASHOUT' | 'SHOP' | 'GAME_OVER' | 'PACK_OPEN';
  
  cashOutReport?: CashOutReport; 
  selectionState?: SelectionState; // 当前选择状态 (如正在使用塔罗牌或开包)
  
  settings: GameSettings; 
}