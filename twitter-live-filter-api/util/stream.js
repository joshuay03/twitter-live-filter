const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const { Transform } = require('stream');
const redisClient = require('./redis');

function createTransformationStream(queries) {
    return new Transform({
        transform(chunk, encoding, callback) {
            let filteredTweet = '';
            let match = false; 
            try {                
                let tweet = JSON.parse(chunk);    
                let tokenizedTweet = tokenizer.tokenize(tweet.data.text);    

                // Check if tweet text contains any of the queries
                tokenizedTweet.forEach((word) => {
                    if (queries.indexOf(word) !== -1) {
                        // Save matching tweets in cache

                        // Given a search parameter, I.e., dog, if the tweet contains the parameter 
                        // it should be stored in redis and S3. Each paramater will be a key in storage,
                        // with its value being a list of associated tweets. 
                        //redisClient.setInCache(word, tweet);

                        return match = true;
                    }
                })

                if (match) filteredTweet = JSON.stringify(tweet);
            } catch (err) {
                // Various encoding/decoding issues with the tweets due to special characters.
                // As such, we shoud keep the signal alive and do nothing.
            }
            return callback(null, match ? filteredTweet : undefined);
        },
    });
}

module.exports = createTransformationStream; 