import express from "express";
import cors from "cors";
import morgan from "morgan";
import identifyRoute from "./routes/identify.route";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/identify", identifyRoute);

export default app;