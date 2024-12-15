import { IsEmail, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateTransactionDto {
  @IsNotEmpty()
  @IsString()
  cmd: string;

  @IsNotEmpty()
  @IsString()
  type: string;

  @IsNotEmpty()
  @IsString()
  currency1: string;

  @IsNotEmpty()
  @IsString()
  currency2: string;

  @IsNotEmpty()
  @IsEmail()
  buyer_email: string;

  @IsString()
  @IsNotEmpty()
  uid: string;
}

export class FirebaseObject {
  @IsString()
  amount: string;
  @IsString()
  uid: string;
  expires_at: any;
  @IsString()
  qrcode_url: string;
  @IsString()
  status_url: string;
  @IsString()
  checkout_url: string;
  @IsString()
  confirms_needed: string;
  @IsString()
  currency: Coins;
  @IsString()
  status: 'pending' | 'confirming' | 'paid';
  @IsString()
  address: string;
  @IsString()
  redirect_url?: string;
  @IsString()
  txn_id: string;
  @IsNumber()
  timeout: number;
}
