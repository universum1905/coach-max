// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const PUBLIC = path.join(__dirname, "public");

// Statische Dateien aus /public bedienen; /choose -> choose.html etc. dank extensions
app.use(express.static(PUBLIC, { extensions: ["html"], maxAge: 0 }));

// Spezieller Rewrite für /day/* -> day.html
app.get("/day/*", (_req, res) => {
  res.sendFile(path.join(PUBLIC, "day.html"));
});

// 404-Fallback (liefert /public/404.html, falls vorhanden)
app.use((req, res) => {
  const notFound = path.join(PUBLIC, "404.html");
  res.status(404).sendFile(notFound, (err) => {
    if (err) res.status(404).send("404 Not Found");
  });
});

// Auf allen Interfaces lauschen -> Handy im WLAN kann zugreifen
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Dev server running on http://localhost:${PORT}`);
});
