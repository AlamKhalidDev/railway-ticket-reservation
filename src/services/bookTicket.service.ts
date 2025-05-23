import { Prisma, BerthType, TicketStatus } from "@prisma/client";
import { PassengerInput } from "../type";
import prisma from "../config/prisma";
import {
  generateBerthNumber,
  getBerthAvailability,
  isEligibleForLower,
} from "./helper";

export async function bookTicket(passengers: PassengerInput[]) {
  const adults = passengers.filter((p) => p.age >= 5);
  const children = passengers.filter((p) => p.age < 5);
  const numAdults = adults.length;
  const hasChildrenInTicket = children.length > 0;

  return await prisma.$transaction(async (tx) => {
    const availability = await getBerthAvailability(tx);

    let lowerAllocated = 0;
    let middleAllocated = 0;
    let upperAllocated = 0;
    let racAllocated = 0;
    let waitingAllocated = 0;

    const allocations: { passenger: PassengerInput; berthType: BerthType }[] =
      [];

    if (
      availability.LOWER + availability.MIDDLE + availability.UPPER >=
      numAdults
    ) {
      let lowerCount = availability.LOWER;
      let middleCount = availability.MIDDLE;
      let upperCount = availability.UPPER;

      for (const passenger of adults) {
        if (
          isEligibleForLower(passenger, hasChildrenInTicket) &&
          lowerCount > 0
        ) {
          allocations.push({ passenger, berthType: BerthType.LOWER });
          lowerCount--;
          lowerAllocated++;
        } else if (middleCount > 0) {
          allocations.push({ passenger, berthType: BerthType.MIDDLE });
          middleCount--;
          middleAllocated++;
        } else if (upperCount > 0) {
          allocations.push({ passenger, berthType: BerthType.UPPER });
          upperCount--;
          upperAllocated++;
        } else if (lowerCount > 0) {
          allocations.push({ passenger, berthType: BerthType.LOWER });
          lowerCount--;
          lowerAllocated++;
        } else {
          throw new Error("Failed to allocate confirmed berths");
        }
      }
      await tx.seatInventory.update({
        where: { type: "LOWER" },
        data: { available: availability.LOWER - lowerAllocated },
      });

      await tx.seatInventory.update({
        where: { type: "MIDDLE" },
        data: { available: availability.MIDDLE - middleAllocated },
      });

      await tx.seatInventory.update({
        where: { type: "UPPER" },
        data: { available: availability.UPPER - upperAllocated },
      });
    } else if (availability.RAC >= numAdults) {
      racAllocated = numAdults;
      await tx.seatInventory.update({
        where: { type: "RAC" },
        data: { available: availability.RAC - racAllocated },
      });
    } else if (availability.WAITING >= numAdults) {
      waitingAllocated = numAdults;
      await tx.seatInventory.update({
        where: { type: "WAITING" },
        data: { available: availability.WAITING - waitingAllocated },
      });
    } else {
      throw new Error("No tickets available");
    }

    const ticketStatus =
      waitingAllocated > 0
        ? TicketStatus.WAITING
        : racAllocated > 0
        ? TicketStatus.RAC
        : TicketStatus.CONFIRMED;

    const berthSequence = {
      LOWER: availability.LOWER - lowerAllocated + 1,
      MIDDLE: availability.MIDDLE - middleAllocated + 1,
      UPPER: availability.UPPER - upperAllocated + 1,
      SIDE_LOWER: availability.RAC - racAllocated + 1,
    };

    return tx.ticket.create({
      data: {
        status: ticketStatus,
        passengers: {
          create: [
            ...adults.map((adult, index) => ({
              name: adult.name,
              age: adult.age,
              gender: adult.gender,
              berthAllocation:
                ticketStatus === TicketStatus.CONFIRMED
                  ? {
                      create: {
                        berthType: allocations[index].berthType,
                        berthNumber: generateBerthNumber(
                          allocations[index].berthType,
                          berthSequence.LOWER + index
                        ),
                      },
                    }
                  : ticketStatus === TicketStatus.RAC
                  ? {
                      create: {
                        berthType: BerthType.SIDE_LOWER,
                        berthNumber: generateBerthNumber(
                          BerthType.SIDE_LOWER,
                          berthSequence.SIDE_LOWER + index
                        ),
                      },
                    }
                  : undefined,
            })),
            ...children.map((child) => ({
              name: child.name,
              age: child.age,
              gender: child.gender,
            })),
          ],
        },
      },
      include: {
        passengers: {
          include: { berthAllocation: true },
        },
      },
    });
  });
}
