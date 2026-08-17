import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { bearerClaims } from '../../shared/auth.js';
import { checkDatabaseConnection, prisma } from '../../shared/db.js';
import { storyFixtures } from '../stories/story-fixtures.js';

const wallPostSchema = z.object({
  body: z.string().trim().min(1).max(1000),
});

type MockWallPost = {
  id: string;
  profileUsername: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  body: string;
  createdAt: string;
};

const mockFollows = new Set<string>();
const mockWallPosts: MockWallPost[] = [];

function authUserId(authorization?: unknown): string | null {
  return bearerClaims(authorization)?.userId ?? null;
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function usernameFilter(username: string) {
  return { equals: username, mode: 'insensitive' as const };
}

function fixtureBio(username: string): string {
  if (username === 'marina-solis') {
    return 'Cartografa e investigadora de leyendas maritimas. Escribo historias donde el mar oculta secretos viejos.';
  }
  if (username === 'tomas-vidal') {
    return 'Escritor de ciencia ficcion especulativa y tecnologia del pasado.';
  }
  return '';
}

function fixtureProfile(username: string, requesterId: string | null) {
  const stories = storyFixtures.filter((story) => story.authorUsername === username);
  if (!stories.length) return null;
  const displayName = stories[0]?.author ?? username;
  return {
    id: `user-${username}`,
    username,
    displayName,
    bio: fixtureBio(username),
    avatarUrl: null,
    followerCount: [...mockFollows].filter((key) => key.endsWith(`:${username}`)).length,
    followingCount: 0,
    isFollowing: requesterId ? mockFollows.has(`${requesterId}:${username}`) : false,
    stories,
  };
}

function mapStory(story: {
  id: string;
  title: string;
  synopsis: string;
  status: string;
  isMature: boolean;
  coverUrl: string | null;
  publishedChapterCount: number;
  author: { username: string; profile: { displayName: string } | null };
  genres: Array<{ genre: { name: string } }>;
  tags: Array<{ tag: { name: string; kind: string } }>;
  languageCode: string;
}) {
  return {
    id: story.id,
    title: story.title,
    author: story.author.profile?.displayName ?? story.author.username,
    authorUsername: story.author.username,
    synopsis: story.synopsis,
    genre: story.genres[0]?.genre.name ?? 'General',
    genres: story.genres.map((item) => item.genre.name),
    tags: story.tags.map((item) => ({ name: item.tag.name, kind: item.tag.kind })),
    languageCode: story.languageCode,
    status: story.status,
    chapterCount: story.publishedChapterCount,
    isMature: story.isMature,
    coverColor: story.coverUrl ?? '#855300',
  };
}

export function registerSocialRoutes(app: FastifyInstance): void {
  app.get<{ Params: { username: string } }>('/v1/users/:username', async (request, reply) => {
    const username = normalizeUsername(request.params.username);
    const requesterId = authUserId(request.headers.authorization);

    if (!(await checkDatabaseConnection())) {
      const profile = fixtureProfile(username, requesterId);
      if (!profile) {
        return reply.status(404).send({
          error: { code: 'USER_NOT_FOUND', message: 'No se encontro el usuario.' },
        });
      }
      return { data: profile };
    }

    const user = await prisma.user.findFirst({
      where: { username: usernameFilter(username), accountStatus: 'active', deletedAt: null },
      include: {
        profile: true,
        stories: {
          where: { status: { in: ['published', 'completed'] } },
          orderBy: { publishedAt: 'desc' },
          include: {
            author: { include: { profile: true } },
            genres: { include: { genre: true } },
            tags: { include: { tag: true } },
          },
        },
        _count: { select: { followers: true, following: true } },
      },
    });
    if (!user) {
      return reply.status(404).send({
        error: { code: 'USER_NOT_FOUND', message: 'No se encontro el usuario.' },
      });
    }

    const isFollowing = requesterId
      ? Boolean(await prisma.userFollow.findUnique({
          where: { followerId_followingId: { followerId: requesterId, followingId: user.id } },
          select: { followerId: true },
        }).catch(() => null))
      : false;

    return {
      data: {
        id: user.id,
        username: user.username,
        displayName: user.profile?.displayName ?? user.username,
        bio: user.profile?.bio ?? '',
        avatarUrl: user.profile?.avatarUrl ?? null,
        followerCount: user._count.followers,
        followingCount: user._count.following,
        isFollowing,
        stories: user.stories.map(mapStory),
      },
    };
  });

  app.post<{ Params: { username: string } }>('/v1/users/:username/follow', async (request, reply) => {
    const followerId = authUserId(request.headers.authorization);
    if (!followerId) {
      return reply.status(401).send({
        error: { code: 'AUTH_REQUIRED', message: 'Inicia sesion para seguir usuarios.' },
      });
    }
    const username = normalizeUsername(request.params.username);

    if (!(await checkDatabaseConnection())) {
      const profile = fixtureProfile(username, followerId);
      if (!profile) {
        return reply.status(404).send({
          error: { code: 'USER_NOT_FOUND', message: 'No se encontro el usuario.' },
        });
      }
      const key = `${followerId}:${username}`;
      if (mockFollows.has(key)) mockFollows.delete(key);
      else mockFollows.add(key);
      return {
        data: {
          username,
          following: mockFollows.has(key),
          followerCount: [...mockFollows].filter((item) => item.endsWith(`:${username}`)).length,
        },
      };
    }

    const target = await prisma.user.findFirst({
      where: { username: usernameFilter(username) },
      select: { id: true },
    });
    if (!target) {
      return reply.status(404).send({
        error: { code: 'USER_NOT_FOUND', message: 'No se encontro el usuario.' },
      });
    }
    if (target.id === followerId) {
      return reply.status(400).send({
        error: { code: 'SELF_FOLLOW', message: 'No puedes seguir tu propio perfil.' },
      });
    }

    const existing = await prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId, followingId: target.id } },
    }).catch(() => null);
    if (existing) {
      await prisma.userFollow.delete({
        where: { followerId_followingId: { followerId, followingId: target.id } },
      });
    } else {
      const followerExists = await prisma.user.count({ where: { id: followerId } }).catch(() => 0);
      if (!followerExists) {
        return reply.status(401).send({
          error: { code: 'AUTH_REQUIRED', message: 'La sesion ya no es valida.' },
        });
      }
      await prisma.userFollow.create({ data: { followerId, followingId: target.id } });
    }
    const followerCount = await prisma.userFollow.count({ where: { followingId: target.id } });
    return { data: { username, following: !existing, followerCount } };
  });

  app.get<{ Params: { username: string } }>('/v1/users/:username/wall', async (request, reply) => {
    const username = normalizeUsername(request.params.username);
    if (!(await checkDatabaseConnection())) {
      if (!fixtureProfile(username, null)) {
        return reply.status(404).send({
          error: { code: 'USER_NOT_FOUND', message: 'No se encontro el usuario.' },
        });
      }
      return {
        data: mockWallPosts
          .filter((post) => post.profileUsername === username)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      };
    }

    const profileUser = await prisma.user.findFirst({
      where: { username: usernameFilter(username) },
      select: { id: true },
    });
    if (!profileUser) {
      return reply.status(404).send({
        error: { code: 'USER_NOT_FOUND', message: 'No se encontro el usuario.' },
      });
    }
    const posts = await prisma.wallPost.findMany({
      where: { profileUserId: profileUser.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { author: { include: { profile: true } } },
    });
    return {
      data: posts.map((post) => ({
        id: post.id,
        authorId: post.authorId,
        authorName: post.author.profile?.displayName ?? post.author.username,
        authorUsername: post.author.username,
        body: post.body,
        createdAt: post.createdAt.toISOString(),
      })),
    };
  });

  app.post<{ Params: { username: string } }>('/v1/users/:username/wall', async (request, reply) => {
    const authorId = authUserId(request.headers.authorization);
    if (!authorId) {
      return reply.status(401).send({
        error: { code: 'AUTH_REQUIRED', message: 'Inicia sesion para escribir en el muro.' },
      });
    }
    const body = wallPostSchema.parse(request.body);
    const username = normalizeUsername(request.params.username);

    if (!(await checkDatabaseConnection())) {
      if (!fixtureProfile(username, authorId)) {
        return reply.status(404).send({
          error: { code: 'USER_NOT_FOUND', message: 'No se encontro el usuario.' },
        });
      }
      const authorUsername = authorId.replace(/^user-/, '') || 'lector';
      const post: MockWallPost = {
        id: `wall-${crypto.randomUUID()}`,
        profileUsername: username,
        authorId,
        authorName: authorUsername,
        authorUsername,
        body: body.body,
        createdAt: new Date().toISOString(),
      };
      mockWallPosts.unshift(post);
      return reply.status(201).send({ data: post });
    }

    const [profileUser, author] = await Promise.all([
      prisma.user.findFirst({
        where: { username: usernameFilter(username) },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { id: authorId },
        include: { profile: true },
      }).catch(() => null),
    ]);
    if (!profileUser) {
      return reply.status(404).send({
        error: { code: 'USER_NOT_FOUND', message: 'No se encontro el usuario.' },
      });
    }
    if (!author) {
      return reply.status(401).send({
        error: { code: 'AUTH_REQUIRED', message: 'La sesion ya no es valida.' },
      });
    }
    const post = await prisma.wallPost.create({
      data: { profileUserId: profileUser.id, authorId, body: body.body },
    });
    return reply.status(201).send({
      data: {
        id: post.id,
        authorId,
        authorName: author.profile?.displayName ?? author.username,
        authorUsername: author.username,
        body: post.body,
        createdAt: post.createdAt.toISOString(),
      },
    });
  });
}
