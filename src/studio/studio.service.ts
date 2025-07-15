// backend/studio/studio.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Studio } from './studio.entity';

@Injectable()
export class StudioService {
  constructor(
    @InjectRepository(Studio)
    private studioRepository: Repository<Studio>,
  ) {}

  // Basic service methods will be added here later
  // e.g., findById, create, updateStripeAccountId, etc.
}
