import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../models/story.dart';
import '../providers/auth_provider.dart';
import '../providers/story_providers.dart';
import '../theme/app_theme.dart';
import '../widgets/readinn_widgets.dart';
import 'auth_dialog.dart';

class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  final _searchFocusNode = FocusNode();
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchFocusNode.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Color _coverColor(String hex) {
    try {
      return Color(int.parse('FF${hex.replaceAll('#', '')}', radix: 16));
    } catch (_) {
      return ReadInnColors.indigo;
    }
  }

  Future<void> _openFilters() async {
    final taxonomy = await ref.read(storyTaxonomyProvider.future);
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => Consumer(
        builder: (context, ref, _) {
          final selectedGenres = ref.watch(selectedGenresProvider);
          final selectedTags = ref.watch(selectedTagsProvider);
          final sort = ref.watch(storySortProvider);
          final mature = ref.watch(matureFilterProvider);
          final minChapters = ref.watch(minChaptersProvider);
          final minRating = ref.watch(minRatingProvider);
          void toggleGenre(String value) {
            final next = [...selectedGenres];
            next.contains(value) ? next.remove(value) : next.add(value);
            ref.read(selectedGenresProvider.notifier).state = next;
          }

          void toggleTag(String value) {
            final next = [...selectedTags];
            next.contains(value) ? next.remove(value) : next.add(value);
            ref.read(selectedTagsProvider.notifier).state = next;
          }

          return SafeArea(
            child: SizedBox(
              height: MediaQuery.sizeOf(context).height * .82,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(18, 6, 18, 28),
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Filtros avanzados',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          ref.read(selectedGenresProvider.notifier).state = [];
                          ref.read(selectedTagsProvider.notifier).state = [];
                          ref.read(storySortProvider.notifier).state = 'recent';
                          ref.read(matureFilterProvider.notifier).state =
                              'exclude';
                          ref.read(minChaptersProvider.notifier).state = 0;
                          ref.read(minRatingProvider.notifier).state = 0;
                        },
                        child: const Text('Limpiar'),
                      ),
                    ],
                  ),
                  DropdownButtonFormField<String>(
                    initialValue: sort,
                    decoration: const InputDecoration(labelText: 'Ordenar'),
                    items: taxonomy.sortOptions
                        .map(
                          (item) => DropdownMenuItem(
                            value: item['value'],
                            child: Text(item['label'] ?? item['value'] ?? ''),
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      if (value != null) {
                        ref.read(storySortProvider.notifier).state = value;
                      }
                    },
                  ),
                  const SizedBox(height: 10),
                  DropdownButtonFormField<String>(
                    initialValue: mature,
                    decoration: const InputDecoration(labelText: 'Contenido'),
                    items: const [
                      DropdownMenuItem(
                        value: 'exclude',
                        child: Text('Sin contenido adulto'),
                      ),
                      DropdownMenuItem(value: 'include', child: Text('Todo')),
                      DropdownMenuItem(
                        value: 'only',
                        child: Text('Solo adulto'),
                      ),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        ref.read(matureFilterProvider.notifier).state = value;
                      }
                    },
                  ),
                  const SizedBox(height: 16),
                  Text('Mínimo de capítulos: $minChapters'),
                  Slider(
                    value: minChapters.toDouble(),
                    min: 0,
                    max: 100,
                    divisions: 20,
                    onChanged: (value) =>
                        ref.read(minChaptersProvider.notifier).state = value
                            .round(),
                  ),
                  Text(
                    'Valoración mínima: ${minRating == 0 ? 'Cualquiera' : '$minRating+'}',
                  ),
                  Slider(
                    value: minRating,
                    min: 0,
                    max: 5,
                    divisions: 10,
                    onChanged: (value) =>
                        ref.read(minRatingProvider.notifier).state = value,
                  ),
                  Text(
                    'Géneros',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: taxonomy.genres
                        .map(
                          (genre) => FilterChip(
                            label: Text(genre),
                            selected: selectedGenres.contains(genre),
                            onSelected: (_) => toggleGenre(genre),
                          ),
                        )
                        .toList(),
                  ),
                  ...taxonomy.tagGroups.map(
                    (group) => ExpansionTile(
                      title: Text(group.label),
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: Wrap(
                            spacing: 6,
                            runSpacing: 4,
                            children: group.tags
                                .map(
                                  (tag) => FilterChip(
                                    label: Text(tag),
                                    selected: selectedTags.contains(tag),
                                    onSelected: (_) => toggleTag(tag),
                                  ),
                                )
                                .toList(),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: () => Navigator.pop(sheetContext),
                    child: const Text('Aplicar filtros'),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ref = this.ref;
    final storiesAsync = ref.watch(storiesProvider);
    final searchQuery = ref.watch(searchQueryProvider);
    final showAll = ref.watch(showAllStoriesProvider);
    final auth = ref.watch(authProvider);

    return PopScope(
      canPop: searchQuery.trim().isEmpty,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop || searchQuery.trim().isEmpty) return;
        _searchController.clear();
        _searchFocusNode.unfocus();
        ref.read(searchQueryProvider.notifier).state = '';
      },
      child: ReadInnShell(
        currentIndex: 0,
        actions: [
          IconButton(
            tooltip: 'Buscar',
            onPressed: () => _searchFocusNode.requestFocus(),
            icon: const Icon(Icons.search_rounded),
          ),
          IconButton(
            tooltip: 'Filtros avanzados',
            onPressed: _openFilters,
            icon: const Icon(Icons.tune_rounded),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: auth.isAuthenticated
                ? CircleAvatar(
                    radius: 16,
                    backgroundColor: ReadInnColors.primaryDeep,
                    child: Text(
                      (auth.user?.displayName ?? 'U').substring(0, 1),
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  )
                : IconButton(
                    tooltip: 'Iniciar sesión',
                    icon: const Icon(Icons.person_outline),
                    onPressed: () => AuthDialog.show(context),
                  ),
          ),
        ],
        child: RefreshIndicator(
          onRefresh: () async => ref.invalidate(storiesProvider),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Historias para perderse',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Descubre voces nuevas y vuelve a tus mundos favoritos.',
                  style: TextStyle(color: ReadInnColors.muted),
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: _searchController,
                  focusNode: _searchFocusNode,
                  onChanged: (value) =>
                      ref.read(searchQueryProvider.notifier).state = value,
                  decoration: InputDecoration(
                    hintText: 'Buscar historias, autores...',
                    prefixIcon: const Icon(Icons.search_rounded),
                    suffixIcon: searchQuery.isEmpty
                        ? null
                        : IconButton(
                            tooltip: 'Limpiar búsqueda',
                            onPressed: () {
                              _searchController.clear();
                              ref.read(searchQueryProvider.notifier).state = '';
                            },
                            icon: const Icon(Icons.close_rounded),
                          ),
                  ),
                ),
                const SizedBox(height: 28),
                ref
                    .watch(featuredStoryProvider)
                    .when(
                      data: (story) => story == null
                          ? const SizedBox.shrink()
                          : _FeaturedStory(
                              story: story,
                              onTap: () => context.push('/story/${story.id}'),
                            ),
                      loading: () => const SizedBox(
                        height: 120,
                        child: Center(child: CircularProgressIndicator()),
                      ),
                      error: (_, _) => const SizedBox.shrink(),
                    ),
                const SizedBox(height: 30),
                SectionHeader(
                  title: 'Tendencias',
                  actionLabel: showAll ? 'Ver menos' : 'Ver todo',
                  onAction: () =>
                      ref.read(showAllStoriesProvider.notifier).state =
                          !showAll,
                ),
                const SizedBox(height: 14),
                storiesAsync.when(
                  loading: () => const SizedBox(
                    height: 220,
                    child: Center(child: CircularProgressIndicator()),
                  ),
                  error: (error, _) =>
                      Text('No pudimos cargar las historias: $error'),
                  data: (stories) => _StoryGrid(
                    stories: stories,
                    coverColor: _coverColor,
                    showAll: showAll,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _FeaturedStory extends StatelessWidget {
  final StorySummary story;
  final VoidCallback onTap;

  const _FeaturedStory({required this.story, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'DESTACADA DE LAS ÚLTIMAS 24 HORAS',
                    style: TextStyle(
                      color: ReadInnColors.primaryDeep,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    story.title,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    story.synopsis,
                    style: const TextStyle(
                      color: ReadInnColors.muted,
                      height: 1.45,
                    ),
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: onTap,
                    icon: const Icon(Icons.menu_book_rounded, size: 18),
                    label: const Text('Empezar a leer'),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 14),
            BookCover(
              title: story.title,
              author: story.author,
              asset: story.coverColor.startsWith('http')
                  ? null
                  : 'assets/images/silver_feather.jpg',
              imageUrl: story.coverColor,
              color: ReadInnColors.indigo,
              width: 86,
              height: 128,
            ),
          ],
        ),
      ),
    );
  }
}

class _StoryGrid extends StatelessWidget {
  final List<StorySummary> stories;
  final Color Function(String) coverColor;
  final bool showAll;

  const _StoryGrid({
    required this.stories,
    required this.coverColor,
    required this.showAll,
  });

  @override
  Widget build(BuildContext context) {
    if (stories.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 36),
        child: Center(
          child: Text(
            'No hay tendencias disponibles. Conéctate para descubrir nuevas obras o abre tus descargas desde Biblioteca.',
            textAlign: TextAlign.center,
            style: TextStyle(color: ReadInnColors.muted, height: 1.45),
          ),
        ),
      );
    }
    final visible = showAll ? stories : stories.take(4).toList();
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth > 700
            ? 4
            : constraints.maxWidth > 430
            ? 3
            : 2;
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: visible.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            crossAxisSpacing: 12,
            mainAxisSpacing: 18,
            childAspectRatio: 0.62,
          ),
          itemBuilder: (context, index) {
            final story = visible[index];
            final asset = index % 4 == 0
                ? 'assets/images/silent_street.jpg'
                : index % 4 == 1
                ? 'assets/images/whispers_glass.jpg'
                : index % 4 == 2
                ? 'assets/images/project_horizon.jpg'
                : 'assets/images/house_ash.jpg';
            return InkWell(
              borderRadius: BorderRadius.circular(8),
              onTap: () => context.push('/story/${story.id}'),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: BookCover(
                      title: story.title,
                      author: story.author,
                      asset: story.coverColor.startsWith('http') ? null : asset,
                      imageUrl: story.coverColor,
                      color: coverColor(story.coverColor),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    story.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    story.author,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: ReadInnColors.muted,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(
                        story.averageRating > 0
                            ? Icons.star_rounded
                            : Icons.star_border_rounded,
                        size: 14,
                        color: ReadInnColors.primary,
                      ),
                      const SizedBox(width: 2),
                      Expanded(
                        child: Text(
                          story.averageRating > 0
                              ? story.averageRating.toStringAsFixed(1)
                              : 'Sin calificar',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${story.chapterCount} cap.',
                        style: const TextStyle(
                          color: ReadInnColors.muted,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
