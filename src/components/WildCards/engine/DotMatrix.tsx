import { View } from "react-native";

// A 5 by 7 dot font: just what the card readouts need (ranks, suits, a few
// signs), as rows of five, "#" lit.
const GLYPHS: Record<string, string[]> = {
  "0": [" ### ", "#   #", "#  ##", "# # #", "##  #", "#   #", " ### "],
  "1": ["  #  ", " ##  ", "  #  ", "  #  ", "  #  ", "  #  ", " ### "],
  "2": [" ### ", "#   #", "    #", "   # ", "  #  ", " #   ", "#####"],
  "3": ["#####", "   # ", "  #  ", "   # ", "    #", "#   #", " ### "],
  "4": ["   # ", "  ## ", " # # ", "#  # ", "#####", "   # ", "   # "],
  "5": ["#####", "#    ", "#### ", "    #", "    #", "#   #", " ### "],
  "6": ["  ## ", " #   ", "#    ", "#### ", "#   #", "#   #", " ### "],
  "7": ["#####", "    #", "   # ", "  #  ", " #   ", " #   ", " #   "],
  "8": [" ### ", "#   #", "#   #", " ### ", "#   #", "#   #", " ### "],
  "9": [" ### ", "#   #", "#   #", " ####", "    #", "   # ", " ##  "],
  A: [" ### ", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
  J: ["  ###", "   # ", "   # ", "   # ", "   # ", "#  # ", " ##  "],
  Q: [" ### ", "#   #", "#   #", "#   #", "# # #", "#  # ", " ## #"],
  K: ["#   #", "#  # ", "# #  ", "##   ", "# #  ", "#  # ", "#   #"],
  // Suits.
  S: ["  #  ", " ### ", "#####", "#####", " # # ", "  #  ", " ### "],
  H: [" # # ", "#####", "#####", "#####", " ### ", "  #  ", "     "],
  D: ["  #  ", " ### ", "#####", "#####", " ### ", "  #  ", "     "],
  C: [" ### ", " ### ", "## ##", "#####", "## ##", "  #  ", " ### "],
  "+": ["     ", "  #  ", "  #  ", "#####", "  #  ", "  #  ", "     "],
  x: ["     ", "#   #", " # # ", "  #  ", " # # ", "#   #", "     "],
  " ": ["     ", "     ", "     ", "     ", "     ", "     ", "     "],
};

const CELL = 6;

const LINE = 8;

/**
 * The dots lit for `text` (lines split by "\n", each centred in `columns`),
 * as [column, row] pairs.
 */
export function dotsFor(text: string, columns: number) {
  const dots: [number, number][] = [];
  text.split("\n").forEach((line, lineIndex) => {
    const left = Math.floor((columns - (line.length * CELL - 1)) / 2);
    [...line].forEach((char, index) => {
      const glyph = GLYPHS[char] ?? GLYPHS[" "];
      glyph.forEach((row, y) => {
        [...row].forEach((cell, x) => {
          if (cell === "#") {
            dots.push([left + index * CELL + x, lineIndex * LINE + y]);
          }
        });
      });
    });
  });
  return dots;
}

/** The columns a line of `chars` characters takes. */
export const columnsFor = (chars: number) => chars * CELL - 1;

/**
 * An old LED readout. Only lit dots are drawn, over faint rows; it redraws
 * only when its text or colour changes.
 */
export function DotMatrix({
  text,
  columns,
  lines = 1,
  x,
  y,
  width,
  color,
  frame,
}: {
  text: string;
  /** Columns the panel holds, so the dots keep one size as text grows. */
  columns: number;
  lines?: number;
  x: number;
  y: number;
  width: number;
  color: string;
  frame: string;
}) {
  const pitch = width / columns;
  const dots = dotsFor(text, columns);
  const rows = lines * LINE - 1;
  const pad = pitch * 2;
  return (
    <View
      style={{
        position: "absolute",
        left: x - width / 2 - pad,
        top: y - pad,
        width: width + pad * 2,
        height: pitch * rows + pad * 2,
        borderRadius: pitch * 1.5,
        backgroundColor: "#120c08",
        borderWidth: 1.5,
        borderColor: frame,
      }}
    >
      {Array.from({ length: rows }, (_, row) => (
        <View
          key={`row${row}`}
          style={{
            position: "absolute",
            left: pad,
            right: pad,
            top: pad + row * pitch + pitch * 0.35,
            height: pitch * 0.3,
            backgroundColor: "rgba(255, 190, 110, 0.06)",
          }}
        />
      ))}
      {dots.map(([column, row], i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: pad + column * pitch + pitch * 0.1,
            top: pad + row * pitch + pitch * 0.1,
            width: pitch * 0.8,
            height: pitch * 0.8,
            borderRadius: pitch,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}
