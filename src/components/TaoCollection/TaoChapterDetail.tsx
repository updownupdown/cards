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
import { toRoman } from "@/utils/roman";
import { useCallback, useMemo, useState } from "react";
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
  width: number;
  height: number;
  /** Room left at the top for the modal's header. */
  topInset: number;
  /** Room left at the bottom for the chapter bar. */
  bottomInset: number;
};

export function TaoChapterDetail({
  chapterNumber,
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
  const figureSize = Math.round(
    Math.min(contentWidth, spacing(320), height * 0.42),
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
        <View style={{ marginTop: spacing(12), alignItems: "center" }}>
          <ConstellationBloom
            constellation={constellation}
            size={figureSize}
            dustCount={dustCount}
          />
        </View>
      )}

      <Animated.View
        style={[
          { marginTop: spacing(20), alignItems: "center", gap: spacing(2) },
          fadeIn(NUMBER_AT, 900),
        ]}
      >
        <Text
          serif
          weight={500}
          color={theme.accent}
          style={{
            fontSize: font(26),
            lineHeight: font(32),
            textAlign: "center",
          }}
        >
          {t("tao.chapter", { number: toRoman(chapterNumber) })}
        </Text>
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
      </Animated.View>

      {shown && (
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
