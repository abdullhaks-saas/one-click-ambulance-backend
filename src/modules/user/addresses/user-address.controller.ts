import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { UserAddressService } from './user-address.service';
import { CreateUserAddressDto } from './dto/create-user-address.dto';

@ApiTags('User — Addresses')
@ApiBearerAuth('access-token')
@Roles(Role.USER)
@Controller('user')
export class UserAddressController {
  constructor(private readonly addressService: UserAddressService) {}

  @Get('addresses')
  @ApiOperation({ summary: 'List saved addresses' })
  list(@CurrentUser() auth: JwtPayload) {
    return this.addressService.list(auth.sub);
  }

  @Post('add-address')
  @ApiOperation({ summary: 'Save a new address' })
  add(@CurrentUser() auth: JwtPayload, @Body() dto: CreateUserAddressDto) {
    return this.addressService.add(auth.sub, dto);
  }

  @Delete('address')
  @ApiOperation({ summary: 'Delete saved address by id' })
  remove(
    @CurrentUser() auth: JwtPayload,
    @Query('id', ParseUUIDPipe) id: string,
  ) {
    return this.addressService.remove(auth.sub, id);
  }
}
