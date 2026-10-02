import { Icon } from "@/icons";
import type { CollectibleReward } from "@/data/collectibles";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { usePalette } from "@/styles/palette";
import { rgba } from "@/styles/styles";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type Props = {
  rewards: readonly CollectibleReward[];
  collectedTaoIds: ReadonlySet<number>;
  collectedQuoteIds: ReadonlySet<number>;
  glowingReward?: CollectibleReward;
};

function RewardIcon({
  reward,
  collected,
  glowing,
}: {
  reward: CollectibleReward;
  collected: boolean;
  glowing: boolean;
}) {
  const { spacing } = useResponsiveMetrics();
  const theme = usePalette();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!glowing) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
    return () => cancelAnimation(pulse);
  }, [glowing, pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      pulse.value,
      [0, 1],
      [rgba(theme.accent, 0), rgba(theme.accent, 0.55)],
    ),
    transform: [{ scale: 1 + pulse.value * 0.3 }],
  }));
  const size = spacing(30);

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {glowing && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              width: size,
              height: size,
              borderRadius: size / 2,
            },
            glowStyle,
          ]}
        />
      )}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: collected
            ? rgba(theme.accent, 1)
            : rgba(theme.ink, 0.15),
        }}
      >
        <Icon
          name={reward.type === "tao" ? "tao" : "quote"}
          size={spacing(16)}
          color={collected ? theme.accentInk : theme.accent}
        />
      </View>
    </View>
  );
}

export function GameCollectibleIcons({
  rewards,
  collectedTaoIds,
  collectedQuoteIds,
  glowingReward,
}: Props) {
  const { spacing } = useResponsiveMetrics();

  return (
    <View style={{ flexDirection: "row", gap: spacing(6) }}>
      {rewards.map((reward) => {
        const collected =
          reward.type === "tao"
            ? collectedTaoIds.has(reward.id)
            : collectedQuoteIds.has(reward.id);
        const glowing =
          glowingReward?.type === reward.type &&
          glowingReward.id === reward.id;
        return (
          <RewardIcon
            key={`${reward.type}-${reward.id}`}
            reward={reward}
            collected={collected}
            glowing={glowing}
          />
        );
      })}
    </View>
  );
}
