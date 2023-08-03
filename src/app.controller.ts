import { Body, Controller, Get, Post } from "@nestjs/common";
import { AppService } from "./app.service";
import axios from "axios";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("cryptoapisverifydomain")
  verifyDomain(){
    return "cryptoapis-cb-3c5ed9409121d6814c3c7383372faefb3ed72ccc4775a42c56c49e92949fc616";
  }

  @Post("callbackPayment")
  async callbackPayment(@Body() body): Promise<any> {
    return axios.post(
      "https://onconfirmedtransaction-mdx7upthia-uc.a.run.app",
      body
    );
  }
}
