import { HttpModule, HttpModuleOptions } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MrcongController } from './mrcong.controller';
import { MrcongService } from './mrcong.service';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    HttpModule.register({
      timeout: 300000,
    }),
    MulterModule,
  ],
  controllers: [MrcongController],
  providers: [MrcongService],
})
export class MrcongModule {}
