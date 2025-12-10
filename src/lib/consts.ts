import type { WithContext, Person } from "schema-dts";

export const REPO_URL = "https://github.com/yuimarudev/ona.la";
export const REPO_BRANCH = "master";
export const BRAND = "悪意駆動型人生";
export const MOTTO = "全員殺す";
export const LD_JSON_ALTERNATE_NAMES = [
  "ゆいまるのブログ",
  "ona.la",
  "blog.yuimaru.dev",
];
export const HOST = "ona.la";


export const generateLdJsonPerson = (url: URL) => {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "ゆいまる",
    url: url.origin,
    birthDate: "2008-02-22",
    description: "悪意駆動型人生の伝道師。求道者でもある。",
  } satisfies WithContext<Person>;
};
