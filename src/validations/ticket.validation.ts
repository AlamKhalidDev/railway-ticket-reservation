import { z } from 'zod';

const GenderEnum = z.enum(['MALE', 'FEMALE', 'OTHER']);

export const PassengerSchema = z.object({
  name: z.string().min(1, "Passenger name is required"),
  age: z.number().int().nonnegative({
    message: "Age must be a non-negative integer"
  }),
  gender: GenderEnum
});

export const BookTicketSchema = z.object({
  body: z.object({
    passengers: z.array(PassengerSchema)
      .min(1, "At least one passenger is required")
      .refine(
        passengers => passengers.some(p => p.age >= 5),
        "At least one adult passenger (age 5+) is required for berth allocation"
      )
  }).strict()
});

export const CancelTicketSchema = z.object({
  params: z.object({
    ticketId: z.string().regex(/^\d+$/, "Ticket ID must be a numeric value")
      .transform(Number)
      .refine(id => id > 0, "Ticket ID must be a positive number")
  }).strict()
});

export const PaginationSchema = z.object({
  query: z.object({
    page: z.string().optional()
      .transform(Number)
      .refine(n => n === undefined || n > 0, "Page must be a positive number"),
    limit: z.string().optional()
      .transform(Number)
      .refine(n => n === undefined || n > 0, "Limit must be a positive number")
  }).strict()
});

export type BookTicketInput = z.infer<typeof BookTicketSchema>;
export type CancelTicketInput = z.infer<typeof CancelTicketSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;