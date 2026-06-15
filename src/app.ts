import express, { Express } from "express";
import { UserRepository } from "./repositories/user.repository";
import { ServiceRepository } from "./repositories/service.repository";
import { ReservationRepository } from "./repositories/reservation.repository";
import { DataLoader } from "./infrastructure/data-loader";
import { ReservationService } from "./services/reservation.service";
import { ReservationController } from "./api/reservation.controller";
import { setupRoutes } from "./api/routes";
import { errorHandler } from "./api/error-handler";

interface AppConfig {
  seedFilePath?: string;
  getNow?: () => Date;
}

export function createApp(config: AppConfig = {}) {
  const app: Express = express();

  // Middleware
  app.use(express.json());

  // Instantiate Repositories
  const userRepo = new UserRepository();
  const serviceRepo = new ServiceRepository();
  const reservationRepo = new ReservationRepository();

  // Load Seed Data
  DataLoader.load(userRepo, serviceRepo, reservationRepo, config.seedFilePath);

  // Instantiate Service and Controller
  const reservationService = new ReservationService(
    userRepo,
    serviceRepo,
    reservationRepo,
    config.getNow
  );
  
  const reservationController = new ReservationController(reservationService);

  // Routes
  const router = setupRoutes(reservationController);
  app.use("/api", router);

  // Health check
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
  });

  // Global Error Handler
  app.use(errorHandler);

  return {
    app,
    userRepo,
    serviceRepo,
    reservationRepo,
    reservationService,
  };
}
