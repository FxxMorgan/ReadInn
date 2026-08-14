import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../models/story.dart';
import '../providers/auth_provider.dart';
import '../providers/story_providers.dart';
import '../theme/app_theme.dart';
import 'auth_dialog.dart';

class ExploreScreen extends ConsumerWidget {
  const ExploreScreen({super.key});

  static const categories = [
    'Todo',
    'Misterio',
    'Fantasía',
    'Ciencia ficción',
    'Romance',
    'Terror',
    'Drama'
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final storiesAsync = ref.watch(storiesProvider);
    final selectedCategory = ref.watch(selectedGenreProvider);
    final authState = ref.watch(authProvider);
    final authNotifier = ref.read(authProvider.notifier);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              Text(
                'ReadInn',
                style: TextStyle(
                  color: isDark ? ReadInnColors.primaryLight : ReadInnColors.primary,
                  fontWeight: FontWeight.w800,
                  fontSize: 24,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(width: 24),
              // Desktop navigation links
              if (MediaQuery.of(context).size.width > 600) ...[
                TextButton(
                  onPressed: () {},
                  child: const Text(
                    'Explorar',
                    style: TextStyle(
                      color: ReadInnColors.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: () => context.go('/library'),
                  child: const Text('Biblioteca'),
                ),
                TextButton(
                  onPressed: () => context.go('/writer/dashboard'),
                  child: const Text('Escribir'),
                ),
              ],
            ],
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {},
          ),
          Padding(
            padding: const EdgeInsets.only(right: 16.0),
            child: authState.isAuthenticated
                ? PopupMenuButton<String>(
                    onSelected: (value) {
                      if (value == 'profile') {
                        context.go('/profile');
                      } else if (value == 'writer') {
                        context.go('/writer/dashboard');
                      } else if (value == 'logout') {
                        authNotifier.logout();
                      }
                    },
                    itemBuilder: (context) => [
                      PopupMenuItem(
                        value: 'profile',
                        child: Row(
                          children: [
                            const Icon(Icons.person_outline, size: 18),
                            const SizedBox(width: 8),
                            Text(authState.user?.displayName ?? 'Mi Perfil'),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'writer',
                        child: Row(
                          children: [
                            Icon(Icons.edit_note_rounded, size: 18),
                            SizedBox(width: 8),
                            Text('Panel del Escritor'),
                          ],
                        ),
                      ),
                      const PopupMenuDivider(),
                      const PopupMenuItem(
                        value: 'logout',
                        child: Row(
                          children: [
                            Icon(Icons.logout, size: 18, color: Colors.red),
                            SizedBox(width: 8),
                            Text('Cerrar Sesión', style: TextStyle(color: Colors.red)),
                          ],
                        ),
                      ),
                    ],
                    child: CircleAvatar(
                      radius: 16,
                      backgroundColor: ReadInnColors.primary,
                      child: Text(
                        (authState.user?.displayName ?? 'U')[0].toUpperCase(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  )
                : ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ReadInnColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                    onPressed: () {
                      AuthDialog.show(context);
                    },
                    child: const Text('Iniciar Sesión'),
                  ),
          ),
        ],
      ),
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // Search & Category Filter Section
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Search Bar
                    TextField(
                      decoration: InputDecoration(
                        hintText: 'Buscar historias, autores...',
                        prefixIcon: const Icon(Icons.search, color: ReadInnColors.outline),
                        suffixIcon: ref.watch(searchQueryProvider).isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear),
                                onPressed: () {
                                  ref.read(searchQueryProvider.notifier).state = '';
                                },
                              )
                            : null,
                        filled: true,
                        fillColor: isDark
                            ? ReadInnColors.darkSurface
                            : ReadInnColors.surfaceContainerLowest,
                        contentPadding: const EdgeInsets.symmetric(vertical: 14),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(30),
                          borderSide: BorderSide(
                            color: ReadInnColors.outlineVariant.withValues(alpha: 0.3),
                          ),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(30),
                          borderSide: BorderSide(
                            color: ReadInnColors.outlineVariant.withValues(alpha: 0.3),
                          ),
                        ),
                      ),
                      onChanged: (val) {
                        ref.read(searchQueryProvider.notifier).state = val;
                      },
                    ),
                    const SizedBox(height: 16),
                    // Category Filter Pills Carousel
                    SizedBox(
                      height: 38,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: categories.length,
                        separatorBuilder: (context, index) => const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                          final category = categories[index];
                          final isSelected =
                              selectedCategory == category || (selectedCategory == 'Todos' && category == 'Todo');
                          return ChoiceChip(
                            label: Text(category),
                            selected: isSelected,
                            onSelected: (selected) {
                              ref.read(selectedGenreProvider.notifier).state =
                                  category == 'Todo' ? 'Todos' : category;
                            },
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 20),
                    // Featured Story Hero (Stitch Design)
                    _FeaturedStoryHero(),
                    const SizedBox(height: 24),
                    Text(
                      'Explorar historias',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ),
            // Story Grid / List
            storiesAsync.when(
              data: (stories) {
                if (stories.isEmpty) {
                  return const SliverFillRemaining(
                    child: Center(
                      child: Text('No se encontraron historias.'),
                    ),
                  );
                }

                return SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  sliver: SliverLayoutBuilder(
                    builder: (context, constraints) {
                      final isWide = constraints.crossAxisExtent > 650;

                      if (!isWide) {
                        return SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) => Padding(
                              padding: const EdgeInsets.only(bottom: 16.0),
                              child: _StitchStoryCard(story: stories[index]),
                            ),
                            childCount: stories.length,
                          ),
                        );
                      } else {
                        return SliverGrid(
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            mainAxisExtent: 220,
                            crossAxisSpacing: 16,
                            mainAxisSpacing: 16,
                          ),
                          delegate: SliverChildBuilderDelegate(
                            (context, index) => _StitchStoryCard(story: stories[index]),
                            childCount: stories.length,
                          ),
                        );
                      }
                    },
                  ),
                );
              },
              loading: () => const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (err, stack) => SliverFillRemaining(
                child: Center(child: Text('Error: $err')),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: MediaQuery.of(context).size.width <= 600
          ? BottomNavigationBar(
              currentIndex: 0,
              selectedItemColor: ReadInnColors.primary,
              unselectedItemColor: ReadInnColors.onSurfaceVariant,
              type: BottomNavigationBarType.fixed,
              onTap: (index) {
                if (index == 1) {
                  context.go('/library');
                } else if (index == 2) {
                  context.go('/writer/dashboard');
                } else if (index == 3) {
                  if (authState.isAuthenticated) {
                    context.go('/profile');
                  } else {
                    AuthDialog.show(context);
                  }
                }
              },
              items: const [
                BottomNavigationBarItem(
                  icon: Icon(Icons.explore),
                  label: 'Explorar',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.collections_bookmark_outlined),
                  label: 'Biblioteca',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.edit_note_rounded),
                  label: 'Escribir',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.person_outline),
                  label: 'Perfil',
                ),
              ],
            )
          : null,
    );
  }
}

class _FeaturedStoryHero extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: ReadInnColors.primaryContainer.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: ReadInnColors.outlineVariant.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          // Featured Book Cover with 3D Shadow
          Container(
            width: 90,
            height: 135,
            decoration: BoxDecoration(
              color: const Color(0xFF1F5F73),
              borderRadius: BorderRadius.circular(8),
              boxShadow: [ReadInnColors.bookShadow],
            ),
            child: Stack(
              children: [
                Positioned(
                  top: 8,
                  left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.black45,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'DESTACADO',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(8.0),
                    child: Text(
                      'La luz del faro',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          // Featured Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: ReadInnColors.primary,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        'Destacado del mes',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.star_rounded, size: 16, color: ReadInnColors.accentGold),
                    const Text('4.9', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'La luz del faro',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Por Marina Solís',
                  style: TextStyle(
                    color: ReadInnColors.primary,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ReadInnColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  ),
                  icon: const Icon(Icons.menu_book_rounded, size: 16),
                  label: const Text('Leer ahora'),
                  onPressed: () {
                    context.go('/story/story-lighthouse');
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StitchStoryCard extends StatelessWidget {
  final StorySummary story;

  const _StitchStoryCard({required this.story});

  Color _parseHexColor(String hex) {
    try {
      final clean = hex.replaceAll('#', '');
      return Color(int.parse('FF$clean', radix: 16));
    } catch (_) {
      return ReadInnColors.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final coverColor = _parseHexColor(story.coverColor);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => context.go('/story/${story.id}'),
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Book Cover with Realistic Book Shadow (Stitch .book-shadow spec)
              Container(
                width: 84,
                height: 124,
                decoration: BoxDecoration(
                  color: coverColor,
                  borderRadius: BorderRadius.circular(6),
                  boxShadow: [ReadInnColors.bookShadow],
                ),
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(6.0),
                    child: Text(
                      story.title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                      ),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              // Story Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: ReadInnColors.primaryContainer.withValues(alpha: 0.6),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            story.genre,
                            style: const TextStyle(
                              color: ReadInnColors.onPrimaryContainer,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        Row(
                          children: const [
                            Icon(Icons.star_rounded, size: 14, color: ReadInnColors.accentGold),
                            SizedBox(width: 2),
                            Text('4.8', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      story.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Por ${story.author}',
                      style: TextStyle(
                        color: isDark ? ReadInnColors.darkSubtext : ReadInnColors.onSurfaceVariant,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      story.synopsis,
                      style: TextStyle(
                        color: isDark ? ReadInnColors.darkSubtext : ReadInnColors.onSurfaceVariant,
                        fontSize: 11,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        Icon(
                          Icons.menu_book,
                          size: 12,
                          color: isDark ? ReadInnColors.darkSubtext : ReadInnColors.outline,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${story.chapterCount} cap.',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? ReadInnColors.darkSubtext : ReadInnColors.outline,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Icon(
                          Icons.chat_bubble_outline,
                          size: 12,
                          color: isDark ? ReadInnColors.darkSubtext : ReadInnColors.outline,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '42',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? ReadInnColors.darkSubtext : ReadInnColors.outline,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
