globalThis.qTest = true;
globalThis.qDev = true;

import { readFile, writeFile } from "fs/promises";
import articles from "../public/articles/index.json" with { type: "json" };
import { createCanvas, GlobalFonts, Path2D } from "@napi-rs/canvas";
import { join } from "path";
import { createDOM } from "@builder.io/qwik/testing";
import { existsSync } from "fs";
import { GoCalendar16, GoHistory16 } from "@qwikest/icons/octicons";

const label = "[Generate] /articles/[filename]-[hash].png";

console.log("Generating /artciles/[filename]-[hash].png");
console.time(label);

const texts = [
  ...new Set([
    ...articles
      .flatMap((x) => [
        ...x.tags,
        x.title,
        x.subtitle ?? "",
        x.published,
        x.updated ?? "",
        x.author.name,
      ])
      .flatMap((x) => [...x]),
    ..."悪意駆動型人生",
    "#",
  ]),
].join("");

const calendar = svgToIcon(await componentToHTMLString(GoCalendar16));
const history = svgToIcon(await componentToHTMLString(GoHistory16));

GlobalFonts.register(
  await readFile("fonts/IBMPlexSansJP/Regular.ttf"),
  "IBM Plex Sans JP",
);
GlobalFonts.register(
  await readFile("fonts/IBMPlexSansJP/Bold.ttf"),
  "IBM Plex Sans JP",
);

for (const article of articles) {
  const canvas = createCanvas(1200, 630);
  const ctx = canvas.getContext("2d");
  const centerX = canvas.width / 2;
  const hash = Buffer.from(
    await crypto.subtle.digest(
      "SHA-1",
      Buffer.from(
        article.title +
          article.subtitle +
          article.published +
          article.updated +
          article.tags +
          article.author.name,
      ),
    ),
  ).toString("hex");
  const output = article.filename + "-" + hash + ".webp";

  const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, "#0f172a");
  gradient.addColorStop(1, "#111827");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 630);

  const titleFont = `700 64px "IBM Plex Sans JP"`;
  const titleMaxWidth = 1200 - 160;
  const titleLines = wrapText(ctx, article.title, titleMaxWidth, titleFont);

  ctx.fillStyle = "#f9fafb";
  ctx.textBaseline = "top";
  ctx.textAlign = "center";

  let currentY = 140;
  const lineHeightTitle = 72;

  ctx.font = titleFont;
  titleLines.forEach((line) => {
    ctx.fillText(line, centerX, currentY);
    currentY += lineHeightTitle;
  });

  if (article.subtitle) {
    const subtitleFont = `400 32px "IBM Plex Sans JP"`;
    const subtitleMaxWidth = 1200 - 160;
    const subtitleLines = wrapText(
      ctx,
      article.subtitle,
      subtitleMaxWidth,
      subtitleFont,
    );

    const lineHeightSubtitle = 44;
    ctx.font = subtitleFont;
    ctx.fillStyle = "#d1d5db";

    currentY += 20;

    subtitleLines.forEach((line) => {
      ctx.fillText(line, centerX, currentY);
      currentY += lineHeightSubtitle;
    });
  }

  if (article.tags.length) {
    const tagsFont = `500 26px "IBM Plex Sans JP"`;
    const tagsMaxWidth = 1200 - 160;
    const tagsText = article.tags.map((tag) => `#${tag}`).join("   ");
    const tagLines = wrapText(ctx, tagsText, tagsMaxWidth, tagsFont);

    const lineHeightTags = 36;
    ctx.font = tagsFont;
    ctx.fillStyle = "#9ca3af";
    ctx.textAlign = "left";

    currentY += 24;

    tagLines.forEach((line) => {
      ctx.fillText(line, 80, currentY);
      currentY += lineHeightTags;
    });
  }

  ctx.textAlign = "left";

  const metaY = 630 - 120;

  ctx.font = `600 28px "IBM Plex Sans JP"`;
  ctx.fillStyle = "#e5e7eb";
  ctx.fillText(article.author.name, 80, metaY);

  ctx.font = `400 24px "IBM Plex Sans JP"`;
  ctx.fillStyle = "#9ca3af";

  const metaItems = [
    { icon: calendar, text: article.published },
    ...(article.updated ? [{ icon: history, text: article.updated }] : []),
  ];

  const iconSize = 24;
  const iconTextSpacing = 10;
  const itemSpacing = 32;

  const metaWidths = metaItems.map(({ text }) => {
    const textWidth = ctx.measureText(text).width;
    return iconSize + iconTextSpacing + textWidth;
  });

  const totalMetaWidth =
    metaWidths.reduce((sum, width) => sum + width, 0) +
    itemSpacing * Math.max(metaItems.length - 1, 0);

  let metaX = 1200 - 80 - totalMetaWidth;
  const metaTextY = metaY + 4;

  metaItems.forEach(({ icon, text }, index) => {
    drawIcon(ctx, icon, metaX, metaTextY, iconSize);

    const textX = metaX + iconSize + iconTextSpacing;
    ctx.fillText(text, textX, metaTextY);

    metaX += metaWidths[index] + itemSpacing;
  });

  const brand = "悪意駆動型人生";
  ctx.font = `600 28px "IBM Plex Sans JP"`;
  ctx.fillStyle = "#6ee7b7";
  ctx.fillText(brand, 80, 60);

  ctx.strokeStyle = "rgba(249, 250, 251, 0.12)";
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, 1200 - 40, 630 - 40);

  await writeFile(
    join("public", "articles", output),
    canvas.toBuffer("image/webp"),
  );

  article.og = output;
}

await writeFile(
  join("public", "articles", "index.json"),
  JSON.stringify(articles, null, 2),
);

console.timeEnd(label);

globalThis.qTest = false;
globalThis.qDev = false;

function wrapText(ctx, text, maxWidth, font) {
  ctx.font = font;
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const { width } = ctx.measureText(testLine);

    if (width <= maxWidth) {
      currentLine = testLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = "";
    }

    if (ctx.measureText(word).width > maxWidth) {
      let chunk = "";
      for (const char of Array.from(word)) {
        const testChunk = chunk + char;
        if (ctx.measureText(testChunk).width > maxWidth && chunk) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk = testChunk;
        }
      }
      currentLine = chunk;
      continue;
    }

    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

async function componentToHTMLString(
  /** @type {(props?: unknown) => import("@builder.io/qwik").JSXNode} */ component,
) {
  const { render, screen } = await await createDOM();

  await render(component());

  return screen.innerHTML;
}

function svgToIcon(/** @type {string} */ svg) {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
  const paths = [...svg.matchAll(/<path[^>]*d="([^"]+)"[^>]*>/g)].map(
    (match) => match[1],
  );

  if (!viewBoxMatch || paths.length === 0) {
    throw new Error("failed to parse svg icon");
  }

  const [minX, minY, width, height] = viewBoxMatch[1].split(/\s+/).map(Number);

  return {
    viewBox: { minX, minY, width, height },
    paths: paths.map((d) => new Path2D(d)),
  };
}

function drawIcon(ctx, icon, x, y, size) {
  const scale = size / icon.viewBox.width;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.translate(-icon.viewBox.minX, -icon.viewBox.minY);
  icon.paths.forEach((path) => ctx.fill(path));
  ctx.restore();
}
