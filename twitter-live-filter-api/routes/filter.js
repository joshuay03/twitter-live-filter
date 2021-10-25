const express = require('express');
const router = express.Router();
const { promisify } = require('util'); 
const stream = require('stream');
const pipeline = promisify(stream.pipeline);
const got = require('got');

/* GET Twitter stream filtered. */
router.get('/', async (req, res, next) => {
    if (Object.keys(req.query).length > 3) {
        return res.status(400).json({ Error: 'There is a maximum of three tags.' });
    } else {
        const readStream = got.stream('http://localhost:3001/stream');       
        
        req.on('end', () => res.end())
            .on('pause', () => readStream.pause())
            .on('resume', () => readStream.resume());

        readStream.on('data', (data) => {
            try {
                const stringifiedJSONData = JSON.stringify(JSON.parse(data));
                console.log(stringifiedJSONData);
            } catch (error) { console.log(error); }                       
        }).on('error', (error) => console.log(error));

        pipeline(readStream, res)
            .catch((error) => console.log(error));        
    }    
});

module.exports = router;
