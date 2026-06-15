import { User, Service, Reservation } from "./entities";
import { DateTimeService } from "./datetime-service";
import { isColombianHoliday } from "./colombian-holidays";

export interface BookingRuleError {
  field?: string;
  message: string;
}

export class BookingRulesValidator {
  /**
   * Validates if a new reservation meets all business rules.
   * Returns a list of errors if any rule is violated.
   */
  static validate(params: {
    user: User;
    service: Service;
    startDateTime: Date;
    existingReservations: Reservation[];
    now: Date;
  }): BookingRuleError[] {
    const { user, service, startDateTime, existingReservations, now } = params;
    const errors: BookingRuleError[] = [];

    // 1. Must be in the future
    if (startDateTime <= now) {
      errors.push({
        field: "startDateTime",
        message: "La fecha y hora de la reserva debe ser futura.",
      });
      // If not in the future, we don't need to check other time-based constraints like advance notice
      return errors;
    }

    // 2. Advance notice: at least 2 hours
    const hoursDifference = DateTimeService.getHoursDifference(now, startDateTime);
    if (hoursDifference < 2) {
      errors.push({
        field: "startDateTime",
        message: "La reserva debe realizarse con al menos 2 horas de anticipación.",
      });
    }

    // Calculate endDateTime
    const endDateTime = new Date(startDateTime.getTime() + service.durationMinutes * 60000);

    // 3. Operating Days: Only Monday to Saturday (no Sundays, no Colombian holidays)
    if (DateTimeService.isSunday(startDateTime)) {
      errors.push({
        field: "startDateTime",
        message: "No se procesan reservas los domingos.",
      });
    }

    if (isColombianHoliday(startDateTime)) {
      errors.push({
        field: "startDateTime",
        message: "No se procesan reservas los días festivos de Colombia.",
      });
    }

    // 4. Operating Hours: Both start and end must be within 07:00 and 19:00 Bogotá time
    if (!DateTimeService.isWithinOperatingHours(startDateTime, endDateTime)) {
      errors.push({
        field: "startDateTime",
        message: "La reserva debe estar dentro del horario de operación (Lunes a Sábado de 07:00 a 19:00 hora Bogotá).",
      });
    }

    // 5. User active future reservation limit: max 3 parallel active reservations
    // "considerando solo reservas futuras y no canceladas"
    const activeFutureReservations = existingReservations.filter(
      (r) =>
        r.userId === user.id &&
        r.status === "active" &&
        r.startDateTime > now
    );
    if (activeFutureReservations.length >= 3) {
      errors.push({
        message: "El usuario ha alcanzado el límite máximo de 3 reservas activas en paralelo.",
      });
    }

    // 6. Professional overlap: professional cannot have overlapping appointments
    // We compare against active reservations of the same professional
    const professionalReservations = existingReservations.filter(
      (r) =>
        r.professionalId === service.professionalId &&
        r.status === "active"
    );

    const hasOverlap = professionalReservations.some((r) => {
      // Overlap condition: startA < endB AND startB < endA
      const startA = startDateTime.getTime();
      const endA = endDateTime.getTime();
      const startB = r.startDateTime.getTime();
      const endB = r.endDateTime.getTime();

      return startA < endB && startB < endA;
    });

    if (hasOverlap) {
      errors.push({
        message: "El profesional asignado ya tiene otra reserva que se solapa con el horario solicitado.",
      });
    }

    return errors;
  }
}
