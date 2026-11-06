import express, {
  type Express,
  type Request,
  type Response,
  type ErrorRequestHandler,
  type NextFunction
} from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRoute from "./routes/auth.route.ts";
import { corsConfig } from "./config/security.ts";
import {AppError} from "./errors/AppError.ts";
import playerRouter from "./routes/player.route.ts";
import scoutRouter from "./routes/scout.route.ts";
import { requestLogger } from "./middlewares/logger.middleware.ts";
import scoutplayerRouter from "./routes/scout-player.route.ts";

const app: Express = express();





app.use(helmet())
app.use(corsConfig);
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);


app.use("/api/users", authRoute);
app.use("/api/players", playerRouter);
app.use("/api/scouts", scoutRouter);
app.use("/api/scout-players", scoutplayerRouter);





app.use((req: Request, res: Response) => {
  res.status(404).json({
    message: "Route Not Found",
    requestedURL: req.originalUrl,
  });
});
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof SyntaxError && "status" in err && err.status === 400) {
    res.status(400).json({
      message: "Invalid JSON in request body",
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    message: "Internal server error",
  });
};

app.use(errorHandler);


export default app;
