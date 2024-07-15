import { Controller, Post, Body, Get } from '@nestjs/common';
import dayjs from 'dayjs';

import { BinaryService } from 'src/binary/binary.service';
import { db } from 'src/firebase/admin';
//

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

  /* @Post('fixBinaryPoints')
  async fixBinaryPoints(){
    return this.binaryService.fixBinaryPoints()
  } */

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
      .get()
      .then((r) =>
        r.docs.map((doc) => ({
          id: doc.id,
          left_binary_user_id: doc.get('left_binary_user_id'),
          right_binary_user_id: doc.get('right_binary_user_id'),
        })),
      );

    const docs: any = {};
    users.forEach((doc: any) => {
      docs[doc.id] = doc;
    });

    for (const u of users) {
      console.log(u.id);
      const left_people = await this.binaryService.getPeopleTree(
        u.left_binary_user_id,
        docs,
      );
      const right_people = await this.binaryService.getPeopleTree(
        u.right_binary_user_id,
        docs,
      );

      console.log('left', left_people.length);
      console.log('right', right_people.length);

      const ref = db.collection('users').doc(u.id);
      await ref.update({
        count_underline_people: left_people.length + right_people.length,
      });

      const batch = db.batch();
      for (const user_id of left_people) {
        batch.set(ref.collection('left-people').doc(user_id), {
          user_id,
          created_at: new Date(),
        });
      }
      for (const user_id of right_people) {
        batch.set(ref.collection('right-people').doc(user_id), {
          user_id,
          created_at: new Date(),
        });
      }
      await batch.commit();
    }
    return 'miembros de organizacion actualizado'
  }
  @Post('fixDirectMembers')
  fixDirectMembers(){
    return this.binaryService.fixDirectPeople();
  }
  @Get('checkNotFound')
  checkNotFound() {
    return this.binaryService.checkBinary();
  }

  @Get('fixParent')
  async fixParent() {
    const users = await db
      .collection('users')
      .where('membership', '!=', null)
      .where('parent_binary_user_id', '==', null)
      .orderBy('created_at', 'asc')
      .get();

    for (const u of users.docs) {
      if (u.get('sponsor_id')) {
        console.log(u.id);
        console.log(u.get('sponsor_id'), u.get('position'));
        const { parent_id } =
          await this.binaryService.calculatePositionOfBinary(
            u.get('sponsor_id'),
            u.get('position'),
          );
        console.log(u.id, parent_id || 'no_parent');
        if (parent_id) {
          await u.ref.update({
            parent_binary_user_id: parent_id,
          });
          await db
            .collection('users')
            .doc(parent_id)
            .update({
              [`${u.get('position')}_binary_user_id`]: u.id,
            });
        }
      }
    }
  }
}
