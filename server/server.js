import express from "express";
import morgan from "morgan";
import cors from "cors";
import mongoose from "mongoose";
import { DATABASE } from "./config.js";
import authRoutes from "./routes/auth.js";

const app = express();

//
mongoose
  .connect(DATABASE)
  .then(() => console.log("db_connected"))
  .catch((err) => console.log(err));

//middlewares
app.use(express.json());
app.use(morgan("dev"));
app.use(cors());

//routes middleware
app.get("/", (req, res) => {
  res.json({
    data: "Homepage",
  });
});
app.use("/", authRoutes);

app.listen(8000, () => console.log("server running on port 8000"));
