# Responsive QA Checklist

Use this checklist after changing responsive tokens, typography scale, or constrained widths.

## Test Viewports

- Phone portrait: 390x844
- Phone landscape: 844x390
- Tablet portrait: 834x1194
- Tablet landscape: 1194x834
- Desktop web: 1440x900

## Home Screen

- Header title and action buttons remain vertically centered.
- Section titles fit on one line and do not overlap icons.
- Discover filter bar stays readable and does not clip at bottom safe area.
- Discover tag modal is centered and scrollable with long tag lists.
- Horizontal card rows keep consistent spacing and edge padding.

## Game Wrapper Header

- Back, undo, reset, and menu buttons have balanced spacing.
- Game title truncates gracefully and does not overlap buttons.
- Header height feels proportionate on tablet and desktop widths.

## Modals

- Modal card width caps correctly on large screens.
- Modal header/footer paddings scale consistently with content.
- Scroll areas keep expected top/bottom breathing room.
- Text hierarchy remains readable (title, byline, body, stats).

## Game Overlays (Example Games)

### Crownslayer

- Enemy stats panel spacing and border radius remain consistent.
- Attack/Defend action bars keep button/icon/value alignment.
- Glow/shadow thickness looks balanced at tablet and desktop widths.

### Rogue Run

- Room info panel gap and run button spacing remain stable.
- Action buttons keep icon/text alignment in each room slot.
- Skull death indicator badge position and size remain legible.

## Regression Checks

- No clipped text in buttons or labels.
- No overlap between fixed/absolute overlays and card map zones.
- No new horizontal scrolling on web.
- Lint passes with no new warnings/errors.
