import { Text } from "@/components/common/Text";
import { usePalette } from "@/styles/palette";
import { flexStyles } from "@/styles/flexStyles";
import { useModalStyles } from "@/styles/modalStyles";
import { Colors, rgba, layoutDims } from "@/styles/styles";
import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { IconName } from "@/icons/generated";
import { Icon } from "@/icons";
import { Kicker, RoundButton } from "@/components/ui/Nocturne";

type Props = {
  children: React.ReactNode;
  title?: string;
  titleColor?: string;
  subtitle?: string;
  /** In a game: its name, small in its accent above the title. */
  gameName?: string;
  backgroundColor?: string;
  iconName?: IconName;
  onClose: () => void;
};

export default function ModalFull({
  children,
  title,
  titleColor: titleColorProp,
  subtitle,
  gameName,
  backgroundColor: backgroundColorProp,
  iconName,
  onClose,
}: Props) {
  const modalStyles = useModalStyles();
  const { spacing } = useResponsiveMetrics();
  const theme = usePalette();
  const titleColor = titleColorProp ?? theme.ink;
  const backgroundColor = backgroundColorProp ?? theme.surface;
  const insets = useSafeAreaInsets();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* A native Modal is its own root, so gesture-handler scroll views
          inside it need their own GestureHandlerRootView. */}
      <GestureHandlerRootView
        style={[
          modalStyles.modalBackdrop,
          {
            paddingTop: spacing(layoutDims.pagePadding / 2) + insets.top,
            paddingBottom: spacing(layoutDims.pagePadding / 2) + insets.bottom,
            backgroundColor: rgba(theme.night, 0.82),
          },
        ]}
      >
        {/* The backdrop press sits behind the card instead of wrapping it, so
            it never competes with scrolling inside the card. */}
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
        <View
          style={[
            modalStyles.modalCard,
            {
              backgroundColor,
              borderWidth: 1,
              borderColor: rgba(theme.ink, 0.14),
              borderRadius: spacing(22),
            },
          ]}
        >
          <View
            style={[
              modalStyles.modalHeader,
              {
                boxShadow: `0 0 ${spacing(6)}px ${spacing(6)}px ${rgba(backgroundColor, 1)}`,
              },
            ]}
          >
            {/* Icon */}
            {iconName && (
              <Icon
                name={iconName}
                size={32}
                color={titleColor}
                style={{ marginRight: spacing(12) }}
              />
            )}

            {/* Title */}
            {title && gameName ? (
              <GameHeading gameName={gameName} title={title} />
            ) : title ? (
              <View style={[flexStyles.colStart]}>
                <Text size="xl" color={titleColor} weight={500}>
                  {title}
                </Text>
                {subtitle && (
                  <Text size="sm" color={theme.dim} weight={400}>
                    {subtitle}
                  </Text>
                )}
              </View>
            ) : null}

            {/* Close button */}
            <RoundButton
              iconName="close"
              onPress={onClose}
              style={{ marginLeft: "auto" }}
            />
          </View>

          {children}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

type ModalHeadingProps = {
  title: string;
  /** The accent unless given (a game's modal gives its own accent). */
  color?: string;
  iconName?: IconName;
};

/** A section heading inside a modal: a small label in the accent. */
export const ModalHeading = ({ title, color }: ModalHeadingProps) => (
  <Kicker color={color}>{title}</Kicker>
);

/**
 * The heading of every game menu and panel (the menu, the rules, the quick
 * start): the game's name small in its accent, and what this is below it,
 * larger and in white.
 */
export function GameHeading({
  gameName,
  title,
}: {
  gameName: string;
  title: string;
}) {
  return (
    <View style={{ flexShrink: 1, minWidth: 0, alignItems: "stretch" }}>
      <Text size="xl" weight={500} color={Colors.white} numberOfLines={1}>
        {title}
      </Text>
      <Kicker color={rgba(Colors.white, 0.6)} numberOfLines={1}>
        {gameName}
      </Kicker>
    </View>
  );
}
