import { $, component$, useSignal } from "@builder.io/qwik";
import { parse } from "./markdown";
import { useLocation } from "@builder.io/qwik-city";
import { GoCheck24, GoShare24 } from "@qwikest/icons/octicons";
import { sleep } from "../utils";
import { BRAND } from "../consts";

export const Share = component$<{ article: Awaited<ReturnType<typeof parse>> }>(
  ({ article }) => {
    const copied = useSignal(false);
    const loc = useLocation();
    const { title, subtitle, author } = article.meta;
    const texts = [title, subtitle, "-", `${BRAND} (@${author})`].filter(
      (x) => x != null,
    );
    const handleClick = $(async () => {
      const isFirefox = !globalThis.navigator.canShare;
      const data: ShareData = {
        text: texts.join(" "),
        url: loc.url.toString(),
      };

      if (isFirefox || !navigator.canShare(data)) {
        texts.push("\n\n", loc.url.toString());
        const item = new ClipboardItem({ "text/plain": texts.join(" ") });

        await navigator.clipboard.write([item]);
        copied.value = true;
        await sleep(500);
        copied.value = false;
      } else {
        await navigator.share(data);
      }
    });

    return (
      <button onClick$={handleClick}>
        <span>
          {copied.value ? <GoCheck24 /> : [<GoShare24 />, "共有する"]}
        </span>
      </button>
    );
  },
);
