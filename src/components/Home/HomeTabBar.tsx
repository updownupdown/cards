import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Icon, type IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { glassFill, useGlassStyle } from "@/components/ui/FloatingBar";
import { GlassView } from "@/components/ui/Glass";
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
};

export function HomeTabBar({
  activeIndex,
  onSelectTab,
  onHeightChange,
}: HomeTabBarProps) {
  const insets = useSafeAreaInsets();
  const { spacing, ui } = useResponsiveMetrics();
  const { t } = useTranslation("home");
  const glass = useGlassStyle();
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
        <GlassView
          fill={glassFill()}
          // Round ends.
          radius={spacing(layoutDims.tabBarHeight / 2)}
          style={[
            flexStyles.rowCentered,
            {
              width: "100%",
              height: spacing(layoutDims.tabBarHeight),
              ...glass,
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
                  size={spacing(24)}
                  color={isActive ? theme.accent : theme.dim}
                  style={{ ...transitionStyles.all02sec }}
                />
              </Pressable>
            );
          })}
        </GlassView>
      </View>
    </RNAnimated.View>
  );
}
