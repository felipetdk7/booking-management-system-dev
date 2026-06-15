import { describe, it, expect, beforeEach } from "vitest";
import { UserRepository } from "../../src/repositories/user.repository";
import { ServiceRepository } from "../../src/repositories/service.repository";
import { ReservationRepository } from "../../src/repositories/reservation.repository";
import { ReservationService } from "../../src/services/reservation.service";
import { ValidationError, NotFoundError, ConflictError } from "../../src/domain/errors";
import { User, Service, Reservation } from "../../src/domain/entities";

describe("ReservationService Integration Tests", () => {
  let userRepo: UserRepository;
  let serviceRepo: ServiceRepository;
  let reservationRepo: ReservationRepository;
  let service: ReservationService;

  // Thursday, June 18, 2026 at 12:00:00 Bogota time (-05:00) -> 17:00:00 UTC
  const mockNow = new Date("2026-06-18T17:00:00Z");
  const getMockNow = () => mockNow;

  const standardUser: User = {
    id: "user-std",
    name: "Maria",
    email: "maria@example.com",
    plan: "standard",
  };

  const premiumUser: User = {
    id: "user-prem",
    name: "Juan",
    email: "juan@example.com",
    plan: "premium",
  };

  const corteService: Service = {
    id: "svc-corte",
    name: "Corte",
    durationMinutes: 30,
    price: 50000,
    nonRefundable: false,
    professionalId: "prof-1",
  };

  const premiumService: Service = {
    id: "svc-nonref",
    name: "Tratamiento No Reembolsable",
    durationMinutes: 90,
    price: 200000,
    nonRefundable: true,
    professionalId: "prof-2",
  };

  beforeEach(() => {
    userRepo = new UserRepository();
    serviceRepo = new ServiceRepository();
    reservationRepo = new ReservationRepository();

    // Populate database
    userRepo.save(standardUser);
    userRepo.save(premiumUser);
    serviceRepo.save(corteService);
    serviceRepo.save(premiumService);

    // Instantiate service with mock clock
    service = new ReservationService(userRepo, serviceRepo, reservationRepo, getMockNow);
  });

  describe("Create Reservation", () => {
    it("should successfully create a valid reservation and save it to the repository", () => {
      // Saturday June 20, 2026 at 10:00 Bogota (15:00 UTC)
      const input = {
        userId: "user-std",
        serviceId: "svc-corte",
        startDateTime: "2026-06-20T10:00:00", // No offset -> America/Bogota local time
      };

      const result = service.createReservation(input);

      expect(result.id).toBeDefined();
      expect(result.userId).toBe(standardUser.id);
      expect(result.serviceId).toBe(corteService.id);
      expect(result.professionalId).toBe(corteService.professionalId);
      expect(result.startDateTime.toISOString()).toBe("2026-06-20T15:00:00.000Z");
      expect(result.endDateTime.toISOString()).toBe("2026-06-20T15:30:00.000Z"); // +30m
      expect(result.status).toBe("active");
      expect(result.price).toBe(corteService.price);

      // Verify it exists in database
      const dbRes = reservationRepo.findById(result.id);
      expect(dbRes).toEqual(result);
    });

    it("should throw NotFoundError if user does not exist", () => {
      const input = {
        userId: "non-existent-user",
        serviceId: "svc-corte",
        startDateTime: "2026-06-20T10:00:00",
      };

      expect(() => service.createReservation(input)).toThrow(NotFoundError);
    });

    it("should throw ValidationError if business rules are violated", () => {
      const input = {
        userId: "user-std",
        serviceId: "svc-corte",
        startDateTime: "2026-06-21T10:00:00", // Sunday - forbidden
      };

      expect(() => service.createReservation(input)).toThrow(ValidationError);
      try {
        service.createReservation(input);
      } catch (err: any) {
        expect(err.errors).toBeDefined();
        expect(err.errors[0].message).toContain("domingos");
      }
    });
  });

  describe("Cancel Reservation", () => {
    it("should successfully cancel a reservation and return refund info (Standard User - 100% refund)", () => {
      // Create a reservation set for Saturday June 20 at 14:00 Bogota (19:00 UTC)
      // Difference between mockNow (June 18 12:00) and June 20 14:00 is 50 hours (>= 24h) -> 100% refund
      const start = new Date("2026-06-20T19:00:00Z");
      const res = reservationRepo.create({
        id: "res-cancel-std-100",
        userId: standardUser.id,
        serviceId: corteService.id,
        professionalId: corteService.professionalId,
        startDateTime: start,
        endDateTime: new Date(start.getTime() + 30 * 60000),
        status: "active",
        price: corteService.price,
        createdAt: mockNow,
      });

      const cancelResult = service.cancelReservation(res.id);

      expect(cancelResult.reservation.status).toBe("cancelled");
      expect(cancelResult.refundPercentage).toBe(100);
      expect(cancelResult.refundAmount).toBe(50000);

      // Verify db is updated
      expect(reservationRepo.findById(res.id)?.status).toBe("cancelled");
    });

    it("should return 50% refund for Standard user if cancelled between 4h and 24h of appointment", () => {
      // Appointment is 10 hours from now (starts June 18 at 22:00 Bogota / June 19 03:00 UTC)
      // Wait, is June 19 03:00 UTC within operating hours? 22:00 Bogota is not, but we just manually insert it in the DB to test the RefundCalculator logic.
      // That's the power of testing in separation!
      const start = new Date(mockNow.getTime() + 10 * 60 * 60 * 1000); // +10 hours
      const res = reservationRepo.create({
        id: "res-cancel-std-50",
        userId: standardUser.id,
        serviceId: corteService.id,
        professionalId: corteService.professionalId,
        startDateTime: start,
        endDateTime: new Date(start.getTime() + 30 * 60000),
        status: "active",
        price: corteService.price,
        createdAt: mockNow,
      });

      const cancelResult = service.cancelReservation(res.id);
      expect(cancelResult.refundPercentage).toBe(50);
      expect(cancelResult.refundAmount).toBe(25000);
    });

    it("should return 0% refund for non_refundable service regardless of plan and notice", () => {
      // Premium user, 50 hours notice -> normally 100%, but service is nonRefundable
      const start = new Date(mockNow.getTime() + 50 * 60 * 60 * 1000);
      const res = reservationRepo.create({
        id: "res-cancel-nonref",
        userId: premiumUser.id,
        serviceId: premiumService.id,
        professionalId: premiumService.professionalId,
        startDateTime: start,
        endDateTime: new Date(start.getTime() + 90 * 60000),
        status: "active",
        price: premiumService.price,
        createdAt: mockNow,
      });

      const cancelResult = service.cancelReservation(res.id);
      expect(cancelResult.refundPercentage).toBe(0);
      expect(cancelResult.refundAmount).toBe(0);
    });

    it("should throw ConflictError if trying to cancel an already cancelled reservation", () => {
      const res = reservationRepo.create({
        id: "res-already-cancelled",
        userId: standardUser.id,
        serviceId: corteService.id,
        professionalId: corteService.professionalId,
        startDateTime: new Date("2026-06-20T19:00:00Z"),
        endDateTime: new Date("2026-06-20T19:30:00Z"),
        status: "cancelled",
        price: corteService.price,
        createdAt: mockNow,
      });

      expect(() => service.cancelReservation(res.id)).toThrow(ConflictError);
    });

    it("should throw ValidationError if trying to cancel a past reservation", () => {
      const pastStart = new Date(mockNow.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
      const res = reservationRepo.create({
        id: "res-past",
        userId: standardUser.id,
        serviceId: corteService.id,
        professionalId: corteService.professionalId,
        startDateTime: pastStart,
        endDateTime: new Date(pastStart.getTime() + 30 * 60000),
        status: "active",
        price: corteService.price,
        createdAt: mockNow,
      });

      expect(() => service.cancelReservation(res.id)).toThrow(ValidationError);
    });
  });

  describe("List Reservations", () => {
    beforeEach(() => {
      // Clear reservations
      reservationRepo = new ReservationRepository();
      service = new ReservationService(userRepo, serviceRepo, reservationRepo, getMockNow);

      // Create reservations in different times
      // R1: 2026-06-19T10:00:00 Bogota (15:00 UTC)
      reservationRepo.create({
        id: "r-1",
        userId: standardUser.id,
        serviceId: corteService.id,
        professionalId: corteService.professionalId,
        startDateTime: new Date("2026-06-19T15:00:00Z"),
        endDateTime: new Date("2026-06-19T15:30:00Z"),
        status: "active",
        price: 50000,
        createdAt: mockNow,
      });

      // R2: 2026-06-20T10:00:00 Bogota (15:00 UTC)
      reservationRepo.create({
        id: "r-2",
        userId: standardUser.id,
        serviceId: corteService.id,
        professionalId: corteService.professionalId,
        startDateTime: new Date("2026-06-20T15:00:00Z"),
        endDateTime: new Date("2026-06-20T15:30:00Z"),
        status: "active",
        price: 50000,
        createdAt: mockNow,
      });

      // R3: 2026-06-25T10:00:00 Bogota (15:00 UTC)
      reservationRepo.create({
        id: "r-3",
        userId: standardUser.id,
        serviceId: corteService.id,
        professionalId: corteService.professionalId,
        startDateTime: new Date("2026-06-25T15:00:00Z"),
        endDateTime: new Date("2026-06-25T15:30:00Z"),
        status: "active",
        price: 50000,
        createdAt: mockNow,
      });
    });

    it("should list all reservations of a user in chronological order", () => {
      const list = service.listReservations(standardUser.id);
      expect(list).toHaveLength(3);
      expect(list[0].id).toBe("r-1");
      expect(list[1].id).toBe("r-2");
      expect(list[2].id).toBe("r-3");
    });

    it("should list reservations filtered by date range", () => {
      // Filter from June 19 to June 21 Bogota
      const list = service.listReservations(standardUser.id, "2026-06-19T00:00:00", "2026-06-21T23:59:59");
      expect(list).toHaveLength(2);
      expect(list[0].id).toBe("r-1");
      expect(list[1].id).toBe("r-2");
    });
  });
});
