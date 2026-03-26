import { SetMetadata } from '@nestjs/common';

export const SKIP_TRANSFORM_KEY = 'skipResponseTransform';

/** Bypass ResponseTransformInterceptor (e.g. raw CSV / Excel download). */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);
