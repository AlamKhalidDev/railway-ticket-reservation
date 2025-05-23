import { Request, Response } from "express";
import { bookTicket } from "../services/bookTicket.service";
import { cancelTicket } from "../services/cancelTicket.service";

export const book = async (req: Request, res: Response) => {
  try {
    const ticket = await bookTicket(req.body.passengers);
    res.status(201).json(ticket);
  } catch (error) {
    res.status(400).json({
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
};

export const cancel = async (req: Request, res: Response) => {
  try {
    const ticket = await cancelTicket(parseInt(req.params.ticketId));
    res.json(ticket);
  } catch (error) {
    res.status(400).json({
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
};
