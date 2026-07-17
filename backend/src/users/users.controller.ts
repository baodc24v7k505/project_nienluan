import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('admin')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users')
  list(@Query() query: ListUsersQueryDto) {
    return this.usersService.list(query);
  }

  @Get('users/:id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('users/:id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.usersService.updateStatus(id, dto);
  }

  @Get('staff')
  listStaff(@Query() query: PaginationQueryDto) {
    return this.usersService.listStaff(query);
  }

  @Post('staff')
  createStaff(@Body() dto: CreateStaffDto) {
    return this.usersService.createStaff(dto);
  }

  @Delete('staff/:id')
  deleteStaff(@Param('id') id: string) {
    return this.usersService.deleteStaff(id);
  }
}
