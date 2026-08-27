import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

/**
 * API response for successful authentication
 */
export function AuthSuccessResponse() {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: 'Authentication successful',
      schema: {
        type: 'object',
        properties: {
          access_token: { type: 'string', description: 'JWT access token' },
          refresh_token: {
            type: 'string',
            description: 'JWT refresh token for token renewal',
          },
        },
        example: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    }),
  );
}

/**
 * API response for user profile
 */
export function UserProfileResponse() {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: 'User profile retrieved',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'User ID' },
          email: {
            type: 'string',
            format: 'email',
            description: 'Email address',
          },
          role: {
            type: 'string',
            enum: ['user', 'admin', 'manager'],
            description: 'User role',
          },
          isActive: { type: 'boolean', description: 'Account active status' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    }),
  );
}

/**
 * Common error responses for auth endpoints
 */
export function AuthErrorResponses() {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description: 'Validation error',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'array',
            items: { type: 'string' },
            example: [
              'email must be an email',
              'password must be at least 8 characters',
            ],
          },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Invalid credentials',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Invalid credentials' },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
    ApiResponse({
      status: 409,
      description: 'Conflict - Email already exists',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 409 },
          message: { type: 'string', example: 'Email already exists' },
          error: { type: 'string', example: 'Conflict' },
        },
      },
    }),
    ApiResponse({
      status: 429,
      description: 'Too many requests',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 429 },
          message: { type: 'string', example: 'Too many requests' },
          error: { type: 'string', example: 'Too Many Requests' },
        },
      },
    }),
  );
}
