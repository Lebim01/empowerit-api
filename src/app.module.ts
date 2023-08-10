import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CryptoapisModule } from './cryptoapis/cryptoapis.module';

@Module({
  imports: [CryptoapisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
