// backend/studio/studio.module.ts
import { Module, forwardRef } from '@nestjs/common'; // <-- 1. Importa forwardRef
import { TypeOrmModule } from '@nestjs/typeorm';
import { Studio } from './studio.entity';
import { StudioService } from './studio.service';
import { StudioController } from './studio.controller';
import { SettingsModule } from '../settings/settings.module'; // <-- 2. Importa SettingsModule

@Module({
  imports: [
    TypeOrmModule.forFeature([Studio]),
    forwardRef(() => SettingsModule), // <-- 3. Añade el módulo con forwardRef
  ],
  providers: [StudioService],
  controllers: [StudioController],
  exports: [StudioService],
})
export class StudioModule {}
