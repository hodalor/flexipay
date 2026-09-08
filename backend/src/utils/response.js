function success(res, message, data, statusCode) {
  return res.status(statusCode || 200).json({
    success: true,
    message,
    data
  });
}

function failure(res, message, statusCode, details) {
  return res.status(statusCode || 500).json({
    success: false,
    message,
    details: details || null
  });
}

module.exports = {
  success,
  failure
};

