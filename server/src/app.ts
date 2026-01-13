import express from "express";
import cors from "cors";
import routes from "./routes";
import { loadConfig } from "./config";

loadConfig();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", routes);

app.get("/", (_req, res) => res.send({ ok: true }));

export default app;
