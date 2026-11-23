// Settings' "Move your progress": back the player's data up to a file or a
// code, and restore it from one, in another browser or on another device.
// Web only: restoring reloads the page, which a native app can't do.
import { Button } from "@/components/Button/Button";
import { Text } from "@/components/common/Text";
import { useToast } from "@/components/common/Toast";
import {
  backupFileName,
  backupToCode,
  backupToJson,
  parseBackup,
  readBackup,
  summarizeBackup,
  writeBackup,
  type Backup,
  type BackupError,
} from "@/data/save-transfer";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { useDisplayLanguage, useTranslation } from "@/i18n";
import { flexStyles } from "@/styles/flexStyles";
import { Colors, FontWeight, theme } from "@/styles/styles";
import React from "react";
import { Platform, TextInput, View } from "react-native";

type Mode =
  | { kind: "idle" }
  | { kind: "showCode"; code: string }
  | { kind: "paste"; text: string }
  | { kind: "confirm"; backup: Backup };

const ERROR_KEYS = {
  notBackup: "backup.errors.notBackup",
  damaged: "backup.errors.damaged",
  newer: "backup.errors.newer",
} as const satisfies Record<BackupError, string>;

function downloadText(fileName: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Asks the browser for a file; null if the player backs out. */
function pickTextFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json,text/plain";
    input.style.display = "none";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return resolve(null);
      file.text().then(resolve, () => resolve(""));
    });
    input.addEventListener("cancel", () => {
      input.remove();
      resolve(null);
    });
    document.body.appendChild(input);
    input.click();
  });
}

export function SaveTransferPanel() {
  const { t } = useTranslation("settings");
  const { t: tCommon } = useTranslation("common");
  const language = useDisplayLanguage();
  const { spacing, font } = useResponsiveMetrics();
  const showToast = useToast();
  const [mode, setMode] = React.useState<Mode>({ kind: "idle" });
  const [busy, setBusy] = React.useState(false);

  if (Platform.OS !== "web") return null;

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } finally {
      setBusy(false);
    }
  };

  const onSaveFile = () =>
    run(async () => {
      const backup = await readBackup();
      downloadText(backupFileName(backup), backupToJson(backup));
    });

  const onCopyCode = () =>
    run(async () => {
      const code = await backupToCode(await readBackup());
      try {
        await navigator.clipboard.writeText(code);
        showToast(t("backup.copied"));
        setMode({ kind: "idle" });
      } catch {
        // No clipboard access: show it to copy by hand.
        setMode({ kind: "showCode", code });
      }
    });

  const check = (text: string) =>
    run(async () => {
      const parsed = await parseBackup(text);
      if (parsed.ok) {
        setMode({ kind: "confirm", backup: parsed.backup });
      } else {
        showToast(t(ERROR_KEYS[parsed.error]), 6000);
      }
    });

  const onOpenFile = async () => {
    const text = await pickTextFile();
    if (text !== null) await check(text);
  };

  const onRestore = (backup: Backup) =>
    run(async () => {
      await writeBackup(backup);
      // Every screen and cache starts again from the restored data.
      window.location.reload();
    });

  const inputStyle = {
    width: "100%",
    minHeight: spacing(96),
    padding: spacing(12),
    borderRadius: spacing(12),
    borderWidth: 1,
    borderColor: theme.faint,
    color: theme.ink,
    fontSize: font(13),
    fontFamily: FontWeight[400],
    outline: "none",
  } as const;

  const boxStyle = {
    width: "100%",
    gap: spacing(12),
    padding: spacing(14),
    borderRadius: spacing(16),
    borderWidth: 1,
    borderColor: theme.faint,
  } as const;

  const cancel = (
    <Button
      fullWidth
      size="md"
      uppercase={false}
      text={tCommon("cancel")}
      theme="blue"
      disabled={busy}
      onPress={() => setMode({ kind: "idle" })}
    />
  );

  let body: React.ReactNode;
  if (mode.kind === "showCode") {
    body = (
      <View style={boxStyle}>
        <Text size="sm" weight={400} color={theme.ink}>
          {t("backup.copyManually")}
        </Text>
        <TextInput
          value={mode.code}
          multiline
          editable={false}
          selectTextOnFocus
          style={inputStyle}
        />
        <Button
          fullWidth
          size="md"
          uppercase={false}
          text={t("backup.done")}
          theme="blue"
          onPress={() => setMode({ kind: "idle" })}
        />
      </View>
    );
  } else if (mode.kind === "paste") {
    body = (
      <View style={boxStyle}>
        <TextInput
          value={mode.text}
          onChangeText={(text) => setMode({ kind: "paste", text })}
          placeholder={t("backup.pastePlaceholder")}
          placeholderTextColor={theme.dim}
          multiline
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          style={inputStyle}
        />
        <Button
          fullWidth
          size="md"
          uppercase={false}
          text={t("backup.check")}
          disabled={busy || mode.text.trim() === ""}
          onPress={() => void check(mode.text)}
        />
        {cancel}
      </View>
    );
  } else if (mode.kind === "confirm") {
    const summary = summarizeBackup(mode.backup);
    const rows: [string, string][] = [
      [
        t("backup.summary.savedOn"),
        summary.exportedAt
          ? summary.exportedAt.toLocaleDateString(language, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "–",
      ],
      [t("backup.summary.gamesWon"), String(summary.gamesWon)],
      [t("backup.summary.wins"), String(summary.wins)],
      [t("backup.summary.quotes"), String(summary.quotes)],
      [t("backup.summary.chapters"), String(summary.taoChapters)],
    ];
    body = (
      <View style={boxStyle}>
        <Text size="sm" weight={500} color={theme.ink}>
          {t("backup.confirmTitle")}
        </Text>
        <View style={{ gap: spacing(4) }}>
          {rows.map(([label, value]) => (
            <View
              key={label}
              style={[
                flexStyles.rowCentered,
                { justifyContent: "space-between" },
              ]}
            >
              <Text size="sm" weight={400} color={theme.dim}>
                {label}
              </Text>
              <Text size="sm" weight={500} color={theme.ink}>
                {value}
              </Text>
            </View>
          ))}
        </View>
        <Text size="sm" weight={400} color={theme.ink}>
          {t("backup.confirmWarning")}
        </Text>
        <Button
          fullWidth
          size="md"
          uppercase={false}
          text={t("backup.restore")}
          theme={Colors.cardSelectRed}
          disabled={busy}
          onPress={() => void onRestore(mode.backup)}
        />
        {cancel}
      </View>
    );
  } else {
    body = (
      <>
        <View style={{ width: "100%", gap: spacing(10) }}>
          <Button
            fullWidth
            size="md"
            uppercase={false}
            text={t("backup.saveFile")}
            disabled={busy}
            onPress={() => void onSaveFile()}
          />
          <Button
            fullWidth
            size="md"
            uppercase={false}
            text={t("backup.copyCode")}
            disabled={busy}
            onPress={() => void onCopyCode()}
          />
        </View>
        <View style={{ width: "100%", gap: spacing(10) }}>
          <Button
            fullWidth
            size="md"
            uppercase={false}
            text={t("backup.openFile")}
            theme="blue"
            disabled={busy}
            onPress={() => void onOpenFile()}
          />
          <Button
            fullWidth
            size="md"
            uppercase={false}
            text={t("backup.pasteCode")}
            theme="blue"
            disabled={busy}
            onPress={() => setMode({ kind: "paste", text: "" })}
          />
        </View>
      </>
    );
  }

  return (
    <View style={[flexStyles.fullWidth, { gap: spacing(12) }]}>
      <View style={{ gap: spacing(4) }}>
        <Text weight={500} size="md" color={theme.ink}>
          {t("backup.label")}
        </Text>
        <Text size="sm" weight={400} color={theme.dim}>
          {t("backup.description")}
        </Text>
      </View>
      {body}
    </View>
  );
}
