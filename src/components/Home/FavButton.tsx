import { useTranslation } from "@/i18n";
import { Icon } from "@/icons";
import { Colors } from "@/styles/styles";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  View,
  type ViewStyle,
} from "react-native";

type Props = {
  isFavorite: boolean;
  onToggleFavorite: (isFavorite: boolean) => void;
  size?: number;
  iconSize?: number;
  activeColor?: string;
  inactiveColor?: string;
  disabled?: boolean;
  /** A soft dark glow behind the star, to keep it clear on pale pictures. */
  backdrop?: boolean;
  style?: ViewStyle | ViewStyle[];
};

export function FavButton({
  isFavorite,
  onToggleFavorite,
  size = 42,
  iconSize = size,
  activeColor = Colors.favoriteStar,
  inactiveColor = Colors.accentBlue,
  disabled = false,
  backdrop = false,
  style,
}: Props) {
  const { t } = useTranslation("home");
  const flipValue = useRef(new Animated.Value(1)).current;
  const burstValue = useRef(new Animated.Value(0)).current;
  const flipInProgress = useRef(false);
  const [displayFavorite, setDisplayFavorite] = useState(isFavorite);

  useEffect(() => {
    if (!flipInProgress.current) {
      setDisplayFavorite(isFavorite);
    }
  }, [isFavorite]);

  function toggleFavorite() {
    if (flipInProgress.current) return;

    const nextFavorite = !displayFavorite;
    flipInProgress.current = true;

    Animated.timing(flipValue, {
      toValue: 0,
      duration: 150,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: Platform.OS !== "web",
    }).start(({ finished }) => {
      if (!finished) {
        flipInProgress.current = false;
        return;
      }

      setDisplayFavorite(nextFavorite);
      onToggleFavorite(nextFavorite);

      if (nextFavorite) {
        burstValue.setValue(0);
        Animated.timing(burstValue, {
          toValue: 1,
          duration: 450,
          useNativeDriver: Platform.OS !== "web",
        }).start();
      }

      Animated.timing(flipValue, {
        toValue: 1,
        duration: 150,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: Platform.OS !== "web",
      }).start(() => {
        flipInProgress.current = false;
      });
    });
  }

  return (
    <Pressable
      accessibilityLabel={
        displayFavorite ? t("favorites.remove") : t("favorites.add")
      }
      accessibilityRole="button"
      onPress={toggleFavorite}
      disabled={disabled}
      style={[
        {
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        },
        style,
      ]}
    >
      {backdrop && (
        // A soft radial shade that fades to nothing, so it never shows an
        // edge: enough to keep the star clear on a pale picture.
        <Svg
          width={iconSize * 2.6}
          height={iconSize * 2.6}
          style={{ position: "absolute", pointerEvents: "none" }}
        >
          <Defs>
            <RadialGradient id="fav-shade" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={Colors.black} stopOpacity={0.3} />
              <Stop offset="0.45" stopColor={Colors.black} stopOpacity={0.14} />
              <Stop offset="1" stopColor={Colors.black} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#fav-shade)" />
        </Svg>
      )}
      <Animated.View
        style={{
          pointerEvents: "none",
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: activeColor,
          opacity: burstValue.interpolate({
            inputRange: [0, 0.18, 0.7, 1],
            outputRange: [0, 1, 0.55, 0],
          }),
          transform: [
            {
              scale: burstValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 2],
              }),
            },
          ],
        }}
      />
      <Animated.View style={{ transform: [{ scaleX: flipValue }] }}>
        <Icon
          name={displayFavorite ? "star" : "star-outline"}
          size={iconSize}
          color={displayFavorite ? activeColor : inactiveColor}
          shadow
        />
      </Animated.View>
    </Pressable>
  );
}
