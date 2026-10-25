export interface ErrorDetail {
  path: string;
  message: string;
}

/** An expected failure that maps directly onto the API's error envelope. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
  }
}

export const unauthenticated = (message = "Authentication required.") =>
  new AppError(401, "UNAUTHENTICATED", message);
export const forbidden = () => new AppError(403, "FORBIDDEN", "You do not have permission to do this.");
export const vehicleNotFound = () => new AppError(404, "VEHICLE_NOT_FOUND", "Vehicle not found.");
