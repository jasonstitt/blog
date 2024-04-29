import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront'
import { readFile } from 'fs/promises'
import path from 'path'
import mime from 'mime'
import { v4 as uuidv4 } from 'uuid'
import bluebird from 'bluebird'
import glob from 'glob'

const baseDir = 'build'
const bucketName = process.env.BUCKET_NAME

async function putFile (filepath) {
  const key = filepath.endsWith('.html') && filepath !== 'index.html' ? filepath.slice(0, -5) : filepath
  const contentType = mime.getType(filepath) || 'text/plain'
  const body = await readFile(path.join(baseDir, filepath))
  const s3 = new S3Client({})
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType
  })
  console.log('copy:', key)
  await s3.send(command)
}

async function pruneObjects (filepaths) {
  const lookup = new Set(filepaths)
  const s3 = new S3Client({})
  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: '_app/'
  })
  const data = await s3.send(command)
  const objects = data.Contents?.map(obj => obj.Key) || []
  const toDelete = objects.filter(obj => !lookup.has(obj))
  await bluebird.map(toDelete, async key => {
    console.log('delete:', key)
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key
      })
    )
  })
}

async function invalidateCache () {
  const cf = new CloudFrontClient({})
  const command = new CreateInvalidationCommand({
    DistributionId: process.env.DISTRIBUTION_ID,
    InvalidationBatch: {
      CallerReference: uuidv4(),
      Paths: {
        Quantity: 1,
        Items: ['/*']
      }
    }
  })
  await cf.send(command)
}

async function main () {
  try {
    const files = glob.sync('**/*', { nodir: true, cwd: baseDir })
    await bluebird.map(files, putFile, { concurrency: 20 })
    await pruneObjects(files)
    await invalidateCache()
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

main()
