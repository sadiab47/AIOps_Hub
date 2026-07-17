import { User, Prisma } from '@aiops-hub/db';

export const USER_REPOSITORY_TOKEN = 'UserRepositoryInterface';

export interface UserRepositoryInterface {
  create(data: Prisma.UserCreateInput): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  update(id: string, data: Prisma.UserUpdateInput): Promise<User>;
  updateLastLogin(userId: string): Promise<User>;
}
