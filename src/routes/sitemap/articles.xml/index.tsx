import { RequestHandler } from "@builder.io/qwik-city";
import articles from "../../../../public/articles/index.json";

const template = `<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/style.xsl"?>
<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd
                      http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd"
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
#replace#
</urlset>`;

export const onGet: RequestHandler = async ({ send, url }) => {
  const urls = articles.map((article) => {
    const loc = `${url.protocol}//${url.host}/@${article.filename}`;
    const lastmod = new Date(
      (article.updated ?? article.published) + "T09:00",
    ).toISOString();
    return `
    <url>
      <loc>${loc}</loc>
      <lastmod>${lastmod}</lastmod>
    </url>
`;
  });

  send(
    new Response(template.replace("#replace#", urls.join("\n")), {
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    }),
  );
};
