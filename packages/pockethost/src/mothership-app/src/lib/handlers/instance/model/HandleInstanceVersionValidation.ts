import { versions } from '$util/versions'

export const HandleInstanceVersionValidation = (e: core.ModelEvent) => {
  const dao = e.dao || $app.dao()

  const version = e.model.get('version')
  if (!versions.includes(version)) {
    throw new BadRequestError(
      `Invalid version ${version}. Version must be one of: ${versions.join(
        ', ',
      )}`,
    )
  }
}
