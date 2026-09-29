# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v55.0.0/ before writing any code.

# Locked: system bar gradients

The black gradients under the status bar and the navigation buttons / home
indicator (`src/utils/system-bar-scrims.ts`, drawn by
`src/components/common/SystemBarScrims.tsx` over every screen) are tuned and
signed off. Don't change them as part of other UI work, and don't add other
veils or bars under the system bars. Before changing them — even when asked
to — warn the owner that they are locked and confirm first. The cases they
cover (native Android/iOS, web in a tab, installed web app) are listed in that
file and pinned by `src/__tests__/system-bar-scrims.test.tsx`.
