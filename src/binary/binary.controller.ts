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
  async payBinary(@Body() body: { registerUserId: string; points: number }) {
    if (!body.registerUserId) throw new Error('registerUserId required');
    if (!body.points) throw new Error('points required');
    return this.binaryService.increaseBinaryPoints(
      body.registerUserId,
      body.points,
    );
  }

  @Post('/fixPoints')
  async fixPoints() {
    const users = await db.collection('users').get();

    for (const u of users.docs) {
      const left_points = await u.ref.collection('left-points').get();
      const right_points = await u.ref.collection('right-points').get();

      for (const l of left_points.docs) {
        await u.ref.collection('points').add({
          side: 'left',
          points: l.get('points'),
          user_id: l.get('user_id'),
          created_at: new Date(),
        });
      }
      for (const l of right_points.docs) {
        await u.ref.collection('points').add({
          side: 'right',
          points: l.get('points'),
          user_id: l.get('user_id'),
          created_at: new Date(),
        });
      }
    }
  }
}
