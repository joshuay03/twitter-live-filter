const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const { Transform } = require('stream');
const bucket = require('../util/aws');

const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');

function createFilterStream(queries) {
    return new Transform({
        transform(chunk, encoding, callback) {
            let filteredTweet = '';
            let match = false;
            try {
                let tweet = JSON.parse(chunk);
                let tokenizedTweet = tokenizer.tokenize(tweet.data.text);

                // Check if tweet text contains any of the queries
                for (let word of tokenizedTweet) {
                    if (queries.indexOf(word) !== -1) {
                        tweet.data.matches = word;

                        const score = analyzer.getSentiment(tokenizedTweet);
                        tweet.data.sentimentScore = score;

                        // Store in S3
                        bucket
                            .uploadObject(word, tweet)
                            .catch(err => console.log(err));

                        filteredTweet = JSON.stringify(tweet);

                        match = true;
                        break;
                    }
                }
            } catch (err) {
                // Various encoding/decoding issues with the tweets due to special characters.
                // As such, we should keep the signal alive and do nothing.
            }

            return callback(null, match ? filteredTweet : undefined);
        },
    });
}

module.exports = createFilterStream;