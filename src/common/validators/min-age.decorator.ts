import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function MinAge(minAge: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'minAge',
      target: object.constructor,
      propertyName,
      constraints: [minAge],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return false;
          const d = new Date(value);
          if (Number.isNaN(d.getTime())) return false;
          const now = new Date();
          const min = args.constraints[0];
          let age = now.getFullYear() - d.getFullYear();
          const m = now.getMonth() - d.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
            age -= 1;
          }
          return age >= min;
        },
        defaultMessage(args: ValidationArguments) {
          return `must be at least ${args.constraints[0]} years old`;
        },
      },
    });
  };
}
