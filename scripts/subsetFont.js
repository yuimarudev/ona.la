import { GlyphtContext, WoffCompressionContext } from "@glypht/core";
import { readFile, writeFile, readdir, unlink } from "node:fs/promises";
import articles from "../public/articles/index.json" with { type: "json" };
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import { join } from "node:path";
import { parse } from "smol-toml";
import {
  getTextContents,
  getTextContentsByType,
  compressAndSubsetFonts,
  toUnicoderange,
  parseTomlValue,
} from "./utils.js";

await cleanUp();

const label = "[Generate] /fonts/*.woff2 and /fonts/*.css";

console.log("Generating /fonts/*.woff2 and /fonts/*.css");
console.time(label);

const /** @type {{route: string, chars: string[], codes: string[]}[]} */ targets =
    [
      {
        route: "/",
        chars: [
          ...new Set([
            ...articles.flatMap((x) => [
              ...x.preview,
              ...x.title,
              ...x.tags.flatMap((y) => [...y]),
              ...x.published,
              ...(x.updated ?? ""),
            ]),
            ..."0123456789-",
            ..."ページ目",
            ..."前次へ",
            ..."使い方につて知るをみてください。",
            ..."年月日",
          ]),
        ],
        codes: [],
      },
      {
        route: "/about",
        chars: [
          ...new Set([
            ...(await readFile("src/routes/about/index.tsx", "utf-8"))
              .split("<>")[1]
              .split("</>")
              .at(0),
          ]),
        ],
        codes: [],
      },
      {
        route: "/404",
        chars: [
          ...new Set([
            ..."404",
            ..."ここには何もありません",
            ..."よくわかりませんがみなさん出口を出て",
            ..."左側",
            ..."に進まれるみたいです",
          ]),
        ],
        codes: [],
      },
    ];
const processer = remark().use(remarkGfm).use(remarkFrontmatter, "toml");

for (const article of articles) {
  const raw = await readFile(
    join("public", "articles", article.filename + ".md")
  );
  const processed = await processer.process(raw);
  const parsed = processer.parse(processed);
  const chars = getTextContents(parsed.children, ["code", "inlineCode"]);
  const codes = [
    ...new Set([
      ...getTextContentsByType(parsed.children, "code").flatMap((x) => [...x]),
      ...getTextContentsByType(parsed.children, "inlineCode").flatMap((x) => [
        ...x,
      ]),
    ]),
  ];
  const toml = parse(parsed.children.find((x) => x.type === "toml").value);

  chars.push(...parseTomlValue(toml));
  targets.push({
    route: "/@" + article.filename,
    chars: [...new Set(chars.flatMap((x) => [...x]))],
    codes,
  });
}

const allRoutes = targets.map((t) => t.route);
const routeCount = allRoutes.length;
const globalBaseChars = [..."悪意駆動型人生", ..."知る"];
/** @type {Map<string, Set<string>>} */
const charRoutes = new Map();

for (const { route, chars } of targets) {
  for (const ch of chars) {
    addCharRoute(ch, route);
  }
}

for (const ch of globalBaseChars) {
  let set = charRoutes.get(ch);

  if (!set) {
    set = new Set();

    charRoutes.set(ch, set);
  }

  for (const route of allRoutes) {
    set.add(route);
  }
}

/** @type {string[]} */
const base = [];
/** @type {Map<string, string[]>} */
const owns = new Map();
/** @type {{routes: string[], chars: string[]}[]} */
const commons = [];
/** @type {Map<string, {routes: string[], chars: string[]}>} */
const commonGroups = new Map();

for (const route of allRoutes) owns.set(route, []);

for (const [ch, routesSet] of charRoutes.entries()) {
  const routes = [...routesSet].sort();

  if (routes.length === routeCount) {
    base.push(ch);
  } else if (routes.length === 1) {
    const route = routes[0];

    owns.get(route).push(ch);
  } else {
    const key = routes.join(",");
    let group = commonGroups.get(key);

    if (!group) {
      group = { routes, chars: [] };
      commonGroups.set(key, group);
      commons.push(group);
    }

    group.chars.push(ch);
  }
}

base.sort((a, b) => (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0));

for (const group of commons) {
  group.chars = [...new Set(group.chars)].sort(
    (a, b) => (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0)
  );
}

for (const [route, chars] of owns) {
  const sorted = [...new Set(chars)].sort(
    (a, b) => (a.codePointAt(0) ?? 0) - (b.codePointAt(0) ?? 0)
  );
  owns.set(route, sorted);
}

/** @type {Map<string, string[]>} */
const codes = new Map();
for (const target of targets) {
  if (target.codes.length) {
    codes.set(
      target.route,
      [...new Set(target.codes)].sort((a, b) => (a > b ? 1 : -1))
    );
  }
}

const ctx = new GlyphtContext();
const plexBold = new Uint8Array(
  (await readFile(join("fonts", "IBMPlexSansJP", "Bold.ttf"))).buffer
);
const plexRegular = new Uint8Array(
  (await readFile(join("fonts", "IBMPlexSansJP", "Regular.ttf"))).buffer
);
const fonts = await ctx.loadFonts([plexBold, plexRegular], { transfer: true });
const compresser = new WoffCompressionContext();
const baseRange = toUnicoderange(base);
const baseFont = await compressAndSubsetFonts(fonts, compresser, baseRange);
const baseHash = Buffer.from(
  await crypto.subtle.digest("SHA-1", Buffer.from(base.join()))
).toString("hex");

const commonFonts = await Promise.all(
  commons.map(async (common) => {
    const range = toUnicoderange(common.chars);
    const [bold, regular] = await compressAndSubsetFonts(
      fonts,
      compresser,
      range
    );
    const hash = Buffer.from(
      await crypto.subtle.digest("SHA-1", Buffer.from(common.chars.join()))
    ).toString("hex");

    return { hash, bold, regular, routes: common.routes, range };
  })
);

/** @type {Map<string, {hash: string, bold: Uint8Array, regular: Uint8Array, range: string} | null>} */
const ownFontsMap = new Map();

for (const [route, chars] of owns.entries()) {
  if (!chars.length) {
    ownFontsMap.set(route, null);
    continue;
  }
  const range = toUnicoderange(chars);
  const [bold, regular] = await compressAndSubsetFonts(
    fonts,
    compresser,
    range
  );
  const hash = Buffer.from(
    await crypto.subtle.digest("SHA-1", Buffer.from(chars.join()))
  ).toString("hex");

  ownFontsMap.set(route, { route, hash, bold, regular, range });
}

await writeFile(join("public", "fonts", baseHash + "-bold.woff2"), baseFont[0]);
await writeFile(
  join("public", "fonts", baseHash + "-regular.woff2"),
  baseFont[1]
);

await writeFonts(commonFonts);
await writeFonts([...ownFontsMap.values()].filter((x) => x != null));

for (const route of allRoutes) {
  const own = ownFontsMap.get(route);

  /** @type {[string, string][]} */
  const requires = [
    [baseHash, baseRange],
    ...commonFonts
      .filter((x) => x.routes.includes(route))
      .map((x) => [x.hash, x.range]),
  ];

  if (own) {
    requires.push([own.hash, own.range]);
  }

  const css = requires
    .map(
      ([hash, range]) =>
        fontFace(
          "'IBM Plex Sans JP'",
          "normal",
          400,
          `/fonts/${hash}-regular.woff2`,
          range
        ) +
        fontFace(
          "'IBM Plex Sans JP'",
          "bold",
          700,
          `/fonts/${hash}-bold.woff2`,
          range
        )
    )
    .join("");

  await writeFile(
    join("public", "fonts", Buffer.from(route).toString("base64url") + ".css"),
    css
  );
}

console.timeEnd(label);

function fontFace(family, style, weight, src, range) {
  return `@font-face{font-display:swap;font-family:${family};font-style:${style};font-weight:${weight};src:url(${src})format('woff2');unicode-range:${range}}`;
}

async function writeFonts(list) {
  for (const item of list) {
    await writeFile(
      join("public", "fonts", item.hash + "-bold.woff2"),
      item.bold
    );
    await writeFile(
      join("public", "fonts", item.hash + "-regular.woff2"),
      item.regular
    );
  }
}

async function cleanUp() {
  const items = await readdir(join("public", "fonts"));

  for (const item of items) {
    if (!(item.endsWith(".woff2") || item.endsWith(".css"))) continue;

    await unlink(join("public", "fonts", item));
  }
}

/** @param {string} ch @param {string} route */
function addCharRoute(ch, route) {
  let set = charRoutes.get(ch);
  if (!set) {
    set = new Set();
    charRoutes.set(ch, set);
  }
  set.add(route);
}
