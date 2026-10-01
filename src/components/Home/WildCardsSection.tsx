import { WILD_FONT, rgba, theme } from "@/styles/styles";
import { Text } from "@/components/common/Text";
import { useToast } from "@/components/common/Toast";
import { hairline } from "@/components/ui/Nocturne";
import {
  canBypassToday,
  grantWildPass,
  recordWildBypass,
  unlockWildGame,
  WILD_BYPASS_TAP_GAP_MS,
  WILD_BYPASS_TAPS,
  WILD_GAMES,
  type WildGameDefinition,
} from "@/data/wild-cards";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useWildCards } from "@/hooks/useWildCards";
import { useTranslation } from "@/i18n";
import { Icon } from "@/icons";
import { haptics } from "@/utils/haptics";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, View } from "react-native";

/** As tall as a row of the Search tab's list. */
const ROW_HEIGHT = 52;
const useNativeDriver = Platform.OS !== "web";

type WildCardsSectionProps = {
  pageSidePadding: number;
  contentMaxWidth: number;
};

/**
 * Wild Cards, at the foot of the Home tab: the physics mini-games, listed
 * one to a row like the Search tab's games, with a lock for a star. Every
 * GAMES_PER_WILD_CARD campaign wins earn a credit, spent by tapping a locked
 * game. Tapping a locked one WILD_BYPASS_TAPS times in a row opens it anyway,
 * once a day. Only WILD_FONT is used here.
 */
export function WildCardsSection({
  pageSidePadding,
  contentMaxWidth,
}: WildCardsSectionProps) {
  const { t } = useTranslation("wild");
  const { spacing } = useResponsiveMetrics();
  const showToast = useToast();
  const { progress, status, isLoading } = useWildCards();
  const tapsRef = useRef({ id: "", count: 0, at: 0 });

  const open = (game: WildGameDefinition) =>
    router.push({ pathname: "/wild/[game]", params: { game: game.id } });

  const onPressRow = async (game: WildGameDefinition) => {
    if (isLoading) return;
    if (progress.unlockedIds.includes(game.id)) {
      open(game);
      return;
    }
    if (status.credits > 0) {
      haptics.win();
      await unlockWildGame(game.id);
      return;
    }

    const now = Date.now();
    const taps = tapsRef.current;
    if (taps.id !== game.id || now - taps.at > WILD_BYPASS_TAP_GAP_MS) {
      taps.id = game.id;
      taps.count = 0;
    }
    taps.count += 1;
    taps.at = now;
    if (taps.count < WILD_BYPASS_TAPS) return;

    taps.count = 0;
    if (!canBypassToday(progress, game.id)) {
      showToast(t("toast.notToday"));
      return;
    }
    await recordWildBypass(game.id);
    grantWildPass(game.id);
    showToast(t("toast.justThisOnce"));
    open(game);
  };

  const column = {
    width: "100%",
    maxWidth: contentMaxWidth,
    alignSelf: "center",
    paddingHorizontal: pageSidePadding,
  } as const;

  return (
    <View style={{ width: "100%" }} testID="wild cards">
      <View style={[column, { marginBottom: spacing(12) }]}>
        <Text size="xxl" color={theme.ink} style={{ fontFamily: WILD_FONT }}>
          {t("section.title")}
        </Text>
      </View>

      <View style={column}>
        {WILD_GAMES.map((game) => (
          <WildRow
            key={game.id}
            title={t(`titles.${game.id}`)}
            unlocked={progress.unlockedIds.includes(game.id)}
            canUnlock={status.credits > 0}
            onPress={() => void onPressRow(game)}
          />
        ))}
      </View>

      {!isLoading && (
        <View style={[column, { marginTop: spacing(14), gap: spacing(2) }]}>
          <Text size="md" color={theme.dim} style={{ fontFamily: WILD_FONT }}>
            {t("section.unlocked", {
              count: progress.unlockedIds.length,
              total: WILD_GAMES.length,
            })}
          </Text>
          {status.credits > 0 ? (
            <Text
              size="md"
              color={theme.accent}
              style={{ fontFamily: WILD_FONT }}
            >
              {t("section.tapToUnlock", { count: status.credits })}
            </Text>
          ) : (
            !status.allUnlocked && (
              <Text
                size="md"
                color={theme.dim}
                style={{ fontFamily: WILD_FONT }}
              >
                {t("section.winsNeeded", { count: status.winsNeeded })}
              </Text>
            )
          )}
        </View>
      )}
    </View>
  );
}

/** A game in the list: its name, then its lock. */
function WildRow({
  title,
  unlocked,
  canUnlock,
  onPress,
}: {
  title: string;
  unlocked: boolean;
  canUnlock: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation("wild");
  const { spacing } = useResponsiveMetrics();
  const shake = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const wasUnlocked = useRef(unlocked);

  // The lock springs open when the game is unlocked.
  useEffect(() => {
    if (unlocked && !wasUnlocked.current) {
      pop.setValue(0.4);
      Animated.spring(pop, {
        toValue: 1,
        friction: 3,
        tension: 140,
        useNativeDriver,
      }).start();
    }
    wasUnlocked.current = unlocked;
  }, [unlocked]);

  const onPressIn = () => {
    if (unlocked || canUnlock) return;
    // A locked game's lock only rattles: a hint that something may give.
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 45, useNativeDriver }),
      Animated.timing(shake, { toValue: -1, duration: 70, useNativeDriver }),
      Animated.timing(shake, { toValue: 0, duration: 45, useNativeDriver }),
    ]).start();
  };

  return (
    <Pressable
      onPressIn={onPressIn}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t(
        unlocked ? "section.unlockedGame" : "section.locked",
        { title },
      )}
      style={({ pressed }) => ({
        height: spacing(ROW_HEIGHT),
        flexDirection: "row",
        alignItems: "center",
        gap: spacing(12),
        borderBottomWidth: 1,
        borderBottomColor: hairline(),
        opacity: pressed ? 0.7 : 1,
        outline: "none",
      })}
    >
      <Text
        size="md"
        numberOfLines={1}
        color={unlocked ? theme.ink : theme.dim}
        style={{ flex: 1, fontFamily: WILD_FONT }}
      >
        {title}
      </Text>
      {/* As wide as the Search tab's star button, the icon centred in it. */}
      <Animated.View
        style={{
          width: spacing(36),
          alignItems: "center",
          transform: [
            { scale: pop },
            {
              rotate: shake.interpolate({
                inputRange: [-1, 1],
                outputRange: ["-14deg", "14deg"],
              }),
            },
          ],
        }}
      >
        <Icon
          name={unlocked ? "unlock" : "lock"}
          size={spacing(20)}
          color={unlocked ? theme.accent : rgba(theme.ink, 0.45)}
        />
      </Animated.View>
    </Pressable>
  );
}
