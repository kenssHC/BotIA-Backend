import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';
import { KnowledgeService } from './knowledge.service';

@Module({
  imports: [ConfigModule],
  controllers: [LlmController],
  providers: [LlmService, KnowledgeService],
  exports: [LlmService, KnowledgeService],
})
export class LlmModule {}
