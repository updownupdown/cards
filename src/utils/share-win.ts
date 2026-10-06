import { Platform, Share } from "react-native";

/** Where Solitarius is played on the web; each game has its own page there. */
export const SITE_URL = "https://solitarius.app";

/** The app's name, which the share text links to where it can. */
const APP_NAME = "Solitarius";

export type WinShare = {
  /** "I won Klondike in 3:12! Try it in Solitarius." */
  text: string;
  /** The game's page, so a friend lands on the game itself. */
  url: string;
};

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

export const gameShareUrl = (gamePath: string) => `${SITE_URL}${gamePath}`;

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * The share as HTML, for pasting into email or documents: the app's name is
 * the link (or the link follows the text, if a translation leaves the name
 * out).
 */
export function winShareHtml({ text, url }: WinShare) {
  const link = (label: string) => `<a href="${url}">${escapeHtml(label)}</a>`;
  const escaped = escapeHtml(text);
  return escaped.includes(APP_NAME)
    ? escaped.replace(APP_NAME, link(APP_NAME))
    : `${escaped} ${link(url)}`;
}

/** The share as plain text, for messages: the text, then the link. */
export const winSharePlain = ({ text, url }: WinShare) => `${text} ${url}`;

type WebNavigator = {
  share?: (data: { text?: string; url?: string }) => Promise<void>;
  canShare?: (data: { text?: string; url?: string }) => boolean;
  clipboard?: {
    write?: (items: unknown[]) => Promise<void>;
    writeText?: (text: string) => Promise<void>;
  };
};

async function copyToClipboard(share: WinShare): Promise<ShareOutcome> {
  const clipboard = (globalThis.navigator as WebNavigator | undefined)
    ?.clipboard;
  const plain = winSharePlain(share);
  const ClipboardItemClass = (
    globalThis as { ClipboardItem?: new (items: object) => unknown }
  ).ClipboardItem;
  // Rich text where the browser takes it, so the name pastes as a link.
  if (clipboard?.write && ClipboardItemClass) {
    try {
      await clipboard.write([
        new ClipboardItemClass({
          "text/plain": new Blob([plain], { type: "text/plain" }),
          "text/html": new Blob([winShareHtml(share)], { type: "text/html" }),
        }),
      ]);
      return "copied";
    } catch {
      // Some browsers refuse HTML; plain text below.
    }
  }
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(plain);
      return "copied";
    } catch {
      return "failed";
    }
  }
  return "failed";
}

/**
 * Shares a win the way the platform does: the share sheet on Android and iOS,
 * and on the web (phones, installed apps, and desktop browsers that have one),
 * or the clipboard where the browser has no share sheet (desktop Firefox,
 * Chrome on Linux).
 */
export async function shareWin(share: WinShare): Promise<ShareOutcome> {
  if (Platform.OS !== "web") {
    try {
      // The link goes in the message: Android shares only the message, and
      // iOS would show a separate url as well, twice over.
      const result = await Share.share({ message: winSharePlain(share) });
      return result.action === Share.dismissedAction ? "cancelled" : "shared";
    } catch {
      return "failed";
    }
  }

  const navigator = globalThis.navigator as WebNavigator | undefined;
  const data = { text: share.text, url: share.url };
  if (navigator?.share && (!navigator.canShare || navigator.canShare(data))) {
    try {
      await navigator.share(data);
      return "shared";
    } catch (error) {
      if ((error as { name?: string } | null)?.name === "AbortError") {
        return "cancelled";
      }
      // Not allowed here (an iframe, say): the clipboard instead.
    }
  }
  return copyToClipboard(share);
}
