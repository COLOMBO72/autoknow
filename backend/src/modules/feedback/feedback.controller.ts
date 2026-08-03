import { Body, Controller, Post } from '@nestjs/common';
import { FeedbackService, FeedbackType } from './feedback.service';

interface CreateFeedbackDto {
  userId?: string;
  carVariantId?: string;
  type: FeedbackType;
  message: string;
  contactInfo?: string;
}

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post()
  create(@Body() dto: CreateFeedbackDto) {
    return this.feedback.create(dto);
  }
}
