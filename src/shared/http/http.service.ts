import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

@Injectable()
export class HttpService implements OnModuleInit {
  private readonly logger = new Logger(HttpService.name);
  private axiosInstance: AxiosInstance;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.addRequestInterceptor();
    this.addResponseInterceptor();
  }

  private addRequestInterceptor() {
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.configService.get('NODE_ENV') === 'development') {
          this.logger.debug(
            `[HTTP OUT] ${config.method?.toUpperCase()} ${config.url}`,
          );
        }

        const url = config.url || '';
        if (url.includes('maps.googleapis.com')) {
          config.params = {
            ...config.params,
            key: this.configService.get('GOOGLE_MAPS_API_KEY'),
          };
        }

        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error', error);
        return Promise.reject(error);
      },
    );
  }

  private addResponseInterceptor() {
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        this.logger.debug(
          `[HTTP IN] ${response.status} ${response.config.url}`,
        );
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        this.logger.error(
          `[HTTP ERR] ${error.response?.status} ${originalRequest?.url}: ${error.message}`,
        );

        const normalizedError = {
          status: error.response?.status || 500,
          message: error.response?.data?.message || error.message,
          url: originalRequest?.url,
        };

        return Promise.reject(normalizedError);
      },
    );
  }

  get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }

  delete<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }
}
