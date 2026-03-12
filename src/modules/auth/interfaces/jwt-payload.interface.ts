import { Role } from '../../../common/enums/role.enum';

export interface JwtPayload {
  sub: string;
  role: Role;
  mobile?: string;
  email?: string;
  admin_role?: string;
  iat?: number;
  exp?: number;
}
