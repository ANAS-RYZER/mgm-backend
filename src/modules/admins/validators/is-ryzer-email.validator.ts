import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsRyzerEmail(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isRyzerEmail',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }
          // Check if email ends with @ryzer.app
          return value.toLowerCase().endsWith('@ryzer.app');
        },
        defaultMessage(args: ValidationArguments) {
          return 'Admin email must be from @ryzer.app domain';
        },
      },
    });
  };
}

