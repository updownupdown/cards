import { layoutStyles } from "@/styles/layoutStyles";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { router, useFocusEffect, usePathname } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { useAnimations } from "../Animations/Animations";
import {
  getGameInfo,
  normalizeGamePath,
  recordAttempt,
  recordResult,
} from "@/data/game-menu";
import { GameIntro } from "./GameIntro";
import { LoadingOverlay } from "./LoadingOverlay";
import { WinLoseBox } from "./WinLoseBox";
import GameModal from "../Modals/GameModal";
import { Button } from "../Button/Button";
import { buttonStyles, headerButtonIconSize } from "@/styles/buttonStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { ResetButton } from "./ResetButton";
import { useFade } from "@/hooks/useFade";
import { flexStyles } from "@/styles/flexStyles";
import Animated from "react-native-reanimated";

interface Props {
  isLoaded?: boolean;
  ended: boolean;
  won: boolean;
  score?: number | string;
  winLoseMessage?: string;
  reset: () => void;
  children: React.ReactNode;
  showIntro: boolean | undefined;
  setShowIntro: (show: boolean | undefined) => void;
  canUndo?: boolean;
  handleUndo?: () => void;
}

export const GameWrapper = ({
  isLoaded,
  ended,
  won,
  score,
  winLoseMessage,
  reset,
  children,
  showIntro,
  setShowIntro,
  canUndo,
  handleUndo,
}: Props) => {
  // Clear animations on leave game;
  // Cannot use a simple useEffect here due to react-native
  const { clearAnimations } = useAnimations();
  useFocusEffect(
    useCallback(() => {
      return () => {
        clearAnimations();
      };
    }, [clearAnimations]),
  );

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

  if (!gameInfo) return null;

  return (
    <>
      {gameInfo && (
        <>
          <LoadingOverlay isLoaded={!!isLoaded} />

          <GameIntro
            showIntro={showIntro}
            setShowIntro={setShowIntro}
            setShowMenu={setShowMenu}
          />

          <WinLoseBox
            gameEnded={ended}
            won={won}
            score={score}
            reset={reset}
            message={winLoseMessage}
          />

          {showMenu && <GameModal onClose={() => setShowMenu(false)} />}

          <View style={layoutStyles.gameHeader}>
            <Button
              style={[buttonStyles.headerButton]}
              onPress={() => {
                router.push("/");
              }}
              iconName={"arrow-back"}
              iconColor={Colors.K500}
              iconSize={22}
            />

            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                {
                  fontSize: 14,
                  fontFamily: FontWeight[300],
                  color: Colors.K500,
                  flex: 1,
                  overflow: "hidden",
                  textTransform: "uppercase",
                },
              ]}
            >
              {gameInfo.title}
            </Text>

            {handleUndo && (
              <Button
                style={[buttonStyles.headerButton]}
                textStyle={[buttonStyles.headerButton]}
                onPress={handleUndo}
                iconName="undo"
                iconColor={canUndo ? Colors.K200 : Colors.K600}
                iconSize={headerButtonIconSize}
                disabled={!canUndo}
              />
            )}

            <ResetButton reset={reset} />

            <Button
              style={[buttonStyles.headerButton]}
              textStyle={[buttonStyles.headerButton]}
              onPress={() => setShowMenu(true)}
              iconName="menu"
              iconColor={Colors.K200}
              iconSize={headerButtonIconSize}
            />
          </View>
        </>
      )}

      <View style={[layoutStyles.gameArea]}>
        <ScrollView
          contentContainerStyle={layoutStyles.gameAreaScroll}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </>
  );
};
