import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon, type IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, HomePadding, rgba } from "@/styles/styles";
import { LinearGradient } from "expo-linear-gradient";
import {
  Platform,
  Pressable,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QUICK_TRANSITION_STYLE } from "../Button/Button";

export type HomeTabKey = "home" | "explore" | "stats";

export const HOME_TABS: { key: HomeTabKey; label: string; icon: IconName }[] = [
  { key: "home", label: "Home", icon: "home" },
  { key: "explore", label: "Explore", icon: "explore" },
  { key: "stats", label: "Stats", icon: "chart" },
];

type HomeTabBarProps = {
  tabBarHeight: number;
  contentMaxWidth: number;
  pageSidePadding: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  onHeightChange?: (height: number) => void;
};

export function HomeTabBar({
  tabBarHeight,
  contentMaxWidth,
  pageSidePadding,
  activeIndex,
  onSelect,
  onHeightChange,
}: HomeTabBarProps) {
  const insets = useSafeAreaInsets();
  const { spacing } = useResponsiveMetrics();

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
          maxWidth: contentMaxWidth,
          alignSelf: "center",
          paddingHorizontal: pageSidePadding,
          paddingTop: spacing(HomePadding * 0.4),
          paddingBottom: insets.bottom + spacing(HomePadding * 0.5),
        }}
      >
        <View
          style={[
            flexStyles.rowCentered,
            {
              width: "100%",
              padding: spacing(6),
              gap: spacing(6),
              borderRadius: tabBarHeight / 2,
              backgroundColor: rgba(Colors.K950, 0.9),
              boxShadow: `${spacing(1)}px ${spacing(2)}px ${spacing(6)}px ${rgba(Colors.K900, 0.4)}, ${spacing(3)}px ${spacing(6)}px ${spacing(16)}px ${rgba(
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
                onPress={() => onSelect(index)}
                style={[
                  flexStyles.rowCentered,
                  {
                    ...QUICK_TRANSITION_STYLE,
                    flex: 1,
                    gap: spacing(8),
                    paddingVertical: spacing(12),
                    borderRadius: tabBarHeight / 2 - spacing(6),
                    backgroundColor: isActive
                      ? Colors.background
                      : "transparent",
                    outline: "none",
                  },
                ]}
              >
                <Icon
                  name={tab.icon}
                  size={spacing(24)}
                  color={isActive ? Colors.suitsRed : Colors.K500}
                  style={{ ...QUICK_TRANSITION_STYLE }}
                />
                <Text
                  size="sm"
                  weight={500}
                  color={isActive ? Colors.white : Colors.K500}
                  style={{ ...QUICK_TRANSITION_STYLE }}
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
