import { Role } from '../../../common/enums/role.enum';

export interface AdminJwtPayload {
  sub: string;
  role: Role;
  email?: string;
  admin_role?: string;
}
