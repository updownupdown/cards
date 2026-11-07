import { ToastOutlet, useToast } from "@/components/common/Toast";
import { ActionButton } from "@/components/ui/Nocturne";
import { redeemDevKey } from "@/data/dev-key";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { Icon } from "@/icons";
import { usePalette } from "@/styles/palette";
import { Colors, FontWeight, rgba } from "@/styles/styles";
import { useState } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Entering a developer key (src/data/dev-keys.ts), which the knock that turns
 * dev mode on asks for outside a local run: a screen of its own with just the
 * field, Unlock and Back, near the top, so the keyboard never covers the
 * field. Closes once a key is accepted (`onRedeemed`).
 */
export function DevKeyEntry({
  visible,
  onClose,
  onRedeemed,
}: {
  visible: boolean;
  onClose: () => void;
  onRedeemed?: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {visible && <EntryScreen onClose={onClose} onRedeemed={onRedeemed} />}
    </Modal>
  );
}

function EntryScreen({
  onClose,
  onRedeemed,
}: {
  onClose: () => void;
  onRedeemed?: () => void;
}) {
  const { spacing } = useResponsiveMetrics();
  const theme = usePalette();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation("settings");
  const showToast = useToast();
  const [text, setText] = useState("");
  const [checking, setChecking] = useState(false);
  // The last key entered was wrong: the button stays red until the field
  // changes.
  const [rejected, setRejected] = useState(false);

  const changeText = (next: string) => {
    setText(next);
    setRejected(false);
  };

  const submit = async () => {
    if (checking || text.trim().length === 0) return;
    setChecking(true);
    try {
      const accepted = await redeemDevKey(text);
      setRejected(!accepted);
      if (accepted) {
        onClose();
        // Shown over what's underneath, once this screen has gone.
        showToast(t("unlockKey.result.devKey"));
        onRedeemed?.();
      } else {
        showToast(t("unlockKey.result.invalid"));
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.surface,
        alignItems: "center",
        paddingTop: insets.top + spacing(96),
        paddingHorizontal: spacing(24),
      }}
    >
      <View style={{ width: "100%", maxWidth: spacing(420), gap: spacing(16) }}>
        <View
          style={{
            height: spacing(48),
            paddingLeft: spacing(18),
            paddingRight: spacing(14),
            borderRadius: spacing(24),
            borderWidth: 1,
            borderColor: rejected ? Colors.buttonRed : rgba(theme.ink, 0.3),
            backgroundColor: rgba(theme.ink, 0.04),
            flexDirection: "row",
            alignItems: "center",
            gap: spacing(8),
          }}
        >
          <TextInput
            value={text}
            onChangeText={changeText}
            onSubmitEditing={() => void submit()}
            autoFocus
            placeholder="XXXX-XXXX-XXXX"
            placeholderTextColor={rgba(theme.ink, 0.3)}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            returnKeyType="done"
            accessibilityLabel={t("unlockKey.label")}
            style={{
              flex: 1,
              minWidth: 0,
              height: "100%",
              color: theme.ink,
              fontFamily: FontWeight[400],
              fontSize: spacing(17),
              outline: "none",
            }}
          />
          {text ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("unlockKey.clear")}
              onPress={() => changeText("")}
              hitSlop={spacing(8)}
            >
              <Icon name="close" size={spacing(18)} color={theme.dim} />
            </Pressable>
          ) : null}
        </View>
        <ActionButton
          label={t("unlockKey.submit")}
          iconName="unlock"
          color={rejected ? Colors.buttonRed : undefined}
          ink={rejected ? Colors.white : undefined}
          disabled={checking || text.trim().length === 0}
          onPress={() => void submit()}
        />
        <ActionButton secondary label={t("unlockKey.back")} onPress={onClose} />
      </View>
      <ToastOutlet />
    </View>
  );
}
