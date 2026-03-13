import { AdminUser } from '../../../../database/entities/admin-user.entity';
import { Role } from '../../../../common/enums/role.enum';

export interface AdminRequestUser {
  sub: string;
  role: Role;
  entity: AdminUser;
}
