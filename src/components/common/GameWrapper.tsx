import {
  getGameInfo,
  normalizeGamePath,
  recordAttempt,
  recordResult,
} from "@/data/game-menu";
import { buttonStyles } from "@/styles/buttonStyles";
import { flexStyles } from "@/styles/flexStyles";
import {
  Colors,
  ContentSidePadding,
  FontWeight,
  HeaderButtonIconSize,
  HeaderHeight,
  rgba,
} from "@/styles/styles";
import { router, usePathname } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

      <View
        style={[
          {
            position: "relative",
            zIndex: 12, // above the game overlay
            ...flexStyles.rowCentered,
            justifyContent: "space-between",
            width: "100%",
            height: HeaderHeight,
            paddingVertical: ContentSidePadding,
            paddingHorizontal: ContentSidePadding * 0.75,

            backgroundColor: Colors.background,
            boxShadow: `0 0 20px ${rgba(Colors.background, 1)}`,
          },
        ]}
      >
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
            iconSize={HeaderButtonIconSize}
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
          iconSize={HeaderButtonIconSize}
        />
      </View>

      <View
        style={[
          {
            position: "relative",
            zIndex: 1,
            ...flexStyles.colCentered,
            ...flexStyles.fullWidth,
            flex: 1,
            pointerEvents: "box-none",
          },
        ]}
      >
        {children}
      </View>
    </>
  );
};
