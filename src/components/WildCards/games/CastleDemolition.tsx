import { useTranslation } from "@/i18n";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { EdgeCard } from "../engine/cards";
import { feel } from "../engine/feel";
import { useGameLoop } from "../engine/loop";
import { pick } from "../engine/stage";
import { TouchSurface } from "../engine/touch";
import { Dot, World } from "../engine/World";
import {
  CARD_LENGTH,
  CastleGame,
  ROCKS,
  type CastleEvent,
  type RockKind,
} from "./castle-demolition";
import type { WildGameProps } from "./types";

export const PRAISE = [
  "nice",
  "excellent",
  "sweet",
  "smashing",
  "bravo",
  "timber",
  "superb",
  "splendid",
  "magnificent",
  "crumbled",
] as const;

const ROCK_COLORS: Record<RockKind, { fill: string; light: string; edge: string }> = {
  pebble: { fill: "#b8b0a3", light: "#d9d2c6", edge: "#7d766c" },
  stone: { fill: "#8f887e", light: "#b3ab9f", edge: "#5b554d" },
  boulder: { fill: "#6d665d", light: "#8e867b", edge: "#3e3a34" },
};

/** Heaped rocks on each pile, as offsets in radii from the pile's foot. */
const HEAP = [
  [-1.9, -1],
  [0, -1],
  [1.9, -1],
  [-0.95, -2.6],
  [0.95, -2.6],
  [0, -4.1],
];

export function CastleDemolition({ stage, hud }: WildGameProps) {
  "use no memo";
  const { t } = useTranslation("wild");
  const [game] = useState(() => new CastleGame(stage.W, stage.H));
  const [score, setScore] = useState(0);
  const [thrown, setThrown] = useState(false);

  useEffect(() => {
    hud.setScore(score);
  }, [score]);

  useEffect(() => {
    hud.setPrompt(
      thrown
        ? t("castle.castle", { number: game.castleNumber })
        : t("castle.instructions"),
    );
  });

  game.onEvent = (event: CastleEvent) => {
    switch (event.type) {
      case "pick":
        feel("tick");
        break;
      case "throw":
        feel("tap");
        setThrown(true);
        break;
      case "fumble":
        feel("tick");
        hud.flash(t(event.reason === "tooFast" ? "castle.tooFast" : "castle.unsteady"), 2400);
        break;
      case "slip":
        hud.flash(t("castle.slip"), 2200);
        break;
      case "cardsDown":
        setScore((current) => current + event.count);
        feel("tick", 90);
        break;
      case "landed":
        if (event.kind === "boulder") feel("thud", 150);
        else if (event.kind === "stone") feel("tap", 100);
        else feel("tick", 100);
        break;
      case "destroyed":
        setScore((current) => current + 10);
        feel("win");
        hud.flash(t(`praise.${pick(PRAISE)}`), 3000);
        break;
      case "newCastle":
        break;
    }
  };

  useGameLoop((dt) => game.step(dt));

  const held = game.held;
  const destroyed = game.destroyedAt !== null;

  return (
    <TouchSurface
      stage={stage}
      handlers={{
        onStart: (touch) => game.touchStart(touch),
        onMove: (touch) => game.touchMove(touch),
        onEnd: (touch) => game.touchEnd(touch),
      }}
    >
      <World stage={stage}>
        {/* The ground everything stands on. */}
        <View
          style={{
            position: "absolute",
            left: -400,
            right: -400,
            top: game.groundY,
            height: stage.H,
            backgroundColor: "rgba(24, 18, 12, 0.72)",
            borderTopWidth: 2,
            borderTopColor: "rgba(236, 222, 196, 0.22)",
          }}
        />

        {/* How far a rock can be carried before it's let go. */}
        {held && !held.picking && (
          <View
            style={{
              position: "absolute",
              left: game.throwLineX - 1,
              top: stage.topClear,
              width: 2,
              bottom: stage.H - game.groundY,
              backgroundColor: "rgba(255, 255, 255, 0.12)",
            }}
          />
        )}

        {game.piles.map((pile) => {
          const r = ROCKS[pile.kind].radius;
          return HEAP.map(([dx, dy], i) => (
            <Rock
              key={`${pile.kind}${i}`}
              kind={pile.kind}
              x={pile.x + dx * r * (pile.kind === "pebble" ? 1.3 : 1)}
              y={pile.y + dy * r * 0.9}
              angle={i * 1.7}
            />
          ));
        })}

        {game.cards.map((card) =>
          card.gone ? null : (
            // Floors are the same card lying flat: turned a quarter.
            <EdgeCard
              key={card.id}
              x={card.body.position.x}
              y={card.body.position.y}
              length={CARD_LENGTH}
              angle={card.body.angle + (card.kind === "floor" ? Math.PI / 2 : 0)}
              opacity={destroyed ? 0.92 : 1}
            />
          ),
        )}

        {game.rocks.map((rock) => (
          <Rock
            key={rock.id}
            kind={rock.kind}
            x={rock.body.position.x}
            y={rock.body.position.y}
            angle={rock.body.angle}
            opacity={Math.min(1, (2600 - rock.still) / 500)}
          />
        ))}

        {held && (
          <Rock kind={held.kind} x={held.x} y={held.y} angle={0} lifted />
        )}

        {game.dust.map((puff, i) => (
          <Dot
            key={i}
            x={puff.x}
            y={puff.y - puff.age * 0.02}
            r={puff.size * (0.6 + puff.age / 900)}
            color="#d8cbb4"
            opacity={0.35 * (1 - puff.age / 900)}
          />
        ))}
      </World>
    </TouchSurface>
  );
}

function Rock({
  kind,
  x,
  y,
  angle,
  opacity = 1,
  lifted = false,
}: {
  kind: RockKind;
  x: number;
  y: number;
  angle: number;
  opacity?: number;
  lifted?: boolean;
}) {
  const r = ROCKS[kind].radius;
  const colors = ROCK_COLORS[kind];
  return (
    <View
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        // Not quite round, so the rolling shows.
        borderTopLeftRadius: r,
        borderTopRightRadius: r * 0.8,
        borderBottomLeftRadius: r * 0.85,
        borderBottomRightRadius: r,
        backgroundColor: colors.fill,
        borderWidth: Math.max(1, r * 0.12),
        borderColor: colors.edge,
        opacity,
        transform: [{ rotate: `${angle}rad` }, { scale: lifted ? 1.12 : 1 }],
        ...(lifted ? { boxShadow: "0px 6px 10px rgba(0, 0, 0, 0.45)" } : null),
      }}
    >
      <View
        style={{
          position: "absolute",
          left: r * 0.35,
          top: r * 0.3,
          width: r * 0.7,
          height: r * 0.45,
          borderRadius: r,
          backgroundColor: colors.light,
          opacity: 0.8,
        }}
      />
    </View>
  );
}
