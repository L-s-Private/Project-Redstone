// TikTok のギフトイベントを、ルール判定用の形にそろえる。
// ライブラリのバージョンによってフィールド名が違う（gift / giftDetails / extendedGiftInfo）ので両方読む。

// giftType 1 は連打できるギフト（コンボ）。連打中にも途中経過が届くので、終わったときだけ数える。
const STREAKABLE_GIFT_TYPE = 1;

/**
 * @returns {{kind: 'gift', giftId: string, giftName: string, diamonds: number, count: number, from: string, image: string} | null}
 *   連打の途中経過のときは null（まだ数えない）
 */
export function normalizeGift(msg) {
  const gift = msg.gift ?? {};
  const details = msg.giftDetails ?? {};
  const extended = msg.extendedGiftInfo ?? {};

  const giftType = gift.type ?? details.giftType ?? extended.type;
  if (giftType === STREAKABLE_GIFT_TYPE && !msg.repeatEnd) {
    return null;
  }

  return {
    kind: 'gift',
    giftId: String(msg.giftId ?? gift.id ?? ''),
    giftName: gift.name || details.giftName || extended.name || '',
    diamonds: Number(gift.diamondCount ?? details.diamondCount ?? extended.diamond_count ?? 0),
    count: Math.max(1, Number(msg.repeatCount) || 1),
    from: displayName(msg.user),
    image: details.giftImage?.url?.[0] || gift.image?.url_list?.[0] || extended.image?.url_list?.[0] || '',
  };
}

/** いいね。回数はまとめて届く（1回のイベントで複数回分）。今の形は count、古い形は likeCount */
export function normalizeLike(msg) {
  return { kind: 'like', count: Math.max(0, Number(msg.count ?? msg.likeCount) || 0), from: displayName(msg.user) };
}

/** コメント。user: 同じ人かを見分ける ID（名前は変えられるため） */
export function normalizeComment(msg) {
  return { kind: 'comment', text: String(msg.comment ?? '').slice(0, 200), from: displayName(msg.user), user: msg.user?.userId ? String(msg.user.userId) : msg.user?.uniqueId ?? '' };
}

export function normalizeSocial(kind, msg) {
  return { kind, from: displayName(msg.user) };
}

function displayName(user) {
  return user?.nickname || user?.displayId || user?.uniqueId || '';
}
