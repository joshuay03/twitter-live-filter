const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const { Transform } = require('stream');
const bucket = require('../util/aws');

function createFilterStream(queries) {
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
                        if (tweet.data.matches && tweet.data.matches.indexOf(word) !== -1) {
                            tweet.data.matches.push(word);
                        } else {
                            tweet.data.matches = [word];
                        }

                        filteredTweet = JSON.stringify(tweet);

                        bucket.uploadObject(word, filteredTweet)
                            .catch(err => console.log(err));

                        return match = true;
                    }
                })
            } catch (err) {
                // Various encoding/decoding issues with the tweets due to special characters.
                // As such, we shoud keep the signal alive and do nothing.
            }
            return callback(null, match ? filteredTweet : undefined);
        },
    });
}

module.exports = createFilterStream; 