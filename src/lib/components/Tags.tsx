import { component$ } from "@builder.io/qwik";
import styles from "./tags.module.css";
import { Link } from "@builder.io/qwik-city";

export const Tags = component$<{ tags: string[] }>(({ tags }) => {
  const result = tags.map((x, i) => {
    return (
      <div key={x + i} class={[styles["tag"], styles["no-break"]]}>
        <Link class={styles["no-break"]} href={`/?tags=${x}`}>
          #{x}
        </Link>
      </div>
    );
  });

  return <div>{result}</div>;
});
