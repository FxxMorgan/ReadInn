import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/story_providers.dart';
import '../theme/app_theme.dart';
import '../widgets/readinn_widgets.dart';

class CreatorStatsScreen extends ConsumerWidget {
  const CreatorStatsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final metrics = ref.watch(dashboardMetricsProvider);
    return ReadInnShell(
      currentIndex: 2,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                IconButton(
                  onPressed: () => context.canPop()
                      ? context.pop()
                      : context.go('/writer/dashboard'),
                  icon: const Icon(Icons.arrow_back_rounded),
                ),
                const SizedBox(width: 4),
                const Text(
                  'Estadisticas',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
                ),
              ],
            ),
            const Padding(
              padding: EdgeInsets.only(left: 52),
              child: Text(
                'Datos de tus obras publicadas.',
                style: TextStyle(color: ReadInnColors.muted),
              ),
            ),
            const SizedBox(height: 22),
            metrics.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) =>
                  Text('No pudimos cargar las estadisticas: $error'),
              data: (data) => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1.25,
                    children: [
                      MetricTile(
                        label: 'Visitas totales',
                        value: '${data.totalViews}',
                        icon: Icons.visibility_outlined,
                      ),
                      MetricTile(
                        label: 'Lectores unicos',
                        value: '${data.uniqueReaders}',
                        icon: Icons.people_outline,
                      ),
                      MetricTile(
                        label: 'Tiempo medio',
                        value: '${data.avgReadMinutes.toStringAsFixed(1)}m',
                        icon: Icons.timer_outlined,
                      ),
                      MetricTile(
                        label: 'Seguidores',
                        value: '${data.followers}',
                        icon: Icons.person_add_alt_1_outlined,
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),
                  const Text(
                    'Desglose por obra',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  if (data.stories.isEmpty)
                    const Text(
                      'Publica una obra para comenzar a generar estadisticas.',
                    )
                  else
                    ...data.stories.map(
                      (story) => Card(
                        child: ListTile(
                          leading: const Icon(
                            Icons.auto_stories_outlined,
                            color: ReadInnColors.primaryDeep,
                          ),
                          title: Text(
                            story['storyTitle']?.toString() ?? 'Obra',
                          ),
                          subtitle: Text(
                            '${story['totalViews'] ?? 0} lecturas',
                          ),
                          trailing: Text(
                            '${(story['completionRatePercentage'] as num?)?.toStringAsFixed(0) ?? '0'}%',
                          ),
                        ),
                      ),
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
