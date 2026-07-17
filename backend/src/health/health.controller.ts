import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { HealthIngestDto, HealthInitDto, HealthManualDto } from './health.dto';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly authService: AuthService,
    private readonly healthService: HealthService,
  ) {}

  @Post('overview')
  async overview(@Body() dto: HealthInitDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'health',
    );
    return this.healthService.overview(session.user.id);
  }

  @Post('manual')
  async manual(@Body() dto: HealthManualDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'health',
    );
    return this.healthService.upsertDay(session.user.id, {
      day: dto.day,
      steps: dto.steps,
      weightKg: dto.weightKg,
      bodyFatPercent: dto.bodyFatPercent,
      bmi: dto.bmi,
      heightCm: dto.heightCm,
      leanBodyMassKg: dto.leanBodyMassKg,
      source: 'manual',
    });
  }

  @Post('ingest')
  async ingest(@Body() dto: HealthIngestDto) {
    this.healthService.assertIngestToken(dto.token);
    return this.healthService.upsertDay(dto.userId, {
      day: dto.day,
      steps: dto.steps,
      weightKg: dto.weightKg,
      bodyFatPercent: dto.bodyFatPercent,
      leanBodyMassKg: dto.leanBodyMassKg,
      muscleMassKg: dto.muscleMassKg,
      waterPercent: dto.waterPercent,
      boneMassKg: dto.boneMassKg,
      bmi: dto.bmi,
      heightCm: dto.heightCm,
      distanceKm: dto.distanceKm,
      flightsClimbed: dto.flightsClimbed,
      restingEnergyKcal: dto.restingEnergyKcal,
      activeEnergyKcal: dto.activeEnergyKcal,
      walkingSpeedKmh: dto.walkingSpeedKmh,
      walkingStepLengthCm: dto.walkingStepLengthCm,
      walkingAsymmetryPercent: dto.walkingAsymmetryPercent,
      doubleSupportPercent: dto.doubleSupportPercent,
      walkingSteadiness: dto.walkingSteadiness,
      headphoneLevel: dto.headphoneLevel,
      sleepScore: dto.sleepScore,
      source: dto.source?.trim() || 'apple_health',
    });
  }
}
