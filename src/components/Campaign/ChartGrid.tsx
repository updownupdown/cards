import { rgba, theme } from "@/styles/styles";
import { memo } from "react";
import { StyleSheet, View } from "react-native";

// A spiral galaxy needs room: 114 game dots three dot-diameters apart do not fit
// in a smaller world (see MAP_GEOMETRY in src/data/campaign-map.ts).
export const WORLD_SIZE = 1800;

/**
 * The chart's grid, after the old star atlases (Bayer's Uranometria): rings
 * around Klondike at the centre, crossed by lines through it. Drawn by the
 * Home starfield under the map, in the map's place and scale, so it can fade
 * in and out with the Odyssey tab. Plain views, like the map's links:
 * Android draws a map-sized SVG as one huge bitmap.
 */
const CHART_RING_STEP = 110;
const CHART_RING_COUNT = 8;
const CHART_SPOKES = 12;
const CHART_LINE = 0.9;

export const ChartGrid = memo(function ChartGrid() {
  const centre = WORLD_SIZE / 2;
  const reach = CHART_RING_STEP * CHART_RING_COUNT;
  const color = rgba(theme.ink, 0.12);
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
      {Array.from({ length: CHART_RING_COUNT }, (_, index) => {
        const radius = CHART_RING_STEP * (index + 1);
        return (
          <View
            key={`ring-${index}`}
            style={{
              position: "absolute",
              left: centre - radius,
              top: centre - radius,
              width: radius * 2,
              height: radius * 2,
              borderRadius: radius,
              borderWidth: CHART_LINE,
              // Every other ring a little stronger, as the atlases rule them.
              borderColor: index % 2 === 1 ? rgba(theme.ink, 0.18) : color,
            }}
          />
        );
      })}
      {/* Each spoke is a line right through the centre, so half as many. */}
      {Array.from({ length: CHART_SPOKES / 2 }, (_, index) => (
        <View
          key={`spoke-${index}`}
          style={{
            position: "absolute",
            left: centre - reach,
            top: centre - CHART_LINE / 2,
            width: reach * 2,
            height: CHART_LINE,
            backgroundColor: rgba(theme.ink, 0.08),
            transform: [{ rotate: `${(index * 360) / CHART_SPOKES}deg` }],
          }}
        />
      ))}
    </View>
  );
});
