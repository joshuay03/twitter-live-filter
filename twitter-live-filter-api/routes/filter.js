const express = require('express');
const router = express.Router();
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);
const got = require('got');

const filterStream =  new stream.Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
        // should we pass this chunk onto the next stream in the pipeline
        let take;
        try {
            // This is where we'd implement nltk for filtering.
            take = true;
        } catch (e) {
            return callback(e);
        }
        return callback(null, take ? chunk : undefined);
    },
});

/* GET Twitter stream filtered. */
router.get('/', async (req, res, next) => {
    if (Object.keys(req.query).length > 3) {
        return res.status(400).json({ Error: 'There is a maximum of three tags.' });
    } else {
        const readStream = got.stream('http://localhost:3001/stream');

        req.on('end', () => res.end())
            .on('pause', () => readStream.pause())
            .on('resume', () => readStream.resume());

        readStream.on('error', (error) => console.log(error));

        pipeline(readStream, res)
            .catch((error) => console.log(error));
    }
});

module.exports = router;
