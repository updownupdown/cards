import { WILD_FONT , rgba } from "@/styles/styles";
import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Icon } from "@/icons";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Animated, Platform, Pressable, View } from "react-native";

type HudState = {
  prompt: string;
  /** Makes the prompt a button. */
  action?: () => void;
  score: number;
};

/**
 * What a Wild Card game shows in the header: a prompt in the middle and the
 * score on the right. Kept outside React state, so changing either redraws
 * only the header and never the game.
 */
export type Hud = {
  setPrompt: (text: string, action?: () => void) => void;
  /** Shows `text` for `ms`, then the prompt set last. */
  flash: (text: string, ms?: number) => void;
  setScore: (score: number) => void;
};

type HudStore = Hud & {
  subscribe: (listener: () => void) => () => void;
  get: () => HudState;
  dispose: () => void;
};

export function createHud(): HudStore {
  let state: HudState = { prompt: "", score: 0 };
  let base: Pick<HudState, "prompt" | "action"> = { prompt: "" };
  let flashTimer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();
  const set = (next: Partial<HudState>) => {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
  };

  return {
    setPrompt(prompt, action) {
      if (base.prompt === prompt && base.action === action) return;
      base = { prompt, action };
      if (!flashTimer) set({ prompt, action });
    },
    flash(prompt, ms = 1800) {
      if (flashTimer) clearTimeout(flashTimer);
      set({ prompt, action: undefined });
      flashTimer = setTimeout(() => {
        flashTimer = null;
        set(base);
      }, ms);
    },
    setScore(score) {
      if (score !== state.score) set({ score });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    get: () => state,
    dispose() {
      if (flashTimer) clearTimeout(flashTimer);
      listeners.clear();
    },
  };
}

const INK = "#f3eee6";
const TEXT_SHADOW = {
  textShadowColor: rgba("#000000", 0.75),
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
} as const;
const useNativeDriver = Platform.OS !== "web";

/**
 * No bar, just three things over the game: Back, the prompt and the score.
 * Bubblegum Sans throughout, as on the Wild Cards shelf.
 */
export function WildHeader({
  hud,
  insetTop,
  onBack,
}: {
  hud: HudStore;
  insetTop: number;
  onBack: () => void;
}) {
  const { t } = useTranslation("wild");
  const { spacing } = useResponsiveMetrics();
  const state = useSyncExternalStore(hud.subscribe, hud.get, hud.get);
  const side = spacing(92);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        paddingTop: insetTop + spacing(8),
        paddingHorizontal: spacing(12),
        flexDirection: "row",
        alignItems: "center",
        minHeight: insetTop + spacing(52),
      }}
    >
      <View style={{ width: side, alignItems: "flex-start" }}>
        <Pressable
          onPress={onBack}
          hitSlop={spacing(10)}
          accessibilityRole="button"
          accessibilityLabel={t("screen.back")}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: spacing(4),
            paddingVertical: spacing(6),
            paddingLeft: spacing(8),
            paddingRight: spacing(12),
            borderRadius: spacing(20),
            backgroundColor: rgba("#000000", pressed ? 0.45 : 0.28),
          })}
        >
          <Icon name="arrow-back" size={spacing(18)} color={INK} />
          <Text size="md" color={INK} style={{ fontFamily: WILD_FONT }}>
            {t("screen.back")}
          </Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, alignItems: "center" }}>
        <Prompt text={state.prompt} action={state.action} />
      </View>

      <View style={{ width: side, alignItems: "flex-end" }}>
        <Score score={state.score} label={t("screen.score")} />
      </View>
    </View>
  );
}

function Prompt({ text, action }: { text: string; action?: () => void }) {
  const { spacing } = useResponsiveMetrics();
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 220,
      useNativeDriver,
    }).start();
  }, [text]);

  const label = (
    <Text
      size="lg"
      color={INK}
      numberOfLines={2}
      style={{
        fontFamily: WILD_FONT,
        fontVariant: ["lining-nums"],
        textAlign: "center",
        ...TEXT_SHADOW,
      }}
    >
      {text}
    </Text>
  );

  return (
    <Animated.View
      style={{
        opacity: fade,
        transform: [
          {
            translateY: fade.interpolate({
              inputRange: [0, 1],
              outputRange: [spacing(-4), 0],
            }),
          },
        ],
      }}
    >
      {action ? (
        <Pressable
          onPress={action}
          accessibilityRole="button"
          style={({ pressed }) => ({
            paddingHorizontal: spacing(16),
            paddingVertical: spacing(6),
            borderRadius: spacing(20),
            borderWidth: 1,
            borderColor: rgba(INK, 0.6),
            backgroundColor: rgba("#000000", pressed ? 0.5 : 0.32),
          })}
        >
          {label}
        </Pressable>
      ) : (
        label
      )}
    </Animated.View>
  );
}

function Score({ score, label }: { score: number; label: string }) {
  const pop = useRef(new Animated.Value(1)).current;
  const [shown, setShown] = useState(score);

  useEffect(() => {
    if (score === shown) return;
    setShown(score);
    pop.setValue(1.25);
    Animated.spring(pop, {
      toValue: 1,
      friction: 4,
      tension: 180,
      useNativeDriver,
    }).start();
  }, [score]);

  return (
    <Animated.View
      accessible
      accessibilityLabel={`${label}: ${score}`}
      style={{ transform: [{ scale: pop }] }}
    >
      <Text
        size="xxl"
        color={INK}
        style={{
          fontFamily: WILD_FONT,
          textAlign: "right",
          fontVariant: ["lining-nums", "tabular-nums"],
          ...TEXT_SHADOW,
        }}
      >
        {score}
      </Text>
    </Animated.View>
  );
}
