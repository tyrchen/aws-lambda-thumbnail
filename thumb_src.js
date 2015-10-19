const AWS = require('aws-sdk')
const gm = require('gm').subClass({imageMagick: true})
const Promise = require('bluebird')
const util = require('util')

const MAX_WIDTH = 100
const MAX_HEIGHT = 100

const S3 = Promise.promisifyAll(new AWS.S3())

function resize_image(context, bucket, key, newKey, imageType) {
  console.log(bucket, key, newKey, imageType);
  S3.getObjectAsync({
    Bucket: bucket,
    Key: key
  }).then(response => {
    console.log(response.ContentType)
    return new Promise((res, rej) => {
      gm(response.Body).size(function(err, size) {
        const scalingFactor = Math.min(MAX_WIDTH / size.width, MAX_HEIGHT / size.height)
        const width = scalingFactor * size.width
        const height = scalingFactor * size.height
        const self = this;
        self.resize(width, height).toBuffer(imageType, (err, buffer) => {
          if (err) {
            rej(err);
          } else {
            console.log(buffer)
            res({contentType: response.ContentType, data: buffer});
          }
        })
      })
    })
  }).then(response => S3.putObjectAsync({
    Bucket: bucket,
    Key: newKey,
    Body: response.data,
    ContentType: response.contentType
  })).then(info => {
    console.log('succeeded!', info)
    context.done()
  }).catch(err => {
    if (err) {
      console.error(`unable to resize ${bucket}/${key} and upload to ${bucket}/${newKey}, err:`, err)
    }
  })
}

export function handler(event, context) {
  console.log('Reading options from event:\n', util.inspect(event, {depth: 5}))
  const e = event.Records[0].s3
  const bucket = e.bucket.name
  const srcKey = decodeURIComponent(e.object.key.replace(/\+/g, ' '))
  const dstKey = srcKey.replace(/^images/, 'thumbnails')
  console.log(`srcKey: ${srcKey}, dstKey: ${dstKey}`)
  const typeMatch = srcKey.match(/\.([^.]*)$/)
  if (!typeMatch) {
    console.error(`unable to infer image type for key ${srcKey}`)
    return
  }

  const imageType = typeMatch[1];
  if (imageType != 'jpg' && imageType != 'png') {
    console.log(`skipping non-image ${srcKey}`)
    return
  }
  resize_image(context, bucket, srcKey, dstKey, imageType)
}
