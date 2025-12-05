import { RequestHandler } from "@builder.io/qwik-city";
import { generateFeed } from "~/lib/feedGen";

export const onGet: RequestHandler = async ({ send, url }) => {
  const feed = await generateFeed(url);

  send(
    new Response(feed.rss2(), {
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    }),
  );
};
