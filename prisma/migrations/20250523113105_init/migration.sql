-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('CONFIRMED', 'RAC', 'WAITING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "BerthType" AS ENUM ('LOWER', 'UPPER', 'MIDDLE', 'SIDE_LOWER');

-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "status" "TicketStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passenger" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" "Gender" NOT NULL,
    "ticketId" INTEGER,

    CONSTRAINT "Passenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BerthAllocation" (
    "id" SERIAL NOT NULL,
    "passengerId" INTEGER NOT NULL,
    "berthType" "BerthType" NOT NULL,
    "berthNumber" TEXT,

    CONSTRAINT "BerthAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatInventory" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "available" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,

    CONSTRAINT "SeatInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BerthAllocation_passengerId_key" ON "BerthAllocation"("passengerId");

-- CreateIndex
CREATE UNIQUE INDEX "SeatInventory_type_key" ON "SeatInventory"("type");

-- AddForeignKey
ALTER TABLE "Passenger" ADD CONSTRAINT "Passenger_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BerthAllocation" ADD CONSTRAINT "BerthAllocation_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "Passenger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
