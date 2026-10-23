package com.staticarc.game;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;

/**
 * 地面に落ちているアイテム（1つのかたまり）のうち、何個が「数えてよいもの」かの台帳。
 * 採掘で落ちたもの（MINING）とギフトの支援で出したもの（SUPPORT）を分けて持つ。
 * かたまりどうしがくっついたら数えてよい数も移し、拾ったら拾えた数だけ進み具合にする。
 * かたまりの実際の数より多くはならない（clamp）。ほかの出どころ（持ち物・チェスト・自分で捨てたものなど）は台帳に入らないので数えない。
 * Minecraft に依存しないので単体テストできる（K はアイテムのかたまり）。
 */
public final class DropLedger<K> {

    /** 1つのかたまりの、数えてよい数 */
    private static final class Entry {
        int mined;
        int support;

        int total() {
            return mined + support;
        }
    }

    /** 拾ったときに進み具合へ足す数 */
    public record Credit(int mined, int support) {
        public static final Credit NONE = new Credit(0, 0);

        public int total() {
            return mined + support;
        }
    }

    private final Map<K, Entry> entries = new HashMap<>();

    /** 落ちたかたまりを台帳に入れる（同じかたまりなら足す） */
    public void add(K key, MiningChallenge.Source source, int count) {
        if (count <= 0) {
            return;
        }
        Entry entry = entries.computeIfAbsent(key, k -> new Entry());
        if (source == MiningChallenge.Source.SUPPORT) {
            entry.support += count;
        } else {
            entry.mined += count;
        }
    }

    /**
     * source のかたまりから target のかたまりへ moved 個くっついた。数えてよい数も、動いた数までだけ移す（採掘の分から先に）。
     * 数えてよいものとそうでないものがくっついても、かたまり全部を数えてよいことにはしない
     */
    public void merge(K target, K source, int moved) {
        Entry from = entries.get(source);
        if (from == null || moved <= 0) {
            return;
        }
        int minedMoved = Math.min(from.mined, moved);
        int supportMoved = Math.min(from.support, moved - minedMoved);
        from.mined -= minedMoved;
        from.support -= supportMoved;
        if (from.total() == 0) {
            entries.remove(source);
        }
        if (minedMoved > 0) {
            add(target, MiningChallenge.Source.MINING, minedMoved);
        }
        if (supportMoved > 0) {
            add(target, MiningChallenge.Source.SUPPORT, supportMoved);
        }
    }

    /**
     * かたまりから taken 個拾った。数えてよい数・拾えた数のうち小さいほうを返し、台帳から減らす（採掘の分から先に）。
     * 一度返した分は二度と返さない
     */
    public Credit pickup(K key, int taken) {
        Entry entry = entries.get(key);
        if (entry == null || taken <= 0) {
            return Credit.NONE;
        }
        int mined = Math.min(entry.mined, taken);
        int support = Math.min(entry.support, taken - mined);
        entry.mined -= mined;
        entry.support -= support;
        if (entry.total() == 0) {
            entries.remove(key);
        }
        return new Credit(mined, support);
    }

    /** かたまりの実際の数（ホッパーに吸われた・一部だけ拾われたなど）より多ければ減らす（支援の分から先に） */
    public void clamp(K key, int stackCount) {
        Entry entry = entries.get(key);
        if (entry == null) {
            return;
        }
        int over = entry.total() - Math.max(0, stackCount);
        if (over > 0) {
            int fromSupport = Math.min(entry.support, over);
            entry.support -= fromSupport;
            entry.mined -= over - fromSupport;
        }
        if (entry.total() <= 0) {
            entries.remove(key);
        }
    }

    /** 消えた（時間で消えた・燃えた・拾われた）かたまりを台帳から外す。拾われていない分は数えない */
    public void removeIf(Predicate<K> gone) {
        entries.keySet().removeIf(gone);
    }

    public void remove(K key) {
        entries.remove(key);
    }

    public void clear() {
        entries.clear();
    }

    /** 台帳にあるかたまり（写し） */
    public Set<K> keys() {
        return Set.copyOf(entries.keySet());
    }

    public boolean contains(K key) {
        return entries.containsKey(key);
    }

    /** 台帳にあるかたまりの数 */
    public int size() {
        return entries.size();
    }

    /** まだ拾われていない、数えてよいものの合計 */
    public int pending() {
        int sum = 0;
        for (Entry entry : entries.values()) {
            sum += entry.total();
        }
        return sum;
    }
}
