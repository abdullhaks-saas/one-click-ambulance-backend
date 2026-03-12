import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminUsersService } from './admin-users.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@ApiTags('Admin — User Management')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  listUsers(@Query() query: PaginationDto) {
    return this.adminUsersService.listUsers(query);
  }

  @Post('block/:id')
  @ApiOperation({ summary: 'Block user account' })
  blockUser(@Param('id') id: string) {
    return this.adminUsersService.blockUser(id);
  }

  @Post('unblock/:id')
  @ApiOperation({ summary: 'Unblock user' })
  unblockUser(@Param('id') id: string) {
    return this.adminUsersService.unblockUser(id);
  }
}
