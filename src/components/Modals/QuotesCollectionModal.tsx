import { Button } from "@/components/Button/Button";
import { Text } from "@/components/common/Text";
import { HomeStarfieldBackground } from "@/components/Home/HomeStarfieldBackground";
import {
  QuoteGallery,
  type GalleryAction,
} from "@/components/QuotesCollection/QuoteGallery";
import { QuoteGalleryBar } from "@/components/QuotesCollection/QuoteGalleryBar";
import {
  canStepQuote,
  firstPosition,
  galleryAuthors,
  stepAuthor,
  stepQuote,
  type GalleryPosition,
} from "@/components/QuotesCollection/quote-gallery";
import { ParallaxStars } from "@/components/TaoCollection/ParallaxStars";
import { useChapterBarHeight } from "@/components/TaoCollection/TaoChapterBar";
import { QUOTE_COUNT } from "@/data/collectibles";
import { QUOTE_AUTHORS } from "@/data/quote-authors";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Icon } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";
import { Colors, layoutDims, rgba } from "@/styles/styles";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

type Props = {
  collectedIds: ReadonlySet<number>;
  onClose: () => void;
};

// Opening, as the Tao collection: the sky fades in slowly, then the header,
// then the gallery and its bar.
const SKY_IN_MS = 2080;
const HEADER_AT = 800;
const HEADER_MS = 800;
const GALLERY_AT = 1360;
const GALLERY_MS = 1120;
const CLOSE_MS = 500;

const easeInOut = Easing.inOut(Easing.cubic);

/**
 * The quotes collection: a full-screen night sky with every author on one
 * long line, oldest first, their portrait drawn once a quote of theirs is
 * collected. Sideways goes from author to author (round the ends), up and
 * down through the author's collected quotes, shown under the portrait.
 */
export function QuotesCollectionModal({ collectedIds, onClose }: Props) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("campaign");
  const { settings } = useGlobalSettings();
  const insets = useSafeAreaInsets();
  const barHeight = useChapterBarHeight();
  const authors = useMemo(() => galleryAuthors(collectedIds), [collectedIds]);
  const isEmpty = collectedIds.size === 0;

  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [headerHeight, setHeaderHeight] = useState(0);
  const [position, setPosition] = useState<GalleryPosition>(() =>
    firstPosition(authors),
  );
  const closing = useRef(false);

  const sky = useSharedValue(0);
  const header = useSharedValue(0);
  const gallery = useSharedValue(0);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);

  useEffect(() => {
    sky.value = withTiming(1, { duration: SKY_IN_MS, easing: easeInOut });
    header.value = withDelay(
      HEADER_AT,
      withTiming(1, { duration: HEADER_MS, easing: easeInOut }),
    );
    gallery.value = withDelay(
      GALLERY_AT,
      withTiming(1, { duration: GALLERY_MS, easing: easeInOut }),
    );
  }, [gallery, header, sky]);

  const pad = spacing(layoutDims.pagePadding);
  const area = useMemo(
    () =>
      size && headerHeight
        ? {
            width: size.width,
            top: headerHeight,
            bottom: size.height - barHeight,
          }
        : null,
    [barHeight, headerHeight, size],
  );

  const act = (action: GalleryAction) => {
    if (closing.current) return;
    setPosition((current) => {
      switch (action) {
        case "previousAuthor":
          return stepAuthor(current, authors, -1);
        case "nextAuthor":
          return stepAuthor(current, authors, 1);
        case "previousQuote":
          return stepQuote(current, authors, -1);
        case "nextQuote":
          return stepQuote(current, authors, 1);
      }
    });
  };

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    const out = { duration: CLOSE_MS, easing: easeInOut };
    header.value = withTiming(0, out);
    gallery.value = withTiming(0, out);
    sky.value = withTiming(0, out, (finished) => {
      if (finished) scheduleOnRN(onClose);
    });
  };

  const skyStyle = useAnimatedStyle(() => ({ opacity: sky.value }));
  const headerStyle = useAnimatedStyle(() => ({ opacity: header.value }));
  const galleryStyle = useAnimatedStyle(() => ({ opacity: gallery.value }));

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={close}
    >
      {/* A native Modal is its own root, so gestures inside it need their
          own GestureHandlerRootView. */}
      <GestureHandlerRootView
        style={{ flex: 1 }}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setSize({ width, height });
        }}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: Colors.starfieldOverlay, overflow: "hidden" },
            skyStyle,
          ]}
        >
          {size && (
            <>
              {/* The home screen's starfield, placed exactly as there. */}
              <HomeStarfieldBackground
                animationsEnabled={settings.showAnimations}
                width={size.width}
                height={size.height}
              />
              <View style={[StyleSheet.absoluteFill, pointerEventsStyles.none]}>
                <ParallaxStars
                  width={size.width}
                  height={size.height}
                  x={panX}
                  y={panY}
                  moving={settings.showAnimations}
                />
              </View>
            </>
          )}

          {area && !isEmpty && (
            <Animated.View style={[StyleSheet.absoluteFill, galleryStyle]}>
              <QuoteGallery
                authors={authors}
                position={position}
                area={area}
                panX={panX}
                panY={panY}
                onAction={act}
              />
            </Animated.View>
          )}

          {area && isEmpty && (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: pad * 2,
                  pointerEvents: "none",
                },
                galleryStyle,
              ]}
            >
              <Text
                size="lg"
                weight={300}
                color={Colors.K200}
                style={{ textAlign: "center", maxWidth: spacing(440) }}
              >
                {t("quotes.empty", {
                  quotes: QUOTE_COUNT,
                  authors: QUOTE_AUTHORS.length,
                })}
              </Text>
              <Text
                size="sm"
                weight={300}
                color={Colors.K400}
                style={{
                  textAlign: "center",
                  maxWidth: spacing(440),
                  marginTop: spacing(20),
                }}
              >
                {t("quotes.about")}
              </Text>
            </Animated.View>
          )}

          {/* Fades at both ends, as on the home screen, so the title, the
              close button and the bar stay clear over the sky. */}
          <LinearGradient
            colors={[
              rgba(Colors.starfieldOverlay, 0.9),
              rgba(Colors.starfieldOverlay, 0),
            ]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: headerHeight * 1.7,
              pointerEvents: "none",
            }}
          />
          {!isEmpty && (
            <>
              <LinearGradient
                colors={[
                  rgba(Colors.starfieldOverlay, 0),
                  rgba(Colors.starfieldOverlay, insets.bottom > 0 ? 0.6 : 1),
                ]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: insets.bottom,
                  height: barHeight - insets.bottom,
                  pointerEvents: "none",
                }}
              />
              <LinearGradient
                colors={[
                  rgba(Colors.starfieldOverlay, 0.6),
                  rgba(Colors.starfieldOverlay, 0.8),
                ]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: insets.bottom,
                  pointerEvents: "none",
                }}
              />
            </>
          )}
        </Animated.View>

        {/* The row itself lets touches through (a plain view: on the web an
            animated one drops "box-none"); its two halves fade in on their
            own. */}
        <View
          onLayout={(event) =>
            setHeaderHeight(Math.ceil(event.nativeEvent.layout.height))
          }
          style={[
            flexStyles.rowCentered,
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              paddingTop: insets.top + spacing(14),
              paddingBottom: spacing(10),
              paddingLeft: insets.left + pad,
              paddingRight: insets.right + spacing(10),
            },
            pointerEventsStyles.boxNone,
          ]}
        >
          <Animated.View
            style={[
              flexStyles.rowCentered,
              pointerEventsStyles.none,
              headerStyle,
            ]}
          >
            <Icon
              name="quote"
              size={32}
              color={Colors.K200}
              style={{ marginRight: spacing(12) }}
            />
            <View style={flexStyles.colStart}>
              <Text size="xl" color={Colors.K200} weight={500}>
                {t("quotes.title")}
              </Text>
              <Text
                size="sm"
                color={Colors.white}
                weight={300}
                style={{ opacity: 0.75 }}
              >
                {t("quotes.subtitle", {
                  collected: collectedIds.size,
                  total: QUOTE_COUNT,
                })}
              </Text>
            </View>
          </Animated.View>
          <Animated.View style={[{ marginLeft: "auto" }, headerStyle]}>
            <Button
              style={[
                flexStyles.rowCentered,
                {
                  backgroundColor: "transparent",
                  borderRadius: spacing(layoutDims.menuButtonSize / 2),
                  padding: 0,
                  width: spacing(layoutDims.menuButtonSize),
                  height: spacing(layoutDims.menuButtonSize),
                  boxShadow: "none",
                  borderWidth: 0,
                },
              ]}
              onPress={close}
              iconName="close"
              iconSize={28}
              iconColor={rgba(Colors.white, 0.7)}
            />
          </Animated.View>
        </View>

        {!isEmpty && (
          <View
            style={[
              { position: "absolute", left: 0, right: 0, bottom: 0 },
              pointerEventsStyles.boxNone,
            ]}
          >
            <Animated.View style={galleryStyle}>
              <QuoteGalleryBar
                onPreviousAuthor={() => act("previousAuthor")}
                onPreviousQuote={() => act("previousQuote")}
                onNextQuote={() => act("nextQuote")}
                onNextAuthor={() => act("nextAuthor")}
                canPreviousQuote={canStepQuote(position, authors, -1)}
                canNextQuote={canStepQuote(position, authors, 1)}
              />
            </Animated.View>
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}
