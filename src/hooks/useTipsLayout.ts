import { normalizeGamePath } from "@/data/game-menu";
import { useGameSettings } from "@/hooks/useGameSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { floatingBarDims } from "@/styles/menuStyles";
import { usePathname } from "expo-router";

export type TipsBoxLayout = {
  active: boolean;
  boxHeight: number;
  reservedHeight: number;
};

export function useTipsBoxLayout(): TipsBoxLayout {
  const pathname = normalizeGamePath(usePathname());
  const { settings } = useGameSettings(pathname);
  const { spacing } = useResponsiveMetrics();

  const active = settings?.tipsMode ?? true;

  const boxHeight = spacing(floatingBarDims.height);

  return {
    active,
    boxHeight,
    reservedHeight: active ? boxHeight : 0,
  };
}
