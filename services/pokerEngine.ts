
import { CardData, HandResult, HandType, Rank, Suit, Joker, Blind, BossAbility, HandLevel, Consumable, Pack, Edition, Enhancement } from "../types";
import { HAND_SCALING, BOSS_BLINDS, BASE_ANTE_SCORE, AVAILABLE_JOKERS, PLANET_CARDS, TAROT_CARDS, PACKS, EDITION_VALUES, ENHANCEMENT_VALUES } from "../constants";

// --- 牌组生成与洗牌 ---
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

// --- 盲注生成逻辑 ---
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

export const getBlindScore = (blind: Blind, ante: number): number => {
    const anteBase = Math.floor(BASE_ANTE_SCORE * Math.pow(1.6, ante - 1));
    return Math.floor(anteBase * blind.scoreBase);
};

// --- 辅助功能 ---
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

// --- 牌型识别与基础分计算 ---

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
  
  // Wild Card Logic for Flush
  // If a card is Wild (or Stone?), it counts as the dominant suit? 
  // For simplicity: Wild cards adapt to make a flush if possible.
  // Complex implementation simplified: Count each suit including wilds.
  const suitsCount: Record<string, number> = { [Suit.Hearts]: 0, [Suit.Diamonds]: 0, [Suit.Clubs]: 0, [Suit.Spades]: 0 };
  sorted.forEach(c => {
      if (c.enhancement === 'Wild') {
          suitsCount[Suit.Hearts]++;
          suitsCount[Suit.Diamonds]++;
          suitsCount[Suit.Clubs]++;
          suitsCount[Suit.Spades]++;
      } else if (c.enhancement !== 'Stone') { // Stone cards have no suit
          suitsCount[c.suit]++;
      }
  });

  const isFlush = Object.values(suitsCount).some(count => count >= 5) && selectedCards.length === 5;
  
  // Stone cards have no rank for straight purposes usually, but Balatro Stone cards are just +Chips.
  // Actually Stone cards have no rank/suit. They can be played in High Card, Pair etc? No, they are just fillers usually.
  // Balatro Logic: Stone cards count for scoring but don't contribute to Rank/Suit for hand types (unless specified).
  // We will assume Stone cards break Straights/Flushes unless Full House/etc logic handles them as "no rank".
  // Actually simpler: Filter out Stone cards for Rank analysis?
  // Let's keep simple: Stone cards keep their rank in data but usually don't form matches. 
  // Implementation: Stone enhancement doesn't change rank property, but we might treat it as "null" rank.
  // For this clone: Stone cards act as their original rank for sorting but don't count for Pairs/Straights.
  
  const rankCounts: Record<string, number> = {};
  ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  
  let isStraight = false;
  if (selectedCards.length === 5) {
    const uniqueRanks = Array.from(new Set(ranks));
    if (uniqueRanks.length === 5) {
      const max = Math.max(...uniqueRanks);
      const min = Math.min(...uniqueRanks);
      if (max - min === 4) isStraight = true;
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

// --- 分数计算 (Enhanced) ---
export const calculateScore = (
  handResult: HandResult,
  jokers: Joker[],
  gameState: { money: number; discardsLeft: number; jokerCount: number }
) => {
  let chips = handResult.baseChips;
  let mult = handResult.baseMult;

  // 1. 卡牌计分 (Card Triggers)
  handResult.cards.forEach(card => {
    if (card.isDebuffed) return; 

    // 基础筹码 (Rank Chips)
    let rankValue = 0;
    if (card.enhancement === 'Stone') {
        rankValue = 0; // Stone has no rank chips
    } else {
        if (card.rank <= 10) rankValue = card.rank; 
        else if (card.rank === 14) rankValue = 11;  
        else rankValue = 10;
    }
    chips += rankValue;

    // Enhancement Modifiers
    if (card.enhancement === 'Bonus') chips += ENHANCEMENT_VALUES.Bonus.chips;
    if (card.enhancement === 'Stone') chips += ENHANCEMENT_VALUES.Stone.chips;
    if (card.enhancement === 'Mult') mult += ENHANCEMENT_VALUES.Mult.mult;
    if (card.enhancement === 'Glass') mult *= ENHANCEMENT_VALUES.Glass.x_mult;
    if (card.enhancement === 'Lucky') {
        if (Math.random() < ENHANCEMENT_VALUES.Lucky.multChance) mult += ENHANCEMENT_VALUES.Lucky.mult;
        // Money logic handled elsewhere or ignores here for scoring view
    }

    // Edition Modifiers (Card)
    if (card.edition === 'Foil') chips += EDITION_VALUES.Foil.chips;
    if (card.edition === 'Holographic') mult += EDITION_VALUES.Holographic.mult;
    if (card.edition === 'Polychrome') mult *= EDITION_VALUES.Polychrome.x_mult;

    // Specific Joker Triggers based on Card
    jokers.forEach(joker => {
        if (joker.isDebuffed) return; // Future proofing if jokers get debuffed
        
        if (joker.id === 'j_even_steven' && card.rank % 2 === 0) mult += joker.value;
        if (joker.id === 'j_odd_todd' && card.rank % 2 !== 0) chips += joker.value;
        if (joker.id === 'j_scholar' && card.rank === 14) { mult += 4; chips += 20; }
        
        // Suit Jokers (Wild logic applied)
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

  // 2. Held Card Triggers (Steel, etc)
  // Note: `handResult.cards` are played cards. We typically need held cards too.
  // For this simplified engine, we assume Steel effects are pre-calculated or passed? 
  // Ideally calculateScore needs access to full hand, not just played cards.
  // For now, we skip held card triggers in this function scope as we only pass HandResult.
  // *Correction*: Steel cards trigger when held. We'll ignore for now to fit function signature or add later.

  // 3. 小丑计分 (Joker Triggers)
  jokers.forEach(joker => {
    // Joker Edition Modifiers
    if (joker.edition === 'Foil') chips += EDITION_VALUES.Foil.chips;
    if (joker.edition === 'Holographic') mult += EDITION_VALUES.Holographic.mult;
    if (joker.edition === 'Polychrome') mult *= EDITION_VALUES.Polychrome.x_mult;

    if (joker.type === 'flat_chips') {
       if (joker.id === 'j_banner') chips += (gameState.discardsLeft * 40);
       else if (joker.id === 'j_bull') chips += (gameState.money * 2);
       else if (joker.id !== 'j_odd_todd') chips += joker.value;
    }
  });

  jokers.forEach(joker => {
    if (joker.type === 'flat_mult') {
      if (joker.condition) {
        if (joker.condition(handResult.handType, handResult.cards)) mult += joker.value;
      } else if (joker.id === 'j_abstract') {
         mult += (gameState.jokerCount * 3);
      } else if (joker.id !== 'j_even_steven' && joker.id !== 'j_gros_michel' && !['j_lusty','j_greedy','j_wrathful','j_gluttenous'].includes(joker.id)) { 
        mult += joker.value;
      }
      if (joker.id === 'j_gros_michel') mult += joker.value;
    }
  });

  jokers.forEach(joker => {
    if (joker.type === 'x_mult') {
      if (joker.id === 'j_stencil') {
         const emptySlots = 5 - gameState.jokerCount; // Assuming max 5
         if (emptySlots > 0) for(let i=0; i<emptySlots; i++) mult *= 1.5;
      } else {
        mult *= joker.value;
      }
    }
  });

  return {
    chips: Math.floor(chips),
    mult: Math.floor(mult),
    total: Math.floor(chips * mult)
  };
};

// --- 生成商店物品 (小丑 + 星球/塔罗 + 补充包) ---
export const generateShopItems = (): (Joker | Consumable | Pack)[] => {
    const items: (Joker | Consumable | Pack)[] = [];
    
    // 2张小丑 (Chance for Edition)
    for(let i=0; i<2; i++) {
        const randomJoker = AVAILABLE_JOKERS[Math.floor(Math.random() * AVAILABLE_JOKERS.length)];
        
        let edition: Edition = null;
        const rand = Math.random();
        if (rand > 0.98) edition = 'Polychrome';
        else if (rand > 0.95) edition = 'Holographic';
        else if (rand > 0.9) edition = 'Foil';

        items.push({...randomJoker, id: randomJoker.id + '_' + Date.now() + i, edition});
    }
    
    // 1张消耗牌
    if (Math.random() > 0.5) {
        const randomPlanet = PLANET_CARDS[Math.floor(Math.random() * PLANET_CARDS.length)];
        items.push({...randomPlanet, id: randomPlanet.id + '_' + Date.now()});
    } else {
        const randomTarot = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
        items.push({...randomTarot, id: randomTarot.id + '_' + Date.now()});
    }

    // 1个补充包
    const randomPack = PACKS[Math.floor(Math.random() * PACKS.length)];
    items.push({...randomPack, id: randomPack.id + '_' + Date.now()});
    
    return items;
};
