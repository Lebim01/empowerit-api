import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async sendEmail(email: string, otp: number) {
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'verify.topx@gmail.com',
        pass: 'rrizuyikklljfxcc',
      },
      secure: true,
    });

    const mailOptions = {
      from: 'verify.topx@gmail.com',
      to: email,
      subject: 'Codigo de verificación',
      text: `Este es tu código de verificación ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return { message: 'Error al enviar el correo:', error: error };
      } else {
        return { message: 'Correo enviado:', error: error };
      }
    });

   
  }
}
