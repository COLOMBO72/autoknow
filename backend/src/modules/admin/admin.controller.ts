import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ReportBlockType } from '@prisma/client';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';

interface TopupByEmailDto {
  email: string;
  amountKopeks: number;
}

interface UpdateBlockDto {
  content: string; // сырой JSON текстом — так его удобно редактировать в textarea на фронте
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

  @Get('car-variants/search')
  searchCarVariants(@Query('q') q: string) {
    return this.admin.searchCarVariants(q ?? '');
  }

  @Get('car-variants/:id/blocks')
  getCarVariantBlocks(@Param('id') id: string) {
    return this.admin.getCarVariantBlocks(id);
  }

  @Put('car-variants/:id/blocks/:type')
  updateCarVariantBlock(@Param('id') id: string, @Param('type') type: ReportBlockType, @Body() dto: UpdateBlockDto) {
    return this.admin.updateCarVariantBlock(id, type, dto.content);
  }

  @Post('topup-by-email')
  topupByEmail(@Body() dto: TopupByEmailDto) {
    return this.admin.topupByEmail(dto.email, dto.amountKopeks);
  }
}
