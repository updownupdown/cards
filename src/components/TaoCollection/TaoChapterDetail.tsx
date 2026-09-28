import { ShowOriginalToggle } from "@/components/Campaign/ShowOriginalToggle";
import { Text } from "@/components/common/Text";
import { getTaoChapter } from "@/data/collectibles";
import { getTaoConstellation } from "@/data/tao-constellations";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { isTaoChapterTranslated, localizeTaoChapter } from "@/i18n/content";
import { parseChapterText } from "@/components/TaoReveal/timeline";
import { theme } from "@/styles/styles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { ChapterText } from "./ChapterText";
import { BLOOM_MS, ConstellationBloom } from "./ConstellationBloom";

/** The chapter number fades in as the figure completes; the text follows. */
const NUMBER_AT = BLOOM_MS - 150;
const TEXT_AT = BLOOM_MS + 450;

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
  /** Shown under the note while nothing at all is collected. */
  about?: string;
  width: number;
  height: number;
  /** Room left at the top for the modal's header. */
  topInset: number;
  /** Room left at the bottom for the chapter bar. */
  bottomInset: number;
};

export function TaoChapterDetail({
  chapterNumber,
  collected,
  about,
  width,
  height,
  topInset,
  bottomInset,
}: Props) {
  const { spacing, font } = useResponsiveMetrics();
  const { t } = useTranslation("campaign");
  const language = useDisplayLanguage();
  const { settings } = useGlobalSettings();
  const [openedAt] = useState(() => Date.now());
  const [showOriginal, setShowOriginal] = useState(false);
  const [read, setRead] = useState(false);
  const onRead = useCallback(() => setRead(true), []);
  const scrollRef = useRef<ScrollView>(null);
  const titleY = useRef<number | null>(null);

  // As the words start, the page rises so the chapter's title sits at the
  // top, the figure above it scrolled away, leaving the most room to read.
  useEffect(() => {
    if (!collected) return;
    const timer = setTimeout(() => {
      if (titleY.current === null) return;
      scrollRef.current?.scrollTo({
        y: Math.max(0, titleY.current - topInset - spacing(8)),
        animated: true,
      });
    }, TEXT_AT);
    return () => clearTimeout(timer);
  }, [collected, spacing, topInset]);

  const chapter = getTaoChapter(chapterNumber);
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
  const timing = useMemo(() => ({ openedAt, startMs: TEXT_AT }), [openedAt]);

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
      style={{ flex: 1 }}
      contentContainerStyle={{
        alignItems: "center",
        // Room to lift even a short chapter's title to the top.
        minHeight: collected ? height + figureSize + spacing(60) : undefined,
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
            italic
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
            gap: spacing(16),
          }}
        >
          <Text
            serif
            italic
            size="lg"
            color={theme.dim}
            style={{ textAlign: "center" }}
          >
            {t("tao.uncollected")}
          </Text>
          {about ? (
            <Text
              size="sm"
              weight={300}
              color={theme.faint}
              style={{ textAlign: "center" }}
            >
              {about}
            </Text>
          ) : null}
        </View>
      )}

      {collected && shown && (
        <View style={{ width: contentWidth, marginTop: spacing(18) }}>
          <ChapterText
            key={showOriginal ? "original" : "shown"}
            text={shown.text}
            fontSize={font(19)}
            timing={showOriginal ? undefined : timing}
            onDone={onRead}
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
