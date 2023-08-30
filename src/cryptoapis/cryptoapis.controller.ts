import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { CryptoapisService } from './cryptoapis.service';
import { db } from '../firebase/admin';
import { firestore } from 'firebase-admin';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { UsersService } from 'src/users/users.service';
import {
  CallbackNewConfirmedCoins,
  CallbackNewUnconfirmedCoins,
} from './types';
import * as Sentry from '@sentry/node';
import { async } from 'rxjs';
import { Catch } from '@nestjs/common';

@Controller('cryptoapis')
export class CryptoapisController {
  constructor(
    private readonly cryptoapisService: CryptoapisService,
    private readonly subscriptionService: SubscriptionsService,
    private readonly usersService: UsersService,
  ) {}

  @Get('validateWallet')
  validateWallet(@Query('wallet') wallet: string) {
    return this.cryptoapisService.validateWallet(wallet);
  }

  /**
   * Transaccion confirmada
   * Cambiar status a "paid"
   */
  @Post('callbackPayment/:type')
  async callbackPaymentProMembership(
    @Body() body: CallbackNewConfirmedCoins,
    @Param('type') type: 'ibo' | 'supreme' | 'pro',
  ): Promise<any> {
    const network =
      process.env.CUSTOM_ENV == 'production' ? 'mainnet' : 'testnet';
    if (
      body.data.event == 'ADDRESS_COINS_TRANSACTION_CONFIRMED' &&
      // body.data.item.network == network &&
      body.data.item.direction == 'incoming' &&
      body.data.item.unit == 'BTC'
    ) {

      const {address} = body.data.item;
      const userDoc = await this.usersService.getUserByPaymentAddress(
        address,
        type,
      );

      if (userDoc) {
        const data = userDoc.data();

        // Agregar registro de la transaccion
        await addTransactionToUser(userDoc.id, {...body});

        // Verificar si el pago se completo
        const isPaid:boolean = await paymentIsComplete(
          userDoc.id,
          address,
          Number(data.subscription[type].payment_link.amount)
        );

        if (isPaid)
        {
          switch(type){
            case 'pro':{
              await this.subscriptionService.onPaymentProMembership(userDoc.id);
              break;
            }
            case 'ibo':{
              await this.subscriptionService.onPaymentIBOMembership(userDoc.id);
              break;
            }
            case 'supreme':{
              await this.subscriptionService.onPaymentSupremeMembership(userDoc.id);
              break;
            }
          }

          // Eliminar el evento que esta en el servicio de la wallet
          // await this.cryptoapisService.removeCallbackEvent(body.referenceId);

          return 'transaccion correcta';
        }

        // Sí no se registro...
        else {
          Sentry.captureException('Transaccion: Amount menor', {
            extra: {
              reference: body.referenceId,
              address: body.data.item.address,
            },
          });
          throw new HttpException(
            'El monto pagado es menor al requerido.',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      
      else {
        Sentry.captureException('Inscripción: usuario no encontrado', {
          extra: {
            reference: body.referenceId,
            address: body.data.item.address,
            payload: JSON.stringify(body),
          },
        });
        throw new HttpException(
          'No se encontro el usuario',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    
    else {
      Sentry.captureException('Inscripción: peticion invalida', {
        extra: {
          reference: body.referenceId,
          address: body.data.item.address,
          payload: JSON.stringify(body),
        },
      });
      throw new HttpException('Petición invalida', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Primera confirmacion de transaccion
   * Cambiar status a "confirming"
   */
  @Post('callbackCoins/:type')
  async callbackCoins(
    @Body() body: CallbackNewUnconfirmedCoins,
    @Param('type') type: 'ibo' | 'supreme' | 'pro',
  ): Promise<any> {
    const network =
      process.env.CUSTOM_ENV == 'production' ? 'mainnet' : 'testnet';
    if (
      body.data.event == 'ADDRESS_COINS_TRANSACTION_UNCONFIRMED' &&
      //body.data.item.network == network &&
      body.data.item.direction == 'incoming' &&
      body.data.item.unit == 'BTC'
    ) {
      
      const {address} = body.data.item;
      const snap = await db
        .collection('users')
        .where(`subscription.${type}.payment_link.address`, '==', address,
        ).get();

      if (snap.size > 0) {
        const doc = snap.docs[0];
        const data = doc.data();

        // Guardar registro de la transaccion.
        await addTransactionToUser(doc.id, {...body});
        
        // Verificar si el pago fue completado
        const isPaid:boolean = await paymentIsComplete(
          doc.id,
          address,
          Number.parseFloat(data.subscription[type]?.payment_link?.amount),
        );

        // Cambiar estado a 'confirming'
        if(isPaid)
          await doc.ref.update({
            [`subscription.${type}.payment_link.status`]: 'confirming',
          });

        // await this.cryptoapisService.removeCallbackEvent(body.referenceId);

        // await this.cryptoapisService.createCallbackConfirmation(
        //   data.id,
        //   body.data.item.address,
        //   type,
        // );
      
        return 'OK';
      } else {
        Sentry.captureException(`Inscripción: Usuario con petición de ${type} no encontrado.`, {
          extra: {
            reference: body.referenceId,
            address: body.data.item.address,
            payload: JSON.stringify(body),
          },
        });
        throw new HttpException('Usuario no encontrado.', HttpStatus.BAD_REQUEST);
      }
    } else {
      Sentry.captureException('Inscripción: peticion invalida', {
        extra: {
          reference: body.referenceId,
          address: body.data.item.address,
          payload: JSON.stringify(body),
        },
      });
      throw new HttpException('Peticion invalida', HttpStatus.BAD_REQUEST);
    }
  }
}


/**
 * Guardar registro de la transaccion
 * dentro de una subcoleccion llamada 'transactions'
 * perneteciente a 'users'.
 */
const addTransactionToUser = async (
  user_id: string, 
  transactionBody: CallbackNewUnconfirmedCoins | CallbackNewConfirmedCoins)
: Promise<Boolean> =>
{
  const {event} = transactionBody.data;

  try{
    // Identificar el evento que guardara el registro.
    let resultado : Boolean;
    switch(event){
      case "ADDRESS_COINS_TRANSACTION_UNCONFIRMED":{
        resultado = await addTransactionUnconfirmed(
          user_id,
          {...transactionBody} as CallbackNewUnconfirmedCoins);
        break;
      }
      case "ADDRESS_COINS_TRANSACTION_CONFIRMED":{
        resultado = await addTransactionConfirmed(
          user_id,
          {...transactionBody} as CallbackNewConfirmedCoins);
        break;
      }
      default: {
        resultado = false;
        break;
      }
    }

    return resultado;
  }

  catch(e) {
    console.warn("Error al agregar transacción: ", e);
    return false;
  }
};

/**
 * Guardar registro de la transaccion
 * con evento ..._UNCONFIRMED
 */
const addTransactionUnconfirmed = async (
  user_id: string,
  transactionBody: CallbackNewUnconfirmedCoins)
: Promise<Boolean> =>
{
  // Comprobar si ya existe registro de la transaccion
  const {transactionId} = transactionBody.data.item;
  const transactionDoc = await getTransactionOfUser(user_id, transactionId);

  // Cancelar sí ya existe
  if(transactionDoc.size > 0) 
    return false;

  // Guardar registro
  await db.collection(`users/${user_id}/transactions`).add({
    ...transactionBody,
    created_at: new Date(),
  });
  return true;
}

/**
 * Guardar registro de la transaccion
 * con evento ..._CONFIRMED
 */
const addTransactionConfirmed = async (
  user_id: string,
  transactionBody: CallbackNewConfirmedCoins)
: Promise<Boolean> =>
{
  // Comprobar si ya existe registro de la transaccion
  const {transactionId} = transactionBody.data.item;
  const transactions = await getTransactionOfUser(user_id, transactionId);

  /**
   * Sí no existe el registro
   * La agrega
   */
  if(transactions.size == 0) {
    await db.collection(`users/${user_id}/transactions`).add({
      ...transactionBody,
      created_at: new Date(),
    });
  }

  /**
   * Sí existe el registro
   * Lo modifica
   */
  else{
    const doc = transactions.docs[0];

    await doc.ref.update({
      [`data.event`]: "ADDRESS_COINS_TRANSACTION_CONFIRMED",
      [`data.item.minedInBlock`]: transactionBody.data.item.minedInBlock,
      [`data.item.firstSeenInMempoolTimestamp`]: firestore.FieldValue.delete(),
    });
  }

  return true;
}

/**
 * Obtener un 'transaction'
 * de 'user'
 * con el id de la transacción
 */
const getTransactionOfUser
= (user_id: string, transaction_id: string)
: Promise<FirebaseFirestore.DocumentData> =>
{
  return db
  .collection(`users/${user_id}/transactions`)
  .where(
    `data.item.transactionId`,
    '==',
    transaction_id,
  )
  .get();
}

/**
 * Obtener todos los 'transaction'
 * de 'user'
 * con la dirección del wallet
 */
const getTransactionsOfUser
= (user_id: string, addressWallet: string)
: Promise<FirebaseFirestore.DocumentData> =>
{
  // Calcular la fecha de hace un mes
  // const currentDate = new Date();
  // const oneMonthAgo = new Date();
  // oneMonthAgo.setMonth(currentDate.getMonth() - 1);

  return db
    .collection(`users/${user_id}/transactions`)
    .where(`data.item.address`, '==', addressWallet)
    //.where('created_at', '>', oneMonthAgo)
    .get();
}

/**
 * Verificar si un pago fue completado
 */
const paymentIsComplete
= async (id_user:string, addressWallet:string, totalAmount:number)
: Promise<boolean> =>
{
  try{
    // Obtener las transacciones
    const transactions = await getTransactionsOfUser(id_user, addressWallet);
    const sizeT =  transactions.size;

    // Obtener monto pagado
    let paidAmount:number = 0;
    for(let i=0; i<sizeT; i++){
      const doc = transactions.docs[i];
      const data = doc.data();
      paidAmount += Number.parseFloat(data.data?.item?.amount);
    }

    // Sí el pago no fue completado
    if(paidAmount < totalAmount)
      return false;
  }

  catch(e){
    console.log("Error al verificar si el pago fue completado: ", e);
    return false;
  }

  return true;
}