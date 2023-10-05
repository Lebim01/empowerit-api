import { Controller, Post } from '@nestjs/common';
import { CloudflareService } from './cloudflare.service';

@Controller('cloudflare')
export class CloudflareController {
  constructor(private readonly cloudflareService: CloudflareService) {}

  @Post('uploadVideo')
  uploadVideo() {
    return this.cloudflareService.getUploadVideoUrl();
  }
}
