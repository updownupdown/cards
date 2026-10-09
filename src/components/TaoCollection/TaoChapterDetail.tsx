import { ShowOriginalToggle } from "@/components/Campaign/ShowOriginalToggle";
import { Text } from "@/components/common/Text";
import { CollectFrom, useLockedOnMap } from "@/components/common/CollectFrom";
import { getRewardSource } from "@/data/campaign-map";
import { getTaoChapter } from "@/data/collectibles";
import { getTaoConstellation } from "@/data/tao-constellations";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { isTaoChapterTranslated, localizeTaoChapter } from "@/i18n/content";
import { parseChapterText } from "@/components/TaoReveal/timeline";
import { rgba, theme } from "@/styles/styles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { ChapterText } from "./ChapterText";
import { BLOOM_MS, ConstellationBloom } from "./ConstellationBloom";

/** The chapter number fades in as the figure completes; the text follows. */
const NUMBER_AT = BLOOM_MS - 150;
const TEXT_AT = BLOOM_MS + 450;
/** The rise to the title as the words start: slow, so it reads as a drift. */
const RISE_MS = 1600;
/** Each step down to keep the words being read clear of the bar. */
const FOLLOW_MS = 1400;
/** How often the page checks whether the reading needs following. */
const FOLLOW_CHECK_MS = 250;

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

const FADE_IN = { from: { opacity: 0 }, to: { opacity: 1 } };
const fadeIn = (delay: number, duration: number) =>
  ({
    animationName: FADE_IN,
    animationDuration: `${duration}ms`,
    animationDelay: `${delay}ms`,
    animationFillMode: "both",
    animationTimingFunction: "ease-in-out",
  }) as const;

type Props = {
  chapterNumber: number;
  /** Not collected yet: a faint figure and a note on how to collect it. */
  collected: boolean;
  width: number;
  height: number;
  /** Room left at the top for the modal's header. */
  topInset: number;
  /** Room left at the bottom for the chapter bar. */
  bottomInset: number;
  /** The last line has appeared (or the reader hurried it all in). */
  onRead?: () => void;
};

export function TaoChapterDetail({
  chapterNumber,
  collected,
  width,
  height,
  topInset,
  bottomInset,
  onRead: onReadProp,
}: Props) {
  const { spacing, font } = useResponsiveMetrics();
  const { t } = useTranslation("campaign");
  const language = useDisplayLanguage();
  const { settings } = useGlobalSettings();
  const [openedAt] = useState(() => Date.now());
  const [showOriginal, setShowOriginal] = useState(false);
  const [read, setRead] = useState(false);
  const onReadRef = useRef(onReadProp);
  onReadRef.current = onReadProp;
  const onRead = useCallback(() => {
    setRead(true);
    onReadRef.current?.();
  }, []);
  // When (ms after opening) the reader took the page over: from then on the
  // lines still to come arrive quickly, so a swipe is a way to read faster.
  const [hurriedAt, setHurriedAt] = useState<number>();
  const scrollRef = useRef<ScrollView>(null);
  const titleY = useRef<number | null>(null);
  const textY = useRef(0);
  const lines = useRef<{ y: number; height: number; startsAt: number }[]>([]);
  const scrollY = useRef(0);
  // How far the page can scroll: it never steers past its own content, so a
  // chapter that fits the screen stays where it is.
  const maxScroll = useRef(0);
  const glide = useRef<{ frame: number; to: number } | null>(null);
  // Once the reader scrolls for themselves, the page stops steering.
  const steered = useRef(true);

  const glideTo = useCallback((target: number, duration: number) => {
    if (glide.current) cancelAnimationFrame(glide.current.frame);
    const from = scrollY.current;
    const to = Math.min(target, maxScroll.current);
    if (to <= from + 1) return;
    const start = Date.now();
    const step = () => {
      if (!steered.current) return;
      const progress = Math.min(1, (Date.now() - start) / duration);
      scrollRef.current?.scrollTo({
        y: from + (to - from) * easeInOut(progress),
        animated: false,
      });
      glide.current =
        progress < 1 ? { frame: requestAnimationFrame(step), to } : null;
    };
    glide.current = { frame: requestAnimationFrame(step), to };
  }, []);
  useEffect(
    () => () => {
      if (glide.current) cancelAnimationFrame(glide.current.frame);
    },
    [],
  );

  // As the words start, a chapter too long for the screen drifts up, as far
  // as its title at the top, the figure above it scrolled away, leaving the
  // most room to read. Then the page follows the reading down, so a line
  // never appears under the bar.
  useEffect(() => {
    if (!collected) return;
    const rise = setTimeout(() => {
      if (titleY.current === null || !steered.current) return;
      glideTo(Math.max(0, titleY.current - topInset - spacing(8)), RISE_MS);
    }, TEXT_AT);
    const follow = setInterval(() => {
      if (!steered.current || glide.current) return;
      const now = Date.now() - openedAt;
      // The lowest line already appearing, or about to.
      const reading = lines.current.filter(
        (line) => line && line.startsAt <= now + 400,
      );
      const last = reading[reading.length - 1];
      if (!last) return;
      const lineBottom = textY.current + last.y + last.height;
      const visibleBottom =
        scrollY.current + height - bottomInset - spacing(24);
      if (lineBottom > visibleBottom) {
        // Step down far enough for a few more lines at a time.
        glideTo(
          scrollY.current + (lineBottom - visibleBottom) + last.height * 3,
          FOLLOW_MS,
        );
      }
    }, FOLLOW_CHECK_MS);
    return () => {
      clearTimeout(rise);
      clearInterval(follow);
    };
  }, [bottomInset, collected, glideTo, height, openedAt, spacing, topInset]);
  const stopSteering = () => {
    steered.current = false;
    setHurriedAt((current) => current ?? Date.now() - openedAt);
  };
  const onLineLayout = useCallback(
    (index: number, line: { y: number; height: number; startsAt: number }) => {
      lines.current[index] = line;
    },
    [],
  );

  const chapter = getTaoChapter(chapterNumber);
  const source = getRewardSource({ type: "tao", id: chapterNumber });
  const lockedOnMap = useLockedOnMap(source);
  const constellation = getTaoConstellation(chapterNumber);
  const hasTranslation =
    !!chapter &&
    settings.translateCollectibles &&
    isTaoChapterTranslated(chapterNumber, chapter, language);
  const translated = useMemo(
    () =>
      chapter && hasTranslation
        ? localizeTaoChapter(chapterNumber, chapter, language)
        : chapter,
    [chapter, chapterNumber, hasTranslation, language],
  );
  const shown = showOriginal ? chapter : translated;
  // The chapter is read out; the English original, when asked for, shows at
  // once.
  const timing = useMemo(
    () => ({ openedAt, startMs: TEXT_AT, hurriedAt }),
    [hurriedAt, openedAt],
  );

  const pad = spacing(20);
  const contentWidth = Math.min(width - pad * 2, spacing(560));
  // Kept small, so the chapter's text starts well up the screen.
  const figureSize = Math.round(
    Math.min(contentWidth, spacing(320), height * 0.42) * 0.7,
  );
  const dustCount = useMemo(
    () =>
      constellation && translated
        ? parseChapterText(translated.text).glyphs.length -
          constellation.stars.length
        : 0,
    [constellation, translated],
  );

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={(event) => {
        scrollY.current = event.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={16}
      onContentSizeChange={(_, contentHeight) => {
        maxScroll.current = Math.max(0, contentHeight - height);
      }}
      onScrollBeginDrag={stopSteering}
      // On the web, a mouse wheel or a touch takes over as well.
      {...({
        onWheel: stopSteering,
        onTouchStart: stopSteering,
      } as object)}
      style={{ flex: 1 }}
      contentContainerStyle={{
        alignItems: "center",
        paddingTop: topInset,
        paddingBottom: bottomInset + spacing(32),
        paddingHorizontal: pad,
      }}
      showsVerticalScrollIndicator={false}
    >
      {constellation && (
        <View
          style={{
            marginTop: spacing(12),
            alignItems: "center",
            opacity: collected ? 1 : 0.2,
          }}
        >
          <ConstellationBloom
            constellation={constellation}
            size={figureSize}
            dustCount={dustCount}
          />
        </View>
      )}

      <Animated.View
        onLayout={(event) => {
          titleY.current = event.nativeEvent.layout.y;
        }}
        style={[
          { marginTop: spacing(20), alignItems: "center", gap: spacing(2) },
          fadeIn(collected ? NUMBER_AT : 0, 900),
        ]}
      >
        {constellation?.name ? (
          <Text
            serif
            size="lg"
            color={theme.dim}
            style={{ textAlign: "center" }}
          >
            {constellation.name}
          </Text>
        ) : null}
        <Text
          serif
          weight={500}
          color={collected ? theme.accent : theme.dim}
          style={{
            fontSize: font(26),
            lineHeight: font(32),
            textAlign: "center",
          }}
        >
          {t("tao.chapter", { number: chapterNumber })}
        </Text>
      </Animated.View>

      {!collected && (
        <View
          style={{
            width: contentWidth,
            marginTop: spacing(18),
            gap: spacing(28),
          }}
        >
          {/* Styled as the Gallery's uncollected quote. */}
          <Text
            size="md"
            color={rgba(theme.dim, 0.7)}
            style={{ textAlign: "center" }}
          >
            {lockedOnMap ? t("tao.playToCollect") : t("tao.uncollected")}
          </Text>
          {source && <CollectFrom path={source} campaign />}
        </View>
      )}

      {collected && shown && (
        <View
          onLayout={(event) => {
            textY.current = event.nativeEvent.layout.y;
          }}
          style={{ width: contentWidth, marginTop: spacing(18) }}
        >
          <ChapterText
            key={showOriginal ? "original" : "shown"}
            text={shown.text}
            fontSize={font(19)}
            timing={showOriginal ? undefined : timing}
            onDone={onRead}
            onLineLayout={onLineLayout}
          />
        </View>
      )}

      {hasTranslation && read && (
        <Animated.View style={[{ marginTop: spacing(28) }, fadeIn(0, 700)]}>
          <ShowOriginalToggle
            showOriginal={showOriginal}
            onToggle={() => setShowOriginal((current) => !current)}
          />
        </Animated.View>
      )}
    </ScrollView>
  );
}
