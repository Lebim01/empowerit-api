import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SevenLevelsService } from './seven-levels.service';
import { Express } from 'express'; // Importa Express para acceder al tipo File

@Controller('seven-levels')
export class SevenLevelsController {
  constructor(private readonly sevenLevelsService: SevenLevelsService) {}

  @Post('readExcel')
  @UseInterceptors(FileInterceptor('file'))
  async readSevenLevelExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    // Pass the file buffer to the service for processing
    return this.sevenLevelsService.mainfunction(file.buffer);
  }

  @Post('testFunction')
  async testFunction() {
    return this.sevenLevelsService.getSevenSponsors(
      'jonathans_7328@hotmail.com',
      100,
    );
  }
}
