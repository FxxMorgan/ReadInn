import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../models/story.dart';
import '../providers/auth_provider.dart';
import '../providers/story_providers.dart';
import '../theme/app_theme.dart';
import '../widgets/readinn_widgets.dart';
import 'auth_dialog.dart';

class ExploreScreen extends ConsumerWidget {
  const ExploreScreen({super.key});

  static const categories = [
    'Todos',
    'Misterio',
    'Fantasía',
    'Ciencia ficción',
    'Romance',
    'Terror',
    'Drama',
  ];

  Color _coverColor(String hex) {
    try {
      return Color(int.parse('FF${hex.replaceAll('#', '')}', radix: 16));
    } catch (_) {
      return ReadInnColors.indigo;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final storiesAsync = ref.watch(storiesProvider);
    final selectedGenre = ref.watch(selectedGenreProvider);
    final auth = ref.watch(authProvider);

    return ReadInnShell(
      currentIndex: 0,
      actions: [
        IconButton(
          tooltip: 'Buscar',
          onPressed: () => FocusScope.of(context).requestFocus(FocusNode()),
          icon: const Icon(Icons.search_rounded),
        ),
        Padding(
          padding: const EdgeInsets.only(right: 12),
          child: auth.isAuthenticated
              ? CircleAvatar(
                  radius: 16,
                  backgroundColor: ReadInnColors.indigo,
                  child: Text(
                    (auth.user?.displayName ?? 'M').substring(0, 1),
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
                onChanged: (value) =>
                    ref.read(searchQueryProvider.notifier).state = value,
                decoration: const InputDecoration(
                  hintText: 'Buscar historias, autores...',
                  prefixIcon: Icon(Icons.search_rounded),
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                height: 38,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: categories.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(width: 8),
                  itemBuilder: (_, index) {
                    final category = categories[index];
                    final selected = selectedGenre == category;
                    return ChoiceChip(
                      label: Text(category),
                      selected: selected,
                      selectedColor: ReadInnColors.indigo,
                      labelStyle: TextStyle(
                        color: selected ? Colors.white : ReadInnColors.ink,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                      onSelected: (_) =>
                          ref.read(selectedGenreProvider.notifier).state =
                              category,
                    );
                  },
                ),
              ),
              const SizedBox(height: 28),
              _EditorPick(onTap: () => context.push('/story/story-lighthouse')),
              const SizedBox(height: 30),
              SectionHeader(
                title: 'Tendencias',
                actionLabel: 'Ver todo',
                onAction: () =>
                    FocusScope.of(context).requestFocus(FocusNode()),
              ),
              const SizedBox(height: 14),
              storiesAsync.when(
                loading: () => const SizedBox(
                  height: 220,
                  child: Center(child: CircularProgressIndicator()),
                ),
                error: (error, _) =>
                    Text('No pudimos cargar las historias: $error'),
                data: (stories) =>
                    _StoryGrid(stories: stories, coverColor: _coverColor),
              ),
              const SizedBox(height: 28),
              _QuoteCard(),
            ],
          ),
        ),
      ),
    );
  }
}

class _EditorPick extends StatelessWidget {
  final VoidCallback onTap;

  const _EditorPick({required this.onTap});

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
                    'SELECCIÓN DEL EDITOR',
                    style: TextStyle(
                      color: ReadInnColors.primaryDeep,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'La luz del faro',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Una cartógrafa vuelve a la costa y encuentra un mapa que no debería existir.',
                    style: TextStyle(color: ReadInnColors.muted, height: 1.45),
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
            const BookCover(
              title: 'La luz\ndel faro',
              asset: 'assets/images/silver_feather.jpg',
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

  const _StoryGrid({required this.stories, required this.coverColor});

  @override
  Widget build(BuildContext context) {
    final visible = stories.isEmpty ? <StorySummary>[] : stories;
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
                      asset: asset,
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
                      const Icon(
                        Icons.star_rounded,
                        size: 14,
                        color: ReadInnColors.primary,
                      ),
                      const SizedBox(width: 2),
                      const Text(
                        '4.8',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const Spacer(),
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

class _QuoteCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: ReadInnColors.softIndigo,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.format_quote_rounded, color: ReadInnColors.indigo),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Las mejores historias no piden permiso: encuentran una puerta y la abren.',
              style: TextStyle(
                color: ReadInnColors.ink,
                height: 1.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
