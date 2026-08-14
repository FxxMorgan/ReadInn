import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../providers/auth_provider.dart';
import '../providers/story_providers.dart';
import '../theme/app_theme.dart';
import '../widgets/readinn_widgets.dart';
import 'auth_dialog.dart';

class UserProfileScreen extends ConsumerStatefulWidget {
  const UserProfileScreen({super.key});

  @override
  ConsumerState<UserProfileScreen> createState() => _UserProfileScreenState();
}

class _UserProfileScreenState extends ConsumerState<UserProfileScreen> {
  final _lists = <String>[];
  String? _loadedUserId;
  bool _commentNotifications = true;
  bool _chapterNotifications = true;

  String _listsKey(String userId) => 'reading_lists_$userId';

  Future<void> _loadLists(String? userId) async {
    if (userId == null) {
      if (mounted) setState(_lists.clear);
      return;
    }
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getStringList(_listsKey(userId)) ?? <String>[];
    if (mounted && _loadedUserId == userId) {
      setState(() {
        _lists
          ..clear()
          ..addAll(stored);
      });
    }
  }

  Future<void> _persistLists() async {
    final userId = ref.read(authProvider).user?.id;
    if (userId == null) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_listsKey(userId), _lists);
  }

  Future<void> _editProfile() async {
    final user = ref.read(authProvider).user;
    if (user == null) return;
    final name = TextEditingController(text: user.displayName);
    final bio = TextEditingController(text: user.bio);
    final save = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Editar perfil'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: name,
              decoration: const InputDecoration(labelText: 'Nombre público'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: bio,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Biografía'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
    if (save == true) {
      final ok = await ref
          .read(authProvider.notifier)
          .updateProfile(displayName: name.text.trim(), bio: bio.text.trim());
      if (!ok && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No pudimos actualizar el perfil.')),
        );
      }
    }
    name.dispose();
    bio.dispose();
  }

  Future<void> _createList() async {
    if (!ref.read(authProvider).isAuthenticated) {
      AuthDialog.show(context);
      return;
    }
    final controller = TextEditingController();
    final value = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Nueva lista'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(labelText: 'Nombre'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Crear'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (value?.isNotEmpty != true) return;
    setState(() => _lists.add(value!));
    await _persistLists();
  }

  Future<void> _renameList(int index) async {
    final controller = TextEditingController(text: _lists[index]);
    final value = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Editar lista'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(labelText: 'Nombre'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (value?.isNotEmpty != true) return;
    setState(() => _lists[index] = value!);
    await _persistLists();
  }

  Future<void> _deleteList(int index) async {
    setState(() => _lists.removeAt(index));
    await _persistLists();
  }

  void _openSettings() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        var commentNotifications = _commentNotifications;
        var chapterNotifications = _chapterNotifications;
        return StatefulBuilder(
          builder: (context, setModalState) => SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const ListTile(
                  title: Text(
                    'Ajustes',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                SwitchListTile(
                  value: commentNotifications,
                  onChanged: (value) {
                    setModalState(() => commentNotifications = value);
                    setState(() => _commentNotifications = value);
                  },
                  title: const Text('Notificaciones de comentarios'),
                ),
                SwitchListTile(
                  value: chapterNotifications,
                  onChanged: (value) {
                    setModalState(() => chapterNotifications = value);
                    setState(() => _chapterNotifications = value);
                  },
                  title: const Text('Avisos de nuevos capítulos'),
                ),
                ListTile(
                  leading: const Icon(Icons.logout),
                  title: const Text('Cerrar sesión'),
                  onTap: () {
                    Navigator.pop(context);
                    ref.read(authProvider.notifier).logout();
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final user = auth.user;
    final library = ref.watch(libraryProvider);
    if (_loadedUserId != user?.id) {
      _loadedUserId = user?.id;
      Future<void>.microtask(() => _loadLists(user?.id));
    }
    final initial = user == null || user.displayName.isEmpty
        ? 'U'
        : user.displayName.substring(0, 1).toUpperCase();

    return ReadInnShell(
      currentIndex: 3,
      actions: [
        IconButton(
          tooltip: 'Ajustes',
          onPressed: _openSettings,
          icon: const Icon(Icons.settings_outlined),
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
                padding: const EdgeInsets.all(18),
                child: Column(
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 35,
                          backgroundColor: ReadInnColors.softOrange,
                          child: user == null
                              ? const Icon(
                                  Icons.person_outline,
                                  size: 34,
                                  color: ReadInnColors.primaryDeep,
                                )
                              : Text(
                                  initial,
                                  style: const TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
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
                                    ? 'Inicia sesión para personalizar tu perfil.'
                                    : (user.bio.isEmpty
                                          ? 'Aún no agregas una biografía.'
                                          : user.bio),
                                style: const TextStyle(
                                  color: ReadInnColors.muted,
                                  height: 1.4,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: user == null
                            ? () => AuthDialog.show(context)
                            : _editProfile,
                        child: Text(
                          user == null ? 'Iniciar sesión' : 'Editar perfil',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 28),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Mis listas de lectura',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                ),
                IconButton(
                  tooltip: 'Nueva lista',
                  onPressed: _createList,
                  icon: const Icon(Icons.add),
                ),
              ],
            ),
            const SizedBox(height: 10),
            if (_lists.isEmpty)
              const Text(
                'Todavía no tienes listas de lectura.',
                style: TextStyle(color: ReadInnColors.muted),
              )
            else
              ..._lists.asMap().entries.map(
                (entry) => Card(
                  child: ListTile(
                    leading: const Icon(
                      Icons.collections_bookmark_outlined,
                      color: ReadInnColors.primaryDeep,
                    ),
                    title: Text(entry.value),
                    subtitle: const Text('Lista personal'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          tooltip: 'Renombrar',
                          onPressed: () => _renameList(entry.key),
                          icon: const Icon(Icons.edit_outlined),
                        ),
                        IconButton(
                          tooltip: 'Eliminar',
                          onPressed: () => _deleteList(entry.key),
                          icon: const Icon(Icons.delete_outline),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 24),
            const Text(
              'Favoritos del año',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            library.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) =>
                  Text('No pudimos cargar tus favoritos: $error'),
              data: (favorites) {
                if (favorites.isEmpty) {
                  return const Text(
                    'No tienes favoritos todavía.',
                    style: TextStyle(color: ReadInnColors.muted),
                  );
                }
                return GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: favorites.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: .68,
                  ),
                  itemBuilder: (context, index) {
                    final favorite = favorites[index];
                    final asset = index.isEven
                        ? 'assets/images/silent_street.jpg'
                        : 'assets/images/whispers_glass.jpg';
                    return Stack(
                      children: [
                        Positioned.fill(
                          child: InkWell(
                            onTap: () => context.push('/story/${favorite.id}'),
                            child: BookCover(
                              title: favorite.title,
                              author: favorite.author,
                              asset: asset,
                            ),
                          ),
                        ),
                        Positioned(
                          top: 4,
                          right: 4,
                          child: IconButton.filledTonal(
                            tooltip: 'Quitar favorito',
                            onPressed: () async {
                              await ref
                                  .read(apiServiceProvider)
                                  .toggleLibrary(
                                    favorite.id,
                                    token: auth.token,
                                  );
                              ref.invalidate(libraryProvider);
                              ref.invalidate(
                                storyEngagementProvider(favorite.id),
                              );
                            },
                            icon: const Icon(Icons.close, size: 17),
                          ),
                        ),
                      ],
                    );
                  },
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
