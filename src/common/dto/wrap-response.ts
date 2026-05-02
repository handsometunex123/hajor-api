import { ApiProperty } from '@nestjs/swagger';

/**
 * Factory that generates a named Swagger-visible response envelope class.
 *
 * Every API endpoint goes through ResponseTransformInterceptor which wraps
 * the controller return value as:
 * {
 *   statusCode, timestamp, path, requestId, data: <controller return>, code
 * }
 *
 * Usage:
 *   @ApiResponse({ status: 200, type: wrapResponse(AuthTokenResponseDto) })
 *
 * Swagger will show a schema named "WrappedAuthTokenResponseDto" with `data`
 * typed as AuthTokenResponseDto.
 */
export function wrapResponse(DataType: new (...args: any[]) => any) {
  class WrappedResponse {
    @ApiProperty({ example: 200 })
    statusCode: number;

    @ApiProperty({ example: '2026-04-06T00:00:00.000Z' })
    timestamp: string;

    @ApiProperty({ example: '/endpoint' })
    path: string;

    @ApiProperty({ nullable: true, required: false, example: 'uuid-here' })
    requestId: string | null;

    @ApiProperty({ type: () => DataType })
    data: InstanceType<typeof DataType>;

    @ApiProperty({ example: 'OK' })
    code: string;
  }

  Object.defineProperty(WrappedResponse, 'name', {
    value: `Wrapped${DataType.name}`,
  });

  return WrappedResponse;
}

/**
 * Same as wrapResponse but `data` is an array of DataType.
 */
export function wrapArrayResponse(DataType: new (...args: any[]) => any) {
  class WrappedArrayResponse {
    @ApiProperty({ example: 200 })
    statusCode: number;

    @ApiProperty({ example: '2026-04-06T00:00:00.000Z' })
    timestamp: string;

    @ApiProperty({ example: '/endpoint' })
    path: string;

    @ApiProperty({ nullable: true, required: false, example: 'uuid-here' })
    requestId: string | null;

    @ApiProperty({ type: () => DataType, isArray: true })
    data: InstanceType<typeof DataType>[];

    @ApiProperty({ example: 'OK' })
    code: string;
  }

  Object.defineProperty(WrappedArrayResponse, 'name', {
    value: `WrappedArray${DataType.name}`,
  });

  return WrappedArrayResponse;
}
