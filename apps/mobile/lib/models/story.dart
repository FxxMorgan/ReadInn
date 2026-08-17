import '../theme/app_theme.dart';

class StorySummary {
  final String id;
  final String title;
  final String author;
  final String authorUsername;
  final String synopsis;
  final String genre;
  final List<String> genres;
  final List<StoryTag> tags;
  final String languageCode;
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
    this.genres = const [],
    this.tags = const [],
    this.languageCode = 'es',
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
    genres: (json['genres'] as List<dynamic>? ?? const [])
        .map((item) => item.toString())
        .toList(),
    tags: (json['tags'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(StoryTag.fromJson)
        .toList(),
    languageCode: json['languageCode'] as String? ?? 'es',
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
    super.genres,
    super.tags,
    super.languageCode,
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
      genres: (json['genres'] as List<dynamic>? ?? const [])
          .map((item) => item.toString())
          .toList(),
      tags: (json['tags'] as List<dynamic>? ?? const [])
          .whereType<Map<String, dynamic>>()
          .map(StoryTag.fromJson)
          .toList(),
      languageCode: json['languageCode'] as String? ?? 'es',
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

class StoryTag {
  final String name;
  final String kind;

  const StoryTag({required this.name, required this.kind});

  factory StoryTag.fromJson(Map<String, dynamic> json) => StoryTag(
    name: json['name'] as String? ?? '',
    kind: json['kind'] as String? ?? 'theme',
  );
}

class StoryTagGroup {
  final String kind;
  final String label;
  final List<String> tags;

  const StoryTagGroup({
    required this.kind,
    required this.label,
    required this.tags,
  });

  factory StoryTagGroup.fromJson(Map<String, dynamic> json) => StoryTagGroup(
    kind: json['kind'] as String? ?? 'theme',
    label: json['label'] as String? ?? 'Etiquetas',
    tags: (json['tags'] as List<dynamic>? ?? const [])
        .map((item) => item.toString())
        .toList(),
  );
}

class StoryTaxonomy {
  final List<String> genres;
  final List<StoryTagGroup> tagGroups;
  final List<Map<String, String>> sortOptions;

  const StoryTaxonomy({
    required this.genres,
    required this.tagGroups,
    required this.sortOptions,
  });

  factory StoryTaxonomy.fromJson(Map<String, dynamic> json) => StoryTaxonomy(
    genres: (json['genres'] as List<dynamic>? ?? const [])
        .map((item) => item.toString())
        .toList(),
    tagGroups: (json['tagGroups'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(StoryTagGroup.fromJson)
        .toList(),
    sortOptions: (json['sortOptions'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(
          (item) => item.map((key, value) => MapEntry(key, value.toString())),
        )
        .toList(),
  );
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
  final String? authorUsername;
  final String? authorAvatarUrl;
  final String body;
  final DateTime createdAt;
  final int likes;
  final int upvotes;
  final int downvotes;
  final int score;
  final int currentVote;
  final bool isHidden;
  final int? paragraphIndex;
  final String? parentCommentId;

  const ChapterComment({
    required this.id,
    required this.storyId,
    required this.chapterId,
    required this.authorName,
    this.authorUsername,
    this.authorAvatarUrl,
    required this.body,
    required this.createdAt,
    required this.likes,
    int? upvotes,
    this.downvotes = 0,
    int? score,
    this.currentVote = 0,
    this.isHidden = false,
    this.paragraphIndex,
    this.parentCommentId,
  }) : upvotes = upvotes ?? likes,
       score = score ?? (upvotes ?? likes) - downvotes;

  factory ChapterComment.fromJson(Map<String, dynamic> json) => ChapterComment(
    id: json['id'] as String? ?? '',
    storyId: json['storyId'] as String? ?? '',
    chapterId: json['chapterId'] as String? ?? '',
    authorName: json['authorName'] as String? ?? 'Invitado',
    authorUsername: json['authorUsername'] as String?,
    authorAvatarUrl: json['authorAvatarUrl'] as String?,
    body: json['body'] as String? ?? '',
    createdAt:
        DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
    likes: (json['likes'] as num?)?.toInt() ?? 0,
    upvotes: (json['upvotes'] as num?)?.toInt(),
    downvotes: (json['downvotes'] as num?)?.toInt() ?? 0,
    score: (json['score'] as num?)?.toInt(),
    currentVote: (json['currentVote'] as num?)?.toInt() ?? 0,
    isHidden: json['isHidden'] as bool? ?? false,
    paragraphIndex: (json['paragraphIndex'] as num?)?.toInt(),
    parentCommentId: json['parentCommentId'] as String?,
  );
}

class WallPost {
  final String id;
  final String authorId;
  final String authorName;
  final String authorUsername;
  final String body;
  final DateTime createdAt;

  const WallPost({
    required this.id,
    required this.authorId,
    required this.authorName,
    required this.authorUsername,
    required this.body,
    required this.createdAt,
  });

  factory WallPost.fromJson(Map<String, dynamic> json) => WallPost(
    id: json['id'] as String? ?? '',
    authorId: json['authorId'] as String? ?? '',
    authorName: json['authorName'] as String? ?? 'Usuario',
    authorUsername: json['authorUsername'] as String? ?? '',
    body: json['body'] as String? ?? '',
    createdAt:
        DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
  );
}

class PublicProfile {
  final String id;
  final String username;
  final String displayName;
  final String bio;
  final String? avatarUrl;
  final int followerCount;
  final int followingCount;
  final bool isFollowing;
  final List<StorySummary> stories;

  const PublicProfile({
    required this.id,
    required this.username,
    required this.displayName,
    required this.bio,
    this.avatarUrl,
    required this.followerCount,
    required this.followingCount,
    required this.isFollowing,
    required this.stories,
  });

  factory PublicProfile.fromJson(Map<String, dynamic> json) => PublicProfile(
    id: json['id'] as String? ?? '',
    username: json['username'] as String? ?? '',
    displayName: json['displayName'] as String? ?? 'Usuario',
    bio: json['bio'] as String? ?? '',
    avatarUrl: json['avatarUrl'] as String?,
    followerCount: (json['followerCount'] as num?)?.toInt() ?? 0,
    followingCount: (json['followingCount'] as num?)?.toInt() ?? 0,
    isFollowing: json['isFollowing'] as bool? ?? false,
    stories: (json['stories'] as List<dynamic>? ?? [])
        .map((item) => StorySummary.fromJson(item as Map<String, dynamic>))
        .toList(),
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
