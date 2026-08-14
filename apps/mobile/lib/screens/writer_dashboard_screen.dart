import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/story.dart';
import '../providers/auth_provider.dart';
import '../providers/story_providers.dart';
import '../theme/app_theme.dart';
import '../widgets/readinn_widgets.dart';
import 'auth_dialog.dart';
import 'create_story_dialog.dart';

class WriterDashboardScreen extends ConsumerWidget {
  const WriterDashboardScreen({super.key});

  Future<void> _createStory(BuildContext context, WidgetRef ref) async {
    final story = await CreateStoryDialog.show(context);
    if (story != null && context.mounted) {
      ref.invalidate(writerStoriesProvider);
      ref.invalidate(dashboardMetricsProvider);
      context.push('/writer/story/${story.id}');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final stories = ref.watch(writerStoriesProvider);
    final metrics = ref.watch(dashboardMetricsProvider);
    final showAll = ref.watch(showAllStoriesProvider);
    return ReadInnShell(
      currentIndex: 2,
      actions: [
        IconButton(
          tooltip: 'Notificaciones',
          onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No tienes notificaciones nuevas.')),
          ),
          icon: const Icon(Icons.notifications_none_rounded),
        ),
        const SizedBox(width: 8),
      ],
      floatingActionButton: auth.isAuthenticated
          ? FloatingActionButton(
              backgroundColor: ReadInnColors.primary,
              foregroundColor: ReadInnColors.ink,
              tooltip: 'Nueva obra',
              onPressed: () => _createStory(context, ref),
              child: const Icon(Icons.add),
            )
          : null,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 22, 16, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Escritorio de creador',
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            const Text(
              'Gestiona tus historias y conecta con tus lectores.',
              style: TextStyle(color: ReadInnColors.muted),
            ),
            if (!auth.isAuthenticated) ...[
              const SizedBox(height: 24),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Inicia sesion para escribir',
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 17,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Tus obras y estadisticas apareceran aqui.',
                        style: TextStyle(color: ReadInnColors.muted),
                      ),
                      const SizedBox(height: 14),
                      FilledButton(
                        onPressed: () => AuthDialog.show(context),
                        child: const Text('Iniciar sesion'),
                      ),
                    ],
                  ),
                ),
              ),
            ] else ...[
              const SizedBox(height: 22),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () => _createStory(context, ref),
                  icon: const Icon(Icons.add),
                  label: const Text('Nueva obra'),
                ),
              ),
              const SizedBox(height: 28),
              SectionHeader(
                title: 'Rendimiento',
                actionLabel: 'Ver estadisticas',
                onAction: () => context.push('/writer/analytics'),
              ),
              const SizedBox(height: 12),
              metrics.when(
                loading: () => const SizedBox(
                  height: 190,
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (error, _) =>
                    Text('No pudimos cargar tus estadisticas: $error'),
                data: (data) => GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.25,
                  children: [
                    MetricTile(
                      label: 'Lecturas totales',
                      value: '${data.totalViews}',
                      icon: Icons.visibility_outlined,
                    ),
                    MetricTile(
                      label: 'Seguidores',
                      value: '${data.followers}',
                      icon: Icons.people_outline,
                    ),
                    MetricTile(
                      label: 'Tiempo medio',
                      value: '${data.avgReadMinutes.toStringAsFixed(1)}m',
                      icon: Icons.timer_outlined,
                    ),
                    MetricTile(
                      label: 'Obras',
                      value: '${data.stories.length}',
                      icon: Icons.auto_stories_outlined,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),
              SectionHeader(
                title: 'Mis obras',
                actionLabel: showAll ? 'Ver menos' : 'Ver todas',
                onAction: () =>
                    ref.read(showAllStoriesProvider.notifier).state = !showAll,
              ),
              const SizedBox(height: 12),
              stories.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) =>
                    Text('No pudimos cargar tus obras: $error'),
                data: (items) {
                  final visible = showAll ? items : items.take(3).toList();
                  if (visible.isEmpty) {
                    return const Text(
                      'Todavia no tienes obras. Crea la primera.',
                    );
                  }
                  return Column(
                    children: visible
                        .map(
                          (story) => Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: _WriterStoryCard(story: story),
                          ),
                        )
                        .toList(),
                  );
                },
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _WriterStoryCard extends StatelessWidget {
  final StorySummary story;
  const _WriterStoryCard({required this.story});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: () => context.push('/writer/story/${story.id}'),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              BookCover(
                title: story.title,
                asset: 'assets/images/writers_dream.jpg',
                width: 58,
                height: 86,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      story.status == 'draft' ? 'Borrador' : 'Publicado',
                      style: TextStyle(
                        color: story.status == 'draft'
                            ? ReadInnColors.primaryDeep
                            : const Color(0xFF15803D),
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 7),
                    Text(
                      story.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${story.genre} · ${story.chapterCount} capitulos',
                      style: const TextStyle(
                        color: ReadInnColors.muted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                color: ReadInnColors.muted,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
