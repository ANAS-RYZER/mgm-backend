import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { MongodbService } from './mongodb.service';

describe('MongodbService', () => {
  let service: MongodbService;

  beforeEach(async () => {
    const mockConnection = {
      on: jest.fn(),
      close: jest.fn(),
      db: {},
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongodbService,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<MongodbService>(MongodbService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

