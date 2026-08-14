import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'screens/explore_screen.dart';
import 'screens/library_screen.dart';
import 'screens/reader_screen.dart';
import 'screens/story_detail_screen.dart';
import 'screens/user_profile_screen.dart';
import 'screens/writer_dashboard_screen.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: ReadInnApp(),
    ),
  );
}

final _router = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const ExploreScreen(),
    ),
    GoRoute(
      path: '/story/:storyId',
      builder: (context, state) {
        final storyId = state.pathParameters['storyId'] ?? '';
        return StoryDetailScreen(storyId: storyId);
      },
    ),
    GoRoute(
      path: '/story/:storyId/read/:chapterId',
      builder: (context, state) {
        final storyId = state.pathParameters['storyId'] ?? '';
        final chapterId = state.pathParameters['chapterId'] ?? '';
        return ReaderScreen(storyId: storyId, chapterId: chapterId);
      },
    ),
    GoRoute(
      path: '/writer/dashboard',
      builder: (context, state) => const WriterDashboardScreen(),
    ),
    GoRoute(
      path: '/profile',
      builder: (context, state) => const UserProfileScreen(),
    ),
    GoRoute(
      path: '/library',
      builder: (context, state) => const LibraryScreen(),
    ),
  ],
);

class ReadInnApp extends StatelessWidget {
  const ReadInnApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'ReadInn',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      routerConfig: _router,
    );
  }
}
