import { WildGameScreen } from "@/components/WildCards/WildGameScreen";
import {
  getWildGame,
  loadWildCardsProgress,
  hasWildPass,
  isWildGameUnlocked,
  WILD_GAMES,
  type WildGameId,
} from "@/data/wild-cards";
import { useWildCardsVisible } from "@/hooks/useWildCards";
import { Redirect, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

export function generateStaticParams() {
  return WILD_GAMES.map(({ id }) => ({ game: id }));
}

export default function WildGameRoute() {
  const { game: id } = useLocalSearchParams<{ game: string }>();
  const game = getWildGame(id);
  const visible = useWildCardsVisible();
  // A locked game opened "just this once" carries a pass from the Home tab;
  // an unlocked one is checked in the saved progress.
  const [hasPass] = useState(() => !!game && hasWildPass(game.id));
  const [unlocked, setUnlocked] = useState<boolean | null>(null);

  useEffect(() => {
    if (!game || hasPass) return;
    let active = true;
    loadWildCardsProgress().then((progress) => {
      if (active) setUnlocked(isWildGameUnlocked(progress, game.id as WildGameId));
    });
    return () => {
      active = false;
    };
  }, [game, hasPass]);

  if (!game || !visible || unlocked === false) return <Redirect href="/" />;

  return (
    <>
      {/* Portrait games stay put when the phone is tilted to steer. */}
      <Stack.Screen
        options={{
          orientation: game.orientation === "portrait" ? "portrait" : "default",
        }}
      />
      {hasPass || unlocked ? (
        <WildGameScreen game={game} />
      ) : (
        <View style={{ flex: 1, backgroundColor: "#07080d" }} />
      )}
    </>
  );
}
