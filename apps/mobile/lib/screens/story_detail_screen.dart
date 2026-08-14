import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/story_providers.dart';
import '../theme/app_theme.dart';
import 'report_dialog.dart';

class StoryDetailScreen extends ConsumerWidget {
  final String storyId;

  const StoryDetailScreen({super.key, required this.storyId});

  Color _parseHexColor(String hex) {
    try {
      final clean = hex.replaceAll('#', '');
      return Color(int.parse('FF$clean', radix: 16));
    } catch (_) {
      return ReadInnColors.primary;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final storyDetailAsync = ref.watch(storyDetailProvider(storyId));
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Detalle de la Obra'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.flag_outlined),
            tooltip: 'Reportar obra',
            onPressed: () async {
              final reported = await ReportDialog.show(
                context,
                targetType: 'story',
                targetId: storyId,
                title: 'La luz del faro',
              );
              if (reported == true && context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Gracias por tu reporte. Lo revisaremos pronto.')),
                );
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.share_outlined),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.bookmark_border_rounded),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Guardado en tu biblioteca')),
              );
            },
          ),
        ],
      ),
      body: storyDetailAsync.when(
        data: (story) {
          final coverColor = _parseHexColor(story.coverColor);
          final firstChapter = story.chapters.isNotEmpty ? story.chapters.first : null;

          return SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header Banner (Stitch Naranja Spec)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 32.0, horizontal: 24.0),
                  decoration: BoxDecoration(
                    color: ReadInnColors.primaryContainer.withValues(alpha: 0.25),
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 120,
                        height: 175,
                        decoration: BoxDecoration(
                          color: coverColor,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: [ReadInnColors.bookShadow],
                        ),
                        child: Center(
                          child: Padding(
                            padding: const EdgeInsets.all(10.0),
                            child: Text(
                              story.title,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        story.title,
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Por ${story.author}',
                        style: const TextStyle(
                          color: ReadInnColors.primary,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Chip(
                            label: Text(story.genre),
                          ),
                          const SizedBox(width: 8),
                          Chip(
                            label: Text('${story.chapters.length} capítulos'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Stats & Actions Section
                Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Quick Stats Row
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: const [
                          _DetailStat(label: 'Lecturas', value: '18.4K'),
                          _DetailStat(label: 'Valoración', value: '★ 4.8'),
                          _DetailStat(label: 'Comentarios', value: '142'),
                        ],
                      ),
                      const SizedBox(height: 24),
                      // CTA Button
                      if (firstChapter != null)
                        SizedBox(
                          width: double.infinity,
                          height: 50,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: ReadInnColors.primary,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(25),
                              ),
                              elevation: 2,
                            ),
                            icon: const Icon(Icons.play_arrow_rounded, size: 26),
                            label: const Text(
                              'Comenzar a leer',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            onPressed: () {
                              context.go('/story/${story.id}/read/${firstChapter.id}');
                            },
                          ),
                        ),
                      const SizedBox(height: 28),
                      // Synopsis
                      Text(
                        'Sinopsis',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        story.synopsis,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              height: 1.6,
                              color: isDark ? ReadInnColors.darkText : ReadInnColors.onSurface,
                            ),
                      ),
                      const SizedBox(height: 28),
                      // Chapter List Header
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Capítulos (${story.chapters.length})',
                            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          const Text(
                            'Orden ascendente',
                            style: TextStyle(fontSize: 12, color: ReadInnColors.onSurfaceVariant),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: story.chapters.length,
                        separatorBuilder: (context, index) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final chapter = story.chapters[index];
                          return ListTile(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            leading: CircleAvatar(
                              backgroundColor: ReadInnColors.primaryContainer,
                              child: Text(
                                '${chapter.position}',
                                style: const TextStyle(
                                  color: ReadInnColors.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            title: Text(
                              chapter.title,
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            subtitle: const Text('12 comentarios', style: TextStyle(fontSize: 11)),
                            trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                            onTap: () {
                              context.go('/story/${story.id}/read/${chapter.id}');
                            },
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 48),
              const SizedBox(height: 12),
              const Text('Error al cargar la obra'),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () => ref.refresh(storyDetailProvider(storyId)),
                child: const Text('Reintentar'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailStat extends StatelessWidget {
  final String label;
  final String value;

  const _DetailStat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: ReadInnColors.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}
