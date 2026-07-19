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

function serializeLink(link: {
  id: string;
  sectionId: string;
  title: string;
  url: string;
  note: string;
  sortOrder: number;
}) {
  return {
    id: link.id,
    sectionId: link.sectionId,
    title: link.title,
    url: link.url,
    note: link.note,
    sortOrder: link.sortOrder,
  };
}

function serializeSection(section: {
  id: string;
  title: string;
  sortOrder: number;
  links: {
    id: string;
    sectionId: string;
    title: string;
    url: string;
    note: string;
    sortOrder: number;
  }[];
}) {
  return {
    id: section.id,
    title: section.title,
    sortOrder: section.sortOrder,
    links: section.links.map(serializeLink),
  };
}

@Injectable()
export class StudyService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(userId: number) {
    const sections = await this.prisma.studySection.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        links: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    return {
      sections: sections.map(serializeSection),
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

  async createLink(
    userId: number,
    data: { sectionId: string; title: string; url: string; note?: string },
  ) {
    const section = await this.prisma.studySection.findFirst({
      where: { id: data.sectionId, userId },
    });
    if (!section) {
      throw new NotFoundException('Раздел не найден');
    }

    const title = data.title.trim();
    const url = normalizeUrl(data.url);
    if (!title || !url) {
      throw new BadRequestException('Нужны название и ссылка');
    }

    try {
      new URL(url);
    } catch {
      throw new BadRequestException('Некорректная ссылка');
    }

    const last = await this.prisma.studyLink.findFirst({
      where: { sectionId: section.id, userId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    await this.prisma.studyLink.create({
      data: {
        userId,
        sectionId: section.id,
        title,
        url,
        note: (data.note ?? '').trim(),
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });

    return this.overview(userId);
  }

  async updateLink(
    userId: number,
    data: {
      linkId: string;
      title?: string;
      url?: string;
      note?: string;
      sectionId?: string;
    },
  ) {
    const link = await this.prisma.studyLink.findFirst({
      where: { id: data.linkId, userId },
    });
    if (!link) {
      throw new NotFoundException('Ссылка не найдена');
    }

    let sectionId = link.sectionId;
    if (data.sectionId && data.sectionId !== link.sectionId) {
      const section = await this.prisma.studySection.findFirst({
        where: { id: data.sectionId, userId },
      });
      if (!section) {
        throw new NotFoundException('Раздел не найден');
      }
      sectionId = section.id;
    }

    let nextUrl: string | undefined;
    if (data.url !== undefined) {
      nextUrl = normalizeUrl(data.url);
      try {
        new URL(nextUrl);
      } catch {
        throw new BadRequestException('Некорректная ссылка');
      }
    }

    await this.prisma.studyLink.update({
      where: { id: link.id },
      data: {
        sectionId,
        title: data.title?.trim() || undefined,
        url: nextUrl,
        note: data.note !== undefined ? data.note.trim() : undefined,
      },
    });

    return this.overview(userId);
  }

  async deleteLink(userId: number, linkId: string) {
    const link = await this.prisma.studyLink.findFirst({
      where: { id: linkId, userId },
    });
    if (!link) {
      throw new NotFoundException('Ссылка не найдена');
    }

    await this.prisma.studyLink.delete({ where: { id: link.id } });
    return this.overview(userId);
  }
}
