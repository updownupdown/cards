import { Text } from "@/components/common/Text";
import { clearLastGameSession } from "@/data/game-menu";
import { flexStyles } from "@/styles/flexStyles";
import { menuStyles } from "@/styles/menuStyles";
import { useModalStyles } from "@/styles/modalStyles";
import { Colors, HeaderButtonSize } from "@/styles/styles";
import { router } from "expo-router";
import React from "react";
import { Modal, View } from "react-native";
import { Button } from "../Button/Button";

type Props = {
  children: React.ReactNode;
  title?: string;
  onClose: () => void;
};

export default function ModalFull({ children, title, onClose }: Props) {
  const modalStyles = useModalStyles();

  return (
    <>
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <View style={modalStyles.modalBackdrop}>
          <View style={modalStyles.modalCard}>
            <View style={modalStyles.modalHeader}>
              {/* Icon/Title */}
              {title && (
                <View style={[flexStyles.rowCentered, flexStyles.gap10]}>
                  <Text size="xxl" color={Colors.K200} weight={500}>
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
                    backgroundColor: Colors.K875,
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
