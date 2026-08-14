import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../providers/story_providers.dart';
import '../theme/app_theme.dart';
import '../widgets/readinn_widgets.dart';
import 'report_dialog.dart';

class StoryDetailScreen extends ConsumerWidget {
  final String storyId;

  const StoryDetailScreen({super.key, required this.storyId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final storyAsync = ref.watch(storyDetailProvider(storyId));
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
          final firstChapter = story.chapters.isNotEmpty
              ? story.chapters.first
              : null;
          return SingleChildScrollView(
            padding: const EdgeInsets.only(bottom: 32),
            child: Column(
              children: [
                Container(
                  width: double.infinity,
                  color: ReadInnColors.softOrange,
                  padding: const EdgeInsets.fromLTRB(24, 28, 24, 30),
                  child: Column(
                    children: [
                      const BookCover(
                        title: 'La Órbita Silenciosa',
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
                            label: 'Completa',
                            icon: Icons.check_circle_outline,
                          ),
                          const _MetaChip(
                            label: '4.8',
                            icon: Icons.star_rounded,
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      if (firstChapter != null)
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            style: FilledButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 15),
                              backgroundColor: ReadInnColors.primaryDeep,
                            ),
                            onPressed: () => context.push(
                              '/story/${story.id}/read/${firstChapter.id}',
                            ),
                            icon: const Icon(Icons.menu_book_rounded),
                            label: const Text(
                              'Comenzar a leer',
                              style: TextStyle(fontWeight: FontWeight.w800),
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
                          children: const [
                            _Stat(value: '24.5K', label: 'Lecturas'),
                            _Stat(value: '1.2K', label: 'Seguidores'),
                            _Stat(value: '246', label: 'Comentarios'),
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
                            onTap: () => context.push(
                              '/story/${story.id}/read/${chapter.id}',
                            ),
                          );
                        }),
                        const SizedBox(height: 24),
                        OutlinedButton.icon(
                          onPressed: () async {
                            final saved = await ref
                                .read(apiServiceProvider)
                                .toggleLibrary(storyId, token: auth.token);
                            ref.invalidate(libraryProvider);
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
                          icon: const Icon(Icons.bookmark_add_outlined),
                          label: const Text('Guardar en mi biblioteca'),
                        ),
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
  Widget build(BuildContext context) {
    return Container(
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
}

class _Stat extends StatelessWidget {
  final String value;
  final String label;

  const _Stat({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
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
}

class _ChapterRow extends StatelessWidget {
  final int index;
  final String title;
  final String readTime;
  final VoidCallback onTap;

  const _ChapterRow({
    required this.index,
    required this.title,
    required this.readTime,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
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
                color: index == 0
                    ? ReadInnColors.softOrange
                    : const Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: Text(
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
}
