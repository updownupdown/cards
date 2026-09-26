import {
  figurePaths,
  fullDustCount,
  GLOW_COLOR,
  LINE_COLOR,
  STAR_COLOR,
} from "@/components/TaoCollection/figure";
import type { Constellation } from "@/data/tao-constellations";
import { memo, useMemo } from "react";
import Svg, { Path } from "react-native-svg";

type Props = {
  constellation: Constellation;
  size: number;
  /** How many minor stars to scatter; all of the reveal's when left out. */
  dustCount?: number;
  /** Only the minor stars, at half strength: a chapter not yet collected. */
  dustOnly?: boolean;
};

/**
 * A still drawing of a chapter's constellation, as the reveal leaves it.
 * Each layer is a single path, so many figures can share a screen.
 */
export const ConstellationFigure = memo(function ConstellationFigure({
  constellation,
  size,
  dustCount,
  dustOnly = false,
}: Props) {
  const paths = useMemo(
    () =>
      figurePaths(
        constellation,
        size,
        dustCount ?? fullDustCount(constellation),
      ),
    [constellation, dustCount, size],
  );

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.dust.map((layer, index) => (
        <Path
          key={index}
          d={layer.d}
          fill={STAR_COLOR}
          fillOpacity={layer.opacity * (dustOnly ? 0.5 : 1)}
        />
      ))}
      {!dustOnly && (
        <>
          <Path
            d={paths.lines}
            stroke={LINE_COLOR}
            strokeOpacity={0.45}
            strokeWidth={1}
            strokeLinecap="round"
            fill="none"
          />
          <Path d={paths.glows} fill={GLOW_COLOR} fillOpacity={0.18} />
          {paths.stars.map((layer) => (
            <Path key={layer.color} d={layer.d} fill={layer.color} />
          ))}
        </>
      )}
    </Svg>
  );
});
