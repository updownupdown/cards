import { WILD_FONT } from "@/styles/styles";
import { useTranslation } from "@/i18n";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { Text as RNText, View } from "react-native";
import { CardSprite } from "../engine/cards";
import { feel } from "../engine/feel";
import { useGameLoop } from "../engine/loop";
import { TouchSurface } from "../engine/touch";
import { Line, World } from "../engine/World";
import {
  CARD_H,
  CARD_W,
  CARDS_PER_ROUND,
  ShuffleboardGame,
  ZONES,
  type ShuffleboardEvent,
  type Surface,
} from "./shuffleboard";
import type { WildGameProps } from "./types";

const SURFACE_LOOK: Record<
  Surface,
  { base: string; sheen: [string, string, string]; grain: string; grainOpacity: number }
> = {
  felt: {
    base: "#1f5f3f",
    sheen: ["rgba(0,0,0,0.25)", "rgba(255,255,255,0.06)", "rgba(0,0,0,0.25)"],
    grain: "#0f3a25",
    grainOpacity: 0.35,
  },
  mahogany: {
    base: "#5a2716",
    sheen: ["rgba(0,0,0,0.3)", "rgba(255,210,170,0.12)", "rgba(0,0,0,0.3)"],
    grain: "#2e0f06",
    grainOpacity: 0.45,
  },
  slate: {
    base: "#4f6676",
    sheen: ["rgba(0,0,0,0.2)", "rgba(220,240,255,0.18)", "rgba(0,0,0,0.2)"],
    grain: "#dbeaf3",
    grainOpacity: 0.16,
  },
};

/** Steady "random" lines for a surface's grain, the same every frame. */
const GRAIN = Array.from({ length: 16 }, (_, i) => ({
  x: ((i * 37) % 97) / 97,
  width: 0.6 + ((i * 13) % 5) * 0.35,
  opacity: 0.35 + ((i * 29) % 7) / 10,
}));

export function Shuffleboard({ stage, hud }: WildGameProps) {
  "use no memo";
  const { t } = useTranslation("wild");
  const [game] = useState(
    () =>
      new ShuffleboardGame(
        stage.W,
        stage.H,
        stage.topClear,
        stage.H - Math.max(stage.bottomClear, 8),
      ),
  );
  const [started, setStarted] = useState(false);
  const toldAboutSweeping = useRef(false);

  useEffect(() => {
    hud.setScore(game.score);
    hud.setPrompt(
      started
        ? t("board.status", {
            surface: t(`surface.${game.surface}`),
            card: Math.min(CARDS_PER_ROUND, game.thrownThisRound + (game.waiting ? 1 : 0)),
            total: CARDS_PER_ROUND,
          })
        : t("board.instructions"),
    );
  });

  game.onEvent = (event: ShuffleboardEvent) => {
    switch (event.type) {
      case "slide":
        feel("tap");
        setStarted(true);
        if (!toldAboutSweeping.current) {
          toldAboutSweeping.current = true;
          hud.flash(t("board.sweepHint"), 3200);
        }
        break;
      case "sweep":
        feel("tick", 70);
        break;
      case "knock":
        feel("tick", 80);
        break;
      case "gutter":
        feel("tick");
        hud.flash(t("board.gutter"), 1500);
        break;
      case "stopped":
        feel("tick", 80);
        break;
      case "roundOver":
        if (event.points > 0) feel("win");
        hud.flash(t("board.round", { round: event.round, points: event.points }), 2200);
        break;
      case "newRound":
        break;
    }
  };

  useGameLoop((dt) => game.step(dt));

  const { lane } = game;
  const look = SURFACE_LOOK[game.surface];
  const laneWidth = lane.right - lane.left;
  const laneHeight = lane.start - lane.end;

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
        {/* The table's frame and gutters. */}
        <View
          style={{
            position: "absolute",
            left: lane.left - 18,
            top: lane.end - 18,
            width: laneWidth + 36,
            height: laneHeight + 30,
            borderRadius: 10,
            backgroundColor: "#1a120d",
            boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.55)",
          }}
        />
        <View
          style={{
            position: "absolute",
            left: lane.left,
            top: lane.end,
            width: laneWidth,
            height: laneHeight,
            backgroundColor: look.base,
            overflow: "hidden",
          }}
        >
          {GRAIN.map((line, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: line.x * laneWidth,
                top: game.surface === "slate" ? -40 : 0,
                width: line.width,
                height: laneHeight + 80,
                backgroundColor: look.grain,
                opacity: look.grainOpacity * line.opacity,
                transform: game.surface === "slate" ? [{ rotate: "0.35rad" }] : [],
              }}
            />
          ))}
          <LinearGradient
            colors={look.sheen}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}
          />
        </View>

        {ZONES.map((zone) => (
          <View
            key={zone.points}
            style={{
              position: "absolute",
              left: lane.left,
              width: laneWidth,
              top: lane.end + zone.from,
              height: zone.to - zone.from,
              backgroundColor:
                zone.points === 4
                  ? "rgba(236, 196, 96, 0.22)"
                  : zone.points % 2 === 1
                    ? "rgba(255, 255, 255, 0.07)"
                    : "rgba(0, 0, 0, 0.05)",
              borderBottomWidth: 1.5,
              borderBottomColor: "rgba(255, 250, 235, 0.55)",
              justifyContent: "center",
              paddingLeft: 8,
            }}
          >
            <RNText
              style={{
                fontFamily: WILD_FONT,
                fontVariant: ["lining-nums"],
                fontSize: 18,
                color: "rgba(255, 250, 235, 0.75)",
              }}
            >
              {zone.points}
            </RNText>
          </View>
        ))}

        {/* The foul line: let go before it. */}
        {Array.from({ length: 14 }, (_, i) => (
          <View
            key={`foul${i}`}
            style={{
              position: "absolute",
              left: lane.left + 4 + (i * (laneWidth - 8)) / 14,
              top: game.foulY - 1,
              width: (laneWidth - 8) / 28,
              height: 2,
              backgroundColor: "rgba(255, 250, 235, 0.4)",
            }}
          />
        ))}

        {game.marks.map((mark, i) => (
          <Line
            key={`mark${i}`}
            x1={mark.x1}
            y1={mark.y1}
            x2={mark.x2}
            y2={mark.y2}
            width={4}
            color="#ffffff"
            opacity={0.3 * (1 - mark.age / 1200)}
          />
        ))}

        {game.cards.map((card) =>
          card.state === "off" ? null : (
            <CardSprite
              key={card.id}
              card={card.face}
              x={
                card.state === "gutter"
                  ? card.body.position.x < stage.W / 2
                    ? lane.left - 9
                    : lane.right + 9
                  : card.body.position.x
              }
              y={card.body.position.y}
              w={card.state === "gutter" ? CARD_W * 0.55 : CARD_W}
              h={card.state === "gutter" ? CARD_H * 0.55 : CARD_H}
              angle={card.body.angle}
              opacity={card.state === "gutter" ? 0.5 : 1}
              shadow={card.state !== "gutter"}
            />
          ),
        )}

        {game.waiting && (
          <CardSprite
            card={game.waiting.face}
            x={game.waiting.x}
            y={game.waiting.y}
            w={CARD_W * 1.06}
            h={CARD_H * 1.06}
            shadow
          />
        )}
      </World>
    </TouchSurface>
  );
}
