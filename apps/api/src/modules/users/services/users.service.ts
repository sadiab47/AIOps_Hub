import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { USER_REPOSITORY_TOKEN, UserRepositoryInterface } from '../repositories/user-repository.interface';
import { User, Prisma } from '@aiops-hub/db';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private userRepository: UserRepositoryInterface,
  ) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }
    return this.userRepository.create(data);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }
}
