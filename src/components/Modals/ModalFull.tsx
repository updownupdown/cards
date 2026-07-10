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
  showHomeButton?: boolean;
  title?: string;
  onClose: () => void;
};

export default function ModalFull({
  children,
  showHomeButton,
  title,
  onClose,
}: Props) {
  const modalStyles = useModalStyles();

  return (
    <>
      <Modal visible transparent animationType="fade" onRequestClose={onClose}>
        <View style={modalStyles.modalBackdrop}>
          <View style={modalStyles.modalCard}>
            <View style={modalStyles.modalHeader}>
              {/* Home button */}
              {showHomeButton && (
                <Button
                  onPress={async () => {
                    onClose();
                    try {
                      await clearLastGameSession();
                    } finally {
                      router.push("/");
                    }
                  }}
                  iconName={"arrow-back"}
                  iconColor={Colors.accentBlue}
                  text="Home"
                  size="xs"
                  textOnly
                  iconSize={22}
                  lineHeight={1}
                />
              )}

              {/* Icon/Title */}
              {title && (
                <View style={[flexStyles.rowCentered, flexStyles.gap10]}>
                  <Text
                    size="sm"
                    color={Colors.K400}
                    weight={300}
                    textTransform="uppercase"
                  >
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
                    backgroundColor: Colors.K850,
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
