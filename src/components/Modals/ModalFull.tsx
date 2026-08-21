import { Text } from "@/components/common/Text";
import { flexStyles } from "@/styles/flexStyles";
import { useModalStyles } from "@/styles/modalStyles";
import { Colors, rgba, layoutDims } from "@/styles/styles";
import { lightenHexColor } from "@/utils/utils";
import React from "react";
import { Modal, View } from "react-native";
import { Button } from "../Button/Button";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { IconName } from "@/icons/generated";
import { Icon } from "@/icons";
import SoloSuiteLogo from "@/assets/images/SoloSuiteLogo.svg";

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
  titleColor = Colors.K200,
  subtitle,
  backgroundColor = Colors.K875,
  showLogo,
  iconName,
  onClose,
}: Props) {
  const modalStyles = useModalStyles();
  const { spacing } = useResponsiveMetrics();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={[
          modalStyles.modalBackdrop,
          {
            backgroundColor: rgba(lightenHexColor(backgroundColor, 0.2), 0.8),
          },
        ]}
      >
        <View style={[modalStyles.modalCard, { backgroundColor }]}>
          <View
            style={[
              modalStyles.modalHeader,
              {
                boxShadow: `0 0 ${spacing(6)}px ${spacing(6)}px ${rgba(backgroundColor, 1)}`,
              },
            ]}
          >
            {/* Logo */}
            {showLogo && (
              <SoloSuiteLogo
                width={120}
                height={28}
                style={{
                  marginRight: "auto",
                  filter: `drop-shadow(1px 2px 3px rgba(0, 0, 0, 0.12))`,
                }}
              />
            )}

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
                  <Text
                    size="sm"
                    color={Colors.white}
                    weight={300}
                    style={{ opacity: 0.75 }}
                  >
                    {subtitle}
                  </Text>
                )}
              </View>
            )}

            {/* Close button */}
            <Button
              style={[
                flexStyles.rowCentered,
                {
                  marginLeft: "auto",
                  // backgroundColor: rgba(Colors.white, 0.1),
                  backgroundColor: "transparent",
                  borderRadius: spacing(layoutDims.menuButtonSize / 2),
                  padding: 0,
                  width: spacing(layoutDims.menuButtonSize),
                  height: spacing(layoutDims.menuButtonSize),
                  boxShadow: "unset",
                  borderWidth: 0,
                },
              ]}
              onPress={onClose}
              iconName="close"
              iconSize={28}
              iconColor={rgba(Colors.white, 0.7)}
            />
          </View>

          {children}
        </View>
      </View>
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
