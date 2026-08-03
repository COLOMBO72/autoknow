import { Module } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";
import { CarContextProvider } from "./car-context.provider";
import { UsersModule } from "../users/users.module";
import { CatalogModule } from "../catalog/catalog.module";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [UsersModule, CatalogModule, AiModule],
  controllers: [ReportsController],
  providers: [ReportsService, CarContextProvider],
  exports: [ReportsService],
})
export class ReportsModule {}
