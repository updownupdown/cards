import { useGlobalSettings } from "@/hooks/useGlobalSettings";

/**
 * The "Show animations" setting (off to begin with when the system asks for
 * less motion; see readGlobalSettings). Off, nothing moves just for show: no
 * scenery or moving skies, no hovering UFO, and no pulsing or wiggling
 * extras (e-readers, which redraw slowly, are the main reason to turn it off).
 */
export function useShowAnimations() {
  return useGlobalSettings().settings.showAnimations;
}
