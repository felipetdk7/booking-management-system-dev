import { User, Service, Reservation } from "../domain/entities";

export interface IUserRepository {
  findById(id: string): User | undefined;
  save(user: User): User;
  findAll(): User[];
}

export interface IServiceRepository {
  findById(id: string): Service | undefined;
  save(service: Service): Service;
  findAll(): Service[];
}

export interface IReservationRepository {
  create(reservation: Reservation): Reservation;
  findById(id: string): Reservation | undefined;
  findByUser(userId: string, from?: Date, to?: Date): Reservation[];
  findByProfessional(professionalId: string, excludeStatus?: "cancelled"): Reservation[];
  update(reservation: Reservation): Reservation;
  findAll(): Reservation[];
}
