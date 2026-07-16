import { Text } from "@/components/common/Text";
import { flexStyles } from "@/styles/flexStyles";
import { menuStyles } from "@/styles/menuStyles";
import { useModalStyles } from "@/styles/modalStyles";
import { Colors, HeaderButtonSize, rgba } from "@/styles/styles";
import React from "react";
import { Modal, View } from "react-native";
import { Button } from "../Button/Button";

type Props = {
  children: React.ReactNode;
  title?: string;
  titleColor?: string;
  backgroundColor?: string;
  onClose: () => void;
};

export default function ModalFull({
  children,
  title,
  titleColor = Colors.K200,
  backgroundColor = Colors.K875,
  onClose,
}: Props) {
  const modalStyles = useModalStyles();

  return (
    <>
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <View style={modalStyles.modalBackdrop}>
          <View style={[modalStyles.modalCard, { backgroundColor }]}>
            <View style={modalStyles.modalHeader}>
              {/* Icon/Title */}
              {title && (
                <View style={[flexStyles.rowCentered, flexStyles.gap10]}>
                  <Text size="xxl" color={titleColor} weight={500}>
                    {title}
                  </Text>
                </View>
              )}

              {/* Close button */}
              <Button
                style={[
                  menuStyles.headerButton,
                  {
                    marginLeft: "auto",
                    backgroundColor: rgba(Colors.black, 0.15),
                    borderRadius: HeaderButtonSize / 2,
                  },
                ]}
                onPress={onClose}
                iconName="close"
                iconSize={28}
                iconColor={Colors.K300}
              />
            </View>

            {children}
          </View>
        </View>
      </Modal>
    </>
  );
}
