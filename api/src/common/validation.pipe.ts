import { BadRequestException, Injectable, ValidationPipe, ValidationError } from '@nestjs/common';

function flatten(error: ValidationError, parent = ''): string[] {
  const path = parent ? `${parent}.${error.property}` : error.property;
  const own = error.constraints ? Object.values(error.constraints).map((message) => `${path}: ${message}`) : [];
  const children = (error.children ?? []).flatMap((child) => flatten(child, path));
  return [...own, ...children];
}

@Injectable()
export class AppValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => new BadRequestException(errors.flatMap((error) => flatten(error))),
    });
  }
}
