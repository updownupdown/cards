import { useTranslation } from "@/i18n";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { EdgeCard } from "../engine/cards";
import { feel } from "../engine/feel";
import { useGameLoop } from "../engine/loop";
import { pick } from "../engine/stage";
import { TouchSurface } from "../engine/touch";
import { Dot, Line, World } from "../engine/World";
import {
  CARD_LENGTH,
  CastleGame,
  STONE,
  type CastleEvent,
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

const STONE_COLORS = { fill: "#8f887e", light: "#b3ab9f", edge: "#5b554d" };
/** How much of the stone's flight the dashed line shows, in points 10 apart. */
const AIM_POINTS = 17;
const WOOD = "#8a5a33";
const WOOD_DARK = "#5e3b20";

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
      case "wind":
        feel("tick");
        break;
      case "fire":
        feel("tap");
        setThrown(true);
        break;
      case "cardsDown":
        setScore((current) => current + event.count);
        feel("tick", 90);
        break;
      case "landed":
        feel(event.hard ? "thud" : "tap", 150);
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

        <Catapult game={game} />

        {game.cards.map((card) =>
          card.gone ? null : (
            // Floors are the same card lying flat: turned a quarter.
            <EdgeCard
              key={card.id}
              x={card.body.position.x}
              y={card.body.position.y}
              length={CARD_LENGTH}
              angle={
                card.body.angle + (card.kind === "floor" ? Math.PI / 2 : 0)
              }
              opacity={destroyed ? 0.92 : 1}
            />
          ),
        )}

        {game.rocks.map((rock) => (
          <Rock
            key={rock.id}
            x={rock.body.position.x}
            y={rock.body.position.y}
            angle={rock.body.angle}
            opacity={Math.min(1, (2600 - rock.still) / 500)}
          />
        ))}

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

/**
 * The catapult: a wheeled frame, and an arm that follows the finger as it's
 * pulled back and swings up when let go. A dashed line shows where the stone
 * would fly, and a faint mark where the arm was for the last shot.
 */
function Catapult({ game }: { game: CastleGame }) {
  const { pivot, groundY } = game;
  const tip = game.armTip();
  const stopY = pivot.y - 66;
  const last =
    game.lastPull !== null
      ? game.armTip(game.armAngleFor(game.lastPull))
      : null;
  const aim = game.aimPull;
  // Only the start of the flight: enough to judge the throw, not to aim it.
  const path = aim === null ? [] : game.trajectory(aim).slice(0, AIM_POINTS);
  return (
    <>
      {/* Where the stone sets off, a dash for every other stretch of it. */}
      {path.map((point, i) =>
        i % 2 === 0 && i + 1 < path.length ? (
          <Line
            key={i}
            x1={point.x}
            y1={point.y}
            x2={path[i + 1].x}
            y2={path[i + 1].y}
            width={2.5}
            color="#ffffff"
            // Fading out towards its end.
            opacity={0.75 * (1 - i / AIM_POINTS)}
          />
        ) : null,
      )}

      {/* The rope to the winch, taut while winding. */}
      {game.winding && (
        <Line
          x1={tip.x}
          y1={tip.y}
          x2={pivot.x - 44}
          y2={groundY - 16}
          width={1.5}
          color="rgba(230, 214, 180, 0.8)"
        />
      )}
      {last && (
        <Dot x={last.x} y={last.y} r={6} color="#ffffff" opacity={0.22} />
      )}

      {/* The frame: posts up to the pivot, and the stop the arm hits. */}
      <Line
        x1={pivot.x - 22}
        y1={groundY - 12}
        x2={pivot.x}
        y2={pivot.y}
        width={6}
        color={WOOD_DARK}
      />
      <Line
        x1={pivot.x + 22}
        y1={groundY - 12}
        x2={pivot.x}
        y2={pivot.y}
        width={6}
        color={WOOD_DARK}
      />
      <Line
        x1={pivot.x + 24}
        y1={groundY - 12}
        x2={pivot.x + 22}
        y2={stopY}
        width={6}
        color={WOOD_DARK}
      />
      <Line
        x1={pivot.x + 6}
        y1={stopY}
        x2={pivot.x + 32}
        y2={stopY}
        width={6}
        color={WOOD_DARK}
      />
      <View
        style={{
          position: "absolute",
          left: pivot.x - 58,
          top: groundY - 20,
          width: 104,
          height: 10,
          borderRadius: 3,
          backgroundColor: WOOD,
        }}
      />
      {/* The winch. */}
      <Dot
        x={pivot.x - 44}
        y={groundY - 16}
        r={6}
        color={WOOD_DARK}
        borderColor={WOOD}
      />

      {/* The arm and its bucket. */}
      <Line
        x1={pivot.x}
        y1={pivot.y}
        x2={tip.x}
        y2={tip.y}
        width={8}
        color={WOOD}
      />
      <Dot x={tip.x} y={tip.y} r={STONE.radius + 4} color={WOOD_DARK} />
      {game.stoneInBucket && <Rock x={tip.x} y={tip.y} angle={0} />}
      <Dot x={pivot.x} y={pivot.y} r={5} color="#3a2616" />

      {[pivot.x - 40, pivot.x + 30].map((x) => (
        <Dot
          key={x}
          x={x}
          y={groundY - 12}
          r={12}
          color="#4a2f1a"
          borderColor={WOOD}
        />
      ))}
    </>
  );
}

function Rock({
  x,
  y,
  angle,
  opacity = 1,
}: {
  x: number;
  y: number;
  angle: number;
  opacity?: number;
}) {
  const r = STONE.radius;
  const colors = STONE_COLORS;
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
        transform: [{ rotate: `${angle}rad` }],
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
