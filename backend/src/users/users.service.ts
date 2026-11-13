import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.search
        ? {
            OR: [
              {
                email: { contains: query.search, mode: 'insensitive' as const },
              },
              {
                fullName: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: SAFE_USER_SELECT,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async listStaff(query: PaginationQueryDto) {
    return this.list({ ...query, role: Role.STAFF });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto) {
    const user = await this.findOne(id);
    if (user.role === Role.ADMIN)
      throw new ConflictException('Không thể khóa tài khoản quản trị viên');
    if (dto.status === 'BANNED')
      await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    return this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
      select: SAFE_USER_SELECT,
    });
  }

  async createStaff(dto: CreateStaffDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email đã được sử dụng');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone,
        role: Role.STAFF,
      },
      select: SAFE_USER_SELECT,
    });
  }

  async deleteStaff(id: string) {
    const user = await this.findOne(id);
    if (user.role !== Role.STAFF) {
      throw new ConflictException('Chỉ có thể xóa tài khoản nhân viên');
    }
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }
}
