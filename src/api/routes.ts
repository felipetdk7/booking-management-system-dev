import { Router } from "express";
import { ReservationController } from "./reservation.controller";

export function setupRoutes(controller: ReservationController): Router {
  const router = Router();

  router.post("/reservations", controller.create);
  router.post("/reservations/:id/cancel", controller.cancel);
  router.get("/reservations", controller.list);

  return router;
}
