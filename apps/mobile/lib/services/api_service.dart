import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../models/story.dart';

class ApiService {
  final Dio _dio;
  static const _productionBaseUrl = 'https://api.cypher.cl';
  static const _configuredBaseUrl = String.fromEnvironment(
    'READINN_API_URL',
    defaultValue: _productionBaseUrl,
  );

  ApiService({String? baseUrl})
    : _dio = Dio(
        BaseOptions(
          baseUrl: baseUrl ?? _configuredBaseUrl,
          connectTimeout: const Duration(seconds: 4),
          receiveTimeout: const Duration(seconds: 4),
        ),
      );

  Options _authOptions(String? token) => Options(
    headers: token == null ? null : {'Authorization': 'Bearer $token'},
  );

  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _dio.post(
      '/v1/auth/login',
      data: {'email': email, 'password': password},
    );
    return response.data['data'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> register({
    required String email,
    required String username,
    required String password,
    String? displayName,
  }) async {
    final response = await _dio.post(
      '/v1/auth/register',
      data: {
        'email': email,
        'username': username,
        'password': password,
        if (displayName?.isNotEmpty == true) 'displayName': displayName,
      },
    );
    return response.data['data'] as Map<String, dynamic>;
  }

  Future<List<ChapterComment>> fetchComments(
    String storyId,
    String chapterId,
  ) async {
    try {
      final response = await _dio.get(
        '/v1/stories/$storyId/chapters/$chapterId/comments',
      );
      final data = response.data['data'] as List<dynamic>? ?? [];
      return data
          .map((item) => ChapterComment.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (error) {
      debugPrint('API unavailable, using comments fallback: $error');
      return _comments
          .where(
            (comment) =>
                comment.storyId == storyId && comment.chapterId == chapterId,
          )
          .toList();
    }
  }

  Future<ChapterComment> addComment({
    required String storyId,
    required String chapterId,
    required String body,
    required String authorName,
    String? token,
  }) async {
    try {
      final response = await _dio.post(
        '/v1/stories/$storyId/chapters/$chapterId/comments',
        data: {'body': body, 'authorName': authorName},
        options: _authOptions(token),
      );
      return ChapterComment.fromJson(
        response.data['data'] as Map<String, dynamic>,
      );
    } catch (error) {
      debugPrint('API unavailable, storing comment locally: $error');
      final comment = ChapterComment(
        id: 'local-comment-${DateTime.now().microsecondsSinceEpoch}',
        storyId: storyId,
        chapterId: chapterId,
        authorName: authorName,
        body: body,
        createdAt: DateTime.now(),
        likes: 0,
      );
      _comments.insert(0, comment);
      return comment;
    }
  }

  Future<bool> toggleStoryLike(String storyId, {String? token}) async {
    try {
      final response = await _dio.post(
        '/v1/stories/$storyId/like',
        options: _authOptions(token),
      );
      return response.data['data']['liked'] as bool? ?? false;
    } catch (error) {
      debugPrint('API unavailable, toggling like locally: $error');
      if (!_likedStoryIds.add(storyId)) _likedStoryIds.remove(storyId);
      return _likedStoryIds.contains(storyId);
    }
  }

  Future<bool> toggleLibrary(String storyId, {String? token}) async {
    try {
      final response = await _dio.post(
        '/v1/library/$storyId',
        options: _authOptions(token),
      );
      return response.data['data']['saved'] as bool? ?? false;
    } catch (error) {
      debugPrint('API unavailable, toggling library locally: $error');
      if (!_savedStoryIds.add(storyId)) _savedStoryIds.remove(storyId);
      return _savedStoryIds.contains(storyId);
    }
  }

  Future<List<StorySummary>> fetchLibrary({String? token}) async {
    try {
      final response = await _dio.get(
        '/v1/library',
        options: _authOptions(token),
      );
      final data = response.data['data'] as List<dynamic>? ?? [];
      return data
          .map((item) => StorySummary.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (error) {
      debugPrint('API unavailable, using library fallback: $error');
      return _stories
          .where((story) => _savedStoryIds.contains(story.id))
          .toList();
    }
  }

  Future<void> saveReadingProgress({
    required String storyId,
    required String chapterId,
    required double progressPercentage,
    String? token,
  }) async {
    await _dio.post(
      '/v1/reading-progress',
      data: {
        'storyId': storyId,
        'chapterId': chapterId,
        'progressPercentage': progressPercentage,
      },
      options: _authOptions(token),
    );
  }

  Future<StorySummary> createStory({
    required String title,
    required String synopsis,
    required String genre,
    required bool isMature,
    required String coverColor,
    String? token,
  }) async {
    try {
      final response = await _dio.post(
        '/v1/stories',
        data: {
          'title': title,
          'synopsis': synopsis,
          'genre': genre,
          'isMature': isMature,
          'coverColor': coverColor,
        },
        options: _authOptions(token),
      );
      return StorySummary.fromJson(
        response.data['data'] as Map<String, dynamic>,
      );
    } catch (error) {
      debugPrint('API unavailable, creating story locally: $error');
      return StorySummary(
        id: 'local-story-${DateTime.now().millisecondsSinceEpoch}',
        title: title,
        author: 'Invitado',
        authorUsername: 'invitado',
        synopsis: synopsis,
        genre: genre,
        status: 'draft',
        chapterCount: 0,
        isMature: isMature,
        coverColor: coverColor,
      );
    }
  }

  static const _stories = [
    StorySummary(
      id: 'story-lighthouse',
      title: 'La luz del faro',
      author: 'Marina Solís',
      authorUsername: 'marina-solis',
      synopsis:
          'Una cartógrafa vuelve a la costa donde creció y encuentra un mapa que no debería existir en las notas de su padre.',
      genre: 'Misterio',
      status: 'published',
      chapterCount: 3,
      isMature: false,
      coverColor: '#1F5F73',
    ),
    StorySummary(
      id: 'story-quiet-city',
      title: 'La ciudad en silencio',
      author: 'Tomás Vidal',
      authorUsername: 'tomas-vidal',
      synopsis:
          'Cuando todos dejan de hablar durante una noche, una bibliotecaria busca la causa en los sótanos de la ciudad.',
      genre: 'Ciencia ficción',
      status: 'published',
      chapterCount: 2,
      isMature: false,
      coverColor: '#7F4F24',
    ),
  ];

  static const _chapters = {
    'story-lighthouse': [
      ChapterSummary(
        id: 'chapter-lighthouse-1',
        storyId: 'story-lighthouse',
        position: 1,
        title: 'El mapa bajo la sal',
      ),
      ChapterSummary(
        id: 'chapter-lighthouse-2',
        storyId: 'story-lighthouse',
        position: 2,
        title: 'La escalera de hierro',
      ),
      ChapterSummary(
        id: 'chapter-lighthouse-3',
        storyId: 'story-lighthouse',
        position: 3,
        title: 'La habitación sin ventanas',
      ),
    ],
    'story-quiet-city': [
      ChapterSummary(
        id: 'chapter-quiet-city-1',
        storyId: 'story-quiet-city',
        position: 1,
        title: 'A las 23:17',
      ),
      ChapterSummary(
        id: 'chapter-quiet-city-2',
        storyId: 'story-quiet-city',
        position: 2,
        title: 'El sótano de la biblioteca',
      ),
    ],
  };

  static const _content = {
    'chapter-lighthouse-1': ChapterDetail(
      id: 'chapter-lighthouse-1',
      storyId: 'story-lighthouse',
      storyTitle: 'La luz del faro',
      position: 1,
      title: 'El mapa bajo la sal',
      content: [
        'El faro llevaba tres inviernos apagado cuando Marina volvió a verlo.',
        'Desde la carretera, la torre parecía un lápiz blanco clavado en el borde del mundo. El viento arrastraba sal y pequeñas hojas de algas hasta las ventanas del auto.',
        'En la casa de su abuela encontró un mapa doblado dentro de una caja de fósforos. No tenía nombres, solo una línea azul que desaparecía bajo el mar.',
        'Marina reconoció la tinta antes de recordar la letra. Era la misma que su padre usaba en sus cuadernos de navegación.',
      ],
    ),
    'chapter-lighthouse-2': ChapterDetail(
      id: 'chapter-lighthouse-2',
      storyId: 'story-lighthouse',
      storyTitle: 'La luz del faro',
      position: 2,
      title: 'La escalera de hierro',
      content: [
        'La puerta del faro cedió con un ruido breve, casi una disculpa.',
        'Dentro, la escalera de hierro conservaba el frío de la noche. Marina subió contando los peldaños para no pensar en el dibujo que llevaba en el bolsillo.',
        'En el segundo descanso encontró una marca reciente: tres círculos sobre la pintura descascarada.',
      ],
    ),
    'chapter-lighthouse-3': ChapterDetail(
      id: 'chapter-lighthouse-3',
      storyId: 'story-lighthouse',
      storyTitle: 'La luz del faro',
      position: 3,
      title: 'La habitación sin ventanas',
      content: [
        'Arriba no había lámpara, pero sí una habitación que no figuraba en ningún plano.',
        'La línea azul del mapa terminaba exactamente en el centro del suelo.',
      ],
    ),
  };

  static final List<ChapterComment> _comments = [
    ChapterComment(
      id: 'comment-lighthouse-1',
      storyId: 'story-lighthouse',
      chapterId: 'chapter-lighthouse-1',
      authorName: 'Lucia M.',
      body: 'La imagen del faro apagado se queda contigo. Muy buen inicio.',
      createdAt: DateTime.now(),
      likes: 4,
    ),
    ChapterComment(
      id: 'comment-lighthouse-2',
      storyId: 'story-lighthouse',
      chapterId: 'chapter-lighthouse-1',
      authorName: 'Nico Rojas',
      body: 'El mapa dentro de la caja de fosforos es un detalle precioso.',
      createdAt: DateTime.now(),
      likes: 2,
    ),
  ];
  static final Set<String> _likedStoryIds = <String>{};
  static final Set<String> _savedStoryIds = <String>{'story-lighthouse'};

  Future<List<StorySummary>> fetchStories({
    String? query,
    String? genre,
  }) async {
    try {
      final response = await _dio.get(
        '/v1/stories',
        queryParameters: {
          if (query?.isNotEmpty == true) 'query': query,
          if (genre?.isNotEmpty == true && genre != 'Todos') 'genre': genre,
        },
      );
      final data = response.data['data'] as List<dynamic>? ?? [];
      return data
          .map((item) => StorySummary.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (error) {
      debugPrint('API unavailable, using fixture fallback: $error');
      return _stories.where((story) {
        final genreMatches =
            genre == null ||
            genre == 'Todos' ||
            story.genre.toLowerCase() == genre.toLowerCase();
        final queryMatches =
            query == null ||
            query.isEmpty ||
            '${story.title} ${story.author} ${story.synopsis}'
                .toLowerCase()
                .contains(query.toLowerCase());
        return genreMatches && queryMatches;
      }).toList();
    }
  }

  Future<StoryDetail> fetchStoryDetail(String storyId) async {
    try {
      final response = await _dio.get('/v1/stories/$storyId');
      return StoryDetail.fromJson(
        response.data['data'] as Map<String, dynamic>,
      );
    } catch (error) {
      debugPrint('API unavailable, using story fallback: $error');
      final story = _stories.firstWhere(
        (item) => item.id == storyId,
        orElse: () => _stories.first,
      );
      final chapters = _chapters[story.id] ?? const <ChapterSummary>[];
      return StoryDetail(
        id: story.id,
        title: story.title,
        author: story.author,
        authorUsername: story.authorUsername,
        synopsis: story.synopsis,
        genre: story.genre,
        status: story.status,
        chapterCount: story.chapterCount,
        isMature: story.isMature,
        coverColor: story.coverColor,
        chapters: chapters,
      );
    }
  }

  Future<ChapterDetail> fetchChapterDetail(
    String storyId,
    String chapterId,
  ) async {
    try {
      final response = await _dio.get(
        '/v1/stories/$storyId/chapters/$chapterId',
      );
      return ChapterDetail.fromJson(
        response.data['data'] as Map<String, dynamic>,
      );
    } catch (error) {
      debugPrint('API unavailable, using chapter fallback: $error');
      return _content[chapterId] ??
          ChapterDetail(
            id: chapterId,
            storyId: storyId,
            storyTitle: 'La luz del faro',
            position: 1,
            title: 'Capítulo 1',
            content: const [
              'Contenido del capítulo no disponible en este momento.',
            ],
          );
    }
  }
}
