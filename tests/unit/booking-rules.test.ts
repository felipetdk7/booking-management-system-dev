import { describe, it, expect } from "vitest";
import { BookingRulesValidator } from "../../src/domain/booking-rules";
import { User, Service, Reservation } from "../../src/domain/entities";

describe("BookingRulesValidator Unit Tests", () => {
  // Set now to Thursday, June 18, 2026 at 12:00:00 Bogota time (-05:00)
  // UTC time: 2026-06-18T17:00:00.000Z
  const now = new Date("2026-06-18T17:00:00Z");

  const mockUser: User = {
    id: "user-test",
    name: "Test User",
    email: "test@example.com",
    plan: "standard",
  };

  const mockService: Service = {
    id: "svc-test",
    name: "Test Service",
    durationMinutes: 60,
    price: 50000,
    nonRefundable: false,
    professionalId: "prof-test",
  };

  it("should pass validation for a valid request (happy path)", () => {
    // Saturday, June 20, 2026 at 10:00:00 Bogota time
    // UTC time: 2026-06-20T15:00:00.000Z
    const startDateTime = new Date("2026-06-20T15:00:00Z");

    const errors = BookingRulesValidator.validate({
      user: mockUser,
      service: mockService,
      startDateTime,
      existingReservations: [],
      now,
    });

    expect(errors).toHaveLength(0);
  });

  it("should reject a reservation that is in the past or exactly now", () => {
    // Past
    const errorsPast = BookingRulesValidator.validate({
      user: mockUser,
      service: mockService,
      startDateTime: new Date("2026-06-18T16:59:00Z"),
      existingReservations: [],
      now,
    });
    expect(errorsPast).toHaveLength(1);
    expect(errorsPast[0].message).toContain("debe ser futura");

    // Exactly now
    const errorsNow = BookingRulesValidator.validate({
      user: mockUser,
      service: mockService,
      startDateTime: now,
      existingReservations: [],
      now,
    });
    expect(errorsNow).toHaveLength(1);
  });

  it("should reject a reservation with less than 2 hours of advance notice", () => {
    // now is 12:00 Bogota. Proposed time: 13:30 Bogota (1.5 hours difference)
    const startDateTime = new Date("2026-06-18T18:30:00Z"); // 18:30 UTC = 13:30 Bogota

    const errors = BookingRulesValidator.validate({
      user: mockUser,
      service: mockService,
      startDateTime,
      existingReservations: [],
      now,
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("2 horas de anticipación");
  });

  it("should reject a reservation on a Sunday", () => {
    // Sunday, June 21, 2026 at 10:00:00 Bogota time
    // UTC time: 2026-06-21T15:00:00.000Z
    const startDateTime = new Date("2026-06-21T15:00:00Z");

    const errors = BookingRulesValidator.validate({
      user: mockUser,
      service: mockService,
      startDateTime,
      existingReservations: [],
      now,
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("domingos");
  });

  it("should reject a reservation on a Colombian holiday in 2026", () => {
    // Monday, June 15, 2026 (Sagrado Corazón de Jesús) at 10:00:00 Bogota time
    // UTC time: 2026-06-15T15:00:00.000Z
    // (Note that startDateTime is in the past relative to mock now, but to test holiday validation specifically,
    // let's adjust mock now to be before the holiday, say June 14, 2026)
    const holidayNow = new Date("2026-06-14T15:00:00Z"); // Sunday
    const startDateTime = new Date("2026-06-15T15:00:00Z"); // Monday (holiday)

    const errors = BookingRulesValidator.validate({
      user: mockUser,
      service: mockService,
      startDateTime,
      existingReservations: [],
      now: holidayNow,
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("festivos");
  });

  it("should reject reservations outside operating hours (07:00 - 19:00)", () => {
    // Saturday, June 20, 2026.
    // Case A: Before 07:00 (Starts 06:30 Bogota / 11:30 UTC)
    const beforeStart = new Date("2026-06-20T11:30:00Z");
    const errorsBefore = BookingRulesValidator.validate({
      user: mockUser,
      service: mockService,
      startDateTime: beforeStart,
      existingReservations: [],
      now,
    });
    expect(errorsBefore).toHaveLength(1);
    expect(errorsBefore[0].message).toContain("horario de operación");

    // Case B: Ends after 19:00. Starts 18:30 Bogota / 23:30 UTC. Duration 60 mins -> Ends 19:30 Bogota
    const afterEnd = new Date("2026-06-20T23:30:00Z");
    const errorsAfter = BookingRulesValidator.validate({
      user: mockUser,
      service: mockService,
      startDateTime: afterEnd,
      existingReservations: [],
      now,
    });
    expect(errorsAfter).toHaveLength(1);
    expect(errorsAfter[0].message).toContain("horario de operación");
  });

  it("should reject a reservation if it overlaps with an active appointment for the same professional", () => {
    // Professional's existing reservation: Saturday June 20, 10:00 - 11:00 Bogota (15:00 - 16:00 UTC)
    const existingRes: Reservation = {
      id: "res-exist",
      userId: "user-other",
      serviceId: "svc-other",
      professionalId: "prof-test",
      startDateTime: new Date("2026-06-20T15:00:00Z"),
      endDateTime: new Date("2026-06-20T16:00:00Z"),
      status: "active",
      price: 50000,
      createdAt: now,
    };

    // Case A: Partial overlap (starts at 10:30 Bogota / 15:30 UTC)
    const startOverlap = new Date("2026-06-20T15:30:00Z");
    const errorsOverlap = BookingRulesValidator.validate({
      user: mockUser,
      service: mockService,
      startDateTime: startOverlap,
      existingReservations: [existingRes],
      now,
    });
    expect(errorsOverlap).toHaveLength(1);
    expect(errorsOverlap[0].message).toContain("solapa");

    // Case B: Touching limits (starts at 11:00 Bogota / 16:00 UTC) -> should be VALID
    const startTouching = new Date("2026-06-20T16:00:00Z");
    const errorsTouching = BookingRulesValidator.validate({
      user: mockUser,
      service: mockService,
      startDateTime: startTouching,
      existingReservations: [existingRes],
      now,
    });
    expect(errorsTouching).toHaveLength(0);

    // Case C: Overlapping but existing is cancelled -> should be VALID
    const cancelledRes = { ...existingRes, status: "cancelled" as const };
    const errorsCancelled = BookingRulesValidator.validate({
      user: mockUser,
      service: mockService,
      startDateTime: startOverlap,
      existingReservations: [cancelledRes],
      now,
    });
    expect(errorsCancelled).toHaveLength(0);
  });

  it("should reject if a user has 3 active parallel reservations in the future", () => {
    // Existing 3 active future reservations for mockUser
    const existing: Reservation[] = [
      {
        id: "r1",
        userId: mockUser.id,
        serviceId: "s",
        professionalId: "p1",
        startDateTime: new Date("2026-06-20T15:00:00Z"), // Future
        endDateTime: new Date("2026-06-20T16:00:00Z"),
        status: "active",
        price: 30000,
        createdAt: now,
      },
      {
        id: "r2",
        userId: mockUser.id,
        serviceId: "s",
        professionalId: "p2",
        startDateTime: new Date("2026-06-20T17:00:00Z"), // Future
        endDateTime: new Date("2026-06-20T18:00:00Z"),
        status: "active",
        price: 30000,
        createdAt: now,
      },
      {
        id: "r3",
        userId: mockUser.id,
        serviceId: "s",
        professionalId: "p3",
        startDateTime: new Date("2026-06-20T19:00:00Z"), // Future
        endDateTime: new Date("2026-06-20T20:00:00Z"),
        status: "active",
        price: 30000,
        createdAt: now,
      },
    ];

    const startDateTime = new Date("2026-06-20T21:00:00Z"); // Future
    const errors = BookingRulesValidator.validate({
      user: mockUser,
      service: mockService,
      startDateTime,
      existingReservations: existing,
      now,
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("límite máximo de 3 reservas");
  });
});
