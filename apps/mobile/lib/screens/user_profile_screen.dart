import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/readinn_widgets.dart';
import 'auth_dialog.dart';

class UserProfileScreen extends ConsumerWidget {
  const UserProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final user = auth.user;
    return ReadInnShell(
      currentIndex: 3,
      actions: [
        IconButton(
          tooltip: 'Ajustes',
          icon: const Icon(Icons.settings_outlined),
          onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Los ajustes estaran disponibles pronto.'),
            ),
          ),
        ),
        const SizedBox(width: 8),
      ],
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 20),
                child: Column(
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 35,
                          backgroundColor: ReadInnColors.softOrange,
                          backgroundImage: user == null
                              ? null
                              : const AssetImage(
                                  'assets/images/profile_portrait.jpg',
                                ),
                          child: user == null
                              ? const Icon(
                                  Icons.person_outline,
                                  size: 34,
                                  color: ReadInnColors.primaryDeep,
                                )
                              : null,
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user?.displayName ?? 'Invitado',
                                style: const TextStyle(
                                  fontSize: 19,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                user == null
                                    ? 'Sin cuenta'
                                    : '@${user.username}',
                                style: const TextStyle(
                                  color: ReadInnColors.muted,
                                  fontSize: 12,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                user == null
                                    ? 'Inicia sesion para guardar historias y participar en la comunidad.'
                                    : 'Lector y creador independiente en ReadInn.',
                                style: const TextStyle(
                                  color: ReadInnColors.muted,
                                  height: 1.4,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (user != null)
                          IconButton(
                            tooltip: 'Cerrar sesion',
                            icon: const Icon(Icons.more_horiz_rounded),
                            onPressed: () => showModalBottomSheet<void>(
                              context: context,
                              builder: (context) => SafeArea(
                                child: ListTile(
                                  leading: const Icon(Icons.logout),
                                  title: const Text('Cerrar sesion'),
                                  onTap: () {
                                    Navigator.pop(context);
                                    ref.read(authProvider.notifier).logout();
                                  },
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _ProfileStat(value: '0', label: 'Obras'),
                        _ProfileStat(value: '0', label: 'Seguidores'),
                        _ProfileStat(value: '0', label: 'Siguiendo'),
                      ],
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: user == null
                            ? () => AuthDialog.show(context)
                            : () => ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Perfil listo para editar.'),
                                ),
                              ),
                        child: Text(
                          user == null ? 'Iniciar sesion' : 'Editar perfil',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 28),
            const SectionHeader(title: 'Mis listas de lectura'),
            const SizedBox(height: 12),
            SizedBox(
              height: 160,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: 3,
                separatorBuilder: (_, _) => const SizedBox(width: 12),
                itemBuilder: (_, index) => _ListCard(index: index),
              ),
            ),
            const SizedBox(height: 28),
            const SectionHeader(title: 'Favoritos del ano'),
            const SizedBox(height: 12),
            SizedBox(
              height: 180,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: 4,
                separatorBuilder: (_, _) => const SizedBox(width: 12),
                itemBuilder: (_, index) => BookCover(
                  title: const [
                    'The Silent City',
                    'La orbita silenciosa',
                    'Manana sera otro dia',
                    'Realismo magico',
                  ][index],
                  asset: const [
                    'assets/images/silent_street.jpg',
                    'assets/images/silent_orbit.jpg',
                    'assets/images/blue_hours.jpg',
                    'assets/images/summer_letters.jpg',
                  ][index],
                  width: 112,
                  height: 168,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileStat extends StatelessWidget {
  final String value;
  final String label;

  const _ProfileStat({required this.value, required this.label});

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Text(
        value,
        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
      ),
      const SizedBox(height: 3),
      Text(
        label,
        style: const TextStyle(color: ReadInnColors.muted, fontSize: 11),
      ),
    ],
  );
}

class _ListCard extends StatelessWidget {
  final int index;

  const _ListCard({required this.index});

  @override
  Widget build(BuildContext context) {
    const titles = ['Lecturas de invierno', 'Favoritos del ano', 'Para releer'];
    const images = [
      'assets/images/silent_orbit.jpg',
      'assets/images/silver_feather.jpg',
      'assets/images/blue_hours.jpg',
    ];
    return SizedBox(
      width: 132,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: Image.asset(
                    images[index],
                    fit: BoxFit.cover,
                    width: double.infinity,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                titles[index],
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 2),
              const Text(
                '8 historias',
                style: TextStyle(color: ReadInnColors.muted, fontSize: 10),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
