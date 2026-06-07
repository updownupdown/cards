import { layoutStyles } from "@/styles/layoutStyles";
import React, { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { ScrollView, View } from "react-native";
import { GameMenus } from "./GameMenus";
import { useAnimations } from "../Animations/Animations";

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
  const { clearAnimations } = useAnimations();

  // Cannot use a simple useEffect here due to react-native
  useFocusEffect(
    useCallback(() => {
      return () => {
        clearAnimations();
      };
    }, [clearAnimations]),
  );

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
