import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Param,
  Headers,
} from '@nestjs/common';
import { CryptoapisService } from './cryptoapis.service';
import { db } from 'src/firebase/admin';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { UsersService } from 'src/users/users.service';
import {
  CallbackNewConfirmedCoins,
  CallbackNewUnconfirmedCoins,
} from './types';
import * as Sentry from '@sentry/node';
import { GoogletaskService } from '../googletask/googletask.service';
import { google } from '@google-cloud/tasks/build/protos/protos';

const QUEUE_NAMES = {
  pro: 'payment-membership-pro',
  ibo: 'payment-membership-ibo',
  supreme: 'payment-membership-supreme',
};

@Controller('cryptoapis')
export class CryptoapisController {
  constructor(
    private readonly cryptoapisService: CryptoapisService,
    private readonly subscriptionService: SubscriptionsService,
    private readonly usersService: UsersService,
    private readonly googleTaskService: GoogletaskService,
  ) {}

  @Get('validateWallet')
  validateWallet(@Query('wallet') wallet: string) {
    return this.cryptoapisService.validateWallet(wallet);
  }

  @Post('callbackPayment/:type/queue')
  async callbackPaymentQueue(
    @Body() body: CallbackNewConfirmedCoins,
    @Param('type') type: 'ibo' | 'supreme' | 'pro',
  ) {
    if (
      body.data.event == 'ADDRESS_COINS_TRANSACTION_CONFIRMED' &&
      body.data.item.network == this.cryptoapisService.network &&
      body.data.item.direction == 'incoming' &&
      body.data.item.unit == 'BTC'
    ) {
      type Method = 'POST';
      const task: google.cloud.tasks.v2.ITask = {
        httpRequest: {
          httpMethod: 'POST' as Method,
          url: `https://${process.env.VERCEL_URL}/cryptoapis/callbackPayment/${type}`,
          body: Buffer.from(JSON.stringify(body)),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      };

      await this.googleTaskService.addToQueue(
        task,
        this.googleTaskService.getPathQueue(QUEUE_NAMES[type]),
      );

      return 'OK';
    }

    return 'FAIL';
  }

  /**
   * Transaccion confirmada
   * Cambiar status a "paid"
   */
  @Post('callbackPayment/:type')
  async callbackPaymentProMembership(
    @Body() body: CallbackNewConfirmedCoins,
    @Headers() headers,
    @Param('type') type: 'ibo' | 'supreme' | 'pro',
  ): Promise<any> {
    await db.collection('cryptoapis-requests').add({
      created_at: new Date(),
      url: `cryptoapis/callbackPayment/${type}`,
      body,
      headers,
    });

    if (body.data.item.direction == 'outgoing') return;

    if (
      body.data.event == 'ADDRESS_COINS_TRANSACTION_CONFIRMED' &&
      body.data.item.network == this.cryptoapisService.network &&
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
        await this.cryptoapisService.addTransactionToUser(userDoc.id, body);

        // Verificar si el pago se completo
        const required_amount = Number(
          data.subscription[type].payment_link.amount,
        );
        const tolerance = required_amount * 0.003;
        const pendingAmount: number =
          await this.cryptoapisService.calculatePendingAmount(
            userDoc.id,
            address,
            required_amount,
          );

        if (pendingAmount - tolerance <= 0) {
          switch (type) {
            case 'pro': {
              await this.subscriptionService.onPaymentProMembership(
                userDoc.id,
                Number(data.subscription[type].payment_link.amount),
              );
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
          // Eliminar el evento que esta en el servicio de la wallet
          await this.cryptoapisService.removeCallbackEvent(body.referenceId);

          // Crear nuevo evento
          await this.cryptoapisService.createCallbackConfirmation(
            userDoc.id,
            address,
            type,
          );

          // Actualizar QR
          const qr: string = this.cryptoapisService.generateQrUrl(
            address,
            pendingAmount.toFixed(8),
          );
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
          net: this.cryptoapisService.network,
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
    if (
      body.data.event == 'ADDRESS_COINS_TRANSACTION_UNCONFIRMED' &&
      body.data.item.network == this.cryptoapisService.network &&
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
        await this.cryptoapisService.addTransactionToUser(doc.id, body);

        // Verificar si el pago fue completado
        const pendingAmount: number =
          await this.cryptoapisService.calculatePendingAmount(
            doc.id,
            address,
            Number.parseFloat(data.subscription[type]?.payment_link?.amount),
          );

        // Si se cubrio el pago completo
        if (pendingAmount <= 0) {
          await doc.ref.update({
            [`subscription.${type}.payment_link.status`]: 'confirming',
          });

          await this.cryptoapisService.removeCallbackEvent(body.referenceId);
          await this.cryptoapisService.createCallbackConfirmation(
            data.id,
            body.data.item.address,
            type,
          );
        }

        // Actualizar QR
        const qr: string = this.cryptoapisService.generateQrUrl(
          address,
          pendingAmount.toFixed(8),
        );
        await doc.ref.update({
          [`subscription.${type}.payment_link.qr`]: qr,
        });

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

  @Get('/verify-transactions-from-blockchain')
  verifyTransactions() {
    return this.cryptoapisService.verifyTransactions();
  }
}
