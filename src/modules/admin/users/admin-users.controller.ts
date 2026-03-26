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
import { UserListQueryDto } from './dto/user-list-query.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AdminRequestUser } from '../drivers/interfaces/admin-request-user.interface';

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
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['all', 'blocked', 'active'],
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  listUsers(@Query() query: PaginationDto & UserListQueryDto) {
    return this.adminUsersService.listUsers(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full user profile with ride history' })
  @ApiResponse({ status: 200, description: 'User detail' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserById(@Param('id') id: string) {
    return this.adminUsersService.getUserById(id);
  }

  @Post('block/:id')
  @ApiOperation({ summary: 'Block user account' })
  @ApiResponse({ status: 200, description: 'User blocked' })
  @ApiResponse({ status: 404, description: 'User not found' })
  blockUser(@Param('id') id: string, @CurrentUser() user: AdminRequestUser) {
    return this.adminUsersService.blockUser(id, user.sub);
  }

  @Post('unblock/:id')
  @ApiOperation({ summary: 'Unblock user' })
  @ApiResponse({ status: 200, description: 'User unblocked' })
  @ApiResponse({ status: 404, description: 'User not found' })
  unblockUser(@Param('id') id: string, @CurrentUser() user: AdminRequestUser) {
    return this.adminUsersService.unblockUser(id, user.sub);
  }
}
