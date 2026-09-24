// Lightweight project checks used by CI (no dependencies needed).
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const errors = [];
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

["index.html", "css/style.css", "js/app.js", "README.md", ".gitignore"].forEach((f) => {
  if (!fs.existsSync(path.join(root, f))) { errors.push("Missing required file: " + f); }
});

if (!errors.length) {
  try {
    execFileSync(process.execPath, ["--check", path.join(root, "js/app.js")], { stdio: "pipe" });
  } catch (err) {
    errors.push("JavaScript syntax error in js/app.js:\n" + err.stderr);
  }

  const html = read("index.html");
  const js = read("js/app.js");
  if (!/<link[^>]+href="css\/style\.css"/.test(html)) { errors.push("index.html must link css/style.css"); }
  if (!/<script[^>]+src="js\/app\.js"/.test(html)) { errors.push("index.html must load js/app.js"); }
  if (/\son(click|submit|change|input)\s*=/i.test(html)) { errors.push("Inline JavaScript handlers are not allowed"); }

  const ids = [...js.matchAll(/getElementById\("([^"]+)"\)/g)].map((m) => m[1]);
  ids.forEach((id) => {
    if (!html.includes('id="' + id + '"')) { errors.push('js/app.js uses id "' + id + '" which is missing in index.html'); }
  });

  ["studentName", "studentId", "email", "course", "semester", "comments", "anonymous"].forEach((n) => {
    if (!html.includes('name="' + n + '"')) { errors.push('Form control name="' + n + '" not found in index.html'); }
  });
}

if (errors.length) {
  console.error("Validation failed:\n- " + errors.join("\n- "));
  process.exit(1);
}
console.log("All checks passed.");
