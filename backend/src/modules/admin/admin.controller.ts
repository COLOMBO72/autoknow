import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { mkdirSync } from "fs";
import { ReportBlockType } from "@prisma/client";
import { AdminService } from "./admin.service";
import { AdminGuard } from "./admin.guard";

interface TopupByEmailDto {
  email: string;
  amountKopeks: number;
}

interface UpdateBlockDto {
  content: string; // сырой JSON текстом — так его удобно редактировать в textarea на фронте
}

const UPLOAD_DIR = join(process.cwd(), "uploads", "cars");

@UseGuards(AdminGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("stats")
  getStats() {
    return this.admin.getStats();
  }

  @Get("purchases/recent")
  getRecentPurchases(@Query("limit") limit?: string) {
    return this.admin.getRecentPurchases(limit ? Number(limit) : 50);
  }

  @Get("ai-health")
  getAiHealth() {
    return this.admin.getAiHealth();
  }

  @Get("feedback")
  getFeedback(@Query("limit") limit?: string) {
    return this.admin.getFeedback(limit ? Number(limit) : 50);
  }

  @Get("car-variants/search")
  searchCarVariants(@Query("q") q: string) {
    return this.admin.searchCarVariants(q ?? "");
  }

  @Get("car-variants/:id/blocks")
  getCarVariantBlocks(@Param("id") id: string) {
    return this.admin.getCarVariantBlocks(id);
  }

  @Put("car-variants/:id/blocks/:type")
  updateCarVariantBlock(
    @Param("id") id: string,
    @Param("type") type: ReportBlockType,
    @Body() dto: UpdateBlockDto,
  ) {
    return this.admin.updateCarVariantBlock(id, type, dto.content);
  }

  @Post("topup-by-email")
  topupByEmail(@Body() dto: TopupByEmailDto) {
    return this.admin.topupByEmail(dto.email, dto.amountKopeks);
  }

  @Post("car-variants/:id/photo")
  @UseInterceptors(
    FileInterceptor("photo", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync(UPLOAD_DIR, { recursive: true });
          cb(null, UPLOAD_DIR);
        },
        filename: (req, file, cb) =>
          cb(null, `${req.params.id}${extname(file.originalname)}`),
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
          return cb(
            new BadRequestException("Нужен файл изображения (jpg/png/webp)"),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 МБ
    }),
  )
  uploadPhoto(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.admin.setCarVariantPhoto(id, `/uploads/cars/${file.filename}`);
  }
  @Post("car-variants/:id/regenerate")
  regenerate(@Param("id") id: string) {
    return this.admin.regenerateCarVariant(id);
  }
}
