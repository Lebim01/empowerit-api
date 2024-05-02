import { Controller, Post, Body, Get } from '@nestjs/common';

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

  /*
  volver a subir left-points y right-points

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
  }*/

  @Post('/fixUnderlinePeople')
  async fixUnderlinePeople() {
    const users = await db
      .collection('users')
      .orderBy('created_at', 'asc')
      .get();

    const snapshot = await db.collection('users').get();

    const docs: any = {};
    snapshot.docs.forEach((doc: any) => {
      docs[doc.id] = { id: doc.id, ...doc.data() };
    });

    for (const u of users.docs) {
      const left_people = await this.binaryService.getPeopleTree(
        u.get('left_binary_user_id'),
        docs,
      );
      const right_people = await this.binaryService.getPeopleTree(
        u.get('right_binary_user_id'),
        docs,
      );

      console.log('left', left_people.length);
      console.log('right', right_people.length);

      await u.ref.update({
        count_underline_people: left_people.length + right_people.length,
      });

      const batch = db.batch();
      for (const user_id of left_people) {
        batch.set(u.ref.collection('left-people').doc(user_id), {
          user_id,
          created_at: new Date(),
        });
      }
      for (const user_id of right_people) {
        batch.set(u.ref.collection('right-people').doc(user_id), {
          user_id,
          created_at: new Date(),
        });
      }
      await batch.commit();
    }
  }

  @Get('checkNotFound')
  checkNotFound() {
    return this.binaryService.checkBinary();
  }
}
