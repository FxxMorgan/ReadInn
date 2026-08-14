import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';
import '../widgets/readinn_widgets.dart';
import 'create_story_dialog.dart';

class WriterDashboardScreen extends StatelessWidget {
  const WriterDashboardScreen({super.key});

  Future<void> _createStory(BuildContext context) async {
    final story = await CreateStoryDialog.show(context);
    if (story != null && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('La obra "${story.title}" fue creada.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
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
      floatingActionButton: FloatingActionButton(
        backgroundColor: ReadInnColors.primary,
        foregroundColor: ReadInnColors.ink,
        tooltip: 'Nueva obra',
        onPressed: () => _createStory(context),
        child: const Icon(Icons.add),
      ),
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
            const SizedBox(height: 22),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => _createStory(context),
                icon: const Icon(Icons.add),
                label: const Text('Nueva obra'),
              ),
            ),
            const SizedBox(height: 28),
            SectionHeader(
              title: 'Rendimiento',
              actionLabel: 'Ver estadísticas',
              onAction: () => context.go('/writer/analytics'),
            ),
            const SizedBox(height: 12),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.25,
              children: const [
                MetricTile(
                  label: 'Lecturas totales',
                  value: '124.5K',
                  delta: '+12.4%',
                  icon: Icons.visibility_outlined,
                ),
                MetricTile(
                  label: 'Seguidores',
                  value: '842',
                  delta: '+8.1%',
                  icon: Icons.people_outline,
                ),
                MetricTile(
                  label: 'Tiempo medio',
                  value: '18m',
                  delta: '+2.3m',
                  icon: Icons.timer_outlined,
                ),
                MetricTile(
                  label: 'Comentarios',
                  value: '2,480',
                  delta: '+18%',
                  icon: Icons.chat_bubble_outline,
                ),
              ],
            ),
            const SizedBox(height: 28),
            SectionHeader(
              title: 'Mis obras',
              actionLabel: 'Ver todas',
              onAction: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Mostrando tus obras publicadas.'),
                ),
              ),
            ),
            const SizedBox(height: 12),
            const _WriterStoryCard(
              title: 'The Architect\'s Dream',
              subtitle: 'Misterio · 12 capítulos',
              status: 'Publicado',
              asset: 'assets/images/writers_dream.jpg',
            ),
            const SizedBox(height: 12),
            const _WriterStoryCard(
              title: 'Echoes of the Valley',
              subtitle: 'Drama · 45 partes',
              status: 'Publicado',
              asset: 'assets/images/echo_valley.jpg',
            ),
            const SizedBox(height: 12),
            const _WriterStoryCard(
              title: 'Silent Whispers',
              subtitle: 'Fantasía · 12 partes',
              status: 'Borrador',
              asset: 'assets/images/silent_whispers.jpg',
            ),
          ],
        ),
      ),
    );
  }
}

class _WriterStoryCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String status;
  final String asset;

  const _WriterStoryCard({
    required this.title,
    required this.subtitle,
    required this.status,
    required this.asset,
  });

  @override
  Widget build(BuildContext context) {
    final published = status == 'Publicado';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            BookCover(title: title, asset: asset, width: 58, height: 86),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: published
                          ? const Color(0xFFE8F5E9)
                          : ReadInnColors.softOrange,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      status,
                      style: TextStyle(
                        color: published
                            ? const Color(0xFF15803D)
                            : ReadInnColors.primaryDeep,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: ReadInnColors.muted,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Actualizado hace 2 días',
                    style: TextStyle(color: ReadInnColors.muted, fontSize: 11),
                  ),
                ],
              ),
            ),
            IconButton(
              tooltip: 'Editar obra',
              onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    'La edicion de obras se habilitara desde el editor.',
                  ),
                ),
              ),
              icon: const Icon(Icons.more_vert_rounded),
            ),
          ],
        ),
      ),
    );
  }
}
