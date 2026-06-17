import { cardAspectRatio } from "@/components/Cards/CardOLD";
import { ZoneConfig } from "@/hooks/useZoneLayout";

export const clockConfig = {
  gap: 0.1,
  centerCol: 3,
  centerRow: 3 * cardAspectRatio + 0.2,
  radius: 3,
};
export const targetCols =
  clockConfig.radius * 2 + 1 + clockConfig.gap * (clockConfig.radius * 2);

const clockZones: ZoneConfig[] = Array.from({ length: 13 }).map((_, i) => {
  let col, row;

  if (i === 0) {
    // Middle position
    col = clockConfig.centerCol;
    row = clockConfig.centerRow;
  } else {
    // Clock positions: 12 is top, 3 is right, 6 is bottom, 9 is left
    // Formula: angle = (index - 3) * (2 * Math.PI / 12)
    // We adjust by -3 to align index 3 with 0 radians (right)
    const angle = (i - 3) * (Math.PI / 6);

    col = clockConfig.centerCol + clockConfig.radius * Math.cos(angle);
    row =
      clockConfig.centerRow +
      clockConfig.radius * Math.sin(angle) * cardAspectRatio;
  }

  return {
    id: `pile-${i}`,
    col: Math.round(col * 100) / 100,
    row: Math.round(row * 100) / 100,
    fan: { direction: i === 0 ? "diagonal-depth" : "up", offset: 0.05 },
    placeholder: { show: true },
  };
});

export const layoutZones: ZoneConfig[] = [
  ...clockZones,
  {
    id: "gameInfo",
    col: 0,
    row: 0,
    width: targetCols,
  },
];
