import { Module } from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import { ShopifyController } from './shopify.controller';
import { BinaryService } from 'src/binary/binary.service';
import { UsersService } from 'src/users/users.service';

@Module({
  providers: [ShopifyService, BinaryService, UsersService],
  controllers: [ShopifyController],
})
export class ShopifyModule {}
