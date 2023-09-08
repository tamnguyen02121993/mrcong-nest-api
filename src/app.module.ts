import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MrcongModule } from './mrcong/mrcong.module';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production' ? '.env' : '.env.local',
    }),
    MrcongModule,
    HealthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
