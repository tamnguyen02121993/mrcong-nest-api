import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { MrcongService } from './mrcong.service';
import { Response } from 'express';
import { ConvertLinkRequest } from '../models/requests';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';

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
  async getItemsByCategoryAndPageNumber(
    @Param('category') category: string,
    @Param('page', ParseIntPipe) page: number,
    @Res() res: Response,
  ) {
    try {
      const items = await this.mrcongService.getItemsByCategoryAndPageNumber(
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

  @Post('/convert-link')
  async convertOuoLink(
    @Body() convertLinkRequest: ConvertLinkRequest,
    @Res() res: Response,
  ) {
    try {
      const result = await this.mrcongService.convertLink(
        convertLinkRequest.url,
      );
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 's-max-age=60, stale-while-revalidate');
      res.status(200).json(result);
    } catch (error) {
      throw new BadRequestException('Something bad happened', {
        cause: new Error(),
        description: error?.message || 'Something bad happened',
      });
    }
  }

  @Get('/get-json-by-category')
  async getJsonDataByCategory(
    @Query('category') category: string,
    @Query('start', ParseIntPipe) start: number,
    @Query('end', ParseIntPipe) end: number,
    @Res() res: Response,
  ) {
    try {
      const data = await this.mrcongService.getJsonDataByCategory(
        category,
        start,
        end,
      );
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=mrcong-data-${category}-${start}-${end}.json`,
      );
      res.send(data);
    } catch (error) {
      throw new BadRequestException('Something bad happened', {
        cause: new Error(),
        description: error?.message || 'Something bad happened',
      });
    }
  }

  @Get('/getMaxOfCategory')
  async getMaxOfCategory(@Query('category') category: string) {
    try {
      const data = await this.mrcongService.getMaxOfCategory(category);
      return data;
    } catch (error) {
      throw new BadRequestException('Something bad happened', {
        cause: new Error(),
        description: error?.message || 'Something bad happened',
      });
    }
  }

  @Post('/mergeJsonData')
  @UseInterceptors(FilesInterceptor('files'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  async mergeJsonData(
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
  ) {
    try {
      const data = await this.mrcongService.mergeJsonData(files);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=merged-json-data.json`,
      );
      res.send(data);
    } catch (error) {
      throw new BadRequestException('Something bad happened', {
        cause: new Error(),
        description: error?.message || 'Something bad happened',
      });
    }
  }

  @Get('/page/:page')
  async getItemsByPageNumber(
    @Param('page', ParseIntPipe) page: number,
    @Res() res: Response,
  ) {
    try {
      const items = await this.mrcongService.getItemsByPageNumber(page);
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

  @Get('/get-json')
  async getJsonData(@Res() res: Response) {
    try {
      const data = await this.mrcongService.getJsonData();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=mrcong-data.json`,
      );
      res.send(data);
    } catch (error) {
      throw new BadRequestException('Something bad happened', {
        cause: new Error(),
        description: error?.message || 'Something bad happened',
      });
    }
  }
}
