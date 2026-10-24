package com.staticarc.game;

import java.util.List;

/**
 * 埋め立ての地層。枠の高さを下から層に分け、層ごとに置かれるブロックを変える（置いたブロック・お助けのブロックが、その段の層のブロックになる）。
 * いちばん上の層は、残りの段すべて（枠を高くする妨害で段が増えても、上の層が続く）。Minecraft に依存しないので単体テストできる
 */
public final class FillLayers {
    /** 層の数の上限 */
    public static final int MAX_LAYERS = 6;
    /** 1つの層の段数の上限（枠の高さの上限と同じ） */
    public static final int MAX_ROWS = FillGame.MAX_HEIGHT;

    /** 1つの層。block はブロックの名前、rows は段数（いちばん上の層では使わない） */
    public record Layer(String block, int rows) {
    }

    private FillLayers() {
    }

    /**
     * 下から row 段目（いちばん下が 0）が、下から何番目の層か。
     * 層が無ければ 0。枠より下（row が負）なら 0、どの層の段数も越えたら、いちばん上の層
     */
    public static int layerAt(List<Layer> layers, int row) {
        if (layers.isEmpty() || row < 0) {
            return 0;
        }
        int top = 0;
        for (int i = 0; i < layers.size() - 1; i++) {
            top += layers.get(i).rows();
            if (row < top) {
                return i;
            }
        }
        return layers.size() - 1;
    }
}
