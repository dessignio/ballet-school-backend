import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
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
    let changesMade = false;
    try {
      let envFileContent = '';
      if (fs.existsSync(this.envFilePath)) {
        envFileContent = fs.readFileSync(this.envFilePath, 'utf8');
      }
      const originalContent = envFileContent;

      const settingsMap = {
        STRIPE_PUBLIC_KEY: dto.publicKey,
        STRIPE_ENROLLMENT_PRODUCT_ID: dto.enrollmentProductId,
        STRIPE_ENROLLMENT_PRICE_ID: dto.enrollmentPriceId,
        STRIPE_AUDITION_PRODUCT_ID: dto.auditionProductId,
        STRIPE_AUDITION_PRICE_ID: dto.auditionPriceId,
      };

      Object.entries(settingsMap).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const keyRegex = new RegExp(`^${key}=.*$`, 'm');
          if (envFileContent.match(keyRegex)) {
            envFileContent = envFileContent.replace(keyRegex, `${key}=${value}`);
          } else {
            envFileContent += `\n${key}=${value}`;
          }
        }
      });
      
      if (originalContent !== envFileContent) {
        changesMade = true;
        fs.writeFileSync(this.envFilePath, envFileContent.trim());
        this.logger.log('.env file updated successfully.');
      } else {
        this.logger.log('No changes detected in settings. Skipping file write and restart.');
      }

    } catch (error) {
      this.logger.error('Failed to write to .env file', error.stack);
      throw new Error('Failed to update settings file.');
    }

    if (changesMade) {
      this.triggerServerRestart();
    }
  }

  private triggerServerRestart(): void {
    const pm2ProcessName = this.configService.get<string>('PM2_PROCESS_NAME');

    if (!pm2ProcessName) {
      this.logger.warn(
        'PM2_PROCESS_NAME is not set in .env. Automatic restart will be skipped.',
      );
      return;
    }

    this.logger.log(`Settings changed. Triggering restart for PM2 process: ${pm2ProcessName}...`);

    exec(`pm2 restart ${pm2ProcessName}`, (error, stdout, stderr) => {
      if (error) {
        this.logger.error(`Failed to restart PM2 process: ${error.message}`);
        return;
      }
      if (stderr) {
        this.logger.error(`Error during PM2 restart: ${stderr}`);
        return;
      }
      this.logger.log(`PM2 restart command executed successfully: ${stdout}`);
    });
  }
}