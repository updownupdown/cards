import { Text, TextSize, TextWeight } from "@/components/common/Text";
import { useResponsiveMetrics } from "@/hooks/useResponsiveMetrics";
import { Colors, rgba } from "@/styles/styles";
import { ReactNode, useMemo } from "react";
import { View } from "react-native";

/**
 * Renders lightweight markdown-ish content used for game rules / about text.
 *
 * Supported syntax (per line):
 *  - `# Heading`, `## Heading`, `### Heading`
 *  - `- item` or `* item` for bullet lists
 *  - `-- item` for nested bullet lists
 *  - `| Label | Value |` for a row of a two-column rules table
 *  - `---` for a horizontal rule
 *  - a blank line for vertical space
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
  C: Colors.K400,
  S: Colors.K400,
} as const;

type SuitLetter = keyof typeof SUIT_GLYPH;

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: ListItem[] }
  | { type: "table"; rows: TableRow[] }
  | { type: "blank" }
  | { type: "rule" };

type ListItem = {
  depth: 0 | 1;
  text: string;
};

type TableRow = { label: string; value: string };

type TextBlock =
  | { type: "heading"; level: number; lines: string[] }
  | { type: "paragraph"; lines: string[] };

const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const HORIZONTAL_RULE_RE = /^\s*-{3,}\s*$/;
const SUB_LIST_RE = /^\s*--\s+(.*)$/;
const LIST_RE = /^\s*[-*]\s+(.*)$/;
const TABLE_ROW_RE = /^\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/;
// Returns a fresh regex instance each call so recursive renderInline calls
// (for bold text) never share lastIndex state, which would cause an infinite loop.
function makeInlineRe() {
  return /\*\*([\s\S]+?)\*\*|\{(10|[2-9]|[AJQKajqk])([HDCShdcs])\}/g;
}

function parseBlocks(content: string | string[]): Block[] {
  const contentBlocks = Array.isArray(content) ? content : [content];
  const blocks: Block[] = [];
  let listItems: ListItem[] | null = null;
  let tableRows: TableRow[] | null = null;
  let textBlock: TextBlock | null = null;

  const flushTextBlock = () => {
    if (!textBlock) return;

    const text = textBlock.lines.join("\n");
    if (textBlock.type === "heading") {
      blocks.push({ type: "heading", level: textBlock.level, text });
    } else {
      blocks.push({ type: "paragraph", text });
    }
    textBlock = null;
  };

  const flushList = () => {
    if (listItems && listItems.length > 0) {
      blocks.push({ type: "list", items: listItems });
    }
    listItems = null;
  };

  const flushTable = () => {
    if (tableRows && tableRows.length > 0) {
      blocks.push({ type: "table", rows: tableRows });
    }
    tableRows = null;
  };

  for (const contentBlock of contentBlocks) {
    const lines = contentBlock.split("\n");

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();

      const tableMatch = line.match(TABLE_ROW_RE);
      if (tableMatch) {
        flushTextBlock();
        flushList();
        if (!tableRows) tableRows = [];
        tableRows.push({ label: tableMatch[1], value: tableMatch[2] });
        continue;
      }
      flushTable();

      if (line.trim() === "") {
        flushTextBlock();
        flushList();
        blocks.push({ type: "blank" });
        continue;
      }

      if (HORIZONTAL_RULE_RE.test(line)) {
        flushTextBlock();
        flushList();
        blocks.push({ type: "rule" });
        continue;
      }

      const subListMatch = line.match(SUB_LIST_RE);
      if (subListMatch) {
        flushTextBlock();
        if (!listItems) listItems = [];
        listItems.push({ depth: 1, text: subListMatch[1] });
        continue;
      }

      const listMatch = line.match(LIST_RE);
      if (listMatch) {
        flushTextBlock();
        if (!listItems) listItems = [];
        listItems.push({ depth: 0, text: listMatch[1] });
        continue;
      }

      const headingMatch = line.match(HEADING_RE);
      if (headingMatch) {
        flushTextBlock();
        flushList();
        textBlock = {
          type: "heading",
          level: headingMatch[1].length,
          lines: [headingMatch[2]],
        };
        continue;
      }

      if (listItems && listItems.length > 0) {
        listItems[listItems.length - 1].text += `\n${line.trim()}`;
        continue;
      }

      if (textBlock) {
        textBlock.lines.push(line.trim());
        continue;
      }

      textBlock = { type: "paragraph", lines: [line.trim()] };
    }

    if (contentBlocks.length > 1 && !tableRows) {
      flushTextBlock();
      flushList();
    }
  }

  flushTextBlock();
  flushList();
  flushTable();
  return blocks;
}

function CardToken({ rank, suit }: { rank: string; suit: SuitLetter }) {
  return (
    <Text
      weight={600}
      color={Colors.white}
      style={{
        backgroundColor: rgba(Colors.white, 0.12),
        borderRadius: 2,
        paddingHorizontal: 4,
        aspectRatio: 2.5 / 3.5,
        textAlign: "center",
      }}
    >
      {rank.toUpperCase()}
      <Text weight={600} color={SUIT_COLOR[suit]} style={{ marginLeft: 2 }}>
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
  1: "xxl",
  2: "xl",
  3: "lg",
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
  color = rgba(Colors.white, 0.9),
  headingColor = Colors.K200,
  gap = 20,
}: RichTextProps) {
  const { spacing } = useResponsiveMetrics();
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <View
      style={{
        width: "100%",
        alignItems: "flex-start",
      }}
    >
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <Text
              key={`h-${index}`}
              size={HEADING_SIZE[block.level] ?? "md"}
              weight={300}
              color={headingColor}
              style={{
                marginTop: spacing(gap * 1.5),
                // marginBottom: spacing(gap / 2),
              }}
            >
              {renderInline(block.text, `h-${index}`)}
            </Text>
          );
        }

        if (block.type === "list") {
          return (
            <View
              key={`l-${index}`}
              style={{
                width: "100%",
                gap: spacing(gap),
                marginTop: spacing(gap / 2),
              }}
            >
              {block.items.map((item, itemIndex) => (
                <View
                  key={`l-${index}-${itemIndex}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: spacing(8),
                    paddingLeft: item.depth === 1 ? spacing(20) : 0,
                  }}
                >
                  <Text size="md" weight={400} color={color}>
                    {item.depth === 1 ? "\u25E6" : "\u2022"}
                  </Text>
                  <Text
                    size="md"
                    weight={300}
                    color={color}
                    style={{ flex: 1 }}
                  >
                    {renderInline(item.text, `l-${index}-${itemIndex}`)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        if (block.type === "table") {
          return (
            <View
              key={`t-${index}`}
              style={{ width: "100%", marginTop: spacing(gap / 2) }}
            >
              {block.rows.map((row, rowIndex) => (
                <View
                  key={`t-${index}-${rowIndex}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: spacing(12),
                    paddingVertical: spacing(8),
                    borderTopWidth: rowIndex === 0 ? 0 : 1,
                    borderTopColor: rgba(Colors.white, 0.12),
                  }}
                >
                  <Text
                    size="md"
                    weight={300}
                    color={color}
                    style={{ width: "38%", opacity: 0.6 }}
                  >
                    {renderInline(row.label, `t-${index}-${rowIndex}-l`)}
                  </Text>
                  <Text
                    size="md"
                    weight={400}
                    color={color}
                    style={{ flex: 1 }}
                  >
                    {renderInline(row.value, `t-${index}-${rowIndex}-v`)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        if (block.type === "blank") {
          return <View key={`b-${index}`} style={{ height: spacing(gap) }} />;
        }

        if (block.type === "rule") {
          return (
            <View
              key={`r-${index}`}
              style={{
                width: "100%",
                borderTopWidth: 1,
                borderTopColor: rgba(Colors.white, 0.25),
                marginVertical: spacing(gap),
              }}
            />
          );
        }

        return (
          <Text
            key={`p-${index}`}
            size="md"
            weight={400}
            color={color}
            style={{
              marginTop: spacing(gap / 2),
              marginBottom: spacing(gap / 2),
            }}
          >
            {renderInline(block.text, `p-${index}`)}
          </Text>
        );
      })}
    </View>
  );
}
