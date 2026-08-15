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
  final double averageRating;
  final int ratingCount;

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
    this.averageRating = 0,
    this.ratingCount = 0,
  });

  factory StorySummary.fromJson(Map<String, dynamic> json) => StorySummary(
    id: json['id'] as String? ?? '',
    title: json['title'] as String? ?? 'Sin título',
    author: json['author'] as String? ?? 'Autor anónimo',
    authorUsername: json['authorUsername'] as String? ?? 'anonimo',
    synopsis: json['synopsis'] as String? ?? '',
    genre: json['genre'] as String? ?? 'General',
    status: json['status'] as String? ?? 'published',
    chapterCount: (json['chapterCount'] as num?)?.toInt() ?? 0,
    isMature: json['isMature'] as bool? ?? false,
    coverColor: json['coverColor'] as String? ?? '#4F46E5',
    averageRating: (json['averageRating'] as num?)?.toDouble() ?? 0,
    ratingCount: (json['ratingCount'] as num?)?.toInt() ?? 0,
  );
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

  factory ChapterSummary.fromJson(Map<String, dynamic> json) => ChapterSummary(
    id: json['id'] as String? ?? '',
    storyId: json['storyId'] as String? ?? '',
    position: (json['position'] as num?)?.toInt() ?? 1,
    title: json['title'] as String? ?? 'Capítulo',
  );
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
    super.averageRating,
    super.ratingCount,
    required this.chapters,
  });

  factory StoryDetail.fromJson(Map<String, dynamic> json) {
    final chapters = (json['chapters'] as List<dynamic>? ?? [])
        .map(
          (chapter) => ChapterSummary.fromJson(chapter as Map<String, dynamic>),
        )
        .toList();
    return StoryDetail(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Sin título',
      author: json['author'] as String? ?? 'Autor anónimo',
      authorUsername: json['authorUsername'] as String? ?? 'anonimo',
      synopsis: json['synopsis'] as String? ?? '',
      genre: json['genre'] as String? ?? 'General',
      status: json['status'] as String? ?? 'published',
      chapterCount: (json['chapterCount'] as num?)?.toInt() ?? chapters.length,
      isMature: json['isMature'] as bool? ?? false,
      coverColor: json['coverColor'] as String? ?? '#4F46E5',
      averageRating: (json['averageRating'] as num?)?.toDouble() ?? 0,
      ratingCount: (json['ratingCount'] as num?)?.toInt() ?? 0,
      chapters: chapters,
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
    final content = rawContent is List
        ? rawContent.map((item) => item.toString()).toList()
        : rawContent is String
        ? [rawContent]
        : <String>[];
    return ChapterDetail(
      id: json['id'] as String? ?? '',
      storyId: json['storyId'] as String? ?? '',
      storyTitle: json['storyTitle'] as String? ?? 'Obra',
      position: (json['position'] as num?)?.toInt() ?? 1,
      title: json['title'] as String? ?? 'Capítulo',
      content: content,
    );
  }
}

class ChapterComment {
  final String id;
  final String storyId;
  final String chapterId;
  final String authorName;
  final String body;
  final DateTime createdAt;
  final int likes;
  final int? paragraphIndex;

  const ChapterComment({
    required this.id,
    required this.storyId,
    required this.chapterId,
    required this.authorName,
    required this.body,
    required this.createdAt,
    required this.likes,
    this.paragraphIndex,
  });

  factory ChapterComment.fromJson(Map<String, dynamic> json) => ChapterComment(
    id: json['id'] as String? ?? '',
    storyId: json['storyId'] as String? ?? '',
    chapterId: json['chapterId'] as String? ?? '',
    authorName: json['authorName'] as String? ?? 'Invitado',
    body: json['body'] as String? ?? '',
    createdAt:
        DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
    likes: (json['likes'] as num?)?.toInt() ?? 0,
    paragraphIndex: (json['paragraphIndex'] as num?)?.toInt(),
  );
}

class StoryEngagement {
  final int reads;
  final int followers;
  final int comments;
  final double averageRating;
  final int ratingCount;
  final double userRating;
  final bool liked;
  final bool saved;

  const StoryEngagement({
    this.reads = 0,
    this.followers = 0,
    this.comments = 0,
    this.averageRating = 0,
    this.ratingCount = 0,
    this.userRating = 0,
    this.liked = false,
    this.saved = false,
  });

  factory StoryEngagement.fromJson(Map<String, dynamic> json) =>
      StoryEngagement(
        reads: (json['reads'] as num?)?.toInt() ?? 0,
        followers: (json['followers'] as num?)?.toInt() ?? 0,
        comments: (json['comments'] as num?)?.toInt() ?? 0,
        averageRating: (json['averageRating'] as num?)?.toDouble() ?? 0,
        ratingCount: (json['ratingCount'] as num?)?.toInt() ?? 0,
        userRating: (json['userRating'] as num?)?.toDouble() ?? 0,
        liked: json['liked'] as bool? ?? false,
        saved: json['saved'] as bool? ?? false,
      );
}

class ReadingProgress {
  final String storyId;
  final String chapterId;
  final double progressPercentage;
  final bool isCompleted;
  final List<String> seenChapterIds;

  const ReadingProgress({
    required this.storyId,
    required this.chapterId,
    required this.progressPercentage,
    required this.isCompleted,
    required this.seenChapterIds,
  });

  factory ReadingProgress.fromJson(Map<String, dynamic> json) =>
      ReadingProgress(
        storyId: json['storyId'] as String? ?? '',
        chapterId: json['chapterId'] as String? ?? '',
        progressPercentage:
            (json['progressPercentage'] as num?)?.toDouble() ?? 0,
        isCompleted: json['isCompleted'] as bool? ?? false,
        seenChapterIds: (json['seenChapterIds'] as List<dynamic>? ?? [])
            .map((item) => item.toString())
            .toList(),
      );

  Map<String, dynamic> toJson() => {
    'storyId': storyId,
    'chapterId': chapterId,
    'progressPercentage': progressPercentage,
    'isCompleted': isCompleted,
    'seenChapterIds': seenChapterIds,
  };
}

class DashboardMetrics {
  final int totalViews;
  final int uniqueReaders;
  final double avgReadMinutes;
  final int followers;
  final List<Map<String, dynamic>> stories;

  const DashboardMetrics({
    required this.totalViews,
    required this.uniqueReaders,
    required this.avgReadMinutes,
    required this.followers,
    required this.stories,
  });

  factory DashboardMetrics.fromJson(Map<String, dynamic> json) {
    final summary = json['summary'] as Map<String, dynamic>? ?? {};
    return DashboardMetrics(
      totalViews: (summary['totalViews'] as num?)?.toInt() ?? 0,
      uniqueReaders: (summary['uniqueReaders'] as num?)?.toInt() ?? 0,
      avgReadMinutes: (summary['avgReadMinutes'] as num?)?.toDouble() ?? 0,
      followers: (summary['followers'] as num?)?.toInt() ?? 0,
      stories: (json['storyMetrics'] as List<dynamic>? ?? [])
          .cast<Map<String, dynamic>>(),
    );
  }
}

class ReaderSettings {
  final ReaderThemeMode themeMode;
  final double fontSize;
  final ReaderFontFamily fontFamily;

  const ReaderSettings({
    this.themeMode = ReaderThemeMode.light,
    this.fontSize = 18,
    this.fontFamily = ReaderFontFamily.serif,
  });

  ReaderSettings copyWith({
    ReaderThemeMode? themeMode,
    double? fontSize,
    ReaderFontFamily? fontFamily,
  }) => ReaderSettings(
    themeMode: themeMode ?? this.themeMode,
    fontSize: fontSize ?? this.fontSize,
    fontFamily: fontFamily ?? this.fontFamily,
  );
}
