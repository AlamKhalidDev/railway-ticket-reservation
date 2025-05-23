export interface PassengerInput {
  name: string;
  age: number;
  gender: "MALE" | "FEMALE" | "OTHER";
}

export interface BerthInventory {
  LOWER?: number;
  MIDDLE?: number;
  UPPER?: number;
  RAC?: number;
  WAITING?: number;
}

export interface BerthAvailability {
  LOWER: number;
  MIDDLE: number;
  UPPER: number;
  RAC: number;
  WAITING: number;
}
