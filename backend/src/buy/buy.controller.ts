import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from '../auth/auth.service';
import {
  BuyAddItemDto,
  BuyCreateListDto,
  BuyInitDto,
  BuyItemIdDto,
  BuyJoinListDto,
  BuyListIdDto,
  BuyRemoveMemberDto,
  BuyRenameListDto,
  BuyUpdateItemDto,
} from './buy.dto';
import { createBuyMulterOptions } from './buy-upload';
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

  @Post('lists/share-enable')
  async enableSharing(@Body() dto: BuyListIdDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'buy',
    );
    return this.buyService.enableSharing(session.user.id, dto.listId);
  }

  @Post('lists/members/remove')
  async removeMember(@Body() dto: BuyRemoveMemberDto) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'buy',
    );
    return this.buyService.removeMember(
      session.user.id,
      dto.listId,
      dto.memberUserId,
    );
  }

  @Post('items/add')
  @UseInterceptors(FileInterceptor('image', createBuyMulterOptions()))
  async addItem(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: BuyAddItemDto,
  ) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'buy',
    );
    return this.buyService.addItem(session.user.id, dto.listId, {
      title: dto.title,
      note: dto.note,
      productUrl: dto.productUrl,
      imageFilename: file?.filename,
    });
  }

  @Post('items/update')
  @UseInterceptors(FileInterceptor('image', createBuyMulterOptions()))
  async updateItem(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: BuyUpdateItemDto,
  ) {
    const session = await this.authService.authenticateApp(
      dto.initData ?? '',
      'buy',
    );
    return this.buyService.updateItem(session.user.id, dto.itemId, {
      title: dto.title,
      note: dto.note,
      productUrl: dto.productUrl,
      imageFilename: file?.filename,
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
