import { parseUnicodeRanges } from "@glypht/bundler-utils";

/**
 *
 * @param {import("mdast").RootContent[]} s
 * @param {string[]} excludes
 * @returns {string[]}
 */
export function getTextContents(s, excludes = []) {
  return s.flatMap((x) => {
    if (x.children) {
      return getTextContents(x.children);
    } else if ("value" in x && !excludes.includes(x.type)) {
      return x.value;
    } else {
      return [];
    }
  });
}

/**
 *
 * @param {import("mdast").RootContent[]} s
 * @param { "blockquote" | "break" | "code" | "definition" | "delete" | "emphasis" | "footnoteDefinition" | "footnoteReference" | "heading" | "html" | "image" | "imageReference" | "inlineCode" | "link" | "linkReference" | "list" | "listItem" | "paragraph" | "strong" | "table" | "tableCell" | "tableRow" | "text" | "thematicBreak" | "yaml" | "toml" | "mdxTextExpression" | "mdxFlowExpression" | "mdxJsxFlowElement" | "mdxJsxTextElement" | "mdxjsEsm"} type
 * @returns {string[]}
 */
export function getTextContentsByType(s, type) {
  return s.flatMap((x) => {
    if (x.children) {
      return getTextContents(x.children);
    } else if ("value" in x && x.type === type) {
      return x.value;
    } else {
      return [];
    }
  });
}

export const fontFeatures = [
  "vrt2",
  "ccmp",
  "jp78",
  "jp90",
  "vert",
  "nlck",
  "trad",
  "vert",
  "zero",
  "liga",
  "kern",
  "palt",
  "halt",
  "vhal",
  "vkrn",
  "vpal",
  "chws",
  "vchw",
];

/**
 * @param {import("@glypht/core").FontRef[]} fonts
 * @param {WoffCompressionContext} compressionCtx
 * @param {string} range
 */
export async function compressAndSubsetFonts(fonts, compressionCtx, range) {
  return await Promise.all(
    fonts.map(
      async (font) =>
        await compressionCtx.compressFromTTF(
          (
            await font.subset({
              axisValues: font.axes,
              features: Object.fromEntries(fontFeatures.map((x) => [x, true])),
              unicodeRanges: {
                named: [],
                custom: parseUnicodeRanges(range),
              },
            })
          ).data,
          { algorithm: "woff2", level: 15, transfer: true },
        ),
    ),
  );
}

/**
 * @param {import("smol-toml").TomlValue} value
 * @returns {string[]}
 */
export function parseTomlValue(value) {
  if (typeof value !== "object") {
    return String(value);
  } else {
    return Object.values(value).flatMap((content) => {
      if (Array.isArray(content)) {
        return content.flatMap((x) => parseTomlValue(x));
      } else {
        return parseTomlValue(content);
      }
    });
  }
}

export function toUnicoderange(input) {
  const chars = input.map((x) => x.charCodeAt(0)).sort((a, b) => a - b);
  const ranges = [];
  let start = chars[0];
  let end = start;

  for (let i = 1; i < chars.length; i++) {
    if (chars[i] === end + 1) {
      end = chars[i];
    } else {
      ranges.push(
        start === end
          ? `U+${start.toString(16)}`
          : `U+${start.toString(16)}-${end.toString(16)}`,
      );

      start = chars[i];
      end = start;
    }
  }

  ranges.push(
    start === end
      ? `U+${start.toString(16)}`
      : `U+${start.toString(16)}-${end.toString(16)}`,
  );

  return ranges.join();
}
