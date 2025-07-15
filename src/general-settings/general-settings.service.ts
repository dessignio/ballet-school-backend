// src/general-settings/general-settings.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeneralSettings } from './general-settings.entity';
import { UpdateGeneralSettingsDto } from './dto/update-general-settings.dto';
import { AdminUser } from 'src/admin-user/admin-user.entity';

@Injectable()
export class GeneralSettingsService {
  constructor(
    @InjectRepository(GeneralSettings)
    private settingsRepository: Repository<GeneralSettings>,
  ) {}

  async getSettings(user: Partial<AdminUser>): Promise<GeneralSettings> {
    const studioId = user.studioId;
    if (!studioId) {
        throw new BadRequestException('User is not associated with a studio.');
    }

    let settings = await this.settingsRepository.findOneBy({
      studioId: studioId,
    });

    if (!settings) {
      settings = this.settingsRepository.create({
        studioId: studioId,
        academyName: 'My Dance Studio',
        contactEmail: 'contact@example.com',
        contactPhone: '123-456-7890',
        address: { street: '', city: '', state: '', zipCode: '' },
        logoUrl: '',
        businessHours: [],
      });
      await this.settingsRepository.save(settings);
    }
    return settings;
  }

  async updateSettings(
    updateDto: UpdateGeneralSettingsDto,
    user: Partial<AdminUser>,
  ): Promise<GeneralSettings> {
    const studioId = user.studioId;
    if (!studioId) {
        throw new BadRequestException('User is not associated with a studio.');
    }

    const settings = await this.settingsRepository.findOneBy({
      studioId: studioId,
    });

    if (!settings) {
      const newSettings = this.settingsRepository.create({
        studioId: studioId,
        ...updateDto,
      });
      return this.settingsRepository.save(newSettings);
    } else {
      const updatedSettings = this.settingsRepository.merge(
        settings,
        updateDto,
      );
      return this.settingsRepository.save(updatedSettings);
    }
  }
}
