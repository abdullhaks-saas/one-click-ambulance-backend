import {
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
  ExceptionFilter,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorLog } from '../../database/entities/error-log.entity';

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(
    @InjectRepository(ErrorLog)
    private readonly errorLogRepo: Repository<ErrorLog>,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    const errorResponse =
      typeof message === 'object' && message !== null && 'message' in message
        ? (message as { message: string | string[] })
        : { message: String(message) };

    this.logger.error(
      `${request.method} ${request.url} ${status} - ${JSON.stringify(errorResponse)}`,
    );

    if (status >= 500) {
      void this.persistServerError(request, status, exception).catch(() => {
        /* ignore logging failures */
      });
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...errorResponse,
    });
  }

  private async persistServerError(
    request: Request,
    status: number,
    exception: unknown,
  ) {
    const msg =
      exception instanceof Error
        ? exception.message
        : typeof exception === 'string'
          ? exception
          : JSON.stringify(exception);
    const stack = exception instanceof Error ? exception.stack ?? null : null;
    await this.errorLogRepo.save(
      this.errorLogRepo.create({
        level: 'error',
        message: `${status} ${request.method} ${request.url}: ${msg}`.slice(
          0,
          65000,
        ),
        stack: stack?.slice(0, 65000) ?? null,
        context: {
          status,
          headers: { 'user-agent': request.headers['user-agent'] },
        } as Record<string, unknown>,
        path: request.url,
        method: request.method,
      }),
    );
  }
}
