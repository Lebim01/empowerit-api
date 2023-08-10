/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  Post,
} from '@nestjs/common';
import { AppService } from './app.service';
import axios from 'axios';
import { db } from './firebase/index';
import {
  DocumentData,
  QuerySnapshot,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import * as dayjs from 'dayjs';
import { deleteUser } from 'firebase/auth';

class Node {
  data: any;
  left: any;
  right: any;

  constructor(data: any) {
    this.data = data;
    this.left = null;
    this.right = null;
  }
}

async function buildTreeFromFirestore(
  docs: any,
  rootId: string,
) {
  const queue = [new Node(docs[rootId])];

  let counter = 0;

  while (queue.length > 0) {
    const node = queue.shift();
    const docData = node.data;
    const leftDocId = docData.left_binary_user_id;
    const rightDocId = docData.right_binary_user_id;
    counter++;

    if (leftDocId) {
      queue.push(new Node(docs[leftDocId]));
    }
    if (rightDocId) {
      queue.push(new Node(docs[rightDocId]));
    }
  }

  return counter - 1;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('cryptoapisverifydomain')
  verifyDomain() {
    return 'cryptoapis-cb-3c5ed9409121d6814c3c7383372faefb3ed72ccc4775a42c56c49e92949fc616';
  }

  @Post('callbackPayment')
  async callbackPayment(@Body() body, @Headers() headers): Promise<any> {
    return axios
      .post('https://onconfirmedtransaction-mdx7upthia-uc.a.run.app', body, {
        headers: {
          'x-signature': headers['x-signature'],
        },
      })
      .then((r) => r.data);
  }

  @Post('callbackCoins')
  async callbackCoins(@Body() body, @Headers() headers): Promise<any> {
    return axios
      .post('https://onconfirmedcoins-mdx7upthia-uc.a.run.app', body, {
        headers: {
          'x-signature': headers['x-signature'],
        },
      })
      .then((r) => r.data);
  }

  @Post('createPaymentAddress')
  async create(@Body() body) {
    return axios
      .post('https://createpaymentaddress-mdx7upthia-uc.a.run.app', body)
      .then((r) => r.data);
  }

  @Get('getFees')
  async getFees() {
    return axios
      .get('https://getfees-mdx7upthia-uc.a.run.app')
      .then((r) => r.data);
  }

  @Post('callbackSendedCoins')
  async callbackSendedCoins(@Body() body, @Headers() headers): Promise<any> {
    return axios
      .post('https://onconfirmsendedcoins-mdx7upthia-uc.a.run.app', body, {
        headers: {
          'x-signature': headers['x-signature'],
        },
      })
      .then((r) => r.data);
  }

  @Post('execPayroll')
  async execPayroll(@Body() body) {
    return axios
      .post('https://payroll-mdx7upthia-uc.a.run.app')
      .then((r) => r.data);
  }
  
  @Post('sendEmail')
  async sendEmail(
    @Body('email') email: string,
    @Body('otp') otp: number
    ) {
    return this.appService.sendEmail(email,otp)
  }

  @Post('fix_counter')
  async fixCounter() {
    const users = await getDocs(collection(db, 'users'));
    const docs = {}
    const _users = [];
    for (const doc of users.docs) {
      const user = { id: doc.id, ...doc.data() };
      _users.push(user);

      docs[doc.id] = { id: doc.id, ...doc.data() };
    }
    console.log(users.size);

    const result = await Promise.all(
      _users.map(async (doc) => ({
        id: doc.id,
        name: doc.name,
        email: doc.email,
        count_direct_people: await getDocs(
          query(collection(db, 'users'), where('sponsor_id', '==', doc.id)),
        ).then((r) => r.size),
        count_underline_people: await buildTreeFromFirestore(docs, doc.id),
      })),
    );

    /*await Promise.all(
      result
        .filter(
          (r) => r.count_underline_people > 0,
        )
        .map(async (r) => {
          await setDoc(
            doc(db, `users/${r.id}`),
            {
              count_underline_people: r.count_underline_people,
            },
            {
              merge: true,
            },
          );
          console.log(r.id);
        }),
    );*/

    return result;
  }

  @Post('deleteUser')
  async deleteUser() {
    const ID_USER = 'RjDNBFmnPOUZhEZXsWUD53YXW3J2';
    const user = await getDoc(doc(db, 'users/' + ID_USER));
    const user_data = user.data();

    if (user_data.left_binary_user_id && user_data.right_binary_user_id) {
      throw new HttpException(
        'No se puede eliminar el usuario porque tiene usuarios de cada lado',
        500,
      );
    }

    const parent_id = user.data().parent_binary_user_id;
    const child_id = user_data[`${user_data.position}_binary_user_id`];

    console.log({
      parent_id,
      child_id,
    });

    // if(child_id){
    //   // setear el nuevo id del usuario de abajo al parent
    //   await updateDoc(doc(db, "users/" + parent_id), {
    //     [`${user_data.position}_binary_user_id`]: child_id
    //   })

    //   // setear el id del nuevo parent al usuario de abajo
    //   await updateDoc(doc(db, "users/" + child_id), {
    //     parent_binary_user_id: parent_id
    //   })
    // }else{
    //   // setear null {position}_binary_user_id para el parent
    //   await updateDoc(doc(db, "users/" + parent_id), {
    //     [`${user_data.position}_binary_user_id`]: null
    //   })
    // }

    // borrar documento

    // borrar auth user
    // await deleteUser(ID_USER);

    return 'borrado';
  }

  
}
