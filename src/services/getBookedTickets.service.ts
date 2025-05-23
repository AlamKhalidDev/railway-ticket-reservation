import { TicketStatus } from "@prisma/client";
import prisma from "../config/prisma";

export async function getBookedTickets() {
  const tickets = await prisma.ticket.findMany({
    where: {
      status: {
        in: [TicketStatus.CONFIRMED, TicketStatus.RAC, TicketStatus.WAITING],
      },
    },
    include: {
      passengers: {
        include: {
          berthAllocation: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const summary = {
    totalTickets: 0,
    confirmed: 0,
    rac: 0,
    waiting: 0,
    totalPassengers: 0,
    adults: 0,
    children: 0,
    seniors: 0,
    ladiesWithChildrenTickets: 0,
  };

  const ticketDetails = tickets.map((ticket) => {
    const passengers = ticket.passengers.map((passenger) => ({
      name: passenger.name,
      age: passenger.age,
      gender: passenger.gender,
      berth: passenger.berthAllocation
        ? {
            type: passenger.berthAllocation.berthType,
            number: passenger.berthAllocation.berthNumber,
          }
        : null,
    }));

    const adults = ticket.passengers.filter((p) => p.age >= 5).length;
    const children = ticket.passengers.filter((p) => p.age < 5).length;
    const seniors = ticket.passengers.filter((p) => p.age >= 60).length;
    const hasChildren = children > 0;
    const hasLady = ticket.passengers.some(
      (p) => p.gender === "FEMALE" && p.age >= 5
    );

    summary.totalTickets++;
    summary.totalPassengers += ticket.passengers.length;
    summary.adults += adults;
    summary.children += children;
    summary.seniors += seniors;

    switch (ticket.status) {
      case TicketStatus.CONFIRMED:
        summary.confirmed++;
        break;
      case TicketStatus.RAC:
        summary.rac++;
        break;
      case TicketStatus.WAITING:
        summary.waiting++;
        break;
    }

    if (hasChildren && hasLady) {
      summary.ladiesWithChildrenTickets++;
    }

    return {
      ticketId: ticket.id,
      status: ticket.status,
      createdAt: ticket.createdAt,
      passengers: {
        count: ticket.passengers.length,
        details: passengers,
      },
    };
  });

  return {
    tickets: ticketDetails,
    summary: {
      ...summary,
      averagePassengersPerTicket:
        summary.totalPassengers / (summary.totalTickets || 1),
    },
  };
}
