import { ValidationOptions } from 'class-validator';
export declare function MinAge(minAge: number, validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
