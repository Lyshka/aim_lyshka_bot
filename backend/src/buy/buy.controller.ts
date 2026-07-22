import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import {
  BuyAddItemDto,
  BuyCreateListDto,
  BuyInitDto,
  BuyItemIdDto,
  BuyJoinListDto,
  BuyListIdDto,
  BuyPreviewWildberriesDto,
  BuyRenameListDto,
  BuyUpdateItemDto,
} from './buy.dto';
import { BuyService } from './buy.service';

@Controller('buy')
export class BuyController {
  constructor(
    private readonly authService: AuthService,
    private readonly buyService: BuyService,
  ) {}

  @Post('overview')
  async overview(@Body() dto: BuyInitDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'buy',
    );
    return this.buyService.overview(session.user.id);
  }

  @Post('lists/create')
  async createList(@Body() dto: BuyCreateListDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'buy',
    );
    return this.buyService.createList(
      session.user.id,
      dto.title,
      Boolean(dto.shared),
    );
  }

  @Post('lists/join')
  async joinList(@Body() dto: BuyJoinListDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'buy',
    );
    return this.buyService.joinList(session.user.id, dto.code);
  }

  @Post('lists/leave')
  async leaveList(@Body() dto: BuyListIdDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'buy',
    );
    return this.buyService.leaveList(session.user.id, dto.listId);
  }

  @Post('lists/delete')
  async deleteList(@Body() dto: BuyListIdDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'buy',
    );
    return this.buyService.deleteList(session.user.id, dto.listId);
  }

  @Post('lists/rename')
  async renameList(@Body() dto: BuyRenameListDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'buy',
    );
    return this.buyService.renameList(
      session.user.id,
      dto.listId,
      dto.title,
    );
  }

  @Post('wildberries/preview')
  async previewWildberries(@Body() dto: BuyPreviewWildberriesDto) {
    await this.authService.authenticateApp(dto.initData ?? '', 'buy');
    return this.buyService.previewWildberries(dto.url);
  }

  @Post('items/add')
  async addItem(@Body() dto: BuyAddItemDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'buy',
    );
    return this.buyService.addItem(session.user.id, dto.listId, {
      url: dto.url,
      title: dto.title,
      note: dto.note,
      imageUrl: dto.imageUrl,
      productUrl: dto.productUrl,
    });
  }

  @Post('items/update')
  async updateItem(@Body() dto: BuyUpdateItemDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'buy',
    );
    return this.buyService.updateItem(session.user.id, dto.itemId, {
      title: dto.title,
      note: dto.note,
      imageUrl: dto.imageUrl,
      productUrl: dto.productUrl,
    });
  }

  @Post('items/toggle')
  async toggleItem(@Body() dto: BuyItemIdDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'buy',
    );
    return this.buyService.toggleItem(session.user.id, dto.itemId);
  }

  @Post('items/delete')
  async deleteItem(@Body() dto: BuyItemIdDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'buy',
    );
    return this.buyService.deleteItem(session.user.id, dto.itemId);
  }
}
