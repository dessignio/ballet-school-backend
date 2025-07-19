/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
// En tu archivo: src/studio/studio.controller.ts

import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { StripeService } from '../stripe/stripe.service'; // Asegúrate de que la ruta sea correcta
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('studios')
@UseGuards(JwtAuthGuard) // Protege todas las rutas de este controlador
export class StudioController {
  // 1. Inyecta el StripeService para poder usarlo
  constructor(private readonly stripeService: StripeService) {}

  // 2. Añade el endpoint que faltaba para obtener el estado de la cuenta de Stripe
  @Get(':studioId/stripe-status')
  async getStripeAccountStatus(
    @Param('studioId', ParseUUIDPipe) studioId: string,
  ) {
    // Llama a una nueva función en el servicio de Stripe que crearemos en el siguiente paso
    return this.stripeService.getStudioStripeStatus(studioId);
  }
}
