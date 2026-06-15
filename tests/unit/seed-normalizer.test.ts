import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SeedNormalizer } from "../../src/infrastructure/seed-normalizer";

describe("SeedNormalizer Unit Tests", () => {
  beforeEach(() => {
    // Spy on console.warn and console.error to prevent cluttering the test output
    // and to assert warnings are logged
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should normalize clean user data correctly", () => {
    const rawData = {
      users: [
        { id: "user-1", name: "Juan", email: "juan@example.com", plan: "premium" },
      ],
    };

    const result = SeedNormalizer.normalize(rawData);
    expect(result.users).toHaveLength(1);
    expect(result.users[0]).toEqual({
      id: "user-1",
      name: "Juan",
      email: "juan@example.com",
      plan: "premium",
    });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("should apply fallback values and log warnings for missing optional user fields", () => {
    const rawData = {
      users: [
        { id: "user-2" }, // Missing name, email, plan
      ],
    };

    const result = SeedNormalizer.normalize(rawData);
    expect(result.users).toHaveLength(1);
    expect(result.users[0]).toEqual({
      id: "user-2",
      name: "Usuario Desconocido",
      email: "user-2@example.com",
      plan: "standard",
    });
    expect(console.warn).toHaveBeenCalledTimes(3); // name warning, email warning, plan warning
  });

  it("should parse multiple date formats in reservations correctly", () => {
    // We mock services because a reservation must correspond to a valid service
    const rawData = {
      services: [
        {
          id: "svc-1",
          name: "Corte",
          durationMinutes: 30,
          price: 50000,
          professionalId: "prof-1",
        },
      ],
      reservations: [
        {
          id: "res-1",
          userId: "user-1",
          serviceId: "svc-1",
          startDateTime: "2026-06-20T10:00:00-05:00", // ISO string with offset
          status: "active",
        },
        {
          id: "res-2",
          userId: "user-1",
          serviceId: "svc-1",
          startDateTime: "20/06/2026 14:30", // DD/MM/YYYY HH:mm local Bogota
          status: "active",
        },
        {
          id: "res-3",
          userId: "user-1",
          serviceId: "svc-1",
          startDateTime: 1782068400000, // Unix timestamp in ms
          status: "active",
        },
      ],
    };

    const result = SeedNormalizer.normalize(rawData);
    expect(result.services).toHaveLength(1);
    expect(result.reservations).toHaveLength(3);

    // Reservation 1 (ISO with -05:00 offset): 2026-06-20T10:00:00-05:00 = 15:00:00 UTC
    expect(result.reservations[0].startDateTime.toISOString()).toBe("2026-06-20T15:00:00.000Z");
    expect(result.reservations[0].endDateTime.toISOString()).toBe("2026-06-20T15:30:00.000Z"); // +30m

    // Reservation 2 (DD/MM/YYYY HH:mm interpreted as America/Bogota): 14:30 Bogota = 19:30 UTC
    expect(result.reservations[1].startDateTime.toISOString()).toBe("2026-06-20T19:30:00.000Z");
    expect(result.reservations[1].endDateTime.toISOString()).toBe("2026-06-20T20:00:00.000Z");

    // Reservation 3 (Unix timestamp: 1782068400000 = 2026-06-22T11:00:00.000Z)
    expect(result.reservations[2].startDateTime.getTime()).toBe(1782068400000);
    expect(result.reservations[2].endDateTime.getTime()).toBe(1782068400000 + 30 * 60 * 1000);
  });

  it("should drop invalid records and log errors", () => {
    const rawData = {
      users: [
        { name: "Juan" }, // Missing ID - invalid schema
      ],
    };

    const result = SeedNormalizer.normalize(rawData);
    expect(result.users).toHaveLength(0);
    expect(console.error).toHaveBeenCalled();
  });
});
