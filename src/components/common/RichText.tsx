import { Text, TextSize, TextWeight } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Colors } from "@/styles/styles";
import { ReactNode, useMemo } from "react";
import { View } from "react-native";

/**
 * Renders lightweight markdown-ish content used for game rules / about text.
 *
 * Supported syntax (per line):
 *  - `# Heading`, `## Heading`, `### Heading`
 *  - `- item` or `* item` for bullet lists
 *  - `**bold**` inline emphasis
 *  - `{5H}` / `{JC}` / `{10S}` card tokens -> rank + colored suit symbol
 *
 * Content may be a single string (with `\n` line breaks) or an array of
 * blocks. Blank lines separate blocks.
 */

const SUIT_GLYPH = {
  H: "\u2665", // hearts
  D: "\u2666", // diamonds
  C: "\u2663", // clubs
  S: "\u2660", // spades
} as const;

const SUIT_COLOR = {
  H: Colors.suitsRed,
  D: Colors.suitsRed,
  C: Colors.white,
  S: Colors.white,
} as const;

type SuitLetter = keyof typeof SUIT_GLYPH;

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const LIST_RE = /^\s*[-*]\s+(.*)$/;
// Returns a fresh regex instance each call so recursive renderInline calls
// (for bold text) never share lastIndex state, which would cause an infinite loop.
function makeInlineRe() {
  return /\*\*([\s\S]+?)\*\*|\{(10|[2-9]|[AJQKajqk])([HDCShdcs])\}/g;
}

function toLines(content: string | string[]): string[] {
  const blocks = Array.isArray(content) ? content : [content];
  return blocks.flatMap((block) => block.split("\n"));
}

function parseBlocks(content: string | string[]): Block[] {
  const lines = toLines(content);
  const blocks: Block[] = [];
  let listItems: string[] | null = null;

  const flushList = () => {
    if (listItems && listItems.length > 0) {
      blocks.push({ type: "list", items: listItems });
    }
    listItems = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.trim() === "") {
      flushList();
      continue;
    }

    const listMatch = line.match(LIST_RE);
    if (listMatch) {
      if (!listItems) listItems = [];
      listItems.push(listMatch[1]);
      continue;
    }

    flushList();

    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      continue;
    }

    blocks.push({ type: "paragraph", text: line.trim() });
  }

  flushList();
  return blocks;
}

function CardToken({ rank, suit }: { rank: string; suit: SuitLetter }) {
  return (
    <Text weight={600}>
      {rank.toUpperCase()}
      <Text weight={600} color={SUIT_COLOR[suit]}>
        {SUIT_GLYPH[suit]}
      </Text>
    </Text>
  );
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  const re = makeInlineRe();

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      // Bold segment (may itself contain card tokens).
      nodes.push(
        <Text key={`${keyPrefix}-b${i}`} weight="bold">
          {renderInline(match[1], `${keyPrefix}-b${i}`)}
        </Text>,
      );
    } else {
      const rank = match[2];
      const suit = match[3].toUpperCase() as SuitLetter;
      nodes.push(
        <CardToken key={`${keyPrefix}-c${i}`} rank={rank} suit={suit} />,
      );
    }

    lastIndex = re.lastIndex;
    i += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

const HEADING_SIZE: Record<number, TextSize> = {
  1: "lg",
  2: "md",
  3: "sm",
};

export type RichTextProps = {
  content: string | string[];
  size?: TextSize;
  weight?: TextWeight;
  color?: string;
  headingColor?: string;
  gap?: number;
};

export function RichText({
  content,
  size = "md",
  weight = 300,
  color = Colors.K200,
  headingColor = Colors.cardSelectPurple,
  gap = 20,
}: RichTextProps) {
  const { spacing } = useResponsiveMetrics();
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <View
      style={{
        width: "100%",
        alignItems: "flex-start",
        gap: spacing(gap),
      }}
    >
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <Text
              key={`h-${index}`}
              size={HEADING_SIZE[block.level] ?? "md"}
              weight={600}
              color={headingColor}
            >
              {renderInline(block.text, `h-${index}`)}
            </Text>
          );
        }

        if (block.type === "list") {
          return (
            <View
              key={`l-${index}`}
              style={{ width: "100%", gap: spacing(gap / 2) }}
            >
              {block.items.map((item, itemIndex) => (
                <View
                  key={`l-${index}-${itemIndex}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: spacing(8),
                  }}
                >
                  <Text size={size} weight={weight} color={color}>
                    {"\u2022"}
                  </Text>
                  <Text
                    size={size}
                    weight={weight}
                    color={color}
                    style={{ flex: 1 }}
                  >
                    {renderInline(item, `l-${index}-${itemIndex}`)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        return (
          <Text key={`p-${index}`} size={size} weight={weight} color={color}>
            {renderInline(block.text, `p-${index}`)}
          </Text>
        );
      })}
    </View>
  );
}
