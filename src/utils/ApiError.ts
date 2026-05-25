export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  statusCode: number;
  errors: FieldError[];

  constructor(
    statusCode: number,
    message: string,
    errors: FieldError[] = []
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = "ApiError";
  }

  static badRequest(message: string, field?: string): ApiError {
    const errors = field ? [{ field, message }] : [];
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = "Authentication required"): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = "You do not have permission to perform this action"): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message: string, field?: string): ApiError {
    const errors = field ? [{ field, message }] : [];
    return new ApiError(404, message, errors);
  }

  static conflict(message: string, field?: string): ApiError {
    const errors = field ? [{ field, message }] : [];
    return new ApiError(409, message, errors);
  }

  static internal(message = "An unexpected error occurred. Please try again later"): ApiError {
    return new ApiError(500, message);
  }
}
