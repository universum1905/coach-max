import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

// Statische Dateien ausliefern
app.use(express.static(__dirname));

// Rewrites wie in firebase.json
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/choose", (req, res) => res.sendFile(path.join(__dirname, "choose.html")));
app.get("/day/*", (req, res) => res.sendFile(path.join(__dirname, "day.html")));
app.get("/stickerboard", (req, res) => res.sendFile(path.join(__dirname, "stickerboard.html")));
app.get("/puzzleboard", (req, res) => res.sendFile(path.join(__dirname, "puzzleboard.html")));
app.get("/gallery", (req, res) => res.sendFile(path.join(__dirname, "gallery.html")));
app.get("/parents", (req, res) => res.sendFile(path.join(__dirname, "parents.html")));
app.get("/thankyou", (req, res) => res.sendFile(path.join(__dirname, "thankyou.html")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "404.html")));

app.listen(PORT, () => console.log(`Dev server running on http://localhost:${PORT}`));