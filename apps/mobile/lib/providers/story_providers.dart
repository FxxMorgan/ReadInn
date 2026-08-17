import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/story.dart';
import 'auth_provider.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

final apiServiceProvider = Provider<ApiService>((ref) => ApiService());

final searchQueryProvider = StateProvider<String>((ref) => '');

final selectedGenreProvider = StateProvider<String>((ref) => 'Todos');
final selectedGenresProvider = StateProvider<List<String>>((ref) => const []);
final selectedTagsProvider = StateProvider<List<String>>((ref) => const []);
final storySortProvider = StateProvider<String>((ref) => 'recent');
final matureFilterProvider = StateProvider<String>((ref) => 'exclude');
final minChaptersProvider = StateProvider<int>((ref) => 0);
final minRatingProvider = StateProvider<double>((ref) => 0);
final showAllStoriesProvider = StateProvider<bool>((ref) => false);

final storyTaxonomyProvider = FutureProvider<StoryTaxonomy>((ref) async {
  return ref.watch(apiServiceProvider).fetchStoryTaxonomy();
});

final featuredStoryProvider = FutureProvider<StorySummary?>((ref) async {
  return ref.watch(apiServiceProvider).fetchFeaturedStory();
});

final storiesProvider = FutureProvider<List<StorySummary>>((ref) async {
  final apiService = ref.watch(apiServiceProvider);
  final query = ref.watch(searchQueryProvider);
  final genres = ref.watch(selectedGenresProvider);
  final tags = ref.watch(selectedTagsProvider);
  final sort = ref.watch(storySortProvider);
  final mature = ref.watch(matureFilterProvider);
  final minChapters = ref.watch(minChaptersProvider);
  final minRating = ref.watch(minRatingProvider);

  return apiService.fetchStories(
    query: query,
    genres: genres,
    tags: tags,
    sort: sort,
    mature: mature,
    minChapters: minChapters,
    minRating: minRating,
  );
});

final storyDetailProvider = FutureProvider.family<StoryDetail, String>((
  ref,
  storyId,
) async {
  final apiService = ref.watch(apiServiceProvider);
  return apiService.fetchStoryDetail(storyId);
});

typedef ChapterParams = ({String storyId, String chapterId});

final chapterDetailProvider =
    FutureProvider.family<ChapterDetail, ChapterParams>((ref, params) async {
      final apiService = ref.watch(apiServiceProvider);
      return apiService.fetchChapterDetail(params.storyId, params.chapterId);
    });

final chapterCommentsProvider =
    FutureProvider.family<List<ChapterComment>, ChapterParams>((ref, params) {
      final token = ref.watch(authProvider.select((auth) => auth.token));
      return ref
          .watch(apiServiceProvider)
          .fetchComments(params.storyId, params.chapterId, token: token);
    });

final libraryProvider = FutureProvider<List<StorySummary>>((ref) {
  final token = ref.watch(authProvider.select((auth) => auth.token));
  return ref.watch(apiServiceProvider).fetchLibrary(token: token);
});

final writerStoriesProvider = FutureProvider<List<StorySummary>>((ref) {
  final token = ref.watch(authProvider.select((auth) => auth.token));
  return ref.watch(apiServiceProvider).fetchWriterStories(token: token);
});

final writerStoryDetailProvider = FutureProvider.family<StoryDetail, String>((
  ref,
  storyId,
) {
  final token = ref.watch(authProvider.select((auth) => auth.token));
  if (token == null) {
    throw StateError('Debes iniciar sesion para administrar una obra.');
  }
  return ref
      .watch(apiServiceProvider)
      .fetchWriterStoryDetail(storyId, token: token);
});

final dashboardMetricsProvider = FutureProvider<DashboardMetrics>((ref) {
  final token = ref.watch(authProvider.select((auth) => auth.token));
  return ref.watch(apiServiceProvider).fetchDashboardMetrics(token: token);
});

final storyEngagementProvider = FutureProvider.family<StoryEngagement, String>((
  ref,
  storyId,
) {
  final token = ref.watch(authProvider.select((auth) => auth.token));
  return ref
      .watch(apiServiceProvider)
      .fetchStoryEngagement(storyId, token: token);
});

final publicProfileProvider = FutureProvider.family<PublicProfile, String>((
  ref,
  username,
) {
  final token = ref.watch(authProvider.select((auth) => auth.token));
  return ref
      .watch(apiServiceProvider)
      .fetchPublicProfile(username, token: token);
});

final profileWallProvider = FutureProvider.family<List<WallPost>, String>((
  ref,
  username,
) {
  return ref.watch(apiServiceProvider).fetchProfileWall(username);
});

final readingProgressProvider = FutureProvider.family<ReadingProgress?, String>(
  (ref, storyId) {
    final token = ref.watch(authProvider.select((auth) => auth.token));
    return ref
        .watch(apiServiceProvider)
        .fetchReadingProgress(storyId, token: token);
  },
);

final readingProgressListProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) {
  final token = ref.watch(authProvider.select((auth) => auth.token));
  return ref.watch(apiServiceProvider).fetchReadingProgressList(token: token);
});

class ReaderSettingsNotifier extends StateNotifier<ReaderSettings> {
  static const String _prefThemeKey = 'reader_theme_mode';
  static const String _prefFontSizeKey = 'reader_font_size';
  static const String _prefFontFamilyKey = 'reader_font_family';

  ReaderSettingsNotifier() : super(const ReaderSettings()) {
    _loadFromPrefs();
  }

  Future<void> _loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();

    final themeStr = prefs.getString(_prefThemeKey);
    final themeMode = ReaderThemeMode.values.firstWhere(
      (e) => e.name == themeStr,
      orElse: () => ReaderThemeMode.light,
    );

    final fontSize = prefs.getDouble(_prefFontSizeKey) ?? 18.0;

    final fontStr = prefs.getString(_prefFontFamilyKey);
    final fontFamily = ReaderFontFamily.values.firstWhere(
      (e) => e.name == fontStr,
      orElse: () => ReaderFontFamily.serif,
    );

    state = ReaderSettings(
      themeMode: themeMode,
      fontSize: fontSize,
      fontFamily: fontFamily,
    );
  }

  Future<void> setThemeMode(ReaderThemeMode mode) async {
    state = state.copyWith(themeMode: mode);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefThemeKey, mode.name);
  }

  Future<void> setFontSize(double size) async {
    final clamped = size.clamp(14.0, 28.0);
    state = state.copyWith(fontSize: clamped);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_prefFontSizeKey, clamped);
  }

  Future<void> setFontFamily(ReaderFontFamily font) async {
    state = state.copyWith(fontFamily: font);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefFontFamilyKey, font.name);
  }
}

final readerSettingsProvider =
    StateNotifierProvider<ReaderSettingsNotifier, ReaderSettings>((ref) {
      return ReaderSettingsNotifier();
    });
