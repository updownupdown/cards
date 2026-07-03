import { Text } from "@/components/common/Text";
import { modalStyles } from "@/styles/modalStyles";
import { Colors, FontWeight, HeaderButtonSize } from "@/styles/styles";
import { router } from "expo-router";
import React from "react";
import { Modal, View } from "react-native";
import { Button } from "../Button/Button";
import { Icon, IconName } from "@/icons";
import { flexStyles } from "@/styles/flexStyles";
import { menuStyles } from "@/styles/menuStyles";

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
                  size="small"
                  textOnly
                  iconSize={22}
                  lineHeight={1}
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
                    size="sm"
                    style={[
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
