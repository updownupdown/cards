import { Text } from "@/components/common/Text";
import { flexStyles } from "@/styles/flexStyles";
import { useModalStyles } from "@/styles/modalStyles";
import { Colors, rgba, layoutDims } from "@/styles/styles";
import { lightenHexColor } from "@/utils/utils";
import React from "react";
import { Modal, View } from "react-native";
import { Button } from "../Button/Button";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";

type Props = {
  children: React.ReactNode;
  title: string;
  titleColor?: string;
  subtitle?: string;
  backgroundColor?: string;
  onClose: () => void;
};

export default function ModalFull({
  children,
  title,
  titleColor = Colors.K200,
  subtitle,
  backgroundColor = Colors.K875,
  onClose,
}: Props) {
  const modalStyles = useModalStyles();
  const { spacing } = useResponsiveMetrics();

  return (
    <>
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <View
          style={[
            modalStyles.modalBackdrop,
            {
              backgroundColor: rgba(lightenHexColor(backgroundColor, 0.4), 0.5),
            },
          ]}
        >
          <View style={[modalStyles.modalCard, { backgroundColor }]}>
            <View style={modalStyles.modalHeader}>
              {/* Title */}
              <View style={[flexStyles.colStart]}>
                <Text size="xl" color={titleColor} weight={500}>
                  {title}
                </Text>
                {subtitle && (
                  <Text
                    size="sm"
                    color={titleColor}
                    weight={300}
                    style={{ opacity: 0.75 }}
                  >
                    {subtitle}
                  </Text>
                )}
              </View>

              {/* Close button */}
              <Button
                style={[
                  flexStyles.rowCentered,
                  {
                    marginLeft: "auto",
                    backgroundColor: rgba(Colors.white, 0.1),
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
    </>
  );
}
