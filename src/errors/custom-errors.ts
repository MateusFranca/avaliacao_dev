// CORRIGIDO #18: Classes de erro customizadas para códigos HTTP apropriados

export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string = 'Resource already exists') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends Error {
  constructor(message: string = 'Validation failed') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class BadRequestError extends Error {
  constructor(message: string = 'Bad request') {
    super(message);
    this.name = 'BadRequestError';
  }
}
