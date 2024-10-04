type ServiceMap = {
  [serviceName: string]: unknown
}

const services: ServiceMap = {}

export const ioc = <T = unknown>(serviceName: string, register?: T): T => {
  if (register) {
    if (serviceName in services) {
      throw new Error(`Service with key '${serviceName}' already registered.`)
    }
    services[serviceName] = register
  }
  if (!(serviceName in services)) {
    throw new Error(`Service with key '${serviceName}' not found.`)
  }
  return services[serviceName] as T
}
