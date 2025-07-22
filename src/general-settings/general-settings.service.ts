// src/general-settings/general-settings.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeneralSettings } from './general-settings.entity';
import { UpdateGeneralSettingsDto } from './dto/update-general-settings.dto';

@Injectable()
export class GeneralSettingsService {
  private readonly settingsId = 'current_settings';

  constructor(
    @InjectRepository(GeneralSettings)
    private settingsRepository: Repository<GeneralSettings>,
  ) {}

  async getSettings(): Promise<GeneralSettings> {
    let settings = await this.settingsRepository.findOneBy({
      id: this.settingsId,
    });

    // If no settings exist, create a default one and return it
    if (!settings) {
      settings = this.settingsRepository.create({
        id: this.settingsId,
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
  ): Promise<GeneralSettings> {
    const settings = await this.settingsRepository.findOneBy({
      id: this.settingsId,
    });

    if (!settings) {
      // If for some reason settings don't exist, create them
      const newSettings = this.settingsRepository.create({
        id: this.settingsId,
        ...updateDto,
      });
      return this.settingsRepository.save(newSettings);
    } else {
      // Merge and save existing settings
      const updatedSettings = this.settingsRepository.merge(
        settings,
        updateDto,
      );
      return this.settingsRepository.save(updatedSettings);
    }
  }
}
