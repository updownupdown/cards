/** Also read by the web page's head, to paint the splash in the saved theme. */
export const GLOBAL_SETTINGS_STORAGE_KEY = "cards.globalSettings.v1";
export const CAMPAIGN_PROGRESS_STORAGE_KEY = "cards.campaignProgress.v1";
/** The Tao chapter and quote last looked at in the Gallery. */
export const GALLERY_LAST_CHAPTER_STORAGE_KEY = "cards.gallery.lastChapter.v1";
export const GALLERY_LAST_QUOTE_STORAGE_KEY = "cards.gallery.lastQuote.v1";
/**
 * Retired: the Wild Cards mini-games, removed in 2026-10 before they were ever
 * shown. Nothing reads it; the key stays so saves are never counted as lost
 * (saved-data-guard.test.ts).
 */
export const RETIRED_WILD_CARDS_STORAGE_KEY = "cards.wildCards.v1";
/** Dev mode (instant wins, the beta games, test shortcuts), "1" when on. */
export const DEV_MODE_STORAGE_KEY = "cards.devMode.v1";
/**
 * Retired: beta games turned on by the ten taps before there was a dev mode.
 * Nothing reads it; the key stays for saved-data-guard.test.ts.
 */
export const BETA_GAMES_STORAGE_KEY = "cards.betaGames.v1";
/**
 * "Help from Above" (the header's UFO): "off", "beacons" or "autopilot".
 * Once "1" (shown) or "0" (hidden), which still read as beacons and off.
 */
export const HINT_BUTTON_STORAGE_KEY = "cards.hintButton.v1";
/** "1" once the player has put away the Rules modal's UFO introduction. */
export const HINT_INTRO_STORAGE_KEY = "cards.hintIntro.v1";
/** Deals Autopilot played in (their wins don't count): session ids, JSON. */
export const AUTOPILOT_SESSIONS_STORAGE_KEY = "cards.autopilotSessions.v1";
/** "1" once the player has swiped a quick start away, in any game. */
export const SWIPE_DISMISS_STORAGE_KEY = "cards.swipeDismiss.v1";
