import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, test } from "@jest/globals";
import fs from "fs";
import path from "path";
import { loadCampaignProgress } from "@/data/campaign-progress";
import { loadGameSettingsMap } from "@/data/game-menu";
import {
  BACKUP_CODE_PREFIX,
  BACKUP_FORMAT,
  BACKUP_KEYS,
  BACKUP_SKIPPED_KEYS,
  backupToCode,
  backupToJson,
  parseBackup,
  readBackup,
  summarizeBackup,
  writeBackup,
  type Backup,
} from "@/data/save-transfer";

// Backups move a player's data between browsers and devices (Settings,
// Advanced). They carry the stored strings themselves, so a restore goes
// through the same loaders as the player's own data.

const contract = JSON.parse(
  fs.readFileSync(path.join(__dirname, "saved-data/contract.json"), "utf8"),
) as { storageKeys: string[] };
const golden = JSON.parse(
  fs.readFileSync(path.join(__dirname, "saved-data/golden-save.json"), "utf8"),
) as { storage: Record<string, unknown> };

const loadGolden = async () => {
  await AsyncStorage.clear();
  await AsyncStorage.multiSet(
    Object.entries(golden.storage).map(([key, value]) => [
      key,
      typeof value === "string" ? value : JSON.stringify(value),
    ]),
  );
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("Save backups", () => {
  test("every stored key is either backed up or left out for a reason", () => {
    contract.storageKeys.forEach((key) => {
      const backedUp = BACKUP_KEYS.includes(key);
      const skipped = key in BACKUP_SKIPPED_KEYS;
      expect([key, backedUp !== skipped]).toEqual([key, true]);
    });
  });

  test("a backup restores on a fresh device, through the real loaders", async () => {
    await loadGolden();
    const before = {
      games: await loadGameSettingsMap(),
      campaign: await loadCampaignProgress(),
    };
    const backup = await readBackup();

    await AsyncStorage.clear();
    const parsed = await parseBackup(backupToJson(backup));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    await writeBackup(parsed.backup);

    expect(await loadGameSettingsMap()).toEqual(before.games);
    expect(await loadCampaignProgress()).toEqual(before.campaign);
  });

  test("codes round-trip, even broken across lines", async () => {
    await loadGolden();
    const backup = await readBackup();
    const code = await backupToCode(backup);
    expect(code.startsWith("SOLITARIUS1")).toBe(true);

    const wrapped = code.replace(/(.{60})/g, "$1\n");
    const parsed = await parseBackup(`  ${wrapped}  `);
    expect(parsed).toEqual({ ok: true, backup });
  });

  test("restoring clears what the backup doesn't hold", async () => {
    await loadGolden();
    await AsyncStorage.setItem("cards.devMode.v1", "1");
    const backup: Backup = {
      app: "solitarius",
      format: BACKUP_FORMAT,
      exportedAt: "2026-11-23T00:00:00.000Z",
      data: { "cards.globalSettings.v1": '{"language":"en"}' },
    };
    await writeBackup(backup);
    expect(await AsyncStorage.getItem("cards.campaignProgress.v1")).toBeNull();
    expect(await AsyncStorage.getItem("cards.globalSettings.v1")).toBe(
      '{"language":"en"}',
    );
    // Not the backup's business.
    expect(await AsyncStorage.getItem("cards.devMode.v1")).toBe("1");
  });

  test("summarises what it holds", async () => {
    await loadGolden();
    const summary = summarizeBackup(await readBackup());
    expect(summary.quotes).toBe(4);
    expect(summary.taoChapters).toBe(3);
    expect(summary.wins).toBeGreaterThan(0);
    expect(summary.gamesWon).toBeGreaterThan(0);
    expect(summary.exportedAt).toBeInstanceOf(Date);
  });

  test("rejects what isn't a backup, or is damaged or newer", async () => {
    const valid = {
      app: "solitarius",
      format: BACKUP_FORMAT,
      exportedAt: "2026-11-23T00:00:00.000Z",
      data: { "cards.globalSettings.v1": "{}" },
    };
    const json = JSON.stringify(valid);
    expect(await parseBackup("hello")).toEqual({
      ok: false,
      error: "notBackup",
    });
    expect(await parseBackup('{"app":"other","format":1,"data":{}}')).toEqual({
      ok: false,
      error: "notBackup",
    });
    expect(await parseBackup(json.slice(0, -5))).toEqual({
      ok: false,
      error: "damaged",
    });
    expect(await parseBackup(BACKUP_CODE_PREFIX + "not*base64")).toEqual({
      ok: false,
      error: "damaged",
    });
    expect(
      await parseBackup(
        JSON.stringify({ ...valid, format: BACKUP_FORMAT + 1 }),
      ),
    ).toEqual({ ok: false, error: "newer" });
    expect(
      await parseBackup(
        JSON.stringify({
          ...valid,
          data: { "cards.campaignProgress.v1": "{not json" },
        }),
      ),
    ).toEqual({ ok: false, error: "damaged" });
    expect(await parseBackup(JSON.stringify({ ...valid, data: {} }))).toEqual({
      ok: false,
      error: "damaged",
    });
  });

  test("drops keys it doesn't know, such as dev mode", async () => {
    const parsed = await parseBackup(
      JSON.stringify({
        app: "solitarius",
        format: BACKUP_FORMAT,
        exportedAt: "",
        data: {
          "cards.globalSettings.v1": "{}",
          "cards.devMode.v1": "1",
          "someone.else": "x",
        },
      }),
    );
    expect(parsed.ok && Object.keys(parsed.backup.data)).toEqual([
      "cards.globalSettings.v1",
    ]);
  });
});
