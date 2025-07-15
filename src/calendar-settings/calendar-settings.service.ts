// src/calendar-settings/calendar-settings.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalendarSettings } from './calendar-settings.entity';
import { UpdateCalendarSettingsDto } from './dto';
import { AdminUser } from 'src/admin-user/admin-user.entity';

@Injectable()
export class CalendarSettingsService {
  constructor(
    @InjectRepository(CalendarSettings)
    private settingsRepository: Repository<CalendarSettings>,
  ) {}

  async getSettings(user: Partial<AdminUser>): Promise<CalendarSettings> {
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
    user: Partial<AdminUser>,
  ): Promise<CalendarSettings> {
    const settings = await this.getSettings(user);

    const updatedSettings = this.settingsRepository.merge(settings, updateDto);

    return this.settingsRepository.save(updatedSettings);
  }
}
