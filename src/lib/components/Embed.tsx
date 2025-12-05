import {
  component$,
  useSignal,
  useTask$,
  useVisibleTask$,
} from "@builder.io/qwik";

const LoadTwitterWidget = component$(() => {
  useVisibleTask$(() => {
    const timer = setInterval(() => {
      if (window.twttr?.widgets?.load) {
        clearInterval(timer);
        window.twttr.widgets.load();
      }
    });
  });
  return <></>;
});

export const Embed = component$<{
  url: string;
  alternative_image_url: string | null | undefined;
}>(({ url: _url }) => {
  const output = useSignal(<></>);
  const url = new URL(_url);

  useTask$(() => {
    if (/(x\.com|twitter\.com)/.test(url.hostname)) {
      output.value = (
        <>
          <blockquote class="twitter-tweet" data-lang="ja" data-theme="dark">
            <a href={url.toString().replace("x.com", "twitter.com")}>
              Loading tweet
            </a>
          </blockquote>
          <LoadTwitterWidget />
        </>
      );
    } else if (/(www\.)?(youtu\.be|youtube\.com)/.test(url.hostname)) {
      output.value = (
        <iframe
          style={{ height: "18em", width: "32em" }}
          src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?si=KX7B0pR2HSFyM5jU&amp;controls=0"
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullscreen
        ></iframe>
      );
    }
  });

  return output.value;
});
