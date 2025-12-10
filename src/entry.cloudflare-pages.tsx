/*
 * WHAT IS THIS FILE?
 *
 * It's the entry point for Cloudflare Pages when building for production.
 *
 * Learn more about the Cloudflare Pages integration here:
 * - https://qwik.dev/docs/deployments/cloudflare-pages/
 *
 */
import {
  createQwikCity,
  type PlatformCloudflarePages,
} from "@builder.io/qwik-city/middleware/cloudflare-pages";
import qwikCityPlan from "@qwik-city-plan";
import render from "./entry.ssr";
import { HOST } from "./lib/consts";

declare global {
  type QwikCityPlatform = PlatformCloudflarePages;
}

const requestHandler = createQwikCity({ render, qwikCityPlan });

export const fetch = async (
  req: PlatformCloudflarePages["request"],
  env: PlatformCloudflarePages["env"] & {
    ASSETS: {
      fetch: (req: Request) => Response;
    };
  },
  ctx: PlatformCloudflarePages["ctx"]
) => {
  const res = await requestHandler(req, env, ctx);
  const newResponse = new Response(res.body, res);
  const origin = new URL(req.url);
  const cspDirectives = [
    "default-src 'self' 'unsafe-inline' www.youtube-nocookie.com platform.twitter.com",
    "connect-src 'self' r2." + origin.hostname,
    "font-src 'self' fonts.gstatic.com",
    "img-src 'self' 'unsafe-inline' data: r2." + origin.hostname,
    `script-src 'self' static.cloudflareinsights.com 'unsafe-inline' platform.twitter.com`,
    "style-src 'self' fonts.googleapis.com fonts.gstatic.com 'unsafe-inline'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
  ];

  newResponse.headers.set("Content-Security-Policy", cspDirectives.join("; "));
  newResponse.headers.set("X-Frame-Options", "SAMEORIGIN");
  newResponse.headers.set(
    "Permissions-Policy",
    "interest-cohort=(), browsing-topics=()"
  );
  newResponse.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  newResponse.headers.set("Referrer-Policy", "no-referrer");
  newResponse.headers.set("Access-Control-Allow-Origin", "*");
  newResponse.headers.set("Cross-Origin-Opener-Policy", "same-origin");

  newResponse.headers.set(
    "X-For-Curl",
    "you can fetch `/articles/index.json` and `/articles/[filename].md`"
  );
  newResponse.headers.set("X-For-Otaku", "follow me at Twitter: @contrafactio");

  if (req.url.endsWith(".json") || req.url.endsWith(".md")) {
    newResponse.headers.set("X-Robots-Tag", "noindex");
  }

  // _headers が効かない
  if (req.url.endsWith(".md")) {
    newResponse.headers.set("Content-Type", "text/markdown; charset=utf-8");
  } else if (req.url.endsWith(".xml")) {
    newResponse.headers.set("Content-Type", "text/xml; charset=utf-8");
  }

  if (origin.host !== HOST) {
    newResponse.headers.set("X-Robots-Tag", "noindex");
  }

  return newResponse;
};
