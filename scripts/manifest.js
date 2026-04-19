import { readFileSync, writeFileSync } from "fs";
import process from "process";

const DEFAULTS = {
        fx_version: "cerulean",
        game: "gta5",
        node_version: "22",
        ui_page: "dist/web/index.html",
        client_scripts: ["dist/client/*.js"],
        server_scripts: ["dist/server/*.js"],
        files: ["dist/web/**/*"],
        dependencies: ["/server:12913", "/onesync"],
};

const dry = process.argv.includes("--dry-run");

function sanitize(s) {
        return s.replace(/['\n\r]/g, (c) => ({ "'": "\\'", "\n": "\\n", "\r": "\\r" })[c] ?? c);
}

function addField(lines, field, value) {
        if (value) lines.push(`${field} '${sanitize(value)}'`);
}

function addTable(lines, title, items) {
        if (!items?.length) return;
        lines.push(`\n${title} {`);
        lines.push(items.map((item) => `\t'${sanitize(item)}'`).join(",\n"));
        lines.push("}");
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));

const lines = [
        `fx_version '${DEFAULTS.fx_version}'`,
        `game '${DEFAULTS.game}'`,
];

addField(lines, "name", pkg.name);
addField(lines, "description", pkg.description);
addField(lines, "author", pkg.author);
addField(lines, "version", pkg.version);
addField(lines, "repository", pkg.repository?.url);
addField(lines, "license", pkg.license);
addField(lines, "node_version", DEFAULTS.node_version);
addField(lines, "ui_page", DEFAULTS.ui_page);

addTable(lines, "client_scripts", DEFAULTS.client_scripts);
addTable(lines, "server_scripts", DEFAULTS.server_scripts);
addTable(lines, "files", DEFAULTS.files);
addTable(lines, "dependencies", DEFAULTS.dependencies);

const manifest = lines.join("\n");

if (dry) {
        console.log(manifest);
} else {
        writeFileSync("fxmanifest.lua", manifest);
        console.log("Successfully generated fxmanifest.lua");
}
