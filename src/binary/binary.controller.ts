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

  @Post('/fixPoints')
  async fixPoints() {
    const users = await db.collection('users').get();

    for (const u of users.docs) {
      const left_points_docs = await u.ref.collection('left-points').get();
      const right_points_docs = await u.ref.collection('right-points').get();

      let left_points = 0;
      let right_points = 0;

      for (const l of left_points_docs.docs) {
        left_points += l.get('points');
      }
      for (const l of right_points_docs.docs) {
        right_points += l.get('points');
      }

      await u.ref.update({
        left_points,
        right_points,
      });
    }
  }
}
