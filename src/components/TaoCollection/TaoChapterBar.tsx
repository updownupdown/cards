import { Text } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Icon, type IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { homeSurfaceShadow } from "@/styles/homeSurfaceShadow";
import { Colors, layoutDims, rgba } from "@/styles/styles";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Height the bar takes at the bottom of the screen, with its margins. */
export function useChapterBarHeight() {
  const { spacing } = useResponsiveMetrics();
  const insets = useSafeAreaInsets();
  return (
    insets.bottom +
    spacing(layoutDims.pagePadding) +
    spacing(layoutDims.tabBarHeight)
  );
}

/**
 * The collected chapter before or after `current`, going round from the last
 * to the first (and back). Chapters not collected are skipped.
 */
export function adjacentChapter(
  collected: readonly number[],
  current: number,
  direction: 1 | -1,
): number | undefined {
  if (collected.length === 0) return undefined;
  const index = collected.indexOf(current);
  if (index < 0) {
    // Not collected itself: the nearest collected one that way.
    return direction > 0
      ? (collected.find((id) => id > current) ?? collected[0])
      : ([...collected].reverse().find((id) => id < current) ??
          collected[collected.length - 1]);
  }
  return collected[(index + direction + collected.length) % collected.length];
}

type Props = {
  onPrevious: () => void;
  onNext: () => void;
  onViewAll: () => void;
};

/**
 * The open chapter's controls, floating at the bottom like the home tab bar:
 * the previous and next collected chapters, and back to the whole sky.
 */
export function TaoChapterBar({ onPrevious, onNext, onViewAll }: Props) {
  const { spacing, ui } = useResponsiveMetrics();
  const { t } = useTranslation("campaign");
  const insets = useSafeAreaInsets();
  const radius = spacing(
    layoutDims.tabBarHeight / 2 - layoutDims.tabBarPadding,
  );

  const arrow = (icon: IconName, label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        flexStyles.rowCentered,
        {
          height: "100%",
          aspectRatio: 1.4,
          borderRadius: radius,
          outline: "none",
        },
      ]}
    >
      <Icon name={icon} size={spacing(28)} color={Colors.K300} />
    </Pressable>
  );

  return (
    <View
      style={{
        width: "100%",
        maxWidth: ui.contentMaxWidth,
        alignSelf: "center",
        padding: spacing(layoutDims.pagePadding * 0.5),
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
            padding: spacing(layoutDims.tabBarPadding),
            height: spacing(layoutDims.tabBarHeight),
            borderRadius: spacing(layoutDims.tabBarHeight / 2),
            backgroundColor: Colors.K850,
            ...homeSurfaceShadow(spacing, { translucent: true }),
          },
        ]}
      >
        {arrow("arrow-back", t("tao.previous"), onPrevious)}
        <Pressable
          onPress={onViewAll}
          accessibilityRole="button"
          style={[
            flexStyles.rowCentered,
            { flex: 1, height: "100%", borderRadius: radius, outline: "none" },
          ]}
        >
          <Text size="md" weight={400} color={Colors.K200}>
            {t("tao.viewAll")}
          </Text>
        </Pressable>
        {arrow("arrow-forward", t("tao.next"), onNext)}
      </View>
    </View>
  );
}
