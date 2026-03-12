import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_TYPE: Joi.string().valid('mysql', 'postgres').default('mysql'),
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  ADMIN_JWT_SECRET: Joi.string().min(32).required(),
  ADMIN_JWT_EXPIRES_IN: Joi.string().default('8h'),
  MSG91_AUTH_KEY: Joi.string().optional(),
  MSG91_SENDER_ID: Joi.string().optional(),
  MSG91_TEMPLATE_ID: Joi.string().optional(),
  OTP_EXPIRY_MINUTES: Joi.number().default(5),
  OTP_LENGTH: Joi.number().default(6),
  ALLOWED_ORIGINS: Joi.string().optional(),
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),
});
