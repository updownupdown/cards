import { createContext } from "react";

/** What the Campaign tab tells Home about the UFO while the map is showing. */
export type UfoRequest = {
  /** Whether a UFO may start a new flight right now. */
  gateOpen: boolean;
  /** Goes up by one each time someone summons a UFO on demand. */
  summons: number;
  /** Goes up by one each time the UFO should drop by to acknowledge a
   *  Mercy Skip just spent. */
  visits: number;
  onCatch: () => void;
};

/**
 * Lets the Campaign tab hand the UFO up to Home, which draws it after the header
 * and tab bar so it flies over them. Drawn inside the tab instead, it would
 * always pass underneath: the tab content fades with an opacity animation,
 * which on web shuts everything inside it into its own stacking layer that
 * no zIndex can lift out of.
 */
export const UfoContext = createContext<(request: UfoRequest | null) => void>(
  () => {},
);
