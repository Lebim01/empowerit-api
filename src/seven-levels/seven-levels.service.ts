import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { query } from 'express';
import { db } from 'src/firebase/admin';

const PERCENTAGE_7_LEVELS = [6, 4, 2, 2, 2, 2, 2];

@Injectable()
export class SevenLevelsService {
  async mainfunction(fileBuffer: Buffer) {
    // Crea un nuevo libro de trabajo de Excel
    const workbook = new ExcelJS.Workbook();

    // Lee el buffer del archivo Excel
    await workbook.xlsx.load(fileBuffer);

    // Accede a la primera hoja del libro de trabajo
    const worksheet = workbook.worksheets[0];

    //Utilizare este row porque no me sirve lo que viene en el row 1
    let cellRow = 2;

    // Recorre las filas y procesa los datos
    const data = [];
    const emailNotFounded = [];
    for (const row of worksheet.getRows(2, worksheet.rowCount - 1)) {
      const emailCell = worksheet.getCell(`G${cellRow}`).value?.toString();
      const accountCell = worksheet.getCell(`F${cellRow}`).value;
      const amountCell = worksheet.getCell(`H${cellRow}`).value;

      if (emailCell && accountCell && amountCell) {
        try {
          const usersRef = db.collection('users');
          const querySnapshot = await usersRef
            .where('email', '==', emailCell)
            .limit(1)
            .get();

          if (!querySnapshot.empty) {
            //Aqui va a ir mi funcion
            const getSevenSponsorsData = await this.getSevenSponsors(
              emailCell,
              Number(amountCell),
            );
            data.push({
              user_id: querySnapshot.docs[0].id,
              seven_levels_account: accountCell,
              email: emailCell,
              amount: amountCell,
              seven_level_sponsors: getSevenSponsorsData,
            });
          } else {
            emailNotFounded.push({
              email: emailCell,
              amount: Number(amountCell),
            });
          }
        } catch (error) {
          console.error('Error in Firebase query:', error);
        }
      }
      cellRow++;
    }

    // Aquí puedes hacer lo que necesites con los datos
    console.log('Datos del archivo Excel:', data);
    console.log('Emails no encontrados:', emailNotFounded);

    return {
      message: 'Archivo Excel procesado exitosamente',
      data,
      emailNotFounded,
    };
  }

  async getSevenSponsors(email: string, total: number) {
    try {
      const usersRef = await db.collection('users');
      const querySnapshot = await usersRef
        .where('email', '==', email)
        .limit(1)
        .get();
      let user_id;
      let sponsor_id;
      const sevenSponsorsData = [];
      if (!querySnapshot.empty) {
        user_id = querySnapshot.docs[0].id;
        for (let i = 0; i < 7; i++) {
          if (
            user_id !== '9CXMbcJt2sNWG40zqWwQSxH8iki2' ||
            sponsor_id !== '9CXMbcJt2sNWG40zqWwQSxH8iki2'
          ) {
            sponsor_id = await this.getSponsorId(user_id);
            const sponsor_email = await this.getEmailById(sponsor_id);
            sevenSponsorsData.push({
              user_id: sponsor_id,
              amount: Number(total * (PERCENTAGE_7_LEVELS[i] / 100)).toFixed(1),
              email: sponsor_email,
              percentage: PERCENTAGE_7_LEVELS[i],
            });
            user_id = sponsor_id;
          } else {
            sevenSponsorsData.push({
              user_id,
              amount: Number(total * (PERCENTAGE_7_LEVELS[i] / 100)).toFixed(1),
              email: 'empowerittopcorpo@gmail.com',
              percentage: PERCENTAGE_7_LEVELS[i],
            });
          }
        }
        return sevenSponsorsData;
      }
    } catch (error) {
      console.log('Error en la funcion de getSevenSponsors');
    }
  }
  //Una funcion que me traiga el sponsor
  async getSponsorId(user: string) {
    //buscar el usuario principal por id
    const userSnapshot = await db.collection('users').doc(user).get();
    //tomar el sponsorid
    const sponsor_id = await userSnapshot.get('sponsor_id');
    //retornar el sponsorid
    return sponsor_id;
  }
  async getEmailById(id: string) {
    const user = await db.collection('users').doc(id).get();
    const email = await user.get('email');
    return email;
  }
}
