import type { ComponentType } from "react";
import type { SvgProps } from "react-native-svg";

import CardAC from "@/assets/cards/AC.svg";
import Card2C from "@/assets/cards/2C.svg";
import Card3C from "@/assets/cards/3C.svg";
import Card4C from "@/assets/cards/4C.svg";
import Card5C from "@/assets/cards/5C.svg";
import Card6C from "@/assets/cards/6C.svg";
import Card7C from "@/assets/cards/7C.svg";
import Card8C from "@/assets/cards/8C.svg";
import Card9C from "@/assets/cards/9C.svg";
import Card10C from "@/assets/cards/10C.svg";
import Card11C from "@/assets/cards/11C.svg";
import Card12C from "@/assets/cards/12C.svg";
import Card13C from "@/assets/cards/13C.svg";
import CardJokerC from "@/assets/cards/14C.svg";
import CardBackC from "@/assets/cards/BackC.svg";

import CardAD from "@/assets/cards/AD.svg";
import Card2D from "@/assets/cards/2D.svg";
import Card3D from "@/assets/cards/3D.svg";
import Card4D from "@/assets/cards/4D.svg";
import Card5D from "@/assets/cards/5D.svg";
import Card6D from "@/assets/cards/6D.svg";
import Card7D from "@/assets/cards/7D.svg";
import Card8D from "@/assets/cards/8D.svg";
import Card9D from "@/assets/cards/9D.svg";
import Card10D from "@/assets/cards/10D.svg";
import Card11D from "@/assets/cards/11D.svg";
import Card12D from "@/assets/cards/12D.svg";
import Card13D from "@/assets/cards/13D.svg";
import CardJokerD from "@/assets/cards/14D.svg";
import CardBackD from "@/assets/cards/BackD.svg";

import CardAH from "@/assets/cards/AH.svg";
import Card2H from "@/assets/cards/2H.svg";
import Card3H from "@/assets/cards/3H.svg";
import Card4H from "@/assets/cards/4H.svg";
import Card5H from "@/assets/cards/5H.svg";
import Card6H from "@/assets/cards/6H.svg";
import Card7H from "@/assets/cards/7H.svg";
import Card8H from "@/assets/cards/8H.svg";
import Card9H from "@/assets/cards/9H.svg";
import Card10H from "@/assets/cards/10H.svg";
import Card11H from "@/assets/cards/11H.svg";
import Card12H from "@/assets/cards/12H.svg";
import Card13H from "@/assets/cards/13H.svg";
import CardJokerH from "@/assets/cards/14H.svg";
import CardBackH from "@/assets/cards/BackH.svg";

import CardAS from "@/assets/cards/AS.svg";
import Card2S from "@/assets/cards/2S.svg";
import Card3S from "@/assets/cards/3S.svg";
import Card4S from "@/assets/cards/4S.svg";
import Card5S from "@/assets/cards/5S.svg";
import Card6S from "@/assets/cards/6S.svg";
import Card7S from "@/assets/cards/7S.svg";
import Card8S from "@/assets/cards/8S.svg";
import Card9S from "@/assets/cards/9S.svg";
import Card10S from "@/assets/cards/10S.svg";
import Card11S from "@/assets/cards/11S.svg";
import Card12S from "@/assets/cards/12S.svg";
import Card13S from "@/assets/cards/13S.svg";
import CardJokerS from "@/assets/cards/14S.svg";
import CardBackS from "@/assets/cards/BackS.svg";

import { StyleSheet, useWindowDimensions } from "react-native";
import { MaxContentWidth } from "@/constants/theme";

export type CardSuit = "clubs" | "diamonds" | "hearts" | "spades";
export type CardRank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "Joker"
  | "Back";

const CARD_COMPONENTS: Record<
  CardSuit,
  Record<CardRank, ComponentType<SvgProps>>
> = {
  clubs: {
    A: CardAC,
    "2": Card2C,
    "3": Card3C,
    "4": Card4C,
    "5": Card5C,
    "6": Card6C,
    "7": Card7C,
    "8": Card8C,
    "9": Card9C,
    "10": Card10C,
    J: Card11C,
    Q: Card12C,
    K: Card13C,
    Joker: CardJokerC,
    Back: CardBackC,
  },
  diamonds: {
    A: CardAD,
    "2": Card2D,
    "3": Card3D,
    "4": Card4D,
    "5": Card5D,
    "6": Card6D,
    "7": Card7D,
    "8": Card8D,
    "9": Card9D,
    "10": Card10D,
    J: Card11D,
    Q: Card12D,
    K: Card13D,
    Joker: CardJokerD,
    Back: CardBackD,
  },
  hearts: {
    A: CardAH,
    "2": Card2H,
    "3": Card3H,
    "4": Card4H,
    "5": Card5H,
    "6": Card6H,
    "7": Card7H,
    "8": Card8H,
    "9": Card9H,
    "10": Card10H,
    J: Card11H,
    Q: Card12H,
    K: Card13H,
    Joker: CardJokerH,
    Back: CardBackH,
  },
  spades: {
    A: CardAS,
    "2": Card2S,
    "3": Card3S,
    "4": Card4S,
    "5": Card5S,
    "6": Card6S,
    "7": Card7S,
    "8": Card8S,
    "9": Card9S,
    "10": Card10S,
    J: Card11S,
    Q: Card12S,
    K: Card13S,
    Joker: CardJokerS,
    Back: CardBackS,
  },
};

export const BASE_CARD_WIDTH = 250;
export const BASE_CARD_HEIGHT = 350;
export const DEFAULT_CARD_WIDTH_RATIO = 5;
export const CARD_HEIGHT_TO_WIDTH_RATIO = BASE_CARD_HEIGHT / BASE_CARD_WIDTH;

export function getCardDimensions(
  windowWidth: number,
  widthRatio = DEFAULT_CARD_WIDTH_RATIO,
) {
  const safeWidthRatio = Math.min(Math.max(widthRatio, 1), 30);
  const contentWidth = Math.min(windowWidth, MaxContentWidth);
  const width = contentWidth / safeWidthRatio;
  const height = width * CARD_HEIGHT_TO_WIDTH_RATIO;

  return { width, height };
}

export type CardProps = Omit<SvgProps, "width" | "height"> & {
  rank?: CardRank;
  suit?: CardSuit;
  widthRatio?: number;
  isBack?: boolean;
};

export function Card({
  rank,
  suit,
  isBack,
  widthRatio = DEFAULT_CARD_WIDTH_RATIO,
  ...svgProps
}: CardProps) {
  const { width: windowWidth } = useWindowDimensions();
  const { width, height } = getCardDimensions(windowWidth, widthRatio);

  const SvgCard =
    isBack || !rank || !suit
      ? CARD_COMPONENTS[suit ?? "hearts"]["Back"]
      : CARD_COMPONENTS[suit][rank];

  return (
    <SvgCard style={styles.card} width={width} height={height} {...svgProps} />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    boxShadow: "1px 2px 4px rgba(0,0,0,.15), 2px 4px 12px rgba(0,0,0,.1)",
  },
});
