import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let json: jest.Mock<void, [Record<string, unknown>]>;
  let status: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    json = jest.fn<void, [Record<string, unknown>]>();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'POST', url: '/api/v1/auth/register' }),
      }),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => jest.restoreAllMocks());

  const body = () => json.mock.calls[0][0];

  it('should preserve the status and message of an HttpException', () => {
    filter.catch(new ConflictException('Email already exists'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(body()).toMatchObject({
      statusCode: HttpStatus.CONFLICT,
      message: 'Email already exists',
      path: '/api/v1/auth/register',
      method: 'POST',
    });
  });

  it('should keep the validation message array from a BadRequestException', () => {
    filter.catch(new BadRequestException(['email must be an email']), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(body().message).toEqual(['email must be an email']);
  });

  it('should translate a unique violation into 409', () => {
    const driverError = Object.assign(new Error('duplicate key value'), {
      code: '23505',
    });

    filter.catch(new QueryFailedError('INSERT', [], driverError), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(body().message).toBe('Resource already exists');
  });

  it('should not treat other query failures as conflicts', () => {
    const driverError = Object.assign(new Error('syntax error'), {
      code: '42601',
    });

    filter.catch(new QueryFailedError('SELECT', [], driverError), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body().message).toBe('Internal server error');
  });

  it('should not leak details of an unexpected error', () => {
    filter.catch(
      new Error('connection string: postgres://user:hunter2@db'),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body().message).toBe('Internal server error');
    expect(JSON.stringify(body())).not.toContain('hunter2');
  });
});
