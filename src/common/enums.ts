// Central enums for group, wallet, and transaction statuses

export enum GroupStatus {
  NOT_STARTED = 'NOT_STARTED',
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum Frequency {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum PaystackProvisionStatus {
  PENDING = 'PENDING',
  PROVISIONED = 'PROVISIONED',
  FAILED = 'FAILED',
}

export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum TransactionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}
