import { Controller, Get, Param } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('brands')
  getBrands() {
    return this.catalog.getBrandModelCatalog();
  }

  @Get(':brand/:model/variants')
  async getVariants(@Param('brand') brand: string, @Param('model') model: string) {
    return this.catalog.getKnownVariants(brand, model);
  }
}
