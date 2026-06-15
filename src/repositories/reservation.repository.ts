import { Reservation } from "../domain/entities";
import { IReservationRepository } from "./interfaces";

export class ReservationRepository implements IReservationRepository {
  private reservations = new Map<string, Reservation>();

  create(reservation: Reservation): Reservation {
    this.reservations.set(reservation.id, reservation);
    return reservation;
  }

  findById(id: string): Reservation | undefined {
    return this.reservations.get(id);
  }

  findByUser(userId: string, from?: Date, to?: Date): Reservation[] {
    let list = Array.from(this.reservations.values()).filter((r) => r.userId === userId);

    if (from) {
      const fromTime = from.getTime();
      list = list.filter((r) => r.startDateTime.getTime() >= fromTime);
    }

    if (to) {
      const toTime = to.getTime();
      list = list.filter((r) => r.startDateTime.getTime() <= toTime);
    }

    // Sort by startDateTime ascending
    return list.sort((a, b) => a.startDateTime.getTime() - b.startDateTime.getTime());
  }

  findByProfessional(professionalId: string, excludeStatus?: "cancelled"): Reservation[] {
    let list = Array.from(this.reservations.values()).filter((r) => r.professionalId === professionalId);

    if (excludeStatus) {
      list = list.filter((r) => r.status !== excludeStatus);
    }

    return list;
  }

  update(reservation: Reservation): Reservation {
    this.reservations.set(reservation.id, reservation);
    return reservation;
  }

  findAll(): Reservation[] {
    return Array.from(this.reservations.values());
  }
}
