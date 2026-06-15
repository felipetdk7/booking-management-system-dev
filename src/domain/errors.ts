import { BookingRuleError } from "./booking-rules";

export class ValidationError extends Error {
  public errors: BookingRuleError[];

  constructor(message: string, errors: BookingRuleError[] = []) {
    super(message);
    this.name = "ValidationError";
    this.errors = errors;
    // Set prototype explicitly for custom error classes in ES5/ES6
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}
