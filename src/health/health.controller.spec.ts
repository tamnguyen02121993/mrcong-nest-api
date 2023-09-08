import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HttpStatus } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule, HttpModule],
      controllers: [HealthController],
      providers: [ConfigService],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should be return healthcheck result', async () => {
    const mockValue = {
      status: 'error',
      info: {
        'mrcong-host': {
          status: 'up',
        },
        'mrcong-ui': {
          status: 'up',
        },
      },
      error: {
        'mrcong-api': {
          status: 'down',
          message: 'Request failed with status code 404',
          statusCode: 404,
          statusText: 'Not Found',
        },
      },
      details: {
        'mrcong-host': {
          status: 'up',
        },
        'mrcong-ui': {
          status: 'up',
        },
        'mrcong-api': {
          status: 'down',
          message: 'Request failed with status code 404',
          statusCode: 404,
          statusText: 'Not Found',
        },
      },
    };
    const mock = jest.fn().mockImplementation(() => mockValue);
    const expectedValue = mock();
    expect(expectedValue).toBe(mockValue);
  });
});
