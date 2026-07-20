import { Module } from '@nestjs/common';
import { CommonAuthModule } from '../../common/auth/common-auth.module';
import { OrganizationsService } from './services/organizations.service';
import { OrganizationsController } from './controllers/organizations.controller';
import { OrganizationRepository } from './repositories/organization.repository';
import { ORGANIZATION_REPOSITORY_TOKEN } from './repositories/organization-repository.interface';
import { MemberRepository } from './repositories/member.repository';
import { MEMBER_REPOSITORY_TOKEN } from './repositories/member-repository.interface';
import { InvitationsService } from './services/invitations.service';
import { InvitationsController } from './controllers/invitations.controller';
import { InvitationRepository } from './repositories/invitation.repository';
import { INVITATION_REPOSITORY_TOKEN } from './repositories/invitation-repository.interface';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [CommonAuthModule, UsersModule],
  controllers: [OrganizationsController, InvitationsController],
  providers: [
    OrganizationsService,
    InvitationsService,
    {
      provide: ORGANIZATION_REPOSITORY_TOKEN,
      useClass: OrganizationRepository,
    },
    {
      provide: MEMBER_REPOSITORY_TOKEN,
      useClass: MemberRepository,
    },
    {
      provide: INVITATION_REPOSITORY_TOKEN,
      useClass: InvitationRepository,
    },
  ],
  exports: [
    OrganizationsService,
    InvitationsService,
    ORGANIZATION_REPOSITORY_TOKEN,
    MEMBER_REPOSITORY_TOKEN,
    INVITATION_REPOSITORY_TOKEN,
  ],
})
export class OrganizationsModule {}
