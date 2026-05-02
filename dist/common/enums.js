"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionStatus = exports.TransactionType = exports.PaystackProvisionStatus = exports.Frequency = exports.GroupStatus = void 0;
var GroupStatus;
(function (GroupStatus) {
    GroupStatus["NOT_STARTED"] = "NOT_STARTED";
    GroupStatus["STARTED"] = "STARTED";
    GroupStatus["COMPLETED"] = "COMPLETED";
    GroupStatus["ARCHIVED"] = "ARCHIVED";
})(GroupStatus || (exports.GroupStatus = GroupStatus = {}));
var Frequency;
(function (Frequency) {
    Frequency["WEEKLY"] = "WEEKLY";
    Frequency["MONTHLY"] = "MONTHLY";
})(Frequency || (exports.Frequency = Frequency = {}));
var PaystackProvisionStatus;
(function (PaystackProvisionStatus) {
    PaystackProvisionStatus["PENDING"] = "PENDING";
    PaystackProvisionStatus["PROVISIONED"] = "PROVISIONED";
    PaystackProvisionStatus["FAILED"] = "FAILED";
})(PaystackProvisionStatus || (exports.PaystackProvisionStatus = PaystackProvisionStatus = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["CREDIT"] = "CREDIT";
    TransactionType["DEBIT"] = "DEBIT";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["SUCCESS"] = "SUCCESS";
    TransactionStatus["FAILED"] = "FAILED";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
//# sourceMappingURL=enums.js.map