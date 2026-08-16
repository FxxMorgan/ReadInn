import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models/story.dart';
import '../providers/auth_provider.dart';
import '../providers/story_providers.dart';
import '../theme/app_theme.dart';

class ManageStoryScreen extends ConsumerWidget {
  final String storyId;

  const ManageStoryScreen({super.key, required this.storyId});

  Future<void> _publishStory(
    BuildContext context,
    WidgetRef ref,
    StoryDetail story,
  ) async {
    final token = ref.read(authProvider).token;
    if (token == null) return;

    try {
      await ref.read(apiServiceProvider).publishStory(story.id, token: token);
      ref.invalidate(writerStoryDetailProvider(story.id));
      ref.invalidate(writerStoriesProvider);
      ref.invalidate(storiesProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Obra publicada correctamente.')),
      );
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No pudimos publicar la obra.')),
      );
    }
  }

  Future<void> _createChapter(
    BuildContext context,
    WidgetRef ref,
    StoryDetail story,
  ) async {
    final result = await showDialog<_ChapterDraft>(
      context: context,
      builder: (context) => const _CreateChapterDialog(),
    );
    if (result == null || !context.mounted) return;

    final token = ref.read(authProvider).token;
    try {
      final chapter = await ref
          .read(apiServiceProvider)
          .createChapter(
            storyId: story.id,
            title: result.title,
            content: result.paragraphs,
            token: token,
          );
      ref.invalidate(writerStoryDetailProvider(story.id));
      ref.invalidate(writerStoriesProvider);
      ref.invalidate(dashboardMetricsProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Capítulo ${chapter.position} publicado.')),
      );
    } catch (_) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No pudimos publicar el capítulo.')),
      );
    }
  }

  Future<void> _deleteChapter(
    BuildContext context,
    WidgetRef ref,
    StoryDetail story,
    ChapterSummary chapter,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Borrar capitulo'),
        content: Text('Se borrara "${chapter.title}" de forma permanente.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Borrar'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    final token = ref.read(authProvider).token;
    if (token == null) return;
    try {
      await ref
          .read(apiServiceProvider)
          .deleteChapter(
            storyId: story.id,
            chapterId: chapter.id,
            token: token,
          );
      ref.invalidate(writerStoryDetailProvider(story.id));
      ref.invalidate(writerStoriesProvider);
      ref.invalidate(storyDetailProvider(story.id));
      ref.invalidate(dashboardMetricsProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Capitulo borrado.')));
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No pudimos borrar el capitulo.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final story = ref.watch(writerStoryDetailProvider(storyId));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Administrar obra'),
        actions: [
          IconButton(
            tooltip: 'Ver ficha pública',
            onPressed: () => context.push('/story/$storyId'),
            icon: const Icon(Icons.visibility_outlined),
          ),
        ],
      ),
      body: story.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _LoadError(
          onRetry: () => ref.invalidate(writerStoryDetailProvider(storyId)),
        ),
        data: (data) => ListView(
          padding: const EdgeInsets.fromLTRB(16, 18, 16, 112),
          children: [
            Text(
              data.title,
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            Text(
              '${data.genre} · ${data.chapters.length} capítulos',
              style: const TextStyle(color: ReadInnColors.muted),
            ),
            if (data.status == 'draft') ...[
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: () => _publishStory(context, ref, data),
                icon: const Icon(Icons.publish_outlined),
                label: const Text('Publicar obra'),
              ),
            ],
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Capítulos',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                FilledButton.icon(
                  onPressed: () => _createChapter(context, ref, data),
                  icon: const Icon(Icons.add),
                  label: const Text('Nuevo capítulo'),
                ),
              ],
            ),
            const SizedBox(height: 14),
            if (data.chapters.isEmpty)
              const _EmptyChapters()
            else
              ...data.chapters.map(
                (chapter) => _ChapterRow(
                  story: data,
                  chapter: chapter,
                  onDelete: () => _deleteChapter(context, ref, data, chapter),
                ),
              ),
          ],
        ),
      ),
      floatingActionButton: story.valueOrNull == null
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _createChapter(context, ref, story.valueOrNull!),
              icon: const Icon(Icons.edit_note_rounded),
              label: const Text('Escribir'),
            ),
    );
  }
}

class _ChapterRow extends StatelessWidget {
  final StoryDetail story;
  final ChapterSummary chapter;
  final VoidCallback onDelete;

  const _ChapterRow({
    required this.story,
    required this.chapter,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 4),
          leading: CircleAvatar(
            backgroundColor: ReadInnColors.softOrange,
            foregroundColor: ReadInnColors.primaryDeep,
            child: Text('${chapter.position}'),
          ),
          title: Text(
            chapter.title,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          subtitle: const Text('Publicado'),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                tooltip: 'Borrar capitulo',
                onPressed: onDelete,
                icon: const Icon(Icons.delete_outline),
              ),
              const Icon(Icons.chevron_right_rounded),
            ],
          ),
          onTap: () => context.push('/story/${story.id}/read/${chapter.id}'),
        ),
        const Divider(),
      ],
    );
  }
}

class _EmptyChapters extends StatelessWidget {
  const _EmptyChapters();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 12),
      child: Column(
        children: [
          const Icon(
            Icons.menu_book_outlined,
            size: 42,
            color: ReadInnColors.primaryDeep,
          ),
          const SizedBox(height: 12),
          Text(
            'Esta obra todavía no tiene capítulos',
            textAlign: TextAlign.center,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          const Text(
            'Crea el primero para que tus lectores puedan comenzar.',
            textAlign: TextAlign.center,
            style: TextStyle(color: ReadInnColors.muted),
          ),
        ],
      ),
    );
  }
}

class _LoadError extends StatelessWidget {
  final VoidCallback onRetry;

  const _LoadError({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('No pudimos cargar esta obra.'),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Reintentar'),
          ),
        ],
      ),
    );
  }
}

class _ChapterDraft {
  final String title;
  final List<String> paragraphs;

  const _ChapterDraft({required this.title, required this.paragraphs});
}

class _CreateChapterDialog extends StatefulWidget {
  const _CreateChapterDialog();

  @override
  State<_CreateChapterDialog> createState() => _CreateChapterDialogState();
}

class _CreateChapterDialogState extends State<_CreateChapterDialog> {
  final _titleController = TextEditingController();
  final _contentController = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  void _submit() {
    final title = _titleController.text.trim();
    final content = _contentController.text.trim();
    if (title.length < 2 || content.isEmpty) {
      setState(() => _error = 'Escribe un título y el contenido del capítulo.');
      return;
    }
    final paragraphs = content
        .split(RegExp(r'\n\s*\n'))
        .map((paragraph) => paragraph.trim())
        .where((paragraph) => paragraph.isNotEmpty)
        .toList();
    Navigator.of(
      context,
    ).pop(_ChapterDraft(title: title, paragraphs: paragraphs));
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Nuevo capítulo'),
      content: SizedBox(
        width: 520,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _titleController,
                autofocus: true,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(labelText: 'Título'),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _contentController,
                minLines: 10,
                maxLines: 16,
                keyboardType: TextInputType.multiline,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  labelText: 'Contenido',
                  alignLabelWithHint: true,
                  hintText: 'Separa los párrafos con una línea en blanco.',
                  errorText: _error,
                ),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancelar'),
        ),
        FilledButton.icon(
          onPressed: _submit,
          icon: const Icon(Icons.publish_outlined),
          label: const Text('Publicar'),
        ),
      ],
    );
  }
}
