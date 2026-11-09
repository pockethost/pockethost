import { StringKvLookup } from '$util/Logger'

export const error = (fieldName: string, slug: string, description: string, extra?: StringKvLookup) =>
  new ApiError(500, description, {
    [fieldName]: new ValidationError(slug, description),
    ...extra,
  })
