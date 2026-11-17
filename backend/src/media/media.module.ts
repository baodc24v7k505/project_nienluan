import {
  BadRequestException,
  Controller,
  Get,
  Module,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';

@Controller('media')
class MediaController {
  constructor(private readonly prisma: PrismaService) {}
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    }),
  )
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
    @Req() req: Request,
  ) {
    if (!file)
      throw new BadRequestException('Chọn ảnh JPEG, PNG hoặc WebP tối đa 2MB');
    const b = file.buffer;
    const mime = b
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? 'image/png'
      : b[0] === 255 && b[1] === 216 && b[2] === 255
        ? 'image/jpeg'
        : b.toString('ascii', 0, 4) === 'RIFF' &&
            b.toString('ascii', 8, 12) === 'WEBP'
          ? 'image/webp'
          : null;
    if (!mime || mime !== file.mimetype)
      throw new BadRequestException('Nội dung file không phải ảnh được hỗ trợ');
    if (
      (await this.prisma.mediaAsset.count({ where: { ownerId: user.id } })) >=
      200
    )
      throw new BadRequestException('Tài khoản đã đạt giới hạn 200 ảnh');
    const asset = await this.prisma.mediaAsset.create({
      data: { ownerId: user.id, mimeType: mime, data: new Uint8Array(b) },
      select: { id: true },
    });
    return {
      id: asset.id,
      url: `${process.env.PUBLIC_API_URL ?? `${req.protocol}://${req.get('host')}/api`}/media/${asset.id}`,
    };
  }
  @Public()
  @Get(':id')
  async image(@Param('id') id: string, @Res() res: Response) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) return res.sendStatus(404);
    res.set({
      'Content-Type': asset.mimeType,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    return res.send(Buffer.from(asset.data));
  }
}
@Module({ controllers: [MediaController] })
export class MediaModule {}
