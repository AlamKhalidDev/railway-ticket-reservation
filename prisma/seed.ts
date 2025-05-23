import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  await prisma.seatInventory.createMany({
    data: [
      {
        type: "LOWER",
        available: 21,
        capacity: 21,
      },
      {
        type: "MIDDLE",
        available: 21,
        capacity: 21,
      },
      {
        type: "UPPER",
        available: 21,
        capacity: 21,
      },
      {
        type: "RAC",
        available: 18,
        capacity: 18,
      },
      {
        type: "WAITING",
        available: 10,
        capacity: 10,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Database seeded successfully");
}

main()
  .catch((e) => {
    console.error("🚨 Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
