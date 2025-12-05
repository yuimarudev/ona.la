import { $, component$, useSignal, useTask$ } from "@builder.io/qwik";
import styles from "./code.module.css";
import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import githubDarkTheme from "shiki/themes/github-dark.mjs";
import js from "@shikijs/langs/javascript";

const Highlighter = component$<{ lang: string; code: string }>(
  ({ lang, code }) => {
    const output = useSignal(<CodeBlock code={code} />);

    // マジで意味がわからないんだけど、createHighlighterCoreSync じゃなくて createHighlighterCore を使うと、破壊が発生する。
    // [VirtualElementImpl](https://github.com/QwikDev/qwik/blob/5258b9e0170ae8b432479ebea6827217253e2af0/packages/qwik/src/core/render/dom/virtual-element.ts)
    // を見て欲しいんだけど、VirtualElementImpl#close が undefined になるらしくコンストラクタでやっている `(close as any)[VIRTUAL_SYMBOL] = this;` が失敗する
    // どうして virtual element の close tag が消えるのかはわからない。
    // qwik に詳しい人助けてください
    useTask$(({ track, cleanup }) => {
      track(() => lang);
      track(() => code);

      const engine = createJavaScriptRegexEngine();
      const highlighter = createHighlighterCoreSync({
        themes: [githubDarkTheme],
        langs: [js],
        engine,
      });
      const html = highlighter.codeToHtml(code, {
        lang: lang.toLowerCase(),
        theme: "github-dark",
      });

      output.value = (
        <div class={styles["codeblock"]} dangerouslySetInnerHTML={html} />
      );

      cleanup(() => highlighter.dispose());
    });

    return output.value;
  },
);

const CodeBlock = component$<{ code: string }>(({ code }) => {
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
}>(({ lang, value }) => {
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
    <div class={styles["codeblock-wrapper"]}>
      <div class={styles["codeblock-header"]}>
        <div class={styles["codeblock-header-item"]}>
          <span>{lang ?? "code"}</span>
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
