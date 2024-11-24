#!/usr/bin/env tsx
import PocketBase from 'pocketbase'
import {
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_URL,
} from './core'

import Bottleneck from 'bottleneck'
import { initIoc } from './cli/ioc'
import { MinioService } from './services/MinioService'

const main = async () => {
  await initIoc()

  const pb = new PocketBase(MOTHERSHIP_URL())

  await pb.admins.authWithPassword(
    MOTHERSHIP_ADMIN_USERNAME(),
    MOTHERSHIP_ADMIN_PASSWORD(),
  )

  const users = await pb
    .collection('verified_users')
    .getFullList({ fields: 'id', filter: 's3=null' })

  const minio = MinioService()

  const limiter = new Bottleneck({
    maxConcurrent: 50,
  })
  await Promise.all(
    users.map((user) =>
      limiter.schedule(async () => {
        const { secret } = await minio.addUser(user.id)
        await pb
          .collection('users')
          .update(user.id, { s3: { key: user.id, secret } })
        console.log(`Added user ${user.id} : ${secret}`)
      }),
    ),
  )
}

main().catch(console.error)
