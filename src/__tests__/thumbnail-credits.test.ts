import { describe, expect, test } from "@jest/globals";
import { GAME_DEFINITIONS } from "@/data/games-registry";
import { GAME_THUMBNAIL_ASSETS } from "@/data/game-thumbnails";
import { isValidLink } from "@/utils/utils";

/** Fails with a message that can't be missed in a long test run. */
function failLoudly(problem: string, paths: string[], fix: string) {
  if (paths.length === 0) return;
  throw new Error(
    [
      "",
      "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
      `!!  COVER ART: ${paths.length} game(s) ${problem}`,
      "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
      ...paths.map((path) => `   - ${path}`),
      "",
      fix,
      "",
    ].join("\n"),
  );
}

describe("Cover art", () => {
  // Every game, local-only ones included, should ship with credited art.
  test("every game has cover art and credit for it", () => {
    failLoudly(
      "HAVE NO COVER ART",
      GAME_DEFINITIONS.filter((game) => !game.thumbnail).map((g) => g.path),
      "Drop a JPG named after the game into assets/thumbnails, add a " +
        "thumbnailCredit to its file in src/data/games, then run " +
        "npm run thumbnails:convert.",
    );
    failLoudly(
      "HAVE COVER ART WITHOUT CREDIT",
      GAME_DEFINITIONS.filter(
        (game) => game.thumbnail && !game.thumbnailCredit,
      ).map((game) => game.path),
      "Add a thumbnailCredit (title, artistName, sourceName, sourceLink) " +
        "to each game's file in src/data/games.",
    );
  });

  test("every game's thumbnail exists", () => {
    failLoudly(
      "POINT AT A THUMBNAIL THAT DOESN'T EXIST",
      GAME_DEFINITIONS.filter(
        (game) => game.thumbnail && !(game.thumbnail in GAME_THUMBNAIL_ASSETS),
      ).map((game) => game.path),
      "Check the file name in assets/thumbnails, then run " +
        "npm run assets:generate.",
    );
  });

  test("every credit names the artwork, its artist and a linked source", () => {
    const incomplete = GAME_DEFINITIONS.filter(
      ({ thumbnailCredit: credit }) => {
        if (!credit) return false;
        return (
          !credit.title.trim() ||
          !credit.artistName.trim() ||
          !credit.sourceName.trim() ||
          !isValidLink(credit.sourceLink) ||
          !credit.sourceLink.startsWith("https://")
        );
      },
    ).map((game) => game.path);
    expect(incomplete).toEqual([]);
  });

  test("each artwork is used by one game only", () => {
    const thumbnails = GAME_DEFINITIONS.map((game) => game.thumbnail).filter(
      Boolean,
    );
    const repeated = thumbnails.filter(
      (thumbnail, index) => thumbnails.indexOf(thumbnail) !== index,
    );
    expect(repeated).toEqual([]);
  });
});
