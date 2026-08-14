import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/story.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

final apiServiceProvider = Provider<ApiService>((ref) => ApiService());

final searchQueryProvider = StateProvider<String>((ref) => '');

final selectedGenreProvider = StateProvider<String>((ref) => 'Todos');

final storiesProvider = FutureProvider<List<StorySummary>>((ref) async {
  final apiService = ref.watch(apiServiceProvider);
  final query = ref.watch(searchQueryProvider);
  final genre = ref.watch(selectedGenreProvider);

  return apiService.fetchStories(query: query, genre: genre);
});

final storyDetailProvider =
    FutureProvider.family<StoryDetail, String>((ref, storyId) async {
  final apiService = ref.watch(apiServiceProvider);
  return apiService.fetchStoryDetail(storyId);
});

typedef ChapterParams = ({String storyId, String chapterId});

final chapterDetailProvider =
    FutureProvider.family<ChapterDetail, ChapterParams>((ref, params) async {
  final apiService = ref.watch(apiServiceProvider);
  return apiService.fetchChapterDetail(params.storyId, params.chapterId);
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
