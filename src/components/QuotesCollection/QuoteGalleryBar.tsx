import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Icon, type IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { homeSurfaceShadow } from "@/styles/homeSurfaceShadow";
import { Colors, layoutDims } from "@/styles/styles";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  onPreviousAuthor: () => void;
  onPreviousQuote: () => void;
  onNextQuote: () => void;
  onNextAuthor: () => void;
  canPreviousQuote: boolean;
  canNextQuote: boolean;
};

/**
 * The gallery's controls, floating at the bottom like the Tao chapter bar:
 * the previous and next author (always, round the ends), and up and down
 * through the author's quotes (up past the first is their portrait).
 */
export function QuoteGalleryBar({
  onPreviousAuthor,
  onPreviousQuote,
  onNextQuote,
  onNextAuthor,
  canPreviousQuote,
  canNextQuote,
}: Props) {
  const { spacing, ui } = useResponsiveMetrics();
  const { t } = useTranslation("campaign");
  const insets = useSafeAreaInsets();
  const radius = spacing(
    layoutDims.tabBarHeight / 2 - layoutDims.tabBarPadding,
  );

  const arrow = (
    icon: IconName,
    label: string,
    onPress: () => void,
    enabled = true,
  ) => (
    <Pressable
      onPress={enabled ? onPress : undefined}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      style={[
        flexStyles.rowCentered,
        {
          width: "25%",
          height: "100%",
          borderRadius: radius,
          outline: "none",
          opacity: enabled ? 1 : 0.3,
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
        {arrow("arrow-back", t("quotes.previousAuthor"), onPreviousAuthor)}
        {arrow(
          "arrow-up",
          t("quotes.previousQuote"),
          onPreviousQuote,
          canPreviousQuote,
        )}
        {arrow("arrow-down", t("quotes.nextQuote"), onNextQuote, canNextQuote)}
        {arrow("arrow-forward", t("quotes.nextAuthor"), onNextAuthor)}
      </View>
    </View>
  );
}
