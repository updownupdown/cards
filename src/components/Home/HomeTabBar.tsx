import { HoveringUfoIcon } from "@/hints/HintUfo";
import { useOdysseyIntro } from "@/components/Campaign/CampaignIntroPanel";
import { useGalleryIntro } from "@/components/Gallery/GalleryIntro";
import { useCampaignProgress } from "@/hooks/useCampaignProgress";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Icon, type IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { glassFill, useGlassStyle } from "@/components/ui/FloatingBar";
import { layoutDims, theme, transitionStyles } from "@/styles/styles";
import { useViewportDimensions } from "@/hooks/useViewportDimensions";
import { useUfoStage } from "@/components/common/UfoStage";
import { useLayoutEffect, useRef, useState } from "react";
import {
  Animated as RNAnimated,
  Easing,
  Platform,
  Pressable,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pointerEventsStyles } from "@/styles/pointerEventsStyles";

export type HomeTabKey = "home" | "collect" | "search" | "campaign";

export const HOME_TABS: { key: HomeTabKey; icon: IconName }[] = [
  { key: "home", icon: "home" },
  { key: "campaign", icon: "milky-way" },
  { key: "collect", icon: "gallery" },
  { key: "search", icon: "search" },
];

type HomeTabBarProps = {
  activeIndex: number;
  onSelectTab: (index: number) => void;
  onHeightChange?: (height: number) => void;
  /** A game's artwork has been acquired (a game won). */
  artAcquired: boolean;
};

export function HomeTabBar({
  activeIndex,
  onSelectTab,
  onHeightChange,
  artAcquired,
}: HomeTabBarProps) {
  const insets = useSafeAreaInsets();
  const { spacing, ui } = useResponsiveMetrics();
  const { t } = useTranslation("home");
  const glass = useGlassStyle();
  // The UFO waits over a tab's icon, as it does over the hint button, while
  // there is something there for a new player to see: the Odyssey until its
  // introduction is put away (or a game in it is won), then the Gallery, once
  // something has been collected, until its own is.
  const odyssey = useOdysseyIntro();
  const gallery = useGalleryIntro();
  const { collectedTaoIds, collectedQuoteIds } = useCampaignProgress();
  const collected =
    artAcquired || collectedTaoIds.size > 0 || collectedQuoteIds.size > 0;
  // Only one UFO is ever on screen: with another up, none hovers here.
  const { count: othersOnScreen } = useUfoStage();
  const ufoOver: Partial<Record<HomeTabKey, boolean>> = {
    campaign: odyssey.shown,
    collect: !odyssey.shown && collected && gallery.shown,
  };
  const iconSize = spacing(layoutDims.menuIconSize);
  const onLayout = (event: LayoutChangeEvent) => {
    onHeightChange?.(event.nativeEvent.layout.height);
  };

  return (
    <RNAnimated.View
      onLayout={onLayout}
      style={[
        pointerEventsStyles.boxNone,
        {
          position: Platform.OS === "web" ? "fixed" : "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 8,
        },
      ]}
    >
      <View
        style={{
          width: "100%",
          maxWidth: ui.contentMaxWidth,
          alignSelf: "center",
          padding: spacing(layoutDims.pagePadding * 0.5),
          // Clear the system bars on every edge: the bottom one on Android (or
          // the iOS home indicator), and in landscape a display cutout at the
          // sides.
          paddingBottom: insets.bottom + spacing(layoutDims.pagePadding * 0.5),
          paddingLeft: insets.left + spacing(layoutDims.pagePadding * 0.5),
          paddingRight: insets.right + spacing(layoutDims.pagePadding * 0.5),
        }}
      >
        <View
          style={[
            flexStyles.rowCentered,
            {
              width: "100%",
              height: spacing(layoutDims.tabBarHeight),
              ...glass,
              backgroundColor: glassFill(),
              // Round ends.
              borderRadius: spacing(layoutDims.tabBarHeight / 2),
            },
          ]}
        >
          {HOME_TABS.map((tab, index) => {
            const isActive = index === activeIndex;
            // Icons only; the name is for screen readers.
            const label = t(`tabs.${tab.key}`);

            return (
              <Pressable
                key={tab.key}
                onPress={() => onSelectTab(index)}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: isActive }}
                style={{
                  flex: 1,
                  height: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  outline: "none",
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    width: spacing(26),
                    height: 2,
                    borderRadius: 2,
                    backgroundColor: theme.accent,
                    opacity: isActive ? 1 : 0,
                    ...transitionStyles.all02sec,
                  }}
                />
                <TabIcon
                  name={tab.icon}
                  size={iconSize}
                  color={isActive ? theme.accent : theme.dim}
                  ufo={!!ufoOver[tab.key] && !isActive && othersOnScreen === 0}
                  testID={`${tab.key}-tab-ufo`}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </RNAnimated.View>
  );
}

/** How long the UFO takes to fly off a tab's icon, and where to. */
const FLY_OFF_MS = 800;
const FLY_OFF_FADE_MS = 300;
/** Up into the screen, where what it points at is: a share of its height. */
const FLY_OFF_TO = 0.42;
/** How long it waits, once the tab opens, for a spot on screen to fly to. */
const SPOT_WAIT_MS = 600;
const SPOT_POLL_MS = 50;

/**
 * A tab's icon, with the UFO hovering in its place while it has something
 * to show there: the same hover as over the hint button, and like there it
 * takes the icon's place. Once it's no longer wanted (the tab was opened,
 * or its introduction read), it leaves, uncovering the icon: to where the
 * UFO turns up on screen (under the Gallery's note, over Klondike), which
 * waits unseen until it arrives, so there is never a second one; or, with
 * nowhere to go, up into the screen, fading.
 */
function TabIcon({
  name,
  size,
  color,
  ufo,
  testID,
}: {
  name: IconName;
  size: number;
  color: string;
  ufo: boolean;
  testID: string;
}) {
  const { width, height } = useViewportDimensions();
  const stage = useUfoStage();
  const latestStage = useRef(stage);
  latestStage.current = stage;
  const box = useRef<View>(null);
  const [shown, setShown] = useState(ufo);
  const [leaving, setLeaving] = useState(false);
  const offset = useRef(new RNAnimated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new RNAnimated.Value(1)).current;
  const opacity = useRef(new RNAnimated.Value(1)).current;
  const wasUfo = useRef(ufo);

  // Before paint: a UFO it is to fly to must not show for even a frame.
  useLayoutEffect(() => {
    if (ufo === wasUfo.current) return;
    wasUfo.current = ufo;
    if (ufo) {
      offset.setValue({ x: 0, y: 0 });
      scale.setValue(1);
      opacity.setValue(1);
      setLeaving(false);
      setShown(true);
      return;
    }
    setLeaving(true);
    const { setFlying } = latestStage.current;
    setFlying(true);
    let flight: RNAnimated.CompositeAnimation | null = null;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const done = () => {
      setShown(false);
      setFlying(false);
    };
    const useNativeDriver = Platform.OS !== "web";
    const fly = (
      from: { x: number; y: number },
      to: { x: number; y: number; size: number } | null,
    ) => {
      if (cancelled) return;
      const target = to ?? {
        x: width / 2,
        y: height * FLY_OFF_TO,
        size,
      };
      const move = RNAnimated.timing(offset, {
        toValue: { x: target.x - from.x, y: target.y - from.y },
        duration: FLY_OFF_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver,
      });
      const resize = RNAnimated.timing(scale, {
        toValue: target.size / size,
        duration: FLY_OFF_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver,
      });
      // Arriving, it becomes the UFO there; with nowhere to go, it fades.
      flight = to
        ? RNAnimated.parallel([move, resize])
        : RNAnimated.parallel([
            move,
            RNAnimated.sequence([
              RNAnimated.delay(FLY_OFF_MS - FLY_OFF_FADE_MS),
              RNAnimated.timing(opacity, {
                toValue: 0,
                duration: FLY_OFF_FADE_MS,
                useNativeDriver,
              }),
            ]),
          ]);
      flight.start(({ finished }) => {
        if (finished) done();
      });
    };
    const leave = (from: { x: number; y: number }) => {
      let waited = 0;
      const look = () => {
        if (cancelled) return;
        const { spot, count } = latestStage.current;
        if (spot) {
          spot.measure((to) => fly(from, to));
          return;
        }
        waited += SPOT_POLL_MS;
        if (waited < SPOT_WAIT_MS) {
          timer = setTimeout(look, SPOT_POLL_MS);
          return;
        }
        // Another UFO is up, with nowhere to go: this one simply goes.
        if (count > 0) done();
        else fly(from, null);
      };
      look();
    };
    // Its own place on screen: measured, or a guess just above the bar.
    timer = setTimeout(() => leave({ x: width / 2, y: height - size }), 100);
    box.current?.measureInWindow?.((x, y, w, h) => {
      clearTimeout(timer);
      leave({ x: x + w / 2, y: y + h / 2 });
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      flight?.stop();
      setFlying(false);
    };
  }, [height, offset, opacity, scale, size, ufo, width]);

  const hovering = shown && !leaving;
  return (
    <View ref={box} collapsable={false} style={{ width: size, height: size }}>
      <Icon
        name={name}
        size={size}
        color={color}
        style={{
          opacity: hovering ? 0 : 1,
          ...transitionStyles.all02sec,
        }}
      />
      {shown && (
        <RNAnimated.View
          testID={testID}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            opacity,
            transform: [...offset.getTranslateTransform(), { scale }],
            pointerEvents: "none",
          }}
        >
          <HoveringUfoIcon size={size} />
        </RNAnimated.View>
      )}
    </View>
  );
}
