import {
  getGameInfo,
  normalizeGamePath,
  recordAttempt,
  recordResult,
} from "@/data/game-menu";
import { useGameSettings } from "@/hooks/useGameSettings";
import { buttonStyles } from "@/styles/buttonStyles";
import { layoutStyles } from "@/styles/layoutStyles";
import { menuStyles } from "@/styles/menuStyles";
import { Colors, rgba } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { router, usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Text, View } from "react-native";
import { Button } from "../Button/Button";
import GameModal from "../Modals/GameModal";
import { SettingControl } from "./SettingControl";
import { flexStyles } from "@/styles/flexStyles";

interface Props {
  isLoaded?: boolean;
  ended: boolean;
  won: boolean;
  score?: number;
  reset: () => void;
}

export const GameMenus = ({ isLoaded, ended, won, score, reset }: Props) => {
  const pathname = normalizeGamePath(usePathname());
  const gameInfo = getGameInfo(pathname);

  // Settings
  const { settings: gameSettings, updateSettings: updateGameSettings } =
    useGameSettings(pathname);

  const [showIntro, setShowIntro] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (!isLoaded && !gameSettings.showIntro) {
      setShowIntro(false);
    }
  }, [gameSettings.showIntro]);

  // Loading overlay
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(!isLoaded);
  const loadingOpacity = useRef(new Animated.Value(1)).current;

  const fadeOutLoading = () => {
    Animated.timing(loadingOpacity, {
      toValue: 0,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start(() => {
      setShowLoadingOverlay(false);
    });
  };

  useEffect(() => {
    isLoaded && fadeOutLoading();
  }, [isLoaded]);

  // Intro animation
  const introOpacity = useRef(new Animated.Value(1)).current;

  const fadeOutIntro = () => {
    Animated.timing(introOpacity, {
      toValue: 0,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start(() => {
      setShowIntro(false);
    });
  };

  useEffect(() => {
    if (!showIntro) {
      fadeOutIntro();
    }
  }, [showIntro]);

  // Win/lose animations
  const wlmAnim = useRef(new Animated.Value(0)).current;

  const fadeInWLM = () => {
    Animated.timing(wlmAnim, {
      toValue: 1,
      duration: 750,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  };
  const fadeOutWLM = (actionAfterFadeout?: () => void) => {
    Animated.timing(wlmAnim, {
      toValue: 0,
      duration: 400,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start(() => {
      if (actionAfterFadeout) {
        actionAfterFadeout();
      }
    });
  };

  useEffect(() => {
    if (ended) {
      fadeInWLM();
    } else {
      fadeOutWLM();
    }
  }, [ended]);

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

  const gameIntroElement = (
    <>
      {/* Overlay */}
      <Animated.View
        style={[menuStyles.wlmOverlay, { opacity: introOpacity }]}
      />

      {/* Intro box */}
      <Animated.View style={[menuStyles.intro, { opacity: introOpacity }]}>
        <View style={[menuStyles.introHowToPlay]}>
          <Text style={textStyles.h1}>How to Play</Text>

          {gameInfo.howToPlay.map((info, key) => (
            <Text
              key={`info-${key}`}
              style={[textStyles.default, menuStyles.introHowToPlayText]}
            >
              {info}
            </Text>
          ))}

          <Button
            onPress={() => {
              fadeOutIntro();
              setShowMenu(true);
            }}
            text="Read detailed rules"
            size="text"
          />
        </View>

        <Button
          onPress={() => {
            fadeOutIntro();
          }}
          size="large"
          text="Play"
          fullWidth
        />

        <SettingControl
          label="Show this intro screen next time"
          type="boolean"
          booleanType="checkbox"
          value={gameSettings.showIntro}
          onChange={(val) => updateGameSettings({ showIntro: val })}
        />
      </Animated.View>
    </>
  );

  const winLoseMessageElement = (win: boolean, score?: number) => (
    <>
      <Animated.View style={[menuStyles.wlmOverlay, { opacity: wlmAnim }]} />

      <Animated.View
        style={[
          menuStyles.winLoseMessage,
          win ? menuStyles.winLoseMessageWin : menuStyles.winLoseMessageLose,
          {
            opacity: wlmAnim,
            bottom: wlmAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-100, 0],
            }),
          },
        ]}
      >
        <View style={menuStyles.winLoseMessageLeft}>
          <Text style={menuStyles.wlmTitle}>
            {win ? "You won!" : "You lost"}
          </Text>
          {score && <Text style={menuStyles.wlmScore}>Score: {score}</Text>}
        </View>

        <Button
          onPress={() => fadeOutWLM(reset)}
          size="text"
          text={win ? "Play again" : "Try again"}
          textStyle={menuStyles.playBtn}
        />
      </Animated.View>
    </>
  );

  const resetConfirmElement = () => (
    <Animated.View style={menuStyles.restartConfirm}>
      <Button
        onPress={() => setShowResetConfirm(false)}
        text="Cancel"
        size="textLarge"
        textStyle={{ color: Colors.K400 }}
      />
      <Button
        onPress={() => {
          setShowResetConfirm(false);
          reset();
        }}
        text="Reset game"
        size="textLarge"
        textStyle={{ color: Colors.accentBlue }}
      />
    </Animated.View>
  );

  return (
    <>
      {/* Loading overlay */}
      {showLoadingOverlay && (
        <Animated.View
          style={[layoutStyles.gameLoadingOverlay, { opacity: loadingOpacity }]}
        >
          <ActivityIndicator size="large" color={Colors.K400} />
        </Animated.View>
      )}

      {/* Game intro */}
      {showIntro && gameIntroElement}

      {/* Win/lose message */}
      {ended && winLoseMessageElement(won, score)}

      {/* Game menu */}
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

        <Button
          style={[buttonStyles.headerButton]}
          // onPress={() => setShowResetConfirm(true)}
          onPress={() => reset()}
          iconName="reset"
          iconColor={Colors.K400}
        />

        <Button
          style={[buttonStyles.headerButton]}
          textStyle={[buttonStyles.headerButton]}
          onPress={() => setShowMenu(true)}
          iconName="menu"
          iconColor={Colors.K400}
        />
      </View>

      {/* Reset Confirm */}
      {showResetConfirm && resetConfirmElement()}
    </>
  );
};
