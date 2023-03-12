export class AppError extends Error {
  constructor(message: string, public extra?: unknown) {
    super(message);
  }
}
