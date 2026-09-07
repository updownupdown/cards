import { Text } from "@/components/common/Text";
import { TaoChapter } from "@/components/Nodes/TaoChapters";
import { getTaoChapter, TAO_CHAPTER_COUNT } from "@/data/collectibles";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Colors, rgba } from "@/styles/styles";
import { useState } from "react";
import { View } from "react-native";
import { CollectionViewer } from "./CollectionViewer";
import ModalFull from "./ModalFull";

type Props = {
  collectedIds: ReadonlySet<number>;
  onClose: () => void;
};

export function TaoCollectionModal({ collectedIds, onClose }: Props) {
  const { spacing } = useResponsiveMetrics();
  const firstCollected = [...collectedIds].sort((a, b) => a - b)[0];
  const [selectedId, setSelectedId] = useState(firstCollected);
  const chapterIds = Array.from(
    { length: TAO_CHAPTER_COUNT },
    (_, index) => index + 1,
  );

  return (
    <ModalFull
      title="Tao Te Ching"
      subtitle={`${collectedIds.size}/${TAO_CHAPTER_COUNT} collected chapters`}
      iconName="tao"
      onClose={onClose}
    >
      <CollectionViewer
        itemIds={chapterIds}
        collectedIds={collectedIds}
        selectedId={selectedId}
        onSelect={setSelectedId}
        renderItem={(id, selected, collected) => (
          <View
            style={{
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: spacing(4),
              backgroundColor: selected
                ? rgba(Colors.accentRed, 0.24)
                : collected
                  ? Colors.K950
                  : Colors.K900,
            }}
          >
            <Text
              size="lg"
              weight={500}
              color={collected ? Colors.accentRed : Colors.K700}
            >
              {id}
            </Text>
          </View>
        )}
      >
        {selectedId &&
          collectedIds.has(selectedId) &&
          getTaoChapter(selectedId) && (
            <TaoChapter
              chapter={getTaoChapter(selectedId)!}
              chapterNumber={selectedId}
            />
          )}
      </CollectionViewer>
    </ModalFull>
  );
}
