import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
} from '@nestjs/terminus';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private healthCheckService: HealthCheckService,
    private http: HttpHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.healthCheckService.check([
      () =>
        this.http.pingCheck(
          'mrcong-host',
          this.configService.get<string>('HOST'),
        ),
      () =>
        this.http.pingCheck('mrcong-ui', this.configService.get<string>('FE')),
      () =>
        this.http.pingCheck('mrcong-api', this.configService.get<string>('BE')),
    ]);
  }
}
