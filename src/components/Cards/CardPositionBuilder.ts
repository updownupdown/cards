import { CardRegistration, TargetState } from "./AnimatedCard";

export class CardPositionBuilder {
  private positionMap: Record<string, TargetState> = {};

  constructor(private getCardPosition: Function) {}

  // Add single card
  add(params: CardRegistration): this {
    const { card, zoneId, index, total, startingZIndex, misc, type } = params;
    if (!card) return this;

    const position = this.getCardPosition(zoneId, index, total, startingZIndex);

    this.positionMap[card.id] = {
      card,
      zoneId,
      x: position.x,
      y: position.y,
      type,
      index,
      zIndex: position.zIndex,
      isHiddenUnderDeck: position.isHiddenUnderDeck,
      misc,
    };
    return this;
  }

  // Add deck
  addDeck(
    deck: any[],
    zoneId: string,
    startingZIndex: number = 50,
    type: string = "",
  ): this {
    deck.forEach((card, index) => {
      this.add({
        card,
        zoneId,
        index,
        type,
        total: deck.length,
        startingZIndex,
        misc: { topOfDeck: index === deck.length - 1 },
      });
    });
    return this;
  }

  // Add multiple single cards
  addCollection(
    cards: any[],
    zonePrefix: string,
    startingZIndex: number = 1,
    miscFactory: (card: any, index: number) => any = () => ({}),
  ): this {
    cards.forEach((card, index) => {
      this.add({
        card,
        zoneId: `${zonePrefix}-${index}`,
        index: 0,
        total: 1,
        startingZIndex,
        misc: miscFactory(card, index),
      });
    });
    return this;
  }

  // Add array of single cards
  addArray(
    cards: any[],
    zoneId: string,
    startingZIndex: number = 20,
    getMisc: (card: any, index: number) => any = () => ({}),
  ): this {
    cards.forEach((card, index) => {
      this.add({
        card,
        zoneId,
        index,
        total: cards.length,
        startingZIndex: startingZIndex + index,
        misc: getMisc(card, index),
      });
    });
    return this;
  }

  build(): Record<string, TargetState> {
    return this.positionMap;
  }
}
