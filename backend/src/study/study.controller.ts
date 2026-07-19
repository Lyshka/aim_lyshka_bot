import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import {
  StudyCreateItemDto,
  StudyAddUrlsDto,
  StudyCreateSectionDto,
  StudyDeleteItemDto,
  StudyDeleteSectionDto,
  StudyDeleteUrlDto,
  StudyInitDto,
  StudyRestoreItemDto,
  StudyRestoreSectionDto,
  StudyRestoreUrlDto,
  StudyUpdateSectionDto,
} from './study.dto';
import { StudyService } from './study.service';

@Controller('study')
export class StudyController {
  constructor(
    private readonly authService: AuthService,
    private readonly studyService: StudyService,
  ) {}

  @Post('overview')
  async overview(@Body() dto: StudyInitDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'links',
    );
    return this.studyService.overview(session.user.id);
  }

  @Post('trash')
  async trash(@Body() dto: StudyInitDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'links',
    );
    return this.studyService.trash(session.user.id);
  }

  @Post('sections/create')
  async createSection(@Body() dto: StudyCreateSectionDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'links',
    );
    return this.studyService.createSection(session.user.id, dto.title);
  }

  @Post('sections/update')
  async updateSection(@Body() dto: StudyUpdateSectionDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'links',
    );
    return this.studyService.updateSection(
      session.user.id,
      dto.sectionId,
      dto.title,
    );
  }

  @Post('sections/delete')
  async deleteSection(@Body() dto: StudyDeleteSectionDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'links',
    );
    return this.studyService.deleteSection(session.user.id, dto.sectionId);
  }

  @Post('sections/restore')
  async restoreSection(@Body() dto: StudyRestoreSectionDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'links',
    );
    return this.studyService.restoreSection(session.user.id, dto.sectionId);
  }

  @Post('items/create')
  async createItem(@Body() dto: StudyCreateItemDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'links',
    );
    return this.studyService.createItem(session.user.id, {
      sectionId: dto.sectionId,
      title: dto.title,
      urls: dto.urls,
      note: dto.note,
    });
  }

  @Post('items/add-urls')
  async addUrls(@Body() dto: StudyAddUrlsDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'links',
    );
    return this.studyService.addUrls(session.user.id, {
      itemId: dto.itemId,
      urls: dto.urls,
    });
  }

  @Post('items/delete')
  async deleteItem(@Body() dto: StudyDeleteItemDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'links',
    );
    return this.studyService.deleteItem(session.user.id, dto.itemId);
  }

  @Post('items/restore')
  async restoreItem(@Body() dto: StudyRestoreItemDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'links',
    );
    return this.studyService.restoreItem(session.user.id, dto.itemId);
  }

  @Post('urls/delete')
  async deleteUrl(@Body() dto: StudyDeleteUrlDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'links',
    );
    return this.studyService.deleteUrl(session.user.id, dto.urlId);
  }

  @Post('urls/restore')
  async restoreUrl(@Body() dto: StudyRestoreUrlDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'links',
    );
    return this.studyService.restoreUrl(session.user.id, dto.urlId);
  }

  @Post('trash/purge')
  async purgeTrash(@Body() dto: StudyInitDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'links',
    );
    return this.studyService.purgeTrash(session.user.id);
  }
}
