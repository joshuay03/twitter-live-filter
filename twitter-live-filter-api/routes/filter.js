const express = require('express');
const router = express.Router();
const needle = require('needle');
const { pipeline, PassThrough } = require('stream');
const { promisify } = require('util');
const _pipeline = promisify(pipeline);

const createFilterStream = require('../util/filterStream');
const twitterStream = needle.get(process.env.STREAM_API_URL);
twitterStream.on('err', (err) => {
    console.log(err);
    // should attempt reconnect
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

    // Check for pre-existing data in S3 and write to response stream
    queries.forEach(v => {
        bucket.getObject(v)
            .then(result => {
                res.write(result.Body);
            }).catch(err => console.log(err));
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
