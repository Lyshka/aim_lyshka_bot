import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from '../auth/auth.service';
import {
  FinanceCreateDebtDto,
  FinanceDeleteCashDto,
  FinanceDeleteDebtDto,
  FinanceInitDto,
  FinanceSetCashDto,
  FinanceUpdateDebtDto,
} from './finance.dto';
import { FinanceService } from './finance.service';

@Controller('finance')
export class FinanceController {
  constructor(
    private readonly authService: AuthService,
    private readonly financeService: FinanceService,
  ) {}

  @Post('overview')
  async overview(@Body() dto: FinanceInitDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'finance',
    );
    return this.financeService.overview(session.user.id);
  }

  @Post('alpha/connect')
  async alphaConnect(@Body() dto: FinanceInitDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'finance',
    );
    return this.financeService.alphaConnect(session.user.id);
  }

  @Get('alpha/callback')
  async alphaCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Res() res: Response,
  ) {
    if (error) {
      const url = this.financeService.buildAlphaReturnUrl(
        false,
        errorDescription ?? error,
      );
      return res.redirect(url);
    }

    try {
      await this.financeService.alphaCallback(code, state);
      return res.redirect(this.financeService.buildAlphaReturnUrl(true));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка авторизации';
      return res.redirect(this.financeService.buildAlphaReturnUrl(false, message));
    }
  }

  @Post('alpha/sync')
  async alphaSync(@Body() dto: FinanceInitDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'finance',
    );
    return this.financeService.alphaSync(session.user.id);
  }

  @Post('alpha/disconnect')
  async alphaDisconnect(@Body() dto: FinanceInitDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'finance',
    );
    return this.financeService.alphaDisconnect(session.user.id);
  }

  @Post('cash/set')
  async setCash(@Body() dto: FinanceSetCashDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'finance',
    );
    return this.financeService.setCash(
      session.user.id,
      dto.currency,
      dto.amount,
    );
  }

  @Post('cash/delete')
  async deleteCash(@Body() dto: FinanceDeleteCashDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'finance',
    );
    return this.financeService.deleteCash(session.user.id, dto.currency);
  }

  @Post('debts/create')
  async createDebt(@Body() dto: FinanceCreateDebtDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'finance',
    );
    return this.financeService.createDebt(session.user.id, {
      personName: dto.personName,
      amount: dto.amount,
      currency: dto.currency,
      direction: dto.direction,
      note: dto.note,
    });
  }

  @Post('debts/update')
  async updateDebt(@Body() dto: FinanceUpdateDebtDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'finance',
    );
    return this.financeService.updateDebt(session.user.id, dto.debtId, {
      personName: dto.personName,
      amount: dto.amount,
      currency: dto.currency,
      direction: dto.direction,
      note: dto.note,
    });
  }

  @Post('debts/delete')
  async deleteDebt(@Body() dto: FinanceDeleteDebtDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'finance',
    );
    return this.financeService.deleteDebt(session.user.id, dto.debtId);
  }
}
