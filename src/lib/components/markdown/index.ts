// @ts-nocheck
// 助けて〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜〜

import { $ } from "@builder.io/qwik";
import { remark } from "remark";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import TOML from "smol-toml";
import { $array, $object, $opt, $string } from "lizod";
import { getTextContents } from "~/lib/utils";
import { Toml } from "../../../../qwik.env";

const validate = $object({
  author: $object({
    name: $string,
    link: $string,
  }),
  published: $string,
  updated: $opt($string),
  title: $string,
  subtitle: $opt($string),
  motd: $opt(
    $object({
      url: $string,
      alternative_image_url: $opt($string),
    }),
  ),
  tags: $array($string),
});

export const parse = $(async (content: string) => {
  const processer = remark().use(remarkFrontmatter, ["toml"]).use(remarkGfm);
  const processed = await processer.process(content);
  const result = processer.parse(processed);
  // @ts-ignore
  const toml = result.children.find(
    (x) => x.type === "toml" && "value" in x,
  ) satisfies Toml | undefined;
  const ctx = { errors: [] };
  const textContents = getTextContents(result.children);

  if (!toml?.value) throw new Error();

  const meta = TOML.parse(toml.value);

  if (!validate(meta, ctx)) throw new Error(JSON.stringify(ctx));

  return {
    result,
    meta,
    textContents,
  };
});
