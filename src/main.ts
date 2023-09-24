import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as Sentry from '@sentry/node';
import { SentryFilter } from './sentry/sentry.filter';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.tz.setDefault('America/Mexico_City');

async function bootstrap() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENV,
    enabled: true,
    debug: true,
  });

  const app = await NestFactory.create(AppModule, {
    cors: true,
  });

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryFilter(httpAdapter));

  await app.listen(8080);
}
bootstrap();
