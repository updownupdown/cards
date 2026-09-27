import type { Builder } from "./current.ts";
export type Candidate = {
  name: string;
  theme: string;
  keyPhrases: string[];
  draw: (b: Builder) => void;
  nebulaShare?: number;
};
export type { Builder };
