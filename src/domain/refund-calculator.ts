import { User, Service } from "./entities";

export class RefundCalculator {
  /**
   * Calculates the refund percentage and amount when cancelling a reservation.
   *
   * @param service The service of the reservation
   * @param user The user who owns the reservation
   * @param hoursUntilAppointment Hours from cancellation time to the start of the reservation
   * @returns Object containing the refund percentage (0, 50, or 100) and the calculated refund amount
   */
  static calculate(
    service: Service,
    user: User,
    hoursUntilAppointment: number
  ): { refundPercentage: number; refundAmount: number } {
    // 1. Non-refundable services always return 0%
    if (service.nonRefundable) {
      return { refundPercentage: 0, refundAmount: 0 };
    }

    let refundPercentage = 0;

    if (user.plan === "premium") {
      if (hoursUntilAppointment >= 4) {
        refundPercentage = 100;
      } else if (hoursUntilAppointment >= 1) {
        refundPercentage = 50;
      } else {
        refundPercentage = 0;
      }
    } else {
      // Standard plan
      if (hoursUntilAppointment >= 24) {
        refundPercentage = 100;
      } else if (hoursUntilAppointment >= 4) {
        refundPercentage = 50;
      } else {
        refundPercentage = 0;
      }
    }

    const refundAmount = (service.price * refundPercentage) / 100;

    return {
      refundPercentage,
      refundAmount,
    };
  }
}
