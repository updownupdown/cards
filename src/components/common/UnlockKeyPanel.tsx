import { Text } from "@/components/common/Text";
import {
  getUnlockKeyRole,
  isOdysseyUnlocked,
  useOdysseyUnlock,
} from "@/data/odyssey-unlock";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Trans, useTranslation } from "@/i18n";
import { theme } from "@/styles/styles";
import { View } from "react-native";

/**
 * Settings' unlock key (src/data/unlock-keys.ts): "Enter it" opens the
 * screen for typing one (UnlockKeyEntry, `onEnter`), or, once the Odyssey is
 * open, it says what opened it. "Enter it" stays for a developer key the
 * knock asked for (`askedForDevKey`). On the web it's for anyone given a key;
 * in the app it only appears after the knock that turns dev mode on, for a
 * developer key.
 */
export function UnlockKeyPanel({
  onEnter,
  askedForDevKey = false,
}: {
  onEnter: () => void;
  askedForDevKey?: boolean;
}) {
  const { spacing } = useResponsiveMetrics();
  const { t } = useTranslation("settings");
  // Re-rendered when the unlock changes.
  useOdysseyUnlock();
  const role = getUnlockKeyRole();
  const unlocked = isOdysseyUnlocked();
  const canEnter = role !== "dev" && (!unlocked || askedForDevKey);

  return (
    <View style={{ width: "100%", gap: spacing(4) }}>
      <Text weight={500} size="md" color={theme.ink}>
        {t("unlockKey.label")}
      </Text>
      <Text size="sm" weight={400} color={theme.dim}>
        {role === "dev" ? (
          t("unlockKey.devKey")
        ) : canEnter ? (
          <Trans
            t={t}
            i18nKey="unlockKey.description"
            // Not <link>, which Trans reads as HTML's empty element.
            components={{
              enter: (
                <Text
                  size="sm"
                  weight={700}
                  color={theme.accent}
                  accessibilityRole="button"
                  onPress={onEnter}
                  suppressHighlighting
                />
              ),
            }}
          />
        ) : (
          t("unlockKey.unlocked")
        )}
      </Text>
    </View>
  );
}
