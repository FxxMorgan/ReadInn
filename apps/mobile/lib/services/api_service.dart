import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../models/story.dart';

class ApiService {
  final Dio _dio;
  static const String _defaultWebBaseUrl = 'http://localhost:3000';
  static const String _defaultAndroidBaseUrl = 'http://10.0.2.2:3000';

  ApiService({String? baseUrl})
      : _dio = Dio(
          BaseOptions(
            baseUrl: baseUrl ??
                (kIsWeb
                    ? _defaultWebBaseUrl
                    : (defaultTargetPlatform == TargetPlatform.android
                        ? _defaultAndroidBaseUrl
                        : _defaultWebBaseUrl)),
            connectTimeout: const Duration(seconds: 4),
            receiveTimeout: const Duration(seconds: 4),
          ),
        );

  // Fixtures fallback for offline resilience
  static const List<StorySummary> _fallbackStories = [
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
      coverColor: '#1f5f73',
    ),
    StorySummary(
      id: 'story-quiet-city',
      title: 'La ciudad en silencio',
      author: 'Tomás Vidal',
      authorUsername: 'tomas-vidal',
      synopsis:
          'Cuando todos dejan de hablar durante una noche, una bibliotecaria decide salir a buscar la causa en los sótanos de la ciudad.',
      genre: 'Ciencia ficción',
      status: 'published',
      chapterCount: 2,
      isMature: false,
      coverColor: '#7f4f24',
    ),
  ];

  static const Map<String, List<ChapterSummary>> _fallbackChapters = {
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

  static const Map<String, Map<String, dynamic>> _fallbackChapterContent = {
    'chapter-lighthouse-1': {
      'id': 'chapter-lighthouse-1',
      'storyId': 'story-lighthouse',
      'storyTitle': 'La luz del faro',
      'position': 1,
      'title': 'El mapa bajo la sal',
      'content': [
        'El faro llevaba tres inviernos apagado cuando Marina volvió a verlo.',
        'Desde la carretera, la torre parecía un lápiz blanco clavado en el borde del mundo. El viento arrastraba sal y pequeñas hojas de algas hasta las ventanas del auto.',
        'En la casa de su abuela encontró un mapa doblado dentro de una caja de fósforos. No tenía nombres, solo una línea azul que desaparecía bajo el mar.',
        'Marina reconoció la tinta antes de recordar la letra. Era la misma que su padre usaba en sus cuadernos de navegación.'
      ]
    },
    'chapter-lighthouse-2': {
      'id': 'chapter-lighthouse-2',
      'storyId': 'story-lighthouse',
      'storyTitle': 'La luz del faro',
      'position': 2,
      'title': 'La escalera de hierro',
      'content': [
        'La puerta del faro cedió con un ruido breve, casi una disculpa.',
        'Dentro, la escalera de hierro conservaba el frío de la noche. Marina subió contando los peldaños para no pensar en el dibujo que llevaba en el bolsillo.',
        'En el segundo descanso encontró una marca reciente: tres círculos sobre la pintura descascarada.'
      ]
    },
    'chapter-lighthouse-3': {
      'id': 'chapter-lighthouse-3',
      'storyId': 'story-lighthouse',
      'storyTitle': 'La luz del faro',
      'position': 3,
      'title': 'La habitación sin ventanas',
      'content': [
        'Arriba no había lámpara, pero sí una habitación que no figuraba en ningún plano.',
        'La línea azul del mapa terminaba exactamente en el centro del suelo.'
      ]
    },
    'chapter-quiet-city-1': {
      'id': 'chapter-quiet-city-1',
      'storyId': 'story-quiet-city',
      'storyTitle': 'La ciudad en silencio',
      'position': 1,
      'title': 'A las 23:17',
      'content': [
        'A las 23:17, la ciudad dejó de hablar.',
        'No fue un apagón ni una alarma. Las bocas se movieron, las manos señalaron, los trenes continuaron avanzando. Solo desapareció la voz.',
        'Elena cerró el libro que estaba catalogando y escuchó por primera vez el peso completo del edificio.'
      ]
    },
    'chapter-quiet-city-2': {
      'id': 'chapter-quiet-city-2',
      'storyId': 'story-quiet-city',
      'storyTitle': 'La ciudad en silencio',
      'position': 2,
      'title': 'El sótano de la biblioteca',
      'content': [
        'En el sótano, los tubos fluorescentes parpadeaban como si intentaran formar palabras.',
        'Elena encontró una caja de cintas magnéticas etiquetada con fechas que aún no habían ocurrido.'
      ]
    },
  };

  Future<List<StorySummary>> fetchStories({String? query, String? genre}) async {
    try {
      final response = await _dio.get(
        '/v1/stories',
        queryParameters: {
          if (query != null && query.isNotEmpty) 'query': query,
          if (genre != null && genre.isNotEmpty && genre != 'Todos') 'genre': genre,
        },
      );

      final dataList = response.data['data'] as List<dynamic>? ?? [];
      return dataList
          .map((item) => StorySummary.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('API unavailable, using fixture fallback: $e');
      // Filter fixtures locally
      return _fallbackStories.where((story) {
        final matchesGenre = genre == null ||
            genre == 'Todos' ||
            story.genre.toLowerCase() == genre.toLowerCase();
        final matchesQuery = query == null ||
            query.isEmpty ||
            story.title.toLowerCase().contains(query.toLowerCase()) ||
            story.synopsis.toLowerCase().contains(query.toLowerCase()) ||
            story.author.toLowerCase().contains(query.toLowerCase());
        return matchesGenre && matchesQuery;
      }).toList();
    }
  }

  Future<StoryDetail> fetchStoryDetail(String storyId) async {
    try {
      final response = await _dio.get('/v1/stories/$storyId');
      final data = response.data['data'] as Map<String, dynamic>;
      return StoryDetail.fromJson(data);
    } catch (e) {
      debugPrint('API unavailable, using fallback story detail: $e');
      final story = _fallbackStories.firstWhere(
        (s) => s.id == storyId,
        orElse: () => _fallbackStories.first,
      );
      final chapters = _fallbackChapters[story.id] ?? [];
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

  Future<ChapterDetail> fetchChapterDetail(String storyId, String chapterId) async {
    try {
      final response = await _dio.get('/v1/stories/$storyId/chapters/$chapterId');
      final data = response.data['data'] as Map<String, dynamic>;
      return ChapterDetail.fromJson(data);
    } catch (e) {
      debugPrint('API unavailable, using fallback chapter detail: $e');
      final fallbackData = _fallbackChapterContent[chapterId];
      if (fallbackData != null) {
        return ChapterDetail.fromJson(fallbackData);
      }
      return ChapterDetail(
        id: chapterId,
        storyId: storyId,
        storyTitle: 'La luz del faro',
        position: 1,
        title: 'Capítulo 1',
        content: ['Contenido del capítulo no disponible en este momento.'],
      );
    }
  }
}
