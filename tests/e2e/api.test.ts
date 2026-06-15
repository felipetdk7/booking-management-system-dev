import request from "supertest";
import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../../src/app";

describe("E2E API Endpoints Tests", () => {
  let app: any;
  let reservationRepo: any;

  // Set mock now to: Thursday, June 18, 2026 at 12:00:00 Bogota time (-05:00) -> 17:00:00 UTC
  const mockNow = new Date("2026-06-18T17:00:00Z");
  const getMockNow = () => mockNow;

  beforeEach(() => {
    // Re-create the app instance for each test to ensure a clean in-memory state
    // It will load the data from data/seed.json
    const setup = createApp({
      getNow: getMockNow,
    });
    app = setup.app;
    reservationRepo = setup.reservationRepo;
  });

  describe("POST /api/reservations", () => {
    it("should create a new reservation successfully (201 Created)", async () => {
      // seed.json has: user-3 (Standard), svc-1 (30 mins, price 50000, professionalId prof-1)
      // Proposed time: Saturday, June 20, 2026 at 10:00:00 Bogota time
      const payload = {
        userId: "user-3",
        serviceId: "svc-1",
        startDateTime: "2026-06-20T10:00:00",
      };

      const res = await request(app)
        .post("/api/reservations")
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.message).toContain("creada exitosamente");
      expect(res.body.reservation).toBeDefined();
      expect(res.body.reservation.userId).toBe("user-3");
      expect(res.body.reservation.serviceId).toBe("svc-1");
      expect(res.body.reservation.status).toBe("active");
    });

    it("should return 400 Bad Request if validation rules are violated (e.g. Sunday reservation)", async () => {
      const payload = {
        userId: "user-3",
        serviceId: "svc-1",
        startDateTime: "2026-06-21T10:00:00", // Sunday
      };

      const res = await request(app)
        .post("/api/reservations")
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("No se pudo crear la reserva");
      expect(res.body.details).toBeDefined();
      expect(res.body.details[0].message).toContain("domingos");
    });

    it("should return 404 Not Found if user or service does not exist", async () => {
      const payload = {
        userId: "non-existent-user",
        serviceId: "svc-1",
        startDateTime: "2026-06-20T10:00:00",
      };

      const res = await request(app)
        .post("/api/reservations")
        .send(payload);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("no fue encontrado");
    });
  });

  describe("POST /api/reservations/:id/cancel", () => {
    it("should cancel a future reservation and return refund information (200 OK)", async () => {
      // Let's check seed.json:
      // 'res-1' is user-3 (Standard), svc-1, startDateTime "2026-06-20T10:00:00Z" (June 20 05:00 Bogota)
      // Difference between mockNow (June 18 12:00 Bogota) and June 20 05:00 Bogota is 41 hours (>= 24h) -> 100% refund
      const res = await request(app)
        .post("/api/reservations/res-1/cancel")
        .send();

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("cancelada exitosamente");
      expect(res.body.reservation.status).toBe("cancelled");
      expect(res.body.refundPercentage).toBe(100);
      expect(res.body.refundAmount).toBe(50000); // 50000 * 100%
    });

    it("should return 409 Conflict if reservation is already cancelled", async () => {
      // 'res-4' in seed.json is pre-cancelled
      const res = await request(app)
        .post("/api/reservations/res-4/cancel")
        .send();

      expect(res.status).toBe(409);
      expect(res.body.error).toContain("ya se encuentra cancelada");
    });

    it("should return 404 Not Found if reservation ID is invalid", async () => {
      const res = await request(app)
        .post("/api/reservations/non-existent-res/cancel")
        .send();

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("no fue encontrada");
    });
  });

  describe("GET /api/reservations", () => {
    it("should retrieve a list of reservations for a user (200 OK)", async () => {
      const res = await request(app)
        .get("/api/reservations?userId=user-3")
        .send();

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe("user-3");
      expect(res.body.count).toBe(2); // res-1 (active) and res-4 (cancelled)
      expect(res.body.reservations).toHaveLength(2);
    });

    it("should filter reservations by date range", async () => {
      // res-1 starts on 2026-06-20, res-4 starts on 2026-06-19
      // Filter for June 20 only
      const res = await request(app)
        .get("/api/reservations?userId=user-3&from=2026-06-20T00:00:00&to=2026-06-20T23:59:59")
        .send();

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.reservations[0].id).toBe("res-1");
    });

    it("should return 400 Bad Request if userId query param is missing", async () => {
      const res = await request(app)
        .get("/api/reservations")
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("userId' es obligatorio");
    });
  });
});
