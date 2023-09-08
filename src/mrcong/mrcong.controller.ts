import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  Param,
  ParseIntPipe,
  Query,
  Res,
} from '@nestjs/common';
import { MrcongService } from './mrcong.service';
import { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('MrCong')
@Controller('mrcong')
export class MrcongController {
  constructor(private mrcongService: MrcongService) {}
  @Get('/categories')
  async getCategories(@Res() res: Response) {
    try {
      const categories = await this.mrcongService.getCategories();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 's-max-age=60, stale-while-revalidate');
      res.status(200).json(categories);
    } catch (error) {
      throw new BadRequestException('Something bad happened', {
        cause: new Error(),
        description: error?.message || 'Something bad happened',
      });
    }
  }

  @Get('/category/:category/page/:page')
  async getItemsByPageNumber(
    @Param('category') category: string,
    @Param('page', ParseIntPipe) page: number,
    @Res() res: Response,
  ) {
    try {
      const items = await this.mrcongService.getItemsByPageNumber(
        category,
        page,
      );
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 's-max-age=60, stale-while-revalidate');
      res.status(200).json(items);
    } catch (error) {
      throw new BadRequestException('Something bad happened', {
        cause: new Error(),
        description: error?.message || 'Something bad happened',
      });
    }
  }

  @Get('/detail')
  async getItemDetail(@Query('link') link: string, @Res() res: Response) {
    try {
      const itemDetail = await this.mrcongService.getItemDetail(link);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 's-max-age=60, stale-while-revalidate');
      res.status(200).json(itemDetail);
    } catch (error) {
      throw new BadRequestException('Something bad happened', {
        cause: new Error(),
        description: error?.message || 'Something bad happened',
      });
    }
  }
}
