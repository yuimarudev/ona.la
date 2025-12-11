import theme from "./github-dark.json";

type ThemeTokenColor = {
  scope?: string | string[];
  settings?: {
    foreground?: string;
    background?: string;
  };
};
type ThemeFile = { tokenColors?: ThemeTokenColor[] };

const tokenColors = (theme as ThemeFile).tokenColors ?? [];

const findColor = (scopes: string[], fallback: string) => {
  for (const token of tokenColors) {
    if (!token.scope || !token.settings?.foreground) continue;

    const tokenScopes = Array.isArray(token.scope)
      ? token.scope
      : [token.scope];

    if (tokenScopes.some((scope) => scopes.includes(scope))) {
      return token.settings.foreground;
    }
  }

  return fallback;
};

const themeColors = {
  background: "#24292e",
  foreground: findColor(
    ["variable.other", "variable.parameter.function"],
    "#e1e4e8"
  ),
  comment: findColor(
    ["comment", "punctuation.definition.comment", "string.comment"],
    "#6a737d"
  ),
  keyword: findColor(["keyword", "storage", "storage.type"], "#f97583"),
  string: findColor(
    [
      "string",
      "punctuation.definition.string",
      "string punctuation.section.embedded source",
    ],
    "#9ecbff"
  ),
  number: findColor(
    [
      "constant.numeric",
      "constant",
      "support.constant",
      "variable.language",
      "variable.other.constant",
      "variable.other.enummember",
    ],
    "#79b8ff"
  ),
  variable: findColor(["variable", "variable.other"], "#ffab70"),
  property: findColor(
    ["meta.property-name", "support.variable", "support"],
    "#79b8ff"
  ),
  type: findColor(["entity", "entity.name", "support.type"], "#b392f0"),
  inserted: findColor(
    ["entity.name.tag", "string.regexp constant.character.escape"],
    "#85e89d"
  ),
  deleted: findColor(
    [
      "invalid",
      "invalid.broken",
      "invalid.deprecated",
      "invalid.illegal",
      "invalid.unimplemented",
    ],
    "#fdaeb7"
  ),
  meta: findColor(
    ["meta", "variable.other", "variable.parameter.function"],
    "#e1e4e8"
  ),
};

const colors = [
  [["bg"], themeColors.background],
  [["fg"], themeColors.foreground],
  [["comment"], themeColors.comment],
  [["keyword", "operator"], themeColors.keyword],
  [["string", "string2"], themeColors.string],
  [["number", "atom", "bool", "literal"], themeColors.number],
  [["variableName"], themeColors.variable],
  [["propertyName", "variableName2"], themeColors.property],
  [["typeName", "className", "namespace", "macroName"], themeColors.type],
  [["inserted"], themeColors.inserted],
  [["deleted", "invalid"], themeColors.deleted],
  [["meta", "punctuation", "definition"], themeColors.meta],
] as const;

export const color = (key: (typeof colors)[number][0][number]) => {
  return colors.find((x) => x[0].find((y) => key === y))?.[1]!;
};
