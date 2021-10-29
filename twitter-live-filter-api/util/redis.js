const RedisClustr = require('redis-clustr');
const redis = require('redis');

function createRedisClient(port, host) {
    return new RedisClustr({
        servers: [
            {
                host: process.env.REDIS_CLUSTER_HOST,
                port: process.env.REDIS_CLUSTER_PORT
            }
        ],
        createClient: (port, host) => {
            // this is the default behaviour
            return redis.createClient(port, host);
        }
    });
}

class RedisClient {
    constructor(port, host) {
        this._client = createRedisClient(port, host);          

        this._client.on('connect', () => { });

        this._client.on('error', (err) => {
            console.log("Error: " + err);
        });
    }

    get client() {
        return this._client; 
    }

    getFromCache(key) {
        return this._client.get(key, function (err, reply) {
            if (err) console.log(err);
            // will be null if nothing found
            return reply;
        });
    }

    setInCache(key, value) {
        this._client.set(key, value, (err, reply) => {
            if (err) console.log(err);
            console.log(reply);
        });
    }
}

const redisClient = new RedisClient(process.env.REDIS_CLUSTER_PORT, process.env.REDIS_CLUSTER_HOST); 

module.exports = redisClient; 