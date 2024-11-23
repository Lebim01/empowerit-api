import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { CoinpaymentsService } from './coinpayments.service';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { db } from 'src/firebase/admin';
import { FRANCHISES_AUTOMATIC_PRICES, MEMBERSHIP_PRICES_MONTHLY, SubscriptionsService } from 'src/subscriptions/subscriptions.service';

@Controller('coinpayments')
export class CoinpaymentsController {
  constructor(
    private readonly coinPaymentsService: CoinpaymentsService,
    private readonly subscriptionService: SubscriptionsService,
  ) { }

  @Post('create-transaction')
  async createTransaction(@Body() body: CreateTransactionDto) {
    return this.coinPaymentsService.createTransaction(body);
  }
  @Post('ipn')
  async notificationIpn(@Req() request: Request, @Res() response: Response) {
    const { isComplete, payload } =
      await this.coinPaymentsService.getNotificationIpn(request, response);
    if (isComplete) {
      const user = await this.coinPaymentsService.getUser(payload.email);
      try {
        await db
          .collection('users')
          .doc(user.id)
          .collection('ipn')
          .add(payload);
      } catch (err) {
        console.error('Error al guardar el ipn');
      }
      try {
        const franchiseAutomaticKeys = user?.payment_link_automatic_franchises ? Object.keys(user?.payment_link_automatic_franchises) : []
        const franchiseNormalKeys = user?.payment_link ? Object.keys(user?.payment_link) : []
        if (franchiseNormalKeys.length > 0) {
          const franchiseKey = franchiseNormalKeys[0]
          const membership = user.payment_link[franchiseKey]?.membership
          if (membership && membership in MEMBERSHIP_PRICES_MONTHLY) {
            console.log("se ejecuta la normal")
            await this.subscriptionService.onPaymentMembership(
              user.id,
              membership,
              'LTC',
              'Activacion con Pago',
            );
          } else {
            console.error('Membresía no válida o no encontrada en MEMBERSHIP_PRICES_MONTHLY.');
          }
        } else if (franchiseAutomaticKeys.length > 0) {
          const franchiseKey = franchiseAutomaticKeys[0]
          const membership = user.payment_link_automatic_franchises[franchiseKey]?.membership;
          if (membership && membership in FRANCHISES_AUTOMATIC_PRICES) {
            await this.subscriptionService.onPaymentAutomaticFranchises(user.id, membership, 'LTC', 'Activacion con pago automatico')
          } else {
            console.error('Membresía no válida o no encontrada en FRANCHISES_AUTOMATIC_PRICES.');
          }

        } else {
          console.log('No se encontraron franquicias normales ni automáticas.');
        }
      } catch (error) {
        console.error('Ocurrio un error al actualizar al sponsor', error);
      }
    }
    return 'pago actualizado con exito';
  }
}
