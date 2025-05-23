import {
  bookTicket,
  cancelTicket,
  getAvailability,
  getBookedTickets,
} from "../services";
import { handleRequest } from "../utils/helper";

export const book = handleRequest(async (req, res) => {
  const ticket = await bookTicket(req.body.passengers);
  res.status(201).json(ticket);
});

export const cancel = handleRequest(async (req, res) => {
  const ticket = await cancelTicket(parseInt(req.params.ticketId));
  res.json(ticket);
});

export const booked = handleRequest(async (_req, res) => {
  const tickets = await getBookedTickets();
  res.json(tickets);
});

export const available = handleRequest(async (_req, res) => {
  const availability = await getAvailability();
  res.json(availability);
});
