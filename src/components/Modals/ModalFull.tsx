import { buttonStyles } from "@/styles/buttonStyles";
import { modalStyles } from "@/styles/modalStyles";
import { Colors } from "@/styles/styles";
import { router } from "expo-router";
import React from "react";
import { Modal, View } from "react-native";
import { Button } from "../Button/Button";

type Props = {
  children: React.ReactNode;
  showHomeButton?: boolean;
  onClose: () => void;
};

export default function ModalFull({
  children,
  showHomeButton,
  onClose,
}: Props) {
  return (
    <>
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <View style={modalStyles.modalBackdrop}>
          <View style={modalStyles.modalCard}>
            <View style={modalStyles.modalHeader}>
              {/* Home button */}
              {showHomeButton && (
                <Button
                  onPress={() => {
                    onClose();
                    router.push("/");
                  }}
                  iconName={"chevron-left"}
                  iconColor={Colors.K400}
                  text="Home"
                  size="text"
                />
              )}

              {/* Close button */}
              <Button
                style={buttonStyles.headerButton}
                onPress={onClose}
                iconName="close"
              />
            </View>

            {children}
          </View>
        </View>
      </Modal>
    </>
  );
}
