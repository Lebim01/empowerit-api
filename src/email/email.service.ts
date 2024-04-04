import { Injectable } from '@nestjs/common';
import { db } from 'src/firebase/admin';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

@Injectable()
export class EmailService {
  transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'Gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'your_email@gmail.com',
        pass: 'your_app_password',
      },
    });
  }

  async sendEmailNewUser(id_user: string) {
    const user = await db.collection('users').doc(id_user).get();

    const template = `
      ${user.get('name')}, Felicidades por registrarte
    `;
    const mailOptions = {
      from: 'empowerittop@gmail.com',
      to: user.get('email'),
      subject: 'Bienvenido a la familia EMPOWERIT TOP',
      text: template,
    };

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email: ', error);
          reject(error);
        } else {
          console.log('Email sent: ', info.response);
          resolve(info.response);
        }
      });
    });
  }
}
