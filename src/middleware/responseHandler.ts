const createResponseModel = (status, message, data) => ({
    status,
    message,
    data: data,
});

export const createResponse = (res, data) => {
    const response = createResponseModel(data.status, data.message, data.response);
    return res.status(data.status).json(response);
};