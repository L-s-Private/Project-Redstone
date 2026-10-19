// ギフトやフォローを、どの妨害にするか決める。config.json の rules を上から順に見て、最初に合ったものを使う。
// いいねのルール（likes）だけは別扱いで、いいねが指定回数たまるたびに出す（dispatcher.js）。

export const ACTION_TYPES = ['tnt', 'mob', 'message', 'fill_expand', 'fill_shrink', 'fill_help'];
export const SOCIAL_EVENTS = ['follow', 'share'];

// MOD 側の上限（docs/protocol.md）。ここでも丸めて、ログの数が実際に出る数と合うようにする
const MAX_COUNT_BY_TYPE = { tnt: 20, mob: 10, message: 1, fill_expand: 5, fill_shrink: 5, fill_help: 64 };

export function matches(rule, event) {
  if (rule.event !== undefined) {
    return event.kind === rule.event;
  }
  if (event.kind !== 'gift') {
    return false;
  }
  if (rule.gift !== undefined) {
    return event.giftName.toLowerCase() === String(rule.gift).toLowerCase();
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
export function findRuleIndex(rules, event) {
  return rules.findIndex((rule) => matches(rule, event));
}

/**
 * ルールとイベントから、MOD に送る要求を作る。
 * ギフトを5個連打したら count も5倍にする。いいねは、たまった回数（event.count）だけ掛ける。
 */
export function buildAction(rule, event) {
  const perEvent = rule.count ?? 1;
  const multiplier = event.kind === 'gift' || event.kind === 'like' ? event.count : 1;
  const action = {
    type: rule.action,
    count: Math.min(perEvent * multiplier, rule.maxCount ?? Infinity, MAX_COUNT_BY_TYPE[rule.action]),
    from: event.from,
  };
  if (rule.mob !== undefined) action.mob = rule.mob;
  if (rule.label !== undefined) action.label = rule.label;
  return action;
}

export function describeEvent(event) {
  const who = event.from ? `${event.from}さん` : '誰か';
  switch (event.kind) {
    case 'gift':
      return `${who}から ${event.giftName || `ギフト#${event.giftId}`} ×${event.count}`;
    case 'follow':
      return `${who}がフォロー`;
    case 'share':
      return `${who}がシェア`;
    case 'like':
      return `いいね ${event.likes}回`;
    default:
      return `${who}: ${event.kind}`;
  }
}
