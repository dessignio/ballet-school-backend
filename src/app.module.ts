import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Controladores y Servicios Principales
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Módulos de tu Aplicación
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
import { StripeModule } from './stripe/stripe.module';
import { PaymentModule } from './payment/payment.module'; // Added PaymentModule
import { InvoiceModule } from './invoice/invoice.module'; // Added InvoiceModule

// ========= ¡AQUÍ ESTÁ TU BLOQUE DE IMPORTACIÓN DE ENTIDADES! =========
import { Student } from './student/student.entity';
import { Announcement } from './announcement/announcement.entity';
import { ClassOffering } from './class-offering/class-offering.entity';
import { ScheduledClassSlot } from './scheduled-class-slot/scheduled-class-slot.entity';
import { Absence } from './absence/absence.entity';
import { SchoolEvent } from './school-event/school-event.entity';
import { Instructor } from './instructor/instructor.entity';
import { Role } from './role/role.entity';
import { AdminUser } from './admin-user/admin-user.entity';
import { Program } from './program/program.entity';
import { Enrollment } from './enrollment/enrollment.entity';
import { AttendanceRecord } from './attendance/attendance.entity';
import { MembershipPlanDefinitionEntity } from './membership-plan/membership-plan.entity';
import { Payment } from './payment/payment.entity'; // Added Payment Entity
import { Invoice } from './invoice/invoice.entity'; // Added Invoice Entity

@Module({
  imports: [
    // Módulo de Configuración para leer variables de entorno (.env)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Módulo de TypeORM configurado de forma asíncrona y segura
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),

        // ========= ¡AQUÍ ESTÁ TU LISTA DE ENTIDADES! =========
        entities: [
          Student,
          Announcement,
          ClassOffering,
          ScheduledClassSlot,
          Absence,
          SchoolEvent,
          Instructor,
          Role,
          AdminUser,
          Program,
          Enrollment,
          AttendanceRecord,
          MembershipPlanDefinitionEntity,
          Payment, // Added Payment Entity
          Invoice, // Added Invoice Entity
        ],

        // Sincroniza la base de datos.
        // ADVERTENCIA: En producción, es más seguro usar migraciones.
        // Para este entorno, forzamos la sincronización para crear las tablas faltantes.
        synchronize: true,

        // Activa SSL para la conexión a la base de datos solo en producción.
        ssl:
          configService.get<string>('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),

    // Lista completa de todos tus módulos
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
    StripeModule,
    PaymentModule, // Added PaymentModule
    InvoiceModule, // Added InvoiceModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
