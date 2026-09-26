import {
  parseChapterText,
  REVEAL,
  scheduleReading,
  type ParsedText,
} from "@/components/TaoReveal/timeline";
import { memo, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";

/**
 * A Tao chapter read out word by word, at the pace of the reveal after a win.
 * The words sit in the normal layout from the start (just transparent), so
 * the page has its full height and scrolls freely while they appear. Each
 * word's fade is a CSS animation with a delay: nothing runs per frame.
 */

const TEXT_COLOR = "#e8f1ff";
const FONT_FAMILY = "Outfit_300Light";
const LINE_HEIGHT = 1.5;
// Lines are mounted a chunk (counted in letters) per frame, so opening a long
// chapter never stalls a frame of the constellation drawing itself above.
const MOUNT_CHUNK = 240;

const WORD_IN = { from: { opacity: 0 }, to: { opacity: 1 } };

const textStyle = (fontSize: number) =>
  ({
    fontFamily: FONT_FAMILY,
    fontSize,
    lineHeight: fontSize * LINE_HEIGHT,
    color: TEXT_COLOR,
    includeFontPadding: false,
  }) as const;

type Props = {
  text: string;
  fontSize: number;
  /**
   * `Date.now()` of the moment the words are timed from, and when (ms after
   * it) the first one appears. Without it the text shows at once.
   */
  timing?: { openedAt: number; startMs: number };
  onDone?: () => void;
};

export const ChapterText = memo(function ChapterText({
  text,
  fontSize,
  timing,
  onDone,
}: Props) {
  const parsed = useMemo(() => parseChapterText(text), [text]);
  const schedule = useMemo(
    () => (timing ? scheduleReading(parsed, timing.startMs) : null),
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
      {parsed.lines.slice(0, mountedLines).map((line, lineIndex) => (
        <View
          key={lineIndex}
          style={{
            marginTop:
              line.paragraphStart && lineIndex > 0 ? lineHeight * 0.7 : 0,
          }}
        >
          {schedule && timing ? (
            <AnimatedLine
              parsed={parsed}
              lineIndex={lineIndex}
              fontSize={fontSize}
              tIn={schedule.tIn}
              openedAt={timing.openedAt}
            />
          ) : (
            <Text
              allowFontScaling={false}
              style={[textStyle(fontSize), { textAlign: "center" }]}
            >
              {line.words
                .map((word) =>
                  parsed.words[word].glyphs
                    .map((glyph) => parsed.glyphs[glyph].char)
                    .join(""),
                )
                .join(" ")}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
});

const AnimatedLine = memo(function AnimatedLine({
  parsed,
  lineIndex,
  fontSize,
  tIn,
  openedAt,
}: {
  parsed: ParsedText;
  lineIndex: number;
  fontSize: number;
  tIn: number[];
  openedAt: number;
}) {
  // Fixed at mount: a changed delay would restart the animation.
  const [elapsed] = useState(() => Date.now() - openedAt);
  const style = textStyle(fontSize);

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: fontSize * 0.3,
      }}
    >
      {parsed.lines[lineIndex].words.map((wordIndex) => {
        const glyphs = parsed.words[wordIndex].glyphs;
        return (
          <Animated.Text
            key={wordIndex}
            allowFontScaling={false}
            style={[
              style,
              {
                animationName: WORD_IN,
                animationDuration: `${REVEAL.wordFadeMs}ms`,
                animationDelay: `${Math.max(0, Math.round(tIn[glyphs[0]] - elapsed))}ms`,
                animationFillMode: "both",
                animationTimingFunction: "ease-in-out",
              },
            ]}
          >
            {glyphs.map((glyph) => parsed.glyphs[glyph].char).join("")}
          </Animated.Text>
        );
      })}
    </View>
  );
});
