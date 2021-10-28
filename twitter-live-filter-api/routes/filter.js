const express = require('express');
const router = express.Router();
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const needle = require('needle');
const RedisClustr = require('redis-clustr');
const RedisClient = require('redis');

const redis = new RedisClustr({
  servers: [
    {
      host: process.env.REDIS_CLUSTER_HOST,
      port: process.env.REDIS_CLUSTER_PORT
    }
  ],
  createClient: (port, host) => {
    // this is the default behaviour
    return RedisClient.createClient(port, host);
  }
});

//connect to redis
redis.on("connect", () => {});

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
      const stream = needle.get(process.env.STREAM_API_URL);
      let dataCounter = 0;
      let match = false;
      let filteredTweet = '';

      stream.on('data', (data) => {
        try {
          const tweet = JSON.parse(data);
          const tokenizedTweet = tokenizer.tokenize(tweet.data.text);

          // Check if tweet text contains any of the queries
          tokenizedTweet.forEach((word) => {
            if (queries.indexOf(word) !== -1) {
              // Save matching words in response tweet object
              if (tweet.data.matches && tweet.data.matches.indexOf(word) !== -1) {
                tweet.data.matches.push(word);
              } else {
                tweet.data.matches = [word];
              }

              // Save matching tweets in cache
              redis.set(word, tweet, (err, reply) => {
                if (err) console.log(err);
                console.log(reply);
              });

              match = true;
            }
          })

          if (match) filteredTweet = tweet;

          if (dataCounter === 0) {
            res.statusCode = 200;
            res.set({
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'text/plain; charset=utf-8',
            });
          }

          if (filteredTweet) {
            res.write(JSON.stringify(filteredTweet)); // Write data to response.
          }

          retryAttempt = 0; // A successful connection resets retry count.
          dataCounter++;
          match = false;
          filteredTweet = '';
        } catch (err) {
          // Keep alive signal received. Do nothing.
        }
      }).on('err', (err) => {
        if (err.code !== 'ECONNRESET') {
          console.log(err.code);
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
