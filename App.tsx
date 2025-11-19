
import React, { useState, useEffect, useRef } from 'react';
import { CardComponent } from './components/CardComponent';
import { JokerComponent } from './components/JokerComponent';
import { ConsumableComponent } from './components/ConsumableComponent';
import { SettingsModal } from './components/SettingsModal';
import { RunInfoModal } from './components/RunInfoModal';
import { GameState, CardData, HandResult, GameSettings, Joker, Blind, Consumable, HandLevel, HandType, BossAbility, CashOutItem, Tag, Voucher, Pack, Edition, Enhancement } from './types';
import { AVAILABLE_JOKERS, HAND_SCALING, MAX_HAND_SIZE, STARTING_DISCARDS, STARTING_HANDS, STARTING_HAND_SIZE, STARTING_MONEY, BOSS_BLINDS, MAX_JOKERS, MAX_CONSUMABLES, TAGS, VOUCHERS, BASE_REROLL_COST, TAROT_CARDS, PLANET_CARDS, PACKS } from './constants';
import { createDeck, evaluateHand, calculateScore, sortHand, generateBlinds, getBlindScore, generateShopItems, createCard } from './services/pokerEngine';
import { audio } from './services/audio';
import { t } from './i18n';

const DEFAULT_SETTINGS: GameSettings = {
    volume: 0.5,
    bgmVolume: 0.4,
    enableCrt: true,
    enableMotion: true,
    sortBy: 'RANK',
    language: 'ZH',
};

const INITIAL_HAND_LEVELS: Record<HandType, HandLevel> = Object.keys(HAND_SCALING).reduce((acc, key) => {
    const k = key as HandType;
    acc[k] = { level: 1, baseChips: HAND_SCALING[k].baseChips, baseMult: HAND_SCALING[k].baseMult };
    return acc;
}, {} as Record<HandType, HandLevel>);

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
  settings: DEFAULT_SETTINGS
};

export default function App() {
  const [game, setGame] = useState<GameState>(INITIAL_STATE);
  const [animating, setAnimating] = useState(false);
  const [handPreview, setHandPreview] = useState<HandResult | null>(null);
  const [scoreDetails, setScoreDetails] = useState<{chips: number, mult: number, total: number} | null>(null);
  const [displayRoundScore, setDisplayRoundScore] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showRunInfo, setShowRunInfo] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
      const handleResize = () => {
          const targetW = 1280;
          const targetH = 720;
          const winW = window.innerWidth;
          const winH = window.innerHeight;
          const scaleW = winW / targetW;
          const scaleH = winH / targetH;
          const newScale = Math.min(scaleW, scaleH);
          setScale(newScale);
      };
      window.addEventListener('resize', handleResize);
      handleResize();
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
     audio.setVolume(game.settings.volume);
     audio.setMusicVolume(game.settings.bgmVolume);
  }, [game.settings.volume, game.settings.bgmVolume]);

  useEffect(() => {
      if (game.status === 'BLIND_SELECT' || game.status === 'SHOP' || game.status === 'PLAYING') {
          audio.startBGM();
      }
  }, [game.status]);

  // 滚动分数特效
  useEffect(() => {
    if (game.status !== 'PLAYING' && game.status !== 'VICTORY' && game.status !== 'CASHOUT') {
        setDisplayRoundScore(0);
        return; 
    }
    if (displayRoundScore !== game.currentScore) {
        const diff = game.currentScore - displayRoundScore;
        if (diff === 0) return;
        const step = Math.ceil(diff / 20); 
        let frameId: number;
        const animate = () => {
            setDisplayRoundScore(prev => {
                if (game.status === 'SHOP' || game.status === 'GAME_OVER') return 0;
                const next = prev + step;
                if ((step > 0 && next >= game.currentScore) || (step < 0 && next <= game.currentScore)) return game.currentScore;
                if (Math.random() > 0.5) audio.playScoreTick(); 
                return next;
            });
            if (Math.abs(game.currentScore - displayRoundScore) > Math.abs(step)) frameId = requestAnimationFrame(animate);
        };
        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }
  }, [game.currentScore, displayRoundScore, game.status]);
  
  useEffect(() => {
      if (game.roundScore === 0 && game.currentScore === 0) setDisplayRoundScore(0);
  }, [game.roundScore, game.currentScore]);

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
  };

  const skipBlind = (blind: Blind) => {
      audio.playClick();
      const randomTag = TAGS[Math.floor(Math.random() * TAGS.length)];
      const newTag = { ...randomTag, id: randomTag.id + Date.now() };
      setGame(prev => {
          let newMoney = prev.money;
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

  const selectBlind = (blind: Blind) => {
      audio.playClick();
      const newDeck = createDeck();
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

      setGame(prev => ({
          ...prev,
          status: 'PLAYING',
          currentBlind: blind,
          targetScore: target,
          deck: remainingDeck,
          hand: dealCards(sortHand(initialHand, prev.settings.sortBy)),
          discardPile: [],
          selectedCardIds: [], 
          handsLeft: STARTING_HANDS + (game.redeemedVouchers.includes('v_grabber') ? 1 : 0),
          discardsLeft: discards,
          currentScore: 0,
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

  useEffect(() => {
    if (game.status !== 'PLAYING') return;
    const selectedCards = game.hand.filter(c => game.selectedCardIds.includes(c.id));
    const result = evaluateHand(selectedCards, game.handLevels);
    setHandPreview(result);
  }, [game.selectedCardIds, game.hand, game.status, game.handLevels]);

  const toggleCard = (id: string) => {
    audio.playCardSelect();
    
    // 1. Tarots Selection Mode
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

    // 2. Normal Play Mode
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
        if (prev.redeemedVouchers.includes('v_grabber')) handSize += 1;

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

  const playHand = () => {
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
    const result = evaluateHand(selectedCards, game.handLevels);
    const scoreCalc = calculateScore(result, game.jokers, { 
        money: game.money, 
        discardsLeft: game.discardsLeft, 
        jokerCount: game.jokers.length 
    });

    setTimeout(() => { audio.playChipAdd(); setScoreDetails({ chips: scoreCalc.chips, mult: 0, total: 0 }); }, 600);
    setTimeout(() => { audio.playMultAdd(); setScoreDetails({ chips: scoreCalc.chips, mult: scoreCalc.mult, total: 0 }); }, 1200);
    setTimeout(() => { audio.playScoreTotal(); setScoreDetails(scoreCalc); }, 1800);

    setTimeout(() => {
      setGame(prev => {
        const newTotalScore = prev.currentScore + scoreCalc.total;
        const playedIds = prev.selectedCardIds;
        const kept = prev.hand.filter(c => !playedIds.includes(c.id));
        let drawnCards: CardData[] = [];
        let remainingDeck = [...prev.deck];
        let handSize = MAX_HAND_SIZE;
        if (prev.redeemedVouchers.includes('v_grabber')) handSize += 1;

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
        
        // Update Jokers (e.g. Gros Michel, Ice Cream)
        let newJokers = [...prev.jokers];
        newJokers = newJokers.map(j => j.id === 'j_ice_cream' ? { ...j, value: Math.max(0, j.value - 5) } : j);
        const hasGrosMichel = newJokers.find(j => j.id === 'j_gros_michel');
        if (hasGrosMichel && Math.random() < 0.25) {
             newJokers = newJokers.filter(j => j.id !== 'j_gros_michel'); 
        }
        
        const isWin = newTotalScore >= prev.targetScore;
        const isLoss = !isWin && prev.handsLeft - 1 <= 0;

        if (isWin) {
            return { ...prev, jokers: newJokers, currentScore: newTotalScore, roundScore: scoreCalc.total, status: 'VICTORY' };
        }
        if (isLoss) {
             return { ...prev, status: 'GAME_OVER' };
        }
        return {
          ...prev,
          hand: newHand,
          jokers: newJokers,
          discardPile: [...prev.discardPile, ...selectedCards],
          deck: remainingDeck,
          selectedCardIds: [],
          handsLeft: prev.handsLeft - 1,
          currentScore: newTotalScore,
          roundScore: scoreCalc.total
        };
      });
      setAnimating(false);
      setScoreDetails(null);

      if (game.currentScore + scoreCalc.total >= game.targetScore) {
         setTimeout(() => startCashOutSequence(), 1500);
      }
    }, 3000);
  };

  const startCashOutSequence = () => {
      setGame(prev => {
          const items: CashOutItem[] = [];
          let total = 0;
          if (prev.handsLeft > 0) {
              items.push({ label: 'hands_left', amount: prev.handsLeft });
              total += prev.handsLeft;
          }
          if (prev.discardsLeft > 0) {
              items.push({ label: 'discards_left', amount: prev.discardsLeft });
              total += prev.discardsLeft;
          }
          const interest = Math.min(5, Math.floor(prev.money / 5));
          if (interest > 0) {
              items.push({ label: 'interest', amount: interest });
              total += interest;
          }
          const reward = prev.currentBlind?.reward || 3;
          items.push({ label: 'blind_reward', amount: reward });
          total += reward;
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
          const couponTagIdx = prev.activeTags.findIndex(t => t.id.includes('tag_coupon'));
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
              currentScore: 0, 
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
          rerollCost: prev.rerollCost + 1 // Increment logic
      }));
  };

  const finishShop = () => {
      audio.playClick();
      setGame(prev => {
          let nextUpcoming = [...prev.upcomingBlinds];
          let nextAnte = prev.ante;
          if (prev.currentBlind) nextUpcoming = nextUpcoming.filter(b => b.id !== prev.currentBlind?.id);
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
  };

  const buyItem = (item: Joker | Consumable | Voucher | Pack) => {
      if (game.money >= item.cost) {
          audio.playClick();
          if ('effectId' in item && !('type' in item)) { // Voucher
             const v = item as Voucher;
             setGame(prev => ({
                  ...prev,
                  money: prev.money - v.cost,
                  redeemedVouchers: [...prev.redeemedVouchers, v.id],
                  shopVoucher: null
             }));
             return;
          }

          if ('rarity' in item) { // Joker
              if (game.jokers.length < MAX_JOKERS) {
                  setGame(prev => ({
                      ...prev,
                      money: prev.money - item.cost,
                      jokers: [...prev.jokers, item as Joker],
                      shopItems: prev.shopItems.filter(i => i.id !== item.id)
                  }));
              } else {
                  audio.playError();
              }
          } else if ('size' in item) { // Pack
             openPack(item as Pack);
             setGame(prev => ({
                 ...prev,
                 money: prev.money - item.cost,
                 shopItems: prev.shopItems.filter(i => i.id !== item.id)
             }));
          } else { // Consumable
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
              // Generate standard cards with potential effects
              let card = deck[Math.floor(Math.random() * deck.length)];
              // Add Enhancements chance
              if (Math.random() > 0.7) {
                  const enh = ['Bonus', 'Mult', 'Wild', 'Glass', 'Steel', 'Stone', 'Gold', 'Lucky'][Math.floor(Math.random()*8)];
                  card.enhancement = enh as any;
              }
              // Add Edition chance
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
      
      // Add to inventory logic
      if ('rarity' in card) { // Joker
          if (game.jokers.length < MAX_JOKERS) {
              setGame(prev => ({
                  ...prev,
                  jokers: [...prev.jokers, card as Joker],
                  status: 'SHOP',
                  selectionState: undefined
              }));
              audio.playScoreTotal();
          } else {
              audio.playError(); // Full
          }
      } else if ('suit' in card) { // Playing Card
          setGame(prev => ({
              ...prev,
              deck: [...prev.deck, card as CardData],
              status: 'SHOP',
              selectionState: undefined
          }));
          audio.playScoreTotal();
      } else { // Consumable
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

      // If it's a planet, use immediately
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
      // If it's a Tarot that needs targets
      else if (item.type === 'Tarot') {
          // Define targets
          let maxTargets = 0;
          if (['enhance_mult', 'enhance_bonus', 'enhance_lucky'].includes(item.effectId || '')) maxTargets = 2;
          else if (['enhance_wild', 'enhance_glass', 'enhance_steel'].includes(item.effectId || '')) maxTargets = 1;
          
          if (maxTargets > 0) {
              if (game.status !== 'PLAYING') {
                  // Can only use enhancement tarots during play (on hand)
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
                  selectedCardIds: [] // Clear hand selection for tarot selection
              }));
          } else {
              // Simple tarots like Hermit
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
                  // Apply Effect
                  if (state.callbackId === 'enhance_mult') return { ...card, enhancement: 'Mult' as Enhancement };
                  if (state.callbackId === 'enhance_bonus') return { ...card, enhancement: 'Bonus' as Enhancement };
                  if (state.callbackId === 'enhance_wild') return { ...card, enhancement: 'Wild' as Enhancement };
                  if (state.callbackId === 'enhance_glass') return { ...card, enhancement: 'Glass' as Enhancement };
                  if (state.callbackId === 'enhance_steel') return { ...card, enhancement: 'Steel' as Enhancement };
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
    ? (lang === 'ZH' ? HAND_SCALING[handPreview.handType].labelZh : HAND_SCALING[handPreview.handType].label)
    : (lang === 'ZH' ? '高牌' : 'High Card');
  const handLevelVal = handPreview ? handPreview.level : 1;

  return (
    <div className="w-screen h-screen overflow-hidden bg-black flex items-center justify-center">
     <div 
        id="game-root"
        className="relative bg-[#2c3e50] text-white overflow-hidden flex flex-col font-mono selection:bg-red-500 selection:text-white shadow-2xl"
        style={{
            width: '1280px',
            height: '720px',
            transform: `scale(${scale})`, 
            transformOrigin: 'center center',
        }}
     >
      <div className={`swirl-bg ${!game.settings.enableMotion && 'hidden'}`}></div>
      {game.settings.enableCrt && ( <> <div className="crt-scanlines"></div> <div className="crt-flicker"></div> </> )}
      <div className="vignette"></div>

      {/* --- PACK OPENING OVERLAY --- */}
      {game.status === 'PACK_OPEN' && game.selectionState?.generatedCards && (
          <div className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center">
              <h2 className="text-5xl font-black text-white mb-8 uppercase">{t(lang, 'choose_card')}</h2>
              <div className="flex gap-8 justify-center items-center">
                  {game.selectionState.generatedCards.map((item, idx) => (
                      <div key={item.id} className="transform hover:scale-110 transition-transform cursor-pointer" onClick={() => selectPackCard(idx)}>
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
              <div className="mt-8 text-gray-400">{t(lang, 'skip')}? (Not Implemented)</div>
          </div>
      )}

      {/* --- SELECTION OVERLAY (Tarots) --- */}
      {game.selectionState?.mode === 'TAROT' && (
          <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-[90] flex flex-col items-center gap-4">
              <div className="bg-black/80 text-white px-8 py-4 rounded border-2 border-white text-2xl font-bold animate-pulse">
                  {t(lang, `select_target_${game.selectionState.maxSelect}`)} ({game.selectedCardIds.length}/{game.selectionState.maxSelect})
              </div>
              <div className="flex gap-4">
                  <button onClick={confirmTarotUse} disabled={game.selectedCardIds.length !== game.selectionState.maxSelect} className="bg-green-600 px-6 py-2 rounded font-bold disabled:opacity-50 border-2 border-black hover:bg-green-500">{t(lang, 'confirm_use')}</button>
                  <button onClick={cancelSelection} className="bg-red-600 px-6 py-2 rounded font-bold border-2 border-black hover:bg-red-500">{t(lang, 'close')}</button>
              </div>
          </div>
      )}

      {/* Main Game Rendering Logic (Mostly similar to before, but updated interactions) */}
      
      {/* 1. Menu */}
      {game.status === 'MENU' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-50">
            <div className="z-10 text-center transform scale-110">
                <h1 className="text-9xl mb-4 text-[#FE5F55] animate-pulse text-shadow-retro font-black tracking-tighter" style={{fontFamily: 'VT323'}}>BALATRO</h1>
                <div className="text-4xl mb-12 text-blue-300 text-shadow-retro tracking-widest">CN WEB VERSION</div>
                <button onClick={startGame} className="px-16 py-6 bg-orange-500 text-white text-4xl font-bold rounded shadow-[8px_8px_0_#000] hover:translate-y-1 hover:shadow-[4px_4px_0_#000] transition-all border-4 border-black">
                    {t(lang, 'start_game')}
                </button>
            </div>
             <button onClick={() => setShowRunInfo(true)} className="absolute top-4 left-4 px-4 py-2 bg-red-600 rounded border-2 border-black hover:bg-red-500 z-50 text-white font-bold shadow-md">📖 {t(lang, 'rules')}</button>
             <button onClick={() => setShowSettings(true)} className="absolute top-4 right-4 px-4 py-2 bg-gray-700 rounded border-2 border-black hover:bg-gray-600 z-50 text-white font-bold shadow-md">⚙️ {t(lang, 'settings')}</button>
          </div>
      )}

      {/* 2. Game Over */}
      {game.status === 'GAME_OVER' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-[100]">
            <h1 className="text-8xl text-red-600 font-bold mb-4 animate-pulse tracking-widest">{t(lang, 'game_over')}</h1>
            <p className="text-3xl mb-8 text-gray-400">Reached Ante {game.ante}</p>
            <button onClick={() => setGame({...INITIAL_STATE, settings: game.settings})} className="px-8 py-3 bg-white text-black text-2xl font-bold rounded hover:bg-gray-200 border-4 border-gray-500">{t(lang, 'try_again')}</button>
        </div>
      )}

      {/* 3. Cash Out */}
      {game.status === 'CASHOUT' && game.cashOutReport && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-[80] backdrop-blur-sm">
              <div className="bg-[#2c3e50] border-4 border-white p-12 rounded-xl shadow-2xl min-w-[600px] flex flex-col gap-6">
                  <h2 className="text-6xl font-black text-center text-orange-400 text-shadow-retro mb-8">{t(lang, 'cash_out')}</h2>
                  {game.cashOutReport.items.map((item, index) => (
                      <div key={index} className={`flex justify-between items-center text-3xl font-bold transition-opacity duration-500 ${index <= game.cashOutReport!.currentStep ? 'opacity-100' : 'opacity-0'}`}>
                          <div className="text-blue-300 uppercase">{t(lang, item.label)}</div>
                          <div className="flex items-center gap-4"><span className="text-white">{item.amount}</span><span className="text-yellow-400">$</span></div>
                      </div>
                  ))}
                  <div className="border-t-4 border-white my-4"></div>
                  <div className="flex justify-between items-center text-5xl font-black">
                      <div className="text-white">{t(lang, 'total')}</div>
                      <div className="text-yellow-400">${game.cashOutReport.total}</div>
                  </div>
                  {game.cashOutReport.currentStep >= game.cashOutReport.items.length && (
                       <button onClick={() => openShop(false)} className="mt-8 py-4 bg-[#44bd32] text-white text-4xl font-bold rounded border-4 border-black hover:bg-[#369627] animate-pulse shadow-[4px_4px_0_#000]">
                           {t(lang, 'to_shop')} ->
                       </button>
                  )}
              </div>
          </div>
      )}

      {/* 4. Blind Select */}
      {game.status === 'BLIND_SELECT' && (
         <div className="absolute inset-0 z-20 p-8 flex flex-col">
             <h2 className="text-5xl font-black text-center mb-8 text-shadow-retro text-white">{t(lang, 'select_blind')} - Ante {game.ante}</h2>
             <div className="flex gap-6 justify-center items-stretch flex-1 max-h-[60vh]">
                 {game.upcomingBlinds.map((blind, i) => (
                     <div key={blind.type} className={`flex-1 border-4 border-black p-6 flex flex-col items-center justify-between rounded-lg shadow-xl relative 
                        ${blind.type === 'Small' ? 'bg-[#009ddc]' : blind.type === 'Big' ? 'bg-[#f0932b]' : 'bg-[#c23616]'}
                     `}>
                        <div className="text-center">
                             <div className="text-3xl font-bold uppercase">{lang === 'ZH' ? blind.nameZh : blind.name}</div>
                             {blind.type === 'Boss' && (
                                 <div className="bg-black/40 p-2 rounded mt-2 text-sm text-yellow-300">
                                     {lang === 'ZH' ? BOSS_BLINDS.find(b => b.ability === blind.bossAbility)?.descriptionZh : BOSS_BLINDS.find(b => b.ability === blind.bossAbility)?.description}
                                 </div>
                             )}
                        </div>
                        <div className="text-6xl font-black my-4 text-white drop-shadow-md">{getBlindScore(blind, game.ante)}</div>
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
             {game.activeTags.length > 0 && (
                 <div className="absolute bottom-36 left-1/2 transform -translate-x-1/2 flex gap-2">
                     {game.activeTags.map((tag, i) => (
                         <div key={i} className={`px-3 py-1 rounded border border-white text-xs font-bold text-white ${tag.bgClass || 'bg-gray-600'}`}>
                             {lang === 'ZH' ? tag.nameZh : tag.name}
                         </div>
                     ))}
                 </div>
             )}
             <div className="mt-8 h-32 bg-black/40 rounded border-4 border-black flex items-center px-8 gap-4">
                 <div className="text-xl font-bold text-gray-400 mr-4">{t(lang, 'your_jokers')}:</div>
                 {game.jokers.map((j, i) => (
                     <div key={i} className="transform scale-75 origin-left"><JokerComponent joker={j} language={lang} /></div>
                 ))}
             </div>
         </div>
      )}

      {/* 5. Shop */}
      {game.status === 'SHOP' && (
         <div className="absolute inset-0 z-20 flex flex-col">
             <div className="flex justify-between items-center p-8 bg-black/60 backdrop-blur-md border-b-4 border-black">
                 <div className="text-6xl font-black text-[#f0932b] tracking-widest text-shadow-retro">{t(lang, 'shop')}</div>
                 <div className="bg-black p-4 rounded border-2 border-yellow-600">
                     <span className="text-yellow-500 text-4xl font-bold">${game.money}</span>
                 </div>
             </div>
             <div className="flex-1 flex flex-col items-center justify-center relative p-8">
                 <div className="flex gap-8 mb-8 p-8 bg-white/5 rounded-xl border-2 border-white/10 shadow-2xl w-full justify-center min-h-[280px] items-center">
                     {game.shopItems.length === 0 && <div className="text-2xl text-gray-500 font-bold">{t(lang, 'sold_out')}</div>}
                     {game.shopItems.map(item => (
                        <div key={item.id} className="transform hover:translate-y-[-5px] transition-transform">
                             {'rarity' in item ? (
                                 <JokerComponent joker={item as Joker} price={item.cost} onClick={() => buyItem(item)} language={lang}/>
                             ) : 'size' in item ? (
                                 // Pack Renderer
                                 <div className="w-32 h-48 bg-gray-800 border-4 border-gray-400 flex flex-col items-center p-2 cursor-pointer hover:bg-gray-700" onClick={() => buyItem(item as Pack)}>
                                     <div className="text-center font-bold text-white text-xs mt-2 h-8">{lang === 'ZH' ? (item as Pack).nameZh : (item as Pack).name}</div>
                                     <div className="flex-1 text-4xl flex items-center justify-center">📦</div>
                                     <div className="text-[10px] text-center text-gray-300 leading-tight mb-2">{lang === 'ZH' ? (item as Pack).descriptionZh : (item as Pack).description}</div>
                                     <div className="bg-yellow-400 text-black font-black px-2 rounded">${item.cost}</div>
                                 </div>
                             ) : (
                                 <ConsumableComponent item={item as Consumable} price={item.cost} canBuy={true} onClick={() => buyItem(item)} language={lang} />
                             )}
                        </div>
                     ))}
                 </div>

                 <div className="absolute bottom-36 left-12">
                     {game.shopVoucher ? (
                         <div className="w-32 h-48 bg-teal-800 border-4 border-teal-500 flex flex-col items-center p-2 cursor-pointer hover:scale-105 transition-transform" onClick={() => buyItem(game.shopVoucher!)}>
                             <div className="text-white font-bold text-center text-sm uppercase border-b border-teal-500 w-full pb-1">{lang === 'ZH' ? game.shopVoucher.nameZh : game.shopVoucher.name}</div>
                             <div className="flex-1 flex items-center justify-center text-4xl">🎟️</div>
                             <div className="text-[10px] text-center text-teal-200 leading-tight">{lang === 'ZH' ? game.shopVoucher.descriptionZh : game.shopVoucher.description}</div>
                             <div className="mt-2 bg-black text-white px-2 py-1 font-bold">${game.shopVoucher.cost}</div>
                         </div>
                     ) : (
                         <div className="w-32 h-48 border-4 border-white/10 flex items-center justify-center text-white/20 font-bold">EMPTY</div>
                     )}
                     <div className="text-center text-white/50 font-bold mt-2 uppercase tracking-widest text-xs">{t(lang, 'vouchers')}</div>
                 </div>
                 
                 {/* Reroll Button */}
                 <div className="absolute bottom-36 left-48">
                    <button onClick={rerollShop} className="w-32 h-24 bg-red-700 border-4 border-red-500 flex flex-col items-center justify-center hover:bg-red-600 shadow-lg">
                        <div className="text-white font-bold text-lg">{t(lang, 'reroll')}</div>
                        <div className="text-yellow-300 font-black text-2xl">${game.rerollCost}</div>
                    </button>
                 </div>

                 <div className="flex w-full justify-center gap-8 px-12 ml-32">
                    <div className="flex-1 max-w-[600px]">
                        <div className="text-sm uppercase mb-2 text-gray-400 font-bold">{t(lang, 'current_jokers')} ({game.jokers.length}/{MAX_JOKERS})</div>
                        <div className="flex gap-2 p-4 bg-black/40 rounded border-2 border-black min-h-[160px] items-center justify-center">
                             {game.jokers.map((joker, idx) => (
                                <div key={`${joker.id}-${idx}`} className="transform scale-90">
                                    <JokerComponent joker={joker} canSell={true} onSell={() => sellJoker(idx)} language={lang}/>
                                </div>
                             ))}
                        </div>
                    </div>
                    <div className="flex-1 max-w-[300px]">
                        <div className="text-sm uppercase mb-2 text-gray-400 font-bold">{t(lang, 'consumables')} ({game.consumables.length}/{MAX_CONSUMABLES})</div>
                        <div className="flex gap-2 p-4 bg-black/40 rounded border-2 border-black min-h-[160px] items-center justify-center">
                            {game.consumables.map((item, idx) => (
                                <div key={`${item.id}-${idx}`} className="transform scale-90">
                                    <ConsumableComponent item={item} onClick={() => useConsumable(idx)} language={lang} />
                                </div>
                             ))}
                        </div>
                    </div>
                 </div>
                 
                 <button onClick={finishShop} className="absolute bottom-8 right-8 px-12 py-4 bg-[#44bd32] text-white text-3xl font-bold rounded shadow-[0_8px_0_#1e5f12] hover:translate-y-1 hover:shadow-[0_4px_0_#1e5f12] active:translate-y-2 active:shadow-none transition-all border-4 border-black z-50">
                    {t(lang, 'next_round')}
                </button>
             </div>
         </div>
      )}

      {/* 6. Playing / Scoring / Victory */}
      {(game.status === 'PLAYING' || game.status === 'SCORING' || game.status === 'VICTORY') && (
        <div className="flex-1 flex flex-col w-full h-full relative z-10">
            <div className="absolute top-2 w-full flex justify-between px-4 z-[60]">
                 <button onClick={() => setShowRunInfo(true)} className="p-2 bg-red-600 text-white rounded border-2 border-black hover:bg-red-500 font-bold shadow-md text-sm">📖 {t(lang, 'rules')}</button>
                 <button onClick={() => setShowSettings(true)} className="p-2 bg-gray-700 text-white rounded border-2 border-black hover:bg-gray-600 font-bold shadow-md text-sm">⚙️ {t(lang, 'settings')}</button>
            </div>

            <div className="h-40 bg-black/30 flex items-center justify-between px-12 gap-4 relative z-20 backdrop-blur-sm border-b-4 border-black/50 pt-8">
                <div className="flex gap-2 items-center flex-1">
                    {game.jokers.length === 0 && <div className="text-white/20 font-bold text-xl italic tracking-widest">{t(lang, 'no_jokers')}</div>}
                    {game.jokers.map((joker, idx) => (
                        <div key={idx} className="transform scale-75 origin-top-left"><JokerComponent joker={joker} canSell={true} onSell={() => sellJoker(idx)} language={lang}/></div>
                    ))}
                </div>
                <div className="flex gap-2 items-center justify-end border-l-2 border-white/10 pl-8">
                    <div className="text-xs text-gray-400 font-bold uppercase mr-2 writing-vertical">{t(lang, 'consumables')}</div>
                    {Array.from({length: MAX_CONSUMABLES}).map((_, i) => {
                        const item = game.consumables[i];
                        return (
                            <div key={i} className="w-16 h-24 border-2 border-dashed border-white/20 rounded bg-black/20 flex items-center justify-center">
                                {item ? (
                                     <div className="transform scale-75"><ConsumableComponent item={item} onClick={() => useConsumable(i)} language={lang} /></div>
                                ) : (
                                    <div className="text-white/10 text-xs">EMPTY</div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="flex-1 flex relative z-10">
                <div className="w-64 bg-[#222]/90 flex flex-col p-4 border-r-4 border-black justify-between shadow-2xl backdrop-blur-md z-30">
                    <div>
                        <div className="bg-red-900/80 p-3 rounded border-4 border-red-600 mb-4 relative overflow-hidden group">
                            <div className="text-sm uppercase text-red-200 tracking-widest mb-1 font-bold">{t(lang, 'round_score')}</div>
                            <div className="text-4xl font-black text-white drop-shadow-md tracking-tighter tabular-nums">
                                {Math.floor(displayRoundScore).toLocaleString()}
                            </div>
                            <div className="text-xs text-red-200 mt-2 font-bold">{t(lang, 'target')}: {game.targetScore.toLocaleString()}</div>
                            <div className="w-full bg-black h-3 rounded-full mt-2 overflow-hidden border border-red-400/50">
                                <div className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-500 ease-out" style={{width: `${Math.min(100, (displayRoundScore / game.targetScore) * 100)}%`}}></div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center bg-blue-900/40 p-2 rounded border-2 border-blue-700">
                                <span className="text-blue-200 font-bold text-sm">{t(lang, 'hands')}</span>
                                <span className="text-2xl font-black text-blue-100">{game.handsLeft}</span>
                            </div>
                            <div className="flex justify-between items-center bg-orange-900/40 p-2 rounded border-2 border-orange-700">
                                <span className="text-orange-200 font-bold text-sm">{t(lang, 'discards')}</span>
                                <span className="text-2xl font-black text-orange-100">{game.discardsLeft}</span>
                            </div>
                            <div className="flex justify-between items-center bg-yellow-900/40 p-2 rounded border-2 border-yellow-600">
                                <span className="text-yellow-200 font-bold text-sm">{t(lang, 'money')}</span>
                                <span className="text-2xl font-black text-yellow-100">${game.money}</span>
                            </div>
                        </div>
                        <div className="mt-6 text-center bg-black/40 p-2 rounded border-2 border-gray-600">
                             <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">{t(lang, 'current_hand')}</div>
                             <div className="text-2xl font-black text-white mb-1 text-shadow-retro">{handLabel} <span className="text-sm text-blue-400">Lv.{handLevelVal}</span></div>
                             <div className="flex items-center justify-center gap-2 text-base font-bold">
                                 <span className="bg-[#009ddc] text-white px-2 rounded border border-black">{handPreview?.baseChips || 0}</span>
                                 <span className="text-gray-400">X</span>
                                 <span className="bg-[#FE5F55] text-white px-2 rounded border border-black">{handPreview?.baseMult || 0}</span>
                             </div>
                        </div>
                    </div>
                    <div className="text-center bg-black/50 py-2 rounded border border-white/10">
                        <div className="text-white/50 text-xs tracking-widest">{t(lang, 'ante')} <span className="text-orange-500 font-bold text-lg">{game.ante}</span></div>
                        <div className="text-white/50 text-xs tracking-widest">{t(lang, 'blind')} <span className="text-blue-300 font-bold text-lg">{lang === 'ZH' ? game.currentBlind?.nameZh : game.currentBlind?.name}</span></div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center relative">
                    {scoreDetails && (
                        <div className="absolute top-24 z-[200] flex flex-col items-center w-full pointer-events-none">
                            <div className="animate-score-float bg-[#222] border-4 border-white p-6 rounded-xl shadow-[0_0_0_4px_rgba(0,0,0,0.5)] text-center min-w-[300px]">
                                <div className="text-2xl text-gray-300 uppercase mb-2 font-bold tracking-widest border-b border-gray-600 pb-2">{handLabel}</div>
                                <div className="flex items-center justify-center gap-4 text-4xl font-black mb-2">
                                    <span className="text-[#009ddc] drop-shadow-[2px_2px_0_#000]">{scoreDetails.chips}</span>
                                    <span className="text-white text-2xl">X</span>
                                    <span className="text-[#FE5F55] drop-shadow-[2px_2px_0_#000]">{scoreDetails.mult}</span>
                                </div>
                                <div className="w-full h-1 bg-gray-600 my-2"></div>
                                <div className="text-6xl font-black text-white drop-shadow-[4px_4px_0_#000]">{scoreDetails.total.toLocaleString()}</div>
                            </div>
                        </div>
                    )}

                    <button onClick={toggleSort} className="absolute top-4 right-8 z-30 bg-black/40 px-3 py-1 border-2 border-white/30 text-xs font-bold hover:bg-black/60 transition-colors">
                        {game.settings.sortBy === 'RANK' ? t(lang, 'sort_rank') : t(lang, 'sort_suit')}
                    </button>

                    <div className="flex-1 flex items-center justify-center w-full px-4 pb-4">
                        <div className="flex -space-x-4 items-end justify-center h-48 w-full">
                            {game.hand.map((card, index) => (
                                <CardComponent
                                    key={card.id}
                                    card={card}
                                    index={index}
                                    selected={game.selectedCardIds.includes(card.id)}
                                    highlighted={game.selectionState?.mode === 'TAROT' && game.selectedCardIds.includes(card.id)}
                                    onClick={() => toggleCard(card.id)}
                                    onDrop={handleCardDrop}
                                    disabled={animating || card.animationState !== 'idle'}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="h-24 w-full bg-[#1a1a1a] flex items-center justify-center gap-8 border-t-4 border-black z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
                        <button
                            onClick={discardHand}
                            disabled={animating || game.selectedCardIds.length === 0 || game.discardsLeft <= 0 || game.selectionState !== undefined}
                            className={`px-8 py-3 rounded text-xl font-bold uppercase tracking-wider border-4 transition-all
                                ${game.discardsLeft > 0 && game.selectedCardIds.length > 0 && !game.selectionState ? 'bg-[#FE5F55] border-[#b33939] text-white hover:translate-y-[-2px] shadow-[0_4px_0_#7f2222]' : 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed opacity-50'}
                            `}
                        >
                            {t(lang, 'discard')}
                        </button>
                        <button
                            onClick={playHand}
                            disabled={animating || game.selectedCardIds.length === 0 || game.handsLeft <= 0 || game.selectionState !== undefined}
                            className={`px-12 py-4 rounded text-2xl font-bold uppercase tracking-widest border-4 transition-all
                                ${game.handsLeft > 0 && game.selectedCardIds.length > 0 && !game.selectionState ? 'bg-[#009ddc] border-[#005f85] text-white hover:translate-y-[-2px] shadow-[0_4px_0_#00425e] animate-pulse' : 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed opacity-50'}
                            `}
                        >
                            {t(lang, 'play')}
                        </button>
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