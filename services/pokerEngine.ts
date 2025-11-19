
import { CardData, HandResult, HandType, Rank, Suit, Joker, Blind, BossAbility, HandLevel, Consumable, Pack, Edition, Enhancement, ScoreReport } from "../types";
import { HAND_SCALING, BOSS_BLINDS, BASE_ANTE_SCORE, AVAILABLE_JOKERS, PLANET_CARDS, TAROT_CARDS, PACKS, EDITION_VALUES, ENHANCEMENT_VALUES, MAX_JOKERS_DEFAULT } from "../constants";

// --- 牌组生成与洗牌 (Deck Generation & Shuffling) ---
export const createDeck = (): CardData[] => {
  const deck: CardData[] = [];
  const suits = [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades];
  const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 14 = Ace

  let idCounter = Date.now(); 
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(createCard(suit, rank as Rank, `card_${idCounter++}_${rank}_${suit}`));
    }
  }
  
  // Fisher-Yates 洗牌算法
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

// 创建单张卡牌，可选生成版本/增强
export const createCard = (suit: Suit, rank: Rank, id?: string): CardData => {
    return {
        id: id || `card_${Date.now()}_${Math.random()}`,
        suit,
        rank,
        edition: null,
        enhancement: null,
        animationState: 'idle'
    };
};

// --- 盲注生成逻辑 (Blind Generation) ---
export const generateBlinds = (ante: number): Blind[] => {
    const boss = BOSS_BLINDS[Math.floor(Math.random() * BOSS_BLINDS.length)];
    
    const small: Blind = {
        id: `blind_s_${ante}`,
        name: 'Small Blind',
        nameZh: '小盲注',
        type: 'Small',
        scoreBase: 1.0, 
        reward: 3
    };
    
    const big: Blind = {
        id: `blind_b_${ante}`,
        name: 'Big Blind',
        nameZh: '大盲注',
        type: 'Big',
        scoreBase: 1.5, 
        reward: 4
    };

    const bossBlind: Blind = {
        id: `blind_boss_${ante}`,
        name: boss.name,
        nameZh: boss.nameZh,
        type: 'Boss',
        scoreBase: boss.ability === 'The Wall' ? 4 : 2, 
        reward: 5,
        bossAbility: boss.ability
    };

    return [small, big, bossBlind];
};

// 计算当前盲注的目标分数
export const getBlindScore = (blind: Blind, ante: number): number => {
    const anteBase = Math.floor(BASE_ANTE_SCORE * Math.pow(1.6, ante - 1));
    return Math.floor(anteBase * blind.scoreBase);
};

// --- 辅助功能 (Helpers) ---
// 排序手牌
export const sortHand = (hand: CardData[], by: 'RANK' | 'SUIT'): CardData[] => {
    const newHand = [...hand];
    if (by === 'RANK') {
        return newHand.sort((a, b) => b.rank - a.rank);
    } else {
        return newHand.sort((a, b) => {
            if (a.suit === b.suit) {
                return b.rank - a.rank;
            }
            return a.suit.localeCompare(b.suit);
        });
    }
};

// --- 牌型识别 (Hand Evaluation) ---
export const evaluateHand = (selectedCards: CardData[], handLevels: Record<HandType, HandLevel>): HandResult => {
  if (selectedCards.length === 0) {
    return {
      handType: HandType.HighCard,
      baseChips: 0,
      baseMult: 0,
      cards: [],
      level: 1
    };
  }

  const sorted = [...selectedCards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map(c => c.rank);
  
  // 计算花色分布（包含万能牌逻辑）
  const suitsCount: Record<string, number> = { [Suit.Hearts]: 0, [Suit.Diamonds]: 0, [Suit.Clubs]: 0, [Suit.Spades]: 0 };
  sorted.forEach(c => {
      if (c.enhancement === 'Wild') {
          suitsCount[Suit.Hearts]++;
          suitsCount[Suit.Diamonds]++;
          suitsCount[Suit.Clubs]++;
          suitsCount[Suit.Spades]++;
      } else if (c.enhancement !== 'Stone') { // 石头牌不计入花色
          suitsCount[c.suit]++;
      }
  });

  const isFlush = Object.values(suitsCount).some(count => count >= 5) && selectedCards.length === 5;
  
  // 计算点数分布
  const rankCounts: Record<string, number> = {};
  ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  
  // 顺子逻辑
  let isStraight = false;
  if (selectedCards.length === 5) {
    const uniqueRanks = Array.from(new Set(ranks));
    if (uniqueRanks.length === 5) {
      const max = Math.max(...uniqueRanks);
      const min = Math.min(...uniqueRanks);
      if (max - min === 4) isStraight = true;
      // A, 2, 3, 4, 5 特殊情况
      if (uniqueRanks.includes(14) && uniqueRanks.includes(2) && uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
        isStraight = true;
      }
    }
  }

  let handType = HandType.HighCard;
  if (isFlush && isStraight) {
    handType = (ranks.includes(14) && ranks.includes(13)) ? HandType.RoyalFlush : HandType.StraightFlush;
  } else if (counts[0] === 4) {
    handType = HandType.FourOfAKind;
  } else if (counts[0] === 3 && counts[1] >= 2) {
    handType = HandType.FullHouse;
  } else if (isFlush) {
    handType = HandType.Flush;
  } else if (isStraight) {
    handType = HandType.Straight;
  } else if (counts[0] === 3) {
    handType = HandType.ThreeOfAKind;
  } else if (counts[0] === 2 && counts[1] === 2) {
    handType = HandType.TwoPair;
  } else if (counts[0] === 2) {
    handType = HandType.Pair;
  }

  // 获取当前牌型的等级数据
  const levelData = handLevels[handType] || { level: 1, baseChips: HAND_SCALING[handType].baseChips, baseMult: HAND_SCALING[handType].baseMult };

  return {
    handType,
    baseChips: levelData.baseChips,
    baseMult: levelData.baseMult,
    cards: sorted,
    level: levelData.level
  };
};

// --- 核心计分逻辑 (Score Calculation Pipeline) ---
// 返回详细的计分报告，包括总分和副作用（如玻璃牌破碎）
export const calculateScore = (
  handResult: HandResult,
  jokers: Joker[],
  heldCards: CardData[], // 需要传入所有手牌以计算钢铁牌等效果
  gameState: { money: number; discardsLeft: number; jokerCount: number }
): ScoreReport => {
  let chips = handResult.baseChips;
  let mult = handResult.baseMult;
  const destroyedCards: string[] = [];

  // 1. 卡牌计分 (Card Triggers - Scoring Cards)
  handResult.cards.forEach(card => {
    if (card.isDebuffed) return; // 被削弱的牌不触发任何效果

    // A. 基础筹码 (Rank Chips)
    let rankValue = 0;
    if (card.enhancement === 'Stone') {
        rankValue = 0; // 石头牌无基础点数
    } else {
        if (card.rank <= 10) rankValue = card.rank; 
        else if (card.rank === 14) rankValue = 11; // Ace = 11 
        else rankValue = 10; // J, Q, K = 10
    }
    chips += rankValue;

    // B. 增强效果 (Enhancements)
    if (card.enhancement === 'Bonus') chips += ENHANCEMENT_VALUES.Bonus.chips;
    if (card.enhancement === 'Stone') chips += ENHANCEMENT_VALUES.Stone.chips;
    if (card.enhancement === 'Mult') mult += ENHANCEMENT_VALUES.Mult.mult;
    if (card.enhancement === 'Glass') {
        mult *= ENHANCEMENT_VALUES.Glass.x_mult;
        if (Math.random() < ENHANCEMENT_VALUES.Glass.breakChance) {
            destroyedCards.push(card.id);
        }
    }
    if (card.enhancement === 'Lucky') {
        if (Math.random() < ENHANCEMENT_VALUES.Lucky.multChance) mult += ENHANCEMENT_VALUES.Lucky.mult;
        // Lucky 钱的效果通常在结算后增加，这里只处理计分
    }

    // C. 版本效果 (Editions - Card)
    if (card.edition === 'Foil') chips += EDITION_VALUES.Foil.chips;
    if (card.edition === 'Holographic') mult += EDITION_VALUES.Holographic.mult;
    if (card.edition === 'Polychrome') mult *= EDITION_VALUES.Polychrome.x_mult;

    // D. 小丑对单卡的触发 (Specific Joker Triggers)
    jokers.forEach(joker => {
        if (joker.isDebuffed) return;
        
        if (joker.id === 'j_even_steven' && card.rank % 2 === 0) mult += joker.value;
        if (joker.id === 'j_odd_todd' && card.rank % 2 !== 0) chips += joker.value;
        if (joker.id === 'j_scholar' && card.rank === 14) { mult += 4; chips += 20; }
        
        // 花色检测 (兼容万能牌)
        const isHeart = card.suit === Suit.Hearts || card.enhancement === 'Wild';
        const isDiamond = card.suit === Suit.Diamonds || card.enhancement === 'Wild';
        const isSpade = card.suit === Suit.Spades || card.enhancement === 'Wild';
        const isClub = card.suit === Suit.Clubs || card.enhancement === 'Wild';

        if (joker.id === 'j_lusty' && isHeart) mult += joker.value;
        if (joker.id === 'j_greedy' && isDiamond) mult += joker.value;
        if (joker.id === 'j_wrathful' && isSpade) mult += joker.value;
        if (joker.id === 'j_gluttenous' && isClub) mult += joker.value;
    });
  });

  // 2. 手持卡牌效果 (Held Card Triggers)
  // 注意：heldCards 包含所有手牌，我们需要排除掉已经打出的牌 (handResult.cards)
  // 在 App.tsx 中调用时，heldCards 应该是 current hand excluding played selection? 
  // 不，Balatro 中打出的牌不再视为 "held"。
  const playedIds = handResult.cards.map(c => c.id);
  const actualHeldCards = heldCards.filter(c => !playedIds.includes(c.id));

  actualHeldCards.forEach(card => {
      if (card.isDebuffed) return;
      if (card.enhancement === 'Steel') {
          mult *= ENHANCEMENT_VALUES.Steel.x_mult;
      }
      // 其他手持小丑效果 (如 Baron) 可以在此扩展
  });

  // 3. 小丑全局效果 (Global Joker Triggers)
  jokers.forEach(joker => {
    if (joker.isDebuffed) return;

    // Joker 版本加成
    if (joker.edition === 'Foil') chips += EDITION_VALUES.Foil.chips;
    if (joker.edition === 'Holographic') mult += EDITION_VALUES.Holographic.mult;
    if (joker.edition === 'Polychrome') mult *= EDITION_VALUES.Polychrome.x_mult;

    // Flat Chips
    if (joker.type === 'flat_chips') {
       if (joker.id === 'j_banner') chips += (gameState.discardsLeft * 40);
       else if (joker.id === 'j_bull') chips += (gameState.money * 2);
       else if (joker.id !== 'j_odd_todd') chips += joker.value; // Odd Todd 在单卡循环处理
    }
  });

  // Flat Mult
  jokers.forEach(joker => {
    if (joker.isDebuffed) return;
    if (joker.type === 'flat_mult') {
      if (joker.condition) {
        if (joker.condition(handResult.handType, handResult.cards)) mult += joker.value;
      } else if (joker.id === 'j_abstract') {
         mult += (gameState.jokerCount * 3);
      } else if (joker.id !== 'j_even_steven' && joker.id !== 'j_gros_michel' && !['j_lusty','j_greedy','j_wrathful','j_gluttenous'].includes(joker.id)) { 
        // 排除已处理的单卡小丑
        mult += joker.value;
      }
      if (joker.id === 'j_gros_michel') mult += joker.value; // Gros Michel 是全局加成
    }
  });

  // X Mult (最后计算)
  jokers.forEach(joker => {
    if (joker.isDebuffed) return;
    if (joker.type === 'x_mult') {
      if (joker.id === 'j_stencil') {
         const emptySlots = MAX_JOKERS_DEFAULT - gameState.jokerCount; // 简化，未计算负片槽位
         if (emptySlots > 0) for(let i=0; i<emptySlots; i++) mult *= 1.5;
      } else {
        mult *= joker.value;
      }
    }
  });

  return {
    chips: Math.floor(chips),
    mult: Math.floor(mult),
    total: Math.floor(chips * mult),
    destroyedCards
  };
};

// --- 生成商店物品 (Shop Generation) ---
export const generateShopItems = (): (Joker | Consumable | Pack)[] => {
    const items: (Joker | Consumable | Pack)[] = [];
    
    // 1. 生成 2 张小丑牌 (有机会带有版本)
    for(let i=0; i<2; i++) {
        const randomJoker = AVAILABLE_JOKERS[Math.floor(Math.random() * AVAILABLE_JOKERS.length)];
        
        let edition: Edition = null;
        const rand = Math.random();
        if (rand > 0.98) edition = 'Polychrome';
        else if (rand > 0.95) edition = 'Holographic';
        else if (rand > 0.9) edition = 'Foil';
        // Negative 暂不自动生成，太稀有

        items.push({...randomJoker, id: randomJoker.id + '_' + Date.now() + i, edition});
    }
    
    // 2. 生成 1 张消耗牌 (星球或塔罗)
    if (Math.random() > 0.5) {
        const randomPlanet = PLANET_CARDS[Math.floor(Math.random() * PLANET_CARDS.length)];
        items.push({...randomPlanet, id: randomPlanet.id + '_' + Date.now()});
    } else {
        const randomTarot = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
        items.push({...randomTarot, id: randomTarot.id + '_' + Date.now()});
    }

    // 3. 生成 1 个补充包
    const randomPack = PACKS[Math.floor(Math.random() * PACKS.length)];
    items.push({...randomPack, id: randomPack.id + '_' + Date.now()});
    
    return items;
};
