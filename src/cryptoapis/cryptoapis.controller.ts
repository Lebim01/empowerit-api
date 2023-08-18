import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CryptoapisService } from './cryptoapis.service';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from 'src/firebase';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';

@Controller('cryptoapis')
export class CryptoapisController {
  constructor(
    private readonly cryptoapisService: CryptoapisService,
    private readonly subscriptionService: SubscriptionsService,
  ) {}

  @Get('removeUnusedSubscriptionList')
  removeUnusedSubscriptionList(@Query('offset') offset = 0) {
    return this.cryptoapisService.removeUnusedSubscriptionList(offset);
  }

  @Get('validateWallet')
  validateWallet(@Query('wallet') wallet: string) {
    return this.cryptoapisService.validateWallet(wallet);
  }

  /**
   * Transaccion confirmada
   * Cambiar status a "paid"
   */
  @Post('callbackPayment')
  async callbackPayment(@Body() body): Promise<any> {
    if (
      body.data.event == 'ADDRESS_COINS_TRANSACTION_CONFIRMED' &&
      body.data.item.network == 'mainnet' &&
      body.data.item.direction == 'incoming' &&
      body.data.item.unit == 'BTC'
    ) {
      const snap = await getDocs(
        query(
          collection(db, 'users'),
          where('payment_link.address', '==', body.data.item.address),
        ),
      );

      if (snap.size > 0) {
        const userDoc = snap.docs[0];
        const data = userDoc.data();

        if (data.payment_link.amount <= body.data.item.amount) {
          await this.subscriptionService.onPaymentMembership(userDoc.id);

          /**
           * eliminar el evento que esta en el servicio de la wallet
           */
          await this.cryptoapisService.removeCallbackEvent(body.refereceId);

          /**
           * guardar registro de la transaccion dentro de una subcoleccion
           */
          await addDoc(collection(db, `users/${userDoc.id}/transactions`), {
            ...body,
            created_at: new Date(),
          });

          return 'transaccion correcta';
        } else {
          console.log('Cantidad incorrecta');
          throw new HttpException(
            'Cantidad incorrecta',
            HttpStatus.BAD_REQUEST,
          );
        }
      } else {
        console.log(
          'No se encontro el usuario para el pago address: ' +
            body.data.item.address,
        );
        throw new HttpException(
          'No se encontro el usuario',
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      console.log('algo no viene bien');
      throw new HttpException('Petición invalida', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Primera confirmacion de transaccion
   * Cambiar status a "confirming"
   */
  @Post('callbackCoins')
  async callbackCoins(@Body() body): Promise<any> {
    //
  }
}
