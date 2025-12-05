import { component$ } from "@builder.io/qwik";
import { Context, Renderer } from "./Renderer";
import { RootContent } from "mdast";
import { getTextContents } from "~/lib/utils";
import styles from "./renderer.module.css";

export const FootnoteReference = component$<{
  context: Context;
  identifier: string;
}>(({ context, identifier }) => {
  return (
    <sup title={context.footnotes.get(identifier) ?? ""}>
      <a
        class={styles["link"]}
        id={`footnote-ref-${identifier}`}
        href={`#footnote-${identifier}`}
      >
        {identifier}
      </a>
    </sup>
  );
});

export const Footnote = component$<{
  props: { depth: number; context: Context; nodes: RootContent[] };
  identifier: string;
  c: RootContent[];
}>(({ props, identifier, c }) => {
  props.context.footnotes.set(identifier, getTextContents(c).join(""));

  return (
    <div id={`footnote-${identifier}`}>
      <span class={styles["inline-children"]}>
        {identifier}: {<Renderer {...props} />}{" "}
      </span>
      <a
        class={styles["link"]}
        href={`#footnote-ref-${identifier}`}
        aria-label="参照先へ戻る"
      >
        🔙
      </a>
    </div>
  );
});
