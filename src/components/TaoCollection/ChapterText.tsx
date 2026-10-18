import {
  parseChapterText,
  REVEAL,
  scheduleReading,
  type ParsedText,
} from "@/components/TaoReveal/timeline";
import { memo, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { theme } from "@/styles/styles";
import Animated from "react-native-reanimated";
import { useShowAnimations } from "@/hooks/useShowAnimations";

/**
 * A Tao chapter read out line by line. Each line fades in whole when the
 * reading reaches it, and a longer line holds the reading longer before the
 * next, so the pace is the reader's. The lines sit in the normal layout from
 * the start (just transparent), so the page has its full height and scrolls
 * freely while they appear. Each line waits on a timer, then fades in with
 * a CSS animation (or simply appears, when animations are off): nothing
 * runs per frame.
 */

const FONT_FAMILY = "Outfit_300Light";
const LINE_HEIGHT = 1.5;
// Lines are mounted a chunk (counted in letters) per frame, so opening a long
// chapter never stalls a frame of the constellation drawing itself above.
const MOUNT_CHUNK = 240;
/**
 * How much faster than the plain reading pace the lines come: the pace was
 * set for words appearing one by one, and whole lines read quicker.
 */
export const LINE_PACE = 1.2;
/** Hurried, the lines still come one after another, this far apart. */
export const HURRY_STEP_MS = 220;

const LINE_IN = { from: { opacity: 0 }, to: { opacity: 1 } };

const textStyle = (fontSize: number) =>
  ({
    fontFamily: FONT_FAMILY,
    fontSize,
    lineHeight: fontSize * LINE_HEIGHT,
    color: theme.ink,
    includeFontPadding: false,
    textAlign: "center",
  }) as const;

export type ChapterTiming = {
  /** `Date.now()` of the moment the lines are timed from... */
  openedAt: number;
  /** ...and when (ms after it) the first one appears. */
  startMs: number;
  /**
   * When (ms after `openedAt`) the reader hurried the reading: every line
   * not yet shown by then comes quickly, one after another.
   */
  hurriedAt?: number;
};

type Props = {
  text: string;
  fontSize: number;
  /** Without it the text shows at once. */
  timing?: ChapterTiming;
  onDone?: () => void;
  /**
   * Each line's place in the text, and when (ms after `openedAt`) it
   * appears: lets the page follow the reading.
   */
  onLineLayout?: (
    lineIndex: number,
    line: { y: number; height: number; startsAt: number },
  ) => void;
};

/** When (ms after opening) each line appears, and when the last is in. */
export function scheduleLines(
  parsed: ParsedText,
  startMs: number,
  hurriedAt?: number,
) {
  const reading = scheduleReading(parsed, startMs);
  const startsAt = parsed.lines.map(
    (line) =>
      startMs +
      (reading.tIn[parsed.words[line.words[0]].glyphs[0]] - startMs) /
        LINE_PACE,
  );
  if (hurriedAt !== undefined) {
    let hurried = 0;
    startsAt.forEach((at, index) => {
      if (at > hurriedAt) {
        startsAt[index] = hurriedAt + hurried * HURRY_STEP_MS;
        hurried += 1;
      }
    });
  }
  const last = startsAt.length ? startsAt[startsAt.length - 1] : startMs;
  return { startsAt, textEnd: last + REVEAL.lineFadeMs };
}

export const ChapterText = memo(function ChapterText({
  text,
  fontSize,
  timing,
  onDone,
  onLineLayout,
}: Props) {
  const parsed = useMemo(() => parseChapterText(text), [text]);
  const fade = useShowAnimations();
  const schedule = useMemo(
    () =>
      timing ? scheduleLines(parsed, timing.startMs, timing.hurriedAt) : null,
    [parsed, timing],
  );

  // How many lines are mounted; a line is only added once the previous
  // chunk has had a frame.
  const lineEnds = useMemo(() => {
    const ends: number[] = [];
    let glyphs = 0;
    parsed.lines.forEach((line, index) => {
      glyphs += line.words.reduce(
        (sum, word) => sum + parsed.words[word].glyphs.length,
        0,
      );
      ends[index] = glyphs;
    });
    return ends;
  }, [parsed]);
  const [mountedLines, setMountedLines] = useState(() =>
    timing ? 0 : parsed.lines.length,
  );
  useEffect(() => {
    if (mountedLines >= parsed.lines.length) return;
    const frame = requestAnimationFrame(() =>
      setMountedLines((count) => {
        const budget = (lineEnds[count - 1] ?? 0) + MOUNT_CHUNK;
        let next = count + 1;
        while (next < parsed.lines.length && lineEnds[next] <= budget) {
          next += 1;
        }
        return next;
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, [lineEnds, mountedLines, parsed.lines.length]);

  useEffect(() => {
    if (!schedule || !timing || !onDone) return;
    const wait = schedule.textEnd - (Date.now() - timing.openedAt);
    const timer = setTimeout(onDone, Math.max(0, wait));
    return () => clearTimeout(timer);
  }, [onDone, schedule, timing]);

  const lineHeight = fontSize * LINE_HEIGHT;
  return (
    <View style={{ width: "100%" }}>
      {parsed.lines.slice(0, mountedLines).map((line, lineIndex) => {
        const content = line.words
          .map((word) =>
            parsed.words[word].glyphs
              .map((glyph) => parsed.glyphs[glyph].char)
              .join(""),
          )
          .join(" ");
        return (
          <View
            key={lineIndex}
            onLayout={
              onLineLayout && schedule
                ? (event) => {
                    const { y, height } = event.nativeEvent.layout;
                    onLineLayout(lineIndex, {
                      y,
                      height,
                      startsAt: schedule.startsAt[lineIndex],
                    });
                  }
                : undefined
            }
            style={{
              marginTop:
                line.paragraphStart && lineIndex > 0 ? lineHeight * 0.7 : 0,
            }}
          >
            {schedule && timing ? (
              <AnimatedLine
                text={content}
                fontSize={fontSize}
                startsAt={schedule.startsAt[lineIndex]}
                openedAt={timing.openedAt}
                fade={fade}
              />
            ) : (
              <Text allowFontScaling={false} style={textStyle(fontSize)}>
                {content}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
});

const AnimatedLine = memo(function AnimatedLine({
  text,
  fontSize,
  startsAt,
  openedAt,
  fade,
}: {
  text: string;
  fontSize: number;
  startsAt: number;
  openedAt: number;
  fade: boolean;
}) {
  // A timer, not an animation delay, decides when the line shows; until then
  // it is plainly transparent. With delayed fades, an e-reader showed the
  // chapter's last lines at once and its first ones after.
  const [shown, setShown] = useState(() => Date.now() - openedAt >= startsAt);
  useEffect(() => {
    if (shown) return;
    const timer = setTimeout(
      () => setShown(true),
      Math.max(0, startsAt - (Date.now() - openedAt)),
    );
    return () => clearTimeout(timer);
  }, [openedAt, shown, startsAt]);

  if (!shown || !fade) {
    return (
      <Text
        allowFontScaling={false}
        style={[textStyle(fontSize), { opacity: shown ? 1 : 0 }]}
      >
        {text}
      </Text>
    );
  }
  return (
    <Animated.Text
      allowFontScaling={false}
      style={[
        textStyle(fontSize),
        {
          animationName: LINE_IN,
          animationDuration: `${REVEAL.lineFadeMs}ms`,
          animationFillMode: "backwards",
          animationTimingFunction: "ease-in-out",
        },
      ]}
    >
      {text}
    </Animated.Text>
  );
});
