/**
 * GET Twitter stream
 * Streams back the contents of the Twitter stream to work around the single
 * connection limit of the Twitter API V2.
 */
async function get(req, res, next) {
  function streamConnect(retryAttempt) {
    const stream = req.app.get('stream');
    let dataCounter = 0;

    stream.on('data', (data) => {
      try {
        const stringifiedJSONData = JSON.stringify(JSON.parse(data));
        if (dataCounter === 0) {
          res.statusCode = 200;
          res.set({
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'text/plain; charset=utf-8',
          });
        }
        res.write(stringifiedJSONData); // Write data to response.
        retryAttempt = 0; // A successful connection resets retry count.
        dataCounter++;
      } catch (e) {
        // Catches error in case of 401 unauthorized error status.
        if (data.status === 401) {
          console.log(data);
          res.status(500).end();
          process.exit(1);
        } else if (
            data.detail === 'This stream is currently at the maximum allowed connection limit.'
          ) {
          console.log(data.detail)
          res.status(500).end();
          process.exit(1)
        } else {
          // Keep alive signal received. Do nothing.
        }
      }
    }).on('err', (error) => {
      if (error.code !== 'ECONNRESET') {
        console.log(error.code);
        res.status(500).end();
        process.exit(1);
      } else {
        // This reconnection logic will attempt to reconnect when a disconnection is detected.
        // To avoid rate limits, this logic implements exponential back-off, so the wait time
        // will increase if the client cannot reconnect to the stream.
        setTimeout(() => {
          console.warn('A connection error occurred. Reconnecting...')
          streamConnect(++retryAttempt);
        }, 2 ** retryAttempt);
      }
    });

    // End response and abort stream when client disconnects
    req.on('close', () => {
      res.end();
      stream.abort();
    });
  }

  streamConnect(0);
}

module.exports = {
  get,
}
