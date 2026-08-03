import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type FeedbackType = 'INCORRECT_DATA' | 'SUGGESTION' | 'SUPPORT' | 'OTHER';

interface CreateFeedbackInput {
  userId?: string;
  carVariantId?: string;
  type: FeedbackType;
  message: string;
  contactInfo?: string;
}

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateFeedbackInput) {
    return this.prisma.feedback.create({ data: input });
  }
}
