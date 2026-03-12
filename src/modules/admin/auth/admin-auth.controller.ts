import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

@ApiTags('Admin — Auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Admin login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Returns access_token and admin profile',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto);
  }

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create new admin (super admin only)' })
  @ApiResponse({ status: 201, description: 'Admin created successfully' })
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.adminAuthService.createAdmin(dto.email, dto.password, dto.name);
  }
}
