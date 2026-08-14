import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';

class UserProfileScreen extends ConsumerWidget {
  const UserProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Perfil'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Profile Header Banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
              decoration: BoxDecoration(
                color: ReadInnColors.primaryContainer.withValues(alpha: 0.3),
              ),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 44,
                    backgroundColor: ReadInnColors.primary,
                    child: const Text(
                      'MS',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Marina Solís',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  Text(
                    '@marina-solis',
                    style: TextStyle(
                      color: isDark ? ReadInnColors.darkSubtext : ReadInnColors.onSurfaceVariant,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 500),
                    child: Text(
                      'Cartógrafa e investigadora de leyendas marítimas. Escribo historias donde el mar oculta secretos viejos.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? ReadInnColors.darkText : ReadInnColors.onSurface,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Donacion / Apoyo Externo Badge
                  ActionChip(
                    avatar: const Icon(Icons.favorite, size: 14, color: Colors.red),
                    label: const Text('Apoyar en Ko-fi'),
                    onPressed: () {},
                  ),
                ],
              ),
            ),
            // Profile Stats Bar
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: const [
                  _ProfileStatItem(number: '2', label: 'Obras'),
                  _ProfileStatItem(number: '1,240', label: 'Seguidores'),
                  _ProfileStatItem(number: '48', label: 'Siguiendo'),
                ],
              ),
            ),
            const Divider(height: 1),
            // Published Stories Section
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Obras de Marina',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 12),
                  Card(
                    child: ListTile(
                      leading: Container(
                        width: 40,
                        height: 60,
                        decoration: BoxDecoration(
                          color: const Color(0xFF1F5F73),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      title: const Text('La luz del faro', style: TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: const Text('Misterio • 3 capítulos'),
                      trailing: const Icon(Icons.arrow_forward_ios, size: 14),
                      onTap: () => context.go('/story/story-lighthouse'),
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

class _ProfileStatItem extends StatelessWidget {
  final String number;
  final String label;

  const _ProfileStatItem({required this.number, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          number,
          style: const TextStyle(
            fontSize: 18,
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
