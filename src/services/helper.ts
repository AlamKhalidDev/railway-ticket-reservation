import { BerthType, Passenger, Prisma } from "@prisma/client";
import { BerthAvailability, BerthInventory, PassengerInput } from "../type";

export async function allocateConfirmedBerths(
  prisma: Prisma.TransactionClient,
  passengers: Passenger[]
): Promise<Array<{ berthType: BerthType; berthNumber: string }>> {
  const availability = await getBerthAvailability(prisma);
  const hasChildren = passengers.some((p) => p.age < 5);
  const allocations = [];

  for (const passenger of passengers.filter((p) => p.age >= 5)) {
    let allocated = false;

    if (isEligibleForLower(passenger, hasChildren)) {
      if (availability.LOWER > 0) {
        allocations.push({
          berthType: BerthType.LOWER,
          berthNumber: generateBerthNumber(BerthType.LOWER, availability.LOWER),
        });
        availability.LOWER--;
        allocated = true;
      }
    }

    if (!allocated && availability.MIDDLE > 0) {
      allocations.push({
        berthType: BerthType.MIDDLE,
        berthNumber: generateBerthNumber(BerthType.MIDDLE, availability.MIDDLE),
      });
      availability.MIDDLE--;
      allocated = true;
    }

    if (!allocated && availability.UPPER > 0) {
      allocations.push({
        berthType: BerthType.UPPER,
        berthNumber: generateBerthNumber(BerthType.UPPER, availability.UPPER),
      });
      availability.UPPER--;
      allocated = true;
    }

    if (!allocated && availability.LOWER > 0) {
      allocations.push({
        berthType: BerthType.LOWER,
        berthNumber: generateBerthNumber(BerthType.LOWER, availability.LOWER),
      });
      availability.LOWER--;
      allocated = true;
    }
  }

  return allocations;
}

export async function getBerthAvailability(
  prisma: Prisma.TransactionClient
): Promise<BerthAvailability> {
  const inventories = await prisma.seatInventory.findMany();
  return {
    LOWER: inventories.find((i) => i.type === "LOWER")?.available || 0,
    MIDDLE: inventories.find((i) => i.type === "MIDDLE")?.available || 0,
    UPPER: inventories.find((i) => i.type === "UPPER")?.available || 0,
    RAC: inventories.find((i) => i.type === "RAC")?.available || 0,
    WAITING: inventories.find((i) => i.type === "WAITING")?.available || 0,
  };
}

export async function updateSeatInventory(
  prisma: Prisma.TransactionClient,
  changes: BerthInventory,
  isDecrement = false
) {
  await Promise.all(
    Object.entries(changes).map(([type, count]) => {
      if (count <= 0) return;
      return prisma.seatInventory.updateMany({
        where: { type: type as BerthType },
        data: {
          available: isDecrement ? { decrement: count } : { increment: count },
        },
      });
    })
  );
}

export function isEligibleForLower(
  passenger: PassengerInput,
  hasChildren: boolean
): boolean {
  return passenger.age >= 60 || (passenger.gender === "FEMALE" && hasChildren);
}

export function generateBerthNumber(
  berthType: BerthType,
  sequence: number
): string {
  const prefixMap = {
    [BerthType.LOWER]: "L",
    [BerthType.MIDDLE]: "M",
    [BerthType.UPPER]: "U",
    [BerthType.SIDE_LOWER]: "SL",
  };
  return `${prefixMap[berthType]}${sequence.toString().padStart(3, "0")}`;
}