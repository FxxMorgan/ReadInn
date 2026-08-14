import '../theme/app_theme.dart';

class StorySummary {
  final String id;
  final String title;
  final String author;
  final String authorUsername;
  final String synopsis;
  final String genre;
  final String status;
  final int chapterCount;
  final bool isMature;
  final String coverColor;

  const StorySummary({
    required this.id,
    required this.title,
    required this.author,
    required this.authorUsername,
    required this.synopsis,
    required this.genre,
    required this.status,
    required this.chapterCount,
    required this.isMature,
    required this.coverColor,
  });

  factory StorySummary.fromJson(Map<String, dynamic> json) {
    return StorySummary(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Sin título',
      author: json['author'] as String? ?? 'Autor anónimo',
      authorUsername: json['authorUsername'] as String? ?? 'anonimo',
      synopsis: json['synopsis'] as String? ?? '',
      genre: json['genre'] as String? ?? 'General',
      status: json['status'] as String? ?? 'published',
      chapterCount: (json['chapterCount'] as num?)?.toInt() ?? 0,
      isMature: json['isMature'] as bool? ?? false,
      coverColor: json['coverColor'] as String? ?? '#6366F1',
    );
  }
}

class ChapterSummary {
  final String id;
  final String storyId;
  final int position;
  final String title;

  const ChapterSummary({
    required this.id,
    required this.storyId,
    required this.position,
    required this.title,
  });

  factory ChapterSummary.fromJson(Map<String, dynamic> json) {
    return ChapterSummary(
      id: json['id'] as String? ?? '',
      storyId: json['storyId'] as String? ?? '',
      position: (json['position'] as num?)?.toInt() ?? 1,
      title: json['title'] as String? ?? 'Capítulo',
    );
  }
}

class StoryDetail extends StorySummary {
  final List<ChapterSummary> chapters;

  const StoryDetail({
    required super.id,
    required super.title,
    required super.author,
    required super.authorUsername,
    required super.synopsis,
    required super.genre,
    required super.status,
    required super.chapterCount,
    required super.isMature,
    required super.coverColor,
    required this.chapters,
  });

  factory StoryDetail.fromJson(Map<String, dynamic> json) {
    final chaptersRaw = json['chapters'] as List<dynamic>? ?? [];
    final chaptersList = chaptersRaw
        .map((c) => ChapterSummary.fromJson(c as Map<String, dynamic>))
        .toList();

    return StoryDetail(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Sin título',
      author: json['author'] as String? ?? 'Autor anónimo',
      authorUsername: json['authorUsername'] as String? ?? 'anonimo',
      synopsis: json['synopsis'] as String? ?? '',
      genre: json['genre'] as String? ?? 'General',
      status: json['status'] as String? ?? 'published',
      chapterCount: (json['chapterCount'] as num?)?.toInt() ?? chaptersList.length,
      isMature: json['isMature'] as bool? ?? false,
      coverColor: json['coverColor'] as String? ?? '#6366F1',
      chapters: chaptersList,
    );
  }
}

class ChapterDetail {
  final String id;
  final String storyId;
  final String storyTitle;
  final int position;
  final String title;
  final List<String> content;

  const ChapterDetail({
    required this.id,
    required this.storyId,
    required this.storyTitle,
    required this.position,
    required this.title,
    required this.content,
  });

  factory ChapterDetail.fromJson(Map<String, dynamic> json) {
    final rawContent = json['content'];
    List<String> contentLines = [];
    if (rawContent is List) {
      contentLines = rawContent.map((e) => e.toString()).toList();
    } else if (rawContent is String) {
      contentLines = [rawContent];
    }

    return ChapterDetail(
      id: json['id'] as String? ?? '',
      storyId: json['storyId'] as String? ?? '',
      storyTitle: json['storyTitle'] as String? ?? 'Obra',
      position: (json['position'] as num?)?.toInt() ?? 1,
      title: json['title'] as String? ?? 'Capítulo',
      content: contentLines,
    );
  }
}

class ReaderSettings {
  final ReaderThemeMode themeMode;
  final double fontSize;
  final ReaderFontFamily fontFamily;

  const ReaderSettings({
    this.themeMode = ReaderThemeMode.light,
    this.fontSize = 18.0,
    this.fontFamily = ReaderFontFamily.serif,
  });

  ReaderSettings copyWith({
    ReaderThemeMode? themeMode,
    double? fontSize,
    ReaderFontFamily? fontFamily,
  }) {
    return ReaderSettings(
      themeMode: themeMode ?? this.themeMode,
      fontSize: fontSize ?? this.fontSize,
      fontFamily: fontFamily ?? this.fontFamily,
    );
  }
}
