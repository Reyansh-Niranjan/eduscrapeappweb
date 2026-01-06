import fs from "node:fs";
import path from "node:path";

function ensureFile(filePath, contents) {
  if (fs.existsSync(filePath)) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
  return true;
}

const root = process.cwd();

const fixes = [
  {
    name: "preact dist/preact.mjs",
    file: path.join(root, "node_modules", "preact", "dist", "preact.mjs"),
    contents: "export * from './preact.module.js';\n",
  },
  {
    name: "preact jsx-runtime/dist/jsxRuntime.mjs",
    file: path.join(root, "node_modules", "preact", "jsx-runtime", "dist", "jsxRuntime.mjs"),
    contents: "export * from './jsxRuntime.module.js';\n",
  },
];

let changed = 0;
for (const fix of fixes) {
  try {
    if (ensureFile(fix.file, fix.contents)) {
      changed++;
      // eslint-disable-next-line no-console
      console.log(`[postinstall] created ${fix.name}`);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`[postinstall] failed to create ${fix.name}:`, e);
  }
}

if (changed === 0) {
  // eslint-disable-next-line no-console
  console.log("[postinstall] no missing ESM entry files detected");
}
