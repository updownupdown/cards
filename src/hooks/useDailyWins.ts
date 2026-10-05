import { loadDailyWins, subscribeToDailyWins } from "@/data/game-of-the-day";
import { useEffect, useState } from "react";

/** The days the Game of the Day was won, kept up to date. */
export function useDailyWins() {
  const [dailyWins, setDailyWins] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToDailyWins(setDailyWins);
    loadDailyWins().then((wins) => {
      if (active) setDailyWins(wins);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return dailyWins;
}
