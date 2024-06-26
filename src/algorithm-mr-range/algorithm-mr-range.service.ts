import { HttpStatus, Injectable } from '@nestjs/common';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from 'src/firebase';
import { db as admin } from '../firebase/admin';

@Injectable()
export class AlgorithmMrRangeService {
  async isAvailableLicenseById(license_id: string) {
    try {
      const q = query(
        collection(db, 'algorithm-license-history'),
        where('licenseId', '==', license_id),
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('No matching documents found.');
        return {
            message: 'License ID not found',
            status: HttpStatus.NOT_FOUND,
          };
      }

      let documentData = null;
      querySnapshot.forEach((doc) => {
        documentData = {
            licenseId: doc.data().licenseId,  
            isActive: doc.data().expires_at.seconds > new Date().getTime() / 1000 ? true : false,
            userAlgorithmId: doc.data().algorithmId
        };
      });

      return documentData;
    } catch (error) {
      console.log(error);
    }
  }


  async updateEmail() {
    try {
      const licences = await admin
      .collection('algorithm-license-history')
      .get()

      for (const doc of licences.docs){
        let email = ''
        if(doc.get('userId')){
          const userRef = await admin
          .collection('users')
          .doc(doc.get('userId'))
          .get()
          const email = await userRef.get('email')
          await doc.ref.update({
            email
          })
        }
      }
    } catch (error) {
      console.log(error)
    }
  }
}
