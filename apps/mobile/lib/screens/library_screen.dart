import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/story_providers.dart';
import '../theme/app_theme.dart';

class LibraryScreen extends ConsumerWidget {
  const LibraryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final storiesAsync = ref.watch(storiesProvider);

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Mi Biblioteca', style: TextStyle(fontWeight: FontWeight.bold)),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.go('/'),
          ),
          bottom: TabBar(
            labelColor: ReadInnColors.primary,
            unselectedLabelColor: ReadInnColors.onSurfaceVariant,
            indicatorColor: ReadInnColors.primary,
            tabs: const [
              Tab(text: 'Guardadas'),
              Tab(text: 'Lecturas Recientes'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            // Saved stories tab
            storiesAsync.when(
              data: (stories) {
                if (stories.isEmpty) {
                  return const Center(child: Text('No tienes obras guardadas'));
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: stories.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final story = stories[index];
                    return Card(
                      child: ListTile(
                        leading: Container(
                          width: 44,
                          height: 64,
                          decoration: BoxDecoration(
                            color: ReadInnColors.primary,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Center(
                            child: Icon(Icons.book, color: Colors.white, size: 20),
                          ),
                        ),
                        title: Text(story.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('${story.author} • ${story.chapterCount} cap.'),
                        trailing: IconButton(
                          icon: const Icon(Icons.bookmark_remove_outlined, color: Colors.red),
                          onPressed: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Obra eliminada de tu biblioteca')),
                            );
                          },
                        ),
                        onTap: () => context.go('/story/${story.id}'),
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, stack) => Center(child: Text('Error: $err')),
            ),
            // Recent reading tab
            ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: ListTile(
                    leading: Container(
                      width: 44,
                      height: 64,
                      decoration: BoxDecoration(
                        color: const Color(0xFF1F5F73),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Center(
                        child: Icon(Icons.menu_book, color: Colors.white, size: 20),
                      ),
                    ),
                    title: const Text('La luz del faro', style: TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 4),
                        const Text('Capítulo 1: El mapa bajo la sal'),
                        const SizedBox(height: 6),
                        LinearProgressIndicator(
                          value: 0.65,
                          color: ReadInnColors.primary,
                          backgroundColor: ReadInnColors.primary.withValues(alpha: 0.2),
                        ),
                      ],
                    ),
                    trailing: const Icon(Icons.play_arrow_rounded, color: ReadInnColors.primary),
                    onTap: () => context.go('/story/story-lighthouse/read/chapter-lighthouse-1'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
