const express = require('express');
const router = express.Router();
const needle = require('needle');
const { pipeline, PassThrough } = require('stream');
const { promisify } = require('util');
const _pipeline = promisify(pipeline);
const redis = require('redis');

const createFilterStream = require('../util/filterStream');
const twitterStream = needle.get(process.env.STREAM_API_URL);
twitterStream.on('err', (err) => {
    console.log(err);
    // should attempt reconnect
});

const redisClient = redis.createClient({
  host: process.env.REDIS_CLUSTER_HOST,
  port: process.env.REDIS_CLUSTER_PORT,
});
const bucket = require('../util/aws');

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

    // Check for pre-existing data in redis and S3 and write to response stream
    queries.forEach(v => {
      redisClient.get(v, (err, result) => {
        if (result) {
          resultJSON = JSON.parse(result);
          resultJSON.tweets.forEach((tweet) => {
            res.write(JSON.stringify(tweet));
          })
        } else {
          bucket.getObject(v)
            .then(result => {
                resultJSON = JSON.parse(result.Body.toString('utf-8'));
                resultJSON.tweets.forEach((tweet) => {
                  res.write(JSON.stringify(tweet));
                });
            })
            .catch((err) => {
              if (err.code !== 'NoSuchKey') {
                console.log(err)
              }
            });
        }
      })
    });

    const filterStream = createFilterStream(queries);
    // Necessary to avoid twitterStream being destroyed
    // when a single client prematurely disconnects.
    const dataStream = new PassThrough();
    twitterStream.pipe(dataStream).on('err', (err) => console.log(err));

    // pipeline automatically destroys streams on error or once completed.
    _pipeline(dataStream, filterStream, res)
      .catch((error) => {
        if (error.code === 'ERR_STREAM_PREMATURE_CLOSE') {
          console.log('Error: The client has prematurely ended the stream...');
        } else console.log(error);
      });
  }
});

module.exports = router;
