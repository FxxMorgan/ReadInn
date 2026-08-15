import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/story.dart';
import '../providers/auth_provider.dart';
import '../providers/story_providers.dart';
import '../theme/app_theme.dart';
import '../widgets/readinn_widgets.dart';
import 'report_dialog.dart';

class StoryDetailScreen extends ConsumerWidget {
  final String storyId;

  const StoryDetailScreen({super.key, required this.storyId});

  String _formatCount(int value) {
    if (value >= 1000000) return '${(value / 1000000).toStringAsFixed(1)}M';
    if (value >= 1000) return '${(value / 1000).toStringAsFixed(1)}K';
    return '$value';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final storyAsync = ref.watch(storyDetailProvider(storyId));
    final engagementAsync = ref.watch(storyEngagementProvider(storyId));
    final progressAsync = ref.watch(readingProgressProvider(storyId));
    final auth = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.canPop() ? context.pop() : context.go('/'),
        ),
        title: const Text(
          'ReadInn',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            tooltip: 'Reportar',
            icon: const Icon(Icons.flag_outlined),
            onPressed: () => ReportDialog.show(
              context,
              targetType: 'story',
              targetId: storyId,
              title: 'Obra',
            ),
          ),
          IconButton(
            tooltip: 'Compartir',
            icon: const Icon(Icons.share_outlined),
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Enlace de la obra listo para compartir.'),
              ),
            ),
          ),
        ],
      ),
      body: storyAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) =>
            Center(child: Text('No pudimos abrir esta obra: $error')),
        data: (story) {
          final progress = progressAsync.valueOrNull;
          final engagement =
              engagementAsync.valueOrNull ?? const StoryEngagement();
          final continueChapter = progress == null
              ? null
              : story.chapters
                    .where((chapter) => chapter.id == progress.chapterId)
                    .firstOrNull;
          final startChapter = continueChapter ?? story.chapters.firstOrNull;
          final startLabel = continueChapter == null
              ? 'Comenzar a leer'
              : 'Continuar capítulo ${continueChapter.position}';
          final seen = progress?.seenChapterIds.toSet() ?? <String>{};

          return SingleChildScrollView(
            padding: const EdgeInsets.only(bottom: 32),
            child: Column(
              children: [
                Container(
                  width: double.infinity,
                  color: ReadInnColors.softOrange,
                  padding: const EdgeInsets.fromLTRB(24, 28, 24, 26),
                  child: Column(
                    children: [
                      BookCover(
                        title: story.title,
                        author: story.author,
                        asset: 'assets/images/silent_orbit.jpg',
                        width: 128,
                        height: 190,
                      ),
                      const SizedBox(height: 22),
                      Text(
                        story.title,
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.headlineMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Por ${story.author}',
                        style: const TextStyle(
                          color: ReadInnColors.primaryDeep,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 14),
                      Wrap(
                        alignment: WrapAlignment.center,
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _MetaChip(
                            label: story.genre,
                            icon: Icons.auto_awesome_outlined,
                          ),
                          _MetaChip(
                            label: story.status == 'completed'
                                ? 'Completa'
                                : 'En curso',
                            icon: Icons.check_circle_outline,
                          ),
                          _MetaChip(
                            label: engagement.averageRating > 0
                                ? engagement.averageRating.toStringAsFixed(1)
                                : 'Sin calificar',
                            icon: Icons.star_rounded,
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      if (startChapter != null)
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            style: FilledButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 15),
                              backgroundColor: ReadInnColors.primaryDeep,
                            ),
                            onPressed: () => context.push(
                              '/story/${story.id}/read/${startChapter.id}',
                            ),
                            icon: const Icon(Icons.menu_book_rounded),
                            label: Text(
                              startLabel,
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton.icon(
                          onPressed: () async {
                            final saved = await ref
                                .read(apiServiceProvider)
                                .toggleLibrary(storyId, token: auth.token);
                            ref.invalidate(libraryProvider);
                            ref.invalidate(storyEngagementProvider(storyId));
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    saved
                                        ? 'Guardado en tu biblioteca.'
                                        : 'Quitado de tu biblioteca.',
                                  ),
                                ),
                              );
                            }
                          },
                          icon: Icon(
                            engagement.saved
                                ? Icons.bookmark_rounded
                                : Icons.bookmark_add_outlined,
                          ),
                          label: Text(
                            engagement.saved
                                ? 'Guardado en mi biblioteca'
                                : 'Guardar en mi biblioteca',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 26, 16, 0),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 760),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _Stat(
                              value: _formatCount(engagement.reads),
                              label: 'Lecturas',
                            ),
                            _Stat(
                              value: _formatCount(engagement.followers),
                              label: 'Seguidores',
                            ),
                            _Stat(
                              value: _formatCount(engagement.comments),
                              label: 'Comentarios',
                            ),
                          ],
                        ),
                        const SizedBox(height: 28),
                        const SectionHeader(title: 'Sinopsis'),
                        const SizedBox(height: 10),
                        Text(
                          story.synopsis,
                          style: const TextStyle(
                            height: 1.65,
                            fontSize: 15,
                            color: ReadInnColors.muted,
                          ),
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'Tu calificación',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: List.generate(5, (index) {
                            final value = index + 1;
                            return IconButton(
                              tooltip: '$value estrellas',
                              onPressed: () async {
                                try {
                                  await ref
                                      .read(apiServiceProvider)
                                      .rateStory(
                                        storyId,
                                        value.toDouble(),
                                        token: auth.token,
                                      );
                                  ref.invalidate(
                                    storyEngagementProvider(storyId),
                                  );
                                  ref.invalidate(storiesProvider);
                                } catch (_) {
                                  if (!context.mounted) return;
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                        'No pudimos guardar tu calificaciÃ³n.',
                                      ),
                                    ),
                                  );
                                }
                              },
                              icon: Icon(
                                value <= engagement.userRating.round()
                                    ? Icons.star_rounded
                                    : Icons.star_border_rounded,
                                color: ReadInnColors.primary,
                                size: 30,
                              ),
                            );
                          }),
                        ),
                        if (engagement.userRating > 0)
                          TextButton(
                            onPressed: () async {
                              try {
                                await ref
                                    .read(apiServiceProvider)
                                    .rateStory(storyId, 0, token: auth.token);
                                ref.invalidate(
                                  storyEngagementProvider(storyId),
                                );
                                ref.invalidate(storiesProvider);
                              } catch (_) {
                                if (!context.mounted) return;
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'No pudimos quitar tu calificaciÃ³n.',
                                    ),
                                  ),
                                );
                              }
                            },
                            child: const Text('Quitar calificación'),
                          ),
                        Text(
                          engagement.ratingCount == 0
                              ? 'Sé el primero en calificar'
                              : '${engagement.averageRating.toStringAsFixed(1)} de 5 · ${engagement.ratingCount} calificaciones',
                          style: const TextStyle(
                            color: ReadInnColors.muted,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(height: 28),
                        SectionHeader(
                          title: 'Capítulos',
                          actionLabel: '${story.chapters.length} disponibles',
                        ),
                        const SizedBox(height: 10),
                        ...story.chapters.asMap().entries.map((entry) {
                          final chapter = entry.value;
                          return _ChapterRow(
                            index: entry.key,
                            title: chapter.title,
                            readTime: '${12 + entry.key * 3} min',
                            seen: seen.contains(chapter.id),
                            onTap: () => context.push(
                              '/story/${story.id}/read/${chapter.id}',
                            ),
                          );
                        }),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  final String label;
  final IconData icon;
  const _MetaChip({required this.label, required this.icon});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.85),
      borderRadius: BorderRadius.circular(20),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: ReadInnColors.primaryDeep),
        const SizedBox(width: 5),
        Text(
          label,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
        ),
      ],
    ),
  );
}

class _Stat extends StatelessWidget {
  final String value;
  final String label;
  const _Stat({required this.value, required this.label});
  @override
  Widget build(BuildContext context) => Column(
    children: [
      Text(
        value,
        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
      ),
      const SizedBox(height: 2),
      Text(
        label,
        style: const TextStyle(color: ReadInnColors.muted, fontSize: 11),
      ),
    ],
  );
}

class _ChapterRow extends StatelessWidget {
  final int index;
  final String title;
  final String readTime;
  final bool seen;
  final VoidCallback onTap;
  const _ChapterRow({
    required this.index,
    required this.title,
    required this.readTime,
    required this.seen,
    required this.onTap,
  });
  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(8),
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 13),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: seen
                  ? const Color(0xFFDFF4E5)
                  : (index == 0
                        ? ReadInnColors.softOrange
                        : const Color(0xFFF1F5F9)),
              shape: BoxShape.circle,
            ),
            child: seen
                ? const Icon(
                    Icons.check_rounded,
                    size: 17,
                    color: Color(0xFF15803D),
                  )
                : Text(
                    '${index + 1}',
                    style: TextStyle(
                      color: index == 0
                          ? ReadInnColors.primaryDeep
                          : ReadInnColors.muted,
                      fontWeight: FontWeight.w800,
                      fontSize: 12,
                    ),
                  ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 3),
                Text(
                  readTime,
                  style: const TextStyle(
                    color: ReadInnColors.muted,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded, color: ReadInnColors.muted),
        ],
      ),
    ),
  );
}
