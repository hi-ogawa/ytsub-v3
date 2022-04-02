export class AppError extends Error {
  constructor(public message: string, public extra?: any) {
    super(message);
  }
}
