import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon, type IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, rgba, layoutDims, transitionStyles } from "@/styles/styles";
import {
  Platform,
  Pressable,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type HomeTabKey = "home" | "explore" | "stats";

export const HOME_TABS: { key: HomeTabKey; label: string; icon: IconName }[] = [
  { key: "home", label: "Home", icon: "home" },
  { key: "explore", label: "Explore", icon: "explore" },
  { key: "stats", label: "Stats", icon: "chart" },
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

  const onLayout = (event: LayoutChangeEvent) => {
    onHeightChange?.(event.nativeEvent.layout.height);
  };

  return (
    <View
      onLayout={onLayout}
      style={{
        position: Platform.OS === "web" ? "fixed" : "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 8,
        pointerEvents: "box-none",
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: ui.contentMaxWidth,
          alignSelf: "center",
          padding: spacing(layoutDims.pagePadding * 0.5),
          paddingBottom: insets.bottom + spacing(layoutDims.pagePadding * 0.5),
        }}
      >
        <View
          style={[
            flexStyles.rowCentered,
            {
              width: "100%",
              padding: spacing(layoutDims.menuBarPadding),
              height: spacing(layoutDims.menuBarHeight),
              borderRadius: spacing(layoutDims.menuBarHeight / 2),
              backgroundColor: rgba(Colors.K950, 0.9),
              boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(6)}px ${rgba(Colors.K900, 0.4)}, ${spacing(2)}px ${spacing(4)}px ${spacing(10)}px ${rgba(
                Colors.K900,
                0.4,
              )}`,
            },
          ]}
        >
          {HOME_TABS.map((tab, index) => {
            const isActive = index === activeIndex;
            return (
              <Pressable
                key={tab.key}
                onPress={() => onSelectTab(index)}
                style={[
                  flexStyles.rowCentered,
                  {
                    ...transitionStyles.all02sec,
                    flex: 1,
                    height: "100%",
                    gap: spacing(8),
                    paddingVertical: spacing(12),
                    paddingRight: spacing(4),
                    borderRadius: spacing(layoutDims.menuBarHeight / 2 - 6),
                    backgroundColor: isActive
                      ? Colors.background
                      : "transparent",
                    outline: "none",
                  },
                ]}
              >
                <Icon
                  name={tab.icon}
                  size={spacing(28)}
                  color={isActive ? Colors.suitsRed : Colors.K500}
                  style={{ ...transitionStyles.all02sec }}
                />
                <Text
                  size="sm"
                  weight={500}
                  color={isActive ? Colors.white : Colors.K500}
                  style={{ ...transitionStyles.all02sec }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
