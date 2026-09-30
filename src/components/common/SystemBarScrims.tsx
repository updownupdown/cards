import {
  getSystemBarScrims,
  type ScrimPlatform,
  type SystemBarScrim,
} from "@/utils/system-bar-scrims";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Over every screen, under nothing but native modals and the web's. */
const SCRIM_Z_INDEX = 1000;

/**
 * The gradients under the system bars, over every screen (see
 * utils/system-bar-scrims for which case draws what). LOCKED: see there.
 */
export function SystemBarScrims({ inGame = false }: { inGame?: boolean }) {
  const insets = useSafeAreaInsets();
  const { top, bottom } = getSystemBarScrims({
    platform: Platform.OS as ScrimPlatform,
    insets,
    inGame,
  });
  return (
    <>
      {top && <Scrim testID="system-bar-scrim-top" edge="top" scrim={top} />}
      {bottom && (
        <Scrim testID="system-bar-scrim-bottom" edge="bottom" scrim={bottom} />
      )}
    </>
  );
}

function Scrim({
  edge,
  scrim,
  testID,
}: {
  edge: "top" | "bottom";
  scrim: SystemBarScrim;
  testID: string;
}) {
  return (
    <LinearGradient
      testID={testID}
      colors={scrim.colors as [string, string, ...string[]]}
      locations={scrim.locations as [number, number, ...number[]]}
      // Darkest at the screen's edge.
      start={{ x: 0, y: edge === "top" ? 0 : 1 }}
      end={{ x: 0, y: edge === "top" ? 1 : 0 }}
      style={
        {
          // Fixed on the web, where Home's container is fixed too.
          position: Platform.OS === "web" ? "fixed" : "absolute",
          left: 0,
          right: 0,
          [edge]: 0,
          height: scrim.height,
          zIndex: SCRIM_Z_INDEX,
          pointerEvents: "none",
        } as ViewStyle
      }
    />
  );
}
