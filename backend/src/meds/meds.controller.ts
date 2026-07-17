import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import {
  ClearHistoryDto,
  CreateMedicationDto,
  HistoryQueryDto,
  InitDataDto,
  TakeMedicationDto,
  UpdateMedicationDto,
  UpdateSettingsDto,
} from './meds.dto';
import { MedsService } from './meds.service';

@Controller('meds')
export class MedsController {
  constructor(
    private readonly authService: AuthService,
    private readonly medsService: MedsService,
  ) {}

  private async session(initData?: string) {
    return this.authService.authenticateApp(initData ?? '', 'meds');
  }

  @Post('overview')
  async overview(@Body() dto: InitDataDto) {
    const session = await this.session(dto.initData);
    return this.medsService.overview(session.user.id);
  }

  @Post('list')
  async list(@Body() dto: InitDataDto) {
    const session = await this.session(dto.initData);
    return this.medsService.list(session.user.id);
  }

  @Post('history')
  async history(@Body() dto: HistoryQueryDto) {
    const session = await this.session(dto.initData);
    return this.medsService.history(session.user.id, {
      from: dto.from,
      to: dto.to,
      medicationId: dto.medicationId,
      limit: dto.limit,
      includeDeleted: dto.includeDeleted,
      onlyDeleted: dto.onlyDeleted,
    });
  }

  @Post('history/clear')
  async clearHistory(@Body() dto: ClearHistoryDto) {
    const session = await this.session(dto.initData);
    return this.medsService.clearHistory(session.user.id, {
      from: dto.from,
      to: dto.to,
    });
  }

  @Post('history/purge-deleted')
  async purgeDeleted(@Body() dto: InitDataDto) {
    const session = await this.session(dto.initData);
    return this.medsService.purgeDeleted(session.user.id);
  }

  @Post('history/:id/delete')
  async deleteIntake(@Param('id') id: string, @Body() dto: InitDataDto) {
    const session = await this.session(dto.initData);
    return this.medsService.deleteIntake(session.user.id, id);
  }

  @Post('history/:id/restore')
  async restoreIntake(@Param('id') id: string, @Body() dto: InitDataDto) {
    const session = await this.session(dto.initData);
    return this.medsService.restoreIntake(session.user.id, id);
  }

  @Post('settings')
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    const session = await this.session(dto.initData);
    return this.medsService.updateSettings(session.user.id, dto);
  }

  @Post('mute-today')
  async muteToday(@Body() dto: InitDataDto) {
    const session = await this.session(dto.initData);
    return this.medsService.muteToday(session.user.id);
  }

  @Post('unmute')
  async unmute(@Body() dto: InitDataDto) {
    const session = await this.session(dto.initData);
    return this.medsService.unmute(session.user.id);
  }

  @Post()
  async create(@Body() dto: CreateMedicationDto) {
    const session = await this.session(dto.initData);
    return this.medsService.create(session.user.id, dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateMedicationDto) {
    const session = await this.session(dto.initData);
    return this.medsService.update(session.user.id, id, dto);
  }

  @Post(':id/take')
  async take(@Param('id') id: string, @Body() dto: TakeMedicationDto) {
    const session = await this.session(dto.initData);
    return this.medsService.take(session.user.id, id, {
      tabletsCount: dto.tabletsCount,
      note: dto.note,
    });
  }
}
