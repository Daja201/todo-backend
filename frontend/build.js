// Placeholder build step.
// Replace this whole frontend/ folder with your real SPA project
// (Vite/CRA/Vue/etc.) that has its own `npm run build` producing ./dist.
const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "dist");
const assetsDir = path.join(distDir, "assets");

fs.mkdirSync(assetsDir, { recursive: true });

fs.writeFileSync(
  path.join(distDir, "index.html"),
  `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>App</title>
</head>
<body>
  <div id="root">Placeholder build — replace frontend/ with your real SPA project.</div>
</body>
</html>
`
);

console.log("Placeholder frontend built to ./dist");
