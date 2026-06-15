import { DateTimeService } from "./datetime-service";

/**
 * List of official Colombian holidays for the year 2026.
 * Formatted as YYYY-MM-DD.
 */
export const COLOMBIAN_HOLIDAYS_2026 = new Set<string>([
  "2026-01-01", // Año Nuevo
  "2026-01-12", // Día de los Reyes Magos
  "2026-03-23", // Día de San José
  "2026-04-02", // Jueves Santo
  "2026-04-03", // Viernes Santo
  "2026-05-01", // Día del Trabajo
  "2026-05-18", // Día de la Ascensión
  "2026-06-08", // Corpus Christi
  "2026-06-15", // Sagrado Corazón de Jesús
  "2026-06-29", // San Pedro y San Pablo
  "2026-07-20", // Día de la Independencia
  "2026-08-07", // Batalla de Boyacá
  "2026-08-17", // La Asunción de la Virgen
  "2026-10-12", // Día de la Diversidad Étnica (Día de la Raza)
  "2026-11-02", // Día de Todos los Santos
  "2026-11-16", // Independencia de Cartagena
  "2026-12-08", // Inmaculada Concepción
  "2026-12-25", // Navidad
]);

/**
 * Checks if the given date is a Colombian holiday in 2026 (based on local Bogota time).
 */
export function isColombianHoliday(date: Date): boolean {
  const dateStr = DateTimeService.formatBogota(date, "yyyy-MM-dd");
  return COLOMBIAN_HOLIDAYS_2026.has(dateStr);
}
