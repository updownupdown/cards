import {
  STAR_DOT_SCALE,
  STAR_TINTS,
  starsInStrokeOrder,
  starTints,
} from "@/components/TaoReveal/timeline";
import type { Constellation } from "@/data/tao-constellations";
import { rgba, theme } from "@/styles/styles";
import { memo, useMemo } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import {
  dustLayers,
  figureDust,
  figureSegments,
  GLOW_COLOR,
  STAR_COLOR,
} from "./figure";

/**
 * A chapter's constellation coming into being: the minor stars fade in, the
 * named stars light up in the pen's order, then the lines are drawn. Every
 * step is a CSS animation, so nothing runs per frame on the JS thread and
 * the page can scroll freely meanwhile.
 */

/** When the figure is complete, in ms after mount. */
export const BLOOM_MS = 2000;

const DUST_GROUPS = 4;
const DUST_START = 100;
const DUST_STEP = 260;
const DUST_FADE = 900;
const STARS_START = 150;
const STARS_SPREAD = 850;
const STAR_POP = 520;
const LINES_START = 1050;

const FADE_IN = { from: { opacity: 0 }, to: { opacity: 1 } };
const STAR_IN = {
  from: { opacity: 0, transform: [{ scale: 0.2 }] },
  "60%": { opacity: 1, transform: [{ scale: 1.3 }] },
  to: { opacity: 1, transform: [{ scale: 1 }] },
};
const TWINKLE = {
  from: { opacity: 1, transform: [{ scale: 1 }] },
  to: { opacity: 0.7, transform: [{ scale: 0.86 }] },
};
const DRAW = {
  from: { transform: [{ scaleX: 0 }] },
  to: { transform: [{ scaleX: 1 }] },
};

const ms = (value: number) => `${Math.round(value)}ms` as const;

type Props = {
  constellation: Constellation;
  size: number;
  dustCount: number;
};

export const ConstellationBloom = memo(function ConstellationBloom({
  constellation,
  size,
  dustCount,
}: Props) {
  const scale = size / 100;
  const dustGroups = useMemo(() => {
    const dust = figureDust(constellation, dustCount);
    return Array.from({ length: DUST_GROUPS }, (_, group) =>
      dustLayers(
        dust.filter((_, index) => index % DUST_GROUPS === group),
        size,
      ),
    );
  }, [constellation, dustCount, size]);

  const stars = useMemo(() => {
    const order = starsInStrokeOrder(constellation);
    const tints = starTints(constellation);
    const dotScale = Math.min(1.1, Math.max(0.75, size / 480));
    return order.map((id, rank) => {
      const star = constellation.stars[id];
      // A steady third of the stars shine brighter.
      const bright = (id * 7 + constellation.chapter * 13) % 3 === 0;
      return {
        id,
        x: star.x * scale,
        y: star.y * scale,
        dot:
          STAR_DOT_SCALE *
          (2.2 + star.mag * 1.5) *
          dotScale *
          (bright ? 1.3 : 1),
        bright,
        color: STAR_TINTS[tints[id]],
        delay:
          STARS_START + (rank / Math.max(order.length - 1, 1)) * STARS_SPREAD,
        // Each star breathes at its own pace once the figure is drawn.
        twinkleMs: 1700 + ((id * 577 + constellation.chapter * 131) % 1500),
        twinkleDelay: BLOOM_MS + ((id * 389) % 1200),
      };
    });
  }, [constellation, scale, size]);

  const edges = useMemo(() => {
    const segments = figureSegments(
      constellation,
      size,
      Math.max(3, size * 0.012),
    );
    const total = segments.reduce((sum, segment) => sum + segment.length, 0);
    // One pen at a steady speed, finishing as the bloom does.
    const msPerPx = (BLOOM_MS - LINES_START) / Math.max(total, 1);
    let pen = LINES_START;
    return segments.map((segment) => {
      const drawMs = segment.length * msPerPx;
      const edge = {
        ...segment,
        angle: Math.atan2(segment.y2 - segment.y1, segment.x2 - segment.x1),
        delay: pen,
        drawMs,
      };
      pen += drawMs;
      return edge;
    });
  }, [constellation, size]);

  return (
    <View style={{ width: size, height: size }}>
      {dustGroups.map((layers, group) => (
        <Animated.View
          key={`dust-${group}`}
          style={{
            position: "absolute",
            inset: 0,
            animationName: FADE_IN,
            animationDuration: ms(DUST_FADE),
            animationDelay: ms(DUST_START + group * DUST_STEP),
            animationFillMode: "both",
            animationTimingFunction: "ease-in-out",
          }}
        >
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {layers.map((layer, index) => (
              <Path
                key={index}
                d={layer.d}
                fill={STAR_COLOR}
                fillOpacity={layer.opacity}
              />
            ))}
          </Svg>
        </Animated.View>
      ))}

      {edges.map((edge, index) => (
        <View
          key={`edge-${index}`}
          style={{
            position: "absolute",
            left: edge.x1,
            top: edge.y1 - 0.5,
            width: edge.length,
            height: 1,
            transformOrigin: "0% 50%",
            transform: [{ rotate: `${edge.angle}rad` }],
          }}
        >
          <Animated.View
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: rgba(theme.accent, 0.55),
              transformOrigin: "0% 50%",
              animationName: DRAW,
              animationDuration: ms(edge.drawMs),
              animationDelay: ms(edge.delay),
              animationFillMode: "both",
              animationTimingFunction: "linear",
            }}
          />
        </View>
      ))}

      {stars.map((star) => (
        <Animated.View
          key={`star-${star.id}`}
          style={{
            position: "absolute",
            left: star.x - star.dot / 2,
            top: star.y - star.dot / 2,
            width: star.dot,
            height: star.dot,
            animationName: STAR_IN,
            animationDuration: ms(STAR_POP),
            animationDelay: ms(star.delay),
            animationFillMode: "both",
            animationTimingFunction: "ease-out",
          }}
        >
          <Animated.View
            style={{
              width: star.dot,
              height: star.dot,
              borderRadius: star.dot / 2,
              backgroundColor: star.color,
              boxShadow: star.bright
                ? `0 0 ${star.dot * 2.6}px ${star.dot * 0.6}px ${rgba(GLOW_COLOR, 0.9)}`
                : `0 0 ${star.dot * 1.8}px ${star.dot * 0.35}px ${rgba(GLOW_COLOR, 0.7)}`,
              animationName: TWINKLE,
              animationDuration: ms(star.twinkleMs),
              animationDelay: ms(star.twinkleDelay),
              animationIterationCount: "infinite",
              animationDirection: "alternate",
              animationTimingFunction: "ease-in-out",
            }}
          />
        </Animated.View>
      ))}
    </View>
  );
});
