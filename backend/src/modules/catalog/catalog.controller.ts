import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CatalogService } from './catalog.service';

interface ResolveFreeTextDto {
  text: string;
}

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('brands')
  async getBrands() {
    return this.catalog.getBrandModelCatalog();
  }

  @Get(':brand/:model/variants')
  async getVariants(@Param('brand') brand: string, @Param('model') model: string) {
    return this.catalog.getKnownVariants(brand, model);
  }

  // Строже, чем /reports/preview — свободный текст легче спамить, чем
  // выбор из готового списка.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('resolve-freetext')
  async resolveFreeText(@Body() dto: ResolveFreeTextDto) {
    return this.catalog.resolveFreeText(dto.text);
  }
}
