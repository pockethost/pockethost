import { PH_PROJECT_ROOT } from '$constants'
import { LoggerService } from '$src/shared'
import Dockerode from 'dockerode'
import { join } from 'path'

export async function buildImage(
  dockerFileName: string,
  imageName: string,
): Promise<void> {
  const { dbg, info } = LoggerService()
    .create('buildImage')
    .breadcrumb(imageName)
    .breadcrumb(dockerFileName)

  const docker = new Dockerode()

  info(`Creating Docker iamge`)
  const stream = await docker.buildImage(
    {
      context: join(PH_PROJECT_ROOT(), 'src', 'services', 'PocketBaseService'),
      src: [dockerFileName],
    },
    { t: imageName },
  )
  await new Promise((resolve, reject) => {
    docker.modem.followProgress(stream, (err, res) =>
      err ? reject(err) : resolve(res),
    )
  })
  info(`Image created`)
}
