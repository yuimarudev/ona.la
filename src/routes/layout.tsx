import { component$, Slot } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import styles from "./styles.module.css";
import { BRAND } from "~/lib/consts";

export default component$(() => {
  return (
    <div>
      <header
        class={[styles["container"], styles["space-between"], styles["header"]]}
      >
        <div>
          <h2>
            <Link href="/">{BRAND}</Link>
          </h2>
        </div>
        <div>
          <span>
            <Link href="/about">知る</Link>
          </span>
        </div>
      </header>
      <main id="main" tabIndex={-1} class={styles["container"]}>
        <Slot />
      </main>
    </div>
  );
});
