import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CryptoapisService } from 'src/cryptoapis/cryptoapis.service';

@Module({
  controllers: [CartController],
  providers: [CartService, CryptoapisService],
})
export class CartModule {}
