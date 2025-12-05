import type { Data, Literal, RootContentMap } from "mdast";

interface Toml extends Literal {
  type: "toml";
  data?: Data;
}

declare module "mdast" {
  interface RootContentMap {
    // Allow using TOML nodes defined by `remark-frontmatter`.
    toml: Toml;
  }
}

declare global {
  var twttr: undefined | { widgets?: { load: () => {} } };
}

declare module "@articles" {
  const articles: {
    preview: string;
    filename: string;
    published: string;
    updated?: string;
    title: string;
    subtitle?: string;
    tags: string[];
    author: {
      name: string;
      link: string;
    };
    motd: {
      url: string;
      alternative_image_url: string;
    };
    og: string;
  }[];

  export default articles;
}
