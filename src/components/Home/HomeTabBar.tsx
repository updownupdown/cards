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
import {
  Animated as RNAnimated,
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
  const ufoOver: Partial<Record<HomeTabKey, boolean>> = {
    campaign: odyssey.shown,
    collect: !odyssey.shown && collected && gallery.shown,
  };
  const iconSize = spacing(24);
  const ufoSize = spacing(22);
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
                <Icon
                  name={tab.icon}
                  size={iconSize}
                  color={isActive ? theme.accent : theme.dim}
                  style={{ ...transitionStyles.all02sec }}
                />
                {ufoOver[tab.key] && !isActive && (
                  <View
                    testID={`${tab.key}-tab-ufo`}
                    style={{
                      position: "absolute",
                      top: "50%",
                      // Over the icon's top edge, so both show.
                      marginTop: -iconSize / 2 - ufoSize * 0.6,
                      pointerEvents: "none",
                    }}
                  >
                    <HoveringUfoIcon size={ufoSize} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </RNAnimated.View>
  );
}
