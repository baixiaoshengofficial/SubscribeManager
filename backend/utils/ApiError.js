class ApiError extends Error {
  constructor(statusCode, message, params) {
    super(message);
    this.statusCode = statusCode;
    this.params = params;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
