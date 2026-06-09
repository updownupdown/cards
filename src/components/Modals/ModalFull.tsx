import { buttonStyles } from "@/styles/buttonStyles";
import { modalStyles } from "@/styles/modalStyles";
import { Colors, FontWeight } from "@/styles/styles";
import { router } from "expo-router";
import React from "react";
import { Modal, Text, View } from "react-native";
import { Button } from "../Button/Button";
import { Icon, IconName } from "@/icons";
import { textStyles } from "@/styles/textStyles";
import { flexStyles } from "@/styles/flexStyles";

type Props = {
  children: React.ReactNode;
  showHomeButton?: boolean;
  title?: string;
  iconName?: IconName;
  onClose: () => void;
};

export default function ModalFull({
  children,
  showHomeButton,
  title,
  iconName,
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
                  iconName={"arrow-back"}
                  iconColor={Colors.accentBlue}
                  text="Home"
                  size="text"
                  iconSize={22}
                  style={{ borderWidth: 0, boxShadow: "unset" }}
                />
              )}

              {/* Icon/Title */}
              {title && iconName && (
                <View
                  style={[
                    flexStyles.rowCentered,
                    flexStyles.gap10,
                    { paddingLeft: 10 },
                  ]}
                >
                  <Icon name={iconName} size={28} color={Colors.K400} />
                  <Text
                    style={[
                      textStyles.default,
                      {
                        color: Colors.K400,
                        fontFamily: FontWeight[300],
                        fontSize: 20,
                      },
                    ]}
                  >
                    {title}
                  </Text>
                </View>
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
