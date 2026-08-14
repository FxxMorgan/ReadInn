import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';
import 'create_story_dialog.dart';

class WriterDashboardScreen extends ConsumerWidget {
  const WriterDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Panel del Escritor',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Writer Welcome Header & Primary CTA
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '¡Hola, Marina!',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Gestiona tus historias y revisa tus estadísticas',
                        style: TextStyle(
                          color: isDark
                              ? ReadInnColors.darkSubtext
                              : ReadInnColors.onSurfaceVariant,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ReadInnColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Nueva Obra'),
                    onPressed: () async {
                      final newStory = await CreateStoryDialog.show(context);
                      if (newStory != null && context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('¡Obra "${newStory.title}" creada exitosamente!')),
                        );
                      }
                    },
                  ),
                ],
              ),
              const SizedBox(height: 24),
              // Analytics KPI Grid (Stitch Spec)
              Text(
                'Rendimiento este mes',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: MediaQuery.of(context).size.width > 600 ? 4 : 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.4,
                children: const [
                  _KpiCard(
                    title: 'Total Lecturas',
                    value: '24,580',
                    trend: '+12.4%',
                    isPositive: true,
                    icon: Icons.remove_red_eye_outlined,
                  ),
                  _KpiCard(
                    title: 'Lectores Únicos',
                    value: '8,210',
                    trend: '+8.1%',
                    isPositive: true,
                    icon: Icons.group_outlined,
                  ),
                  _KpiCard(
                    title: 'Tiempo Promedio',
                    value: '6.4 min',
                    trend: '+0.5m',
                    isPositive: true,
                    icon: Icons.timer_outlined,
                  ),
                  _KpiCard(
                    title: 'Seguidores',
                    value: '1,240',
                    trend: '+45 este mes',
                    isPositive: true,
                    icon: Icons.favorite_border_rounded,
                  ),
                ],
              ),
              const SizedBox(height: 28),
              // Stories Tabs & Management
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Mis Historias',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  TextButton(
                    onPressed: () {},
                    child: const Text('Ver todas'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // Author's Stories List (Stitch Naranja Panel)
              _WriterStoryTile(
                title: 'La luz del faro',
                genre: 'Misterio',
                status: 'Publicado',
                chaptersCount: 3,
                viewsCount: '18.4K',
                coverColor: const Color(0xFF1F5F73),
              ),
              const SizedBox(height: 12),
              _WriterStoryTile(
                title: 'Cartas a la niebla',
                genre: 'Drama',
                status: 'Borrador',
                chaptersCount: 1,
                viewsCount: '0',
                coverColor: const Color(0xFF7F4F24),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String title;
  final String value;
  final String trend;
  final bool isPositive;
  final IconData icon;

  const _KpiCard({
    required this.title,
    required this.value,
    required this.trend,
    required this.isPositive,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 11,
                    color: ReadInnColors.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Icon(icon, size: 16, color: ReadInnColors.primary),
              ],
            ),
            Text(
              value,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              trend,
              style: const TextStyle(
                fontSize: 10,
                color: Colors.green,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WriterStoryTile extends StatelessWidget {
  final String title;
  final String genre;
  final String status;
  final int chaptersCount;
  final String viewsCount;
  final Color coverColor;

  const _WriterStoryTile({
    required this.title,
    required this.genre,
    required this.status,
    required this.chaptersCount,
    required this.viewsCount,
    required this.coverColor,
  });

  @override
  Widget build(BuildContext context) {
    final isPublished = status == 'Publicado';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Row(
          children: [
            Container(
              width: 50,
              height: 70,
              decoration: BoxDecoration(
                color: coverColor,
                borderRadius: BorderRadius.circular(6),
                boxShadow: [ReadInnColors.bookShadow],
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: isPublished
                              ? Colors.green.withValues(alpha: 0.15)
                              : Colors.orange.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          status,
                          style: TextStyle(
                            color: isPublished ? Colors.green : Colors.orange,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        genre,
                        style: const TextStyle(fontSize: 11, color: ReadInnColors.outline),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$chaptersCount capítulos • $viewsCount lecturas',
                    style: const TextStyle(fontSize: 12, color: ReadInnColors.onSurfaceVariant),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.edit_outlined),
              tooltip: 'Editar historia',
              onPressed: () {},
            ),
          ],
        ),
      ),
    );
  }
}
