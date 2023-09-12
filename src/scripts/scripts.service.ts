import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  collectionGroup,
  deleteDoc,
  getCountFromServer,
  query,
} from 'firebase/firestore';
import { db } from '../firebase';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class ScriptsService {
  constructor(private readonly userService: UsersService) {}

  async deleteExpiredPoints() {
    const currentDate = dayjs();

    // Busca todos los documentos en las subcolecciones 'left-points' y 'right-points'
    for (const subcollection of ['left-points', 'right-points']) {
      const pointsRef = collectionGroup(db, subcollection);

      const allPoints = await getDocs(pointsRef);

      for (const pointDoc of allPoints.docs) {
        const data = pointDoc.data();

        if (data.starts_at) {
          const startPointDate = dayjs(data.starts_at.toDate());
          const diffInDays = currentDate.diff(startPointDate, 'day');

          if (diffInDays > 84) {
            await deleteDoc(pointDoc.ref);
            console.log(`Deleted expired point with ID: ${pointDoc.id}`);
          }
        }
      }
    }
  }

  async getDuplicatedPayroll() {
    const res = await getDocs(collectionGroup(db, 'profits_details'));
    const docs: any[] = res.docs.map((r) => ({
      id: r.id,
      ...r.data(),
      path: r.ref.path,
    }));

    const repeat = [];

    for (const _doc of docs) {
      if (
        docs.find(
          (r) =>
            r.id != _doc.id && r.id_user == _doc.id_user && r.type == _doc.type,
        )
      ) {
        repeat.push(_doc);
      }
    }

    return repeat;
  }
}
