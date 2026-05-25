export class ApiError extends Error {
    constructor(statusCode, message, errors = []) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.name = "ApiError";
    }
    static badRequest(message, field) {
        const errors = field ? [{ field, message }] : [];
        return new ApiError(400, message, errors);
    }
    static unauthorized(message = "Authentication required") {
        return new ApiError(401, message);
    }
    static forbidden(message = "You do not have permission to perform this action") {
        return new ApiError(403, message);
    }
    static notFound(message, field) {
        const errors = field ? [{ field, message }] : [];
        return new ApiError(404, message, errors);
    }
    static conflict(message, field) {
        const errors = field ? [{ field, message }] : [];
        return new ApiError(409, message, errors);
    }
    static internal(message = "An unexpected error occurred. Please try again later") {
        return new ApiError(500, message);
    }
}
