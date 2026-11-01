import express, {
  type Express,
  type Request,
  type Response,
  type ErrorRequestHandler,
} from "express";
import {AppError} from "./errors/AppError.ts";
const app: Express = express();

app.use(express.json());









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