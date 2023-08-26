import {
    Controller,
    Get,
    Query,
    Post,
    Body,
    HttpException,
    HttpStatus,
    Param,
} from '@nestjs/common';
import { db } from '../firebase/admin';

import { BinaryService } from 'src/binary/binary.service';


@Controller('binary')
export class BinaryController {
    constructor(
        private readonly binaryService: BinaryService,
    ) { }

    @Post('/match-points')
    async matchPoints(@Body() body: { userId: string }) {
        await this.binaryService.matchBinaryPoints(body.userId);
        return { success: true, message: 'Points matched successfully.' };
    }

}