const express = require('express');
const router = express.Router();
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const needle = require('needle');

/* GET Twitter stream filtered. */
router.get('/', async (req, res, next) => {
  const { query1, query2, query3, ...remaining } = req.query;

  if (!query1 && !query2 && !query3) {
    return res.status(400).json({ Error: 'Minimum of 1 query required.' });
  } else if (
    (!query1) ||
    (query1 && !query2 && query3)
  ) {
    return res.status(400).json({ Error: 'Invalid query format.' });
  } else {
    function streamConnect(retryAttempt, queries) {
      const stream = needle.get(process.env.STREAM_API_URL, {
        headers: {
          "User-Agent": "v2SampleStreamJS",
          "Authorization": `Bearer ${process.env.BEARER_TOKEN}`
        },
        timeout: 20000
      });
      let filteredTweet = '';
      let dataCounter = 0;

      stream.on('data', (data) => {
        try {
          const tweet = JSON.parse(data);
          // Check if tweet text contains any of the queries
          if (tokenizer.tokenize(tweet.data.text).filter((word) => queries.indexOf(word) !== -1).length > 0) {
            filteredTweet = tweet;
          }
          if (filteredTweet) {
            res.write(JSON.stringify(filteredTweet)); // Write data to response.
          }
          if (dataCounter === 0) {
            res.statusCode = 200;
            res.set({
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'text/plain; charset=utf-8',
            });
          }
          retryAttempt = 0; // A successful connection resets retry count.
          dataCounter++;
          filteredTweet = '';
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

    streamConnect(
      0,
      [query1, query2, query3]
        .filter((query) => !!query)
        .map((query) => query.trim())
    );
  }
});

module.exports = router;
