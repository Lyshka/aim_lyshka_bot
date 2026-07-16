import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AppsService } from '../apps/apps.service';
import { AdminInitDto, SetGrantDto } from './admin.dto';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly authService: AuthService,
    private readonly appsService: AppsService,
  ) {}

  private async adminId(initData?: string) {
    const session = await this.authService.authenticate(initData ?? '');
    this.appsService.assertAdmin(session.user.id);
    return session.user.id;
  }

  @Post('overview')
  async overview(@Body() dto: AdminInitDto) {
    await this.adminId(dto.initData);
    const [apps, users] = await Promise.all([
      this.appsService.listAllApps(),
      this.appsService.listUsersWithGrants(),
    ]);
    return { apps, users };
  }

  @Post('grants')
  async setGrant(@Body() dto: SetGrantDto) {
    await this.adminId(dto.initData);
    await this.appsService.setGrant(dto.userId, dto.appSlug, dto.enabled);
    const [apps, users] = await Promise.all([
      this.appsService.listAllApps(),
      this.appsService.listUsersWithGrants(),
    ]);
    return { apps, users };
  }
}
