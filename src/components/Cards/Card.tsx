import { CardComponents as CardsRegular } from "@/assets/cards/regular";
import { CardComponents as CardsSmall } from "@/assets/cards/small";
import { Colors, MaxContentWidth, rgba } from "@/styles/styles";
import { cardStyles } from "@/styles/cardStyles";
import { useWindowDimensions, ViewStyle } from "react-native";
import type { SvgProps } from "react-native-svg";
import { CardRank, CardSuit } from "./card-utils";

export type CardProps = Omit<SvgProps, "width" | "height" | "style"> & {
  rank?: CardRank;
  suit?: CardSuit;
  isBack?: boolean;
  isPlaceholder?: boolean;
  style?: (ViewStyle | false)[];
  widthPerc?: number;
  omitShadow?: boolean;
  isSelectable?: boolean;
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
  isSelectable,
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

  const paddingRatio = 0.1;

  const cardAndPaddingWidth = (widthPerc / 100) * contentWidth;
  const paddingWidth = cardAndPaddingWidth * paddingRatio;
  const cardWidth = cardAndPaddingWidth - paddingWidth * 2;

  const cardStyle: ViewStyle = {};

  cardStyle.width = cardWidth;
  cardStyle.margin = paddingWidth;
  cardStyle.borderRadius = cardWidth * 0.08;

  const shadowUnit = cardWidth * 0.01;

  if (isPlaceholder) {
    cardStyle.boxShadow = `inset ${shadowUnit}px ${shadowUnit * 2}px ${shadowUnit * 14}px ${rgba(Colors.black, 0.4)}`;
    cardStyle.backgroundColor = Colors.K900;
  } else if (isSelectedInvalid) {
    cardStyle.boxShadow = `0 0 0 ${shadowUnit * 8}px ${rgba(Colors.cardSelecteInvalid, 0.7)}`;
  } else if (isSelected) {
    cardStyle.boxShadow = `0 0 0 ${shadowUnit * 8}px ${rgba(Colors.cardSelected, 0.8)}`;
  } else if (isSelectable) {
    cardStyle.boxShadow = `0 0 0 ${shadowUnit * 5}px ${rgba(Colors.cardSelectable, 0.7)}`;
  } else if (!omitShadow) {
    cardStyle.boxShadow = `${shadowUnit}px ${shadowUnit * 2}px ${shadowUnit * 8}px rgba(0,0,0,.1), ${shadowUnit * 2}px ${shadowUnit * 4}px ${shadowUnit * 16}px rgba(0,0,0,.1)`;
  }

  return <SvgCard style={[cardStyles.card, cardStyle, style]} {...svgProps} />;
}
