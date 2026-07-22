import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProviderConfigDto } from './create-provider-config.dto';

export class UpdateProviderConfigDto extends PartialType(
  OmitType(CreateProviderConfigDto, ['provider'] as const),
) {}
