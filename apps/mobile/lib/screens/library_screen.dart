import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../providers/story_providers.dart';
import '../theme/app_theme.dart';
import '../widgets/readinn_widgets.dart';

class LibraryScreen extends ConsumerWidget {
  const LibraryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final storiesAsync = ref.watch(libraryProvider);
    final progressAsync = ref.watch(readingProgressListProvider);
    final auth = ref.watch(authProvider);
    return ReadInnShell(
      currentIndex: 1,
      child: DefaultTabController(
        length: 2,
        child: Column(
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 18, 16, 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Mi biblioteca',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
                ),
              ),
            ),
            const TabBar(
              tabs: [
                Tab(text: 'Guardadas'),
                Tab(text: 'Recientes'),
              ],
            ),
            Expanded(
              child: TabBarView(
                children: [
                  storiesAsync.when(
                    loading: () =>
                        const Center(child: CircularProgressIndicator()),
                    error: (error, _) => Center(
                      child: Text('No se pudo cargar la biblioteca: $error'),
                    ),
                    data: (stories) => ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: stories.length,
                      separatorBuilder: (context, index) =>
                          const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final story = stories[index];
                        return _LibraryTile(
                          title: story.title,
                          author: story.author,
                          subtitle:
                              '${story.genre} · ${story.chapterCount} capítulos',
                          asset: index.isEven
                              ? 'assets/images/silent_street.jpg'
                              : 'assets/images/whispers_glass.jpg',
                          onTap: () => context.push('/story/${story.id}'),
                          onRemove: () async {
                            await ref
                                .read(apiServiceProvider)
                                .toggleLibrary(story.id, token: auth.token);
                            ref.invalidate(libraryProvider);
                          },
                        );
                      },
                    ),
                  ),
                  progressAsync.when(
                    loading: () =>
                        const Center(child: CircularProgressIndicator()),
                    error: (error, _) => Center(
                      child: Text('No se pudo cargar tu progreso: $error'),
                    ),
                    data: (items) {
                      if (items.isEmpty) {
                        return const Center(
                          child: Text('Aún no has comenzado ninguna historia.'),
                        );
                      }
                      return ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: items.length,
                        separatorBuilder: (_, index) =>
                            const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final item = items[index];
                          final storyId = item['storyId']?.toString() ?? '';
                          final chapterId = item['chapterId']?.toString() ?? '';
                          final percentage =
                              (item['progressPercentage'] as num?)
                                  ?.toDouble() ??
                              0;
                          return _ReadingProgressTile(
                            title: item['storyTitle']?.toString() ?? 'Historia',
                            chapter: 'Último capítulo leído',
                            progress: (percentage / 100).clamp(0.0, 1.0),
                            asset: index.isEven
                                ? 'assets/images/silver_feather.jpg'
                                : 'assets/images/project_horizon.jpg',
                            onTap: storyId.isEmpty || chapterId.isEmpty
                                ? null
                                : () => context.push(
                                    '/story/$storyId/read/$chapterId',
                                  ),
                          );
                        },
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LibraryTile extends StatelessWidget {
  final String title;
  final String author;
  final String subtitle;
  final String asset;
  final VoidCallback onTap;
  final VoidCallback onRemove;

  const _LibraryTile({
    required this.title,
    required this.author,
    required this.subtitle,
    required this.asset,
    required this.onTap,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              BookCover(title: title, asset: asset, width: 54, height: 82),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      author,
                      style: const TextStyle(
                        color: ReadInnColors.muted,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        color: ReadInnColors.muted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Quitar de la biblioteca',
                onPressed: onRemove,
                icon: const Icon(
                  Icons.bookmark_remove_outlined,
                  color: ReadInnColors.primaryDeep,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReadingProgressTile extends StatelessWidget {
  final String title;
  final String chapter;
  final double progress;
  final String asset;
  final VoidCallback? onTap;

  const _ReadingProgressTile({
    required this.title,
    required this.chapter,
    required this.progress,
    required this.asset,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              BookCover(title: title, asset: asset, width: 54, height: 82),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      chapter,
                      style: const TextStyle(
                        color: ReadInnColors.muted,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 12),
                    LinearProgressIndicator(
                      value: progress,
                      minHeight: 5,
                      borderRadius: BorderRadius.circular(4),
                      color: ReadInnColors.primary,
                      backgroundColor: ReadInnColors.softOrange,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              const Icon(
                Icons.play_circle_fill_rounded,
                color: ReadInnColors.primaryDeep,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
