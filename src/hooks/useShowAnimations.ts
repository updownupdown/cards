import { useGlobalSettings } from "@/hooks/useGlobalSettings";

/**
 * The "Show animations" setting. Off, nothing moves just for show: no
 * scenery or moving skies, and no hovering, pulsing or wiggling extras
 * (e-reader screens, which redraw slowly, are the main reason to turn it off).
 */
export function useShowAnimations() {
  return useGlobalSettings().settings.showAnimations;
}
