import { describe, it, expect } from "vitest";
import { RefundCalculator } from "../../src/domain/refund-calculator";
import { User, Service } from "../../src/domain/entities";

describe("RefundCalculator Unit Tests", () => {
  const standardUser: User = {
    id: "u-std",
    name: "Standard",
    email: "std@example.com",
    plan: "standard",
  };

  const premiumUser: User = {
    id: "u-prem",
    name: "Premium",
    email: "prem@example.com",
    plan: "premium",
  };

  const refundableService: Service = {
    id: "s-ref",
    name: "Refundable",
    durationMinutes: 60,
    price: 100000,
    nonRefundable: false,
    professionalId: "p-1",
  };

  const nonRefundableService: Service = {
    id: "s-nonref",
    name: "Non Refundable",
    durationMinutes: 60,
    price: 100000,
    nonRefundable: true,
    professionalId: "p-1",
  };

  describe("Standard User Plan", () => {
    const cases = [
      { hours: 25, expectedPercent: 100, expectedRefund: 100000, desc: "more than 24 hours" },
      { hours: 24, expectedPercent: 100, expectedRefund: 100000, desc: "exactly 24 hours (boundary)" },
      { hours: 23.9, expectedPercent: 50, expectedRefund: 50000, desc: "just under 24 hours" },
      { hours: 10, expectedPercent: 50, expectedRefund: 50000, desc: "between 4 and 24 hours" },
      { hours: 4, expectedPercent: 50, expectedRefund: 50000, desc: "exactly 4 hours (boundary)" },
      { hours: 3.9, expectedPercent: 0, expectedRefund: 0, desc: "just under 4 hours" },
      { hours: 1, expectedPercent: 0, expectedRefund: 0, desc: "less than 4 hours" },
      { hours: 0, expectedPercent: 0, expectedRefund: 0, desc: "immediately before appointment" },
    ];

    it.each(cases)("should return $expectedPercent% refund for $hours hours notice ($desc)", ({ hours, expectedPercent, expectedRefund }) => {
      const result = RefundCalculator.calculate(refundableService, standardUser, hours);
      expect(result.refundPercentage).toBe(expectedPercent);
      expect(result.refundAmount).toBe(expectedRefund);
    });
  });

  describe("Premium User Plan", () => {
    const cases = [
      { hours: 5, expectedPercent: 100, expectedRefund: 100000, desc: "more than 4 hours" },
      { hours: 4, expectedPercent: 100, expectedRefund: 100000, desc: "exactly 4 hours (boundary)" },
      { hours: 3.9, expectedPercent: 50, expectedRefund: 50000, desc: "just under 4 hours" },
      { hours: 2, expectedPercent: 50, expectedRefund: 50000, desc: "between 1 and 4 hours" },
      { hours: 1, expectedPercent: 50, expectedRefund: 50000, desc: "exactly 1 hour (boundary)" },
      { hours: 0.9, expectedPercent: 0, expectedRefund: 0, desc: "just under 1 hour" },
      { hours: 0, expectedPercent: 0, expectedRefund: 0, desc: "immediately before appointment" },
    ];

    it.each(cases)("should return $expectedPercent% refund for $hours hours notice ($desc)", ({ hours, expectedPercent, expectedRefund }) => {
      const result = RefundCalculator.calculate(refundableService, premiumUser, hours);
      expect(result.refundPercentage).toBe(expectedPercent);
      expect(result.refundAmount).toBe(expectedRefund);
    });
  });

  describe("Non-Refundable Services", () => {
    const cases = [
      { user: standardUser, hours: 48, desc: "standard user with plenty of notice" },
      { user: standardUser, hours: 2, desc: "standard user with short notice" },
      { user: premiumUser, hours: 48, desc: "premium user with plenty of notice" },
      { user: premiumUser, hours: 0.5, desc: "premium user with short notice" },
    ];

    it.each(cases)("should always return 0% refund ($desc)", ({ user, hours }) => {
      const result = RefundCalculator.calculate(nonRefundableService, user, hours);
      expect(result.refundPercentage).toBe(0);
      expect(result.refundAmount).toBe(0);
    });
  });
});
