export type UserPlan = "standard" | "premium";
export type ReservationStatus = "active" | "cancelled";

export interface User {
  id: string;
  name: string;
  email: string;
  plan: UserPlan;
}

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  nonRefundable: boolean;
  professionalId: string;
}

export interface Reservation {
  id: string;
  userId: string;
  serviceId: string;
  professionalId: string;
  startDateTime: Date;      // Always stored as UTC Date, interpreted in America/Bogota
  endDateTime: Date;        // startDateTime + durationMinutes
  status: ReservationStatus;
  price: number;            // Snapshot of price when created
  createdAt: Date;
}

export interface CreateReservationInput {
  userId: string;
  serviceId: string;
  startDateTime: string;   // ISO or similar string input from client
}

export interface CancelReservationResult {
  reservation: Reservation;
  refundPercentage: number;
  refundAmount: number;
}
