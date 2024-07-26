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
import { GoogletaskService } from '../googletask/googletask.service';
import { google } from '@google-cloud/tasks/build/protos/protos';
import { BinaryService } from 'src/binary/binary.service';
import * as admin from 'firebase-admin';

export const CREDITS_PACKS_BINARY_POINTS: Record<PackCredits, number> = {
  '100-credits': 50,
  '500-credits': 250,
  '1000-credits': 500,
};

@Controller('cryptoapis')
export class CryptoapisController {
  constructor(
    private readonly cryptoapisService: CryptoapisService,
    private readonly subscriptionService: SubscriptionsService,
    private readonly usersService: UsersService,
    private readonly googleTaskService: GoogletaskService,
    private readonly binaryService: BinaryService,
  ) {}

  isValidCryptoApis(
    body: CallbackNewConfirmedCoins | CallbackNewUnconfirmedCoins,
    confirmed: boolean,
  ) {
    return (
      [
        'ADDRESS_COINS_TRANSACTION_CONFIRMED',
        'ADDRESS_COINS_TRANSACTION_UNCONFIRMED',
      ].includes(body.data.event) &&
      body.data.item.network == 'mainnet' &&
      body.data.item.direction == 'incoming' &&
      ['BTC', 'LTC', 'XRP'].includes(body.data.item.unit.toUpperCase())
    );
  }

  @Get('validateWallet')
  validateWallet(
    @Query('wallet') wallet: string,
    @Query('blockchain') blockchain: string,
  ) {
    return this.cryptoapisService.validateWallet(wallet, blockchain);
  }

  @Post('callbackPaymentForCredits/:type/queue')
  async callbackPaymentQueueForCredits(
    @Body() body: CallbackNewConfirmedCoins,
    @Param('type') type: PackCredits,
  ) {
    if (this.isValidCryptoApis(body, true)) {
      type Method = 'POST';
      const task: google.cloud.tasks.v2.ITask = {
        httpRequest: {
          httpMethod: 'POST' as Method,
          url: `${process.env.API_URL}/cryptoapis/callbackPaymentForCredits/${type}`,
          body: Buffer.from(JSON.stringify(body)),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      };

      await this.googleTaskService.addToQueue(
        task,
        this.googleTaskService.getPathQueue('payment-credits'),
      );

      return 'OK';
    }

    return 'FAIL';
  }

  @Post('callbackPaymentForParticipations/:type/queue')
  async callbackPaymentQueueForParticipations(
    @Body() body: CallbackNewConfirmedCoins,
    @Param('type') type: PackParticipations,
  ) {
    if (this.isValidCryptoApis(body, true)) {
      type Method = 'POST';
      const task: google.cloud.tasks.v2.ITask = {
        httpRequest: {
          httpMethod: 'POST' as Method,
          url: `${process.env.API_URL}/cryptoapis/callbackPaymentForParticipations/${type}`,
          body: Buffer.from(JSON.stringify(body)),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      };

      await this.googleTaskService.addToQueue(
        task,
        this.googleTaskService.getPathQueue('payment-participations'),
      );

      return 'OK';
    }

    return 'FAIL';
  }

  @Post('callbackPayment/:type/queue')
  async callbackPaymentQueue(
    @Body() body: CallbackNewConfirmedCoins,
    @Param('type') type: Memberships,
  ) {
    if (this.isValidCryptoApis(body, true)) {
      type Method = 'POST';
      const task: google.cloud.tasks.v2.ITask = {
        httpRequest: {
          httpMethod: 'POST' as Method,
          url: `${process.env.API_URL}/cryptoapis/callbackPayment/${type}`,
          body: Buffer.from(JSON.stringify(body)),
          headers: {
            'Content-Type': 'application/json',
          },
        },
      };

      await this.googleTaskService.addToQueue(
        task,
        this.googleTaskService.getPathQueue('payment-membership'),
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
    @Param('type') type: Franchises,
  ): Promise<any> {
    await db.collection('cryptoapis-requests').add({
      created_at: new Date(),
      url: `cryptoapis/callbackPayment/${type}`,
      body,
      headers,
    });

    if (body.data.item.direction == 'outgoing') return;

    if (this.isValidCryptoApis(body, true)) {
      const { address } = body.data.item;
      const userDoc = await this.usersService.getUserByPaymentAddress(
        address,
        type,
      );
      const referenceId = body.referenceId;
      let referenceId2 = '';
      if (userDoc && userDoc.get)
        referenceId2 = userDoc.get(`payment_link.${type}.referenceId2`);

      if (userDoc) {
        // Agregar registro de la transaccion
        await this.cryptoapisService.addTransactionToUser(userDoc.id, body);
        await this.cryptoapisService.addTransactionToUser(userDoc.id, {
          ...body,
          data: { ...body.data, event: 'ADDRESS_COINS_TRANSACTION_CONFIRMED' },
        });

        // Verificar si ya se pago todo o no
        const { is_complete, pendingAmount, currency } =
          await this.cryptoapisService.transactionIsCompletePaid(
            type,
            userDoc.id,
          );
        console.log({ is_complete });

        if (is_complete) {
          await this.subscriptionService.onPaymentMembership(
            userDoc.id,
            type,
            currency,
            'Activada con Pago',
          );

          // Eliminar el evento que esta en el servicio de la wallet
          await this.cryptoapisService.removeCallbackEvent(
            referenceId,
            currency,
          );
          await this.cryptoapisService.removeCallbackEvent(
            referenceId2,
            currency,
          );

          return 'transaccion correcta';
        }

        // Sí el pago esta incompleto
        else {
          // Eliminar el evento que esta en el servicio de la wallet
          await this.cryptoapisService.removeCallbackEvent(
            referenceId,
            currency,
          );
          await this.cryptoapisService.removeCallbackEvent(
            referenceId2,
            currency,
          );

          // Crear nuevo evento
          await this.cryptoapisService.createCallbackConfirmation(
            userDoc.id,
            address,
            type,
            currency,
            'callbackPayment',
          );

          // Actualizar QR
          const qr: string = this.cryptoapisService.generateQrUrl(
            address,
            pendingAmount.toFixed(8),
            'litecoin',
          );
          await userDoc.ref.update({
            [`payment_link.${type}.qr`]: qr,
          });

          /*Sentry.captureException('Transaccion: Amount menor', {
            extra: {
              reference: body.referenceId,
              address: body.data.item.address,
            },
          });*/
          throw new HttpException(
            'El monto pagado es menor al requerido. ',
            HttpStatus.BAD_REQUEST,
          );
        }
      } else {
        /*Sentry.captureException('Inscripción: usuario no encontrado', {
          extra: {
            reference: body.referenceId,
            address: body.data.item.address,
            payload: JSON.stringify(body),
          },
        });*/
        throw new HttpException(
          'No se encontro el usuario',
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      throw new HttpException('Petición invalida', HttpStatus.BAD_REQUEST);
    }
  }
  @Post('callbackPaymentForParticipations/:type')
  async callbackPaymentProMembershipForParticipations(
    @Body() body: CallbackNewConfirmedCoins,
    @Headers() headers,
    @Param('type') type: PackParticipations,
  ): Promise<any> {
    await db.collection('cryptoapis-requests').add({
      created_at: new Date(),
      url: `cryptoapis/callbackPaymentForParticipations/${type}`,
      body,
      headers,
    });

    if (body.data.item.direction == 'outgoing') return;

    if (this.isValidCryptoApis(body, true)) {
      const { address } = body.data.item;
      const userDoc =
        await this.usersService.getUserByPaymentAddressForParticipations(
          address,
          type,
        );
      const referenceId = body.referenceId;
      let referenceId2 = '';
      if (userDoc && userDoc.get)
        referenceId2 = userDoc.get(
          `payment_link_participations.${type}.referenceId2`,
        );

      if (userDoc) {
        // Agregar registro de la transaccion
        await this.cryptoapisService.addTransactionToUser(userDoc.id, body);
        await this.cryptoapisService.addTransactionToUser(userDoc.id, {
          ...body,
          data: { ...body.data, event: 'ADDRESS_COINS_TRANSACTION_CONFIRMED' },
        });

        // Verificar si ya se pago todo o no
        const { is_complete, pendingAmount, currency } =
          await this.cryptoapisService.transactionIsCompletePaidForParticipations(
            type,
            userDoc.id,
          );
        console.log({ is_complete });

        if (is_complete) {
          await this.subscriptionService.onPaymentParticipations(
            userDoc.id,
            type,
            currency,
            'Activada con Pago',
          );

          // Eliminar el evento que esta en el servicio de la wallet
          console.log(referenceId);
          await this.cryptoapisService.removeCallbackEvent(
            referenceId,
            currency,
          );
          await this.cryptoapisService.removeCallbackEvent(
            referenceId2,
            currency,
          );

          await db.collection('users').doc(userDoc.id).update({
            payment_link_participations: {}
          });

          return 'transaccion correcta';
        }

        // Sí el pago esta incompleto
        else {
          // Eliminar el evento que esta en el servicio de la wallet
          await this.cryptoapisService.removeCallbackEvent(
            referenceId,
            currency,
          );
          await this.cryptoapisService.removeCallbackEvent(
            referenceId2,
            currency,
          );

          // Crear nuevo evento
          await this.cryptoapisService.createCallbackConfirmation(
            userDoc.id,
            address,
            type,
            currency,
            'callbackPaymentForParticipations',
          );

          // Actualizar QR
          const qr: string = this.cryptoapisService.generateQrUrl(
            address,
            pendingAmount.toFixed(8),
            'litecoin',
          );
          await userDoc.ref.update({
            [`payment_link_participations.${type}.qr`]: qr,
          });

          /*Sentry.captureException('Transaccion: Amount menor', {
            extra: {
              reference: body.referenceId,
              address: body.data.item.address,
            },
          });*/
          throw new HttpException(
            'El monto pagado es menor al requerido. ',
            HttpStatus.BAD_REQUEST,
          );
        }
      } else {
        /*Sentry.captureException('Inscripción: usuario no encontrado', {
          extra: {
            reference: body.referenceId,
            address: body.data.item.address,
            payload: JSON.stringify(body),
          },
        });*/
        throw new HttpException(
          'No se encontro el usuario',
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      throw new HttpException('Petición invalida', HttpStatus.BAD_REQUEST);
    }
  }
  /* aqui */
  @Post('callbackPaymentForCredits/:type')
  async callbackPaymentProMembershipForCredits(
    @Body() body: CallbackNewConfirmedCoins,
    @Headers() headers,
    @Param('type') type: PackCredits,
  ): Promise<any> {
    await db.collection('cryptoapis-requests').add({
      created_at: new Date(),
      url: `cryptoapis/callbackPaymentForCredits/${type}`,
      body,
      headers,
    });

    if (body.data.item.direction == 'outgoing') return;

    if (this.isValidCryptoApis(body, true)) {
      const { address } = body.data.item;
      const userDoc = await this.usersService.getUserByPaymentAddressForCredits(
        address,
        type,
      );
      const referenceId = body.referenceId;
      let referenceId2 = '';
      if (userDoc && userDoc.get)
        referenceId2 = userDoc.get(`payment_link_credits.${type}.referenceId2`);
      if (userDoc) {
        // Agregar registro de la transaccion
        await this.cryptoapisService.addTransactionToUser(userDoc.id, body);
        await this.cryptoapisService.addTransactionToUser(userDoc.id, {
          ...body,
          data: { ...body.data, event: 'ADDRESS_COINS_TRANSACTION_CONFIRMED' },
        });

        // Verificar si ya se pago todo o no
        const { is_complete, pendingAmount, currency } =
          await this.cryptoapisService.transactionIsCompletePaidForCredits(
            type,
            userDoc.id,
          );
        console.log({ is_complete });

        if (is_complete) {
          try {
            await this.subscriptionService.addCredits(userDoc.id, type);
            // Eliminar el evento que esta en el servicio de la wallet
            await this.cryptoapisService.removeCallbackEvent(
              referenceId,
              currency,
            );
            await this.cryptoapisService.removeCallbackEvent(
              referenceId2,
              currency,
            );
          } catch (error) {
            console.log(error);
          }
          await db
            .collection('users')
            .doc(userDoc.id)
            .update({
              [`payment_link_credits.${type}`]:
                admin.firestore.FieldValue.delete(),
            });
          await this.binaryService.increaseBinaryPoints(
            userDoc.id,
            CREDITS_PACKS_BINARY_POINTS[type],
          );
          return 'transaccion correcta';
        }

        // Sí el pago esta incompleto
        else {
          // Eliminar el evento que esta en el servicio de la wallet
          await this.cryptoapisService.removeCallbackEvent(
            referenceId,
            currency,
          );
          await this.cryptoapisService.removeCallbackEvent(
            referenceId2,
            currency,
          );

          // Crear nuevo evento
          await this.cryptoapisService.createCallbackConfirmationForCredits(
            userDoc.id,
            address,
            type,
            currency,
          );

          // Actualizar QR
          const qr: string = this.cryptoapisService.generateQrUrl(
            address,
            pendingAmount.toFixed(8),
            'litecoin',
          );
          await userDoc.ref.update({
            [`payment_link_credits.${type}.qr`]: qr,
          });
          throw new HttpException(
            'El monto pagado es menor al requerido. ',
            HttpStatus.BAD_REQUEST,
          );
        }
      } else {
        throw new HttpException(
          'No se encontro el usuario',
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      throw new HttpException('Petición invalida', HttpStatus.BAD_REQUEST);
    }
  }

  @Get('getDoc')
  async getDoc(): Promise<any> {
    const docRef = db
      .collection('users')
      .doc('sVarUBihvSZ7ahMUMgwaAbXcRs03')
      .collection('transactions')
      .doc('thSeP7cwQmu3yCi1Fb42');
    const docSnapshot = await docRef.get();
    console.log(docSnapshot.data());

    if (!docSnapshot.exists) {
      return { message: 'Document not found' };
    }

    return docSnapshot.data();
  }

  /**
   * Primera confirmacion de transaccion
   * Cambiar status a "confirming"
   */
  /**
   * Transaccion confirmada
   * Cambiar status a "paid"
   */
  @Post('callbackCoins/:type')
  async callbackCoins(
    @Body() body: CallbackNewUnconfirmedCoins,
    @Param('type') type: Memberships,
  ): Promise<any> {
    if (this.isValidCryptoApis(body, false)) {
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
            Number.parseFloat(data.payment_link[type].amount),
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
            'callbackPayment',
          );
        }

        // Actualizar QR
        const qr: string = this.cryptoapisService.generateQrUrl(
          address,
          pendingAmount.toFixed(8),
          'litecoin',
        );
        await doc.ref.update({
          [`payment_link.${type}.qr`]: qr,
        });

        return 'OK';
      } else {
        /*Sentry.captureException(
          `Inscripción: Usuario con petición de ${type} no encontrado.`,
          {
            extra: {
              reference: body.referenceId,
              address: body.data.item.address,
              payload: JSON.stringify(body),
            },
          },
        );*/
        throw new HttpException(
          'Usuario no encontrado.',
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      /*Sentry.captureException('Inscripción: peticion invalida', {
        extra: {
          reference: body.referenceId,
          address: body.data.item.address,
          payload: JSON.stringify(body),
        },
      });*/
      throw new HttpException('Peticion invalida', HttpStatus.BAD_REQUEST);
    }
  }

  @Delete('/deleteUnusedBlockChainEvents')
  deleteUnusedBlockChainEvents() {
    return this.cryptoapisService.deleteUnusedBlockChainEvents();
  }

  @Post('callbackCart/first')
  async callbackCartFirst(
    @Body() body: CallbackNewUnconfirmedCoins,
  ): Promise<any> {
    if (this.isValidCryptoApis(body, false)) {
      const { address } = body.data.item;
      const snap = await db
        .collectionGroup('cart')
        .where(`payment_link.address`, '==', address)
        .get();

      if (snap.size > 0) {
        const doc = snap.docs[0];
        const data = doc.data();
        const userDocRef = doc.ref.parent.parent;

        const currency = 'LTC';

        // Guardar registro de la transaccion.
        await this.cryptoapisService.addTransactionToUser(userDocRef.id, body);

        // Verificar si el pago fue completado
        const pendingAmount: number =
          await this.cryptoapisService.calculatePendingAmount(
            userDocRef.id,
            address,
            Number.parseFloat(data.payment_link.amount),
          );

        // Si se cubrio el pago completo
        if (pendingAmount <= 0) {
          await this.cryptoapisService.removeCallbackEvent(
            body.referenceId,
            currency,
          );
          await this.cryptoapisService.createCallbackCartConfirmation(
            body.data.item.address,
          );

          // Actualizar QR
          const qr: string = this.cryptoapisService.generateQrUrl(
            address,
            pendingAmount.toFixed(8),
            'litecoin',
          );
          await doc.ref.update({
            [`payment_link.status`]: 'confirming',
            [`payment_link.qr`]: qr,
          });

          return 'OK';
        } else {
          // Eliminar el evento que esta en el servicio de la wallet
          await this.cryptoapisService.removeCallbackEvent(
            body.referenceId,
            currency,
          );

          // Crear nuevo evento
          await this.cryptoapisService.createFirstConfirmationCartTransaction(
            userDocRef.id,
            address,
          );

          // Actualizar QR
          const qr: string = this.cryptoapisService.generateQrUrl(
            address,
            pendingAmount.toFixed(8),
            'litecoin',
          );
          await doc.ref.update({
            [`payment_link.pending_amount`]: pendingAmount,
            [`payment_link.qr`]: qr,
          });

          return 'El monto pagado es menor al requerido.';
        }
      } else {
        throw new HttpException('Address not found', HttpStatus.BAD_REQUEST);
      }
    } else {
      throw new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('callbackCart')
  async callbackCart(@Body() body: CallbackNewConfirmedCoins): Promise<any> {
    if (this.isValidCryptoApis(body, true)) {
      const { address } = body.data.item;
      const snap = await db
        .collectionGroup('cart')
        .where(`payment_link.address`, '==', address)
        .get();

      if (snap.size > 0) {
        const doc = snap.docs[0];
        const userDocRef = doc.ref.parent.parent;

        // Guardar registro de la transaccion.
        await this.cryptoapisService.addTransactionToUser(userDocRef.id, body);

        await userDocRef.collection('pending-ships').add({
          created_at: new Date(),
          pack: 'none',
          sent: false,
          cart: doc.data(),
          cartId: doc.id,
        });

        /* const total_points = Math.ceil(
          doc.get('payment_link.total_products_usd') / 2,
        ); */

        /* await this.binaryService.increaseBinaryPoints(
          userDocRef.id,
          total_points || 0,
          'Compra de productos',
          doc.id,
        ); */

        await doc.ref.delete();

        return 'OK';
      } else {
        throw new HttpException('Address not found', HttpStatus.BAD_REQUEST);
      }
    } else {
      throw new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('activeCart')
  async activeCart(@Body() body: { id_user; address }): Promise<any> {
    if (!body.address) throw 'address is required';

    const snap = await db
      .collectionGroup('cart')
      .where(`payment_link.address`, '==', body.address)
      .get();

    if (snap.size > 0) {
      const doc = snap.docs[0];
      const userDocRef = doc.ref.parent.parent;

      // Guardar registro de la transaccion.
      await this.cryptoapisService.addTransactionToUser(userDocRef.id, {
        data: {
          event: 'ADDRESS_COINS_TRANSACTION_CONFIRMED',
          item: {
            address: body.address,
            amount: doc.get('payment_link.amount'),
            blockchain: 'litecoin',
            direction: 'incoming',
            minedInBlock: {} as any,
            network: 'mainnet',
            transactionId: 'manual',
            unit: 'LTC',
          },
          product: 'BLOCKCHAIN_EVENTS',
        },
        apiVersion: '',
        idempotencyKey: '',
        referenceId: '',
      });

      await userDocRef.collection('pending-ships').add({
        created_at: new Date(),
        pack: 'none',
        sent: false,
        cart: doc.data(),
        cartId: doc.id,
      });

      const total_points = Math.ceil(
        doc.get('payment_link.total_products_usd') / 2,
      );

      await this.binaryService.increaseBinaryPoints(
        userDocRef.id,
        total_points || 0,
        'Compra de productos',
        doc.id,
      );

      await doc.ref.delete();

      return 'OK';
    } else {
      throw new HttpException('Address not found', HttpStatus.BAD_REQUEST);
    }
  }
}
