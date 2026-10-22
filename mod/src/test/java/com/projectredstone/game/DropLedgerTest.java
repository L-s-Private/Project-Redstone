package com.projectredstone.game;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static com.projectredstone.game.MiningChallenge.Source.MINING;
import static com.projectredstone.game.MiningChallenge.Source.SUPPORT;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class DropLedgerTest {

    @Test
    void 台帳にないかたまりは数えない() {
        DropLedger<String> ledger = new DropLedger<>();
        // 持ち物・チェスト・自分で捨てたものは台帳に入らない
        assertEquals(0, ledger.pickup("thrown", 5).total());
    }

    @Test
    void 拾えた数だけ一度だけ数える() {
        DropLedger<String> ledger = new DropLedger<>();
        ledger.add("a", MINING, 3);
        // 持ち物がいっぱいで2個だけ拾えた
        assertEquals(new DropLedger.Credit(2, 0), ledger.pickup("a", 2));
        assertEquals(1, ledger.pending());
        assertEquals(new DropLedger.Credit(1, 0), ledger.pickup("a", 5), "数えてよい数より多くは数えない");
        assertEquals(0, ledger.pickup("a", 1).total(), "二度数えない");
        assertEquals(0, ledger.size());
    }

    @Test
    void くっついても数えてよい数は増えも減りもしない() {
        DropLedger<String> ledger = new DropLedger<>();
        ledger.add("a", MINING, 2);
        ledger.add("b", MINING, 3);
        ledger.merge("b", "a", 2);
        assertFalse(ledger.contains("a"));
        assertEquals(5, ledger.pending());
        assertEquals(5, ledger.pickup("b", 5).mined());
    }

    @Test
    void 数えてよいものとそうでないものがくっついても_全部は数えない() {
        DropLedger<String> ledger = new DropLedger<>();
        ledger.add("mined", MINING, 2);
        // 自分で捨てた5個（台帳にない）に、採掘で落ちた2個がくっつく → 7個のかたまり、数えてよいのは2個
        ledger.merge("thrown", "mined", 2);
        assertEquals(2, ledger.pickup("thrown", 7).total());
        // 逆向き: 台帳にない5個が、採掘の2個のかたまりにくっつく
        ledger.add("mined2", MINING, 2);
        ledger.merge("mined2", "thrown2", 5);
        assertEquals(2, ledger.pickup("mined2", 7).total());
    }

    @Test
    void 一部だけくっついたら_動いた数までしか移さない() {
        DropLedger<String> ledger = new DropLedger<>();
        ledger.add("a", MINING, 10);
        ledger.merge("b", "a", 4);
        assertEquals(4, ledger.pickup("b", 64).total());
        assertEquals(6, ledger.pickup("a", 64).total());
    }

    @Test
    void 採掘と支援は分けて数える() {
        DropLedger<String> ledger = new DropLedger<>();
        ledger.add("a", MINING, 2);
        ledger.add("b", SUPPORT, 3);
        ledger.merge("a", "b", 3);
        DropLedger.Credit credit = ledger.pickup("a", 4);
        assertEquals(2, credit.mined(), "採掘の分から先に");
        assertEquals(2, credit.support());
        assertEquals(new DropLedger.Credit(0, 1), ledger.pickup("a", 1));
    }

    @Test
    void 実際の数より多ければ減らし_消えたら数えない() {
        DropLedger<String> ledger = new DropLedger<>();
        ledger.add("a", MINING, 4);
        ledger.add("a", SUPPORT, 2);
        // ホッパーに3個吸われて、かたまりは3個になった
        ledger.clamp("a", 3);
        assertEquals(3, ledger.pending());
        assertEquals(new DropLedger.Credit(3, 0), ledger.pickup("a", 3), "支援の分から先に減らす");

        ledger.add("despawned", MINING, 5);
        ledger.add("kept", MINING, 1);
        Set<String> gone = Set.of("despawned");
        ledger.removeIf(gone::contains);
        assertEquals(1, ledger.pending());
        assertEquals(0, ledger.pickup("despawned", 5).total());
    }
}
