import { resolveError } from "../utils/errorCatalog.js";
const createResponseModel = (status, message, data) => ({
    status,
    message,
    data,
});
/** Success response for auth/profile/location routes (status + message + data) */
export const createResponse = (res, data) => {
    const response = createResponseModel(data.status, data.message, data.response);
    return res.status(data.status).json(response);
};
/** Standard error response — HTTP status on response; body is message only */
export const sendError = (res, status, message, _errors) => {
    const body = {
        success: false,
        message,
    };
    return res.status(status).json(body);
};
export const sendValidationError = (res, message, _field, _fieldMessage) => sendError(res, 400, message);
/** Map thrown errors (ApiError, catalog, or generic) to a client response */
export const handleControllerError = (res, error, fallbackStatus = 400) => {
    const resolved = resolveError(error);
    const status = resolved.status >= 400 ? resolved.status : fallbackStatus;
    return sendError(res, status, resolved.message, resolved.errors);
};
