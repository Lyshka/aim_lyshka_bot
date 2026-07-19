import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import {
  StudyCreateLinkDto,
  StudyCreateSectionDto,
  StudyDeleteLinkDto,
  StudyDeleteSectionDto,
  StudyInitDto,
  StudyUpdateLinkDto,
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
      'study',
    );
    return this.studyService.overview(session.user.id);
  }

  @Post('sections/create')
  async createSection(@Body() dto: StudyCreateSectionDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'study',
    );
    return this.studyService.createSection(session.user.id, dto.title);
  }

  @Post('sections/update')
  async updateSection(@Body() dto: StudyUpdateSectionDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'study',
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
      'study',
    );
    return this.studyService.deleteSection(session.user.id, dto.sectionId);
  }

  @Post('links/create')
  async createLink(@Body() dto: StudyCreateLinkDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'study',
    );
    return this.studyService.createLink(session.user.id, {
      sectionId: dto.sectionId,
      title: dto.title,
      url: dto.url,
      note: dto.note,
    });
  }

  @Post('links/update')
  async updateLink(@Body() dto: StudyUpdateLinkDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'study',
    );
    return this.studyService.updateLink(session.user.id, {
      linkId: dto.linkId,
      title: dto.title,
      url: dto.url,
      note: dto.note,
      sectionId: dto.sectionId,
    });
  }

  @Post('links/delete')
  async deleteLink(@Body() dto: StudyDeleteLinkDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'study',
    );
    return this.studyService.deleteLink(session.user.id, dto.linkId);
  }
}
