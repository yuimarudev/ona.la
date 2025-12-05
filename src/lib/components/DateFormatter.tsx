import { component$ } from "@builder.io/qwik";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "long",
  timeZone: "Asia/Tokyo",
});

export const DateFormatter = component$<{ date: Date }>(({ date }) => {
  const formatted = dateFormatter.format(date);

  return <time dateTime={date.toISOString()}>{formatted}</time>;
});
