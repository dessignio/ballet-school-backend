// Reemplaza tu src/app.module.ts con esto:

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Importa tus Módulos de funcionalidades
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StudentModule } from './student/student.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { ClassOfferingModule } from './class-offering/class-offering.module';
import { AbsenceModule } from './absence/absence.module';
import { ScheduledClassSlotModule } from './scheduled-class-slot/scheduled-class-slot.module';
import { SchoolEventModule } from './school-event/school-event.module';
import { InstructorModule } from './instructor/instructor.module';
import { RoleModule } from './role/role.module';
import { AdminUserModule } from './admin-user/admin-user.module';
import { ProgramModule } from './program/program.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { AttendanceModule } from './attendance/attendance.module';
import { MembershipPlanModule } from './membership-plan/membership-plan.module';

// ¡No necesitas importar las entidades aquí si ya están exportadas en sus respectivos módulos!

@Module({
  imports: [
    // 1. Módulo de Configuración para leer variables de entorno
    ConfigModule.forRoot({
      isGlobal: true, // Hace que esté disponible en toda la app
    }),

    // 2. Módulo de TypeORM configurado de forma asíncrona y segura
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: parseInt(process.env.DB_PORT || '5432', 10), // Asegúrate de que DB_PORT sea string o '5432'
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        autoLoadEntities: true, // Esto carga automáticamente las entidades de los módulos importados
        synchronize: configService.get<string>('NODE_ENV') !== 'production', // Sincroniza solo si no es producción
        ssl:
          configService.get<string>('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false, // Activa SSL solo en producción
      }),
    }),

    // 3. ¡La lista completa de todos tus módulos!
    StudentModule,
    AnnouncementModule,
    ClassOfferingModule,
    AbsenceModule,
    ScheduledClassSlotModule,
    SchoolEventModule,
    InstructorModule,
    RoleModule,
    AdminUserModule,
    ProgramModule,
    EnrollmentModule,
    AttendanceModule,
    MembershipPlanModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
