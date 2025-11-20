
import React, { useState, useEffect } from 'react';
import { CardComponent } from './components/CardComponent';
import { JokerComponent } from './components/JokerComponent';
import { ConsumableComponent } from './components/ConsumableComponent';
import { SettingsModal } from './components/SettingsModal';
import { RunInfoModal } from './components/RunInfoModal';
import { ScoreDisplay } from './components/ScoreDisplay';
import { MainMenu } from './components/MainMenu';
import { GameState, CardData, HandResult, GameSettings, Joker, Blind, CashOutItem, Voucher, Pack, Enhancement, ScoreReport, Consumable } from './types';
import { AVAILABLE_JOKERS, HAND_SCALING, MAX_HAND_SIZE, STARTING_DISCARDS, STARTING_HANDS, STARTING_HAND_SIZE, STARTING_MONEY, BOSS_BLINDS, MAX_JOKERS_DEFAULT, MAX_CONSUMABLES, TAGS, VOUCHERS, BASE_REROLL_COST, TAROT_CARDS, PLANET_CARDS, PACKS, BASE_INTEREST_CAP, INTEREST_RATE } from './constants';
import { createDeck, evaluateHand, calculateScore, sortHand, generateBlinds, getBlindScore, generateShopItems } from './services/pokerEngine';
import { audio } from './services/audio';
import { t } from './i18n';

// 默认设置
const DEFAULT_SETTINGS: GameSettings = {
    volume: 0.5,
    bgmVolume: 0.4,
    enableCrt: true,
    enableMotion: true,
    sortBy: 'RANK',
    language: 'ZH',
};

// 初始牌型等级
const INITIAL_HAND_LEVELS: Record<string, any> = Object.keys(HAND_SCALING).reduce((acc, key) => {
    const k = key as any;
    acc[k] = { level: 1, baseChips: HAND_SCALING[k].baseChips, baseMult: HAND_SCALING[k].baseMult };
    return acc;
}, {} as any);

const INITIAL_STATE: GameState = {
  deck: [],
  hand: [],
  discardPile: [],
  selectedCardIds: [],
  money: STARTING_MONEY,
  round: 1,
  ante: 1,              
  currentBlind: null,
  upcomingBlinds: [],   
  handsLeft: STARTING_HANDS,
  discardsLeft: STARTING_DISCARDS,
  currentScore: 0,
  targetScore: 300,
  roundScore: 0,
  jokers: [],
  consumables: [],      
  handLevels: INITIAL_HAND_LEVELS, 
  status: 'MENU',
  shopItems: [],
  shopVoucher: null,
  rerollCost: BASE_REROLL_COST,
  activeTags: [],
  redeemedVouchers: [],
  settings: DEFAULT_SETTINGS,
  activeCardId: null
};

export default function App() {
  const [game, setGame] = useState<GameState>(INITIAL_STATE);
  const [animating, setAnimating] = useState(false);
  const [handPreview, setHandPreview] = useState<HandResult | null>(null);
  
  // 实时计分状态 (用于 ScoreDisplay 中间显示)
  // 注意：这里显示的是“当前这一手”的分数，不是总分
  const [liveScore, setLiveScore] = useState({ chips: 0, mult: 0, total: 0 });
  
  // 显示用的总分 (用于左侧进度条滚动动画)
  const [displayRoundScore, setDisplayRoundScore] = useState(0);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showRunInfo, setShowRunInfo] = useState(false);

  // --- 音频同步 (Audio Sync) ---
  useEffect(() => {
     audio.setVolume(game.settings.volume);
     audio.setMusicVolume(game.settings.bgmVolume);
  }, [game.settings.volume, game.settings.bgmVolume]);

  useEffect(() => {
      if (game.status === 'BLIND_SELECT' || game.status === 'SHOP' || game.status === 'PLAYING') {
          audio.startBGM();
      }
  }, [game.status]);

  // --- 滚动分数特效 (Score Rolling FX) ---
  useEffect(() => {
    if (game.status !== 'PLAYING' && game.status !== 'VICTORY' && game.status !== 'CASHOUT' && game.status !== 'SCORING') {
        return; 
    }
    
    // 平滑滚动到当前实际分数
    if (displayRoundScore !== game.currentScore) {
        const diff = game.currentScore - displayRoundScore;
        if (Math.abs(diff) < 1) {
             setDisplayRoundScore(game.currentScore);
             return;
        }
        
        // 动态步长，距离越远滚得越快
        const step = Math.ceil(diff / 15); 
        
        let frameId: number;
        const animate = () => {
            setDisplayRoundScore(prev => {
                // 如果状态改变了 (例如重置游戏)，立即停止
                if (game.status === 'SHOP' || game.status === 'GAME_OVER') return 0;
                
                const next = prev + step;
                // 防止超调
                if ((step > 0 && next >= game.currentScore) || (step < 0 && next <= game.currentScore)) {
                     return game.currentScore;
                }
                if (Math.random() > 0.6) audio.playScoreTick(); 
                return next;
            });
            
            if (Math.abs(game.currentScore - displayRoundScore) > Math.abs(step)) {
                frameId = requestAnimationFrame(animate);
            }
        };
        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }
  }, [game.currentScore, displayRoundScore, game.status]);
  
  // 当进入新的一轮时，确保显示分数重置
  useEffect(() => {
      if (game.status === 'BLIND_SELECT' || game.status === 'SHOP') {
          setDisplayRoundScore(0);
      }
  }, [game.status]);

  // --- 结算动画 (Cash Out Animation) ---
  useEffect(() => {
      if (game.status === 'CASHOUT' && game.cashOutReport) {
          const { items, currentStep } = game.cashOutReport;
          if (currentStep < items.length) {
              const item = items[currentStep];
              const duration = Math.min(1000, item.amount * 150 + 500); 
              let coinsPlayed = 0;
              const coinInterval = setInterval(() => {
                  if (coinsPlayed < item.amount) {
                      audio.playCoin();
                      setGame(prev => ({ ...prev, money: prev.money + 1 }));
                      coinsPlayed++;
                  } else {
                      clearInterval(coinInterval);
                  }
              }, 100);
              const timer = setTimeout(() => {
                  clearInterval(coinInterval);
                  setGame(prev => ({
                      ...prev,
                      cashOutReport: { ...prev.cashOutReport!, currentStep: currentStep + 1 }
                  }));
              }, duration);
              return () => { clearTimeout(timer); clearInterval(coinInterval); };
          }
      }
  }, [game.status, game.cashOutReport?.currentStep]);

  // --- 发牌动画辅助 (Dealing Animation Helper) ---
  const dealCards = (cards: CardData[], startIndex = 0) => {
      return cards.map((c, i) => ({
          ...c,
          animationState: 'dealing' as const,
          animationDelay: (i + startIndex) * 50 
      }));
  };

  useEffect(() => {
      if (game.status === 'PLAYING') {
         const hasAnimating = game.hand.some(c => c.animationState === 'dealing');
         if (hasAnimating) {
             const timer = setTimeout(() => {
                 setGame(prev => ({ ...prev, hand: prev.hand.map(c => ({ ...c, animationState: 'idle' })) }));
             }, 1000); 
             return () => clearTimeout(timer);
         }
      }
  }, [game.hand, game.status]);

  // --- 游戏流程控制 (Game Flow Control) ---

  // 开始新游戏
  const startGame = () => {
    audio.playClick();
    audio.startBGM();
    const blinds = generateBlinds(1);
    setGame({
      ...INITIAL_STATE,
      status: 'BLIND_SELECT',
      upcomingBlinds: blinds,
      settings: game.settings
    });
    setDisplayRoundScore(0);
  };

  // 跳过盲注 (Skip Blind)
  const skipBlind = (blind: Blind) => {
      audio.playClick();
      const randomTag = TAGS[Math.floor(Math.random() * TAGS.length)];
      const newTag = { ...randomTag, id: randomTag.id + Date.now() };
      setGame(prev => {
          let newMoney = prev.money;
          // 部分Tag直接给钱
          if (newTag.id.includes('tag_speed')) newMoney += 5;
          if (newTag.id.includes('tag_investment')) newMoney += 15;
          return {
              ...prev,
              activeTags: [...prev.activeTags, newTag],
              money: newMoney,
              currentBlind: blind
          };
      });
      setTimeout(() => {
          audio.playScoreTotal();
          openShop(true);
      }, 500);
  };

  // 选择盲注并开始回合
  const selectBlind = (blind: Blind) => {
      audio.playClick();
      const newDeck = createDeck();
      
      // 计算手牌上限
      let handSize = STARTING_HAND_SIZE;
      if (game.redeemedVouchers.includes('v_grabber')) handSize += 1; 

      let initialHand = newDeck.slice(0, handSize);
      const remainingDeck = newDeck.slice(handSize);

      if (blind.type === 'Boss' && blind.bossAbility) {
          initialHand = applyBossDebuffs(initialHand, blind.bossAbility);
      }
      const target = getBlindScore(blind, game.ante);
      
      let discards = STARTING_DISCARDS;
      if (game.redeemedVouchers.includes('v_wasteful')) discards += 1;
      
      let handsCount = STARTING_HANDS;
      if (game.redeemedVouchers.includes('v_grabber')) handsCount += 1;

      setGame(prev => ({
          ...prev,
          status: 'PLAYING',
          currentBlind: blind,
          targetScore: target,
          deck: remainingDeck,
          hand: dealCards(sortHand(initialHand, prev.settings.sortBy)),
          discardPile: [],
          selectedCardIds: [], 
          handsLeft: handsCount,
          discardsLeft: discards,
          currentScore: 0, // 新的盲注开始，累计分数归零
          roundScore: 0
      }));
      setTimeout(() => audio.playShuffle(), 100);
  };

  const applyBossDebuffs = (cards: CardData[], ability: string): CardData[] => {
      return cards.map(c => {
          let isDebuffed = false;
          if (ability === 'The Club' && c.suit === 'Clubs') isDebuffed = true;
          if (ability === 'The Goad' && c.suit === 'Spades') isDebuffed = true;
          if (ability === 'The Window' && c.suit === 'Diamonds') isDebuffed = true;
          if (ability === 'The Head' && c.suit === 'Hearts') isDebuffed = true;
          return { ...c, isDebuffed };
      });
  };

  // --- 交互逻辑 (Interaction Logic) ---

  useEffect(() => {
    if (game.status !== 'PLAYING') return;
    const selectedCards = game.hand.filter(c => game.selectedCardIds.includes(c.id));
    // 预览分数 (此时只显示基础分，因为 Joker 效果可能很复杂)
    const result = evaluateHand(selectedCards, game.handLevels);
    setHandPreview(result);
  }, [game.selectedCardIds, game.hand, game.status, game.handLevels]);

  const toggleCard = (id: string) => {
    audio.playCardSelect();
    
    // 塔罗牌选择模式
    if (game.selectionState && game.selectionState.mode === 'TAROT') {
        setGame(prev => {
            const currentSelected = prev.selectedCardIds;
            const isSelected = currentSelected.includes(id);
            let newSelected = [];
            if (isSelected) {
                newSelected = currentSelected.filter(cid => cid !== id);
            } else {
                if (currentSelected.length >= prev.selectionState!.maxSelect) return prev;
                newSelected = [...currentSelected, id];
            }
            return { ...prev, selectedCardIds: newSelected };
        });
        return;
    }

    // 正常游戏选择
    if (game.status === 'PLAYING' && !animating) {
        setGame(prev => {
          const isSelected = prev.selectedCardIds.includes(id);
          let newSelected = [];
          if (isSelected) {
            newSelected = prev.selectedCardIds.filter(cid => cid !== id);
          } else {
            if (prev.selectedCardIds.length >= 5) return prev; 
            newSelected = [...prev.selectedCardIds, id];
          }
          return { ...prev, selectedCardIds: newSelected };
        });
    }
  };

  const handleCardDrop = (dragIndex: number, dropIndex: number) => {
      if (animating) return;
      setGame(prev => {
          const newHand = [...prev.hand];
          const [movedCard] = newHand.splice(dragIndex, 1);
          newHand.splice(dropIndex, 0, movedCard);
          audio.playCardSelect();
          return { ...prev, hand: newHand };
      });
  };

  const handleJokerDrop = (dragIndex: number, dropIndex: number) => {
      setGame(prev => {
          const newJokers = [...prev.jokers];
          const [movedJoker] = newJokers.splice(dragIndex, 1);
          newJokers.splice(dropIndex, 0, movedJoker);
          audio.playCardSelect(); 
          return { ...prev, jokers: newJokers };
      });
  };

  const toggleSort = () => {
      audio.playClick();
      setGame(prev => {
          const newMode = prev.settings.sortBy === 'RANK' ? 'SUIT' : 'RANK';
          return {
              ...prev,
              settings: { ...prev.settings, sortBy: newMode },
              hand: sortHand(prev.hand, newMode)
          };
      });
  };

  const discardHand = () => {
    if (game.discardsLeft <= 0 || game.selectedCardIds.length === 0 || animating) {
        audio.playError();
        return;
    }
    audio.playClick();
    setAnimating(true);
    setGame(prev => ({
        ...prev,
        hand: prev.hand.map(c => prev.selectedCardIds.includes(c.id) ? { ...c, animationState: 'discarding' } : c)
    }));
    setTimeout(() => {
      audio.playShuffle();
      setGame(prev => {
        const discarded = prev.hand.filter(c => prev.selectedCardIds.includes(c.id));
        const kept = prev.hand.filter(c => !prev.selectedCardIds.includes(c.id));
        let drawnCards: CardData[] = [];
        let remainingDeck = [...prev.deck];
        let handSize = MAX_HAND_SIZE;
        
        const needToDraw = handSize - kept.length;
        if (needToDraw > 0) {
            drawnCards = remainingDeck.slice(0, needToDraw);
            remainingDeck = remainingDeck.slice(needToDraw);
            if (prev.currentBlind?.type === 'Boss' && prev.currentBlind.bossAbility) {
                drawnCards = applyBossDebuffs(drawnCards, prev.currentBlind.bossAbility);
            }
        }
        const animatedDrawn = dealCards(drawnCards);
        const newHand = sortHand([...kept, ...animatedDrawn], prev.settings.sortBy);
        return {
          ...prev,
          hand: newHand,
          discardPile: [...prev.discardPile, ...discarded],
          deck: remainingDeck,
          selectedCardIds: [],
          discardsLeft: prev.discardsLeft - 1
        };
      });
      setAnimating(false);
    }, 600); 
  };

  // --- 异步计分序列引擎 (Async Scoring Engine) ---
  // 这是游戏中最核心的动画逻辑，负责将 pokerEngine 生成的时间轴可视化
  const runScoringSequence = async (scoreReport: ScoreReport) => {
      audio.resetPitch();
      
      let currentChips = 0;
      let currentMult = 0;
      
      for (const event of scoreReport.timeline) {
          // 0. 设置初始值 (Base Hand)
          if (event.type === 'hand_base') {
              currentChips = event.chipsAdded || 0;
              currentMult = event.multAdded || 0;
              setLiveScore({ chips: currentChips, mult: currentMult, total: 0 });
              await new Promise(r => setTimeout(r, 500));
              continue;
          }

          // 1. 激活来源 (高亮 Card 或 Joker)
          if (event.sourceId && event.sourceId !== 'base') {
              setGame(prev => ({ ...prev, activeCardId: event.sourceId }));
              await new Promise(r => setTimeout(r, 150));
          }

          // 2. 触发视觉弹出 (Popup) 和 音效
          if (event.message && event.sourceId !== 'base') {
              const localizedMsg = t(game.settings.language, event.message) || event.message;
              setGame(prev => ({
                  ...prev,
                  triggerState: {
                      id: event.sourceId,
                      text: localizedMsg,
                      type: event.x_mult ? 'x_mult' : event.multAdded ? 'mult' : 'chips'
                  }
              }));

              if (event.x_mult) {
                 audio.playBlip('fire');
                 audio.incrementPitch();
              } else if (event.multAdded) {
                 audio.playBlip('mult');
                 audio.incrementPitch();
              } else if (event.chipsAdded) {
                 audio.playBlip('chips');
                 audio.incrementPitch();
              } else if (event.type === 'glass_break') {
                 audio.playError();
              }
          }

          // 3. 执行数值累加
          if (event.chipsAdded) currentChips += event.chipsAdded;
          if (event.multAdded) currentMult += event.multAdded;
          if (event.x_mult) currentMult *= event.x_mult;
          
          // 4. 更新 UI 显示 (单手分数)
          setLiveScore({
              chips: Math.floor(currentChips),
              mult: Math.floor(currentMult),
              total: 0 
          });

          // 5. 动态停顿节奏 (根据事件权重)
          let delayMs = 350; 
          if (event.x_mult) delayMs = 600;
          if (event.isRetrigger) delayMs = 250;
          if (event.type === 'joker_trigger') delayMs = 450; 
          
          await new Promise(r => setTimeout(r, delayMs));

          // 6. 清除高亮
          setGame(prev => ({ ...prev, activeCardId: null }));
      }
      
      // 7. 所有事件结束，显示这一手的总分
      const handTotal = scoreReport.total;
      audio.playScoreTotal();
      setLiveScore(prev => ({ ...prev, total: handTotal }));
      
      await new Promise(r => setTimeout(r, 1500));
      
      return true;
  };

  const playHand = async () => {
    if (game.handsLeft <= 0 || game.selectedCardIds.length === 0 || animating || !handPreview) {
        audio.playError();
        return;
    }
    setAnimating(true);
    audio.playClick();
    
    setGame(prev => ({
        ...prev,
        hand: prev.hand.map(c => prev.selectedCardIds.includes(c.id) ? { ...c, animationState: 'scoring' } : c)
    }));
    
    const selectedCards = game.hand.filter(c => game.selectedCardIds.includes(c.id));
    
    // 1. 评估牌型 (Hand Type Evaluation)
    const result = evaluateHand(selectedCards, game.handLevels);
    
    // 2. 计算计分时间轴 (Scoring Pipeline)
    const scoreCalc = calculateScore(result, game.jokers, game.hand, { 
        money: game.money, 
        discardsLeft: game.discardsLeft, 
        jokerCount: game.jokers.length 
    });

    // 3. 进入计分视图
    setGame(prev => ({ ...prev, status: 'SCORING' }));

    // 4. 播放计分动画
    await runScoringSequence(scoreCalc);

    // 5. 结算逻辑
    setGame(prev => {
        // --- 核心修复: 累加当前总分 ---
        const newTotalScore = prev.currentScore + scoreCalc.total;
        const gainedMoney = scoreCalc.goldGained;
        
        const brokenIds = scoreCalc.destroyedCards;
        const playedIds = prev.selectedCardIds;
        let kept = prev.hand.filter(c => !playedIds.includes(c.id));
        const playedCards = prev.hand.filter(c => playedIds.includes(c.id));
        
        // 只有没碎的牌才进入弃牌堆
        const cardsToDiscard = playedCards.filter(c => !brokenIds.includes(c.id));
        
        // 抽牌逻辑
        let drawnCards: CardData[] = [];
        let remainingDeck = [...prev.deck];
        let handSize = MAX_HAND_SIZE;
        
        const needToDraw = handSize - kept.length;
        if (needToDraw > 0) {
            drawnCards = remainingDeck.slice(0, needToDraw);
            remainingDeck = remainingDeck.slice(needToDraw);
            if (prev.currentBlind?.type === 'Boss' && prev.currentBlind.bossAbility) {
                drawnCards = applyBossDebuffs(drawnCards, prev.currentBlind.bossAbility);
            }
        }
        const animatedDrawn = dealCards(drawnCards);
        const newHand = sortHand([...kept, ...animatedDrawn], prev.settings.sortBy);
        
        // Joker 销毁逻辑 (香蕉/冰淇淋)
        let newJokers = [...prev.jokers];
        newJokers = newJokers.map(j => j.rawId === 'j_ice_cream' ? { ...j, value: Math.max(0, j.value - 5) } : j);
        const hasGrosMichel = newJokers.find(j => j.rawId === 'j_gros_michel');
        if (hasGrosMichel && Math.random() < (1 / (hasGrosMichel.probability || 4))) {
             newJokers = newJokers.filter(j => j.rawId !== 'j_gros_michel'); 
        }
        
        // 胜负判定
        const isWinReached = newTotalScore >= prev.targetScore;
        const isLoss = !isWinReached && prev.handsLeft - 1 <= 0;

        const cleanState = { 
             ...prev, 
             triggerState: null,
             activeCardId: null,
             money: prev.money + gainedMoney, 
             currentScore: newTotalScore, // 更新累积分数
             roundScore: scoreCalc.total, // 记录最后一次手牌分数(可选)
             hand: newHand,
             jokers: newJokers,
             discardPile: [...prev.discardPile, ...cardsToDiscard],
             deck: remainingDeck,
             selectedCardIds: [],
             handsLeft: prev.handsLeft - 1,
             status: 'PLAYING' as const
        };

        if (isLoss) {
             return { ...cleanState, status: 'GAME_OVER' };
        }
        
        // 即使赢了，也继续停留在 PLAYING 状态，但 UI 会显示 "结束回合" 按钮
        return cleanState;
    });
    
    setAnimating(false);
    setLiveScore({ chips: 0, mult: 0, total: 0 }); // 清空计分板

    // 如果本轮分够了，且出牌机会用完了，强制结束
    // 如果分够了，还有出牌机会，玩家可以选择继续出牌或者结束
    setGame(prev => {
        if (prev.currentScore >= prev.targetScore && prev.handsLeft <= 0) {
            // 强制结束
            setTimeout(() => startCashOutSequence(), 500);
            return prev;
        }
        return prev;
    });
  };

  const startCashOutSequence = () => {
      setGame(prev => {
          const items: CashOutItem[] = [];
          let total = 0;
          
          if (prev.handsLeft > 0) {
              items.push({ label: 'hands_left', amount: prev.handsLeft });
              total += prev.handsLeft;
          }
          
          let interestCap = BASE_INTEREST_CAP;
          if (prev.redeemedVouchers.includes('v_seed')) interestCap = 10;

          const interest = Math.min(interestCap, Math.floor(prev.money / INTEREST_RATE));
          
          if (interest > 0) {
              items.push({ label: 'interest', amount: interest });
              total += interest;
          }
          
          const reward = prev.currentBlind?.reward || 3;
          items.push({ label: 'blind_reward', amount: reward });
          total += reward;
          
          let goldMoney = 0;
          prev.hand.forEach(c => {
              if (c.enhancement === 'Gold') goldMoney += 3;
          });
          if (goldMoney > 0) {
              items.push({ label: 'gold_cards', amount: goldMoney });
              total += goldMoney;
          }

          return {
              ...prev,
              status: 'CASHOUT',
              cashOutReport: { items, total, currentStep: 0 }
          }
      });
  };

  const openShop = (skipped = false) => {
      audio.playScoreTotal();
      setGame(prev => {
          let shopItems = generateShopItems();
          
          const couponTagIdx = prev.activeTags.findIndex(t => t.rawId.includes('tag_coupon'));
          if (couponTagIdx !== -1) {
              shopItems = shopItems.map(i => ({ ...i, cost: 0 }));
              const newTags = [...prev.activeTags];
              newTags.splice(couponTagIdx, 1);
              prev.activeTags = newTags;
          }
          
          const randomVoucher = VOUCHERS[Math.floor(Math.random() * VOUCHERS.length)];
          const voucher = { ...randomVoucher, id: randomVoucher.id + Date.now() };
          
          return {
              ...prev,
              status: 'SHOP',
              shopItems: shopItems,
              shopVoucher: voucher,
              currentScore: 0, // 进入商店时重置分数
              selectedCardIds: [], 
              deck: [], 
              hand: [], 
              discardPile: [],
              cashOutReport: undefined,
              rerollCost: BASE_REROLL_COST
          };
      });
      setDisplayRoundScore(0);
  };

  const rerollShop = () => {
      if (game.money < game.rerollCost) {
          audio.playError();
          return;
      }
      audio.playClick();
      setGame(prev => ({
          ...prev,
          money: prev.money - prev.rerollCost,
          shopItems: generateShopItems(),
          rerollCost: prev.rerollCost + 1 
      }));
  };

  const finishShop = () => {
      audio.playClick();
      setGame(prev => {
          let nextUpcoming = [...prev.upcomingBlinds];
          let nextAnte = prev.ante;
          // 移除当前已完成的盲注
          if (prev.currentBlind) nextUpcoming = nextUpcoming.filter(b => b.id !== prev.currentBlind?.id);
          
          // 如果当前 Ante 的盲注打完了，生成下一轮
          if (nextUpcoming.length === 0) {
              nextAnte += 1;
              nextUpcoming = generateBlinds(nextAnte);
          }
          return {
              ...prev,
              status: 'BLIND_SELECT',
              ante: nextAnte,
              upcomingBlinds: nextUpcoming,
              currentBlind: null
          };
      });
      setDisplayRoundScore(0);
  };

  const buyItem = (item: Joker | Consumable | Voucher | Pack) => {
      if (game.money >= item.cost) {
          audio.playClick();
          
          if ('effectId' in item && !('type' in item)) { 
             const v = item as Voucher;
             setGame(prev => ({
                  ...prev,
                  money: prev.money - v.cost,
                  redeemedVouchers: [...prev.redeemedVouchers, v.rawId], // Store raw ID for logic check
                  shopVoucher: null
             }));
             return;
          }

          if ('rarity' in item) {
              let maxJokers = MAX_JOKERS_DEFAULT;
              game.jokers.forEach(j => { if (j.edition === 'Negative') maxJokers++; });
              
              if (game.jokers.length < maxJokers) {
                  setGame(prev => ({
                      ...prev,
                      money: prev.money - item.cost,
                      jokers: [...prev.jokers, item as Joker],
                      shopItems: prev.shopItems.filter(i => i.id !== item.id)
                  }));
              } else {
                  audio.playError();
              }
          } 
          else if ('size' in item) {
             openPack(item as Pack);
             setGame(prev => ({
                 ...prev,
                 money: prev.money - item.cost,
                 shopItems: prev.shopItems.filter(i => i.id !== item.id)
             }));
          } 
          else {
              if (game.consumables.length < MAX_CONSUMABLES) {
                  setGame(prev => ({
                      ...prev,
                      money: prev.money - item.cost,
                      consumables: [...prev.consumables, item as Consumable],
                      shopItems: prev.shopItems.filter(i => i.id !== item.id)
                  }));
              } else {
                  audio.playError();
              }
          }
      } else {
          audio.playError();
      }
  };

  const openPack = (pack: Pack) => {
      let generatedCards: (Joker | Consumable | CardData)[] = [];
      
      if (pack.type === 'Standard') {
          const deck = createDeck();
          for(let i=0; i<pack.size; i++) {
              let card = deck[Math.floor(Math.random() * deck.length)];
              if (Math.random() > 0.7) {
                  const enh = ['Bonus', 'Mult', 'Wild', 'Glass', 'Steel', 'Stone', 'Gold', 'Lucky'][Math.floor(Math.random()*8)];
                  card.enhancement = enh as Enhancement;
              }
              if (Math.random() > 0.9) {
                  card.edition = Math.random() > 0.5 ? 'Foil' : 'Holographic';
              }
              generatedCards.push({...card, id: `pack_card_${Date.now()}_${i}`});
          }
      } else if (pack.type === 'Arcana') {
          for(let i=0; i<pack.size; i++) {
              const t = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
              generatedCards.push({...t, id: `pack_tarot_${Date.now()}_${i}`});
          }
      } else if (pack.type === 'Celestial') {
          for(let i=0; i<pack.size; i++) {
              const p = PLANET_CARDS[Math.floor(Math.random() * PLANET_CARDS.length)];
              generatedCards.push({...p, id: `pack_planet_${Date.now()}_${i}`});
          }
      } else if (pack.type === 'Buffoon') {
          for(let i=0; i<pack.size; i++) {
              const j = AVAILABLE_JOKERS[Math.floor(Math.random() * AVAILABLE_JOKERS.length)];
              generatedCards.push({...j, id: `pack_joker_${Date.now()}_${i}`});
          }
      }

      setGame(prev => ({
          ...prev,
          status: 'PACK_OPEN',
          selectionState: {
              mode: 'PACK',
              maxSelect: 1,
              generatedCards: generatedCards,
              sourceItemId: pack.id
          }
      }));
  };

  const selectPackCard = (idx: number) => {
      const state = game.selectionState;
      if (!state || !state.generatedCards) return;
      const card = state.generatedCards[idx];
      
      if ('rarity' in card) { 
          let maxJokers = MAX_JOKERS_DEFAULT;
          game.jokers.forEach(j => { if (j.edition === 'Negative') maxJokers++; });

          if (game.jokers.length < maxJokers) {
              setGame(prev => ({
                  ...prev,
                  jokers: [...prev.jokers, card as Joker],
                  status: 'SHOP',
                  selectionState: undefined
              }));
              audio.playScoreTotal();
          } else {
              audio.playError();
          }
      } else if ('suit' in card) {
          setGame(prev => ({
              ...prev,
              deck: [...prev.deck, card as CardData],
              status: 'SHOP',
              selectionState: undefined
          }));
          audio.playScoreTotal();
      } else { 
          if (game.consumables.length < MAX_CONSUMABLES) {
              setGame(prev => ({
                  ...prev,
                  consumables: [...prev.consumables, card as Consumable],
                  status: 'SHOP',
                  selectionState: undefined
              }));
              audio.playScoreTotal();
          } else {
              audio.playError();
          }
      }
  };

  const sellJoker = (index: number) => {
      audio.playClick();
      setGame(prev => {
          const joker = prev.jokers[index];
          const sellPrice = Math.floor(joker.cost / 2);
          const newJokers = [...prev.jokers];
          newJokers.splice(index, 1);
          return { ...prev, jokers: newJokers, money: prev.money + sellPrice };
      });
  };

  const useConsumable = (index: number) => {
      const item = game.consumables[index];
      if (!item) return;

      if (item.type === 'Planet' && item.targetHand) {
          audio.playScoreTotal();
          setGame(prev => {
             const target = item.targetHand!;
             const currentLevel = prev.handLevels[target];
             const scale = HAND_SCALING[target];
             const newLevels = {
                 ...prev.handLevels,
                 [target]: {
                     level: currentLevel.level + 1,
                     baseChips: currentLevel.baseChips + scale.levelChips,
                     baseMult: currentLevel.baseMult + scale.levelMult
                 }
             };
             const newConsumables = [...prev.consumables];
             newConsumables.splice(index, 1);
             return { ...prev, handLevels: newLevels, consumables: newConsumables };
          });
      } 
      else if (item.type === 'Tarot') {
          let maxTargets = 0;
          if (['enhance_mult', 'enhance_bonus', 'enhance_lucky'].includes(item.effectId || '')) maxTargets = 2;
          else if (['enhance_wild', 'enhance_glass', 'enhance_steel', 'enhance_stone', 'enhance_gold'].includes(item.effectId || '')) maxTargets = 1;
          
          if (maxTargets > 0) {
              if (game.status !== 'PLAYING') {
                  audio.playError();
                  return;
              }
              setGame(prev => ({
                  ...prev,
                  selectionState: {
                      mode: 'TAROT',
                      maxSelect: maxTargets,
                      sourceItemId: item.id,
                      callbackId: item.effectId
                  },
                  selectedCardIds: [] 
              }));
          } else {
               audio.playScoreTotal();
               if (item.effectId === 'economy_double') {
                   setGame(prev => ({ ...prev, money: Math.min(prev.money + 20, prev.money * 2) }));
               }
               setGame(prev => {
                 const newConsumables = [...prev.consumables];
                 newConsumables.splice(index, 1);
                 return { ...prev, consumables: newConsumables };
               });
          }
      }
  };

  const confirmTarotUse = () => {
      const state = game.selectionState;
      if (!state || state.mode !== 'TAROT' || !state.callbackId) return;
      
      if (game.selectedCardIds.length !== state.maxSelect) {
          audio.playError();
          return;
      }

      audio.playScoreTotal();
      setGame(prev => {
          const newHand = prev.hand.map(card => {
              if (prev.selectedCardIds.includes(card.id)) {
                  if (state.callbackId === 'enhance_mult') return { ...card, enhancement: 'Mult' as Enhancement };
                  if (state.callbackId === 'enhance_bonus') return { ...card, enhancement: 'Bonus' as Enhancement };
                  if (state.callbackId === 'enhance_wild') return { ...card, enhancement: 'Wild' as Enhancement };
                  if (state.callbackId === 'enhance_glass') return { ...card, enhancement: 'Glass' as Enhancement };
                  if (state.callbackId === 'enhance_steel') return { ...card, enhancement: 'Steel' as Enhancement };
                  if (state.callbackId === 'enhance_stone') return { ...card, enhancement: 'Stone' as Enhancement };
                  if (state.callbackId === 'enhance_gold') return { ...card, enhancement: 'Gold' as Enhancement };
                  if (state.callbackId === 'enhance_lucky') return { ...card, enhancement: 'Lucky' as Enhancement };
              }
              return card;
          });

          const consumableIdx = prev.consumables.findIndex(c => c.id === state.sourceItemId);
          const newConsumables = [...prev.consumables];
          if (consumableIdx !== -1) newConsumables.splice(consumableIdx, 1);

          return {
              ...prev,
              hand: newHand,
              consumables: newConsumables,
              selectionState: undefined,
              selectedCardIds: []
          }
      });
  };

  const cancelSelection = () => {
      setGame(prev => ({ ...prev, selectionState: undefined, selectedCardIds: [] }));
  };

  const lang = game.settings.language;
  const handLabel = handPreview 
    ? t(lang, HAND_SCALING[handPreview.handType].nameKey)
    : t(lang, 'hand_High_Card');
  const handLevelVal = handPreview ? handPreview.level : 1;

  // 是否可以结算 (分数达标)
  const canCashOut = game.currentScore >= game.targetScore;

  // --- 渲染 (Render) ---

  return (
    <div className="w-screen h-screen overflow-hidden bg-black flex items-center justify-center">
     <div 
        id="game-root"
        className="relative w-full h-full bg-[#2c3e50] text-white flex flex-col font-mono selection:bg-red-500 selection:text-white shadow-2xl overflow-hidden"
     >
      {/* 背景特效 */}
      <div className={`swirl-bg ${!game.settings.enableMotion && 'hidden'}`}></div>
      {game.settings.enableCrt && ( <> <div className="crt-scanlines"></div> <div className="crt-flicker"></div> </> )}
      <div className="vignette"></div>

      {/* --- 遮罩层区域 (Modals/Overlays) --- */}
      {/* 开包遮罩层 */}
      {game.status === 'PACK_OPEN' && game.selectionState?.generatedCards && (
          <div className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center">
              <h2 className="text-5xl font-black text-white mb-8 uppercase">{t(lang, 'choose_card')}</h2>
              <div className="flex gap-8 justify-center items-center flex-wrap max-w-4xl">
                  {game.selectionState.generatedCards.map((item, idx) => (
                      <div key={item.id} className="transform hover:scale-110 transition-transform cursor-pointer m-2" onClick={() => selectPackCard(idx)}>
                          {'suit' in item ? (
                              <CardComponent card={item as CardData} selected={false} onClick={() => selectPackCard(idx)} />
                          ) : 'rarity' in item ? (
                              <JokerComponent joker={item as Joker} language={lang} />
                          ) : (
                              <ConsumableComponent item={item as Consumable} language={lang} />
                          )}
                      </div>
                  ))}
              </div>
              <button onClick={() => setGame(p => ({...p, status: 'SHOP', selectionState: undefined}))} className="mt-12 text-gray-400 hover:text-white border border-gray-600 px-4 py-1">{t(lang, 'skip')}</button>
          </div>
      )}

      {/* 塔罗牌选择遮罩层 */}
      {game.selectionState?.mode === 'TAROT' && (
          <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-[90] flex flex-col items-center gap-4 w-full pointer-events-none">
              <div className="bg-black/80 text-white px-8 py-4 rounded border-2 border-white text-2xl font-bold animate-pulse pointer-events-auto">
                  {t(lang, `select_target_${game.selectionState.maxSelect}`)} ({game.selectedCardIds.length}/{game.selectionState.maxSelect})
              </div>
              <div className="flex gap-4 pointer-events-auto">
                  <button onClick={confirmTarotUse} disabled={game.selectedCardIds.length !== game.selectionState.maxSelect} className="bg-green-600 px-6 py-2 rounded font-bold disabled:opacity-50 border-2 border-black hover:bg-green-500">{t(lang, 'confirm_use')}</button>
                  <button onClick={cancelSelection} className="bg-red-600 px-6 py-2 rounded font-bold border-2 border-black hover:bg-red-500">{t(lang, 'cancel')}</button>
              </div>
          </div>
      )}

      {/* 1. 菜单 (Menu) */}
      {game.status === 'MENU' && (
          <MainMenu 
              onStart={startGame}
              onSettings={() => setShowSettings(true)}
              onRules={() => setShowRunInfo(true)}
              language={lang}
          />
      )}

      {/* 2. 游戏结束 (Game Over) */}
      {game.status === 'GAME_OVER' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-[100]">
            <h1 className="text-8xl text-red-600 font-bold mb-4 animate-pulse tracking-widest">{t(lang, 'game_over')}</h1>
            <p className="text-3xl mb-8 text-gray-400">Reached Ante {game.ante}</p>
            <button onClick={() => setGame({...INITIAL_STATE, settings: game.settings})} className="px-8 py-3 bg-white text-black text-2xl font-bold rounded hover:bg-gray-200 border-4 border-gray-500">{t(lang, 'try_again')}</button>
        </div>
      )}

      {/* 3. 结算 (Cash Out) */}
      {game.status === 'CASHOUT' && game.cashOutReport && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-[80] backdrop-blur-sm">
              <div className="bg-[#2c3e50] border-4 border-white p-8 md:p-12 rounded-xl shadow-2xl min-w-[300px] md:min-w-[600px] flex flex-col gap-6">
                  <h2 className="text-4xl md:text-6xl font-black text-center text-orange-400 text-shadow-retro mb-8">{t(lang, 'cash_out')}</h2>
                  {game.cashOutReport.items.map((item, index) => (
                      <div key={index} className={`flex justify-between items-center text-2xl md:text-3xl font-bold transition-opacity duration-500 ${index <= game.cashOutReport!.currentStep ? 'opacity-100' : 'opacity-0'}`}>
                          <div className="text-blue-300 uppercase">{t(lang, item.label)}</div>
                          <div className="flex items-center gap-4"><span className="text-white">{item.amount}</span><span className="text-yellow-400">$</span></div>
                      </div>
                  ))}
                  <div className="border-t-4 border-white my-4"></div>
                  <div className="flex justify-between items-center text-4xl md:text-5xl font-black">
                      <div className="text-white">{t(lang, 'total')}</div>
                      <div className="text-yellow-400">${game.cashOutReport.total}</div>
                  </div>
                  {game.cashOutReport.currentStep >= game.cashOutReport.items.length && (
                       <button onClick={() => openShop(false)} className="mt-8 py-4 bg-[#44bd32] text-white text-3xl md:text-4xl font-bold rounded border-4 border-black hover:bg-[#369627] animate-pulse shadow-[4px_4px_0_#000]">
                           {t(lang, 'to_shop')} ->
                       </button>
                  )}
              </div>
          </div>
      )}

      {/* 4. 盲注选择 (Blind Select) */}
      {game.status === 'BLIND_SELECT' && (
         <div className="absolute inset-0 z-20 p-4 md:p-8 flex flex-col overflow-y-auto">
             <h2 className="text-4xl md:text-5xl font-black text-center mb-8 text-shadow-retro text-white">{t(lang, 'select_blind')} - Ante {game.ante}</h2>
             <div className="flex flex-col md:flex-row gap-6 justify-center items-stretch flex-1 max-w-6xl mx-auto w-full">
                 {game.upcomingBlinds.map((blind, i) => (
                     <div key={blind.type} className={`flex-1 border-4 border-black p-6 flex flex-col items-center justify-between rounded-lg shadow-xl relative min-h-[300px]
                        ${blind.type === 'Small' ? 'bg-[#009ddc]' : blind.type === 'Big' ? 'bg-[#f0932b]' : 'bg-[#c23616]'}
                     `}>
                        <div className="text-center">
                             <div className="text-3xl font-bold uppercase">{t(lang, blind.nameKey)}</div>
                             {blind.type === 'Boss' && (
                                 <div className="bg-black/40 p-2 rounded mt-2 text-sm text-yellow-300">
                                     {BOSS_BLINDS.find(b => b.ability === blind.bossAbility)?.nameKey ? t(lang, `blind_desc_${blind.bossAbility}`) : ''}
                                 </div>
                             )}
                        </div>
                        <div className="text-5xl md:text-6xl font-black my-4 text-white drop-shadow-md">{getBlindScore(blind, game.ante)}</div>
                        <div className="text-xl font-bold bg-black/20 px-4 py-2 rounded">{t(lang, 'reward')}: ${blind.reward}</div>
                        {blind.type !== 'Boss' && (
                            <div className="w-full mt-2">
                                <button onClick={() => skipBlind(blind)} className="w-full py-2 bg-gray-800 text-gray-300 font-bold uppercase border-2 border-gray-600 hover:bg-gray-700 text-sm mb-2">
                                    {t(lang, 'skip')} ({t(lang, 'tag_uncommon')})
                                </button>
                            </div>
                        )}
                        <button onClick={() => selectBlind(blind)} className="w-full py-4 bg-white text-black text-2xl font-black uppercase tracking-widest border-4 border-black hover:bg-opacity-90 transition-transform hover:scale-105">
                            {t(lang, 'select')}
                        </button>
                     </div>
                 ))}
             </div>
             {/* Tags Display */}
             {game.activeTags.length > 0 && (
                 <div className="flex justify-center gap-2 mt-4 flex-wrap">
                     {game.activeTags.map((tag, i) => (
                         <div key={i} className={`px-3 py-1 rounded border border-white text-xs font-bold text-white ${tag.bgClass || 'bg-gray-600'}`}>
                             {t(lang, `tag_name_${tag.rawId}`)}
                         </div>
                     ))}
                 </div>
             )}
             <div className="mt-8 p-4 bg-black/40 rounded border-4 border-black flex flex-col md:flex-row items-center justify-center gap-4 max-w-4xl mx-auto">
                 <div className="text-xl font-bold text-gray-400">{t(lang, 'your_jokers')}:</div>
                 <div className="flex flex-wrap justify-center">
                    {game.jokers.map((j, i) => (
                        <div key={i} className="transform scale-75 origin-center"><JokerComponent joker={j} language={lang} /></div>
                    ))}
                 </div>
             </div>
         </div>
      )}

      {/* 5. 商店 (Shop) */}
      {game.status === 'SHOP' && (
         <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto">
             <div className="flex justify-between items-center p-4 md:p-8 bg-black/60 backdrop-blur-md border-b-4 border-black sticky top-0 z-50">
                 <div className="text-4xl md:text-6xl font-black text-[#f0932b] tracking-widest text-shadow-retro">{t(lang, 'shop')}</div>
                 <div className="bg-black p-2 md:p-4 rounded border-2 border-yellow-600">
                     <span className="text-yellow-500 text-2xl md:text-4xl font-bold">${game.money}</span>
                 </div>
             </div>
             
             <div className="flex-1 flex flex-col items-center p-4 md:p-8 gap-8">
                 {/* 商店货架 */}
                 <div className="flex flex-wrap gap-8 p-8 bg-white/5 rounded-xl border-2 border-white/10 shadow-2xl w-full justify-center min-h-[280px] items-center max-w-6xl">
                     {game.shopItems.length === 0 && <div className="text-2xl text-gray-500 font-bold">{t(lang, 'sold_out')}</div>}
                     {game.shopItems.map(item => (
                        <div key={item.id} className="transform hover:translate-y-[-5px] transition-transform">
                             {'rarity' in item ? (
                                 <JokerComponent joker={item as Joker} price={item.cost} onClick={() => buyItem(item)} language={lang}/>
                             ) : 'size' in item ? (
                                 // Pack Renderer
                                 <div className="w-32 h-48 bg-gray-800 border-4 border-gray-400 flex flex-col items-center p-2 cursor-pointer hover:bg-gray-700" onClick={() => buyItem(item as Pack)}>
                                     <div className="text-center font-bold text-white text-xs mt-2 h-8">{t(lang, `pack_name_${(item as Pack).rawId}`)}</div>
                                     <div className="flex-1 text-4xl flex items-center justify-center">📦</div>
                                     <div className="text-[10px] text-center text-gray-300 leading-tight mb-2">{t(lang, `pack_desc_${(item as Pack).rawId}`)}</div>
                                     <div className="bg-yellow-400 text-black font-black px-2 rounded">${item.cost}</div>
                                 </div>
                             ) : (
                                 <ConsumableComponent item={item as Consumable} price={item.cost} canBuy={true} onClick={() => buyItem(item)} language={lang} />
                             )}
                        </div>
                     ))}
                 </div>

                 <div className="flex flex-wrap gap-8 w-full max-w-6xl justify-center items-end">
                    {/* Vouchers */}
                    <div className="flex flex-col items-center">
                         <div className="text-center text-white/50 font-bold mb-2 uppercase tracking-widest text-xs">{t(lang, 'vouchers')}</div>
                         {game.shopVoucher ? (
                             <div className="w-32 h-48 bg-teal-800 border-4 border-teal-500 flex flex-col items-center p-2 cursor-pointer hover:scale-105 transition-transform" onClick={() => buyItem(game.shopVoucher!)}>
                                 <div className="text-white font-bold text-center text-sm uppercase border-b border-teal-500 w-full pb-1">{t(lang, `voucher_name_${game.shopVoucher.rawId}`)}</div>
                                 <div className="flex-1 flex items-center justify-center text-4xl">🎟️</div>
                                 <div className="text-[10px] text-center text-teal-200 leading-tight">{t(lang, `voucher_desc_${game.shopVoucher.rawId}`)}</div>
                                 <div className="mt-2 bg-black text-white px-2 py-1 font-bold">${game.shopVoucher.cost}</div>
                             </div>
                         ) : (
                             <div className="w-32 h-48 border-4 border-white/10 flex items-center justify-center text-white/20 font-bold">EMPTY</div>
                         )}
                    </div>
                    
                    {/* Reroll Button */}
                    <button onClick={rerollShop} className="w-32 h-24 bg-red-700 border-4 border-red-500 flex flex-col items-center justify-center hover:bg-red-600 shadow-lg">
                        <div className="text-white font-bold text-lg">{t(lang, 'reroll')}</div>
                        <div className="text-yellow-300 font-black text-2xl">${game.rerollCost}</div>
                    </button>
                    
                    {/* Next Round Button */}
                    <button onClick={finishShop} className="px-8 md:px-12 py-4 bg-[#44bd32] text-white text-2xl md:text-3xl font-bold rounded shadow-[0_8px_0_#1e5f12] hover:translate-y-1 hover:shadow-[0_4px_0_#1e5f12] active:translate-y-2 active:shadow-none transition-all border-4 border-black">
                        {t(lang, 'next_round')}
                    </button>
                 </div>

                 {/* Inventory */}
                 <div className="flex flex-wrap w-full justify-center gap-8 max-w-6xl">
                    <div className="flex-1 min-w-[300px]">
                        <div className="text-sm uppercase mb-2 text-gray-400 font-bold">{t(lang, 'current_jokers')} ({game.jokers.length}/{MAX_JOKERS_DEFAULT + game.jokers.filter(j=>j.edition==='Negative').length})</div>
                        <div className="flex gap-2 p-4 bg-black/40 rounded border-2 border-black min-h-[160px] items-center justify-center flex-wrap">
                             {game.jokers.map((joker, idx) => (
                                <div key={`${joker.id}-${idx}`} className="transform scale-90">
                                    <JokerComponent 
                                        joker={joker} 
                                        index={idx} 
                                        canSell={true} 
                                        onSell={() => sellJoker(idx)} 
                                        onDrop={handleJokerDrop} 
                                        language={lang}
                                    />
                                </div>
                             ))}
                        </div>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <div className="text-sm uppercase mb-2 text-gray-400 font-bold">{t(lang, 'consumables')} ({game.consumables.length}/{MAX_CONSUMABLES})</div>
                        <div className="flex gap-2 p-4 bg-black/40 rounded border-2 border-black min-h-[160px] items-center justify-center flex-wrap">
                            {game.consumables.map((item, idx) => (
                                <div key={`${item.id}-${idx}`} className="transform scale-90">
                                    <ConsumableComponent item={item} onClick={() => useConsumable(idx)} language={lang} />
                                </div>
                             ))}
                        </div>
                    </div>
                 </div>
             </div>
         </div>
      )}

      {/* 6. 出牌阶段 (Playing / Scoring / Victory) - 重构版布局 */}
      {/* 使用 flex-col 布局确保垂直排列，不再使用 absolute 定位遮挡 */}
      {(game.status === 'PLAYING' || game.status === 'SCORING' || game.status === 'VICTORY') && (
        <div className="flex-1 flex flex-col w-full h-full relative z-10 overflow-hidden">
            
            {/* 顶部信息栏 (Header Bar) */}
            <div className="w-full h-10 bg-black/80 border-b border-white/20 flex items-center justify-between px-4 shrink-0 z-50">
                 <div className="flex gap-4 text-xs text-gray-400">
                     <div>FPS: 60</div>
                     <div>SEED: A8J3-K9L2</div>
                 </div>
                 <div className="flex gap-2">
                     <button onClick={() => setShowRunInfo(true)} className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded border border-white/20 hover:bg-red-500">
                        📖 {t(lang, 'rules')}
                     </button>
                     <button onClick={() => setShowSettings(true)} className="px-3 py-1 bg-gray-700 text-white text-xs font-bold rounded border border-white/20 hover:bg-gray-600">
                        ⚙️ {t(lang, 'settings')}
                     </button>
                 </div>
            </div>

            {/* HUD 区域 (Jokers + Consumables) */}
            {/* 固定最小高度，防止被挤压 */}
            <div className="min-h-[150px] md:min-h-[160px] bg-black/40 w-full flex items-center justify-center px-4 py-2 border-b-4 border-black relative shrink-0">
                <div className="w-full max-w-7xl flex justify-between items-center">
                    {/* Joker 区 */}
                    <div className="flex gap-2 items-center flex-1 justify-start overflow-x-auto no-scrollbar">
                        {game.jokers.length === 0 && <div className="text-white/20 font-bold text-xl italic tracking-widest px-4">{t(lang, 'no_jokers')}</div>}
                        {game.jokers.map((joker, idx) => (
                            <div key={joker.id} className="transform scale-90 md:scale-100 transition-transform origin-center hover:z-50">
                                <JokerComponent 
                                    joker={joker} 
                                    index={idx}
                                    canSell={game.status === 'PLAYING'} 
                                    onSell={() => sellJoker(idx)} 
                                    onDrop={handleJokerDrop}
                                    triggerState={game.triggerState}
                                    isActive={game.activeCardId === joker.id}
                                    language={lang}
                                />
                            </div>
                        ))}
                    </div>
                    
                    {/* 消耗牌区 */}
                    <div className="flex gap-2 items-center justify-end pl-4 border-l-2 border-white/10 shrink-0">
                        {Array.from({length: MAX_CONSUMABLES}).map((_, i) => {
                            const item = game.consumables[i];
                            return (
                                <div key={i} className="w-16 h-24 border-2 border-dashed border-white/20 rounded bg-black/20 flex items-center justify-center overflow-hidden">
                                    {item ? (
                                         <div className="transform scale-75"><ConsumableComponent item={item} onClick={() => useConsumable(i)} language={lang} /></div>
                                    ) : (
                                        <div className="text-white/10 text-[10px]">EMPTY</div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* 中间游戏区 (Game Area) */}
            {/* 使用 flex-1 和 min-h-0 确保占据剩余空间且不溢出 */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row w-full max-w-7xl mx-auto relative overflow-hidden">
                
                {/* 左侧统计栏 */}
                <div className="w-full md:w-64 bg-[#222]/90 flex flex-row md:flex-col p-2 md:p-4 border-b-4 md:border-b-0 md:border-r-4 border-black justify-between shadow-2xl backdrop-blur-md z-30 shrink-0">
                    <div className="flex-1 md:flex-none flex flex-row md:flex-col gap-4 items-center md:items-stretch">
                        {/* 目标分数面板 */}
                        <div className="bg-red-900/80 p-2 md:p-4 rounded border-4 border-red-600 relative overflow-hidden group flex-1 md:flex-none min-w-[150px]">
                            <div className="text-xs uppercase text-red-200 tracking-widest mb-1 font-bold">{t(lang, 'round_score')}</div>
                            <div className="text-2xl md:text-4xl font-black text-white drop-shadow-md tracking-tighter tabular-nums">
                                {Math.floor(displayRoundScore).toLocaleString()}
                            </div>
                            <div className="text-[10px] md:text-xs text-red-200 mt-2 font-bold">{t(lang, 'target')}: {game.targetScore.toLocaleString()}</div>
                            <div className="w-full bg-black h-2 md:h-3 rounded-full mt-2 overflow-hidden border border-red-400/50">
                                <div className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-500 ease-out" style={{width: `${Math.min(100, (displayRoundScore / game.targetScore) * 100)}%`}}></div>
                            </div>
                        </div>
                        
                        {/* 资源统计 */}
                        <div className="flex flex-row md:flex-col gap-2 flex-1 md:flex-none">
                            <div className="flex flex-col md:flex-row justify-between items-center bg-blue-900/40 p-1 md:p-2 rounded border-2 border-blue-700 flex-1">
                                <span className="text-blue-200 font-bold text-xs md:text-sm">{t(lang, 'hands')}</span>
                                <span className="text-xl md:text-2xl font-black text-blue-100">{game.handsLeft}</span>
                            </div>
                            <div className="flex flex-col md:flex-row justify-between items-center bg-orange-900/40 p-1 md:p-2 rounded border-2 border-orange-700 flex-1">
                                <span className="text-orange-200 font-bold text-xs md:text-sm">{t(lang, 'discards')}</span>
                                <span className="text-xl md:text-2xl font-black text-orange-100">{game.discardsLeft}</span>
                            </div>
                            <div className="flex flex-col md:flex-row justify-between items-center bg-yellow-900/40 p-1 md:p-2 rounded border-2 border-yellow-600 flex-1">
                                <span className="text-yellow-200 font-bold text-xs md:text-sm">{t(lang, 'money')}</span>
                                <span className="text-xl md:text-2xl font-black text-yellow-100">${game.money}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="hidden md:block mt-auto text-center bg-black/50 py-2 rounded border border-white/10">
                        <div className="text-white/50 text-xs tracking-widest">{t(lang, 'ante')} <span className="text-orange-500 font-bold text-lg">{game.ante}</span></div>
                        <div className="text-white/50 text-xs tracking-widest">{t(lang, 'blind')} <span className="text-blue-300 font-bold text-lg">{t(lang, game.currentBlind?.nameKey || '')}</span></div>
                    </div>
                </div>

                {/* 右侧主操作区 */}
                <div className="flex-1 flex flex-col relative h-full">
                    
                    {/* 排序按钮 */}
                    <div className="absolute top-4 right-4 z-40">
                        <button onClick={toggleSort} className="bg-black/60 px-4 py-2 border-2 border-white/30 text-sm font-bold hover:bg-black/80 transition-colors text-white rounded shadow-lg backdrop-blur-sm">
                            {game.settings.sortBy === 'RANK' ? t(lang, 'sort_rank') : t(lang, 'sort_suit')}
                        </button>
                    </div>

                    {/* 计分板浮窗 (Score Display) */}
                    {(game.status === 'SCORING' || game.status === 'VICTORY' || liveScore.chips > 0) && (
                        <div className="absolute top-12 left-0 w-full flex justify-center pointer-events-none z-[60]">
                            <ScoreDisplay 
                                label={handLabel}
                                chips={liveScore.chips}
                                mult={liveScore.mult}
                                total={liveScore.total}
                                triggerState={game.triggerState}
                            />
                        </div>
                    )}
                    
                    {/* 牌型预览 */}
                    <div className="h-16 flex items-center justify-center mt-4">
                        {!animating && game.selectedCardIds.length > 0 && (
                             <div className="text-center bg-black/60 px-6 py-2 rounded-full border border-white/20 backdrop-blur-sm">
                                 <div className="text-sm text-gray-300 uppercase tracking-widest">{t(lang, 'current_hand')}</div>
                                 <div className="text-xl font-bold text-white">
                                     {handLabel} <span className="text-sm text-blue-400 ml-2">Lv.{handLevelVal}</span>
                                 </div>
                                 <div className="text-xs text-gray-400 flex gap-2 justify-center mt-1 font-mono">
                                     <span className="text-blue-300">{handPreview?.baseChips}</span> x <span className="text-red-300">{handPreview?.baseMult}</span>
                                 </div>
                             </div>
                        )}
                    </div>

                    {/* 手牌区域 (Hand Area) */}
                    <div className="flex-1 flex items-center justify-center px-4 relative">
                         <div className="flex -space-x-10 md:-space-x-6 items-end justify-center h-32 md:h-48 w-full max-w-full py-4">
                            {game.hand.map((card, index) => (
                                <div key={card.id} className="transform scale-90 md:scale-100 hover:z-50 transition-all duration-200 origin-bottom">
                                    <CardComponent
                                        card={card}
                                        index={index}
                                        selected={game.selectedCardIds.includes(card.id)}
                                        highlighted={game.selectionState?.mode === 'TAROT' && game.selectedCardIds.includes(card.id)}
                                        isActive={game.activeCardId === card.id}
                                        triggerState={game.triggerState}
                                        onClick={() => toggleCard(card.id)}
                                        onDrop={handleCardDrop}
                                        disabled={animating || card.animationState !== 'idle'}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 底部控制栏 (Controls) */}
                    <div className="h-20 md:h-24 bg-[#1a1a1a] flex items-center justify-center gap-4 md:gap-8 border-t-4 border-black z-50 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                        
                        {/* 达到目标分数后的选择逻辑 */}
                        {canCashOut && !animating ? (
                             <div className="flex gap-4 animate-score-enter">
                                 <div className="text-center">
                                     <div className="text-green-400 font-bold text-xs mb-1 uppercase tracking-wider">{t(lang, 'score_reached')}</div>
                                     <button
                                        onClick={startCashOutSequence}
                                        className="px-8 py-3 bg-yellow-500 text-black font-black text-xl rounded border-4 border-white hover:bg-yellow-400 hover:scale-105 transition-transform shadow-lg"
                                     >
                                         {t(lang, 'finish_round')}
                                     </button>
                                 </div>
                                 
                                 {game.handsLeft > 0 && (
                                     <div className="text-center opacity-80 hover:opacity-100 transition-opacity">
                                         <div className="text-gray-400 font-bold text-xs mb-1 uppercase tracking-wider">{t(lang, 'hands_left')}: {game.handsLeft}</div>
                                         <button
                                            onClick={playHand}
                                            disabled={game.selectedCardIds.length === 0}
                                            className="px-6 py-3 bg-blue-600 text-white font-bold text-xl rounded border-4 border-blue-800 hover:bg-blue-500 disabled:bg-gray-700 disabled:border-gray-600 disabled:cursor-not-allowed"
                                         >
                                             {t(lang, 'continue_playing')}
                                         </button>
                                     </div>
                                 )}
                             </div>
                        ) : (
                            <>
                                <button
                                    onClick={discardHand}
                                    disabled={animating || game.selectedCardIds.length === 0 || game.discardsLeft <= 0 || game.selectionState !== undefined}
                                    className={`px-6 md:px-8 py-2 md:py-3 rounded text-lg md:text-xl font-bold uppercase tracking-wider border-4 transition-all
                                        ${game.discardsLeft > 0 && game.selectedCardIds.length > 0 && !game.selectionState ? 'bg-[#FE5F55] border-[#b33939] text-white hover:translate-y-[-2px] shadow-[0_4px_0_#7f2222]' : 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed opacity-50'}
                                    `}
                                >
                                    {t(lang, 'discard')}
                                </button>
                                <button
                                    onClick={playHand}
                                    disabled={animating || game.selectedCardIds.length === 0 || game.handsLeft <= 0 || game.selectionState !== undefined}
                                    className={`px-8 md:px-12 py-3 md:py-4 rounded text-xl md:text-2xl font-bold uppercase tracking-widest border-4 transition-all
                                        ${game.handsLeft > 0 && game.selectedCardIds.length > 0 && !game.selectionState ? 'bg-[#009ddc] border-[#005f85] text-white hover:translate-y-[-2px] shadow-[0_4px_0_#00425e] animate-pulse' : 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed opacity-50'}
                                    `}
                                >
                                    {t(lang, 'play')}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {showSettings && <SettingsModal settings={game.settings} onUpdate={s => setGame(p => ({...p, settings: s}))} onClose={() => setShowSettings(false)} />}
      {showRunInfo && <RunInfoModal onClose={() => setShowRunInfo(false)} language={lang} />}
      
     </div>
    </div>
  );
}
