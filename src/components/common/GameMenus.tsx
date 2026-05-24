import { buttonStyles } from "@/styles/buttonStyles";
import { layoutStyles } from "@/styles/layoutStyles";
import { textStyles } from "@/styles/textStyles";
import { router, usePathname } from "expo-router";
import { ActivityIndicator, Animated, Easing, Text, View } from "react-native";
import { Button } from "../Button/Button";
import InfoModal, { EMPTY_STATS } from "../Modals/InfoModal";
import { Colors } from "@/styles/styles";
import { useEffect, useRef, useState } from "react";
import { menuStyles } from "@/styles/menuStyles";
import {
  GameStatsMap,
  getGameInfo,
  loadStatsMap,
  normalizeGamePath,
  recordAttempt,
  recordResult,
} from "@/data/game-menu";

interface Props {
  isLoaded?: boolean;
  ended: boolean;
  won: boolean;
  reset: () => void;
}

export const GameMenus = ({ isLoaded, ended, won, reset }: Props) => {
  const pathname = normalizeGamePath(usePathname());
  const [showIntro, setShowIntro] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const gameInfo = getGameInfo(pathname);

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
  const [statsMap, setStatsMap] = useState<GameStatsMap>({});

  const currentStats = statsMap[pathname] ?? EMPTY_STATS;

  // console.log(statsMap);

  useEffect(() => {
    let cancelled = false;
    loadStatsMap().then((loaded) => {
      if (!cancelled) setStatsMap(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    prevEndedRef.current = false;
  }, [pathname]);

  useEffect(() => {
    if (attemptedPathRef.current === pathname) return;
    attemptedPathRef.current = pathname;

    let cancelled = false;
    recordAttempt(pathname).then((nextMap) => {
      if (!cancelled) setStatsMap(nextMap);
    });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!ended || prevEndedRef.current) return;
    prevEndedRef.current = true;
    if (typeof won !== "boolean") return;

    let cancelled = false;
    recordResult(pathname, won).then((nextMap) => {
      if (!cancelled) setStatsMap(nextMap);
    });

    return () => {
      cancelled = true;
    };
  }, [ended, won, pathname]);

  const gameIntroElement = (
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
        onPress={() => fadeOutIntro()}
        size="large"
        text="Play"
        fullWidth
      />
    </Animated.View>
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
      {ended && winLoseMessageElement(won, 500)}

      {/* Game menu */}
      {showMenu && (
        <InfoModal
          currentStats={currentStats}
          onClose={() => setShowMenu(false)}
        />
      )}

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
          onPress={reset}
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
    </>
  );
};
