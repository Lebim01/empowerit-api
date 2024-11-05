import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { CoinpaymentsService } from './coinpayments.service';
import { CreateTransactionDto } from './dtos/create-transaction.dto';
import { db } from 'src/firebase/admin';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';

@Controller('coinpayments')
export class CoinpaymentsController {
  constructor(
    private readonly coinPaymentsService: CoinpaymentsService,
    private readonly subscriptionService: SubscriptionsService,
  ) {}

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
        await this.subscriptionService.onPaymentMembership(
          user.id,
          user.payment_link.membership,
          'LTC',
          'Activacion con Pago',
        );
      } catch (error) {
        console.error('Ocurrio un error al actualizar al sponsor', error);
      }
    }
    return 'pago actualizado con exito';
  }
}
