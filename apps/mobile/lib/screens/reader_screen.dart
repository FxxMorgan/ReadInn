import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../providers/story_providers.dart';
import '../theme/app_theme.dart';

class ReaderScreen extends ConsumerWidget {
  final String storyId;
  final String chapterId;

  const ReaderScreen({
    super.key,
    required this.storyId,
    required this.chapterId,
  });

  void _openSettings(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (_) => const _ReaderSettingsSheet(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final chapterAsync = ref.watch(
      chapterDetailProvider((storyId: storyId, chapterId: chapterId)),
    );
    final commentsAsync = ref.watch(
      chapterCommentsProvider((storyId: storyId, chapterId: chapterId)),
    );
    final auth = ref.watch(authProvider);
    final settings = ref.watch(readerSettingsProvider);
    final background = AppTheme.getReaderBgColor(settings.themeMode);
    final textColor = AppTheme.getReaderTextColor(settings.themeMode);
    final subtextColor = AppTheme.getReaderSubtextColor(settings.themeMode);

    return Scaffold(
      backgroundColor: background,
      appBar: AppBar(
        backgroundColor: background,
        foregroundColor: textColor,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/story/$storyId'),
        ),
        title: const Text(
          'Lectura',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
        actions: [
          IconButton(
            tooltip: 'Ajustes de lectura',
            icon: const Icon(Icons.text_fields_rounded),
            onPressed: () => _openSettings(context),
          ),
          IconButton(
            tooltip: 'Más opciones',
            icon: const Icon(Icons.more_horiz_rounded),
            onPressed: () =>
                showMenu<String>(
                  context: context,
                  position: const RelativeRect.fromLTRB(200, 70, 12, 0),
                  items: const [
                    PopupMenuItem(
                      value: 'mark',
                      child: Text('Marcar como leido'),
                    ),
                    PopupMenuItem(
                      value: 'share',
                      child: Text('Compartir capitulo'),
                    ),
                  ],
                ).then((value) {
                  if (value != null && context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          value == 'mark'
                              ? 'Capitulo marcado como leido.'
                              : 'Enlace listo para compartir.',
                        ),
                      ),
                    );
                  }
                }),
          ),
        ],
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(3),
          child: LinearProgressIndicator(
            value: 0.42,
            minHeight: 3,
            backgroundColor: Colors.transparent,
            color: ReadInnColors.primary,
          ),
        ),
      ),
      body: chapterAsync.when(
        loading: () =>
            Center(child: CircularProgressIndicator(color: textColor)),
        error: (error, _) => Center(
          child: Text(
            'No pudimos cargar el capítulo: $error',
            style: TextStyle(color: textColor),
          ),
        ),
        data: (chapter) => SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 28, 20, 42),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 720),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    chapter.storyTitle.toUpperCase(),
                    style: TextStyle(
                      color: subtextColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Capítulo ${chapter.position}:\n${chapter.title}',
                    style: TextStyle(
                      color: textColor,
                      fontSize: 30,
                      height: 1.12,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    '14 min de lectura',
                    style: TextStyle(color: subtextColor, fontSize: 12),
                  ),
                  const SizedBox(height: 30),
                  ...chapter.content.map(
                    (paragraph) => Padding(
                      padding: const EdgeInsets.only(bottom: 22),
                      child: Text(
                        paragraph,
                        style: AppTheme.getReaderTextStyle(
                          fontFamily: settings.fontFamily,
                          fontSize: settings.fontSize,
                          color: textColor,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Divider(color: subtextColor.withValues(alpha: 0.25)),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () async {
                            final liked = await ref
                                .read(apiServiceProvider)
                                .toggleStoryLike(storyId, token: auth.token);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    liked
                                        ? 'Te gusta esta obra.'
                                        : 'Quitaste tu me gusta.',
                                  ),
                                ),
                              );
                            }
                          },
                          icon: const Icon(Icons.favorite_border_rounded),
                          label: const Text('Me gusta'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () async {
                            final saved = await ref
                                .read(apiServiceProvider)
                                .toggleLibrary(storyId, token: auth.token);
                            ref.invalidate(libraryProvider);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    saved
                                        ? 'Guardado en tu biblioteca.'
                                        : 'Quitado de tu biblioteca.',
                                  ),
                                ),
                              );
                            }
                          },
                          icon: const Icon(Icons.bookmark_border_rounded),
                          label: const Text('Guardar'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 34),
                  Text(
                    'Comentarios',
                    style: TextStyle(
                      color: textColor,
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Comparte una idea sobre este capítulo.',
                    style: TextStyle(color: subtextColor, fontSize: 13),
                  ),
                  const SizedBox(height: 16),
                  _CommentComposer(
                    textColor: textColor,
                    subtextColor: subtextColor,
                    onSubmit: (body) async {
                      await ref
                          .read(apiServiceProvider)
                          .addComment(
                            storyId: storyId,
                            chapterId: chapterId,
                            body: body,
                            authorName: auth.user?.displayName ?? 'Invitado',
                            token: auth.token,
                          );
                      ref.invalidate(
                        chapterCommentsProvider((
                          storyId: storyId,
                          chapterId: chapterId,
                        )),
                      );
                    },
                  ),
                  const SizedBox(height: 18),
                  commentsAsync.when(
                    loading: () => const LinearProgressIndicator(),
                    error: (error, _) => Text(
                      'No pudimos cargar los comentarios: $error',
                      style: TextStyle(color: subtextColor),
                    ),
                    data: (comments) => Column(
                      children: comments
                          .map(
                            (comment) => _Comment(
                              name: comment.authorName,
                              text: comment.body,
                              textColor: textColor,
                              subtextColor: subtextColor,
                            ),
                          )
                          .toList(),
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: () => context.go('/story/$storyId'),
                      icon: const Icon(Icons.arrow_forward_rounded),
                      label: const Text('Siguiente capítulo'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.small(
        tooltip: 'Ajustes de lectura',
        backgroundColor: ReadInnColors.primary,
        foregroundColor: ReadInnColors.ink,
        onPressed: () => _openSettings(context),
        child: const Icon(Icons.tune_rounded),
      ),
    );
  }
}

class _CommentComposer extends StatefulWidget {
  final Color textColor;
  final Color subtextColor;
  final Future<void> Function(String body) onSubmit;

  const _CommentComposer({
    required this.textColor,
    required this.subtextColor,
    required this.onSubmit,
  });

  @override
  State<_CommentComposer> createState() => _CommentComposerState();
}

class _CommentComposerState extends State<_CommentComposer> {
  final _controller = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final body = _controller.text.trim();
    if (body.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await widget.onSubmit(body);
      _controller.clear();
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: widget.textColor.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: widget.subtextColor.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: ReadInnColors.softOrange,
            child: Icon(Icons.person, size: 17, color: widget.textColor),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: _controller,
              textInputAction: TextInputAction.send,
              minLines: 1,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Escribe un comentario...',
                hintStyle: TextStyle(color: widget.subtextColor),
                border: InputBorder.none,
                isDense: true,
              ),
              onSubmitted: (_) => _send(),
            ),
          ),
          IconButton(
            tooltip: 'Publicar comentario',
            onPressed: _sending ? null : _send,
            icon: _sending
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(
                    Icons.send_rounded,
                    color: ReadInnColors.primaryDeep,
                  ),
          ),
        ],
      ),
    );
  }
}

class _Comment extends StatelessWidget {
  final String name;
  final String text;
  final Color textColor;
  final Color subtextColor;

  const _Comment({
    required this.name,
    required this.text,
    required this.textColor,
    required this.subtextColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: ReadInnColors.indigo.withValues(alpha: 0.16),
            child: Text(
              name.substring(0, 1),
              style: const TextStyle(
                color: ReadInnColors.indigo,
                fontWeight: FontWeight.w800,
                fontSize: 12,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: TextStyle(
                    color: textColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  text,
                  style: TextStyle(
                    color: subtextColor,
                    height: 1.45,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ReaderSettingsSheet extends ConsumerWidget {
  const _ReaderSettingsSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(readerSettingsProvider);
    final notifier = ref.read(readerSettingsProvider.notifier);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Ajustes de lectura',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 20),
            const Text('Tamaño', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Row(
              children: [
                IconButton.outlined(
                  onPressed: () => notifier.setFontSize(settings.fontSize - 1),
                  icon: const Icon(Icons.remove),
                ),
                Expanded(
                  child: Slider(
                    value: settings.fontSize,
                    min: 14,
                    max: 28,
                    divisions: 14,
                    label: settings.fontSize.round().toString(),
                    onChanged: notifier.setFontSize,
                  ),
                ),
                IconButton.outlined(
                  onPressed: () => notifier.setFontSize(settings.fontSize + 1),
                  icon: const Icon(Icons.add),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text(
              'Tipografía',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            SegmentedButton<ReaderFontFamily>(
              segments: const [
                ButtonSegment(
                  value: ReaderFontFamily.serif,
                  label: Text('Serif'),
                ),
                ButtonSegment(
                  value: ReaderFontFamily.sans,
                  label: Text('Sans'),
                ),
                ButtonSegment(
                  value: ReaderFontFamily.mono,
                  label: Text('Mono'),
                ),
              ],
              selected: {settings.fontFamily},
              onSelectionChanged: (selection) =>
                  notifier.setFontFamily(selection.first),
            ),
            const SizedBox(height: 20),
            const Text('Tema', style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              children: ReaderThemeMode.values.map((mode) {
                final selected = settings.themeMode == mode;
                return InkWell(
                  onTap: () => notifier.setThemeMode(mode),
                  borderRadius: BorderRadius.circular(24),
                  child: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: AppTheme.getReaderBgColor(mode),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: selected
                            ? ReadInnColors.primaryDeep
                            : ReadInnColors.border,
                        width: selected ? 3 : 1,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}
