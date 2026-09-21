import { Button } from "@/components/Button/Button";
import { HomeCard } from "@/components/Home/HomeCard";
import { useFade } from "@/hooks/useFade";
import type { HomeGameEntry } from "@/hooks/useHomeData";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { flexStyles } from "@/styles/flexStyles";
import { Colors } from "@/styles/styles";
import { Animated, View } from "react-native";
import { RollingDice } from "./RollingDice";

type RandomGameRollerProps = {
  entries: HomeGameEntry[];
  favorites: Set<string>;
  onToggleFavorite: (path: string) => void;
  rolling: boolean;
  rollKey: number;
  onClear: () => void;
};

export function RandomGameRoller({
  entries,
  favorites,
  onToggleFavorite,
  rolling,
  rollKey,
  onClear,
}: RandomGameRollerProps) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("home");
  const cardGap = spacing(20);
  const largeCardHeight = spacing(180);

  const showCard = !rolling && entries.length > 0;
  const { isRendered: isCardRendered, opacity: cardOpacity } =
    useFade(showCard);

  return (
    <View
      style={{
        width: "100%",
        gap: cardGap,
      }}
    >
      <Button
        text={t("random.clear")}
        uppercase={false}
        size="lg"
        onPress={onClear}
        style={{ height: spacing(52), borderRadius: spacing(26) }}
        theme={Colors.suitsRed}
      />

      <View
        style={[
          flexStyles.colCentered,
          {
            width: "100%",
            position: "relative",
            gap: spacing(20),
          },
        ]}
      >
        {isCardRendered &&
          entries.map(([path, game]) => (
            <Animated.View
              key={path}
              style={{
                // flex: 1,
                justifyContent: "center",
                width: "100%",
                height: largeCardHeight,
                opacity: cardOpacity,
              }}
            >
              <HomeCard
                path={path}
                game={game}
                size="large"
                onToggleFavorite={onToggleFavorite}
                isFavorite={favorites.has(path)}
                style={{ width: "100%", height: largeCardHeight }}
              />
            </Animated.View>
          ))}

        {rolling && (
          <View style={flexStyles.colCentered}>
            <RollingDice
              rollKey={rollKey}
              rolling={rolling}
              slotHeight={largeCardHeight}
              gap={cardGap}
            />
          </View>
        )}
      </View>
    </View>
  );
}
