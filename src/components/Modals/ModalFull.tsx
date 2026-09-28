import { Text } from "@/components/common/Text";
import { flexStyles } from "@/styles/flexStyles";
import { useModalStyles } from "@/styles/modalStyles";
import { rgba, layoutDims, theme } from "@/styles/styles";
import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { IconName } from "@/icons/generated";
import { Icon } from "@/icons";
import { Logo } from "@/components/common/Logo";
import { RoundButton } from "@/components/ui/Nocturne";

type Props = {
  children: React.ReactNode;
  title?: string;
  titleColor?: string;
  subtitle?: string;
  backgroundColor?: string;
  showLogo?: boolean;
  iconName?: IconName;
  onClose: () => void;
};

export default function ModalFull({
  children,
  title,
  titleColor = theme.ink,
  subtitle,
  backgroundColor = theme.surface,
  showLogo,
  iconName,
  onClose,
}: Props) {
  const modalStyles = useModalStyles();
  const { spacing } = useResponsiveMetrics();
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
              borderColor: rgba(theme.ink, 0.08),
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
            {/* Logo */}
            {showLogo && <Logo height={spacing(26)} />}

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
            {title && (
              <View style={[flexStyles.colStart]}>
                <Text size="xl" color={titleColor} weight={500}>
                  {title}
                </Text>
                {subtitle && (
                  <Text size="sm" color={theme.dim} weight={300}>
                    {subtitle}
                  </Text>
                )}
              </View>
            )}

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
  color: string;
  iconName?: IconName;
  title: string;
};

export const ModalHeading = ({ color, iconName, title }: ModalHeadingProps) => {
  return (
    <View
      style={[
        flexStyles.rowCentered,
        flexStyles.fullWidth,
        flexStyles.spaceBetween,
      ]}
    >
      <Text size="xxl" weight={300} color={color} style={{ flexGrow: 1 }}>
        {title}
      </Text>
      {iconName && <Icon name={iconName} size={28} color={color} />}
    </View>
  );
};
