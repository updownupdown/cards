import {
  getGameInfo,
  normalizeGamePath,
  recordAttempt,
  recordResult,
} from "@/data/game-menu";
import { useGameSettings } from "@/hooks/useGameSettings";
import { useFade } from "@/hooks/useFade";
import { buttonStyles } from "@/styles/buttonStyles";
import { layoutStyles } from "@/styles/layoutStyles";
import { menuStyles } from "@/styles/menuStyles";
import { Colors } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { router, usePathname } from "expo-router";
import { forwardRef, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Button } from "../Button/Button";
import GameModal from "../Modals/GameModal";
import { SettingControl } from "./SettingControl";

const AnimatedCircle = Animated.createAnimatedComponent(
  forwardRef((props: any, ref) => {
    const { collapsable, ...rest } = props;
    return <Circle ref={ref} {...rest} />;
  }),
);

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
  const [showResetHint, setShowResetHint] = useState(false);
  const { isRendered: renderResetHint, opacity: hintOpacity } = useFade(
    showResetHint,
    300,
  );
  const hintTimeoutRef = useRef<number | null>(null);

  const displayResetHint = () => {
    setShowResetHint(true);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => {
      setShowResetHint(false);
    }, 2000);
  };

  // Reset Progress Animation
  const resetProgress = useRef(new Animated.Value(0)).current;
  const [isResetPressed, setIsResetPressed] = useState(false);

  const onPressInReset = () => {
    setIsResetPressed(true);
    resetProgress.setValue(0);
    Animated.timing(resetProgress, {
      toValue: 1,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  };

  const onPressOutReset = () => {
    setIsResetPressed(false);
    Animated.timing(resetProgress, {
      toValue: 0,
      duration: 150,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    if (!isLoaded && !gameSettings.showIntro) {
      setShowIntro(false);
    }
  }, [gameSettings.showIntro]);

  // Loading overlay
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(!isLoaded);
  const { isRendered: renderLoadingOverlay, opacity: loadingOpacity } = useFade(
    showLoadingOverlay,
    300,
  );

  // Reset Button animation
  const { isRendered: renderResetButton, opacity: resetButtonOpacity } =
    useFade(!!isLoaded, 300);

  console.log({ isLoaded, renderResetButton, resetButtonOpacity });

  useEffect(() => {
    if (isLoaded) {
      setShowLoadingOverlay(false);
    }
  }, [isLoaded]);

  // Intro animation
  const { isRendered: renderIntro, opacity: introOpacity } = useFade(
    showIntro,
    300,
  );

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
    }).start(({ finished }) => {
      if (finished && actionAfterFadeout) {
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
              setShowIntro(false);
              setShowMenu(true);
            }}
            text="Read detailed rules"
            size="text"
          />
        </View>

        <Button
          onPress={() => {
            setShowIntro(false);
          }}
          size="large"
          text="Play"
          fullWidth
        />

        <SettingControl
          label="Skip intro next time"
          type="boolean"
          booleanType="checkbox"
          value={!gameSettings.showIntro}
          onChange={(val) => updateGameSettings({ showIntro: !val })}
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

  const resetHintElement = () => (
    <Animated.View style={[menuStyles.resetHint, { opacity: hintOpacity }]}>
      <Text style={menuStyles.resetHintText}>
        Press and hold to reset game.
      </Text>
    </Animated.View>
  );

  return (
    <>
      {/* Loading overlay */}
      {renderLoadingOverlay && (
        <Animated.View
          style={[layoutStyles.gameLoadingOverlay, { opacity: loadingOpacity }]}
        >
          <ActivityIndicator size="large" color={Colors.K400} />
        </Animated.View>
      )}

      {/* Game intro */}
      {renderIntro && gameIntroElement}

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

        {renderResetButton ? (
          <Animated.View
            style={{
              opacity: resetButtonOpacity,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Svg height="44" width="44" style={{ position: "absolute" }}>
              <AnimatedCircle
                cx="22"
                cy="22"
                r="20"
                stroke={Colors.accentRed}
                strokeWidth="2"
                fill="none"
                strokeDasharray={125.66}
                strokeDashoffset={resetProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [125.66, 0],
                })}
                transform="rotate(-90 22 22)"
              />
            </Svg>
            <Button
              style={[buttonStyles.headerButton]}
              onPress={() => displayResetHint()}
              onLongPress={() => {
                setShowResetHint(false);
                reset();
              }}
              onPressIn={onPressInReset}
              onPressOut={onPressOutReset}
              delayLongPress={1000}
              iconName="reset"
              iconColor={isResetPressed ? Colors.accentRed : Colors.K400}
            />
          </Animated.View>
        ) : (
          <View
            style={[
              buttonStyles.headerButton,
              { backgroundColor: "transparent" },
            ]}
          />
        )}

        <Button
          style={[buttonStyles.headerButton]}
          textStyle={[buttonStyles.headerButton]}
          onPress={() => setShowMenu(true)}
          iconName="menu"
          iconColor={Colors.K400}
        />
      </View>

      {/* Reset Hint */}
      {renderResetHint && resetHintElement()}
    </>
  );
};
