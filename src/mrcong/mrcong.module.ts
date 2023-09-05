import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MrcongController } from './mrcong.controller';
import { MrcongService } from './mrcong.service';

@Module({
  imports: [HttpModule],
  controllers: [MrcongController],
  providers: [MrcongService],
})
export class MrcongModule {}
