// src/calendar-settings/calendar-settings.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarSettings } from './calendar-settings.entity';
import { UpdateCalendarSettingsDto } from './dto';

@Injectable()
export class CalendarSettingsService {
  private readonly settingsId = 'main_calendar_settings';

  constructor(
    @InjectRepository(CalendarSettings)
    private settingsRepository: Repository<CalendarSettings>,
  ) {}

  async getSettings(): Promise<CalendarSettings> {
    let settings = await this.settingsRepository.findOneBy({
      id: this.settingsId,
    });

    if (!settings) {
      // If no settings exist, create and return default ones.
      settings = this.settingsRepository.create({
        id: this.settingsId,
        defaultClassDuration: 60,
        studioTimezone: 'America/New_York',
        weekStartDay: 0,
        terms: [],
        rooms: [],
      });
      await this.settingsRepository.save(settings);
    }
    return settings;
  }

  async updateSettings(
    updateDto: UpdateCalendarSettingsDto,
  ): Promise<CalendarSettings> {
    const settings = await this.getSettings(); // Ensures settings exist

    // The DTO has the full shape of what can be updated.
    // We can merge it directly.
    const updatedSettings = this.settingsRepository.merge(settings, updateDto);

    return this.settingsRepository.save(updatedSettings);
  }
}
