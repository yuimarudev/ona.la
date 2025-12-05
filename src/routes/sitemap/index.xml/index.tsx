import { RequestHandler } from "@builder.io/qwik-city";

export const onGet: RequestHandler = async ({ send, url }) => {
  send(
    new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
  <?xml-stylesheet type="text/xsl" href="/style.xsl"?>
  <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
        <loc>${url.protocol}//${url.host}/sitemap/pages.xml</loc>
    </sitemap>
    <sitemap>
        <loc>${url.protocol}//${url.host}/sitemap/articles.xml</loc>
    </sitemap>
  </sitemapindex>`,
      { headers: { "Content-Type": "text/xml; charset=utf-8" } },
    ),
  );
};
