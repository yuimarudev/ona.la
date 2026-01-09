import {
  $,
  component$,
  Signal,
  useResource$,
  useSignal,
  useVisibleTask$,
} from "@builder.io/qwik";
import { highlightCode, classHighlighter } from "@lezer/highlight";
import styles from "./code.module.css";
import { color } from "./theme/theme";
import { CodeBlock } from "./Code";

export const getParser = $(async (lang: string) => {
  if (!globalThis.parsers) globalThis.parsers = new Map();

  const candicates = [];
  let parser = globalThis.parsers.get(lang);

  if (parser) return parser;

  switch (lang.toLowerCase()) {
    case "js":
    case "mjs":
    case "cjs":
    case "javascript":
      parser = (await import("@lezer/javascript")).parser;
      candicates.push("js", "javascript");
      break;
    case "sh":
    case "bash":
      // @ts-expect-error fuck
      parser = (await import("@fig/lezer-bash")).parser;
      candicates.push("sh", "bash");
      break;
    case "ini":
    case "service":
    case "config":
    case "toml":
      // @ts-expect-error fuck
      parser = (await import("lezer-toml")).parser;
      candicates.push("ini", "service", "config", "toml");
      break;
    default:
      throw new Error("Unknown language: " + lang);
  }

  for (const candicate of candicates) globalThis.parsers.set(candicate, parser);

  return parser;
});

// こうしないと SSR 時に表示が大崩壊して全てが終わる
// たぶん非同期レンダリングのせい
export const Highlighter = component$<{ lang: string; code: string }>(
  ({ lang, code }) => {
    const jsxResource = useResource$(async () => {
      const parser = await getParser(lang);
      const output: (
        | { text: string; style: { color: string }; classes: string }
        | string
      )[] = [];

      highlightCode(
        code,
        parser.parse(code),
        classHighlighter,
        (text, classes) => {
          const style =
            classes
              .split(" ")
              .map((x) => color(x.slice(4) as Parameters<typeof color>[0]))
              .filter((x) => x)
              .at(0) ?? "oklch(0.929 0.013 255.508)";
          output.push({ text, classes, style: { color: style } });
        },
        () => output.push("\n"),
      );

      return output;
    });
    const jsx: Signal<
      ({ text: string; style: { color: string }; classes: string } | string)[]
    > = useSignal([]);

    useVisibleTask$(async () => {
      jsx.value = await jsxResource.value;
      console.log(jsx.value);
    });

    return jsx.value.length ? (
      <div class={styles["codeblock"]}>
        <pre>
          <code>
            {jsx.value.map((x) =>
              typeof x === "string" ? (
                x
              ) : (
                <span class={x.classes} style={x.style}>
                  {x.text}
                </span>
              ),
            )}
          </code>
        </pre>
      </div>
    ) : (
      <CodeBlock code={code} />
    );
  },
);
