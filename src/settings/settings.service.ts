/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateStripeSettingsDto } from './dto/update-settings.dto';
import { StripeSettings } from '../stripe/stripe-settings.entity';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly envFilePath = path.resolve(process.cwd(), '.env');

  constructor(
    private configService: ConfigService,
    @InjectRepository(StripeSettings)
    private stripeSettingsRepository: Repository<StripeSettings>,
  ) {}

  async getStripeSettings(studioId: string) {
    const settings = await this.stripeSettingsRepository.findOneBy({
      studioId,
    });
    if (!settings) {
      // Return default or throw an error if settings are expected to exist
      return {
        publicKey: this.configService.get<string>('STRIPE_PUBLIC_KEY'), // Public key can still be global
        enrollmentProductId: null,
        enrollmentPriceId: null,
        auditionProductId: null,
        auditionPriceId: null,
      };
    }
    return {
      publicKey: this.configService.get<string>('STRIPE_PUBLIC_KEY'), // Public key can still be global
      enrollmentProductId: settings.enrollmentProductId,
      enrollmentPriceId: settings.enrollmentPriceId,
      auditionProductId: settings.auditionProductId,
      auditionPriceId: settings.auditionPriceId,
    };
  }

  async updateStripeSettings(
    dto: UpdateStripeSettingsDto,
    studioId: string,
  ): Promise<void> {
    this.logger.log(
      `Attempting to update Stripe settings for studio ${studioId}`,
    );
    let settings = await this.stripeSettingsRepository.findOneBy({ studioId });

    if (!settings) {
      settings = this.stripeSettingsRepository.create({ studioId });
    }

    // Update fields from DTO
    if (dto.enrollmentProductId !== undefined)
      settings.enrollmentProductId = dto.enrollmentProductId;
    if (dto.enrollmentPriceId !== undefined)
      settings.enrollmentPriceId = dto.enrollmentPriceId;
    if (dto.auditionProductId !== undefined)
      settings.auditionProductId = dto.auditionProductId;
    if (dto.auditionPriceId !== undefined)
      settings.auditionPriceId = dto.auditionPriceId;

    await this.stripeSettingsRepository.save(settings);
    this.logger.log(
      `Stripe settings for studio ${studioId} updated successfully.`,
    );

    // No need to restart server for database changes
  }

  private triggerServerRestart(): void {
    const pm2ProcessName = this.configService.get<string>('PM2_PROCESS_NAME');

    if (!pm2ProcessName) {
      this.logger.warn(
        'PM2_PROCESS_NAME is not set in .env. Automatic restart will be skipped.',
      );
      return;
    }

    this.logger.log(
      `Settings changed. Triggering restart for PM2 process: ${pm2ProcessName}...`,
    );

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
