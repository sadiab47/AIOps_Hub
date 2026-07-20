import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { MemberRepositoryInterface } from './member-repository.interface';
import { Member } from '@aiops-hub/db';

@Injectable()
export class MemberRepository implements MemberRepositoryInterface {
  constructor(private prisma: PrismaService) {}

  async findMembership(userId: string, organizationId: string): Promise<Member | null> {
    return this.prisma.member.findFirst({
      where: {
        userId,
        organizationId,
        deletedAt: null,
      },
    });
  }
}
