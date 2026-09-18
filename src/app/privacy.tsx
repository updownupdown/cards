import { Text } from "@/components/common/Text";
import { Trans, useDisplayLanguage, useTranslation } from "@/i18n";
import { PSEUDO_LANGUAGE, SOURCE_LANGUAGE } from "@/i18n/languages";
import { Colors } from "@/styles/styles";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const LAST_UPDATED = new Date(2026, 8, 12);
const CONTACT_EMAIL = "updownupdown@gmail.com";
const SECTIONS = [
  "summary",
  "stored",
  "collected",
  "links",
  "children",
  "changes",
] as const;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text size="lg" weight="semibold" color={Colors.white}>
        {title}
      </Text>
      <Text size="sm" color={Colors.K300} style={styles.paragraph}>
        {children}
      </Text>
    </View>
  );
}

export default function PrivacyScreen() {
  const { t } = useTranslation("privacy");
  const language = useDisplayLanguage();
  const lastUpdated = new Intl.DateTimeFormat(
    language === PSEUDO_LANGUAGE ? SOURCE_LANGUAGE : language,
    { year: "numeric", month: "long", day: "numeric" },
  ).format(LAST_UPDATED);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text size="xxl" weight="bold" color={Colors.white}>
          {t("title")}
        </Text>
        <Text size="sm" color={Colors.K400}>
          {t("lastUpdated", { date: lastUpdated })}
        </Text>
        {language !== SOURCE_LANGUAGE && (
          <Text size="sm" color={Colors.K400}>
            {t("translationNote")}
          </Text>
        )}

        {SECTIONS.map((section) => (
          <Section key={section} title={t(`${section}.title`)}>
            {t(`${section}.body`)}
          </Section>
        ))}

        <Section title={t("contact.title")}>
          <Trans
            t={t}
            i18nKey="contact.body"
            values={{ email: CONTACT_EMAIL }}
            components={{
              link: (
                <Text
                  size="sm"
                  color={Colors.accentBlue}
                  onPress={() =>
                    void Linking.openURL(`mailto:${CONTACT_EMAIL}`)
                  }
                />
              ),
            }}
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    width: "100%",
    maxWidth: 700,
    alignSelf: "center",
    padding: 24,
    gap: 24,
  },
  section: {
    gap: 8,
  },
  paragraph: {
    lineHeight: 22,
  },
});
