import { WILD_FONT } from "@/styles/styles";
import { useTranslation } from "@/i18n";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { CardSprite, EDGE_THICKNESS, EdgeCard } from "../engine/cards";
import { feel } from "../engine/feel";
import { useGameLoop } from "../engine/loop";
import { requestTiltPermission, useTilt } from "../engine/tilt";
import { TiltGauge } from "../engine/TiltGauge";
import { TouchSurface } from "../engine/touch";
import { Dot, Line, World } from "../engine/World";
import {
  ArchitectGame,
  CARD_LENGTH,
  type ArchitectEvent,
  type Difficulty,
} from "./architect";
import type { WildGameProps } from "./types";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const INK = "#f3eee6";

export function Architect({ stage, hud }: WildGameProps) {
  "use no memo";
  const { t } = useTranslation("wild");
  const tilt = useTilt(true);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [game] = useState(
    () =>
      new ArchitectGame(
        stage.W,
        stage.H,
        stage.H - Math.max(stage.bottomClear, 8),
        "easy",
        tilt,
      ),
  );
  const toldAboutTurning = useRef(false);
  const askedForTilt = useRef(false);
  const lastWhoops = useRef(-Infinity);

  useEffect(() => {
    const standing = game.standing.length;
    hud.setScore(standing);
    if (game.fallenCount > 0) {
      hud.setPrompt(t("architect.clear"), () => game.clear());
    } else if (standing === 0) {
      hud.setPrompt(t("architect.instructions"));
    } else {
      hud.setPrompt(t("architect.storeys", { count: Math.max(1, game.height) }));
    }
  });

  game.onEvent = (event: ArchitectEvent) => {
    switch (event.type) {
      case "pick":
        feel("tick");
        break;
      case "snap":
        feel("tap");
        // Easy lays a card flat by itself; the others need turning.
        if (
          game.difficulty !== "easy" &&
          !toldAboutTurning.current &&
          game.cards.filter((c) => c.partner).length >= 2
        ) {
          toldAboutTurning.current = true;
          hud.flash(t("architect.turnHint"), 3200);
        }
        break;
      case "drop":
        feel("tick", 90);
        break;
      case "fall":
        feel("thud", 250);
        if (game.time - lastWhoops.current > 2500) {
          lastWhoops.current = game.time;
          hud.flash(t("architect.fell"), 1400);
        }
        break;
      case "bump":
        feel("tick", 120);
        break;
    }
  };

  useGameLoop((dt) => game.step(dt));

  const choose = (next: Difficulty) => {
    if (next === difficulty) return;
    setDifficulty(next);
    game.setDifficulty(next);
    feel("tick");
  };

  const shakeX = Math.sin(game.time / 22) * game.shake * 4;
  const top = stage.offsetY + stage.topClear * stage.scale;
  const stability = game.stability;
  const meterColor = stability > 0.6 ? "#6cd98f" : stability > 0.3 ? "#f0b44c" : "#ef5a4f";

  return (
    <>
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
          <View
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: stage.W,
              height: stage.H,
              transform: [{ translateX: shakeX }],
            }}
          >
            {/* The table, and the tray of cards below it. */}
            <View
              style={{
                position: "absolute",
                left: -20,
                right: -20,
                top: game.groundY,
                height: 16,
                backgroundColor: "#6b4526",
                borderTopWidth: 2,
                borderTopColor: "#a3703f",
              }}
            />
            <View
              style={{
                position: "absolute",
                left: 14,
                right: 14,
                top: game.trayTop + 6,
                bottom: stage.bottomClear + 4,
                borderRadius: 16,
                backgroundColor: "rgba(20, 14, 10, 0.55)",
                borderWidth: 1,
                borderColor: "rgba(255, 240, 220, 0.12)",
              }}
            />
            {[0, 1, 2, 3, 4].map((i) => (
              <CardSprite
                key={`tray${i}`}
                back
                x={stage.W / 2 - 8 + i * 4}
                y={game.trayTop + 52 - i * 1.5}
                w={46}
                h={64}
                angle={(i - 2) * 0.05}
                shadow={i === 4}
              />
            ))}

            {game.cards.map((card) => {
              const held = card.state === "held" || game.holders.some((h) => h.cardId === card.id);
              return (
                <EdgeCard
                  key={card.id}
                  x={card.body.position.x}
                  y={card.body.position.y}
                  length={CARD_LENGTH}
                  angle={card.body.angle}
                  lifted={held}
                  opacity={card.state === "held" ? 0.9 : 1}
                />
              );
            })}

            {/* Where a carried card would snap to. */}
            {game.holders.map((holder) => {
              const card = game.card(holder.cardId);
              if (!card || card.state !== "held") return null;
              const slot = game.snapFor({
                x: card.body.position.x,
                y: card.body.position.y,
                angle: card.body.angle,
              });
              if (!slot) return null;
              return (
                <View
                  key={`ghost${holder.pointerId}`}
                  style={{
                    position: "absolute",
                    left: slot.x - EDGE_THICKNESS / 2,
                    top: slot.y - CARD_LENGTH / 2,
                    width: EDGE_THICKNESS,
                    height: CARD_LENGTH,
                    borderRadius: EDGE_THICKNESS / 2,
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.7)",
                    backgroundColor: "rgba(255, 255, 255, 0.18)",
                    transform: [{ rotate: `${slot.angle}rad` }],
                  }}
                />
              );
            })}

            {/* Hard: the fingers' springs. */}
            {game.holders.map((holder) => {
              const card = game.card(holder.cardId);
              if (!card || !holder.spring || !holder.spring.pointA || !holder.spring.pointB) {
                return null;
              }
              const finger = holder.spring.pointA;
              const grip = {
                x: card.body.position.x + holder.spring.pointB.x,
                y: card.body.position.y + holder.spring.pointB.y,
              };
              return (
                <View key={`spring${holder.pointerId}`}>
                  <Line
                    x1={finger.x}
                    y1={finger.y}
                    x2={grip.x}
                    y2={grip.y}
                    width={1.5}
                    color="#ffffff"
                    opacity={0.5}
                  />
                  <Dot x={finger.x} y={finger.y} r={5} color="#ffffff" opacity={0.25} />
                </View>
              );
            })}
          </View>
        </World>
      </TouchSurface>

      {/* Difficulty and the stability meter, just under the header. */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: top + 4,
          left: 0,
          right: 0,
          alignItems: "center",
          gap: 8,
        }}
      >
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t("architect.difficulty")}
          style={{
            flexDirection: "row",
            borderRadius: 18,
            padding: 3,
            backgroundColor: "rgba(0, 0, 0, 0.35)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.14)",
          }}
        >
          {DIFFICULTIES.map((option) => {
            const selected = option === difficulty;
            return (
              <Pressable
                key={option}
                onPress={() => choose(option)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 5,
                  borderRadius: 15,
                  backgroundColor: selected ? "rgba(243, 238, 230, 0.9)" : "transparent",
                }}
              >
                <RNText
                  style={{
                    fontFamily: WILD_FONT,
                    fontSize: 16,
                    color: selected ? "#1b1410" : INK,
                  }}
                >
                  {t(`architect.${option}`)}
                </RNText>
              </Pressable>
            );
          })}
        </View>
        <View
          accessible
          accessibilityLabel={`${t("architect.stability")}: ${Math.round(stability * 100)}%`}
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <RNText
            style={{
              fontFamily: WILD_FONT,
              fontSize: 14,
              color: INK,
              opacity: 0.85,
            }}
          >
            {t("architect.stability")}
          </RNText>
          <View
            style={{
              width: 120,
              height: 6,
              borderRadius: 3,
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${Math.round(stability * 100)}%`,
                height: "100%",
                borderRadius: 3,
                backgroundColor: meterColor,
              }}
            />
          </View>
        </View>
      </View>

      <TiltGauge tilt={tilt} stage={stage} />
    </>
  );
}
