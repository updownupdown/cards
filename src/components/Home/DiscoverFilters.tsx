import { Text } from "@/components/common/Text";
import { GameTag, GameTagNames } from "@/data/games-data";
import { useFade } from "@/hooks/useFade";
import { useResponsiveUiLayout } from "@/hooks/useResponsiveLayout";
import { Icon, type IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { menuStyles } from "@/styles/menuStyles";
import { modalShadow } from "@/styles/modalStyles";
import { Colors, FontWeight, HeaderButtonSize, rgba } from "@/styles/styles";
import { roundToPixel } from "@/utils/utils";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "../Button/Button";

export type DiscoverCardSize = "small" | "medium" | "large";

type DiscoverFiltersProps = {
  pageSidePadding: number;
  contentMaxWidth: number;
  resultCount: number;
  tagResultCounts: Partial<Record<GameTag, number>>;
  selectedTag: GameTag | null;
  searchQuery: string;
  discoverCardSize: DiscoverCardSize;
  onSelectedTagChange: (tag: GameTag | null) => void;
  onSearchQueryChange: (query: string) => void;
  onDiscoverCardSizeChange: (size: DiscoverCardSize) => void;
};

export function DiscoverFilters({
  pageSidePadding,
  contentMaxWidth,
  resultCount,
  tagResultCounts,
  selectedTag,
  searchQuery,
  discoverCardSize,
  onSelectedTagChange,
  onSearchQueryChange,
  onDiscoverCardSizeChange,
}: DiscoverFiltersProps) {
  const ui = useResponsiveUiLayout();
  const insets = useSafeAreaInsets();
  const [showTagPicker, setShowTagPicker] = useState(false);
  const { isRendered: renderTagPicker, opacity: tagPickerOpacity } = useFade(
    showTagPicker,
    220,
  );

  const hasTag = selectedTag != null;
  const hasSearch = searchQuery.trim().length > 0;
  const hasActiveFilters = hasTag || hasSearch;

  const visibleTags = useMemo(
    () =>
      (Object.values(GameTag) as GameTag[]).filter(
        (tag) => (tagResultCounts[tag] ?? 0) > 0,
      ),
    [tagResultCounts],
  );

  const clearAll = () => {
    onSelectedTagChange(null);
    onSearchQueryChange("");
  };

  const resultLabel = `${resultCount} result${resultCount === 1 ? "" : "s"}`;
  const filterLabel = hasTag
    ? `${GameTagNames[selectedTag]} • ${resultLabel}`
    : resultLabel;
  const inputBgColor = rgba(Colors.K950, 0.7);
  const spacing = (value: number) => roundToPixel(value * ui.scale);
  const font = (value: number) => roundToPixel(value * ui.textScale);
  const inputHeight = spacing(50);
  const borderRadius = spacing(10);
  const iconSize = roundToPixel(inputHeight * 0.4);
  const webSearchInputProps =
    Platform.OS === "web"
      ? ({ id: "discover-search-input", name: "discover-search" } as any)
      : undefined;

  return (
    <>
      <View
        style={{
          position: Platform.OS === "web" ? "fixed" : "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 8,
          pointerEvents: "box-none",
        }}
      >
        <LinearGradient
          colors={[
            rgba(Colors.background, 0.95),
            rgba(Colors.background, 0.95),
            rgba(Colors.background, 0),
          ]}
          start={{ x: 0.5, y: 1 }}
          end={{ x: 0.5, y: 0 }}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "160%",
            pointerEvents: "none",
          }}
        />

        <View
          style={{
            width: "100%",
            maxWidth: contentMaxWidth,
            alignSelf: "center",
            paddingHorizontal: pageSidePadding,
            paddingTop: spacing(10),
            paddingBottom: roundToPixel(insets.bottom + pageSidePadding * 0.9),
            gap: spacing(10),
            borderTopLeftRadius: spacing(14),
            borderTopRightRadius: spacing(14),
          }}
        >
          {/* Results and clear filters */}
          {hasActiveFilters && (
            <View
              style={{
                width: "100%",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: spacing(10),
              }}
            >
              <Text size="sm" color={Colors.K400} numberOfLines={1}>
                {filterLabel}
              </Text>

              <Pressable
                onPress={clearAll}
                style={[
                  flexStyles.rowCentered,
                  {
                    paddingLeft: spacing(14),
                    paddingRight: spacing(10),
                    paddingVertical: spacing(6),
                    gap: spacing(6),
                    borderRadius,
                    height: inputHeight * 0.8,
                    backgroundColor: inputBgColor,
                  },
                ]}
              >
                <Text size="sm" color={Colors.K200} weight={300}>
                  Clear filters
                </Text>
                <Icon name="close" size={iconSize} color={Colors.K200} />
              </Pressable>
            </View>
          )}

          {/* Filters list */}
          <View
            style={{
              width: "100%",
              flexDirection: "row",
              alignItems: "center",
              gap: spacing(8),
            }}
          >
            {/* Search Input */}
            <View
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: inputHeight,
                borderRadius,
                backgroundColor: inputBgColor,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: inputHeight * 0.2,
                gap: inputHeight * 0.2,
              }}
            >
              <Icon
                name="search"
                size={iconSize}
                color={Colors.K500}
                style={{ flexShrink: 0 }}
              />

              <TextInput
                {...webSearchInputProps}
                autoCapitalize="none"
                returnKeyType="search"
                returnKeyLabel="Search"
                clearButtonMode="never"
                submitBehavior="blurAndSubmit"
                textContentType="none"
                value={searchQuery}
                onChangeText={onSearchQueryChange}
                placeholder="Search..."
                placeholderTextColor={Colors.K600}
                style={{
                  flex: 1,
                  flexShrink: 1,
                  minWidth: 0,
                  color: Colors.K100,
                  fontSize: font(17),
                  fontFamily: FontWeight[300],
                  paddingVertical: 0,
                  outline: "none",
                  height: "100%",
                }}
              />
            </View>

            {/* Tag button */}
            <Pressable
              onPress={() => setShowTagPicker(true)}
              style={{
                width: inputHeight,
                height: inputHeight,
                borderRadius,
                backgroundColor: inputBgColor,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon
                name="tag"
                size={iconSize}
                color={hasTag ? Colors.K100 : Colors.K400}
              />
            </Pressable>

            {/* Card Sizes Toggles */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                height: inputHeight,
                padding: inputHeight * 0.1,
                borderRadius,
                backgroundColor: inputBgColor,
              }}
            >
              {(
                [
                  ["small", "list-small"],
                  ["medium", "list-medium"],
                  ["large", "list-large"],
                ] as [DiscoverCardSize, IconName][]
              ).map(([size, iconName]) => {
                const isActive = discoverCardSize === size;

                return (
                  <Pressable
                    key={size}
                    onPress={() => onDiscoverCardSizeChange(size)}
                    style={{
                      width: inputHeight * 0.8,
                      height: inputHeight * 0.8,
                      borderRadius: borderRadius * 0.8,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isActive ? Colors.K750 : "transparent",
                    }}
                  >
                    <Icon
                      name={iconName}
                      size={roundToPixel(iconSize * 0.8)}
                      color={isActive ? Colors.K100 : Colors.K400}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* Tag Picker Modal */}
      {renderTagPicker && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              zIndex: 20,
              opacity: tagPickerOpacity,
              pointerEvents: "box-none",
            },
          ]}
        >
          {/* Modal Mask (press to close) */}
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: rgba(Colors.background, 0.8) },
            ]}
            onPress={() => setShowTagPicker(false)}
          />

          {/* Modal box */}
          <View
            style={[
              {
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "100%",
                maxWidth: contentMaxWidth - pageSidePadding * 2,
                maxHeight: spacing(420),
                transform: [{ translateX: "-50%" }, { translateY: "-50%" }],

                alignItems: "center",
                justifyContent: "center",

                gap: spacing(20),
                padding: spacing(20),

                borderRadius: spacing(14),
                backgroundColor: Colors.K900,
                boxShadow: modalShadow,
              },
            ]}
          >
            <View
              style={{
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: spacing(12),
              }}
            >
              <Text
                size="sm"
                weight={300}
                color={Colors.K200}
                textTransform="uppercase"
              >
                Filter by Tag
              </Text>

              <Button
                style={[
                  menuStyles.headerButton,
                  {
                    marginLeft: "auto",
                    backgroundColor: Colors.K850,
                    borderRadius: HeaderButtonSize / 2,
                  },
                ]}
                onPress={() => setShowTagPicker(false)}
                iconName="close"
                iconSize={28}
                iconColor={Colors.K300}
              />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                flexStyles.colCentered,
                {
                  flexGrow: 1,
                  gap: spacing(12),
                },
              ]}
              style={{
                width: "100%",
                flex: 1,
              }}
            >
              {visibleTags.map((tag) => {
                const isActive = selectedTag === tag;
                const count = tagResultCounts[tag] ?? 0;

                return (
                  <Pressable
                    key={tag}
                    onPress={() => {
                      onSelectedTagChange(tag);
                      setShowTagPicker(false);
                    }}
                    style={[
                      flexStyles.rowCentered,
                      flexStyles.spaceBetween,
                      flexStyles.fullWidth,
                      flexStyles.flex1,
                      {
                        borderRadius: spacing(8),
                        paddingHorizontal: spacing(16),
                        paddingVertical: spacing(10),
                        backgroundColor: isActive ? Colors.K750 : Colors.K875,
                      },
                    ]}
                  >
                    <Text
                      size="md"
                      color={isActive ? Colors.K100 : Colors.K300}
                    >
                      {GameTagNames[tag]}
                    </Text>
                    <Text
                      size="md"
                      color={isActive ? Colors.K100 : Colors.K300}
                    >
                      {count}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Animated.View>
      )}
    </>
  );
}
