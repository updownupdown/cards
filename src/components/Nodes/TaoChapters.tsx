import { Text } from "@/components/common/Text";
import { tao } from "@/components/Collectibles/TaoText";
import { Colors } from "@/styles/styles";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { View } from "react-native";

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

  return (
    <View
      style={{
        width: "100%",
        gap: spacing(12),
        paddingVertical: spacing(30),
      }}
    >
      <Text size="lg" weight={400} color={Colors.K700}>
        Chapter {chapterNumber}
      </Text>
      <Text size="xl" weight={300} color={Colors.K200}>
        {chapter.text}
      </Text>
    </View>
  );
}
