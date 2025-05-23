import express from "express";
import { book, cancel } from "../controllers/ticketController.controller";
import { validate } from "../middleware/validate";
import {
  BookTicketSchema,
  CancelTicketSchema,
} from "../validations/ticket.validation";

const router = express.Router();

router.post("/book", validate(BookTicketSchema), book);
router.post("/cancel/:ticketId", validate(CancelTicketSchema), cancel);

export default router;
