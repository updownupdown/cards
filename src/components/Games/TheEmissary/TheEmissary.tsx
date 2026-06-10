import {
  CardAnimationParams,
  useAnimations,
} from "@/components/Animations/Animations";
import { useToast } from "@/components/common/Toast";
import { useGameLoading } from "@/hooks/useGameLoading";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { textStyles } from "@/styles/textStyles";
import { useEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useCardSize } from "../../Cards/Card";
import {
  CardSuit,
  createDeck,
  isFace,
  rankValue,
  shuffle,
  suitValue,
  type PlayingCard,
} from "../../Cards/card-utils";
import { CardButton } from "../../Cards/CardButton";
import { GameWrapper } from "../../common/GameWrapper";
import { AdvisorInfo, ChooseKingdomOverlay } from "./AdvisorInfo";
import { DebateDecks } from "./DebateDecks";
import { DebateRecord } from "./DebateRecord";
import { EmissaryHand } from "./EmissaryHand";
import {
  EmissarySuitsColorMap,
  TheEmissaryGame,
  TheEmissaryKingdom,
} from "./TheEmissaryCommon";
import { useLayoutManager } from "@/hooks/useLayoutManager";

const defaultHandSize = 8;

// TODO - remove this
const debugMode = false;

const cardsPerRow = {
  topic: 4,
  debates: 6,
  other: 8,
};

function setup(firstGame = false): TheEmissaryGame {
  const deck = shuffle(createDeck());
  const rulers = shuffle(
    deck.filter((c) => c.rank === "K" || c.rank === "Q").slice(0, 8),
  ).map((c) => ({ ...c, faceUp: true }));
  const advisors = shuffle(deck.filter((c) => c.rank === "J").slice(0, 4)).map(
    (c) => ({ ...c, faceUp: true }),
  );

  const draw = shuffle(
    deck.filter((c) => !isFace(c) && c.rank !== "9" && c.rank !== "10"),
  );

  const kingdoms: TheEmissaryKingdom[] = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    ruler: rulers[i],
    requiredWins: i + 1,
    visited: false,
    won: false,
  }));

  return {
    kingdoms,
    advisors,
    draw,
    discardWon: [],
    discardLost: [],
    hand: [],
    visit: null,
    started: !firstGame,
    ended: false,
    won: false,
    winLoseMessage: "",
    neededToHand: 0,
    handNeedsOrdering: false,
    discardFromHand: 0,
    handSize: defaultHandSize,
  };
}

export default function TheEmissary() {
  const { isLoaded, showIntro, setShowIntro } = useGameLoading();
  const [game, setGame] = useState<TheEmissaryGame>(setup(true));
  const { width: cardWidth } = useCardSize(cardsPerRow.topic);
  const [selectedAdvisor, setSelectedAdvisor] = useState<
    PlayingCard | undefined
  >(undefined);
  const { animateCards, animatingCardIds } = useAnimations();

  const { getLayout, setRef } = useLayoutManager([
    "drawCurrentRef",
    "drawNextRef",
    "topicRef",
    "discardLostCurrentRef",
    "discardLostNextRef",
    "discardWonCurrentRef",
    "discardWonNextRef",
    "futureAdvisorRef",
    "futureHandRef",
    "advisorsRefs",
    "handRefs",
    "rulersRefs",
  ]);

  function reset() {
    setGame(setup());
    setSelectedAdvisor(undefined);
  }

  useEffect(() => {
    if (showIntro === false) {
      setGame((prev) => ({ ...prev, started: true }));
    }
  }, [showIntro]);

  function startVisit(kingdomId: number) {
    setGame((prev) => {
      if (prev.ended || prev.visit !== null || prev.kingdoms[kingdomId].visited)
        return prev;

      const k = prev.kingdoms[kingdomId];

      return {
        ...prev,
        visit: {
          kingdomId,
          trumpSuit: k.ruler.suit,
          requiredWins: k.requiredWins,
          wins: 0,
          debatesLeft: 8,
          debateTopic: undefined,
          debateRecord: [],
        },
        winLoseMessage: "",
      };
    });
  }

  // Refill hand after visit
  useEffect(() => {
    if (
      !game.started ||
      game.ended ||
      game.hand.length > 0 ||
      game.visit !== null
    )
      return;

    setGame((prev) => ({ ...prev, neededToHand: defaultHandSize }));
  }, [game.visit, game.hand, game.started]);

  function wonDebate(
    card: PlayingCard,
    debateTopic: PlayingCard,
    trumpSuit: CardSuit,
  ) {
    if (debateTopic.suit !== trumpSuit && card.suit === trumpSuit) {
      return true;
    } else if (card.suit !== debateTopic.suit) {
      return false;
    }

    return rankValue(card) > rankValue(debateTopic);
  }

  async function debateWithCard(card: PlayingCard) {
    if (!game.visit?.debateTopic) return;

    setSelectedAdvisor(undefined);

    const anims: CardAnimationParams[] = [];

    // Animate played hand card to discard pile
    const wonTopic = wonDebate(
      card,
      game.visit.debateTopic,
      game.visit.trumpSuit,
    );

    const cardIndex = game.hand.findIndex((c) => c.id === card.id);

    const currentHandPos = getLayout("handRefs", cardIndex);
    let discardPos = getLayout(
      wonTopic ? "discardWonNextRef" : "discardLostNextRef",
    );

    if (currentHandPos && discardPos && card) {
      anims.push({
        card,
        from: currentHandPos,
        to: discardPos,
        cardSize: "small",
        flip: wonTopic ? undefined : "toBack",
        cardsPerRow: cardsPerRow.other,
      });
    }

    // Animate topic to discard
    const topicCard = getLayout("topicRef");
    discardPos = getLayout("discardLostNextRef");

    if (topicCard && discardPos && game.visit.debateTopic) {
      anims.push({
        card: game.visit.debateTopic,
        from: topicCard,
        to: discardPos,
        cardSize: "small",
        flip: "toBack",
        cardsPerRow: cardsPerRow.topic,
        delay: 150,
      });
    }

    if (anims.length > 0) {
      await animateCards(anims);
    }

    setGame((prev) => {
      if (!prev.visit || prev.visit.debateTopic === undefined) return prev;

      const debateTopic = prev.visit.debateTopic;

      let discardLost = prev.discardLost;
      let discardWon = prev.discardWon;
      let wins = prev.visit.wins;
      let hand = prev.hand.filter((c) => c.id !== card.id);
      let debateRecord = prev.visit.debateRecord;

      if (wonTopic) {
        wins += 1;
        discardWon = [...discardWon, card];
        discardLost = [...discardLost, { ...debateTopic, faceUp: false }];
        debateRecord = [...debateRecord, true];
      } else {
        discardLost = [
          ...discardWon,
          { ...debateTopic, faceUp: false },
          { ...card, faceUp: false },
        ];
        debateRecord = [...debateRecord, false];
      }

      // Won too many debates, lost!
      if (wins > prev.visit.requiredWins && !debugMode) {
        return {
          ...prev,
          discardLost,
          discardWon,
          hand,
          visit: null,
          ended: true,
          won: false,
          winLoseMessage: "You won too many debates, insulting the ruler!",
        };
      }

      return {
        ...prev,
        hand,
        discardLost,
        discardWon,
        visit: {
          ...prev.visit,
          wins,
          debateRecord,
          debateTopic: undefined,
        },
      };
    });
  }

  const showToast = useToast();

  useEffect(() => {
    if (!game.visit || game.hand.length > 0 || !game.visit?.kingdomId) return;

    const wonKingdom = game.visit.wins === game.visit.requiredWins || debugMode;

    if (wonKingdom) {
      showToast(`You won over Kingdom #${game.visit.kingdomId + 1}!`);
    }

    // Finish kingdom visit
    // This needs to be in a useEffect because it can be triggered in two ways:
    // 1: player plays a debate card, updates states, then has no cards left
    // 2: player uses advisor to remove trump cards left in hand, and has no cards left
    setGame((prev) => {
      if (prev.visit === null) return prev;

      const wonKingdom =
        prev.visit.wins === prev.visit.requiredWins || debugMode;

      let kingdoms = [...prev.kingdoms];
      const kId = prev.visit.kingdomId;
      const ruler = prev.kingdoms[kId].ruler;
      kingdoms[kId] = {
        ...kingdoms[kId],
        visited: true,
        won: wonKingdom,
        ruler: { ...ruler, faceUp: false },
      };
      let advisors = prev.advisors.map((a) => ({ ...a, faceUp: true }));

      if (wonKingdom) {
        advisors = [ruler, ...advisors];
      }

      return {
        ...prev,
        kingdoms,
        advisors,
        handSize: defaultHandSize,
        visit: null,
        ended: !wonKingdom,
        won: wonKingdom,
        winLoseMessage: wonKingdom
          ? "You won over the rulers of all eight kingdoms with your spectacular debating skills!"
          : "You failed to win enough debates; the ruler doesn't take you seriously enough.",
      };
    });
  }, [game.hand]);

  function canDebateWithCard(
    hand: PlayingCard[],
    debateTopic?: PlayingCard,
    handCard?: PlayingCard,
  ) {
    if (!debateTopic || !handCard) return false;

    const handContainsTopicSuit = hand.some(
      (card) => card.suit === debateTopic.suit,
    );
    if (handContainsTopicSuit && handCard.suit !== debateTopic.suit) {
      return false;
    }
    return true;
  }

  const lastSelectedAdvisor: PlayingCard | undefined = useMemo(() => {
    return selectedAdvisor ?? undefined;
  }, [selectedAdvisor]);

  const showChooseKingdom = useMemo(() => {
    return !game.ended && game.visit === null;
  }, [game.visit]);

  async function refreshDeckWithinKingdom() {
    setGame((prev) => {
      const draw: PlayingCard[] = shuffle([
        ...prev.discardLost,
        ...prev.draw,
      ]).map((c) => ({ ...c, faceUp: false }));

      return { ...prev, draw, discardLost: [] };
    });
  }

  async function refreshDeckAfterKingdom() {
    setGame((prev) => {
      const draw: PlayingCard[] = shuffle([
        ...prev.discardLost,
        ...prev.hand,
        ...prev.discardWon,
        ...prev.draw,
      ]).map((c) => ({ ...c, faceUp: false }));

      return { ...prev, draw, hand: [], discardLost: [], discardWon: [] };
    });
  }

  async function drawCardToHand() {
    const drawPos = getLayout("drawCurrentRef");
    const futureHandPos = getLayout("futureHandRef");

    const card = game.draw[game.draw.length - 1];

    if (drawPos && futureHandPos && card) {
      await animateCards([
        {
          card,
          from: drawPos,
          to: futureHandPos,
          cardSize: "small",
          flip: "toFace",
          cardsPerRow: cardsPerRow.other,
          duration: 150,
        },
      ]);
    }

    setGame((prev) => {
      const newCard = prev.draw[prev.draw.length - 1];
      const hand = [...prev.hand, { ...newCard, faceUp: true }];
      const draw = prev.draw.slice(0, -1);
      const neededToHand = prev.neededToHand - 1;
      const handNeedsOrdering = neededToHand === 0;

      return { ...prev, draw, hand, neededToHand, handNeedsOrdering };
    });
  }

  async function drawCardToTopic() {
    if (game.draw.length === 0) {
      await refreshDeckWithinKingdom();
    }

    const drawPos = getLayout("drawCurrentRef");
    const topicPos = getLayout("topicRef");

    const nextTopic = game.draw[game.draw.length - 1];

    if (drawPos && topicPos && nextTopic) {
      await animateCards([
        {
          card: nextTopic,
          from: drawPos,
          to: topicPos,
          cardSize: "small",
          flip: "toFace",
          cardsPerRow: cardsPerRow.debates,
        },
      ]);
    }

    setGame((prev) => {
      if (prev.ended || prev.visit === null) return prev;

      const nextTopic = { ...prev.draw[prev.draw.length - 1], faceUp: true };
      const draw = prev.draw.slice(0, -1);

      return {
        ...prev,
        draw,
        visit: {
          ...prev.visit,
          debateTopic: nextTopic,
        },
      };
    });
  }

  async function discardCard(card: PlayingCard) {
    const cardIndex = game.hand.findIndex((c) => c.id === card.id);
    const discardLostPos = getLayout("discardLostNextRef");
    const cardPos = getLayout("handRefs", cardIndex);

    if (discardLostPos && cardPos && card) {
      await animateCards([
        {
          card: card,
          from: cardPos,
          to: discardLostPos,
          cardSize: "small",
          flip: "toFace",
          cardsPerRow: cardsPerRow.other,
        },
      ]);
    }

    setGame((prev) => {
      const hand = prev.hand.filter((c) => c.id !== card.id);
      const discardLost = [card, ...prev.discardLost];
      const discardFromHand = prev.discardFromHand - 1;

      return { ...prev, hand, discardLost, discardFromHand };
    });
  }

  async function orderHand() {
    const hand = [...game.hand];

    const orderedHand = [...hand].sort((a, b) => {
      if (suitValue(a) !== suitValue(b)) {
        return suitValue(a) - suitValue(b);
      } else {
        return rankValue(a) - rankValue(b);
      }
    });

    const anims: CardAnimationParams[] = [];

    for (let i = 0; i < hand.length; i++) {
      const newPosIndex = orderedHand.findIndex((c) => c.id === hand[i].id);
      const beforePos = getLayout("handRefs", i);
      const afterPos = getLayout("handRefs", newPosIndex);
      if (beforePos && afterPos) {
        anims.push({
          card: game.hand[i],
          from: beforePos,
          to: afterPos,
          cardsPerRow: cardsPerRow.other,
          cardSize: "small",
          delay: i * 10 + Math.abs(beforePos.x - afterPos.x) * 2,
          duration: 320,
          arcY: 0.5 * Math.abs(beforePos.x - afterPos.x),
        });
      }
    }

    if (anims.length > 0) {
      await animateCards(anims);
    }

    setGame((prev) => {
      return { ...prev, hand: orderedHand, handNeedsOrdering: false };
    });
  }

  useEffect(() => {
    if (game.handNeedsOrdering) orderHand();
  }, [game.handNeedsOrdering]);

  useEffect(() => {
    if (game.neededToHand === 0) return;

    if (game.draw.length === 0) {
      if (game.visit === null) {
        refreshDeckAfterKingdom();
      } else {
        refreshDeckWithinKingdom();
      }
    } else {
      drawCardToHand();
    }
  }, [game.neededToHand, game.draw, game.visit]);

  async function spendAdvisor(advisor: PlayingCard) {
    const advisorIndex = game.advisors.findIndex((c) => c.id === advisor.id);

    const advisorPos = getLayout("advisorsRefs", advisorIndex);

    if (advisorPos) {
      await animateCards([
        {
          card: advisor,
          from: advisorPos,
          to: advisorPos,
          cardSize: "small",
          flip: "toBack",
          cardsPerRow: cardsPerRow.other,
        },
      ]);
    }

    // Turn advisor face down, or remove it
    setGame((prev) => {
      let advisors = prev.advisors;

      if (advisor.rank === "J") {
        // If Jack, turn it face down
        advisors = advisors.map((a) => {
          if (a.id === advisor.id) {
            return { ...a, faceUp: false };
          } else {
            return a;
          }
        });
      } else {
        // Otherwise, remove from advisors
        advisors = advisors.filter((a) => a.id !== advisor.id);
      }

      return {
        ...prev,
        advisors,
      };
    });

    setSelectedAdvisor(undefined);
  }

  async function discardCardsMatchingTrump() {
    const anims: CardAnimationParams[] = [];

    const trumpSuit = game.visit?.trumpSuit;
    const hand = game.hand.filter((c) => c.suit !== trumpSuit);
    const cardsToDiscard = game.hand.filter((c) => c.suit === trumpSuit);

    for (let i = 0; i < cardsToDiscard.length; i++) {
      const card = cardsToDiscard[i];
      const cardIndex = game.hand.findIndex(
        (c) => c.id === cardsToDiscard[i].id,
      );

      const currentHandPos = getLayout("handRefs", cardIndex);
      const discardPos = getLayout("discardLostNextRef");

      if (currentHandPos && discardPos && card) {
        anims.push({
          card,
          from: currentHandPos,
          to: discardPos,
          cardSize: "small",
          flip: "toBack",
          cardsPerRow: cardsPerRow.other,
          delay: 100,
        });
      }
    }

    if (anims.length > 0) {
      await animateCards(anims);
    }

    setGame((prev) => {
      if (!prev.visit) return prev;

      const draw = [...cardsToDiscard, ...prev.draw];
      const handSize = Math.max(prev.handSize - cardsToDiscard.length, 0);

      return { ...prev, hand, draw, handSize };
    });
  }

  async function doAdvisorAction(advisor: PlayingCard | undefined) {
    if (!advisor) return;

    const suit = advisor.suit;

    await spendAdvisor(advisor);

    if (suit === "diamonds") {
      setGame((prev) => ({ ...prev, neededToHand: 2, discardFromHand: 2 }));
    } else if (suit === "hearts") {
      await discardCardsMatchingTrump();
      await spendAdvisor(advisor);
    } else if (suit === "clubs") {
      setGame((prev) => {
        const numCardsToDraw = prev.hand.filter(
          (c) => c.suit === "clubs",
        ).length;
        return {
          ...prev,
          handSize: prev.handSize + numCardsToDraw,
          neededToHand: numCardsToDraw,
        };
      });
    }
  }

  async function swapRulers(
    kingdomId: TheEmissaryKingdom,
    advisor: PlayingCard,
  ) {
    await spendAdvisor(advisor);

    setGame((prev) => {
      if (!prev.visit) return prev;

      const kingdoms = [...prev.kingdoms];

      kingdoms[prev.visit.kingdomId] = {
        ...kingdoms[prev.visit.kingdomId],
        ruler: prev.kingdoms[kingdomId.id].ruler,
      };
      kingdoms[kingdomId.id] = {
        ...kingdoms[kingdomId.id],
        ruler: prev.kingdoms[prev.visit.kingdomId].ruler,
      };

      return {
        ...prev,
        kingdoms,
        visit: {
          ...prev.visit,
          trumpSuit: kingdomId.ruler.suit,
        },
      };
    });
  }

  return (
    <GameWrapper
      showIntro={showIntro}
      setShowIntro={setShowIntro}
      ended={game.ended}
      won={game.won}
      reset={reset}
      isLoaded={isLoaded}
      winLoseMessage={game.winLoseMessage}
    >
      <View
        style={[
          flexStyles.colCentered,
          flexStyles.gap14,
          flexStyles.flex1,
          { marginTop: -10 },
        ]}
      >
        {/* Kingdoms */}
        <View
          style={[
            flexStyles.rowCentered,
            flexStyles.fullWidth,
            flexStyles.spaceBetween,
          ]}
        >
          {game.kingdoms.map((k, i) => {
            const swappingRuler = selectedAdvisor?.suit === "spades";
            const isCurrent = game.visit?.kingdomId === k.id;
            const isEnabled =
              (game.visit === null && k.ruler.faceUp) ||
              (swappingRuler && !isCurrent) ||
              (isCurrent && !swappingRuler);
            const opacity = isEnabled ? 1 : 0.6;

            const onPress = () => {
              if (game.visit === null) {
                return () => startVisit(k.id);
              } else if (selectedAdvisor?.suit === "spades" && !isCurrent) {
                return () => swapRulers(k, selectedAdvisor);
              } else {
                return undefined;
              }
            };

            return (
              <View
                key={`kingdom-${k.id}`}
                style={[
                  flexStyles.colCentered,
                  {
                    opacity,
                    borderRadius: 4,
                    paddingTop: 2,
                    gap: 4,
                    alignItems: "center",
                    backgroundColor: isCurrent ? Colors.K700 : Colors.K800,
                  },
                ]}
              >
                <Text
                  style={[
                    textStyles.default,
                    {
                      fontSize: 15,
                      fontFamily: FontWeight[500],
                      color: isCurrent ? Colors.white : Colors.K300,
                    },
                  ]}
                >
                  {k.requiredWins}
                </Text>
                <CardButton
                  card={!k.won ? k.ruler : undefined}
                  ref={setRef("rulersRefs", i)}
                  cardsPerRow={cardsPerRow.other}
                  onPress={onPress()}
                  disabled={onPress() === undefined}
                  cardSize="small"
                  selectColor={
                    swappingRuler
                      ? EmissarySuitsColorMap["spades"]
                      : isEnabled
                        ? "blue"
                        : "none"
                  }
                />
              </View>
            );
          })}
        </View>

        {/* Debate Area */}
        <View
          style={[
            flexStyles.colCentered,
            flexStyles.fullWidth,
            flexStyles.flex1,
            flexStyles.gap12,
            {
              position: "relative",
            },
          ]}
        >
          {/* Choose a kingdom */}
          <ChooseKingdomOverlay showChooseKingdom={showChooseKingdom} />

          {/* Advisor Info */}
          <AdvisorInfo
            lastSelectedAdvisor={lastSelectedAdvisor}
            selectedAdvisor={selectedAdvisor}
            discardFromHand={game.discardFromHand}
            setSelectedAdvisor={setSelectedAdvisor}
            doAdvisorAction={doAdvisorAction}
            hand={game.hand}
            visit={game.visit}
          />

          {/* Debate Record */}
          <DebateRecord visit={game.visit} handSize={game.handSize} />

          {/* Visit - Debate Decks */}
          <DebateDecks
            setRef={setRef}
            cardsPerRowDebates={cardsPerRow.debates}
            cardsPerRowTopic={cardsPerRow.topic}
            visit={game.visit}
            drawCardToTopic={drawCardToTopic}
            discardLost={game.discardLost}
            discardWon={game.discardWon}
            draw={game.draw}
            cardWidth={cardWidth}
          />
        </View>

        {/* Hand Area */}
        <View
          style={[
            flexStyles.colCentered,
            flexStyles.fullWidth,
            flexStyles.gap20,
          ]}
        >
          {/* Advisor List */}
          <EmissaryHand
            setRef={setRef}
            animatingCardIds={animatingCardIds}
            advisors={game.advisors}
            discardFromHand={game.discardFromHand}
            setSelectedAdvisor={setSelectedAdvisor}
            selectedAdvisor={selectedAdvisor}
            visit={game.visit}
            cardsPerRow={cardsPerRow.other}
            debateWithCard={debateWithCard}
            discardCard={discardCard}
            canDebateWithCard={canDebateWithCard}
            hand={game.hand}
          />
        </View>
      </View>
    </GameWrapper>
  );
}
