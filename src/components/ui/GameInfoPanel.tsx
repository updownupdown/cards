import { launchGame } from "@/components/common/GameLaunchOverlay";
import { Text } from "@/components/common/Text";
import { FavButton } from "@/components/Home/FavButton";
import { gameArt, useGameCategory } from "@/components/Home/HomeArt";
import { getGameDotDefinition } from "@/data/campaign-map";
import { setLastPlayedGameDot } from "@/data/campaign-progress";
import { GAMES_DATA } from "@/data/games-registry";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { localizeGameTitle } from "@/i18n/content";
import { Icon } from "@/icons";
import { rgba, theme } from "@/styles/styles";
import { Image } from "expo-image";
import type { Href } from "expo-router";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { ActionButton, hairline, RatingMeters } from "./Nocturne";

type Props = {
  path: string;
  /** A small thumbnail of the art leads the panel, or the favourite star. */
  leading: "thumbnail" | "favorite";
  isFavorite?: boolean;
  onToggleFavorite?: (path: string) => void;
  collectedTaoIds: ReadonlySet<number>;
  collectedQuoteIds: ReadonlySet<number>;
  locked?: boolean;
  /** Launch in Campaign mode, so a win counts on the map. */
  campaign?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * A game's label: its name and family, its ratings, the collectibles a
 * Campaign win gives, and a Play button. Shown under the Odyssey map and the
 * Gallery's works.
 */
export function GameInfoPanel({
  path,
  leading,
  isFavorite = false,
  onToggleFavorite,
  collectedTaoIds,
  collectedQuoteIds,
  locked = false,
  campaign = false,
  style,
}: Props) {
  const { spacing } = useResponsiveMetrics();
  const { t: tCommon } = useTranslation("common");
  const language = useDisplayLanguage();
  const category = useGameCategory();
  const game = GAMES_DATA[path];
  if (!game) return null;
  const rewards = getGameDotDefinition(path)?.rewards ?? [];
  const thumbSize = spacing(54);

  const play = () => {
    if (campaign) {
      void setLastPlayedGameDot(path);
      launchGame({ pathname: path, params: { mode: "campaign" } } as Href);
    } else {
      launchGame(path as Href);
    }
  };

  return (
    <View
      style={[
        {
          padding: spacing(14),
          gap: spacing(14),
          borderRadius: spacing(18),
          backgroundColor: theme.raise,
          borderWidth: 1,
          borderColor: hairline(),
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing(12) }}>
        {leading === "thumbnail" ? (
          <Image
            source={gameArt(game)}
            cachePolicy="memory"
            contentFit="cover"
            style={{
              width: thumbSize * 1.3,
              height: thumbSize,
              borderRadius: spacing(6),
              backgroundColor: game.gameColorDark,
              opacity: locked ? 0.35 : 1,
            }}
          />
        ) : (
          <FavButton
            isFavorite={isFavorite}
            onToggleFavorite={() => onToggleFavorite?.(path)}
            size={spacing(44)}
            iconSize={spacing(26)}
            activeColor={theme.accent}
            inactiveColor={theme.dim}
            disabled={!onToggleFavorite}
          />
        )}
        <View style={{ flex: 1, minWidth: 0, gap: spacing(2) }}>
          <Text size="xl" weight={500} numberOfLines={1}>
            {localizeGameTitle(game, path, language)}
          </Text>
          <Text size="xs" weight={300} color={theme.dim} numberOfLines={1}>
            {category(game)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: spacing(6) }}>
          {rewards.map((reward) => {
            const collected =
              reward.type === "tao"
                ? collectedTaoIds.has(reward.id)
                : collectedQuoteIds.has(reward.id);
            return (
              <View
                key={`${reward.type}-${reward.id}`}
                style={{
                  width: spacing(30),
                  height: spacing(30),
                  borderRadius: spacing(15),
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: collected
                    ? rgba(theme.accent, 0.16)
                    : rgba(theme.ink, 0.06),
                }}
              >
                <Icon
                  name={reward.type === "tao" ? "tao" : "quote"}
                  size={spacing(16)}
                  color={collected ? theme.accent : theme.faint}
                />
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: spacing(14) }}>
        <View style={{ flex: 1 }}>
          <RatingMeters
            rating={game.rating}
            labels={{
              complexity: tCommon("stats.complexity"),
              difficulty: tCommon("stats.difficulty"),
              luck: tCommon("stats.luck"),
            }}
          />
        </View>
        <ActionButton
          small
          iconName={locked ? "lock" : "play"}
          label={tCommon("play")}
          disabled={locked}
          onPress={play}
        />
      </View>
    </View>
  );
}
