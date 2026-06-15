import { Request, Response, NextFunction } from "express";
import { ReservationService } from "../services/reservation.service";

export class ReservationController {
  constructor(private reservationService: ReservationService) {}

  /**
   * Handler for POST /api/reservations
   */
  create = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, serviceId, startDateTime } = req.body;

      if (!userId || !serviceId || !startDateTime) {
        return res.status(400).json({
          error: "Los campos 'userId', 'serviceId' y 'startDateTime' son obligatorios en el cuerpo de la solicitud.",
        });
      }

      const reservation = this.reservationService.createReservation({
        userId,
        serviceId,
        startDateTime,
      });

      return res.status(201).json({
        message: "Reserva creada exitosamente.",
        reservation,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Handler for POST /api/reservations/:id/cancel
   */
  cancel = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          error: "El parámetro de ruta 'id' es requerido.",
        });
      }

      const result = this.reservationService.cancelReservation(id as string);

      return res.status(200).json({
        message: "Reserva cancelada exitosamente.",
        reservation: result.reservation,
        refundPercentage: result.refundPercentage,
        refundAmount: result.refundAmount,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Handler for GET /api/reservations
   */
  list = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, from, to } = req.query;

      if (!userId || typeof userId !== "string") {
        return res.status(400).json({
          error: "El parámetro de consulta 'userId' es obligatorio.",
        });
      }

      const reservations = this.reservationService.listReservations(
        userId,
        typeof from === "string" ? from : undefined,
        typeof to === "string" ? to : undefined
      );

      return res.status(200).json({
        userId,
        count: reservations.length,
        reservations,
      });
    } catch (err) {
      next(err);
    }
  };
}
