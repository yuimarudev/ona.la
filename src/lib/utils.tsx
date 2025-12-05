import { RootContent } from "mdast";

type ToString = unknown & { toString: () => string };
export const join = (sep: ToString, ...items: ToString[]) => {
  return items.map((x) => x.toString()).join(sep.toString());
};

export const exoticMap: <T>(defaultValue: T) => { [key: string]: T } = (
  defaultValue,
) => {
  const inner: { [key: string | symbol]: typeof defaultValue } = {};

  return new Proxy(inner, {
    get(target, p, receiver) {
      if (!target[p]) {
        target[p] = defaultValue;
      }

      return Reflect.get(target, p, receiver);
    },
    set(target, p, newValue, receiver) {
      if (!target[p]) {
        target[p] = defaultValue;
      }

      return Reflect.set(target, p, newValue, receiver);
    },
  });
};

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function getTextContents(nodes: RootContent[]): string[] {
  return nodes.flatMap((node) => {
    if ("children" in node) {
      return getTextContents(node.children);
    } else if ("value" in node && node.type !== "toml") {
      return node.value;
    } else {
      return [];
    }
  });
}
