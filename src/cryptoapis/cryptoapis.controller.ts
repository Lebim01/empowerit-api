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
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { UsersService } from 'src/users/users.service';
import {
  CallbackNewConfirmedCoins,
  CallbackNewUnconfirmedCoins,
} from './types';
import * as Sentry from '@sentry/node';

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
      body.data.item.network == network &&
      body.data.item.direction == 'incoming' &&
      body.data.item.unit == 'BTC'
    ) {
      const userDoc = await this.usersService.getUserByPaymentAddress(
        body.data.item.address,
        type,
      );

      if (userDoc) {
        const data = userDoc.data();

        if (
          Number(data.subscription[type].payment_link.amount) <=
          Number(body.data.item.amount)
        ) {
          if (type == 'pro') {
            await this.subscriptionService.onPaymentProMembership(userDoc.id);
          } else if (type == 'ibo') {
            await this.subscriptionService.onPaymentIBOMembership(userDoc.id);
          } else if (type == 'supreme') {
            await this.subscriptionService.onPaymentSupremeMembership(
              userDoc.id,
            );
          }

          /**
           * eliminar el evento que esta en el servicio de la wallet
           */
          await this.cryptoapisService.removeCallbackEvent(body.referenceId);

          /**
           * guardar registro de la transaccion dentro de una subcoleccion
           */
          await db.collection(`users/${userDoc.id}/transactions`).add({
            ...body,
            created_at: new Date(),
          });

          return 'transaccion correcta';
        } else {
          Sentry.captureException('Inscripción: cantidad incorrecta', {
            extra: {
              reference: body.referenceId,
              address: body.data.item.address,
            },
          });
          throw new HttpException(
            'Cantidad incorrecta',
            HttpStatus.BAD_REQUEST,
          );
        }
      } else {
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
    } else {
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
      body.data.item.network == network &&
      body.data.item.direction == 'incoming' &&
      body.data.item.unit == 'BTC'
    ) {
      const snap = await db
        .collection('users')
        .where(
          `subscription.${type}.payment_link.address`,
          '==',
          body.data.item.address,
        )
        .get();

      if (snap.size > 0) {
        const doc = snap.docs[0];
        const data = doc.data();

        await doc.ref.update({
          [`subscription.${type}.payment_link.status`]: 'confirming',
        });

        await this.cryptoapisService.removeCallbackEvent(body.referenceId);

        await this.cryptoapisService.createCallbackConfirmation(
          data.id,
          body.data.item.address,
          type,
        );

        return 'OK';
      } else {
        Sentry.captureException('Inscripción: cantidad incorrecta', {
          extra: {
            reference: body.referenceId,
            address: body.data.item.address,
            payload: JSON.stringify(body),
          },
        });
        throw new HttpException('Cantidad incorrecta', HttpStatus.BAD_REQUEST);
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
