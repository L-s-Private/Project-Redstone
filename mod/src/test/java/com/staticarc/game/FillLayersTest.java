package com.staticarc.game;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class FillLayersTest {

    private static final List<FillLayers.Layer> IRON_GOLD_DIAMOND = List.of(
            new FillLayers.Layer("iron_block", 3),
            new FillLayers.Layer("gold_block", 3),
            new FillLayers.Layer("diamond_block", 3));

    @Test
    void picksTheLayerForEachRowFromTheBottom() {
        assertEquals(0, FillLayers.layerAt(IRON_GOLD_DIAMOND, 0));
        assertEquals(0, FillLayers.layerAt(IRON_GOLD_DIAMOND, 2));
        assertEquals(1, FillLayers.layerAt(IRON_GOLD_DIAMOND, 3));
        assertEquals(1, FillLayers.layerAt(IRON_GOLD_DIAMOND, 5));
        assertEquals(2, FillLayers.layerAt(IRON_GOLD_DIAMOND, 6));
    }

    @Test
    void topLayerTakesTheRestEvenWhenTheFrameIsRaised() {
        assertEquals(2, FillLayers.layerAt(IRON_GOLD_DIAMOND, 8));
        assertEquals(2, FillLayers.layerAt(IRON_GOLD_DIAMOND, 29), "枠を高くして段が増えても、いちばん上の層が続く");
    }

    @Test
    void lowerLayersTallerThanTheFrameHideTheUpperOnes() {
        List<FillLayers.Layer> tall = List.of(new FillLayers.Layer("iron_block", 20), new FillLayers.Layer("gold_block", 1));
        assertEquals(0, FillLayers.layerAt(tall, 8), "高さ9の枠なら、全部いちばん下の層");
    }

    @Test
    void noLayersOrBelowTheFloorIsTheFirst() {
        assertEquals(0, FillLayers.layerAt(List.of(), 4));
        assertEquals(0, FillLayers.layerAt(IRON_GOLD_DIAMOND, -1));
    }
}
