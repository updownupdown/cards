import { Button } from "@/components/Button/Button";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Colors, rgba } from "@/styles/styles";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

type CollectionViewerProps = {
  itemIds: readonly number[];
  collectedIds: ReadonlySet<number>;
  selectedId?: number;
  onSelect: (id: number) => void;
  renderItem: (id: number, selected: boolean, collected: boolean) => ReactNode;
  children: ReactNode;
};

export function CollectionViewer({
  itemIds,
  collectedIds,
  selectedId,
  onSelect,
  renderItem,
  children,
}: CollectionViewerProps) {
  const { spacing } = useResponsiveMetrics();
  const listRef = useRef<ScrollView>(null);
  const [listWidth, setListWidth] = useState(0);
  const itemWidth = listWidth / 5;

  useEffect(() => {
    if (!selectedId || itemWidth <= 0) return;

    const itemIndex = itemIds.indexOf(selectedId);
    listRef.current?.scrollTo({
      x: Math.max(0, (itemIndex - 2) * itemWidth),
      animated: true,
    });
  }, [itemIds, itemWidth, selectedId]);

  const selectAdjacent = (direction: 1 | -1) => {
    const collected = itemIds.filter((id) => collectedIds.has(id));
    if (collected.length === 0) return;

    const currentIndex = selectedId ? collected.indexOf(selectedId) : -1;
    const nextIndex =
      currentIndex < 0
        ? 0
        : (currentIndex + direction + collected.length) % collected.length;
    onSelect(collected[nextIndex]);
  };

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing(24),
          paddingBottom: spacing(16),
          justifyContent: "center",
          alignSelf: "stretch",
          flexGrow: 1,
        }}
        style={{ flex: 1 }}
      >
        {children}
      </ScrollView>
      <View
        style={{
          flexDirection: "row",
          alignItems: "stretch",
          height: spacing(96),
          paddingHorizontal: spacing(12),
          paddingVertical: spacing(10),
          gap: spacing(8),
          backgroundColor: rgba(Colors.K950, 0.24),
        }}
      >
        <Button
          accessibilityLabel="Previous collected item"
          iconName="arrow-back"
          size="sm"
          theme={Colors.K800}
          disabled={collectedIds.size === 0}
          onPress={() => selectAdjacent(-1)}
          style={{
            width: spacing(40),
            borderRadius: spacing(12),
            paddingHorizontal: 0,
            height: "100%",
          }}
        />

        <ScrollView
          ref={listRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={(event) => setListWidth(event.nativeEvent.layout.width)}
          contentContainerStyle={{ height: "100%", alignItems: "stretch" }}
          style={{ flex: 1 }}
        >
          {itemIds.map((id) => {
            const collected = collectedIds.has(id);
            const selected = selectedId === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={
                  collected ? `Select item ${id}` : `Locked item ${id}`
                }
                disabled={!collected}
                onPress={() => onSelect(id)}
                style={{
                  width: itemWidth || undefined,
                  minWidth: itemWidth ? undefined : spacing(48),
                  height: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: collected ? 1 : 0.38,
                  paddingHorizontal: spacing(3),
                }}
              >
                {renderItem(id, selected, collected)}
              </Pressable>
            );
          })}
        </ScrollView>

        <Button
          accessibilityLabel="Next collected item"
          iconName="arrow-forward"
          size="sm"
          theme={Colors.K800}
          disabled={collectedIds.size === 0}
          onPress={() => selectAdjacent(1)}
          style={{
            width: spacing(40),
            borderRadius: spacing(12),
            paddingHorizontal: 0,
            height: "100%",
          }}
        />
      </View>
    </View>
  );
}
