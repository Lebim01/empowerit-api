import { Controller, Post, Body } from '@nestjs/common';

import { BinaryService } from 'src/binary/binary.service';
import { db } from 'src/firebase/admin';

@Controller('binary')
export class BinaryController {
  constructor(private readonly binaryService: BinaryService) {}

  @Post('/match-points')
  async matchPoints(@Body() body: { userId: string }) {
    await this.binaryService.matchBinaryPoints(body.userId);
    return { success: true, message: 'Points matched successfully.' };
  }

  @Post('/pay')
  async payBinary(@Body() body: { registerUserId: string }) {
    if (!body.registerUserId) throw new Error('registerUserId required');
    return this.binaryService.increaseBinaryPoints(body.registerUserId);
  }

  @Post('/pay')
  async fixPoints() {
    const users = await db.collection('users').get();

    for (const u of users.docs) {
      const left_points = await u.ref.collection('left-points').get();
      const right_points = await u.ref.collection('right-points').get();

      for (const l of left_points.docs) {
        l.ref.update({
          points: 100,
        });
      }
      for (const l of right_points.docs) {
        l.ref.update({
          points: 100,
        });
      }
    }
  }
}
