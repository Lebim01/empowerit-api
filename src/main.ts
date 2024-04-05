import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as Sentry from '@sentry/node';
import { SentryFilter } from './sentry/sentry.filter';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isoWeek from 'dayjs/plugin/isoWeek';

async function bootstrap() {
  /*Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENV,
    enabled: true,
    debug: true,
  });*/

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

  const { httpAdapter } = app.get(HttpAdapterHost);
  //app.useGlobalFilters(new SentryFilter(httpAdapter));

  await app.listen(8080);
}
bootstrap();
