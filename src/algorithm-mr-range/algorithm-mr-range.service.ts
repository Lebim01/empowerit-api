import { HttpStatus, Injectable } from '@nestjs/common';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from 'src/firebase';

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
}
