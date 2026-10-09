import { lifespan, portraitLength } from "@/components/Campaign/voices";
import { CollectFrom, useLockedOnMap } from "@/components/common/CollectFrom";
import { Text } from "@/components/common/Text";
import { getRewardSource } from "@/data/campaign-map";
import { getQuote, type QuoteId } from "@/data/collectibles";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { isQuoteTranslated, localizeQuote } from "@/i18n/content";
import { usePalette } from "@/styles/palette";
import { rgba } from "@/styles/styles";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, ScrollView } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The quote fades in whole, over this. */
export const QUOTE_FADE_MS = 900;
/**
 * A new author appears only once the quote is in, so the words are read
 * before the portrait draws the eye: their line is drawn over
 * PORTRAIT_DRAW_MS, and their name and years fade in with it.
 */
export const AUTHOR_AT_MS = QUOTE_FADE_MS + 200;
export const PORTRAIT_DRAW_MS = 2400;
const NAME_FADE_MS = 900;

export type QuoteDetailAuthor = {
  name: string;
  portrait: string;
  born: number;
  died: number | null;
  circa: boolean;
};

/**
 * One quote, as the Gallery shows it and as it is revealed after the win
 * that earns it: the quote fading in whole with its source, then its
 * author's portrait drawn in a single line, with their name and years. The
 * author is only drawn afresh when it changes, so stepping through one
 * author's quotes changes the words alone. A quote not collected yet shows
 * the game it comes from instead. Drawn in the palette around it: the app's
 * colours in the Gallery, the game's own over a game.
 */
export function QuoteDetail({
  author,
  quoteId,
  collected,
  topInset,
  bottomInset,
  onRead,
}: {
  author: QuoteDetailAuthor;
  quoteId: QuoteId;
  collected: boolean;
  topInset: number;
  bottomInset: number;
  /** The quote is in and its author drawn. */
  onRead?: () => void;
}) {
  const { spacing, font } = useResponsiveMetrics();
  const { t } = useTranslation("campaign");
  const palette = usePalette();
  const language = useDisplayLanguage();
  const { settings } = useGlobalSettings();
  const english = getQuote(quoteId);
  const quote = useMemo(
    () =>
      english &&
      settings.translateCollectibles &&
      isQuoteTranslated(quoteId, english, language)
        ? localizeQuote(quoteId, english, language)
        : english,
    [english, language, quoteId, settings.translateCollectibles],
  );
  const source = getRewardSource({ type: "quote", id: quoteId });
  const lockedOnMap = useLockedOnMap(source);

  // When this author appears: after the quote, if there is one to read. Set
  // as the author changes, and kept while only their quote does.
  const authorAt = useRef({ name: "", at: 0 });
  if (authorAt.current.name !== author.name) {
    authorAt.current = { name: author.name, at: collected ? AUTHOR_AT_MS : 0 };
  }
  const authorDelay = authorAt.current.at;

  const onReadRef = useRef(onRead);
  onReadRef.current = onRead;
  useEffect(() => {
    const timer = setTimeout(
      () => onReadRef.current?.(),
      authorDelay + PORTRAIT_DRAW_MS,
    );
    return () => clearTimeout(timer);
  }, [author.name, authorDelay]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        paddingTop: topInset + spacing(8),
        paddingBottom: bottomInset + spacing(20),
        paddingHorizontal: spacing(28),
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Drawn afresh only when the author changes. */}
      <Portrait
        key={author.name}
        path={author.portrait}
        size={spacing(150)}
        color={palette.accent}
        delay={authorDelay}
      />
      <Animated.View
        key={`name-${author.name}`}
        entering={FadeIn.duration(NAME_FADE_MS).delay(authorDelay)}
        style={{ alignItems: "center", marginTop: spacing(14) }}
      >
        <Text size="lg" weight={500} style={{ textAlign: "center" }}>
          {author.name}
        </Text>
        <Text
          weight={400}
          color={palette.dim}
          style={{
            textAlign: "center",
            fontSize: font(15),
            lineHeight: font(20),
          }}
        >
          {lifespan(author)}
        </Text>
      </Animated.View>

      {/* The quote, centred in the room between the author and the bar,
          fading in whole. */}
      <Animated.View
        key={quoteId}
        entering={FadeIn.duration(QUOTE_FADE_MS)}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: spacing(24),
          gap: spacing(14),
        }}
      >
        {collected && quote ? (
          <>
            <Text
              serif
              color={palette.ink}
              style={{
                fontSize: font(20),
                lineHeight: font(31),
                textAlign: "center",
                maxWidth: spacing(560),
              }}
            >
              “{quote.text}”
            </Text>
            <Text
              size="sm"
              weight={400}
              color={palette.dim}
              style={{ textAlign: "center" }}
            >
              {quote.source}
            </Text>
          </>
        ) : (
          // "This quote has not been collected yet.", and the button to win
          // it, well apart.
          <Animated.View style={{ alignItems: "center", gap: spacing(28) }}>
            <Text
              size="md"
              color={rgba(palette.dim, 0.7)}
              style={{ textAlign: "center" }}
            >
              {lockedOnMap
                ? t("quotes.playToCollect")
                : t("quotes.uncollected")}
            </Text>
            {source && <CollectFrom path={source} campaign />}
          </Animated.View>
        )}
      </Animated.View>
    </ScrollView>
  );
}

/*
 * The line is alive. A slow wave runs along it, barely there, moving each
 * point a little to the side of the line; once a cycle the wave swells for
 * a few seconds, enough to be seen if you look, then settles. It is a
 * reminder that the line is a person who once breathed.
 */
/** One breath: the wave's swell comes round once in this. */
export const PORTRAIT_BREATH_MS = 11000;
/** How far points stray, in the portrait's own units (200 across). */
const WAVE_REST = 0.3;
const WAVE_SWELL = 1.1;
/** Points per wave, and how many waves pass in a breath. */
const WAVE_LENGTH = 34;
const WAVE_TURNS = 4;

type PortraitPoints = { x: number[]; y: number[]; nx: number[]; ny: number[] };

/** A portrait's points ("M x y L x y ..."), each with the normal to its line. */
function portraitPoints(path: string): PortraitPoints {
  const pairs = path
    .slice(1)
    .split("L")
    .map((pair) => pair.trim().split(/\s+/).map(Number));
  const x = pairs.map((pair) => pair[0]);
  const y = pairs.map((pair) => pair[1]);
  const nx: number[] = [];
  const ny: number[] = [];
  for (let index = 0; index < pairs.length; index += 1) {
    const before = Math.max(0, index - 1);
    const after = Math.min(pairs.length - 1, index + 1);
    const dx = x[after] - x[before];
    const dy = y[after] - y[before];
    const length = Math.hypot(dx, dy) || 1;
    nx.push(-dy / length);
    ny.push(dx / length);
  }
  return { x, y, nx, ny };
}

/** The portrait's line with the wave through it at this point of a breath. */
function wavedPath(points: PortraitPoints, breath: number): string {
  "worklet";
  // A swell in the middle of the breath, gone at both ends so the loop
  // joins without a jolt.
  const swell = Math.exp(-(((breath - 0.5) / 0.13) * ((breath - 0.5) / 0.13)));
  const amplitude = WAVE_REST + WAVE_SWELL * swell;
  const travel = breath * WAVE_TURNS * Math.PI * 2;
  const { x, y, nx, ny } = points;
  let d = "";
  for (let index = 0; index < x.length; index += 1) {
    const offset =
      amplitude * Math.sin((index / WAVE_LENGTH) * Math.PI * 2 - travel);
    d +=
      (index === 0 ? "M" : "L") +
      (x[index] + nx[index] * offset).toFixed(2) +
      " " +
      (y[index] + ny[index] * offset).toFixed(2);
  }
  return d;
}

/** An author's one-line portrait, drawn along its line as it appears. */
function Portrait({
  path,
  size,
  color,
  delay,
}: {
  path: string;
  size: number;
  color: string;
  delay: number;
}) {
  const length = useMemo(() => portraitLength(path), [path]);
  const points = useMemo(() => portraitPoints(path), [path]);
  const progress = useSharedValue(0);
  const breath = useSharedValue(0);
  // Fixed at mount: the line is drawn once.
  const [startDelay] = useState(delay);
  useEffect(() => {
    progress.value = withDelay(
      startDelay,
      withTiming(1, {
        duration: PORTRAIT_DRAW_MS,
        easing: Easing.inOut(Easing.quad),
      }),
    );
  }, [progress, startDelay]);

  // Breathing, for as long as the page is in front of someone: paused in
  // the background, so nothing animates unseen.
  useEffect(() => {
    const breathe = () => {
      breath.value = withRepeat(
        withTiming(1, { duration: PORTRAIT_BREATH_MS, easing: Easing.linear }),
        -1,
        false,
      );
    };
    const rest = () => cancelAnimation(breath);
    if (AppState.currentState === "active") breathe();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") breathe();
      else rest();
    });
    return () => {
      subscription.remove();
      rest();
    };
  }, [breath]);

  const lineProps = useAnimatedProps(() => ({
    d: wavedPath(points, breath.value),
    strokeDashoffset: length * (1 - progress.value),
  }));
  return (
    <Svg width={size} height={(size * 240) / 200} viewBox="0 0 200 240">
      <AnimatedPath
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={[length, length]}
        animatedProps={lineProps}
      />
    </Svg>
  );
}
