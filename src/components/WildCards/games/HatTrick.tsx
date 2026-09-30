import { useTranslation } from "@/i18n";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { View } from "react-native";
import { CardSprite } from "../engine/cards";
import { feel } from "../engine/feel";
import { useGameLoop } from "../engine/loop";
import { pick } from "../engine/stage";
import { requestTiltPermission, useTilt } from "../engine/tilt";
import { TouchSurface } from "../engine/touch";
import { Dot, World } from "../engine/World";
import { PRAISE } from "./CastleDemolition";
import {
  CARD_H,
  CARD_W,
  DECK_SIZE,
  HAT,
  HatTrickGame,
  type HatTrickEvent,
} from "./hat-trick";
import type { WildGameProps } from "./types";

/** Floorboards, running away from the player: their x across the floor. */
const BOARDS = [-360, -270, -180, -90, 0, 90, 180, 270, 360];

export function HatTrick({ stage, hud }: WildGameProps) {
  "use no memo";
  const { t } = useTranslation("wild");
  const tilt = useTilt(true);
  const [game] = useState(() => new HatTrickGame(stage.W, stage.H, stage.topClear, tilt));
  const [, setVersion] = useState(0);
  const toldAboutTilt = useRef(false);
  const askedForTilt = useRef(false);

  useEffect(() => {
    hud.setScore(game.score);
    if (game.finished) {
      hud.setPrompt(t("hat.playAgain", { score: game.score }), () => {
        game.newDeck();
        setVersion((v) => v + 1);
      });
    } else if (game.thrown === 0) {
      hud.setPrompt(t("hat.instructions"));
    } else {
      hud.setPrompt(t("hat.cardsLeft", { count: DECK_SIZE - game.thrown }));
    }
  });

  game.onEvent = (event: HatTrickEvent) => {
    switch (event.type) {
      case "throw":
        feel("tick");
        if (!toldAboutTilt.current && tilt.current.live) {
          toldAboutTilt.current = true;
          hud.flash(t("hat.tiltHint"), 2600);
        }
        break;
      case "inHat":
        feel("tap");
        hud.flash(t(`praise.${pick(PRAISE)}`), 1400);
        break;
      case "rim":
        feel("tick", 150);
        hud.flash(t("hat.rim"), 1400);
        break;
      case "landed":
        feel("tick", 120);
        if (event.near) hud.flash(t(event.short ? "hat.short" : "hat.long"), 1400);
        break;
      case "deckDone":
        feel("win");
        break;
      case "newDeck":
        break;
    }
  };

  useGameLoop((dt) => game.step(dt));

  const drawables: { d: number; key: string; node: ReactNode }[] = [];

  for (const card of game.cards) {
    if (card.state === "hat") continue;
    const floor = game.project(card.x, card.d, 0);
    if (card.state === "floor") {
      drawables.push({
        d: card.d + 0.1,
        key: `shadow${card.id}`,
        node: (
          <Ellipse
            x={floor.sx}
            y={floor.sy + 1.5}
            r={CARD_W * 0.62 * floor.scale}
            squash={floor.squash}
            color="#000000"
            opacity={0.3}
          />
        ),
      });
    }
    if (card.state === "flying") {
      drawables.push({
        d: card.d + 0.1,
        key: `shadow${card.id}`,
        node: (
          <Ellipse
            x={floor.sx}
            y={floor.sy}
            r={CARD_W * 0.75 * floor.scale}
            squash={floor.squash}
            color="#000000"
            opacity={0.32 * Math.max(0.2, 1 - card.z / 160)}
          />
        ),
      });
    }
    const at = game.project(card.x, card.d, card.z);
    drawables.push({
      d: card.d,
      key: `card${card.id}`,
      node: (
        <CardSprite
          card={card.face}
          x={at.sx}
          y={at.sy}
          w={CARD_W * at.scale}
          h={CARD_H * at.scale}
          angle={card.angle}
          squash={at.squash}
          opacity={card.state === "floor" ? 0.85 : 1}
        />
      ),
    });
  }
  drawables.push({ d: game.hat.d, key: "hat", node: <Hat game={game} /> });
  drawables.sort((a, b) => b.d - a.d);

  const hand = game.handScreen;
  const next = game.nextCard;
  const held = game.hand;

  return (
    <TouchSurface
      stage={stage}
      handlers={{
        onStart: (touch) => {
          if (!askedForTilt.current) {
            askedForTilt.current = true;
            requestTiltPermission();
          }
          game.touchStart(touch);
        },
        onMove: (touch) => game.touchMove(touch),
        onEnd: (touch, cancelled) => game.touchEnd(touch, cancelled),
      }}
    >
      <World stage={stage}>
        {/* The floor darkens towards the player, so it reads as a floor. */}
        <LinearGradient
          colors={["rgba(12, 8, 6, 0)", "rgba(12, 8, 6, 0.5)"]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: game.project(0, 700, 0).sy,
            bottom: 0,
          }}
        />
        {BOARDS.map((x) => {
          const near = game.project(x, -80, 0);
          const far = game.project(x, 900, 0);
          return <Line key={x} from={near} to={far} />;
        })}

        {game.motes.map((mote, i) => {
          const at = game.project(mote.x, mote.d, mote.z);
          return (
            <Dot
              key={i}
              x={at.sx}
              y={at.sy}
              r={Math.max(0.6, 1.6 * at.scale)}
              color="#f1e6cf"
              opacity={0.3}
            />
          );
        })}

        {drawables.map((item) => (
          <View key={item.key} style={{ position: "absolute", left: 0, top: 0 }}>
            {item.node}
          </View>
        ))}

        {/* The mat at the bottom: flick from anywhere on it. */}
        <View
          style={{
            position: "absolute",
            left: 18,
            right: 18,
            top: game.zoneTop,
            bottom: stage.bottomClear + 14,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.08)",
            backgroundColor: "rgba(0, 0, 0, 0.14)",
          }}
        />

        {next && (
          <CardSprite
            card={next}
            x={hand.sx + (held?.dx ?? 0)}
            y={hand.sy + (held?.dy ?? 0)}
            w={CARD_W * hand.scale * 1.1}
            h={CARD_H * hand.scale * 1.1}
            squash={0.88}
            shadow
          />
        )}
      </World>
    </TouchSurface>
  );
}

/** An upside-down top hat, standing on the floor with its opening up. */
function Hat({ game }: { game: HatTrickGame }) {
  const base = game.project(game.hat.x, game.hat.d, 0);
  const top = game.project(game.hat.x, game.hat.d, HAT.height);
  const crown = HAT.crownRadius * (base.scale + top.scale) * 0.5;
  const band = (base.sy - top.sy) * 0.22;
  const sinking = game.cards.filter((c) => c.state === "hat" && c.restedFor < 0.35);

  return (
    <>
      <Ellipse
        x={base.sx}
        y={base.sy + 2}
        r={HAT.brimRadius * base.scale}
        squash={base.squash}
        color="#000000"
        opacity={0.38}
      />
      <Ellipse
        x={base.sx}
        y={base.sy}
        r={crown}
        squash={base.squash}
        color="#141417"
      />
      <View
        style={{
          position: "absolute",
          left: top.sx - crown,
          top: top.sy,
          width: crown * 2,
          height: base.sy - top.sy,
          backgroundColor: "#18181c",
        }}
      />
      {/* A sheen down one side, so it reads as round. */}
      <View
        style={{
          position: "absolute",
          left: top.sx - crown * 0.55,
          top: top.sy,
          width: crown * 0.28,
          height: base.sy - top.sy,
          backgroundColor: "rgba(255, 255, 255, 0.07)",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: top.sx - crown,
          top: top.sy + band * 0.25,
          width: crown * 2,
          height: band,
          backgroundColor: "#5c1822",
        }}
      />
      <Ellipse
        x={top.sx}
        y={top.sy}
        r={HAT.brimRadius * top.scale}
        squash={top.squash}
        color="#1d1d22"
        border="rgba(255, 255, 255, 0.16)"
      />
      <Ellipse
        x={top.sx}
        y={top.sy}
        r={HAT.openingRadius * top.scale}
        squash={top.squash}
        color="#050507"
      />
      {sinking.map((card) => {
        const k = 1 - card.restedFor / 0.35;
        return (
          <CardSprite
            key={card.id}
            card={card.face}
            x={top.sx + (card.x - game.hat.x) * top.scale * k}
            y={top.sy + (1 - k) * 4}
            w={CARD_W * top.scale * k}
            h={CARD_H * top.scale * k}
            angle={card.angle}
            squash={top.squash}
            opacity={k}
          />
        );
      })}
    </>
  );
}

function Ellipse({
  x,
  y,
  r,
  squash,
  color,
  opacity = 1,
  border,
}: {
  x: number;
  y: number;
  r: number;
  squash: number;
  color: string;
  opacity?: number;
  border?: string;
}) {
  return (
    <View
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: color,
        opacity,
        transform: [{ scaleY: squash }],
        ...(border ? { borderWidth: 1.5, borderColor: border } : null),
      }}
    />
  );
}

function Line({
  from,
  to,
}: {
  from: { sx: number; sy: number };
  to: { sx: number; sy: number };
}) {
  const length = Math.hypot(to.sx - from.sx, to.sy - from.sy);
  const angle = Math.atan2(to.sy - from.sy, to.sx - from.sx);
  return (
    <View
      style={{
        position: "absolute",
        left: (from.sx + to.sx) / 2 - length / 2,
        top: (from.sy + to.sy) / 2,
        width: length,
        height: 1,
        backgroundColor: "rgba(255, 240, 220, 0.07)",
        transform: [{ rotate: `${angle}rad` }],
      }}
    />
  );
}
