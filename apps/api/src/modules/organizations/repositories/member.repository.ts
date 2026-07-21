import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { MemberRepositoryInterface, MemberWithUser } from './member-repository.interface';
import { Member, OrgRole } from '@aiops-hub/db';

@Injectable()
export class MemberRepository implements MemberRepositoryInterface {
  constructor(private prisma: PrismaService) {}

  async findMembership(userId: string, organizationId: string): Promise<Member | null> {
    return this.prisma.member.findFirst({
      where: { userId, organizationId, deletedAt: null },
    });
  }

  async findMembersByOrganization(organizationId: string): Promise<MemberWithUser[]> {
    return this.prisma.member.findMany({
      where: { organizationId, deletedAt: null },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    }) as Promise<MemberWithUser[]>;
  }

  async findMemberById(memberId: string, organizationId: string): Promise<MemberWithUser | null> {
    return this.prisma.member.findFirst({
      where: { id: memberId, organizationId, deletedAt: null },
      include: { user: { select: { id: true, email: true, name: true } } },
    }) as Promise<MemberWithUser | null>;
  }

  async findOwner(organizationId: string): Promise<Member | null> {
    return this.prisma.member.findFirst({
      where: { organizationId, role: OrgRole.OWNER, deletedAt: null },
    });
  }

  async countOwners(organizationId: string): Promise<number> {
    return this.prisma.member.count({
      where: { organizationId, role: OrgRole.OWNER, deletedAt: null },
    });
  }

  async updateRole(memberId: string, role: OrgRole): Promise<Member> {
    return this.prisma.member.update({
      where: { id: memberId },
      data: { role },
    });
  }

  async removeMember(memberId: string): Promise<Member> {
    return this.prisma.member.update({
      where: { id: memberId },
      data: { deletedAt: new Date() },
    });
  }

  async transferOwnershipTx(
    _organizationId: string,
    fromMemberId: string,
    toMemberId: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.member.update({
        where: { id: fromMemberId },
        data: { role: OrgRole.MEMBER },
      }),
      this.prisma.member.update({
        where: { id: toMemberId },
        data: { role: OrgRole.OWNER },
      }),
    ]);
  }
}
