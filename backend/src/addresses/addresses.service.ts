import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { transact } from '../common/commerce';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    });
  }

  private async getOwnedOrThrow(userId: string, id: string) {
    const address = await this.prisma.address.findUnique({ where: { id } });
    if (!address || address.userId !== userId) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }
    return address;
  }

  async create(userId: string, dto: CreateAddressDto) {
    return transact(this.prisma, async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }
      return tx.address.create({ data: { ...dto, userId } });
    });
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    return transact(this.prisma, async (tx) => {
      if (!(await tx.address.findFirst({ where: { id, userId } })))
        throw new NotFoundException('Không tìm thấy địa chỉ');
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }
      return tx.address.update({ where: { id }, data: dto });
    });
  }

  async remove(userId: string, id: string) {
    return transact(this.prisma, async (tx) => {
      const address = await tx.address.findFirst({ where: { id, userId } });
      if (!address) throw new NotFoundException('Không tìm thấy địa chỉ');
      await tx.address.delete({ where: { id } });
      if (address.isDefault) {
        const next = await tx.address.findFirst({
          where: { userId },
          orderBy: { id: 'asc' },
        });
        if (next)
          await tx.address.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
      }
      return { success: true };
    });
  }
}
