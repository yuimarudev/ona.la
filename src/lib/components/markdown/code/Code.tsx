import {
  $,
  component$,
  useSignal,
} from "@builder.io/qwik";
import styles from "./code.module.css";
import { Highlighter } from "./Highlighter";
import { color } from "./theme/theme";

export const CodeBlock = component$<{ code: string }>(({ code }) => {
  return (
    <div class={styles["codeblock"]}>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
});

export const Code = component$<{
  lang?: string | null | undefined;
  value: string;
}>(({ lang: _lang, value }) => {
  const bg = color("bg");
  const fg = color("fg");
  const [filename, lang] = _lang?.split(":") ?? ["code"];

  const copyLabel = useSignal("Copy");
  const handleCopy = $(async () => {
    const item = new ClipboardItem({ "text/plain": value });

    await navigator.clipboard.write([item]);

    copyLabel.value = "✔";

    setTimeout(() => {
      copyLabel.value = "Copy";
    }, 500);
  });

  return (
    <div
      class={styles["codeblock-wrapper"]}
      style={{ "--code-fg": fg, "--code-bg": bg }}
    >
      <div class={styles["codeblock-header"]}>
        <div class={styles["codeblock-header-item"]}>
          <span>{filename}</span>
        </div>
        <div class={styles["codeblock-header-item"]}>
          <button class={styles["copy"]} onClick$={handleCopy}>
            {copyLabel.value}
          </button>
        </div>
      </div>

      {lang ? (
        <Highlighter lang={lang} code={value} />
      ) : (
        <CodeBlock code={value} />
      )}
    </div>
  );
});
