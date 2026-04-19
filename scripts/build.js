import { context } from "esbuild";
import { readFile } from "fs/promises";
import path from "path";
import process from "process";

const watch = process.argv.includes("--watch");
const windows = /^win/.test(process.platform);
const escape = (p) => (windows ? p.replace(/\\/g, "/") : p);

async function build(development) {
        const ctx = await context({
                entryPoints: ["./src/client/index.ts", "./src/server/index.ts"],
                outdir: "./dist",
                platform: "node",
                target: "node22",
                bundle: true,
                minify: false,
                plugins: [
                        {
                                name: "build",
                                setup(build) {
                                        build.onLoad({ filter: /\.(js|ts)$/ }, async (args) => {
                                                const data = await readFile(args.path, "utf8");
                                                const shim = /__filename|__dirname/.test(data);
                                                const location = shim ? `const location = { filename: '${escape(args.path)}', dirname: '${escape(path.dirname(args.path))}' }; let __line = 0;\n` : "";
                                                const insert = data.includes("__line") ? data.split("\n").map((line, index) => `${line.includes("__line") ? `__line=${index + 1};` : ""}${line}`).join("\n") : data;
                                                return {
                                                        contents: shim ? location + insert.replace(/__(?=(filename|dirname))/g, "location.") : insert,
                                                        loader: path.extname(args.path).slice(1),
                                                }
                                        });
                                        build.onEnd((result) => {
                                                if (result.errors.length > 0) {
                                                        console.error(`Build ended with ${result.errors.length} error(s):`);
                                                        result.errors.forEach((error, i) => console.error(`Error ${i + 1}: ${error.text}`));
                                                        return;
                                                }
                                                console.log(development ? "Successfully built (development)" : "Successfully built (production)");
                                        });
                                },
                        },
                ],
        });

        if (development) {
                await ctx.watch();
                console.log("Watching for changes...");
        } else {
                await ctx.rebuild();
                await ctx.dispose();
        }
}

build(watch);
