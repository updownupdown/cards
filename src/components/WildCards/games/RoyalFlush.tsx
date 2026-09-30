import { useTranslation } from "@/i18n";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { CardSprite, type PlayingCard } from "../engine/cards";
import { columnsFor, DotMatrix } from "../engine/DotMatrix";
import { feel } from "../engine/feel";
import { useGameLoop } from "../engine/loop";
import { TouchSurface } from "../engine/touch";
import { Dot, Line, World } from "../engine/World";
import {
  BLINK_MS,
  CARD_H,
  CARD_W,
  MARBLE_RADIUS,
  MAX_PULL,
  PLATE_WIDTH,
  beltVelocity,
  RoyalFlushGame,
  type Plate,
  type RoyalFlushEvent,
} from "./royal-flush";
import type { WildGameProps } from "./types";

const PLATE_COLORS = ["#d9a441", "#4fb8ac"];
const LED = { idle: "#ffb347", good: "#6cf59a", bad: "#ff5a52" };
/** Three cards to a line of the readout: "AS TD 9H". */
const READOUT_COLUMNS = columnsFor(8);
const BELT_HEIGHT = CARD_H + 14;

export function RoyalFlush({ stage, hud }: WildGameProps) {
  "use no memo";
  const { t } = useTranslation("wild");
  const [game] = useState(
    () =>
      new RoyalFlushGame(
        stage.W,
        stage.H,
        stage.topClear,
        stage.H - Math.max(stage.bottomClear, 10),
      ),
  );
  const [shot, setShot] = useState(false);

  useEffect(() => {
    hud.setScore(game.score);
    hud.setPrompt(shot ? t("flush.goal") : t("flush.instructions"));
  });

  game.onEvent = (event: RoyalFlushEvent) => {
    switch (event.type) {
      case "stretch":
        feel("tick", 25);
        break;
      case "shoot":
        feel("tap");
        setShot(true);
        break;
      case "knock":
        feel("tick", 60);
        break;
      case "caught":
        feel("tick", 60);
        break;
      case "hand":
        feel("win");
        hud.flash(
          t("flush.scored", { hand: t(`hand.${event.hand}`), points: event.points }),
          2200,
        );
        break;
      case "bust":
        feel("tap");
        hud.flash(t("flush.bust"), 2000);
        break;
    }
  };

  useGameLoop((dt) => game.step(dt));

  const { sling } = game;
  const pouch = game.pouch;
  const stretch = game.pull
    ? Math.hypot(pouch.x - sling.x, pouch.y - sling.y) / MAX_PULL
    : 0;
  const forkTips = [
    { x: sling.x - sling.forkHalf, y: sling.y - 8 },
    { x: sling.x + sling.forkHalf, y: sling.y - 8 },
  ];

  return (
    <TouchSurface
      stage={stage}
      handlers={{
        onStart: (touch) => game.touchStart(touch),
        onMove: (touch) => game.touchMove(touch),
        onEnd: (touch, cancelled) => game.touchEnd(touch, cancelled),
      }}
    >
      <World stage={stage}>
        {game.beltYs.map((y, belt) => (
          <Belt
            key={belt}
            y={y}
            width={stage.W}
            offset={(game.time / 1000) * beltVelocity(belt)}
          />
        ))}

        {game.cards.map((card) => (
          <CardSprite
            key={card.id}
            card={card.face}
            x={card.body.position.x}
            y={card.body.position.y}
            w={CARD_W}
            h={CARD_H}
            angle={card.body.angle}
            shadow={card.falling}
          />
        ))}

        {game.plates.map((plate, i) => (
          <PlateView key={i} plate={plate} color={PLATE_COLORS[i]} />
        ))}

        {game.plates.map((plate, i) => (
          <DotMatrix
            key={`readout${i}`}
            text={readout(plate, game.time)}
            columns={READOUT_COLUMNS}
            lines={2}
            x={stage.W * (i === 0 ? 0.26 : 0.74)}
            y={game.displayY}
            width={stage.W * 0.4}
            color={
              plate.verdict ? (plate.verdict.hand ? LED.good : LED.bad) : LED.idle
            }
            frame={PLATE_COLORS[i]}
          />
        ))}

        {game.spilled.map((card) => (
          <CardSprite
            key={card.id}
            card={card.face}
            x={card.x}
            y={card.y}
            w={CARD_W}
            h={CARD_H}
            angle={card.angle}
          />
        ))}

        {/* Slingshot: the handle and fork, the band, the pouch. */}
        <Line
          x1={sling.x}
          y1={sling.y + 70}
          x2={sling.x}
          y2={sling.y + 22}
          width={9}
          color="#5b3a22"
        />
        {forkTips.map((tip, i) => (
          <Line
            key={`arm${i}`}
            x1={sling.x}
            y1={sling.y + 24}
            x2={tip.x}
            y2={tip.y}
            width={7}
            color="#6e4729"
          />
        ))}
        {game.aimLine().map((point, i) => (
          <Dot
            key={`aim${i}`}
            x={point.x}
            y={point.y}
            r={2.6 - i * 0.08}
            color="#ffffff"
            opacity={0.85 - i * 0.05}
          />
        ))}
        {forkTips.map((tip, i) => (
          <Line
            key={`band${i}`}
            x1={tip.x}
            y1={tip.y}
            x2={pouch.x}
            y2={pouch.y}
            width={4 - stretch * 2}
            color="#b8432f"
          />
        ))}
        <Marble x={pouch.x} y={pouch.y} />

        {game.marbles.map((marble) => (
          <Marble
            key={marble.id}
            x={marble.body.position.x}
            y={marble.body.position.y}
          />
        ))}
      </World>
    </TouchSurface>
  );
}

/** A plate's cards as "AS TD 9H", three to a line, blinking at a verdict. */
function readout(plate: Plate, time: number) {
  if (plate.verdict && Math.floor((time - plate.verdict.at) / 170) % 2 === 1) {
    return "";
  }
  if (plate.verdict && time - plate.verdict.at > BLINK_MS - 100) return "";
  const tokens = plate.cards.map(cardToken);
  return [tokens.slice(0, 3).join(" "), tokens.slice(3).join(" ")].join("\n");
}

const RANK_GLYPHS: Record<number, string> = { 1: "A", 10: "T", 11: "J", 12: "Q", 13: "K" };
const cardToken = (card: PlayingCard) =>
  `${RANK_GLYPHS[card.rank] ?? String(card.rank)}${card.suit}`;

function PlateView({ plate, color }: { plate: Plate; color: string }) {
  const w = PLATE_WIDTH;
  const h = 22;
  return (
    <>
      <View
        style={{
          position: "absolute",
          left: plate.x - w / 2,
          top: plate.y - h / 2 + 6,
          width: w,
          height: h,
          borderRadius: w,
          backgroundColor: "rgba(0, 0, 0, 0.35)",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: plate.x - w / 2,
          top: plate.y - h / 2,
          width: w,
          height: h,
          borderRadius: w,
          backgroundColor: "#e9e4da",
          borderWidth: 3,
          borderColor: color,
        }}
      />
      {/* The cards lie almost flat, a little askew. */}
      {plate.cards.map((card, i) => (
        <CardSprite
          key={`${card.rank}${card.suit}${i}`}
          card={card}
          x={plate.x + (i - (plate.cards.length - 1) / 2) * 9}
          y={plate.y - 2 - i * 0.8}
          w={CARD_W * 0.9}
          h={CARD_H * 0.9}
          angle={((card.rank * 7 + i * 13) % 11) * 0.06 - 0.3}
          squash={0.28}
        />
      ))}
    </>
  );
}

function Belt({ y, width, offset }: { y: number; width: number; offset: number }) {
  const spacing = 22;
  const shift = ((offset % spacing) + spacing) % spacing;
  return (
    <>
      <View
        style={{
          position: "absolute",
          left: -10,
          width: width + 20,
          top: y - BELT_HEIGHT / 2 + 8,
          height: BELT_HEIGHT - 8,
          backgroundColor: "rgba(20, 16, 22, 0.78)",
          borderTopWidth: 2,
          borderBottomWidth: 2,
          borderColor: "rgba(210, 200, 220, 0.25)",
        }}
      />
      {/* Treads moving along with the belt. */}
      {Array.from({ length: Math.ceil(width / spacing) + 2 }, (_, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: i * spacing - spacing + shift,
            top: y + BELT_HEIGHT / 2 - 4,
            width: 8,
            height: 2,
            backgroundColor: "rgba(210, 200, 220, 0.3)",
          }}
        />
      ))}
    </>
  );
}

function Marble({ x, y }: { x: number; y: number }) {
  const r = MARBLE_RADIUS;
  return (
    <View
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: "#6ca7e0",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.5)",
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.4)",
      }}
    >
      <View
        style={{
          position: "absolute",
          left: r * 0.35,
          top: r * 0.25,
          width: r * 0.6,
          height: r * 0.5,
          borderRadius: r,
          backgroundColor: "rgba(255, 255, 255, 0.75)",
        }}
      />
    </View>
  );
}
