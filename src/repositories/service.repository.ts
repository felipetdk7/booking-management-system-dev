import { Service } from "../domain/entities";
import { IServiceRepository } from "./interfaces";

export class ServiceRepository implements IServiceRepository {
  private services = new Map<string, Service>();

  findById(id: string): Service | undefined {
    return this.services.get(id);
  }

  save(service: Service): Service {
    this.services.set(service.id, service);
    return service;
  }

  findAll(): Service[] {
    return Array.from(this.services.values());
  }
}
