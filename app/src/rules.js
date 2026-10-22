// ギフトやフォローを、どの妨害にするか決める。並び順には頼らない:
// 名前（か ID）で決めたギフトがいちばん先。なければ「コイン数で」のうち、いちばん大きい数のもの。同じなら上のもの。
// いいねのルール（likes）だけは別扱いで、いいねが指定回数たまるたびに出す（dispatcher.js）。
// 条件（when・minRound）のあるルールは、埋め立ての状況が合うときだけ当てはまり、合えば条件のないルールより先になる。
// action が random のルールは、choices の中から1つを抽選して出す（重み weight・同じものを続けない noRepeat）。

export const ACTION_TYPES = ['tnt', 'mob', 'message', 'fill_expand', 'fill_shrink', 'fill_help',
  'jail', 'freeze', 'fill_layer', 'fill_clear', 'lightning', 'levitate', 'night', 'fill_raise', 'mining_bonus_drop'];
export const SOCIAL_EVENTS = ['follow', 'share'];
/** いくつかの妨害から1つを抽選するルールの action */
export const RANDOM_ACTION = 'random';
/** 抽選の候補の数と、出やすさ（重み）の上限 */
export const MAX_CHOICES = 6;
export const MAX_WEIGHT = 10;
/** 条件 when: 埋めている途中（filling）/ 埋めきってカウントダウン中（countdown）。MOD の ping の fill.phase と同じ名前 */
export const WHEN_PHASES = ['filling', 'countdown'];

/**
 * ルールの条件が、今の埋め立ての状況に合うか。条件がなければいつでも合う。
 * @param {{phase: string, round: number} | null} game MOD の ping の fill（round はクリアしたラウンドの数）
 */
export function conditionHolds(rule, game) {
  if (!hasCondition(rule)) return true;
  if (!game || !WHEN_PHASES.includes(game.phase)) return false;
  if (rule.when !== undefined && game.phase !== rule.when) return false;
  if (rule.minRound !== undefined && (game.round ?? 0) + 1 < rule.minRound) return false;
  return true;
}

export function hasCondition(rule) {
  return rule.when !== undefined || rule.minRound !== undefined;
}

// MOD 側の上限（docs/protocol.md）。ここでも丸めて、ログの数が実際に出る数と合うようにする
// 逮捕・操作禁止・浮遊・夜の count は秒、一段埋め・枠を高くするは段
export const MAX_COUNT_BY_TYPE = {
  tnt: 20, mob: 10, message: 1, fill_expand: 5, fill_shrink: 5, fill_help: 64,
  jail: 60, freeze: 30, fill_layer: 5, fill_clear: 1, lightning: 10, levitate: 15, night: 300, fill_raise: 5,
  mining_bonus_drop: 16,
};

/** コメントの言葉の長さの上限 */
export const MAX_COMMENT_WORD = 30;
/** 同じ人のコメントで、同じルールを出せる間隔（荒らし対策） */
export const COMMENT_VIEWER_COOLDOWN_SEC = 30;

/** コメントの言葉をそろえる（全角半角・大文字小文字・ひらがなカタカナ・空白を気にしない） */
export function foldComment(text) {
  return String(text ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, '')
    .replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

// ギフトの値段（minDiamonds・diamonds）は、視聴者が払うコインの数。TikTok の diamond_count がそのまま入る
export function matches(rule, event, game = null) {
  if (!conditionHolds(rule, game)) {
    return false;
  }
  if (rule.event !== undefined) {
    return event.kind === rule.event;
  }
  if (rule.comment !== undefined) {
    // コメントがその言葉だけのとき（文の中に入っているだけでは出さない）
    return event.kind === 'comment' && foldComment(event.text) === foldComment(rule.comment);
  }
  if (event.kind !== 'gift') {
    return false;
  }
  if (rule.gift !== undefined) {
    // ギフト名は日本語・英語のどちらで書いてあっても合わせる（giftNameJa はギフト一覧から engine が足す）
    const name = String(rule.gift).toLowerCase();
    return event.giftName.toLowerCase() === name || (event.giftNameJa ?? '').toLowerCase() === name;
  }
  if (rule.giftId !== undefined) {
    return event.giftId === String(rule.giftId);
  }
  if (rule.minDiamonds !== undefined) {
    return event.diamonds >= rule.minDiamonds;
  }
  return false;
}

/** @returns {number} 合ったルールの番号。なければ -1 */
export function findRuleIndex(rules, event, game = null) {
  let best = -1;
  rules.forEach((rule, i) => {
    if (!matches(rule, event, game)) return;
    if (best === -1 || isBetter(rule, rules[best])) best = i;
  });
  return best;
}

/** 両方に当てはまるとき、rule のほうを先にするか（同じなら上のルールのまま） */
function isBetter(rule, current) {
  // 条件があって、それに合っているルールが先
  if (hasCondition(rule) !== hasCondition(current)) return hasCondition(rule);
  // コイン数のルールより、名前で決めたルール。コイン数どうしなら大きい数
  const byCoins = (r) => r.minDiamonds !== undefined;
  if (byCoins(rule) !== byCoins(current)) return !byCoins(rule);
  if (byCoins(rule) && rule.minDiamonds !== current.minDiamonds) return rule.minDiamonds > current.minDiamonds;
  // 「何ラウンド目から」は、後のラウンドからのほうが先
  return (rule.minRound ?? 0) > (current.minRound ?? 0);
}

/**
 * 抽選するルールで、どの候補を出すか。
 * @param {number | undefined} last 前に出した候補の番号（noRepeat のとき、これは選ばない）
 * @param {() => number} random 0以上1未満
 * @returns {number} choices の番号
 */
export function pickChoice(rule, last, random = Math.random) {
  const candidates = rule.choices.map((choice, i) => ({ i, weight: choice.weight ?? 1 }))
    .filter(({ i }) => !(rule.noRepeat && rule.choices.length > 1 && i === last));
  const total = candidates.reduce((sum, c) => sum + c.weight, 0);
  let r = random() * total;
  for (const c of candidates) {
    r -= c.weight;
    if (r < 0) return c.i;
  }
  return candidates.at(-1).i;
}

/**
 * ルールとイベントから、MOD に送る要求を作る。
 * ギフトを5個連打したら count も5倍にする。いいねは、たまった回数（event.count）だけ掛ける。
 * 抽選するルールは、choice（choices の1つ）の妨害を出す。出す文（label）と上限（maxCount）はルールのもの。
 */
export function buildAction(rule, event, choice = rule) {
  const perEvent = choice.count ?? 1;
  const multiplier = event.kind === 'gift' || event.kind === 'like' ? event.count : 1;
  const action = {
    type: choice.action,
    count: Math.min(perEvent * multiplier, rule.maxCount ?? Infinity, MAX_COUNT_BY_TYPE[choice.action]),
    from: event.from,
  };
  if (choice.mob !== undefined) action.mob = choice.mob;
  if (rule.label !== undefined) action.label = rule.label;
  return action;
}

export function describeEvent(event) {
  const who = event.from ? `${event.from}さん` : '誰か';
  switch (event.kind) {
    case 'gift':
      return `${who}から ${event.giftNameJa || event.giftName || `ギフト#${event.giftId}`} ×${event.count}`;
    case 'follow':
      return `${who}がフォロー`;
    case 'share':
      return `${who}がシェア`;
    case 'like':
      return `いいね ${event.likes}回`;
    case 'comment':
      return `${who}のコメント「${event.text}」`;
    default:
      return `${who}: ${event.kind}`;
  }
}
