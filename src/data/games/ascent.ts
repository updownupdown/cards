import { GameDefinition, GameTag } from "../games-data";

export const ascent: GameDefinition = {
  enabledOnLocalOnly: true,
  enabled: false,
  path: "/ascent",
  tip: {
    default: {
      text: "Clear pitch with same suit or higher rank (A high); swap bad hold.",
    },
  },
  title: "Ascent",
  thumbnail: "DefaultThumbnail.jpg",
  cardBack: "DefaultCardBack.png",
  background: "rock-wall.jpg",
  cardColorBg: "#2a3b4d",
  cardColorText: "#e8f2ff",
  cardDescription:
    "Pick the right holds to overcome every pitch and reach the summit.",
  stats: {
    complexity: 45,
    difficulty: 60,
    luck: 45,
  },
  // tags: [GameTag.ModernMechanics],
  tags: [GameTag.Beta],
  about: [
    "Ascent is a push-your-luck climb where every pitch demands the right hold.",
    "Spend your gear wisely — swapping a weak grip burns supplies you may need higher up.",
  ],
  howToPlay: [
    "## Objective",
    "Overcome all **12 pitches** on the route to reach the **summit**.",
    "## Setup",
    "- The **route** is a stack of 12 pitches; only the top one is exposed.",
    "- You hold **4 grips** face up, drawn from your **gear** (the stock).",
    "## Clearing a pitch",
    "- A grip overcomes the exposed pitch if it is the **same suit** (right technique) or an **equal-or-higher rank** (raw strength).",
    "- **Aces are the strongest** grip of all.",
    "- Clearing a pitch spends that grip and draws a fresh one from your gear.",
    "## Swapping gear",
    "- Tap a grip that **cannot** clear the current pitch to discard it and draw a replacement from your gear.",
    "- Each swap costs one card of gear.",
    "## Winning & falling",
    "- Clear every pitch to **summit** and win.",
    "- If no grip can overcome the pitch and your gear is empty, you **fall** and the climb ends.",
  ],
};
