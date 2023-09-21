import { db } from '@/firebase/admin';
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

  @Post('/add-points')
  async addPoints(
    @Body() body: { userId: string; points: number; side: 'left' | 'right' },
  ) {
    for (let i = 0; i < body.points; i += 100) {
      await db
        .collection('users')
        .doc(body.userId)
        .collection(`${body.side}-points`)
        .add({
          points: 100,
          name: 'added',
          user_id: null,
        });
    }
  }
}
