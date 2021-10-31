const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const { Transform } = require('stream');
const bucket = require('../util/aws');
const redis = require('redis');

const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
const redisClient = redis.createClient({
    host: process.env.REDIS_CLUSTER_HOST,
    port: process.env.REDIS_CLUSTER_PORT,
  });

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
                        if (tweet.data.matches) {
                            if (!tweet.data.matches.includes(word)) {
                                tweet.data.matches.push(word);
                            }
                        } else {
                            tweet.data.matches = [word];
                        }

                        const score = analyzer.getSentiment(tokenizedTweet);
                        tweet.data.sentimentScore = score;

                        filteredTweet = JSON.stringify(tweet);

                        // Check if results for this query exist in cache
                        redisClient.get(word, (err, result) => {
                            if (result) {
                                // Update the result
                                result = JSON.parse(result);
                                result.tweets.push(tweet);

                                redisClient.setex(word, 300, JSON.stringify(result));
                            } else {
                                // Create new entry
                                redisClient.setex(word, 300, JSON.stringify({
                                    tweets: [tweet],
                                }));
                            }
                        })

                        // Check if results for this query exist in S3
                        bucket
                            .getObject(word, (result) => {
                                // Update the result
                                result = JSON.parse(result.Body);
                                result.tweets.push(tweet);
                                bucket.uploadObject(word, JSON.stringify(result));
                            })
                            .catch((e) => {
                                if (e.code === 'NoSuchKey') {
                                    bucket.uploadObject(word, JSON.stringify({
                                        tweets: [tweet],
                                    }));
                                }
                            })

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