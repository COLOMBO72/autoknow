import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';

interface TopupByEmailDto {
  email: string;
  amountKopeks: number;
}

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  getStats() {
    return this.admin.getStats();
  }

  @Get('purchases/recent')
  getRecentPurchases(@Query('limit') limit?: string) {
    return this.admin.getRecentPurchases(limit ? Number(limit) : 50);
  }

  @Get('ai-health')
  getAiHealth() {
    return this.admin.getAiHealth();
  }

  @Get('feedback')
  getFeedback(@Query('limit') limit?: string) {
    return this.admin.getFeedback(limit ? Number(limit) : 50);
  }

  @Post('topup-by-email')
  topupByEmail(@Body() dto: TopupByEmailDto) {
    return this.admin.topupByEmail(dto.email, dto.amountKopeks);
  }
}
