import { WILD_FONT } from "@/styles/styles";
import { useTranslation } from "@/i18n";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { Text as RNText, View } from "react-native";
import { CardSprite } from "../engine/cards";
import { feel } from "../engine/feel";
import { useGameLoop } from "../engine/loop";
import { TouchSurface } from "../engine/touch";
import { Dot, Line, World } from "../engine/World";
import {
  CARD_H,
  CARD_W,
  comboName,
  CuttingDeckGame,
  type CuttingDeckEvent,
  type Half,
  type Target,
} from "./cutting-deck";
import type { WildGameProps } from "./types";

const ANNOUNCE_MS = 1300;

export function CuttingDeck({ stage, hud }: WildGameProps) {
  "use no memo";
  const { t } = useTranslation("wild");
  const [game] = useState(() => new CuttingDeckGame(stage.W, stage.H, stage.topClear));
  const [sliced, setSliced] = useState(false);

  useEffect(() => {
    hud.setScore(game.score);
    const best = game.bestCombo >= 2 ? comboName(game.bestCombo) : null;
    hud.setPrompt(
      !sliced
        ? t("cut.instructions")
        : best
          ? t("cut.best", { combo: t(`combo.${best}`) })
          : t("cut.keepGoing"),
    );
  });

  game.onEvent = (event: CuttingDeckEvent) => {
    switch (event.type) {
      case "throw":
        feel("tick", 40);
        break;
      case "slice":
        setSliced(true);
        feel("tap", 45);
        break;
      case "combo":
        if (event.hits >= 4) feel("win", 500);
        break;
    }
  };

  useGameLoop((dt) => game.step(dt));

  const announcement = game.announcement;
  const announceAge = announcement ? game.time - announcement.at : 0;

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
        {/* The band cards are flicked from. */}
        <LinearGradient
          colors={["rgba(255, 255, 255, 0)", "rgba(255, 255, 255, 0.07)"]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: game.zoneTop,
            bottom: 0,
            borderTopWidth: 1,
            borderTopColor: "rgba(255, 255, 255, 0.1)",
          }}
        />

        {[...game.targets.values()].map((target) =>
          target.kind === "fruit" ? (
            <Fruit key={target.id} target={target} />
          ) : (
            <Balloon key={target.id} target={target} wind={game.wind} />
          ),
        )}

        {game.halves.map((half) => (
          <FruitHalf key={half.id} half={half} />
        ))}

        {game.pops.map((pop, i) => {
          const k = pop.age / 320;
          const r = 18 + k * 30;
          return (
            <View
              key={`pop${i}`}
              style={{
                position: "absolute",
                left: pop.x - r,
                top: pop.y - r,
                width: r * 2,
                height: r * 2,
                borderRadius: r,
                borderWidth: 3 * (1 - k) + 0.5,
                borderColor: pop.color,
                opacity: 1 - k,
              }}
            />
          );
        })}

        {game.sparks.map((spark, i) => (
          <Dot
            key={`spark${i}`}
            x={spark.x}
            y={spark.y}
            r={spark.size * (1 - spark.age / spark.life / 2)}
            color={spark.color}
            opacity={1 - spark.age / spark.life}
          />
        ))}

        {/* Slash trails, thinning and fading behind each card. */}
        {game.cards.map((card) =>
          card.trail.slice(1).map((point, i) => {
            const from = card.trail[i];
            const k = (i + 1) / card.trail.length;
            return (
              <Line
                key={`trail${card.id}-${i}`}
                x1={from.x}
                y1={from.y}
                x2={point.x}
                y2={point.y}
                width={1 + k * 5}
                color="#fdf6e3"
                opacity={k * 0.55}
              />
            );
          }),
        )}
        {game.cards.map((card) => (
          <CardSprite
            key={card.id}
            card={card.face}
            x={card.body.position.x}
            y={card.body.position.y}
            w={CARD_W}
            h={CARD_H}
            angle={card.body.angle}
            shadow
          />
        ))}

        {game.swipes.map((points, s) =>
          points.slice(1).map((point, i) => (
            <Line
              key={`swipe${s}-${i}`}
              x1={points[i].x}
              y1={points[i].y}
              x2={point.x}
              y2={point.y}
              width={3}
              color="#ffffff"
              opacity={0.18 + (0.3 * i) / points.length}
            />
          )),
        )}

        {announcement && (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: stage.H * 0.4 - 40,
              alignItems: "center",
              opacity: Math.min(1, (ANNOUNCE_MS - announceAge) / 350),
              transform: [
                {
                  scale:
                    announceAge < 160
                      ? 0.6 + (announceAge / 160) * 0.55
                      : 1.15 - Math.min(0.15, (announceAge - 160) / 800),
                },
              ],
            }}
          >
            <RNText
              style={{
                fontFamily: WILD_FONT,
                fontSize: 40,
                lineHeight: 48,
                color: "#f6dc92",
                textAlign: "center",
                textShadowColor: "rgba(0, 0, 0, 0.7)",
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 10,
              }}
            >
              {t(`combo.${announcement.name}`)}
            </RNText>
          </View>
        )}
      </World>
    </TouchSurface>
  );
}

function Fruit({ target }: { target: Target }) {
  const { x, y } = target.body.position;
  const size = target.radius * 2;
  return (
    <View
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ rotate: `${target.body.angle}rad` }],
      }}
    >
      <RNText style={{ fontSize: size * 0.9, lineHeight: size * 1.1 }}>
        {target.look}
      </RNText>
    </View>
  );
}

/** One side of a sliced fruit: the whole fruit, clipped along the cut. */
function FruitHalf({ half }: { half: Half }) {
  const { x, y } = half.body.position;
  const size = half.radius * 2;
  return (
    <View
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        transform: [{ rotate: `${half.body.angle}rad` }],
      }}
    >
      <View
        style={{
          position: "absolute",
          left: 0,
          width: size,
          top: half.side < 0 ? 0 : size / 2,
          height: size / 2,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            left: 0,
            top: half.side < 0 ? 0 : -size / 2,
            width: size,
            height: size,
            alignItems: "center",
            justifyContent: "center",
            // The fruit is turned so the cut runs across the clip.
            transform: [{ rotate: `${-half.cut}rad` }],
          }}
        >
          <RNText style={{ fontSize: size * 0.9, lineHeight: size * 1.1 }}>
            {half.look}
          </RNText>
        </View>
      </View>
    </View>
  );
}

function Balloon({ target, wind }: { target: Target; wind: number }) {
  const { x, y } = target.body.position;
  const r = target.radius;
  const w = r * 1.8;
  const h = r * 2.2;
  // The string trails away from the breeze.
  const sway = -wind * 400000;
  return (
    <>
      <Line
        x1={x}
        y1={y + h / 2}
        x2={x + sway}
        y2={y + h / 2 + 38}
        width={1}
        color="rgba(240, 235, 225, 0.6)"
      />
      <View
        style={{
          position: "absolute",
          left: x - 3,
          top: y + h / 2 - 2,
          width: 6,
          height: 5,
          borderRadius: 2,
          backgroundColor: target.look,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: x - w / 2,
          top: y - h / 2,
          width: w,
          height: h,
          borderRadius: w / 2,
          borderBottomLeftRadius: w * 0.46,
          borderBottomRightRadius: w * 0.46,
          backgroundColor: target.look,
          boxShadow: "inset -6px -8px 12px rgba(0, 0, 0, 0.25)",
        }}
      >
        <View
          style={{
            position: "absolute",
            left: w * 0.2,
            top: h * 0.14,
            width: w * 0.22,
            height: h * 0.26,
            borderRadius: w,
            backgroundColor: "rgba(255, 255, 255, 0.45)",
            transform: [{ rotate: "0.4rad" }],
          }}
        />
      </View>
    </>
  );
}
