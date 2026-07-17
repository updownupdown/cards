import { Text } from "@/components/common/Text";
import { flexStyles } from "@/styles/flexStyles";
import { menuStyles } from "@/styles/menuStyles";
import { useModalStyles } from "@/styles/modalStyles";
import { Colors, HeaderButtonSize, rgba } from "@/styles/styles";
import React from "react";
import { Modal, View } from "react-native";
import { Button } from "../Button/Button";
import { darkenHexColor, lightenHexColor } from "@/utils/utils";

type Props = {
  children: React.ReactNode;
  title: string;
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
              <Text size="xxl" color={titleColor} weight={500}>
                {title}
              </Text>

              {/* Close button */}
              <Button
                style={[
                  flexStyles.rowCentered,
                  {
                    marginLeft: "auto",
                    backgroundColor: rgba(Colors.white, 0.1),
                    borderRadius: HeaderButtonSize / 2,
                    padding: 0,
                    width: HeaderButtonSize,
                    height: HeaderButtonSize,
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
