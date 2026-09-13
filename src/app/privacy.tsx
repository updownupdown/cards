import { Text } from "@/components/common/Text";
import { Colors } from "@/styles/styles";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const LAST_UPDATED = "September 12, 2026";
const CONTACT_EMAIL = "updownupdown@gmail.com";

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
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text size="xxl" weight="bold" color={Colors.white}>
          Privacy Policy
        </Text>
        <Text size="sm" color={Colors.K400}>
          Last updated: {LAST_UPDATED}
        </Text>

        <Section title="Summary">
          SoloSuite does not collect, store, or share any personal
          information. The app has no account system, no analytics, no
          advertising, and no server backend. Everything you do in the app
          stays on your device.
        </Section>

        <Section title="Data stored on your device">
          SoloSuite saves your game statistics, favorites, settings, and
          in-progress games using on-device local storage. This information
          never leaves your device, is never transmitted to us or to any
          third party, and is removed automatically if you uninstall the app
          or clear its data.
        </Section>

        <Section title="Data we collect">
          None. SoloSuite does not use analytics, crash reporting, or
          advertising services, and does not ask for or store your name,
          email address, location, or any other personal information.
        </Section>

        <Section title="External links">
          A small number of screens include optional links to external
          websites (for example, photo attribution credits). Tapping one of
          these opens your device&apos;s web browser or the linked site
          directly. SoloSuite has no control over, and is not responsible
          for, the privacy practices of those external sites.
        </Section>

        <Section title="Children's privacy">
          SoloSuite does not knowingly collect any information from anyone,
          including children, because it does not collect information from
          any user.
        </Section>

        <Section title="Changes to this policy">
          If this policy ever changes, an updated version will be published
          at this same address with a revised date above.
        </Section>

        <Section title="Contact">
          Questions about this policy can be sent to{" "}
          <Text
            size="sm"
            color={Colors.accentBlue}
            onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
          >
            {CONTACT_EMAIL}
          </Text>
          .
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
