const ApiError = require('../utils/ApiError');
const { t } = require('../i18n');

function errorHandler(err, req, res, next) {
  console.error(err);

  const isApiError = err instanceof ApiError;
  const statusCode = isApiError
    ? err.statusCode
    : (typeof err.statusCode === 'number' ? err.statusCode : null);

  if (statusCode) {
    const message = t(req.lang, err.message);
    return res.status(statusCode).json({
      success: false,
      message: message,
    });
  }

  // Handle JSON parse errors explicitly
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    const message = t(req.lang, 'common.network_error');
    return res.status(400).json({
      success: false,
      message: message,
    });
  }

  // For other types of errors, return a generic 500 error
  const message = t(req.lang, 'common.network_error');
  return res.status(500).json({
    success: false,
    message: message,
  });
}

module.exports = errorHandler;