import { z } from "zod";
import { User, Service, Reservation, UserPlan, ReservationStatus } from "../domain/entities";
import { DateTimeService } from "../domain/datetime-service";

// Helper to normalize dates in various formats
const dateSchema = z.preprocess((val) => {
  if (val instanceof Date) return val;
  
  if (typeof val === "number") {
    console.warn(`[SeedNormalizer] WARNING: Normalizando timestamp Unix a Date: ${val}`);
    return new Date(val);
  }
  
  if (typeof val === "string") {
    // Match DD/MM/YYYY HH:mm
    const dmyRegex = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/;
    const match = val.match(dmyRegex);
    if (match) {
      const [, day, month, year, hours, minutes] = match;
      // Convert to YYYY-MM-DDTHH:mm:00 (which will be parsed as local Bogotá)
      const normalizedStr = `${year}-${month}-${day}T${hours}:${minutes}:00`;
      console.warn(`[SeedNormalizer] WARNING: Normalizando fecha formato DD/MM/YYYY HH:mm a UTC Date: ${val}`);
      return DateTimeService.parseToBogotaUTC(normalizedStr);
    }
    
    // Check if it has offset
    const hasTimezone = /Z|([+-]\d{2}:?\d{2})$/i.test(val);
    if (!hasTimezone) {
      console.warn(`[SeedNormalizer] WARNING: Fecha sin zona horaria detectada, interpretando como America/Bogota: ${val}`);
    }
    
    return DateTimeService.parseToBogotaUTC(val);
  }
  
  throw new Error(`Formato de fecha inválido: ${val}`);
}, z.date());

// User Zod Schema
export const UserInputSchema = z.object({
  id: z.string(),
  name: z.preprocess((val) => {
    if (!val || typeof val !== "string") {
      console.warn(`[SeedNormalizer] WARNING: Nombre faltante o inválido. Asignando 'Usuario Desconocido'.`);
      return "Usuario Desconocido";
    }
    return val;
  }, z.string()),
  email: z.preprocess((val, ctx) => {
    // Get the ID from the context or parent data if possible
    // Since we are preprocessing individual field, we can fallback using a generic name or dynamic string
    if (!val || typeof val !== "string") {
      console.warn(`[SeedNormalizer] WARNING: Email faltante o inválido. Generando uno temporal.`);
      return "temp@example.com";
    }
    return val;
  }, z.string().email()),
  plan: z.preprocess((val) => {
    if (val !== "premium" && val !== "standard") {
      if (val !== undefined) {
        console.warn(`[SeedNormalizer] WARNING: Plan '${val}' no es válido. Fallback a 'standard'.`);
      } else {
        console.warn(`[SeedNormalizer] WARNING: Plan faltante. Fallback a 'standard'.`);
      }
      return "standard";
    }
    return val;
  }, z.enum(["standard", "premium"])),
});

// Service Zod Schema
export const ServiceInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  durationMinutes: z.number().positive(),
  price: z.number().nonnegative(),
  nonRefundable: z.preprocess((val) => {
    if (typeof val !== "boolean") {
      if (val !== undefined) {
        console.warn(`[SeedNormalizer] WARNING: nonRefundable de valor '${val}' no es booleano. Fallback a false.`);
      } else {
        console.warn(`[SeedNormalizer] WARNING: Campo nonRefundable faltante. Fallback a false.`);
      }
      return false;
    }
    return val;
  }, z.boolean()),
  professionalId: z.string(),
});

// Reservation Zod Schema
export const ReservationInputSchema = z.object({
  id: z.string(),
  userId: z.string(),
  serviceId: z.string(),
  startDateTime: dateSchema,
  status: z.preprocess((val) => {
    if (val !== "active" && val !== "cancelled") {
      if (val !== undefined) {
        console.warn(`[SeedNormalizer] WARNING: status '${val}' no es válido. Fallback a 'active'.`);
      } else {
        console.warn(`[SeedNormalizer] WARNING: status faltante. Fallback a 'active'.`);
      }
      return "active";
    }
    return val;
  }, z.enum(["active", "cancelled"])),
});

export class SeedNormalizer {
  /**
   * Normalizes raw seed data from seed.json
   */
  static normalize(rawData: any): {
    users: User[];
    services: Service[];
    reservations: Reservation[];
  } {
    const users: User[] = [];
    const services: Service[] = [];
    const reservations: Reservation[] = [];

    // Parse Users
    if (rawData.users && Array.isArray(rawData.users)) {
      const seenIds = new Set<string>();
      for (const rawUser of rawData.users) {
        try {
          // Dynamic fallback for email if name is available but email is not
          let processedUser = { ...rawUser };
          if (!processedUser.email && processedUser.id) {
            console.warn(`[SeedNormalizer] WARNING: Email faltante. Generando email temporal.`);
            processedUser.email = `${processedUser.id}@example.com`;
          }
          
          const user = UserInputSchema.parse(processedUser) as User;
          if (seenIds.has(user.id)) {
            console.warn(`[SeedNormalizer] WARNING: ID de usuario duplicado detectado: ${user.id}. Saltando duplicado.`);
            continue;
          }
          seenIds.add(user.id);
          users.push(user);
        } catch (err) {
          console.error(`[SeedNormalizer] ERROR: No se pudo normalizar usuario:`, rawUser, err);
        }
      }
    }

    // Parse Services
    if (rawData.services && Array.isArray(rawData.services)) {
      const seenIds = new Set<string>();
      for (const rawSvc of rawData.services) {
        try {
          const service = ServiceInputSchema.parse(rawSvc) as Service;
          if (seenIds.has(service.id)) {
            console.warn(`[SeedNormalizer] WARNING: ID de servicio duplicado detectado: ${service.id}. Saltando duplicado.`);
            continue;
          }
          seenIds.add(service.id);
          services.push(service);
        } catch (err) {
          console.error(`[SeedNormalizer] ERROR: No se pudo normalizar servicio:`, rawSvc, err);
        }
      }
    }

    // Map of services for quick lookups during reservation normalization
    const servicesMap = new Map<string, Service>(services.map((s) => [s.id, s]));

    // Parse Reservations
    if (rawData.reservations && Array.isArray(rawData.reservations)) {
      const seenIds = new Set<string>();
      for (const rawRes of rawData.reservations) {
        try {
          const resInput = ReservationInputSchema.parse(rawRes);
          if (seenIds.has(resInput.id)) {
            console.warn(`[SeedNormalizer] WARNING: ID de reserva duplicada detectada: ${resInput.id}. Saltando duplicado.`);
            continue;
          }

          const service = servicesMap.get(resInput.serviceId);
          if (!service) {
            console.warn(`[SeedNormalizer] WARNING: Reserva ${resInput.id} refiere a un servicio inexistente ${resInput.serviceId}. Saltando.`);
            continue;
          }

          const endDateTime = new Date(resInput.startDateTime.getTime() + service.durationMinutes * 60000);
          
          const reservation: Reservation = {
            id: resInput.id,
            userId: resInput.userId,
            serviceId: resInput.serviceId,
            professionalId: service.professionalId, // Desnormalizado
            startDateTime: resInput.startDateTime,
            endDateTime,
            status: resInput.status as ReservationStatus,
            price: service.price, // Snapshot del precio actual del servicio
            createdAt: new Date(), // Asumiendo fecha de creacion actual para seed data
          };

          seenIds.add(reservation.id);
          reservations.push(reservation);
        } catch (err) {
          console.error(`[SeedNormalizer] ERROR: No se pudo normalizar reserva:`, rawRes, err);
        }
      }
    }

    return { users, services, reservations };
  }
}
