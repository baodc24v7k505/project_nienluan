import { Controller, Get } from '@nestjs/common';
import { AdvertisementsService } from './advertisements.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('ads')
export class AdvertisementsController {
  constructor(private readonly advertisementsService: AdvertisementsService) {}

  @Public()
  @Get('active')
  getActive() {
    return this.advertisementsService.getActive();
  }
}
