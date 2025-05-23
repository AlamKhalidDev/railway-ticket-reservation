import prisma from "../config/prisma";

export async function getAvailability() {
  const inventories = await prisma.seatInventory.findMany({
    orderBy: { type: "asc" },
  });

  const details = inventories.reduce(
    (acc, inventory) => ({
      ...acc,
      [inventory.type.toLowerCase()]: {
        available: inventory.available,
        capacity: inventory.capacity,
      },
    }),
    {} as Record<string, { available: number; capacity: number }>
  );

  const summary = {
    confirmed: inventories
      .filter((i) => ["LOWER", "MIDDLE", "UPPER"].includes(i.type))
      .reduce((sum, i) => sum + i.available, 0),
    rac: inventories.find((i) => i.type === "RAC")?.available || 0,
    waiting: inventories.find((i) => i.type === "WAITING")?.available || 0,
    totalAvailable: inventories.reduce((sum, i) => sum + i.available, 0),
  };

  return {
    availabilityDetails: {
      lower: details.lower,
      middle: details.middle,
      upper: details.upper,
      rac: details.rac,
      waiting: details.waiting,
    },
    summary,
  };
}
