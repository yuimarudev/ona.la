import { RequestHandler } from "@builder.io/qwik-city";
import { generateFeed } from "~/lib/feedGen";

export const onGet: RequestHandler = async ({ send, url }) => {
  const feed = await generateFeed(url);

  send(
    new Response(feed.json1(), {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    }),
  );
};
