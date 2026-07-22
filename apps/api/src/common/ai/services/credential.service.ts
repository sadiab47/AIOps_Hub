import { Injectable, BadRequestException } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { DecryptedCredentials } from '../types/ai-provider.interface';

@Injectable()
export class CredentialService {
  constructor(private readonly encryptionService: EncryptionService) {}

  /**
   * Encrypts clean JSON credentials into a stored payload string.
   */
  encryptCredentials(credentials: DecryptedCredentials): string {
    const json = JSON.stringify(credentials);
    return this.encryptionService.encrypt(json);
  }

  /**
   * Decrypts stored payload string back into clean DecryptedCredentials object.
   */
  decryptCredentials(encryptedPayload: string): DecryptedCredentials {
    const json = this.encryptionService.decrypt(encryptedPayload);
    try {
      return JSON.parse(json) as DecryptedCredentials;
    } catch {
      throw new BadRequestException('Malformed credential payload format');
    }
  }
}
