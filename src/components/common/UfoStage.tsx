import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { View } from "react-native";

/**
 * There is only ever one UFO on screen. Everything that shows one says so
 * here, and the tab bar's UFO, which hovers over a tab to point at it, keeps
 * away while any other is up. When a UFO turns up somewhere for the tab
 * bar's to go to (under the Gallery's note, over Klondike on the map), the
 * tab bar's flies there and becomes it, rather than a second one popping in.
 */

/** Where a UFO on screen is, so the tab bar's can fly to it. */
export type UfoSpot = {
  measure: (
    found: (spot: { x: number; y: number; size: number }) => void,
  ) => void;
};

type UfoStage = {
  /** How many UFOs are on screen, besides the tab bar's. */
  count: number;
  /** The newest of them that the tab bar's can fly to. */
  spot: UfoSpot | null;
  /** The tab bar's UFO is on its way to `spot`, which waits unseen. */
  flying: boolean;
  setFlying: (flying: boolean) => void;
  enter: (spot: UfoSpot | null) => () => void;
};

const UfoStageContext = createContext<UfoStage>({
  count: 0,
  spot: null,
  flying: false,
  setFlying: () => {},
  enter: () => () => {},
});

/** Whether the tab this sits in is the one showing. */
export const TabShownContext = createContext(true);

export function UfoStageProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<
    { id: number; spot: UfoSpot | null }[]
  >([]);
  const [flying, setFlying] = useState(false);
  const nextId = useRef(0);
  const enter = useCallback((spot: UfoSpot | null) => {
    nextId.current += 1;
    const id = nextId.current;
    setEntries((all) => [...all, { id, spot }]);
    return () => setEntries((all) => all.filter((entry) => entry.id !== id));
  }, []);
  const value = useMemo(() => {
    const withSpot = entries.filter((entry) => entry.spot);
    return {
      count: entries.length,
      spot: withSpot[withSpot.length - 1]?.spot ?? null,
      flying,
      setFlying,
      enter,
    };
  }, [enter, entries, flying]);
  return (
    <UfoStageContext.Provider value={value}>
      {children}
    </UfoStageContext.Provider>
  );
}

export function useUfoStage() {
  return useContext(UfoStageContext);
}

/**
 * Says a UFO is on screen while `on` (and its tab is showing). Given the
 * view it hovers in, the tab bar's UFO can fly there: `waiting` is then true
 * while it does, and the UFO should stay unseen until it arrives.
 */
export function useUfoOnScreen(on: boolean, box?: RefObject<View | null>) {
  const shownTab = useContext(TabShownContext);
  const { enter, flying } = useUfoStage();
  const present = on && shownTab;
  const [spot] = useState<UfoSpot | null>(() =>
    box
      ? {
          measure: (found) =>
            box.current?.measureInWindow?.((x, y, width, height) =>
              found({
                x: x + width / 2,
                y: y + height / 2,
                size: Math.max(width, height),
              }),
            ),
        }
      : null,
  );
  useEffect(() => (present ? enter(spot) : undefined), [enter, present, spot]);
  return { waiting: present && !!box && flying };
}
