import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProspectService } from './prospect.service';
import { ProspectController } from './prospect.controller';
import { Prospect } from './prospect.entity';
import { StudentModule } from 'src/student/student.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Prospect]),
    StudentModule,
    NotificationModule,
  ],
  controllers: [ProspectController],
  providers: [ProspectService],
})
export class ProspectModule {}
