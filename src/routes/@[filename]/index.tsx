import {
  component$,
  isServer,
  Resource,
  Signal,
  useSignal,
  useStore,
  useTask$,
} from "@builder.io/qwik";
import {
  DocumentHead,
  RequestHandler,
  routeLoader$,
} from "@builder.io/qwik-city";
import { parse } from "~/lib/components/markdown";
import { Renderer } from "~/lib/components/markdown/Renderer";
import styles from "./styles.module.css";
import { Tags } from "~/lib/components/Tags";
import { DateFormatter } from "~/lib/components/DateFormatter";
import { GoCalendar16, GoHistory16 } from "@qwikest/icons/octicons";
import { Embed } from "~/lib/components/Embed";
import { Share } from "~/lib/components/Share";
import articles from "../../../public/articles/index.json";
import { BRAND, generateLdJsonPerson } from "~/lib/consts";
import { BlogPosting, BreadcrumbList, WithContext } from "schema-dts";

const twitterWidget = `window.twttr = (function (d, s, id) {
    var js,
      fjs = d.getElementsByTagName(s)[0],
      t = window.twttr || {};
    if (d.getElementById(id)) return t;
    js = d.createElement(s);
    js.id = id;
    js.src = "https://platform.twitter.com/widgets.js";
    fjs.parentNode.insertBefore(js, fjs);

    t._e = [];
    t.ready = function (f) {
      t._e.push(f);
    };

    return t;
  })(globalThis.document, "script", "twitter-wjs");`;

export const useArticle = routeLoader$(async ({ url }) => {
  try {
    const filename =
      url.pathname
        .split("/")
        .filter((x) => x)
        .at(-1)
        ?.slice(1) + ".md";
    // これのいい解決方法を探す
    const base = isServer ? url.origin : "";
    const response = await fetch(base + "/articles/" + filename);

    if (!response.ok)
      return { fail: true, status: response.status, text: response.statusText };

    const content = await response.text();
    const parsed = await parse(content);

    return { ...parsed };
  } catch (e) {
    return { fail: true, status: 500, text: String(e) };
  }
});

export default component$(() => {
  const data = useArticle();
  const output = useSignal(<></>);
  const title = useSignal("");
  const subtitle: Signal<string | undefined> = useSignal();
  const published = useSignal("1970-01-01");
  const publishedDate = useSignal(new Date());
  const updated = useSignal();
  const updatedDate: Signal<Date | undefined> = useSignal();
  const tags: string[] = useStore([]);
  const author = useStore({
    name: "",
    link: "",
  });
  const motd = useSignal(<></>);
  const shareButton = useSignal(<></>);

  useTask$(({ track }) => {
    const publishedDateString = track(() => published.value);
    const updatedDateString = track(() => updated.value);

    publishedDate.value = new Date(publishedDateString + "T09:00");

    if (updatedDateString) {
      updatedDate.value = new Date(updatedDateString + "T09:00");
    }
  });

  useTask$(({ track }) => {
    const article = track(() => data.value);

    if ("fail" in article) {
      output.value = (
        <>
          <h1>{article.status}</h1>
          <code>{article.text}</code>
        </>
      );
    } else {
      if (article.meta.motd) motd.value = <Embed {...article.meta.motd} />;
      if (article.meta.subtitle) subtitle.value = article.meta.subtitle;

      tags.push(...article.meta.tags);

      title.value = article.meta.title;
      published.value = article.meta.published;
      updated.value = article.meta.updated;
      author.link = article.meta.author.link;
      author.name = article.meta.author.name;

      output.value = <Renderer nodes={article.result.children} />;
      shareButton.value = <Share article={article} />;
    }
  });

  return (
    <div class={styles["container"]}>
      <div class={styles["container-head"]}>
        <h1>{title.value}</h1>
        <h2>{subtitle.value}</h2>
        <hr />

        <div class={styles["container-metadata"]}>
          <div>
            <div class={styles["date"]}>
              <GoCalendar16 aria-label="公開日" />
              <DateFormatter date={publishedDate.value} />
            </div>
            <Resource
              value={updatedDate}
              onResolved={(x) =>
                x && (
                  <div class={styles["date"]}>
                    <GoHistory16 aria-label="更新日" />
                    <DateFormatter date={x} />
                  </div>
                )
              }
            />
            <div class={styles["allow-break"]}>
              <Tags tags={tags} />
            </div>
          </div>
          <div class={styles["meta"]}>
            <p class={styles["no-break"]}>
              <a href={author.link}>{author.name}</a>
            </p>
            {shareButton.value}
          </div>
        </div>
        <hr />
      </div>
      <div>{output.value}</div>
      <hr />
      <div class={styles["motd"]}>
        <p>今日も一日</p>
        {motd.value}
      </div>
    </div>
  );
});

export const onGet: RequestHandler = ({ redirect, url }) => {
  const paths = url.pathname.split("/").filter((x) => x);

  if (paths.at(-1)?.endsWith(".md")) {
    throw redirect(301, "/articles/" + paths.at(-1)?.slice(1));
  }
};

export const head: DocumentHead = ({ resolveValue, url }) => {
  const article = resolveValue(useArticle);
  const person = generateLdJsonPerson(url);

  if ("fail" in article) {
    return {
      title: "エラー - " + BRAND,
      meta: [
        { name: "description", content: `${article.status} ${article.text}` },
      ],
    };
  } else {
    const { meta, textContents } = article;
    const links = [];
    const scripts = [];
    const description = textContents.join(" ").slice(0, 200);
    const title = meta.title + " - " + BRAND;
    const filename =
      url.pathname
        .split("/")
        .filter((x) => x)
        .at(-1) ?? "";
    const ogFilename = (articles as any).find(
      (x: any) => x.filename === filename.slice(1)
    )?.og;
    const blogpost = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: meta.title,
      description: description + "……",
      image: url.origin + "/articles/" + ogFilename,
      datePublished: meta.published,
      dateModified: meta.updated ?? meta.published,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": url.href,
      },
      keywords: meta.tags,
    } satisfies WithContext<BlogPosting>;
    const breadcrumbs = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: BRAND,
          item: url.origin,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: meta.title,
          item: url.href,
        },
      ],
    } as const satisfies WithContext<BreadcrumbList>;

    scripts.push({
      script: JSON.stringify([person, blogpost, breadcrumbs]),
      props: { type: "application/ld+json" },
    });

    if (meta.motd) {
      const motdUrl = new URL(meta.motd.url);

      if (/(x\.com|twitter\.com)/.test(motdUrl.hostname)) {
        links.push({
          rel: "preconnect",
          href: "https://platform.twitter.com",
          crossOrigin: "anonymous",
        });

        scripts.push({
          script: twitterWidget,
          props: {
            async: true,
          },
        });
      }

      if (/(youtube\.com|youtu\.be)/.test(motdUrl.hostname))
        links.push({
          rel: "preconnect",
          href: "https://www.youtube-nocookie.com",
          crossOrigin: "anonymous",
        });

      if (meta.motd.alternative_image_url)
        links.push({
          rel: "preconnect",
          href: "https://" + url.host,
          crossOrigin: "anonymous",
        });
    }

    return {
      title,
      meta: [
        {
          name: "og:title",
          content: title,
        },
        {
          name: "description",
          content: description,
        },
        {
          name: "og:description",
          content: description,
        },
        {
          name: "og:url",
          content: url.toString(),
        },
        {
          name: "og:type",
          content: "article",
        },
        {
          property: "og:image",
          content: url.origin + "/articles/" + ogFilename,
        },
        {
          name: "twitter:title",
          content: title,
        },
        {
          key: "twitter:card",
          name: "twitter:card",
          content: "summary_large_image",
        },
      ],
      scripts,
      links: [...links],
    };
  }
};
