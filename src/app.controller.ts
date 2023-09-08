import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('Home')
@Controller('')
export class AppController {
  @Get('')
  check(@Res() res: Response) {
    res.status(HttpStatus.OK).json({
      status: HttpStatus.OK,
    });
  }
}
