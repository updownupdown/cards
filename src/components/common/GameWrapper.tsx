import { layoutStyles } from "@/styles/layoutStyles";
import React from "react";
import { ScrollView, View } from "react-native";
import { GameMenus } from "./GameMenus";

interface Props {
  isLoaded?: boolean;
  ended: boolean;
  won: boolean;
  score?: number | string;
  winLoseMessage?: string;
  reset: () => void;
  children: React.ReactNode;
}

export const GameWrapper = ({
  isLoaded,
  ended,
  won,
  score,
  winLoseMessage,
  reset,
  children,
}: Props) => {
  return (
    <>
      <GameMenus
        ended={ended}
        won={won}
        reset={reset}
        isLoaded={isLoaded}
        winLoseMessage={winLoseMessage}
        score={score}
      />

      <View style={layoutStyles.gameArea}>
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
