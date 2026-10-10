import { Text } from "@/components/common/Text";
import { useToast } from "@/components/common/Toast";
import { ActionButton, Kicker } from "@/components/ui/Nocturne";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useTranslation } from "@/i18n";
import { homeSurfaceShadow } from "@/styles/homeSurfaceShadow";
import { buyFullOdyssey } from "@/data/play-purchase";
import { usePalette } from "@/styles/palette";
import { rgba } from "@/styles/styles";
import { useState } from "react";
import { Linking, Platform, View } from "react-native";

/** The app's page on Google Play, for the web app on Android phones. */
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.updownupdown.cards";

function isAndroidBrowser() {
  return (
    Platform.OS === "web" &&
    typeof navigator !== "undefined" &&
    /android/i.test(navigator.userAgent)
  );
}

/**
 * Under the header while a game beyond the force field is selected on the
 * Odyssey map: it says the game lies beyond the field, and how to open the
 * full Odyssey. On Android, by buying it on Google Play; on the web, with an
 * unlock key (`onEnterKey` opens Settings at the key), or on an Android
 * phone, by getting the app. There is nothing to buy in the iOS app yet.
 */
export function BeyondFieldPanel({ onEnterKey }: { onEnterKey: () => void }) {
  const { spacing } = useResponsiveMetrics();
  const theme = usePalette();
  const { t } = useTranslation("campaign");
  const showToast = useToast();
  const web = Platform.OS === "web";
  const [buying, setBuying] = useState(false);

  const buy = async () => {
    if (Platform.OS !== "android") {
      showToast(t("field.purchaseSoon"));
      return;
    }
    if (buying) return;
    setBuying(true);
    try {
      const outcome = await buyFullOdyssey();
      // Once bought, the field falls and this panel goes with it.
      if (outcome !== "cancelled") showToast(t(`field.result.${outcome}`));
    } finally {
      setBuying(false);
    }
  };

  return (
    <View
      accessibilityRole="summary"
      style={{
        width: "100%",
        gap: spacing(8),
        paddingHorizontal: spacing(20),
        paddingVertical: spacing(18),
        borderRadius: spacing(18),
        backgroundColor: rgba(theme.surface, 0.92),
        borderWidth: 1,
        borderColor: rgba(theme.accent, 0.45),
        ...homeSurfaceShadow(spacing, { translucent: true }),
      }}
    >
      <Kicker>{t("field.title")}</Kicker>
      <Text size="sm" weight={300} color={theme.dim} lineHeight={1.45}>
        {t("field.text")}
      </Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing(10),
          marginTop: spacing(6),
        }}
      >
        {web ? (
          <>
            <ActionButton
              small
              iconName="unlock"
              label={t("field.enterKey")}
              onPress={onEnterKey}
            />
            {isAndroidBrowser() && (
              <ActionButton
                small
                secondary
                label={t("field.getApp")}
                onPress={() => void Linking.openURL(PLAY_STORE_URL)}
              />
            )}
          </>
        ) : (
          <ActionButton
            small
            iconName="unlock"
            label={t("field.unlock")}
            disabled={buying}
            onPress={() => void buy()}
          />
        )}
      </View>
    </View>
  );
}
