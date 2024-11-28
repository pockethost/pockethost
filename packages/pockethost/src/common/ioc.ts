type ServiceMap = {
  [serviceName: string]: {
    service: any
    stack?: string
  }
}

const services: ServiceMap = {}

export const ioc = <T = unknown>(serviceName: string, register?: T): T => {
  if (register) {
    if (serviceName in services) {
      throw new Error(
        `Service with key '${serviceName}' already registered. First registered: ${services[serviceName]!.stack}`,
      )
    } else {
      services[serviceName] = { service: register, stack: new Error().stack }
    }
  }
  if (!(serviceName in services)) {
    throw new Error(`Service with key '${serviceName}' not found.`)
  }
  return services[serviceName]!.service as T
}
