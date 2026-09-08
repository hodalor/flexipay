const { failure } = require('@utils/response');
const { registerRealtimeClient, verifyRealtimeToken } = require('@services/realtime.service');

function stream(req, res) {
  try {
    const token = req.query.token || '';
    verifyRealtimeToken(token);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const closeClient = registerRealtimeClient(res);

    req.on('close', function onClose() {
      closeClient();
    });
  } catch (error) {
    return failure(res, error.message || 'Unable to open realtime stream', 401);
  }
}

module.exports = {
  stream
};
