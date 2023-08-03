import { Body, Controller, Post } from "@nestjs/common";
import { AppService } from "./app.service";
import axios from "axios";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post("callbackPayment")
  async callbackPayment(@Body() body): Promise<any> {
    return axios.post(
      "https://onconfirmedtransaction-mdx7upthia-uc.a.run.app",
      body
    );
  }
}
