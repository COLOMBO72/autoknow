import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });

  // Раздаём загруженные вручную фото машин напрямую — без отдельного
  // облачного хранилища, файлы лежат прямо на VPS в uploads/.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`autoknow-engine запущен на порту ${port}`);
}

bootstrap();
