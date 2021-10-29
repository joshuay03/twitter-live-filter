const express = require('express');
const router = express.Router();
const needle = require('needle');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);
const createTransformationStream = require('../util/stream');

/* GET Twitter stream filtered. */
router.get('/', (req, res, next) => {
  const queries = Object.values(req.query);

  if (queries.length === 0) {
    return res.status(400).json({ Error: 'Minimum of 1 query required.' });
  } else {
    res.statusCode = 200;
    res.set({
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/plain; charset=utf-8',
    });

    const streamConnect = (retryAttempt) => {
      const twitterStream = needle.get(process.env.STREAM_API_URL);
      const transformationStream = createTransformationStream(queries);

      pipelineAsync(twitterStream, transformationStream, res) 
        .catch((err) => {
          // Incase of client disconnect 
          if (err.code === 'ERR_STREAM_PREMATURE_CLOSE') {
            twitterStream.abort();
            transformationStream.destroy();
          } else if (err.code === 'ECONNRESET') {
            // This reconnection logic will attempt to reconnect when a disconnection is detected.
            // To avoid rate limits, this logic implements exponential back-off, so the wait time
            // will increase if the client cannot reconnect to the stream.
            setTimeout(() => {
              console.warn('A connection error occurred. Reconnecting...')
              streamConnect(++retryAttempt);
            }, 2 ** retryAttempt);
          } else {
            console.log(err.code);
            res.status(500).end();
            process.exit(1);
          }
      });    

      // End response and abort stream when client disconnects
      req.on('close', () => {
        res.end();
        twitterStream.abort();
      });
    }

    streamConnect(0);
  }
});

module.exports = router;
