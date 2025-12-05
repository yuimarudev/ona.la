import { component$, Signal, useSignal } from "@builder.io/qwik";
import { Link, useLocation, type DocumentHead } from "@builder.io/qwik-city";
import styles from "./styles.module.css";
import articles from "../../public/articles/index.json";
import { Tags } from "~/lib/components/Tags";
import { DateFormatter } from "~/lib/components/DateFormatter";
import {
  GoArrowLeft16,
  GoArrowRight16,
  GoCalendar16,
} from "@qwikest/icons/octicons";
import {
  BRAND,
  generateLdJsonPerson,
  LD_JSON_ALTERNATE_NAMES,
  MOTTO,
} from "~/lib/consts";
import { Blog, WebSite, WithContext } from "schema-dts";

const Navigator = component$<{ page: Signal<number>; limit: number }>(
  ({ page, limit }) => {
    return (
      <div class={styles["space-between"]}>
        <button disabled={page.value === 0} onClick$={() => page.value--}>
          <GoArrowLeft16 />
          <span>次へ</span>
        </button>
        <span>{page.value + 1}ページ目</span>
        <button
          disabled={page.value >= limit - 1}
          onClick$={() => page.value++}
        >
          <span>前へ</span>
          <GoArrowRight16 />
        </button>
      </div>
    );
  }
);

export default component$(() => {
  const { url } = useLocation();
  const elements = articles
    .sort(
      (a, b) =>
        parseInt(b.published.replaceAll("-", "")) -
        parseInt(a.published.replaceAll("-", ""))
    )
    .map((x) => {
      const href = url.origin + "/@" + x.filename;

      return (
        <li class={styles["article"]}>
          <article>
            <h3>
              <Link class={styles["article-link"]} href={href}>
                {x.title}
              </Link>
            </h3>
            <p class={styles["preview"]}>{x.preview}</p>
            <Tags tags={x.tags} />
            <p>
              <GoCalendar16 aria-label="公開日" />
              <DateFormatter date={new Date(x.published + "T09:00")} />
            </p>
          </article>
        </li>
      );
    });
  const page = useSignal(0);
  const description = (
    <div class={styles["description"]}>
      <p>現在{articles.length}件の記事が存在します。</p>
      <p>
        使い方については<Link href="/about">知る</Link>をみてください。
      </p>
    </div>
  );

  if (elements.length < 10) {
    return [description, <ul class={styles["article-list"]}>{elements}</ul>];
  } else {
    return (
      <>
        {description}
        <Navigator page={page} limit={Math.ceil(elements.length / 10)} />
        <ul class={styles["article-list"]}>
          {elements.slice(page.value * 10, page.value * 10 + 9)}
        </ul>
        <Navigator page={page} limit={Math.ceil(elements.length / 10)} />
      </>
    );
  }
});

export const head: DocumentHead = ({ url }) => {
  const person = generateLdJsonPerson(url);
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND,
    description: MOTTO,
    alternateName: LD_JSON_ALTERNATE_NAMES,
    url: url.origin,
    author: person,
  } satisfies WithContext<WebSite>;
  const blog = {
    ...website,
    "@type": "Blog",
    blogPost: articles.map((article) => ({
      "@type": "BlogPosting",
      headline: article.title,
      url: url.origin + "/@" + article.filename,
      datePublished: article.published,
      dateModified: article.updated ?? article.published,
      image: url.origin + "/articles/" + article.og,
      author: person,
    })),
  } satisfies WithContext<Blog>;

  return {
    title: BRAND,
    meta: [
      {
        name: "og:title",
        content: BRAND,
      },
      {
        name: "description",
        content: MOTTO,
      },
      {
        name: "og:description",
        content: MOTTO,
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
        name: "twitter:title",
        content: BRAND,
      },
      {
        key: "twitter:card",
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
    scripts: [
      {
        script: JSON.stringify([person, website, blog]),
        props: { type: "application/json+ld" },
      },
    ],
  };
};
