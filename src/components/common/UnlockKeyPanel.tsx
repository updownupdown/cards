import { Text } from "@/components/common/Text";
import { useToast } from "@/components/common/Toast";
import { ActionButton } from "@/components/ui/Nocturne";
import {
  getUnlockKeyRole,
  isOdysseyUnlocked,
  redeemUnlockKey,
  useOdysseyUnlock,
} from "@/data/odyssey-unlock";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { FontWeight, rgba, theme } from "@/styles/styles";
import { useState } from "react";
import { TextInput, View } from "react-native";

/**
 * Settings' unlock key: a field to enter one (src/data/unlock-keys.ts), or,
 * once one is in, what it opened. On the web it's for anyone given a key;
 * in the app it only appears after the knock that turns dev mode on, for a
 * developer key.
 */
export function UnlockKeyPanel({ onRedeemed }: { onRedeemed: () => void }) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("settings");
  const showToast = useToast();
  // Re-rendered when the unlock changes.
  useOdysseyUnlock();
  const [text, setText] = useState("");
  const [checking, setChecking] = useState(false);
  const role = getUnlockKeyRole();

  const submit = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const result = await redeemUnlockKey(text);
      showToast(t(`unlockKey.result.${result}`));
      if (result === "unlocked" || result === "devKey") {
        setText("");
        onRedeemed();
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={{ width: "100%", gap: spacing(10) }}>
      <View style={{ gap: spacing(4) }}>
        <Text weight={500} size="md" color={theme.ink}>
          {t("unlockKey.label")}
        </Text>
        <Text size="sm" weight={400} color={theme.dim}>
          {role === "dev"
            ? t("unlockKey.devKey")
            : isOdysseyUnlocked()
              ? t("unlockKey.unlocked")
              : t("unlockKey.description")}
        </Text>
      </View>
      {role !== "dev" && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing(10),
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => void submit()}
            placeholder="XXXX-XXXX-XXXX"
            placeholderTextColor={rgba(theme.ink, 0.3)}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            accessibilityLabel={t("unlockKey.label")}
            style={{
              flex: 1,
              minWidth: 0,
              height: spacing(42),
              paddingHorizontal: spacing(14),
              borderRadius: spacing(21),
              borderWidth: 1,
              borderColor: rgba(theme.ink, 0.3),
              backgroundColor: rgba(theme.ink, 0.04),
              color: theme.ink,
              fontFamily: FontWeight[400],
              fontSize: spacing(15),
              letterSpacing: spacing(1),
            }}
          />
          <ActionButton
            small
            label={t("unlockKey.submit")}
            disabled={checking || text.trim().length === 0}
            onPress={() => void submit()}
          />
        </View>
      )}
    </View>
  );
}
