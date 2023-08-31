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
      const { address } = body.data.item;
      const userDoc = await this.usersService.getUserByPaymentAddress(
        address,
        type,
      );

      if (userDoc) {
        const data = userDoc.data();

        // Agregar registro de la transaccion
        await this.cryptoapisService.addTransactionToUser(userDoc.id, { ...body });

        // Verificar si el pago se completo
        const pendingAmount:number = await this.cryptoapisService.calculatePendingAmount(
          userDoc.id,
          address,
          Number(data.subscription[type].payment_link.amount),
        );

        if (pendingAmount <= 0) {
          switch (type) {
            case 'pro': {
              await this.subscriptionService.onPaymentProMembership(userDoc.id);
              break;
            }
            case 'ibo': {
              await this.subscriptionService.onPaymentIBOMembership(userDoc.id);
              break;
            }
            case 'supreme': {
              await this.subscriptionService.onPaymentSupremeMembership(
                userDoc.id,
              );
              break;
            }
          }

          // Eliminar el evento que esta en el servicio de la wallet
          await this.cryptoapisService.removeCallbackEvent(body.referenceId);

          return 'transaccion correcta';
        }

        // Sí el pago esta incompleto
        else {
          // Actualizar QR
          const qr:string = this.cryptoapisService.generateQrUrl(address, pendingAmount);
          await userDoc.ref.update({
            [`subscription.${type}.payment_link.qr`]: qr,
          });

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
      const { address } = body.data.item;
      const snap = await db
        .collection('users')
        .where(`subscription.${type}.payment_link.address`, '==', address)
        .get();

      if (snap.size > 0) {
        const doc = snap.docs[0];
        const data = doc.data();

        // Guardar registro de la transaccion.
        await this.cryptoapisService.addTransactionToUser(doc.id, { ...body });

        // Verificar si el pago fue completado
        const pendingAmount:number = await this.cryptoapisService.calculatePendingAmount(
          doc.id,
          address,
          Number.parseFloat(data.subscription[type]?.payment_link?.amount),
        );

        // Actualizar estado a 'confirming'
        if (pendingAmount <= 0)
          await doc.ref.update({
            [`subscription.${type}.payment_link.status`]: 'confirming',
          });

        // Actualizar QR
        const qr:string = this.cryptoapisService.generateQrUrl(address, pendingAmount);
        await doc.ref.update({
          [`subscription.${type}.payment_link.qr`]: qr,
        });

        await this.cryptoapisService.removeCallbackEvent(body.referenceId);

        await this.cryptoapisService.createCallbackConfirmation(
          data.id,
          body.data.item.address,
          type,
        );

        return 'OK';
      } else {
        Sentry.captureException(
          `Inscripción: Usuario con petición de ${type} no encontrado.`,
          {
            extra: {
              reference: body.referenceId,
              address: body.data.item.address,
              payload: JSON.stringify(body),
            },
          },
        );
        throw new HttpException(
          'Usuario no encontrado.',
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
      throw new HttpException('Peticion invalida', HttpStatus.BAD_REQUEST);
    }
  }
}
