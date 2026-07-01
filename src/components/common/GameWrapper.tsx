import { Text } from "@/components/common/Text";
import {
  getGameInfo,
  normalizeGamePath,
  recordAttempt,
  recordResult,
} from "@/data/game-menu";
import { GAME_THUMBNAIL_ASSETS } from "@/data/game-thumbnails";
import { useResponsiveScale } from "@/hooks/useResponsiveLayout";
import { flexStyles } from "@/styles/flexStyles";
import { menuStyles } from "@/styles/menuStyles";
import {
  ContentSidePadding,
  FontWeight,
  HeaderButtonIconSize,
  HeaderHeight,
  rgba,
} from "@/styles/styles";
import { router, usePathname } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Image, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  undo?: () => void;
}

function lightenHexColor(hexColor: string, amount: number) {
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6) return hexColor;

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return hexColor;

  const next = (value: number) =>
    Math.round(value + (255 - value) * amount)
      .toString(16)
      .padStart(2, "0");

  return `#${next(r)}${next(g)}${next(b)}`;
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
  undo: handleUndo,
}: Props) => {
  const pathname = normalizeGamePath(usePathname());
  const gameInfo = getGameInfo(pathname);
  const insets = useSafeAreaInsets();
  const responsiveScale = useResponsiveScale();

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

  const titleColor = gameInfo.cardColorText;
  const backgroundColor = gameInfo.cardColorBg;
  const backgroundSource = GAME_THUMBNAIL_ASSETS[gameInfo.thumbnail];
  const overlayColor = lightenHexColor(backgroundColor, 0.2);
  const headerHeight = Math.round(HeaderHeight * responsiveScale) + insets.top;

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
        handleUndo={handleUndo}
      />

      {showMenu && <GameModal onClose={() => setShowMenu(false)} />}

      <View
        style={{
          flex: 1,
          position: "relative",
          backgroundColor,
        }}
      >
        <Image
          source={backgroundSource}
          blurRadius={4}
          resizeMode="cover"
          style={{
            position: "absolute",
            zIndex: 0,
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: 0.2,
          }}
        />

        <View
          style={{
            position: "absolute",
            zIndex: 1,
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: rgba(overlayColor, 0.45),
            pointerEvents: "none",
          }}
        />

        <View
          style={[
            {
              position: "relative",
              zIndex: 12, // above the game overlay
              ...flexStyles.rowCentered,
              justifyContent: "space-between",
              width: "100%",
              height: headerHeight,
              paddingTop:
                insets.top +
                Math.round(ContentSidePadding * responsiveScale * 0.3),
              paddingBottom: Math.round(
                ContentSidePadding * responsiveScale * 0.5,
              ),
              paddingHorizontal: Math.round(
                ContentSidePadding * responsiveScale * 0.75,
              ),
              backgroundColor: "transparent",
            },
          ]}
        >
          <Button
            style={[menuStyles.headerButton]}
            onPress={() => {
              router.push("/");
            }}
            iconName={"arrow-back"}
            iconColor={titleColor}
            iconSize={Math.round(HeaderButtonIconSize * responsiveScale)}
          />

          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              {
                fontSize: Math.round(14 * responsiveScale),
                fontFamily: FontWeight[300],
                color: titleColor,
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
              style={[menuStyles.headerButton]}
              textStyle={[menuStyles.headerButton]}
              onPress={handleUndo}
              iconName="undo"
              iconColor={canUndo ? titleColor : rgba(titleColor, 0.35)}
              iconSize={Math.round(HeaderButtonIconSize * responsiveScale)}
              disabled={!canUndo}
            />
          )}

          <ResetButton
            reset={reset}
            iconColor={titleColor}
            pressedIconColor={rgba(titleColor, 0.7)}
          />

          <Button
            style={[menuStyles.headerButton]}
            textStyle={[menuStyles.headerButton]}
            onPress={() => setShowMenu(true)}
            iconName="menu"
            iconColor={titleColor}
            iconSize={Math.round(HeaderButtonIconSize * responsiveScale)}
          />
        </View>

        <View
          style={[
            {
              position: "relative",
              zIndex: 2,
              ...flexStyles.colCentered,
              ...flexStyles.fullWidth,
              flex: 1,
              pointerEvents: "box-none",
            },
          ]}
        >
          {children}
        </View>
      </View>
    </>
  );
};
