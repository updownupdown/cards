import { CardComponents as CardsRegular } from "@/assets/cards/regular";
import { CardComponents as CardsSmall } from "@/assets/cards/small";
import { Colors, MaxContentWidth } from "@/constants/theme";
import { cardStyles } from "@/styles/cardStyles";
import { useWindowDimensions, ViewStyle } from "react-native";
import type { SvgProps } from "react-native-svg";
import { CardRank, CardSuit } from "../Games/card-utils";

export type CardProps = Omit<SvgProps, "width" | "height" | "style"> & {
  rank?: CardRank;
  suit?: CardSuit;
  isBack?: boolean;
  isPlaceholder?: boolean;
  style?: (ViewStyle | false)[];
  widthPerc?: number;
  omitShadow?: boolean;
  isSelected?: boolean;
  isSelectedInvalid?: boolean;
  cardSize?: "small" | "regular";
};

export function Card({
  style,
  rank,
  suit,
  isBack,
  isPlaceholder,
  widthPerc = 25,
  omitShadow,
  isSelected,
  isSelectedInvalid,
  cardSize,
  ...svgProps
}: CardProps) {
  const cardFiles = cardSize === "small" ? CardsSmall : CardsRegular;

  let cardName = "Placeholder";

  if (!isPlaceholder) {
    const suitName = suit ? suit.charAt(0).toUpperCase() : "H";
    cardName = rank ?? "Back";
    cardName += suitName;
  }

  const SvgCard = cardFiles[cardName];

  if (!SvgCard) {
    console.warn(`SVG ${cardName} not found.`);
    return null;
  }

  const { width: windowWidth } = useWindowDimensions();

  const contentWidth = Math.min(windowWidth, MaxContentWidth);

  const paddingRatio = 0.06;

  const cardAndPaddingWidth = (widthPerc / 100) * contentWidth;
  const paddingWidth = cardAndPaddingWidth * paddingRatio;
  const cardWidth = cardAndPaddingWidth - paddingWidth * 2;

  const cardStyle: ViewStyle = {};

  cardStyle.width = cardWidth;
  cardStyle.margin = paddingWidth;
  cardStyle.borderRadius = cardWidth * 0.08;

  const shadowUnit = cardWidth * 0.01;

  if (isPlaceholder) {
    cardStyle.boxShadow = `inset ${shadowUnit}px ${shadowUnit * 2}px ${shadowUnit * 14}px rgba(0,0,0, 0.1)`;
    cardStyle.backgroundColor = Colors.K300;
  } else if (isSelectedInvalid) {
    cardStyle.boxShadow = `0 0 0 ${shadowUnit * 6}px rgba(216, 26, 51, 0.5)`;
  } else if (isSelected) {
    cardStyle.boxShadow = `0 0 0 ${shadowUnit * 6}px rgba(37,99,235,0.5)`;
  } else if (!omitShadow) {
    cardStyle.boxShadow = `${shadowUnit}px ${shadowUnit * 2}px ${shadowUnit * 8}px rgba(0,0,0,.1), ${shadowUnit * 2}px ${shadowUnit * 4}px ${shadowUnit * 16}px rgba(0,0,0,.1)`;
  }

  return <SvgCard style={[cardStyles.card, cardStyle, style]} {...svgProps} />;
}
