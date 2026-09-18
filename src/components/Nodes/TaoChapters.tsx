import { Text } from "@/components/common/Text";
import { tao } from "@/components/Collectibles/TaoText";
import { Colors } from "@/styles/styles";
import { useGlobalSettings } from "@/hooks/useGlobalSettings";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { isTaoChapterTranslated, localizeTaoChapter } from "@/i18n/content";
import { useState } from "react";
import { View } from "react-native";
import { ShowOriginalToggle } from "./ShowOriginalToggle";

export type CollectionEntry = {
  text: string;
  author?: string;
  source?: string;
};

export const TAO_CHAPTERS: readonly CollectionEntry[] = tao;

type TaoChapterProps = {
  chapter: CollectionEntry;
  chapterNumber: number;
};

export function TaoChapter({ chapter, chapterNumber }: TaoChapterProps) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("nodes");
  const language = useDisplayLanguage();
  const { settings } = useGlobalSettings();
  const [showOriginal, setShowOriginal] = useState(false);
  const hasTranslation =
    settings.translateCollectibles &&
    isTaoChapterTranslated(chapterNumber, chapter, language);
  const shown =
    hasTranslation && !showOriginal
      ? localizeTaoChapter(chapterNumber, chapter, language)
      : chapter;

  return (
    <View
      style={{
        width: "100%",
        gap: spacing(12),
        paddingVertical: spacing(30),
      }}
    >
      <Text size="lg" weight={400} color={Colors.K700}>
        {t("tao.chapter", { number: chapterNumber })}
      </Text>
      <Text size="xl" weight={300} color={Colors.K200}>
        {shown.text}
      </Text>

      {hasTranslation && (
        <ShowOriginalToggle
          showOriginal={showOriginal}
          onToggle={() => setShowOriginal((current) => !current)}
        />
      )}
    </View>
  );
}
