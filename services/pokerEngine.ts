
import { CardData, HandResult, HandType, Rank, Suit, Joker, Blind, BossAbility, HandLevel, Consumable, Pack, Edition, Enhancement, ScoreReport, ScoringEvent } from "../types";
import { HAND_SCALING, BOSS_BLINDS, BASE_ANTE_SCORE, AVAILABLE_JOKERS, PLANET_CARDS, TAROT_CARDS, PACKS, EDITION_VALUES, ENHANCEMENT_VALUES, MAX_JOKERS_DEFAULT } from "../constants";

// --- 牌组生成与洗牌 (Deck Generation & Shuffling) ---
// 创建一副标准的52张扑克牌
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

// 创建单张卡牌，可选生成版本/增强/蜡戳
export const createCard = (suit: Suit, rank: Rank, id?: string): CardData => {
    return {
        id: id || `card_${Date.now()}_${Math.random()}`,
        suit,
        rank,
        edition: null,
        enhancement: null,
        seal: null,
        animationState: 'idle'
    };
};

// --- 盲注生成逻辑 (Blind Generation) ---
// 生成当前底注 (Ante) 的小/大/Boss盲注
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

// 计算当前盲注的目标分数 (Score Scaling)
export const getBlindScore = (blind: Blind, ante: number): number => {
    if (ante < 1) return 100;
    // 简单的指数增长公式
    let anteBase = BASE_ANTE_SCORE;
    if (ante === 1) anteBase = 300;
    else if (ante === 2) anteBase = 800;
    else if (ante === 3) anteBase = 2000;
    else if (ante === 4) anteBase = 5000;
    else if (ante === 5) anteBase = 11000;
    else if (ante === 6) anteBase = 20000;
    else if (ante === 7) anteBase = 35000;
    else if (ante === 8) anteBase = 50000;
    else {
        anteBase = Math.floor(50000 * Math.pow(1.5, ante - 8));
    }
    
    return Math.floor(anteBase * blind.scoreBase);
};

// --- 商店物品生成 (Shop Generation) ---
export const generateShopItems = (): (Joker | Consumable | Pack)[] => {
    const items: (Joker | Consumable | Pack)[] = [];
    
    // 1. Joker (60% 几率)
    if (Math.random() > 0.4) {
        const j = AVAILABLE_JOKERS[Math.floor(Math.random() * AVAILABLE_JOKERS.length)];
        const newJoker = { ...j, id: `shop_j_${Date.now()}_1` };
        
        // 10% 几率出特效
        if (Math.random() > 0.9) {
            const rnd = Math.random();
            if (rnd < 0.5) newJoker.edition = 'Foil';
            else if (rnd < 0.8) newJoker.edition = 'Holographic';
            else if (rnd < 0.95) newJoker.edition = 'Polychrome';
            else newJoker.edition = 'Negative';
            
            // 特效加价
            if (newJoker.edition === 'Foil') newJoker.cost += 2;
            if (newJoker.edition === 'Holographic') newJoker.cost += 3;
            if (newJoker.edition === 'Polychrome') newJoker.cost += 5;
            if (newJoker.edition === 'Negative') newJoker.cost += 10;
        }
        items.push(newJoker);
    }
    
    // 2. 另一张 Joker 或 塔罗牌
    if (Math.random() > 0.5) {
         const j = AVAILABLE_JOKERS[Math.floor(Math.random() * AVAILABLE_JOKERS.length)];
         items.push({ ...j, id: `shop_j_${Date.now()}_2` });
    } else {
         const c = Math.random() > 0.5 
            ? TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)]
            : PLANET_CARDS[Math.floor(Math.random() * PLANET_CARDS.length)];
         items.push({ ...c, id: `shop_c_${Date.now()}_2` });
    }
    
    // 3. 补充包
    const pack = PACKS[Math.floor(Math.random() * PACKS.length)];
    items.push({ ...pack, id: `shop_p_${Date.now()}_3` });

    return items;
};

// --- 辅助功能 (Helpers) ---
// 排序手牌 (按点数或花色)
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
  
  // 计算花色分布（包含万能牌 Wild Card 逻辑）
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

  const isFlush = Object.values(suitsCount).some(count => count >= 5) && selectedCards.length >= 5;
  
  // 计算点数分布
  const rankCounts: Record<string, number> = {};
  ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  
  // 顺子逻辑 (Straight)
  let isStraight = false;
  if (selectedCards.length >= 5) {
    const uniqueRanks = Array.from(new Set(ranks));
    if (uniqueRanks.length >= 5) {
      // 检查是否有连续5个
      for (let i = 0; i <= uniqueRanks.length - 5; i++) {
          const sub = uniqueRanks.slice(i, i + 5);
          if (sub[0] - sub[4] === 4) {
              isStraight = true;
              break;
          }
      }
      // A, 2, 3, 4, 5 特殊情况 (Wheel)
      if (!isStraight) {
          if (uniqueRanks.includes(14) && uniqueRanks.includes(2) && uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
            isStraight = true;
          }
      }
    }
  }

  let handType = HandType.HighCard;
  
  // 牌型判定优先级
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
    cards: sorted, // 排序后的卡牌
    level: levelData.level
  };
};

// --- 核心计分逻辑 (Score Calculation Pipeline) ---
// 返回详细的时间轴事件，而不仅仅是最终数字
export const calculateScore = (
  handResult: HandResult,
  jokers: Joker[],
  allCardsInHand: CardData[], 
  gameState: { money: number; discardsLeft: number; jokerCount: number }
): ScoreReport => {
  
  const timeline: ScoringEvent[] = [];
  
  // 初始数值为牌型基础分
  let currentChips = handResult.baseChips;
  let currentMult = handResult.baseMult;
  const destroyedCards: string[] = [];
  let goldGained = 0;

  // 0. 初始牌型事件 (Base Hand)
  // 前端收到此事件时，应将UI显示置为 baseChips 和 baseMult
  timeline.push({
      type: 'hand_base',
      sourceId: 'base',
      sourceType: 'hand',
      chipsAdded: handResult.baseChips,
      multAdded: handResult.baseMult,
      message: `${handResult.handType}`
  });

  // --- 阶段 1: 打出的卡牌 (Played Cards) ---
  // Balatro 逻辑: 实际上是逐张计算，每张牌都会触发“On Play”类型的 Joker
  
  handResult.cards.forEach(card => {
    if (card.isDebuffed) {
        timeline.push({
             type: 'card_score', sourceId: card.id, sourceType: 'card', message: 'Debuffed!'
        });
        return; 
    }

    // 计算重复触发 (Red Seal)
    const triggers = (card.seal === 'Red') ? 2 : 1;

    for (let i = 0; i < triggers; i++) {
        const isRetrigger = i > 0;
        if (isRetrigger) {
             timeline.push({ type: 'card_retrigger', sourceId: card.id, sourceType: 'card', message: 'Retrigger!', isRetrigger: true });
        }

        // 1.1 基础点数筹码 (Base Chips)
        let rankChips = 0;
        if (card.enhancement === 'Stone') {
            rankChips = ENHANCEMENT_VALUES.Stone.chips; 
            currentChips += rankChips;
            timeline.push({ type: 'card_score', sourceId: card.id, sourceType: 'card', chipsAdded: rankChips, message: `+${rankChips}` });
        } else {
            if (card.rank === 14) rankChips = 11;
            else if (card.rank >= 10) rankChips = 10;
            else rankChips = card.rank;
            
            currentChips += rankChips;
            timeline.push({ type: 'card_score', sourceId: card.id, sourceType: 'card', chipsAdded: rankChips, message: `+${rankChips}` });
        }

        // 1.2 增强效果 (Enhancements)
        if (card.enhancement === 'Bonus') {
            currentChips += 30;
            timeline.push({ type: 'card_score', sourceId: card.id, sourceType: 'card', chipsAdded: 30, message: '+30' });
        }
        if (card.enhancement === 'Mult') {
            currentMult += 4;
            timeline.push({ type: 'card_score', sourceId: card.id, sourceType: 'card', multAdded: 4, message: '+4 Mult' });
        }
        if (card.enhancement === 'Glass') {
            currentMult *= 2;
            timeline.push({ type: 'card_score', sourceId: card.id, sourceType: 'card', x_mult: 2, message: 'X2 Mult' });
            // 玻璃破碎逻辑
            if (Math.random() < (ENHANCEMENT_VALUES.Glass.breakChance || 0.25)) {
                 destroyedCards.push(card.id);
                 timeline.push({ type: 'glass_break', sourceId: card.id, sourceType: 'card', message: 'Shattered!' });
            }
        }
        if (card.enhancement === 'Gold') {
            goldGained += 3;
            timeline.push({ type: 'card_score', sourceId: card.id, sourceType: 'card', message: '+$3' });
        }

        // 1.3 版本效果 (Editions)
        if (card.edition === 'Foil') {
            currentChips += 50;
            timeline.push({ type: 'card_edition', sourceId: card.id, sourceType: 'card', chipsAdded: 50, message: '+50' });
        }
        if (card.edition === 'Holographic') {
            currentMult += 10;
            timeline.push({ type: 'card_edition', sourceId: card.id, sourceType: 'card', multAdded: 10, message: '+10 Mult' });
        }
        if (card.edition === 'Polychrome') {
            currentMult *= 1.5;
            timeline.push({ type: 'card_edition', sourceId: card.id, sourceType: 'card', x_mult: 1.5, message: 'X1.5 Mult' });
        }

        // 1.4 针对“打出卡牌时”触发的小丑 (Card Played Jokers)
        // 注意：这些 Joker 会在每张卡触发时触发
        jokers.forEach(joker => {
            if (joker.triggerType === 'card_played' && !joker.isDebuffed) {
                const conditionMet = joker.condition ? joker.condition(handResult.handType, [card], {chips: currentChips, mult: currentMult}) : true;
                if (conditionMet) {
                     if (joker.type === 'flat_mult') {
                         currentMult += joker.value;
                         timeline.push({ type: 'joker_trigger', sourceId: joker.id, sourceType: 'joker', multAdded: joker.value, message: `+${joker.value} Mult` });
                     }
                     if (joker.type === 'flat_chips') {
                         currentChips += joker.value;
                         timeline.push({ type: 'joker_trigger', sourceId: joker.id, sourceType: 'joker', chipsAdded: joker.value, message: `+${joker.value}` });
                     }
                     if (joker.type === 'utility' && joker.id === 'j_scholar' && card.rank === 14) {
                         currentChips += 20;
                         currentMult += 4;
                         timeline.push({ type: 'joker_trigger', sourceId: joker.id, sourceType: 'joker', chipsAdded: 20, multAdded: 4, message: '+20/+4' });
                     }
                }
            }
        });
    } 
  });

  // --- 阶段 2: 手持卡牌效果 (Held Cards) ---
  // 钢铁牌等在手中触发
  const heldCards = allCardsInHand.filter(c => !handResult.cards.find(pc => pc.id === c.id)); 
  heldCards.forEach(card => {
      if (card.isDebuffed) return;
      if (card.enhancement === 'Steel') {
          currentMult *= 1.5;
          timeline.push({ type: 'held_trigger', sourceId: card.id, sourceType: 'card', x_mult: 1.5, message: 'X1.5 Mult' });
      }
      // 红蜡戳在手牌中对钢铁牌也生效
      if (card.seal === 'Red' && card.enhancement === 'Steel') {
          currentMult *= 1.5;
          timeline.push({ type: 'card_retrigger', sourceId: card.id, sourceType: 'card', message: 'Retrigger!', isRetrigger: true });
          timeline.push({ type: 'held_trigger', sourceId: card.id, sourceType: 'card', x_mult: 1.5, message: 'X1.5 Mult' });
      }
  });

  // --- 阶段 3: 小丑结算阶段 (Joker Phase) ---
  // 严格按照从左到右的顺序触发
  // 在 Balatro 中，Joker 的 Ability 和 Edition (如 Polychrome) 是该 Joker 结算的一部分
  // 因此如果一个 Joker 是 Poly，它会在该 Joker 被计算时触发 x1.5，这会影响后续 Joker 的计算基数 (如果是加法)
  // 但通常 Poly (乘法) 和 +Mult (加法) 的顺序至关重要。
  // 这里的逻辑是：遍历每个 Joker，先触发它的 Ability (如果它是 Independent 类型)，然后触发它的 Edition
  
  jokers.forEach(joker => {
      if (joker.isDebuffed) return;

      // 3.1 触发独立效果 (Ability)
      if (joker.triggerType === 'independent') {
          let triggered = false;
          let msg = '';
          
          // 检查条件
          if (joker.condition && !joker.condition(handResult.handType, handResult.cards, {chips: currentChips, mult: currentMult})) {
              // 条件未满足，跳过 Ability，但 Edition 可能仍会触发 (视具体规则而定，但在 Balatro 中 Edition 通常是 Joker 实体带的被动)
              // 修正：如果 Joker 没触发，Edition 通常依然生效 (例如 +Mult Joker 没满足条件，但它是 Poly，Poly 依然 x1.5)
          } else {
              // 计算数值
              let val = joker.value;
              if (joker.id === 'j_bull') val = gameState.money * 2;
              if (joker.id === 'j_banner') val = gameState.discardsLeft * 40;
              if (joker.id === 'j_abstract') val = gameState.jokerCount * 3;
              
              // 小丑模版 (Stencil) 是 xMult
              if (joker.id === 'j_stencil') {
                 const emptySlots = MAX_JOKERS_DEFAULT - jokers.length;
                 if (emptySlots > 0) {
                     // 模版通常是一次性 x (1.5^empty) 还是多次 x1.5? 
                     // 原版是一次性显示 xN，但这里为了动画效果，可以循环
                     for(let i=0; i<emptySlots; i++) {
                         currentMult *= 1.5;
                         timeline.push({ type: 'joker_trigger', sourceId: joker.id, sourceType: 'joker', x_mult: 1.5, message: 'X1.5 Mult' });
                     }
                     // Stencil 特殊处理完毕，不走下面的通用逻辑
                 }
              } else {
                  if (joker.type === 'flat_mult') {
                      currentMult += val;
                      triggered = true; msg = `+${val} Mult`;
                  } else if (joker.type === 'flat_chips') {
                      currentChips += val;
                      triggered = true; msg = `+${val}`;
                  } else if (joker.type === 'x_mult') {
                      currentMult *= val;
                      triggered = true; msg = `X${val} Mult`;
                  }

                  if (triggered) {
                      timeline.push({ type: 'joker_trigger', sourceId: joker.id, sourceType: 'joker', chipsAdded: joker.type==='flat_chips'?val:0, multAdded: joker.type==='flat_mult'?val:0, x_mult: joker.type==='x_mult'?val:0, message: msg });
                  }
              }
          }
      }

      // 3.2 触发版本效果 (Edition)
      // 紧随 Ability 之后触发，确保 Left-to-Right 顺序对乘法的影响是正确的
      if (joker.edition) {
          if (joker.edition === 'Foil') {
              currentChips += 50;
              timeline.push({ type: 'joker_trigger', sourceId: joker.id, sourceType: 'joker', chipsAdded: 50, message: '+50' });
          } else if (joker.edition === 'Holographic') {
              currentMult += 10;
              timeline.push({ type: 'joker_trigger', sourceId: joker.id, sourceType: 'joker', multAdded: 10, message: '+10 Mult' });
          } else if (joker.edition === 'Polychrome') {
              currentMult *= 1.5;
              timeline.push({ type: 'joker_trigger', sourceId: joker.id, sourceType: 'joker', x_mult: 1.5, message: 'X1.5 Mult' });
          }
      }
  });

  const total = Math.floor(currentChips) * Math.floor(currentMult);

  return {
      chips: Math.floor(currentChips),
      mult: Math.floor(currentMult),
      total: total,
      timeline,
      destroyedCards,
      goldGained
  };
};
