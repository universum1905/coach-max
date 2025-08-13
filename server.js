// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

// Pfade
const PUBLIC = path.join(__dirname, "public");

// Statische Dateien aus public/ ausliefern
app.use(express.static(PUBLIC));

// Seiten-Routen (alle Dateien liegen in /public)
app.get("/",              (req, res) => res.sendFile(path.join(PUBLIC, "index.html")));
app.get("/choose",        (req, res) => res.sendFile(path.join(PUBLIC, "choose.html")));
app.get("/day/*",         (req, res) => res.sendFile(path.join(PUBLIC, "day.html")));
app.get("/stickerboard",  (req, res) => res.sendFile(path.join(PUBLIC, "stickerboard.html")));
app.get("/puzzleboard",   (req, res) => res.sendFile(path.join(PUBLIC, "puzzleboard.html")));
app.get("/gallery",       (req, res) => res.sendFile(path.join(PUBLIC, "gallery.html")));
app.get("/parents",       (req, res) => res.sendFile(path.join(PUBLIC, "parents.html")));
app.get("/thankyou",      (req, res) => res.sendFile(path.join(PUBLIC, "thankyou.html")));

// 404-Fallback (EN) – liegt in /public
app.get("*", (req, res) => {
  const notFound = path.join(PUBLIC, "404.html");
  res.status(404).sendFile(notFound, (err) => {
    if (err) res.status(404).type("text/plain").send("404 Not Found");
  });
});

// Start
app.listen(PORT, HOST, () => {
  console.log(`Dev server running on http://${HOST}:${PORT}`);
  console.log(`Phone test: http://<your-laptop-ip>:${PORT}`);
});
