import { component$, useStore } from "@builder.io/qwik";
import type { RootContent } from "mdast";
import styles from "./renderer.module.css";
import { exoticMap, getTextContents, join } from "../../utils";
import { Code } from "./code/Code";
import { FootnoteReference, Footnote } from "./Footnote";

export type Context = {
  footnotes: Map<string, string>;
};

export const Renderer = component$<{
  nodes: RootContent[];
  depth?: number;
  context?: Context;
}>(
  ({
    nodes,
    depth = 0,
    context = useStore({
      footnotes: new Map(),
    }),
  }) => {
    const keyCounter = exoticMap(0);
    const result = nodes.map((node) => {
      // key example: heading-0-0
      const key = join("-", node.type, depth, keyCounter[node.type]!++);
      const props = { depth: depth + 1, nodes: [] as any[], context };

      if ("children" in node) {
        props.nodes = node.children;
      }

      switch (node.type) {
        case "blockquote":
          return (
            <blockquote key={key} class={styles["quote"]}>
              <Renderer {...props} />
            </blockquote>
          );
        case "list":
          if (node.ordered) {
            return (
              <ol key={key} start={node.start ?? 1} class={styles["list"]}>
                <Renderer {...props} />
              </ol>
            );
          } else {
            return (
              <ul key={key} class={styles["list"]}>
                <Renderer {...props} />
              </ul>
            );
          }
        case "listItem":
          return (
            <li key={key} class={styles["list-item"]}>
              {node.checked != null && (
                <input
                  type="checkbox"
                  disabled
                  checked={node.checked ?? undefined}
                />
              )}
              <Renderer {...props} />
            </li>
          );
        case "heading": {
          const Tag = `h${node.depth}` satisfies `h${1 | 2 | 3 | 4 | 5 | 6}`;
          const text = getTextContents(node.children)
            .join(" ")
            .replaceAll(" ", "-");

          return (
            <Tag key={key}>
              <a id={text} class={styles["heading-anchor"]} href={"#" + text}>
                {"#".repeat(node.depth)}
              </a>
              <Renderer {...props} />
            </Tag>
          );
        }
        case "link":
          return (
            <a key={key} class={styles["link"]} href={node.url}>
              <Renderer {...props} />
            </a>
          );
        case "paragraph":
          return (
            <p class={styles["paragraph"]} key={key}>
              <Renderer {...props} />
            </p>
          );
        case "emphasis":
          return (
            <em key={key}>
              <Renderer {...props} />
            </em>
          );
        case "strong":
          return (
            <span key={key} class={styles["strong"]}>
              <Renderer {...props} />
            </span>
          );
        case "break":
          return <br key={key} />;
        case "html":
          return <div key={key} dangerouslySetInnerHTML={node.value} />;
        case "image":
          return (
            <img key={key} alt={node.alt ?? node.title ?? ""} src={node.url} />
          );
        case "code":
          return <Code {...node} key={key} />;
        case "inlineCode":
          return (
            <span key={key}>
              <code>{node.value}</code>
            </span>
          );
        case "footnoteReference":
          return <FootnoteReference key={key} {...node} {...props} />;
        case "footnoteDefinition":
          return (
            <Footnote
              props={props}
              c={node.children}
              identifier={node.identifier}
            />
          );
        case "text":
          return node.value;
        case "thematicBreak":
          return <hr key={key} class={styles["hr"]} />;

        default:
          return <></>;
      }
    });

    return result;
  },
);
