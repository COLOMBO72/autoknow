import { Module } from '@nestjs/common';
import { AI_PROVIDER } from './ai-provider.interface';
import { AggregatorAiProvider } from './aggregator-ai.provider';

@Module({
  providers: [{ provide: AI_PROVIDER, useClass: AggregatorAiProvider }],
  exports: [AI_PROVIDER],
})
export class AiModule {}
