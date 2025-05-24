import request from "supertest";
import express from "express";
import ticketRouter from "../src/routes/ticketRoutes.route";
import { errorHandler, notFound } from "../src/middleware/errorHandler";
import prisma from "../src/config/prisma";

const app = express();
app.use(express.json());
app.use("/api/v1/tickets", ticketRouter);
app.use(notFound);
app.use(errorHandler);

describe("Railway Ticket Reservation API", () => {
  beforeEach(async () => {
    await prisma.berthAllocation.deleteMany({});
    await prisma.passenger.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.seatInventory.deleteMany({});
    await prisma.seatInventory.createMany({
      data: [
        { type: "LOWER", available: 21, capacity: 21 },
        { type: "MIDDLE", available: 21, capacity: 21 },
        { type: "UPPER", available: 21, capacity: 21 },
        { type: "RAC", available: 18, capacity: 18 },
        { type: "WAITING", available: 10, capacity: 10 },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /api/v1/tickets/book", () => {
    it("should book a single ticket successfully", async () => {
      const response = await request(app)
        .post("/api/v1/tickets/book")
        .send({
          passengers: [{ name: "John Doe", age: 30, gender: "MALE" }],
        });
      expect(response.status).toBe(201);
      expect(response.body.status).toBe("CONFIRMED");
      expect(response.body.passengers.length).toBe(1);
    });

    it("should give lower berth to senior citizen", async () => {
      const response = await request(app)
        .post("/api/v1/tickets/book")
        .send({
          passengers: [{ name: "Senior Citizen", age: 65, gender: "MALE" }],
        });
      expect(response.status).toBe(201);
      expect(response.body.status).toBe("CONFIRMED");
      expect(response.body.passengers[0].berthAllocation.berthType).toBe(
        "LOWER"
      );
    });

    it("should give lower berth to a lady with a child", async () => {
      const response = await request(app)
        .post("/api/v1/tickets/book")
        .send({
          passengers: [
            { name: "Lady", age: 30, gender: "FEMALE" },
            { name: "Child", age: 4, gender: "MALE" },
          ],
        });
      expect(response.status).toBe(201);
      expect(response.body.status).toBe("CONFIRMED");
      const lady = response.body.passengers.find((p: any) => p.name === "Lady");
      expect(lady.berthAllocation.berthType).toBe("LOWER");
    });

    it("should book an RAC ticket when confirmed berths are full", async () => {
      for (let i = 0; i < 63; i++) {
        await request(app)
          .post("/api/v1/tickets/book")
          .send({
            passengers: [{ name: `Passenger${i}`, age: 30, gender: "MALE" }],
          });
      }
      const response = await request(app)
        .post("/api/v1/tickets/book")
        .send({
          passengers: [{ name: "RAC Passenger", age: 30, gender: "MALE" }],
        });
      expect(response.status).toBe(201);
      expect(response.body.status).toBe("RAC");
    });

    it("should book a Waiting List ticket when RAC is full", async () => {
      for (let i = 0; i < 63 + 18; i++) {
        await request(app)
          .post("/api/v1/tickets/book")
          .send({
            passengers: [{ name: `Passenger${i}`, age: 30, gender: "MALE" }],
          });
      }
      const response = await request(app)
        .post("/api/v1/tickets/book")
        .send({
          passengers: [{ name: "Waiting Passenger", age: 30, gender: "MALE" }],
        });
      expect(response.status).toBe(201);
      expect(response.body.status).toBe("WAITING");
    });

    it("should fail to book when waiting list is full", async () => {
      for (let i = 0; i < 63 + 18 + 10; i++) {
        await request(app)
          .post("/api/v1/tickets/book")
          .send({
            passengers: [{ name: `Passenger${i}`, age: 30, gender: "MALE" }],
          });
      }
      const response = await request(app)
        .post("/api/v1/tickets/book")
        .send({
          passengers: [{ name: "Extra Passenger", age: 30, gender: "MALE" }],
        });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe("No tickets available");
    });
  });

  describe("POST /api/v1/tickets/cancel/:ticketId", () => {
    it("should cancel a ticket and promote RAC to Confirmed", async () => {
      const confirmedTicket = await request(app)
        .post("/api/v1/tickets/book")
        .send({
          passengers: [{ name: "Confirmed", age: 30, gender: "MALE" }],
        });

      for (let i = 0; i < 62; i++) {
        await request(app)
          .post("/api/v1/tickets/book")
          .send({
            passengers: [{ name: `Filler${i}`, age: 30, gender: "MALE" }],
          });
      }

      const racTicket = await request(app)
        .post("/api/v1/tickets/book")
        .send({
          passengers: [
            { name: "RAC to be Confirmed", age: 30, gender: "MALE" },
          ],
        });
      expect(racTicket.body.status).toBe("RAC");

      const cancelResponse = await request(app).post(
        `/api/v1/tickets/cancel/${confirmedTicket.body.id}`
      );
      expect(cancelResponse.status).toBe(200);

      const bookedTickets = await request(app).get("/api/v1/tickets/booked");
      const promotedTicket = bookedTickets.body.tickets.find(
        (t: any) => t.ticketId === racTicket.body.id
      );
      expect(promotedTicket.status).toBe("CONFIRMED");
    });

    it("should fail to cancel a non-existent ticket", async () => {
      const response = await request(app).post("/api/v1/tickets/cancel/9999");
      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid or non-confirmed ticket");
    });
  });

  describe("GET /api/v1/tickets/available", () => {
    it("should return the initial availability of tickets", async () => {
      const response = await request(app).get("/api/v1/tickets/available");
      expect(response.status).toBe(200);
      expect(response.body.summary.confirmed).toBe(63);
      expect(response.body.summary.rac).toBe(18);
      expect(response.body.summary.waiting).toBe(10);
    });
  });

  describe("GET /api/v1/tickets/booked", () => {
    it("should return a list of booked tickets", async () => {
      await request(app)
        .post("/api/v1/tickets/book")
        .send({
          passengers: [{ name: "Booked User", age: 40, gender: "FEMALE" }],
        });
      const response = await request(app).get("/api/v1/tickets/booked");
      expect(response.status).toBe(200);
      expect(response.body.tickets.length).toBe(1);
      expect(response.body.summary.totalTickets).toBe(1);
    });
  });

  describe("Concurrency Handling", () => {
    it("should handle concurrent requests to book the last ticket without race conditions", async () => {
      for (let i = 0; i < 90; i++) {
        await request(app)
          .post("/api/v1/tickets/book")
          .send({
            passengers: [{ name: `Filler${i}`, age: 30, gender: "MALE" }],
          });
      }

      const requests = [
        request(app)
          .post("/api/v1/tickets/book")
          .send({
            passengers: [{ name: "Concurrent 1", age: 30, gender: "MALE" }],
          }),
        request(app)
          .post("/api/v1/tickets/book")
          .send({
            passengers: [{ name: "Concurrent 2", age: 30, gender: "MALE" }],
          }),
      ];

      const responses = await Promise.all(requests);
      const successfulResponses = responses.filter((res) => res.status === 201);
      const failedResponses = responses.filter((res) => res.status !== 201);

      expect(successfulResponses.length).toBe(1);
      expect(failedResponses.length).toBe(1);
    });
  });
});
