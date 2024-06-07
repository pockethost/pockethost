type ServiceMap = {
  [serviceName: string]: unknown
}

export class IoCManager<M extends ServiceMap = {}> {
  private services: Map<string, any> = new Map()

  register<K extends keyof M>(key: K, instance: M[K]): void
  register<T = unknown>(key: string, instance: T): void
  register(key: string, instance: any): void {
    if (this.services.has(key)) {
      throw new Error(`Service with key '${key}' already registered.`)
    }
    this.services.set(key, instance)
  }

  // For known services
  service<K extends keyof M>(key: K): M[K]
  // For unknown services with explicit type
  service<T = unknown>(key: string): T
  service(key: string): any {
    const service = this.services.get(key)
    if (!service) {
      throw new Error(`No service registered with key '${key}'.`)
    }
    return service
  }
}

/*

// Use IoC Manager
const ioc = new IoCManager();

ioc.register("logger", new Logger());
ioc.register("database", new Database());

const loggerService = ioc.service<Logger>("logger");
loggerService.log("This is a log message.");

const databaseService = ioc.service<Database>("database");
databaseService.connect();

*/
