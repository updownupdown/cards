// While the game is playing moves itself (auto-complete), card taps and drags
// are ignored. GameWrapper sets this; the shared drag/tap handlers check it, so
// individual games don't need to.

let boardInputLocked = false;

export function setBoardInputLocked(locked: boolean) {
  boardInputLocked = locked;
}

export function isBoardInputLocked() {
  return boardInputLocked;
}
