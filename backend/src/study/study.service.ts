import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AppsService } from '../apps/apps.service';
import { PrismaService } from '../prisma/prisma.service';

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

function prepareUrls(rawUrls: string[]) {
  const urls: string[] = [];
  for (const raw of rawUrls) {
    const url = normalizeUrl(raw);
    if (!url) {
      continue;
    }
    try {
      new URL(url);
    } catch {
      throw new BadRequestException(`Некорректная ссылка: ${raw}`);
    }
    if (!urls.includes(url)) {
      urls.push(url);
    }
  }
  if (urls.length === 0) {
    throw new BadRequestException('Добавь хотя бы одну ссылку');
  }
  return urls;
}

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

@Injectable()
export class StudyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appsService: AppsService,
  ) {}

  private assertAdmin(userId: number) {
    if (!this.appsService.isAdmin(userId)) {
      throw new ForbiddenException('Корзина только для администратора');
    }
  }

  async overview(userId: number) {
    const sections = await this.prisma.studySection.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            urls: {
              where: { deletedAt: null },
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            },
          },
        },
      },
    });

    return {
      sections: sections.map((section) => ({
        id: section.id,
        title: section.title,
        sortOrder: section.sortOrder,
        items: section.items.map((item) => ({
          id: item.id,
          sectionId: item.sectionId,
          title: item.title,
          note: item.note,
          sortOrder: item.sortOrder,
          urls: item.urls.map((entry) => ({
            id: entry.id,
            url: entry.url,
            sortOrder: entry.sortOrder,
          })),
        })),
      })),
      isAdmin: this.appsService.isAdmin(userId),
    };
  }

  async trash(userId: number) {
    this.assertAdmin(userId);

    const [sections, items, urls] = await Promise.all([
      this.prisma.studySection.findMany({
        where: { userId, deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
        include: {
          items: {
            include: {
              urls: true,
            },
          },
        },
      }),
      this.prisma.studyItem.findMany({
        where: {
          userId,
          deletedAt: { not: null },
          section: { deletedAt: null },
        },
        orderBy: { deletedAt: 'desc' },
        include: {
          section: true,
          urls: true,
        },
      }),
      this.prisma.studyItemUrl.findMany({
        where: {
          deletedAt: { not: null },
          item: {
            userId,
            deletedAt: null,
            section: { deletedAt: null },
          },
        },
        orderBy: { deletedAt: 'desc' },
        include: {
          item: {
            include: { section: true },
          },
        },
      }),
    ]);

    return {
      sections: sections.map((section) => ({
        id: section.id,
        title: section.title,
        deletedAt: section.deletedAt?.toISOString() ?? null,
        itemsCount: section.items.length,
        urlsCount: section.items.reduce((sum, item) => sum + item.urls.length, 0),
      })),
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        sectionTitle: item.section.title,
        deletedAt: item.deletedAt?.toISOString() ?? null,
        urlsCount: item.urls.length,
      })),
      urls: urls.map((entry) => ({
        id: entry.id,
        url: entry.url,
        host: hostLabel(entry.url),
        itemTitle: entry.item.title,
        sectionTitle: entry.item.section.title,
        deletedAt: entry.deletedAt?.toISOString() ?? null,
      })),
    };
  }

  async createSection(userId: number, title: string) {
    const cleaned = title.trim();
    if (!cleaned) {
      throw new BadRequestException('Название раздела пустое');
    }

    const last = await this.prisma.studySection.findFirst({
      where: { userId, deletedAt: null },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    await this.prisma.studySection.create({
      data: {
        userId,
        title: cleaned,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });

    return this.overview(userId);
  }

  async updateSection(userId: number, sectionId: string, title: string) {
    const cleaned = title.trim();
    if (!cleaned) {
      throw new BadRequestException('Название раздела пустое');
    }

    const section = await this.prisma.studySection.findFirst({
      where: { id: sectionId, userId, deletedAt: null },
    });
    if (!section) {
      throw new NotFoundException('Раздел не найден');
    }

    await this.prisma.studySection.update({
      where: { id: section.id },
      data: { title: cleaned },
    });

    return this.overview(userId);
  }

  async deleteSection(userId: number, sectionId: string) {
    const section = await this.prisma.studySection.findFirst({
      where: { id: sectionId, userId, deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
          include: {
            urls: { where: { deletedAt: null } },
          },
        },
      },
    });
    if (!section) {
      throw new NotFoundException('Раздел не найден');
    }

    const deletedAt = new Date();
    const itemIds = section.items.map((item) => item.id);
    const urlIds = section.items.flatMap((item) =>
      item.urls.map((entry) => entry.id),
    );

    await this.prisma.$transaction([
      this.prisma.studySection.update({
        where: { id: section.id },
        data: { deletedAt },
      }),
      ...(itemIds.length
        ? [
            this.prisma.studyItem.updateMany({
              where: { id: { in: itemIds } },
              data: { deletedAt },
            }),
          ]
        : []),
      ...(urlIds.length
        ? [
            this.prisma.studyItemUrl.updateMany({
              where: { id: { in: urlIds } },
              data: { deletedAt },
            }),
          ]
        : []),
    ]);

    return this.overview(userId);
  }

  async createItem(
    userId: number,
    data: {
      sectionId: string;
      title: string;
      urls: string[];
      note?: string;
    },
  ) {
    const section = await this.prisma.studySection.findFirst({
      where: { id: data.sectionId, userId, deletedAt: null },
    });
    if (!section) {
      throw new NotFoundException('Раздел не найден');
    }

    const title = data.title.trim();
    if (!title) {
      throw new BadRequestException('Нужно название');
    }

    const urls = prepareUrls(data.urls);

    const last = await this.prisma.studyItem.findFirst({
      where: { sectionId: section.id, userId, deletedAt: null },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    await this.prisma.studyItem.create({
      data: {
        userId,
        sectionId: section.id,
        title,
        note: (data.note ?? '').trim(),
        sortOrder: (last?.sortOrder ?? -1) + 1,
        urls: {
          create: urls.map((url, index) => ({
            url,
            sortOrder: index,
          })),
        },
      },
    });

    return this.overview(userId);
  }

  async addUrls(
    userId: number,
    data: { itemId: string; urls: string[] },
  ) {
    const item = await this.prisma.studyItem.findFirst({
      where: { id: data.itemId, userId, deletedAt: null },
      include: {
        urls: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'desc' },
          take: 1,
        },
      },
    });
    if (!item) {
      throw new NotFoundException('Тема не найдена');
    }

    const urls = prepareUrls(data.urls);
    const existing = await this.prisma.studyItemUrl.findMany({
      where: { itemId: item.id, deletedAt: null },
      select: { url: true },
    });
    const existingSet = new Set(existing.map((entry) => entry.url));
    const fresh = urls.filter((url) => !existingSet.has(url));
    if (fresh.length === 0) {
      throw new BadRequestException('Эти ссылки уже есть в теме');
    }

    let sortOrder = item.urls[0]?.sortOrder ?? -1;
    await this.prisma.studyItemUrl.createMany({
      data: fresh.map((url) => {
        sortOrder += 1;
        return {
          itemId: item.id,
          url,
          sortOrder,
        };
      }),
    });

    return this.overview(userId);
  }

  async deleteItem(userId: number, itemId: string) {
    const item = await this.prisma.studyItem.findFirst({
      where: { id: itemId, userId, deletedAt: null },
      include: {
        urls: { where: { deletedAt: null } },
      },
    });
    if (!item) {
      throw new NotFoundException('Элемент не найден');
    }

    const deletedAt = new Date();
    const urlIds = item.urls.map((entry) => entry.id);

    await this.prisma.$transaction([
      this.prisma.studyItem.update({
        where: { id: item.id },
        data: { deletedAt },
      }),
      ...(urlIds.length
        ? [
            this.prisma.studyItemUrl.updateMany({
              where: { id: { in: urlIds } },
              data: { deletedAt },
            }),
          ]
        : []),
    ]);

    return this.overview(userId);
  }

  async deleteUrl(userId: number, urlId: string) {
    const entry = await this.prisma.studyItemUrl.findFirst({
      where: { id: urlId, deletedAt: null },
      include: { item: true },
    });
    if (!entry || Number(entry.item.userId) !== userId || entry.item.deletedAt) {
      throw new NotFoundException('Ссылка не найдена');
    }

    const deletedAt = new Date();
    await this.prisma.studyItemUrl.update({
      where: { id: entry.id },
      data: { deletedAt },
    });

    const remaining = await this.prisma.studyItemUrl.count({
      where: { itemId: entry.itemId, deletedAt: null },
    });
    if (remaining === 0) {
      await this.prisma.studyItem.update({
        where: { id: entry.itemId },
        data: { deletedAt },
      });
    }

    return this.overview(userId);
  }

  async restoreSection(userId: number, sectionId: string) {
    this.assertAdmin(userId);
    const section = await this.prisma.studySection.findFirst({
      where: { id: sectionId, userId, deletedAt: { not: null } },
      include: { items: { include: { urls: true } } },
    });
    if (!section) {
      throw new NotFoundException('Раздел не найден в корзине');
    }

    const itemIds = section.items.map((item) => item.id);
    const urlIds = section.items.flatMap((item) =>
      item.urls.map((entry) => entry.id),
    );

    await this.prisma.$transaction([
      this.prisma.studySection.update({
        where: { id: section.id },
        data: { deletedAt: null },
      }),
      ...(itemIds.length
        ? [
            this.prisma.studyItem.updateMany({
              where: { id: { in: itemIds } },
              data: { deletedAt: null },
            }),
          ]
        : []),
      ...(urlIds.length
        ? [
            this.prisma.studyItemUrl.updateMany({
              where: { id: { in: urlIds } },
              data: { deletedAt: null },
            }),
          ]
        : []),
    ]);

    return this.trash(userId);
  }

  async restoreItem(userId: number, itemId: string) {
    this.assertAdmin(userId);
    const item = await this.prisma.studyItem.findFirst({
      where: { id: itemId, userId, deletedAt: { not: null } },
      include: {
        section: true,
        urls: true,
      },
    });
    if (!item) {
      throw new NotFoundException('Тема не найдена в корзине');
    }

    const urlIds = item.urls.map((entry) => entry.id);

    await this.prisma.$transaction([
      ...(item.section.deletedAt
        ? [
            this.prisma.studySection.update({
              where: { id: item.sectionId },
              data: { deletedAt: null },
            }),
          ]
        : []),
      this.prisma.studyItem.update({
        where: { id: item.id },
        data: { deletedAt: null },
      }),
      ...(urlIds.length
        ? [
            this.prisma.studyItemUrl.updateMany({
              where: { id: { in: urlIds } },
              data: { deletedAt: null },
            }),
          ]
        : []),
    ]);

    return this.trash(userId);
  }

  async restoreUrl(userId: number, urlId: string) {
    this.assertAdmin(userId);
    const entry = await this.prisma.studyItemUrl.findFirst({
      where: { id: urlId, deletedAt: { not: null } },
      include: {
        item: { include: { section: true } },
      },
    });
    if (!entry || Number(entry.item.userId) !== userId) {
      throw new NotFoundException('Ссылка не найдена в корзине');
    }

    await this.prisma.$transaction([
      ...(entry.item.section.deletedAt
        ? [
            this.prisma.studySection.update({
              where: { id: entry.item.sectionId },
              data: { deletedAt: null },
            }),
          ]
        : []),
      ...(entry.item.deletedAt
        ? [
            this.prisma.studyItem.update({
              where: { id: entry.itemId },
              data: { deletedAt: null },
            }),
          ]
        : []),
      this.prisma.studyItemUrl.update({
        where: { id: entry.id },
        data: { deletedAt: null },
      }),
    ]);

    return this.trash(userId);
  }

  async purgeTrash(userId: number) {
    this.assertAdmin(userId);

    const sections = await this.prisma.studySection.findMany({
      where: { userId, deletedAt: { not: null } },
      select: { id: true },
    });
    const sectionIds = sections.map((item) => item.id);

    const orphanItems = await this.prisma.studyItem.findMany({
      where: {
        userId,
        deletedAt: { not: null },
        section: { deletedAt: null },
      },
      select: { id: true },
    });
    const orphanItemIds = orphanItems.map((item) => item.id);

    const orphanUrls = await this.prisma.studyItemUrl.findMany({
      where: {
        deletedAt: { not: null },
        item: {
          userId,
          deletedAt: null,
          section: { deletedAt: null },
        },
      },
      select: { id: true },
    });

    await this.prisma.$transaction([
      ...(orphanUrls.length
        ? [
            this.prisma.studyItemUrl.deleteMany({
              where: { id: { in: orphanUrls.map((item) => item.id) } },
            }),
          ]
        : []),
      ...(orphanItemIds.length
        ? [
            this.prisma.studyItem.deleteMany({
              where: { id: { in: orphanItemIds } },
            }),
          ]
        : []),
      ...(sectionIds.length
        ? [
            this.prisma.studySection.deleteMany({
              where: { id: { in: sectionIds } },
            }),
          ]
        : []),
    ]);

    return this.trash(userId);
  }
}
