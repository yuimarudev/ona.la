import { DocumentHead, Link } from "@builder.io/qwik-city";
import { generateLdJsonPerson, BRAND, MOTTO } from "~/lib/consts";
import { component$ } from "@builder.io/qwik";
import styles from "./styles.module.css";

export default component$(() => {
  return (
    <>
      <h1>404</h1>
      <p>ここには何もありません</p>
      <p>
        よくわかりませんがみなさん出口を出て
        <Link class={styles["link"]} href="/">
          左側
        </Link>
        に進まれるみたいです
      </p>
    </>
  );
});

export const head: DocumentHead = ({ url }) => {
  const person = generateLdJsonPerson(url);

  return {
    title: BRAND + " - 404",
    meta: [
      { name: "robots", content: "noindex" },
      {
        name: "og:title",
        content: BRAND + " - 404",
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
        script: JSON.stringify([person]),
        props: { type: "application/json+ld" },
      },
    ],
    links: [{ rel: "stylesheet", href: "/NDA0.css" }],
  };
};
