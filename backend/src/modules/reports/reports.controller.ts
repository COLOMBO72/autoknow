import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReportsService, CarVariantInput } from './reports.service';
import { UsersService } from '../users/users.service';

interface PurchaseReportDto {
  userId: string;
  car: CarVariantInput;
}

interface CompareDto {
  userId: string;
  cars: CarVariantInput[];
}

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  @Post('purchase')
  async purchase(@Body() dto: PurchaseReportDto) {
    const carVariant = await this.reports.findOrCreateCarVariant(dto.car);
    const alreadyPurchased = await this.reports.hasPurchased(dto.userId, carVariant.id);

    if (!alreadyPurchased) {
      const price = Number(this.config.getOrThrow('REPORT_PRICE_KOPEKS'));
      await this.users.debit(dto.userId, price, 'REPORT_PURCHASE');
      await this.reports.recordPurchase(dto.userId, carVariant.id);
    }

    const result = await this.reports.getOrGenerateReport(dto.car);
    return { ...result, alreadyOwned: alreadyPurchased };
  }

  @Post('compare')
  async compare(@Body() dto: CompareDto) {
    const maxCars = Number(this.config.get('COMPARISON_MAX_CARS') ?? 5);
    if (dto.cars.length < 2 || dto.cars.length > maxCars) {
      throw new BadRequestException(`Сравнение доступно от 2 до ${maxCars} машин`);
    }

    // Для сравнения должны быть куплены (или куплены сейчас) ВСЕ машины —
    // это осознанное продуктовое решение из обсуждения монетизации.
    const results = [];
    for (const car of dto.cars) {
      results.push(await this.purchase({ userId: dto.userId, car }));
    }

    await this.reports.saveComparison(
      dto.userId,
      results.map((r) => r.carVariantId),
    );
    return { comparisons: results };
  }
}
