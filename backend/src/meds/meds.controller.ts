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

  private async userId(initData?: string) {
    const session = await this.authService.authenticateApp(
      initData ?? '',
      'meds',
    );
    return session.user.id;
  }

  @Post('overview')
  async overview(@Body() dto: InitDataDto) {
    const userId = await this.userId(dto.initData);
    return this.medsService.overview(userId);
  }

  @Post('list')
  async list(@Body() dto: InitDataDto) {
    const userId = await this.userId(dto.initData);
    return this.medsService.list(userId);
  }

  @Post('history')
  async history(@Body() dto: HistoryQueryDto) {
    const userId = await this.userId(dto.initData);
    return this.medsService.history(userId, {
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
    const userId = await this.userId(dto.initData);
    return this.medsService.clearHistory(userId, {
      from: dto.from,
      to: dto.to,
    });
  }

  @Post('history/purge-deleted')
  async purgeDeleted(@Body() dto: InitDataDto) {
    const userId = await this.userId(dto.initData);
    return this.medsService.purgeDeleted(userId);
  }

  @Post('history/:id/delete')
  async deleteIntake(@Param('id') id: string, @Body() dto: InitDataDto) {
    const userId = await this.userId(dto.initData);
    return this.medsService.deleteIntake(userId, id);
  }

  @Post('history/:id/restore')
  async restoreIntake(@Param('id') id: string, @Body() dto: InitDataDto) {
    const userId = await this.userId(dto.initData);
    return this.medsService.restoreIntake(userId, id);
  }

  @Post('settings')
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    const userId = await this.userId(dto.initData);
    return this.medsService.updateSettings(userId, dto);
  }

  @Post()
  async create(@Body() dto: CreateMedicationDto) {
    const userId = await this.userId(dto.initData);
    return this.medsService.create(userId, dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateMedicationDto) {
    const userId = await this.userId(dto.initData);
    return this.medsService.update(userId, id, dto);
  }

  @Post(':id/take')
  async take(@Param('id') id: string, @Body() dto: TakeMedicationDto) {
    const userId = await this.userId(dto.initData);
    return this.medsService.take(userId, id, {
      tabletsCount: dto.tabletsCount,
      note: dto.note,
    });
  }
}
