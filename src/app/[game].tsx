import { getGameComponentByPath } from "@/data/games-router";
import { useLocalSearchParams, Redirect } from "expo-router";

export default function DynamicGameRoute() {
  const { game } = useLocalSearchParams<{ game: string }>();

  // Verify parameters exist in your core definitions structure
  const GameComponent = game ? getGameComponentByPath(game) : null;

  // Gracefully boot back to root if game routing configurations fail
  if (!GameComponent) {
    return <Redirect href="/" />;
  }

  return <GameComponent />;
}
