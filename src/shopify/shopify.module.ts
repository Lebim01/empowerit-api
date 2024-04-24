import { Module } from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import { ShopifyController } from './shopify.controller';
import { BinaryService } from 'src/binary/binary.service';

@Module({
  providers: [ShopifyService],
  controllers: [ShopifyController, BinaryService],
})
export class ShopifyModule {}
