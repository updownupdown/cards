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
                  iconColor={Colors.accentBlue}
                  text="Home"
                  size="text"
                  iconSize={28}
                  style={{ borderWidth: 0 }}
                />
              )}

              {/* Close button */}
              <Button
                style={[
                  buttonStyles.headerButton,
                  buttonStyles.closeModalButton,
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
