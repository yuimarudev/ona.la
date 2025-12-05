import { RequestHandler } from "@builder.io/qwik-city";
import { template } from "../utils";

const pages = ["/about", "/"];

export const onGet: RequestHandler = async ({ send, url }) => {
  const urls = pages.map((endpoint) => {
    const loc = `${url.protocol}//${url.host}${endpoint}/`;
    return `
    <url>
      <loc>${loc}</loc>
      <lastmod>2025-12-05</lastmod>
    </url>
`;
  });

  send(
    new Response(template.replace("#replace#", urls.join("\n")), {
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    }),
  );
};
