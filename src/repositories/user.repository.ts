import { User } from "../domain/entities";
import { IUserRepository } from "./interfaces";

export class UserRepository implements IUserRepository {
  private users = new Map<string, User>();

  findById(id: string): User | undefined {
    return this.users.get(id);
  }

  save(user: User): User {
    this.users.set(user.id, user);
    return user;
  }

  findAll(): User[] {
    return Array.from(this.users.values());
  }
}
