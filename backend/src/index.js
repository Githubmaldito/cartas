import "dotenv/config";
import cors from 'cors';
import express from 'express';
import authRoutes from "./routes/authRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { connectDB } from "./lib/db.js";
import job from './lib/cron.js';

const app = express();
const PORT = process.env.PORT || 3000;

job.start();

app.use(cors());
app.use(express.json({ limit: "10mb" })); // aumentei o limite para aceitar imagens em base64

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

app.listen(PORT, () => {
    console.log(`Rodando na porta ${PORT}`);
    connectDB();
});