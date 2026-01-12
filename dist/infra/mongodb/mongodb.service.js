"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MongodbService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongodbService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let MongodbService = MongodbService_1 = class MongodbService {
    connection;
    logger = new common_1.Logger(MongodbService_1.name);
    constructor(connection) {
        this.connection = connection;
    }
    onModuleInit() {
        if (this.connection.readyState === 1) {
            const dbName = this.connection.db?.databaseName || 'unknown';
            const port = this.connection.port || 'unknown';
            const host = this.connection.host || 'unknown';
            this.logger.log(`✅ MongoDB connection successful - Host: ${host}, Port: ${port}, Database: ${dbName}`);
        }
        this.connection.on('connected', () => {
            const dbName = this.connection.db?.databaseName || 'unknown';
            const port = this.connection.port || 'unknown';
            const host = this.connection.host || 'unknown';
            this.logger.log(`✅ MongoDB connection successful - Host: ${host}, Port: ${port}, Database: ${dbName}`);
        });
        this.connection.on('error', (err) => {
            this.logger.error('❌ MongoDB error', err);
        });
        this.connection.on('disconnected', () => {
            this.logger.warn('⚠️ MongoDB disconnected');
        });
        this.connection.on('reconnected', () => {
            const dbName = this.connection.db?.databaseName || 'unknown';
            const port = this.connection.port || 'unknown';
            const host = this.connection.host || 'unknown';
            this.logger.log(`🔄 MongoDB reconnected - Host: ${host}, Port: ${port}, Database: ${dbName}`);
        });
    }
    async onModuleDestroy() {
        await this.connection.close();
        this.logger.log('MongoDB connection closed');
    }
    getConnection() {
        return this.connection;
    }
    getDb() {
        return this.connection.db;
    }
};
exports.MongodbService = MongodbService;
exports.MongodbService = MongodbService = MongodbService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], MongodbService);
//# sourceMappingURL=mongodb.service.js.map