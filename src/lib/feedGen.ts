import { Feed } from "feed";
import { BRAND, MOTTO, REPO_URL } from "~/lib/consts";
import _articles from "../../public/articles/index.json";

export async function generateFeed(url: URL) {
  const articles = _articles.map((x) => {
    const result = { ...x } as Omit<typeof x, "updated" | "published"> & {
      updated?: string | Date;
      published: string | Date;
    };

    if ("updated" in x) {
      result.updated = new Date(result.updated + "T09:00");
    }

    result.published = new Date(result.published + "T09:00");

    return result as Omit<typeof x, "updated" | "published"> & {
      updated?: Date;
      published: Date;
    };
  });
  const firstArticle = articles
    .toSorted(
      (a, b) =>
        (b.updated ?? b.published).getTime() -
        (a.updated ?? a.published).getTime(),
    )
    .at(-1);
  const latestArticle = articles
    .toSorted(
      (a, b) =>
        (b.updated ?? b.published).getTime() -
        (a.updated ?? a.published).getTime(),
    )
    .at(0);

  if (!firstArticle || !latestArticle)
    throw new Error("Cannot find first / latest article");

  const feed = new Feed({
    title: BRAND,
    description: MOTTO,
    id: url.origin,
    link: url.origin,
    language: "ja",
    image: url.origin + "/og.png",
    favicon: url.origin + "/favicon.ico",
    copyright: REPO_URL,
    updated: latestArticle.updated ?? latestArticle.published, // optional, default = today
    feedLinks: {
      json: url.origin + "/feed.json",
      atom: url.origin + "/feed.xml",
    },
    author: firstArticle.author,
  });

  for (const article of articles) {
    const articleUrl = url.origin + "/@" + article.filename;

    feed.addItem({
      title: article.title,
      id: articleUrl,
      link: articleUrl,
      description: article.preview + "……",
      author: [article.author],
      contributor: [article.author],
      date: article.published,
      image: url.origin + "/articles/" + article.og,
    });
  }

  feed.addCategory("blog");

  return feed;
}
