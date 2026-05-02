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
var NotificationQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationQueueService = void 0;
const common_1 = require("@nestjs/common");
const queue_service_1 = require("./queue.service");
let NotificationQueueService = NotificationQueueService_1 = class NotificationQueueService {
    constructor(queue) {
        this.queue = queue;
        this.logger = new common_1.Logger(NotificationQueueService_1.name);
    }
    async sendNotification(userId, type, payload, opts = {}) {
        this.logger.log(`Queueing notification for user=${userId} type=${type}`);
        return this.queue.addNotificationJob('send-notification', { userId, type, payload }, opts);
    }
};
exports.NotificationQueueService = NotificationQueueService;
exports.NotificationQueueService = NotificationQueueService = NotificationQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [queue_service_1.QueueService])
], NotificationQueueService);
//# sourceMappingURL=notification-queue.service.js.map