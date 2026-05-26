import {
  getGameInfo,
  normalizeGamePath,
  recordAttempt,
  recordResult,
} from "@/data/game-menu";
import { buttonStyles } from "@/styles/buttonStyles";
import { layoutStyles } from "@/styles/layoutStyles";
import { Colors } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { router, usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Button } from "../Button/Button";
import GameModal from "../Modals/GameModal";
import { GameIntro } from "./GameIntro";
import { LoadingOverlay } from "./LoadingOverlay";
import { ResetButton } from "./ResetButton";
import { WinLoseBox } from "./WinLoseBox";

interface Props {
  isLoaded?: boolean;
  ended: boolean;
  won: boolean;
  score?: number | string;
  reset: () => void;
}

export const GameMenus = ({ isLoaded, ended, won, score, reset }: Props) => {
  const pathname = normalizeGamePath(usePathname());
  const gameInfo = getGameInfo(pathname);

  const [showMenu, setShowMenu] = useState(false);

  // Record stats
  const prevEndedRef = useRef(false);
  const attemptedPathRef = useRef<string | null>(null);

  useEffect(() => {
    prevEndedRef.current = false;
  }, [pathname]);

  useEffect(() => {
    if (attemptedPathRef.current === pathname) return;
    attemptedPathRef.current = pathname;

    recordAttempt(pathname).catch(() => {});
  }, [pathname]);

  useEffect(() => {
    if (!ended || prevEndedRef.current) return;
    prevEndedRef.current = true;
    if (typeof won !== "boolean") return;

    recordResult(pathname, won).catch(() => {});
  }, [ended, won, pathname]);

  return (
    <>
      <LoadingOverlay isLoaded={!!isLoaded} />

      <GameIntro setShowMenu={setShowMenu} isLoaded={!!isLoaded} />

      <WinLoseBox gameEnded={ended} won={won} score={score} reset={reset} />

      {showMenu && <GameModal onClose={() => setShowMenu(false)} />}

      <View style={layoutStyles.gameHeader}>
        <Button
          style={[buttonStyles.headerButton]}
          onPress={() => {
            router.push("/");
          }}
          iconName={"arrow-back"}
          iconColor={Colors.K400}
        />

        <Text style={textStyles.gameHeaderTitle}>{gameInfo.title}</Text>

        <ResetButton reset={reset} isLoaded={!!isLoaded} />

        <Button
          style={[buttonStyles.headerButton]}
          textStyle={[buttonStyles.headerButton]}
          onPress={() => setShowMenu(true)}
          iconName="menu"
          iconColor={Colors.K400}
        />
      </View>
    </>
  );
};
