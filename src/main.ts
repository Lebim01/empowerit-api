import dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isoWeek from 'dayjs/plugin/isoWeek';

async function bootstrap() {
  dayjs.extend(utc);
  dayjs.extend(timezone);
  dayjs.extend(isoWeek);
  dayjs.locale({
    name: 'es-ES',
    weekStart: 7,
  } as any);

  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  await app.listen(8080);
}

bootstrap();
