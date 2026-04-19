import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
        plugins: [svelte({ preprocess: vitePreprocess(), configFile: false })],
        root: "web",
        base: "./",
        build: {
                outDir: resolve(process.cwd(), "dist/web"),
                emptyOutDir: true,
        },
});
