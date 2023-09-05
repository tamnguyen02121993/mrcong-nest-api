import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MrcongModule } from './mrcong/mrcong.module';
import { DevtoolsModule } from '@nestjs/devtools-integration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DevtoolsModule.register({
      http: process.env.NODE_ENV !== 'production',
    }),
    MrcongModule,
  ],
})
export class AppModule {}
