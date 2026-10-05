import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { Platform, Share } from "react-native";
import {
  gameShareUrl,
  shareWin,
  winShareHtml,
  winSharePlain,
} from "@/utils/share-win";

const win = {
  text: "I won Klondike in 3:12! Try it in Solitarius.",
  url: "https://solitarius.app/klondike",
};

const originalNavigator = globalThis.navigator;
const originalClipboardItem = (globalThis as { ClipboardItem?: unknown })
  .ClipboardItem;

function onWeb(navigator: object, clipboardItem?: unknown) {
  jest.replaceProperty(Platform, "OS", "web");
  Object.defineProperty(globalThis, "navigator", {
    value: navigator,
    configurable: true,
  });
  (globalThis as { ClipboardItem?: unknown }).ClipboardItem = clipboardItem;
}

afterEach(() => {
  jest.restoreAllMocks();
  Object.defineProperty(globalThis, "navigator", {
    value: originalNavigator,
    configurable: true,
  });
  (globalThis as { ClipboardItem?: unknown }).ClipboardItem =
    originalClipboardItem;
});

describe("Sharing a win", () => {
  test("links to the game's own page", () => {
    expect(gameShareUrl("/klondike")).toBe("https://solitarius.app/klondike");
  });

  test("as plain text the link follows the text; as HTML the name is the link", () => {
    expect(winSharePlain(win)).toBe(
      "I won Klondike in 3:12! Try it in Solitarius. https://solitarius.app/klondike",
    );
    expect(winShareHtml(win)).toBe(
      'I won Klondike in 3:12! Try it in <a href="https://solitarius.app/klondike">Solitarius</a>.',
    );
    expect(winShareHtml({ text: "Won <Pyramid> & more", url: win.url })).toBe(
      'Won &lt;Pyramid&gt; &amp; more <a href="https://solitarius.app/klondike">https://solitarius.app/klondike</a>',
    );
  });

  test("on Android and iOS, the share sheet gets the text and the link", async () => {
    const share = jest
      .spyOn(Share, "share")
      .mockResolvedValue({ action: Share.sharedAction });
    expect(await shareWin(win)).toBe("shared");
    expect(share).toHaveBeenCalledWith({ message: winSharePlain(win) });

    share.mockResolvedValue({ action: Share.dismissedAction });
    expect(await shareWin(win)).toBe("cancelled");
  });

  test("on the web, the browser's share sheet is used where there is one", async () => {
    const share = jest.fn(async () => {});
    const writeText = jest.fn(async () => {});
    onWeb({ share, canShare: () => true, clipboard: { writeText } });
    expect(await shareWin(win)).toBe("shared");
    expect(share).toHaveBeenCalledWith({ text: win.text, url: win.url });
    expect(writeText).not.toHaveBeenCalled();
  });

  test("closing the browser's share sheet copies nothing", async () => {
    const writeText = jest.fn(async () => {});
    onWeb({
      share: async () => {
        throw Object.assign(new Error("cancelled"), { name: "AbortError" });
      },
      clipboard: { writeText },
    });
    expect(await shareWin(win)).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  test("without a share sheet (desktop Firefox), the win is copied, the name as a link", async () => {
    const write = jest.fn(async (_items: unknown[]) => {});
    class ClipboardItem {
      constructor(public items: Record<string, Blob>) {}
    }
    onWeb({ clipboard: { write, writeText: async () => {} } }, ClipboardItem);
    expect(await shareWin(win)).toBe("copied");
    const [item] = write.mock.calls[0][0] as ClipboardItem[];
    expect(Object.keys(item.items).sort()).toEqual(["text/html", "text/plain"]);
  });

  test("where rich text is refused, plain text is copied", async () => {
    const writeText = jest.fn(async (_text: string) => {});
    onWeb({ clipboard: { writeText } });
    expect(await shareWin(win)).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(winSharePlain(win));
  });

  test("with no share sheet and no clipboard, sharing fails", async () => {
    onWeb({});
    expect(await shareWin(win)).toBe("failed");
  });
});
