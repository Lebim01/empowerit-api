import {
  Controller,
  Get,
  Query,
  Post,
  Delete,
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
  starter: 'payment-membership-starter',
  'pro+supreme': 'payment-membership-prosupreme',
};

@Controller('cryptoapis')
export class CryptoapisController {
  constructor(
    private readonly cryptoapisService: CryptoapisService,
    private readonly subscriptionService: SubscriptionsService,
    private readonly usersService: UsersService,
    private readonly googleTaskService: GoogletaskService,
  ) {}

  isValidCryptoApis(body: CallbackNewConfirmedCoins) {
    return (
      body.data.event == 'ADDRESS_COINS_TRANSACTION_CONFIRMED' &&
      body.data.item.network == this.cryptoapisService.network &&
      body.data.item.direction == 'incoming' &&
      ['BTC', 'XRP', 'USDT'].includes(body.data.item.unit.toUpperCase())
    );
  }

  @Get('validateWallet')
  validateWallet(@Query('wallet') wallet: string) {
    return this.cryptoapisService.validateWallet(wallet);
  }

  @Post('callbackPayment/:type/queue')
  async callbackPaymentQueue(
    @Body() body: CallbackNewConfirmedCoins,
    @Param('type') type: Memberships | Packs,
  ) {
    if (
      body.data.event == 'ADDRESS_COINS_TRANSACTION_CONFIRMED' &&
      body.data.item.network == this.cryptoapisService.network &&
      body.data.item.direction == 'incoming' &&
      body.data.item.unit == 'BTC'
    ) {
      type Method = 'POST';
      const is_pack = type == 'pro+supreme';
      const task: google.cloud.tasks.v2.ITask = {
        httpRequest: {
          httpMethod: 'POST' as Method,
          url:
            `https://${process.env.VERCEL_URL}/cryptoapis/callbackPayment/${type}` +
            (is_pack ? '/packs' : ''),
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
    @Param('type') type: Memberships,
  ): Promise<any> {
    await db.collection('cryptoapis-requests').add({
      created_at: new Date(),
      url: `cryptoapis/callbackPayment/${type}`,
      body,
      headers,
    });

    if (body.data.item.direction == 'outgoing') return;

    if (this.isValidCryptoApis(body)) {
      const { address } = body.data.item;
      const userDoc = await this.usersService.getUserByPaymentAddress(
        address,
        type,
      );

      if (userDoc) {
        const data = userDoc.data();

        // Agregar registro de la transaccion
        await this.cryptoapisService.addTransactionToUser(userDoc.id, body);

        // Verificar si ya se pago todo o no
        const { is_complete, pendingAmount, currency } =
          await this.cryptoapisService.transactionIsCompletePaid(
            type,
            userDoc.id,
          );

        if (is_complete) {
          switch (type) {
            case 'pro': {
              await this.subscriptionService.onPaymentProMembership(
                userDoc.id,
                Number(data.subscription[type].payment_link.amount),
                currency,
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
            case 'starter': {
              await this.subscriptionService.onPaymentStarterMembership(
                userDoc.id,
              );
              break;
            }
          }

          // Eliminar el evento que esta en el servicio de la wallet
          await this.cryptoapisService.removeCallbackEvent(
            body.referenceId,
            currency,
          );

          return 'transaccion correcta';
        }

        // Sí el pago esta incompleto
        else {
          // Eliminar el evento que esta en el servicio de la wallet
          await this.cryptoapisService.removeCallbackEvent(
            body.referenceId,
            currency,
          );

          // Crear nuevo evento
          await this.cryptoapisService.createCallbackConfirmation(
            userDoc.id,
            address,
            type,
            currency,
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
            'El monto pagado es menor al requerido. ',
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
      throw new HttpException('Petición invalida', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Transaccion confirmada
   * Cambiar status a "paid"
   */
  @Post('callbackPayment/:type/packs')
  async callbackPaymentProMembershipPacks(
    @Body() body: CallbackNewConfirmedCoins,
    @Headers() headers,
    @Param('type') type: Packs,
  ): Promise<any> {
    await this.cryptoapisService.saveRequestHistory(type, body, headers);

    if (body.data.item.direction == 'outgoing') return;

    if (this.isValidCryptoApis(body)) {
      const { address } = body.data.item;
      const userDoc = await this.usersService.getUserByPaymentAddressPack(
        address,
        type,
      );

      if (userDoc) {
        const data = userDoc.data();

        // Agregar registro de la transaccion
        await this.cryptoapisService.addTransactionToUser(userDoc.id, body);

        // Verificar si el pago se completo
        const currency = data.payment_link[type].currency;
        const required_amount = Number(data.payment_link[type].amount);
        const tolerance = required_amount * 0.003;
        const pendingAmount: number =
          await this.cryptoapisService.calculatePendingAmount(
            userDoc.id,
            address,
            required_amount,
          );
        const is_complete = pendingAmount - tolerance <= 0;

        if (is_complete) {
          switch (type) {
            case 'pro+supreme': {
              await this.subscriptionService.onPaymentProMembership(
                userDoc.id,
                Number(data.payment_link[type].amount),
                currency,
              );
              await this.subscriptionService.onPaymentSupremeMembership(
                userDoc.id,
              );
              await db.collection('users').doc(userDoc.id).update({
                'payment_link.pro+supreme': null,
              });
              break;
            }
          }

          // Eliminar el evento que esta en el servicio de la wallet
          await this.cryptoapisService.removeCallbackEvent(
            body.referenceId,
            currency,
          );

          return 'transaccion correcta';
        }

        // Sí el pago esta incompleto
        else {
          // Eliminar el evento que esta en el servicio de la wallet
          await this.cryptoapisService.removeCallbackEvent(
            body.referenceId,
            currency,
          );

          // Crear nuevo evento
          await this.cryptoapisService.createCallbackConfirmation(
            userDoc.id,
            address,
            type,
            currency,
          );

          // Actualizar QR
          const qr: string = this.cryptoapisService.generateQrUrl(
            address,
            pendingAmount.toFixed(8),
          );
          await userDoc.ref.update({
            [`payment_link.${type}.qr`]: qr,
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
    @Param('type') type: Memberships,
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

        const currency = doc.get(`subscription.${type}.payment_link.currency`);

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

          await this.cryptoapisService.removeCallbackEvent(
            body.referenceId,
            currency,
          );
          await this.cryptoapisService.createCallbackConfirmation(
            data.id,
            body.data.item.address,
            type,
            currency,
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

  @Post('callbackCoins/:type/packs')
  async callbackCoinsPacks(
    @Body() body: CallbackNewUnconfirmedCoins,
    @Param('type') type: Packs,
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
        .where(`payment_link.${type}.address`, '==', address)
        .get();

      if (snap.size > 0) {
        const doc = snap.docs[0];
        const data = doc.data();

        const currency = doc.get(`payment_link.${type}.currency`);

        // Guardar registro de la transaccion.
        await this.cryptoapisService.addTransactionToUser(doc.id, body);

        // Verificar si el pago fue completado
        const pendingAmount: number =
          await this.cryptoapisService.calculatePendingAmount(
            doc.id,
            address,
            Number.parseFloat(data.payment_link[type]?.amount),
          );

        // Si se cubrio el pago completo
        if (pendingAmount <= 0) {
          await doc.ref.update({
            [`payment_link.${type}.status`]: 'confirming',
          });

          await this.cryptoapisService.removeCallbackEvent(
            body.referenceId,
            currency,
          );
          await this.cryptoapisService.createCallbackConfirmation(
            data.id,
            body.data.item.address,
            type,
            currency,
          );
        }

        // Actualizar QR
        const qr: string = this.cryptoapisService.generateQrUrl(
          address,
          pendingAmount.toFixed(8),
        );
        await doc.ref.update({
          [`payment_link.${type}.qr`]: qr,
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

  @Delete('/deleteUnusedBlockChainEvents')
  deleteUnusedBlockChainEvents() {
    return this.cryptoapisService.deleteUnusedBlockChainEvents();
  }
}
