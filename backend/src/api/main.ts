import "dotenv-esm/config";
import express from "express";
import { createServer } from "http";
import path from "path";
import { Server } from "socket.io";
import { getOrCreatePlayerState } from "../lib/MusicPlayer/state.js";
import { decodeJWT } from "../jwt.js";
import { Subcommands } from "../commands/yt.js";
import { authMiddleware } from "./middleware.js";
import { getPlayer } from "../lib/MusicPlayer/MusicPlayer.js";
import { search } from "../lib/MusicPlayer/platforms/youtube.js";
import cors from "cors";
import SongMetadataService from "../lib/MusicPlayer/modules/SongMetadataService.js";

const start = () => {
  const app = express();
  const port = process.env.api_port;
  const publicPath = path.join("../frontend/", "dist");
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*", // Replace with your frontend's URL
      methods: ["GET", "POST"],
    },
  });
  app.use(express.static(publicPath));
  app.use(cors());

  app.use("/api", authMiddleware);

  app.post("/api/v1/playback/:action", async (req, res) => {
    if (!req?.user) return res.status(401).json({ detail: "Not authorized" });

    const action = req.params.action;
    const player = getPlayer(req.user.guildId);

    if (!player)
      return res.status(400).json({ detail: "No player instance found" });

    switch (action) {
      case Subcommands.Pause:
        player.pause();
        break;
      case Subcommands.Unpause:
        player.unpause();
        break;
      case Subcommands.Skip:
        player.skip(req.user.userId);
        break;
      default:
        return res.status(400).json({ detail: "Invalid action" });
    }

    return res.status(200).json({ detail: "OK" });
  });

  app.post("/api/v1/queue/:id", async (req, res) => {
    if (!req?.user) return res.status(401).json({ detail: "Not authorized" });

    const id = req.params.id;
    const player = getPlayer(req.user.guildId);

    if (!player)
      return res.status(400).json({ detail: "No player instance found" });
    await SongMetadataService.getOrCreateMetadata(id);
    player.queueById(id, req.user.userId);
    return res.status(200).json({ detail: "OK" });
  });

  app.delete("/api/v1/queue/:id", (req, res) => {
    if (!req?.user) return res.status(401).json({ detail: "Not authorized" });

    const id = req.params.id;
    const player = getPlayer(req.user.guildId);

    if (!player)
      return res.status(400).json({ detail: "No player instance found" });
    player.removeFromQueue(id);
    return res.status(200).json({ detail: "OK" });
  });

  app.get("/api/v1/search", async (req, res) => {
    const searchTerm = req.query.search as string;
    if (!searchTerm)
      return res.status(400).json({ detail: "No search query param provided" });

    try {
      const results = await search(searchTerm);
      return res.status(200).json(results);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ detail: "Something went wrong" });
    }
  });

  app.get("/api/v1/videos/:id", async (req, res) => {
    const id = req.params.id;

    try {
      const videoDetails = await SongMetadataService.getOrCreateMetadata(id);
      return res.status(200).json(videoDetails);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ detail: "Something went wrong" });
    }
  });

  app.get("/api/v1/videos/:id/played-by", async (req, res) => {
    if (!req?.user) return res.status(401).json({ detail: "Not authorized" });

    const id = req.params.id;
    const player = getPlayer(req.user.guildId);

    if (!player)
      return res.status(400).json({ detail: "No player instance found" });
    const user = await player.getUsersWhoPlayed(id);
    return res.status(200).json(user);
  });

  app.get("/api/v1/users/:id", async (req, res) => {
    if (!req?.user) return res.status(401).json({ detail: "Not authorized" });

    const id = req.params.id;
    const player = getPlayer(req.user.guildId);

    if (!player)
      return res.status(400).json({ detail: "No player instance found" });
    const user = await player.getUserDetails(id);
    return res.status(200).json(user);
  });

  app.get("*", (req, res) => {
    // Ensure it's not an API request
    if (!req.url.startsWith("/api/v1")) {
      res.sendFile("index.html", { root: publicPath });
    } else {
      // Handle 404 for API routes or let your API router handle it
      res.status(404).send("API route not found");
    }
  });

  server.listen(port, () => {
    console.log(`API running on port ${port}`);
  });

  io.on("connection", async (socket) => {
    let off: any;

    const token = socket.handshake.query?.token;
    if (!token) return;
    try {
      const { guildId, userId } = await decodeJWT(token as string);
      const state = getOrCreatePlayerState(guildId);
      socket.join(guildId);
      console.log(`${userId} connected`);
      io.to(guildId).emit("player-data", state.state);

      off = state.onChange((state) => {
        io.to(guildId).emit("player-data", state);
      });
    } catch (e) {
      console.error(e);
    }

    socket.on("disconnect", () => {
      off && off();
      console.log("User disconnected");
    });
  });
};

export { start };
