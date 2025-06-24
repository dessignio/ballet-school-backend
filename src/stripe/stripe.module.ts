// src/stripe/stripe.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { Student } from 'src/student/student.entity';
import { MembershipPlanDefinitionEntity } from 'src/membership-plan/membership-plan.entity';

@Module({
  imports: [
    // ========= ¡AQUÍ ESTÁ LA CORRECCIÓN! =========
    // Debes registrar TODAS las entidades cuyos repositorios vas a inyectar en este módulo.
    // StripeService necesita tanto Student como MembershipPlanDefinitionEntity.
    TypeOrmModule.forFeature([Student, MembershipPlanDefinitionEntity]),
    // ===========================================
  ],
  controllers: [StripeController],
  providers: [StripeService],
  // Exportamos el servicio si otros módulos necesitan usarlo
  exports: [StripeService],
})
export class StripeModule {}
