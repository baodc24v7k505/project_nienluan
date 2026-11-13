import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { slugify } from '../common/utils/slugify';
import { transact } from '../common/commerce';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Không tìm thấy danh mục');
    return category;
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let slug = base;
    let suffix = 1;
    while (await this.prisma.category.findUnique({ where: { slug } })) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    return slug;
  }

  async create(dto: CreateCategoryDto) {
    if (dto.parentId) {
      await this.findOne(dto.parentId);
    }
    const slug = await this.uniqueSlug(dto.name);
    return this.prisma.category.create({
      data: { name: dto.name, slug, parentId: dto.parentId },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    return transact(this.prisma, async (tx) => {
      if (!(await tx.category.findUnique({ where: { id } })))
        throw new NotFoundException('Không tìm thấy danh mục');
      let parentId = dto.parentId;
      const seen = new Set([id]);
      while (parentId) {
        if (seen.has(parentId))
          throw new ConflictException('Danh mục cha tạo thành vòng lặp');
        seen.add(parentId);
        const parent = await tx.category.findUnique({
          where: { id: parentId },
        });
        if (!parent) throw new NotFoundException('Không tìm thấy danh mục cha');
        parentId = parent.parentId ?? undefined;
      }
      return tx.category.update({
        where: { id },
        data: { name: dto.name, parentId: dto.parentId },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }
}
