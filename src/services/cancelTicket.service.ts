import { BerthType, TicketStatus } from "@prisma/client";
import prisma from "../config/prisma";
import {
  allocateConfirmedBerths,
  generateBerthNumber,
  updateSeatInventory,
} from "./helper";

export async function cancelTicket(ticketId: number) {
  return await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id: ticketId },
      include: {
        passengers: {
          include: { berthAllocation: true },
        },
      },
    });

    if (!ticket || ticket.status !== TicketStatus.CONFIRMED) {
      throw new Error("Invalid or non-confirmed ticket");
    }

    const berthReleases: Record<BerthType, number> = {
      LOWER: 0,
      MIDDLE: 0,
      UPPER: 0,
      SIDE_LOWER: 0,
    };

    ticket.passengers.forEach((passenger) => {
      if (passenger.berthAllocation?.berthType) {
        const type = passenger.berthAllocation.berthType;
        berthReleases[type]++;
      }
    });

    await updateSeatInventory(tx, berthReleases);

    await tx.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.CANCELLED },
    });

    const racTickets = await tx.ticket.findMany({
      where: { status: TicketStatus.RAC },
      orderBy: { createdAt: "asc" },
      include: {
        passengers: {
          include: { berthAllocation: true },
        },
      },
    });

    let freedConfirmed = Object.values(berthReleases).reduce(
      (a, b) => a + b,
      0
    );

    for (const racTicket of racTickets) {
      if (freedConfirmed <= 0) break;

      const adults = racTicket.passengers.filter((p) => p.age >= 5).length;
      if (adults > freedConfirmed) continue;

      const allocations = await allocateConfirmedBerths(
        tx,
        racTicket.passengers
      );

      if (allocations.length !== adults) {
        continue;
      }

      const newTicket = await tx.ticket.update({
        where: { id: racTicket.id },
        data: { status: TicketStatus.CONFIRMED },
      });

      for (const [index, passenger] of racTicket.passengers.entries()) {
        if (passenger.age >= 5) {
          await tx.berthAllocation.update({
            where: { passengerId: passenger.id },
            data: allocations[index],
          });
        }
      }

      await updateSeatInventory(tx, { RAC: adults });
      await updateSeatInventory(
        tx,
        {
          ...allocations.reduce((acc, { berthType }) => {
            acc[berthType] = (acc[berthType] || 0) + 1;
            return acc;
          }, {} as Record<BerthType, number>),
        },
        true
      );

      freedConfirmed -= adults;
    }

    const racFreed = await tx.seatInventory.findUnique({
      where: { type: "RAC" },
    });

    const waitingTickets = await tx.ticket.findMany({
      where: { status: TicketStatus.WAITING },
      orderBy: { createdAt: "asc" },
      include: { passengers: true },
    });

    for (const waitingTicket of waitingTickets) {
      if ((racFreed?.available || 0) <= 0) break;

      const adults = waitingTicket.passengers.filter((p) => p.age >= 5).length;

      if (adults > (racFreed?.available || 0)) continue;

      await Promise.all(
        waitingTicket.passengers
          .filter((p) => p.age >= 5)
          .map((passenger, index) =>
            tx.berthAllocation.upsert({
              where: { passengerId: passenger.id },
              create: {
                berthType: BerthType.SIDE_LOWER,
                berthNumber: generateBerthNumber(
                  BerthType.SIDE_LOWER,
                  index + 1
                ),
                passengerId: passenger.id,
              },
              update: {
                berthType: BerthType.SIDE_LOWER,
                berthNumber: generateBerthNumber(
                  BerthType.SIDE_LOWER,
                  index + 1
                ),
              },
            })
          )
      );

      await tx.ticket.update({
        where: { id: waitingTicket.id },
        data: { status: TicketStatus.RAC },
      });

      await tx.seatInventory.update({
        where: { type: "RAC" },
        data: { available: { decrement: adults } },
      });

      await tx.seatInventory.update({
        where: { type: "WAITING" },
        data: { available: { increment: adults } },
      });

      racFreed!.available! -= adults;
    }

    return { success: true };
  });
}
