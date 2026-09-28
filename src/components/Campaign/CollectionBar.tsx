import { Text } from "@/components/common/Text";
import { hairline } from "@/components/ui/Nocturne";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Icon, type IconName } from "@/icons";
import { layoutDims, rgba, theme } from "@/styles/styles";
import { Platform, Pressable, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BAR_HEIGHT = 56;
const BAR_GAP = 8;

/** Where the home tab bar ends, from the bottom of the screen. */
function useTabBarTop() {
  const { spacing } = useResponsiveMetrics();
  const insets = useSafeAreaInsets();
  return (
    insets.bottom + spacing(layoutDims.tabBarHeight + layoutDims.pagePadding * 0.5)
  );
}

/** The room the bar and the tab bar under it take at the bottom. */
export function useCollectionBarHeight() {
  const { spacing } = useResponsiveMetrics();
  return useTabBarTop() + spacing(BAR_HEIGHT + BAR_GAP * 2);
}

type Side = { title?: string; subtitle?: string };

/**
 * The bar above the tab bar in the Tao and Voices views: the previous and
 * next items (named, when there are names to show) and, between them, zoom
 * back out to the whole collection.
 */
export function CollectionBar({
  previousLabel,
  nextLabel,
  zoomOutLabel,
  previous,
  next,
  onPrevious,
  onNext,
  onZoomOut,
}: {
  previousLabel: string;
  nextLabel: string;
  zoomOutLabel: string;
  previous?: Side;
  next?: Side;
  onPrevious: () => void;
  onNext: () => void;
  onZoomOut: () => void;
}) {
  const { spacing, ui } = useResponsiveMetrics();
  const tabBarTop = useTabBarTop();

  const side = (
    icon: IconName,
    label: string,
    info: Side | undefined,
    onPress: () => void,
    align: "left" | "right",
  ) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flex: 1,
        height: "100%",
        flexDirection: align === "left" ? "row" : "row-reverse",
        alignItems: "center",
        gap: spacing(6),
        paddingHorizontal: spacing(12),
        outline: "none",
      }}
    >
      <Icon name={icon} size={spacing(20)} color={theme.ink} />
      {info?.title ? (
        <View
          style={{
            flex: 1,
            minWidth: 0,
            alignItems: align === "left" ? "flex-start" : "flex-end",
          }}
        >
          <Text size="xs" weight={500} numberOfLines={1}>
            {info.title}
          </Text>
          {info.subtitle ? (
            <Text size="xxs" weight={300} color={theme.dim} numberOfLines={1}>
              {info.subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: tabBarTop + spacing(BAR_GAP),
        alignItems: "center",
        paddingHorizontal: spacing(layoutDims.pagePadding * 0.5),
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: ui.contentMaxWidth - spacing(layoutDims.pagePadding),
          height: spacing(BAR_HEIGHT),
          flexDirection: "row",
          alignItems: "center",
          borderRadius: spacing(18),
          backgroundColor: rgba(theme.surface, 0.92),
          borderWidth: 1,
          borderColor: hairline(),
          ...(Platform.OS === "web"
            ? ({ backdropFilter: "blur(14px)" } as ViewStyle)
            : null),
        }}
      >
        {side("chevron-left", previousLabel, previous, onPrevious, "left")}
        <Pressable
          onPress={onZoomOut}
          accessibilityRole="button"
          accessibilityLabel={zoomOutLabel}
          style={{
            width: spacing(44),
            height: spacing(44),
            borderRadius: spacing(22),
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: rgba(theme.accent, 0.14),
            outline: "none",
          }}
        >
          <Icon name="zoom-out" size={spacing(22)} color={theme.accent} />
        </Pressable>
        {side("chevron-right", nextLabel, next, onNext, "right")}
      </View>
    </View>
  );
}
