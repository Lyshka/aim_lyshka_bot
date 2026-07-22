import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { fetchWildberriesProduct } from './buy-wildberries';

const SHARE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function uid(userId: number) {
  return BigInt(userId);
}

function normalizeUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function normalizeOptionalUrl(raw?: string) {
  if (!raw?.trim()) {
    return '';
  }
  const url = normalizeUrl(raw);
  try {
    new URL(url);
    return url;
  } catch {
    throw new BadRequestException('Некорректная ссылка');
  }
}

function userLabel(user: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
}) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (name) {
    return name;
  }
  if (user.username?.trim()) {
    return `@${user.username.trim()}`;
  }
  return 'Пользователь';
}

function generateShareCode() {
  const bytes = randomBytes(8);
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += SHARE_ALPHABET[bytes[i] % SHARE_ALPHABET.length];
  }
  return code;
}

@Injectable()
export class BuyService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(userId: number) {
    const lists = await this.loadAccessibleLists(userId);
    return {
      lists: lists.map((list) => this.serializeList(list, userId)),
    };
  }

  async createList(userId: number, titleRaw: string, shared = false) {
    const title = titleRaw.trim();
    if (!title) {
      throw new BadRequestException('Укажи название списка');
    }

    const maxOrder = await this.prisma.buyList.aggregate({
      where: { ownerId: uid(userId) },
      _max: { sortOrder: true },
    });

    let shareCode: string | null = null;
    if (shared) {
      shareCode = await this.createUniqueShareCode();
    }

    await this.prisma.buyList.create({
      data: {
        ownerId: uid(userId),
        title: title.slice(0, 80),
        isShared: shared,
        shareCode,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 10,
      },
    });

    return this.overview(userId);
  }

  async joinList(userId: number, codeRaw: string) {
    const code = codeRaw.trim().toUpperCase();
    if (!code) {
      throw new BadRequestException('Укажи код');
    }

    const list = await this.prisma.buyList.findFirst({
      where: {
        shareCode: code,
        isShared: true,
      },
      include: {
        members: true,
      },
    });

    if (!list) {
      throw new NotFoundException('Список с таким кодом не найден');
    }

    if (list.ownerId === uid(userId)) {
      throw new BadRequestException('Это твой список');
    }

    const alreadyMember = list.members.some(
      (member) => member.userId === uid(userId),
    );
    if (alreadyMember) {
      return this.overview(userId);
    }

    await this.prisma.buyListMember.create({
      data: {
        listId: list.id,
        userId: uid(userId),
      },
    });

    return this.overview(userId);
  }

  async enableSharing(userId: number, listId: string) {
    const list = await this.requireOwnedList(userId, listId);
    if (list.isShared && list.shareCode) {
      return this.overview(userId);
    }

    const shareCode = list.shareCode ?? (await this.createUniqueShareCode());
    await this.prisma.buyList.update({
      where: { id: list.id },
      data: {
        isShared: true,
        shareCode,
      },
    });

    return this.overview(userId);
  }

  async removeMember(userId: number, listId: string, memberUserId: number) {
    const list = await this.requireOwnedList(userId, listId);
    if (memberUserId === userId) {
      throw new BadRequestException('Нельзя удалить себя');
    }
    if (list.ownerId === uid(memberUserId)) {
      throw new BadRequestException('Нельзя удалить владельца');
    }

    const removed = await this.prisma.buyListMember.deleteMany({
      where: {
        listId: list.id,
        userId: uid(memberUserId),
      },
    });

    if (removed.count === 0) {
      throw new NotFoundException('Участник не найден');
    }

    return this.overview(userId);
  }

  async leaveList(userId: number, listId: string) {
    const list = await this.requireAccessibleList(userId, listId);
    if (list.ownerId === uid(userId)) {
      throw new BadRequestException('Владелец не может выйти — удали список');
    }

    await this.prisma.buyListMember.deleteMany({
      where: {
        listId: list.id,
        userId: uid(userId),
      },
    });

    return this.overview(userId);
  }

  async deleteList(userId: number, listId: string) {
    const list = await this.requireOwnedList(userId, listId);
    await this.prisma.buyList.delete({ where: { id: list.id } });
    return this.overview(userId);
  }

  async renameList(userId: number, listId: string, titleRaw: string) {
    const list = await this.requireOwnedList(userId, listId);
    const title = titleRaw.trim();
    if (!title) {
      throw new BadRequestException('Укажи название');
    }

    await this.prisma.buyList.update({
      where: { id: list.id },
      data: { title: title.slice(0, 80) },
    });

    return this.overview(userId);
  }

  async previewWildberries(urlRaw: string) {
    const product = await fetchWildberriesProduct(urlRaw);
    if (!product) {
      throw new BadRequestException(
        'Не удалось распознать ссылку Wildberries',
      );
    }
    return product;
  }

  async addItem(
    userId: number,
    listId: string,
    data: {
      url?: string;
      title?: string;
      note?: string;
      imageUrl?: string;
      productUrl?: string;
    },
  ) {
    const list = await this.requireAccessibleList(userId, listId);

    let title = data.title?.trim() ?? '';
    let note = data.note?.trim() ?? '';
    let imageUrl = normalizeOptionalUrl(data.imageUrl);
    let productUrl = normalizeOptionalUrl(data.productUrl ?? data.url);
    let source = 'manual';

    if (data.url?.trim()) {
      const wb = await fetchWildberriesProduct(data.url);
      if (wb) {
        title = wb.title;
        note = note || wb.note;
        imageUrl = wb.imageUrl;
        productUrl = wb.productUrl;
        source = 'wildberries';
      }
    }

    if (!title) {
      throw new BadRequestException('Укажи название');
    }

    const maxOrder = await this.prisma.buyListItem.aggregate({
      where: { listId: list.id },
      _max: { sortOrder: true },
    });

    await this.prisma.buyListItem.create({
      data: {
        listId: list.id,
        addedById: uid(userId),
        title: title.slice(0, 200),
        note: note.slice(0, 500),
        imageUrl: imageUrl.slice(0, 2000),
        productUrl: productUrl.slice(0, 2000),
        source,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 10,
      },
    });

    return this.overview(userId);
  }

  async updateItem(
    userId: number,
    itemId: string,
    patch: {
      title?: string;
      note?: string;
      imageUrl?: string;
      productUrl?: string;
    },
  ) {
    const item = await this.requireAccessibleItem(userId, itemId);
    const data: {
      title?: string;
      note?: string;
      imageUrl?: string;
      productUrl?: string;
    } = {};

    if (patch.title !== undefined) {
      const title = patch.title.trim();
      if (!title) {
        throw new BadRequestException('Укажи название');
      }
      data.title = title.slice(0, 200);
    }
    if (patch.note !== undefined) {
      data.note = patch.note.trim().slice(0, 500);
    }
    if (patch.imageUrl !== undefined) {
      data.imageUrl = normalizeOptionalUrl(patch.imageUrl).slice(0, 2000);
    }
    if (patch.productUrl !== undefined) {
      data.productUrl = normalizeOptionalUrl(patch.productUrl).slice(0, 2000);
    }

    await this.prisma.buyListItem.update({
      where: { id: item.id },
      data,
    });

    return this.overview(userId);
  }

  async toggleItem(userId: number, itemId: string) {
    const item = await this.requireAccessibleItem(userId, itemId);
    await this.prisma.buyListItem.update({
      where: { id: item.id },
      data: { purchased: !item.purchased },
    });
    return this.overview(userId);
  }

  async deleteItem(userId: number, itemId: string) {
    const item = await this.requireAccessibleItem(userId, itemId);
    await this.prisma.buyListItem.delete({ where: { id: item.id } });
    return this.overview(userId);
  }

  private async createUniqueShareCode() {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const shareCode = generateShareCode();
      const existing = await this.prisma.buyList.findUnique({
        where: { shareCode },
      });
      if (!existing) {
        return shareCode;
      }
    }
    throw new BadRequestException('Не удалось создать код');
  }

  private async loadAccessibleLists(userId: number) {
    return this.prisma.buyList.findMany({
      where: {
        OR: [
          { ownerId: uid(userId) },
          { members: { some: { userId: uid(userId) } } },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        owner: true,
        members: {
          include: { user: true },
          orderBy: { joinedAt: 'asc' },
        },
        items: {
          orderBy: [{ purchased: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: { addedBy: true },
        },
      },
    });
  }

  private serializeList(
    list: Awaited<ReturnType<BuyService['loadAccessibleLists']>>[number],
    userId: number,
  ) {
    const isOwner = list.ownerId === uid(userId);
    const members = [
      {
        userId: Number(list.ownerId),
        label: userLabel(list.owner),
        role: 'owner' as const,
      },
      ...list.members.map((member) => ({
        memberId: member.id,
        userId: Number(member.userId),
        label: userLabel(member.user),
        role: 'member' as const,
        joinedAt: member.joinedAt.toISOString(),
      })),
    ];

    return {
      id: list.id,
      title: list.title,
      isShared: list.isShared,
      shareCode: list.shareCode,
      isOwner,
      role: isOwner ? ('owner' as const) : ('member' as const),
      members,
      items: list.items.map((item) => ({
        id: item.id,
        title: item.title,
        note: item.note,
        imageUrl: item.imageUrl,
        productUrl: item.productUrl,
        source: item.source,
        purchased: item.purchased,
        sortOrder: item.sortOrder,
        addedById: Number(item.addedById),
        addedByLabel: userLabel(item.addedBy),
      })),
    };
  }

  private async requireOwnedList(userId: number, listId: string) {
    const list = await this.prisma.buyList.findFirst({
      where: {
        id: listId,
        ownerId: uid(userId),
      },
    });
    if (!list) {
      throw new NotFoundException('Список не найден');
    }
    return list;
  }

  private async requireAccessibleList(userId: number, listId: string) {
    const list = await this.prisma.buyList.findFirst({
      where: {
        id: listId,
        OR: [
          { ownerId: uid(userId) },
          { members: { some: { userId: uid(userId) } } },
        ],
      },
    });
    if (!list) {
      throw new NotFoundException('Список не найден');
    }
    return list;
  }

  private async requireAccessibleItem(userId: number, itemId: string) {
    const item = await this.prisma.buyListItem.findFirst({
      where: {
        id: itemId,
        list: {
          OR: [
            { ownerId: uid(userId) },
            { members: { some: { userId: uid(userId) } } },
          ],
        },
      },
    });
    if (!item) {
      throw new NotFoundException('Позиция не найдена');
    }
    return item;
  }
}
