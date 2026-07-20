import { Module } from '@nestjs/common';
import { CommonAuthModule } from '../../common/auth/common-auth.module';
import { OrganizationsService } from './services/organizations.service';
import { OrganizationsController } from './controllers/organizations.controller';
import { OrganizationRepository } from './repositories/organization.repository';
import { ORGANIZATION_REPOSITORY_TOKEN } from './repositories/organization-repository.interface';
import { MemberRepository } from './repositories/member.repository';
import { MEMBER_REPOSITORY_TOKEN } from './repositories/member-repository.interface';

@Module({
  imports: [CommonAuthModule],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    {
      provide: ORGANIZATION_REPOSITORY_TOKEN,
      useClass: OrganizationRepository,
    },
    {
      provide: MEMBER_REPOSITORY_TOKEN,
      useClass: MemberRepository,
    },
  ],
  exports: [
    OrganizationsService,
    ORGANIZATION_REPOSITORY_TOKEN,
    MEMBER_REPOSITORY_TOKEN,
  ],
})
export class OrganizationsModule {}
