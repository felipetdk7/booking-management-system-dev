import fs from "fs";
import path from "path";
import { IUserRepository, IServiceRepository, IReservationRepository } from "../repositories/interfaces";
import { SeedNormalizer } from "./seed-normalizer";

export class DataLoader {
  /**
   * Loads seed.json, normalizes the data, and populates the given repositories.
   */
  static load(
    userRepo: IUserRepository,
    serviceRepo: IServiceRepository,
    reservationRepo: IReservationRepository,
    seedFilePath?: string
  ): void {
    const defaultPath = path.join(__dirname, "../../data/seed.json");
    const targetPath = seedFilePath || defaultPath;

    if (!fs.existsSync(targetPath)) {
      console.warn(`[DataLoader] Archivo seed no encontrado en: ${targetPath}. Iniciando repositorios vacíos.`);
      return;
    }

    try {
      const rawContent = fs.readFileSync(targetPath, "utf-8");
      const rawData = JSON.parse(rawContent);

      console.log(`[DataLoader] Cargando datos desde ${targetPath}...`);
      const { users, services, reservations } = SeedNormalizer.normalize(rawData);

      // Populate user repository
      for (const user of users) {
        userRepo.save(user);
      }
      console.log(`[DataLoader] Se cargaron ${users.length} usuarios.`);

      // Populate service repository
      for (const service of services) {
        serviceRepo.save(service);
      }
      console.log(`[DataLoader] Se cargaron ${services.length} servicios.`);

      // Populate reservation repository
      for (const reservation of reservations) {
        reservationRepo.create(reservation);
      }
      console.log(`[DataLoader] Se cargaron ${reservations.length} reservas.`);

      console.log("[DataLoader] Carga de datos iniciales completada exitosamente.");
    } catch (err) {
      console.error(`[DataLoader] ERROR: Falló la carga del archivo seed.json:`, err);
    }
  }
}
