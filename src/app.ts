import express from "express";
import { errorHandler, notFound } from "./middleware/errorHandler";
import ticketRouter from "./routes/ticketRoutes.route";

const app = express();
app.use(express.json());

app.use("/api/v1/tickets", ticketRouter);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
