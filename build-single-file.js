#!/usr/bin/env node
// Merges index.html + css/*.css + js/**/*.js back into ONE self-contained HTML file (same behaviour as the modular version).
// Usage:  node build-single-file.js [output.html]      (default: flamecadence-single.html)
const fs = require("fs"), path = require("path");
const root = __dirname, out = process.argv[2] || path.join(root, "flamecadence-single.html");
let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const rd = f => fs.readFileSync(path.join(root, f), "utf8");
html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (m, f) => "<style>\n" + rd(f).replace(/\n$/, "") + "\n</style>");
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (m, f) => "<script>\n" + rd(f).replace(/\n$/, "") + "\n</script>");
fs.writeFileSync(out, html);
console.log("written", out, (html.length / 1024).toFixed(0) + " KB");
