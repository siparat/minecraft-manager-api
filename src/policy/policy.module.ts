import { Module } from '@nestjs/common';
import { PolicyController } from './policy.controller';
import { PolicyService } from './policy.service';
import { PolicyRepository } from './repositories/policy.repository';
import { DatabaseModule } from 'src/database/database.module';

@Module({ imports: [DatabaseModule], controllers: [PolicyController], providers: [PolicyService, PolicyRepository] })
export class PolicyModule {}
