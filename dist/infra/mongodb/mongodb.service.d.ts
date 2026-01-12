import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Connection } from 'mongoose';
export declare class MongodbService implements OnModuleInit, OnModuleDestroy {
    private connection;
    private readonly logger;
    constructor(connection: Connection);
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    getConnection(): Connection;
    getDb(): import("mongodb").Db | undefined;
}
