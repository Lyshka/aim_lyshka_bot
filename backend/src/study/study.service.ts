import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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

@Injectable()
export class StudyService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(userId: number) {
    const sections = await this.prisma.studySection.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        items: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            urls: {
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
    };
  }

  async createSection(userId: number, title: string) {
    const cleaned = title.trim();
    if (!cleaned) {
      throw new BadRequestException('Название раздела пустое');
    }

    const last = await this.prisma.studySection.findFirst({
      where: { userId },
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
      where: { id: sectionId, userId },
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
      where: { id: sectionId, userId },
    });
    if (!section) {
      throw new NotFoundException('Раздел не найден');
    }

    await this.prisma.studySection.delete({ where: { id: section.id } });
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
      where: { id: data.sectionId, userId },
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
      where: { sectionId: section.id, userId },
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

  async deleteItem(userId: number, itemId: string) {
    const item = await this.prisma.studyItem.findFirst({
      where: { id: itemId, userId },
    });
    if (!item) {
      throw new NotFoundException('Элемент не найден');
    }

    await this.prisma.studyItem.delete({ where: { id: item.id } });
    return this.overview(userId);
  }

  async deleteUrl(userId: number, urlId: string) {
    const entry = await this.prisma.studyItemUrl.findFirst({
      where: { id: urlId },
      include: { item: true },
    });
    if (!entry || Number(entry.item.userId) !== userId) {
      throw new NotFoundException('Ссылка не найдена');
    }

    await this.prisma.studyItemUrl.delete({ where: { id: entry.id } });

    const remaining = await this.prisma.studyItemUrl.count({
      where: { itemId: entry.itemId },
    });
    if (remaining === 0) {
      await this.prisma.studyItem.delete({ where: { id: entry.itemId } });
    }

    return this.overview(userId);
  }
}
