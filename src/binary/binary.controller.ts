import { Controller, Post, Body } from '@nestjs/common';

import { BinaryService } from 'src/binary/binary.service';

@Controller('binary')
export class BinaryController {
  constructor(private readonly binaryService: BinaryService) {}

  @Post('/match-points')
  async matchPoints(@Body() body: { userId: string }) {
    await this.binaryService.matchBinaryPoints(body.userId);
    return { success: true, message: 'Points matched successfully.' };
  }
}
