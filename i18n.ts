
export const TRANSLATIONS = {
  ZH: {
    // Common
    start_game: "开始游戏",
    rules: "规则",
    settings: "设置",
    game_over: "游戏结束",
    try_again: "重试",
    close: "关闭",
    ok: "确认",
    language: "语言 (Language)",
    
    // Blinds
    select_blind: "选择盲注",
    small_blind: "小盲注",
    big_blind: "大盲注",
    boss_blind: "Boss 盲注",
    select: "选择",
    skip: "跳过",
    reward: "奖励",
    ability: "能力",
    blind: "盲注",
    ante: "底注",
    blind_reward: "盲注奖励",

    // Shop & Inventory
    shop: "商店",
    sold_out: "已售罄",
    current_jokers: "当前持有",
    consumables: "消耗牌",
    vouchers: "优惠券",
    your_jokers: "你的小丑牌",
    no_jokers: "无小丑牌",
    buy: "购买",
    sell: "出售",
    redeem: "兑换",
    use: "使用",
    next_round: "下一注",
    to_shop: "前往商店",
    reroll: "重随",
    pack_open: "打开",
    choose_card: "选择一张卡牌",
    
    // Interactions
    select_target_2: "选择 2 张卡牌",
    select_target_1: "选择 1 张卡牌",
    confirm_use: "确认使用",
    
    // Game Stats
    round_score: "回合分数",
    target: "目标",
    hands: "出牌次数",
    discards: "弃牌次数",
    money: "金钱",
    current_hand: "当前牌型",
    play: "出牌",
    discard: "弃牌",
    sort_rank: "排序: 点数",
    sort_suit: "排序: 花色",
    hand: "牌型",
    chips: "筹码",
    mult: "倍率",
    level_up: "等级提升!",
    
    // Cash Out
    cash_out: "结算",
    hands_left: "剩余出牌",
    discards_left: "剩余弃牌",
    interest: "利息",
    total: "合计",

    // Settings
    master_volume: "主音量",
    music_volume: "音乐音量",
    crt_effects: "CRT 特效",
    motion: "背景动画",
    
    // Rarities & Types
    rarity_Common: "普通",
    rarity_Uncommon: "罕见",
    rarity_Rare: "稀有",
    rarity_Legendary: "传奇",
    type_Planet: "星球牌",
    type_Tarot: "塔罗牌",
    type_Arcana: "奥秘包",
    type_Celestial: "天体包",
    type_Standard: "标准包",
    type_Buffoon: "小丑包",

    // Tags
    tag_uncommon: "下一次商店出现罕见小丑",
    tag_rare: "下一次商店出现稀有小丑",
    tag_coupon: "下一次商店物品免费",
    tag_handy: "下一次出牌 +1 级",
    tag_garbage: "下一次商店刷新免费",
    tag_investment: "获得 $15",
    tag_speed: "跳过盲注获得 $5",
  },
  EN: {
    // Common
    start_game: "PLAY",
    rules: "Rules",
    settings: "Settings",
    game_over: "GAME OVER",
    try_again: "Try Again",
    close: "Close",
    ok: "OK",
    language: "Language (语言)",
    
    // Blinds
    select_blind: "SELECT BLIND",
    small_blind: "Small Blind",
    big_blind: "Big Blind",
    boss_blind: "Boss Blind",
    select: "Select",
    skip: "Skip",
    reward: "Reward",
    ability: "ABILITY",
    blind: "BLIND",
    ante: "ANTE",
    blind_reward: "Blind Reward",

    // Shop & Inventory
    shop: "SHOP",
    sold_out: "SOLD OUT",
    current_jokers: "Current Loadout",
    consumables: "Consumables",
    vouchers: "Vouchers",
    your_jokers: "Your Jokers",
    no_jokers: "NO JOKERS",
    buy: "Buy",
    sell: "Sell",
    redeem: "Redeem",
    use: "USE",
    next_round: "Next Round",
    to_shop: "To Shop",
    reroll: "Reroll",
    pack_open: "OPEN",
    choose_card: "Choose a card",
    
    // Interactions
    select_target_2: "Select 2 cards",
    select_target_1: "Select 1 card",
    confirm_use: "CONFIRM",
    
    // Game Stats
    round_score: "Round Score",
    target: "Target",
    hands: "Hands",
    discards: "Discards",
    money: "Money",
    current_hand: "Current Hand",
    play: "Play",
    discard: "Discard",
    sort_rank: "Sort: Rank",
    sort_suit: "Sort: Suit",
    hand: "Hand",
    chips: "Chips",
    mult: "Mult",
    level_up: "LEVEL UP!",
    
    // Cash Out
    cash_out: "CASH OUT",
    hands_left: "Hands Left",
    discards_left: "Discards Left",
    interest: "Interest",
    total: "Total",

    // Settings
    master_volume: "Master Volume",
    music_volume: "Music Volume",
    crt_effects: "CRT Effects",
    motion: "Motion",
    
    // Rarities & Types
    rarity_Common: "Common",
    rarity_Uncommon: "Uncommon",
    rarity_Rare: "Rare",
    rarity_Legendary: "Legendary",
    type_Planet: "Planet",
    type_Tarot: "Tarot",
    type_Arcana: "Arcana Pack",
    type_Celestial: "Celestial Pack",
    type_Standard: "Standard Pack",
    type_Buffoon: "Buffoon Pack",

    // Tags
    tag_uncommon: "Next shop has Uncommon Joker",
    tag_rare: "Next shop has Rare Joker",
    tag_coupon: "Initial cards in next shop are free",
    tag_handy: "Level up next hand played",
    tag_garbage: "Free rerolls next shop",
    tag_investment: "Gain $15",
    tag_speed: "Gain $5 per skipped blind",
  }
};

export type Language = 'ZH' | 'EN';

export const t = (lang: Language, key: string) => {
  const k = key as keyof typeof TRANSLATIONS['EN'];
  return TRANSLATIONS[lang][k] || key;
};
