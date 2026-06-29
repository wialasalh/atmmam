import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      files.push(...walk(p));
    } else if (entry.isFile() && /\.(tsx?)$/.test(entry.name)) {
      files.push(p);
    }
  }
  return files;
}

const dirs = ["app", "components", "lib"].filter(d => { try { return statSync(d).isDirectory(); } catch { return false; } });
const files = dirs.flatMap(d => walk(d));

function fixCalendar(str) {
  // Fix toLocaleDateString only (always date-related)
  str = str.replace(
    /(\.toLocaleDateString\("ar-SA")(\))/g,
    '$1, {calendar:"gregory"}$2'
  );
  str = str.replace(
    /\.toLocaleDateString\("ar-SA",\s*\{/g,
    '.toLocaleDateString("ar-SA", {calendar:"gregory", '
  );
  return str;
}

let count = 0;
for (const file of files) {
  const original = readFileSync(file, "utf8");
  const fixed = fixCalendar(original);
  if (fixed !== original) {
    writeFileSync(file, fixed, "utf8");
    console.log("Fixed:", file);
    count++;
  }
}

console.log(`Done! ${count} files modified.`);
