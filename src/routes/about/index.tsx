import { component$ } from "@builder.io/qwik";
import styles from "./styles.module.css";
import { BRAND, REPO_URL } from "~/lib/consts";
import { DocumentHead } from "@builder.io/qwik-city";

export default component$(() => {
  return (
    <>
      <h1>使い方</h1>
      <h2>目が多数派の人間向け</h2>
      <p>
        <span class={styles["link"]}>この色</span>と
        <span class={styles["underline"]}>下線になっているテキスト</span>
        はクリックすることが可能です。
      </p>
      <p>
        見出しのハッシュはアンカーとなっており、パーマリンクとしてコピーできます。
      </p>
      <p>
        記事の編集履歴は<a href={REPO_URL}>Gitリポジトリ</a>
        から確認することができます。
      </p>
      <p>
        記事のURL形式は<code>/@[filename]</code>
        で、<code>/articles/[filename].md</code>
        を取得するとプレーンテキストで閲覧することが可能です。
        これによりcurlなどの環境で閲覧することができます。 curlで閲覧する場合、
        <code>/articles/index.json</code>を取得すると幸せになれます。
      </p>

      <h1>教えます</h1>
      <p>当サイトは以下のものを使用しています。</p>
      <ul class={styles["list"]}>
        <li class={styles["list-item"]}>
          <a class={styles["link"]} href="https://www.ibm.com/plex/">
            IBM Plex Sans
          </a>
          （
          <a class={styles["link"]} href="../fonts/README.md">
            ライセンス
          </a>
          ）
        </li>
      </ul>
    </>
  );
});

export const head: DocumentHead = ({ url }) => ({
  title: BRAND + " - 知る",
  meta: [
    {
      name: "og:title",
      content: BRAND + " - 知る",
    },
    {
      name: "description",
      content: "このサイトについて説明します",
    },
    {
      name: "og:description",
      content: "このサイトについて説明します",
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
      content: "このサイトについて説明します",
    },
    {
      key: "twitter:card",
      name: "twitter:card",
      content: "summary_large_image",
    },
  ],
});
