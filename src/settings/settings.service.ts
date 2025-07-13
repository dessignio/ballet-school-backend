// backend/settings/settings.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { UpdateStripeSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly envFilePath = path.resolve(process.cwd(), '.env');

  constructor(private configService: ConfigService) {}

  getStripeSettings() {
    return {
      publicKey: this.configService.get<string>('STRIPE_PUBLIC_KEY'),
      enrollmentProductId: this.configService.get<string>('STRIPE_ENROLLMENT_PRODUCT_ID'),
      enrollmentPriceId: this.configService.get<string>('STRIPE_ENROLLMENT_PRICE_ID'),
      auditionProductId: this.configService.get<string>('STRIPE_AUDITION_PRODUCT_ID'),
      auditionPriceId: this.configService.get<string>('STRIPE_AUDITION_PRICE_ID'),
    };
  }

  async updateStripeSettings(dto: UpdateStripeSettingsDto): Promise<void> {
    this.logger.log('Attempting to update .env file with new Stripe settings');
    try {
      let envFileContent = '';
      if (fs.existsSync(this.envFilePath)) {
        envFileContent = fs.readFileSync(this.envFilePath, 'utf8');
      }

      const settingsMap = {
        STRIPE_PUBLIC_KEY: dto.publicKey,
        STRIPE_ENROLLMENT_PRODUCT_ID: dto.enrollmentProductId,
        STRIPE_ENROLLMENT_PRICE_ID: dto.enrollmentPriceId,
        STRIPE_AUDITION_PRODUCT_ID: dto.auditionProductId,
        STRIPE_AUDITION_PRICE_ID: dto.auditionPriceId,
      };

      Object.entries(settingsMap).forEach(([key, value]) => {
        if (value !== undefined) { // Only update keys that are present in the DTO
          const keyRegex = new RegExp(`^${key}=.*$`, 'm');
          if (envFileContent.match(keyRegex)) {
            envFileContent = envFileContent.replace(keyRegex, `${key}=${value}`);
            this.logger.log(`Updated existing key: ${key}`);
          } else {
            envFileContent += `\n${key}=${value}`;
            this.logger.log(`Added new key: ${key}`);
          }
        }
      });

      fs.writeFileSync(this.envFilePath, envFileContent.trim());
      this.logger.log(
        '.env file updated successfully. Note: The application needs to be restarted for changes to take effect.',
      );
    } catch (error) {
      this.logger.error('Failed to write to .env file', error.stack);
      throw new Error('Failed to update settings file.');
    }
  }
}
