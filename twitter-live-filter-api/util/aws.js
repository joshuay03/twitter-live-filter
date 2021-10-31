AWS = require('aws-sdk');

class Bucket {
    constructor(s3, bucketName) {
        this.s3 = s3;
        this.bucketName = bucketName;

        s3.createBucket({ Bucket: this.bucketName }, (err, data) => {
            if (err) {
                if (err.code === 'BucketAlreadyOwnedByYou') {
                    console.log(`The bucket '${this.bucketName}' already exists.`);
                }
                else console.log(err);
            }
            else console.log(data);
        });
    }

    uploadObject(key, object) {
        let uploadParams = {
            Bucket: this.bucketName,
            ContentType: 'application/JSON',
            Key: key,
            Body: object
        };
        const promise = s3.upload(uploadParams).promise();
        return promise;
    }

    // Returns an object as a byte stream.
    getObject(key) {
        const getParams = { Bucket: this.bucketName, Key: key }
        const promise = s3.getObject(getParams).promise();
        return promise;
    }
}

// Create S3 service object
const s3 = new AWS.S3({ apiVersion: process.env.S3_API_VERSION });

const bucketName = process.env.S3_BUCKET_NAME;

const bucket = new Bucket(s3, bucketName);

module.exports = bucket;