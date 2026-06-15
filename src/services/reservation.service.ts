import { CreateReservationInput, CancelReservationResult, Reservation, User, Service } from "../domain/entities";
import { IUserRepository, IServiceRepository, IReservationRepository } from "../repositories/interfaces";
import { BookingRulesValidator, BookingRuleError } from "../domain/booking-rules";
import { RefundCalculator } from "../domain/refund-calculator";
import { DateTimeService } from "../domain/datetime-service";
import { ValidationError, NotFoundError, ConflictError } from "../domain/errors";

export class ReservationService {
  constructor(
    private userRepo: IUserRepository,
    private serviceRepo: IServiceRepository,
    private reservationRepo: IReservationRepository,
    private getNow: () => Date = () => new Date()
  ) {}

  /**
   * Creates a new reservation for a user.
   */
  createReservation(input: CreateReservationInput): Reservation {
    const now = this.getNow();

    // 1. Validate user existence
    const user = this.userRepo.findById(input.userId);
    if (!user) {
      throw new NotFoundError(`Usuario con ID '${input.userId}' no fue encontrado.`);
    }

    // 2. Validate service existence
    const service = this.serviceRepo.findById(input.serviceId);
    if (!service) {
      throw new NotFoundError(`Servicio con ID '${input.serviceId}' no fue encontrado.`);
    }

    // 3. Parse and normalize requested date
    let startDateTime: Date;
    try {
      startDateTime = DateTimeService.parseToBogotaUTC(input.startDateTime);
    } catch (err) {
      throw new ValidationError(`Formato de fecha inválido. Ingrese una fecha válida.`);
    }

    // 4. Validate all business rules
    const existingReservations = this.reservationRepo.findAll();
    const validationErrors = BookingRulesValidator.validate({
      user,
      service,
      startDateTime,
      existingReservations,
      now,
    });

    if (validationErrors.length > 0) {
      throw new ValidationError(
        "No se pudo crear la reserva debido a conflictos con las reglas de negocio.",
        validationErrors
      );
    }

    // Calculate end date
    const endDateTime = new Date(startDateTime.getTime() + service.durationMinutes * 60000);

    // 5. Create reservation
    const newReservation: Reservation = {
      id: `res-${Math.random().toString(36).substring(2, 11)}`,
      userId: user.id,
      serviceId: service.id,
      professionalId: service.professionalId,
      startDateTime,
      endDateTime,
      status: "active",
      price: service.price,
      createdAt: now,
    };

    return this.reservationRepo.create(newReservation);
  }

  /**
   * Cancels an existing reservation.
   */
  cancelReservation(reservationId: string): CancelReservationResult {
    const now = this.getNow();

    // 1. Find the reservation
    const reservation = this.reservationRepo.findById(reservationId);
    if (!reservation) {
      throw new NotFoundError(`Reserva con ID '${reservationId}' no fue encontrada.`);
    }

    // 2. Check if already cancelled
    if (reservation.status === "cancelled") {
      throw new ConflictError("La reserva ya se encuentra cancelada.");
    }

    // 3. Check if the reservation is in the past
    // "No se pueden cancelar reservas pasadas"
    if (reservation.startDateTime < now) {
      throw new ValidationError("No se pueden cancelar reservas que pertenecen al pasado.");
    }

    // 4. Find user and service for refund calculation
    const user = this.userRepo.findById(reservation.userId);
    const service = this.serviceRepo.findById(reservation.serviceId);

    if (!user || !service) {
      throw new NotFoundError(
        "No se pudo calcular el reembolso: el usuario o el servicio asociado ya no existe."
      );
    }

    // 5. Calculate refund based on time remaining to the appointment
    const hoursUntilAppointment = DateTimeService.getHoursDifference(now, reservation.startDateTime);
    
    // We pass the reservation price snapshot to RefundCalculator since that represents what was charged.
    // However, RefundCalculator checks service properties like nonRefundable.
    // Let's create a temporary service or pass the actual service, but adjust the price to match the reservation price snapshot.
    const serviceSnapshot = { ...service, price: reservation.price };

    const { refundPercentage, refundAmount } = RefundCalculator.calculate(
      serviceSnapshot,
      user,
      hoursUntilAppointment
    );

    // 6. Update reservation status
    reservation.status = "cancelled";
    this.reservationRepo.update(reservation);

    return {
      reservation,
      refundPercentage,
      refundAmount,
    };
  }

  /**
   * Lists all reservations for a user, optionally filtered by a date range.
   */
  listReservations(userId: string, fromStr?: string, toStr?: string): Reservation[] {
    // 1. Check if user exists
    const user = this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError(`Usuario con ID '${userId}' no fue encontrado.`);
    }

    // 2. Parse range dates if provided
    let from: Date | undefined;
    let to: Date | undefined;

    if (fromStr) {
      try {
        from = DateTimeService.parseToBogotaUTC(fromStr);
      } catch (err) {
        throw new ValidationError("La fecha de inicio 'from' tiene un formato inválido.");
      }
    }

    if (toStr) {
      try {
        to = DateTimeService.parseToBogotaUTC(toStr);
      } catch (err) {
        throw new ValidationError("La fecha de fin 'to' tiene un formato inválido.");
      }
    }

    if (from && to && from > to) {
      throw new ValidationError("La fecha de inicio 'from' no puede ser posterior a la fecha de fin 'to'.");
    }

    // 3. Retrieve from repository
    return this.reservationRepo.findByUser(userId, from, to);
  }
}
