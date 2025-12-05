import { join } from "node:path";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { remark } from "remark";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import TOML from "smol-toml";
import { getTextContents } from "./utils.js";

const label = "[Generate] /articles/index.json";

console.log("Generating /artciles/index.json");
console.time(label);

const processer = remark().use(remarkFrontmatter, ["toml"]).use(remarkGfm);
const entries = (await readdir("public/articles")).filter((x) =>
  x.endsWith(".md"),
);
const /** @type {[string, string][]} */ files = await Promise.all(
    entries.map(async (x) => [
      x.slice(0, -3),
      await readFile(join("public", "articles", x), "utf8"),
    ]),
  );
const articles = await Promise.all(
  files.map(async ([filename, content]) => {
    const file = await processer.process(content);
    const parsed = processer.parse(file);
    const preview = getTextContents(parsed.children, ["toml"]);
    const meta = TOML.parse(
      parsed.children.find((x) => x.type === "toml").value,
    );

    return {
      preview: preview.join(" ").slice(0, 200),
      filename,
      og: "",
      ...meta,
    };
  }),
);

await writeFile(
  join("public", "articles", "index.json"),
  JSON.stringify(articles, null, 2),
);

console.timeEnd(label);
