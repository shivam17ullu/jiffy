import { ApiError } from "../utils/ApiError.js";
import { handleControllerError } from "./responseHandler.js";
/** Global Express error handler (multer, unhandled route errors) */
export const globalErrorHandler = (err, _req, res, next) => {
    if (res.headersSent) {
        next(err);
        return;
    }
    const multerErr = err;
    if (multerErr?.code === "LIMIT_FILE_SIZE") {
        handleControllerError(res, ApiError.badRequest("File size exceeds the 10MB limit", "images"));
        return;
    }
    if (multerErr?.code === "LIMIT_FILE_COUNT") {
        handleControllerError(res, ApiError.badRequest("Too many files uploaded. Maximum 10 images allowed", "images"));
        return;
    }
    handleControllerError(res, err, 500);
};
