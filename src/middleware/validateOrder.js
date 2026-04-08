const VALID_SERVICE_IDS = ['backend', 'frontend', 'auth', 'database', 'redis', 'deploy', 'consulting'];

export function validateOrderInput(req, res, next) {
  const { serviceId } = req.body;

  if (!serviceId) {
    return res.status(400).json({
      error: 'serviceId is required'
    });
  }

  if (typeof serviceId !== 'string') {
    return res.status(400).json({
      error: 'serviceId must be a string'
    });
  }

  if (!VALID_SERVICE_IDS.includes(serviceId)) {
    return res.status(400).json({
      error: `serviceId must be one of: ${VALID_SERVICE_IDS.join(', ')}`
    });
  }

  next();
}