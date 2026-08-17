import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';
import '../models/story.dart';
import '../providers/auth_provider.dart';
import '../providers/story_providers.dart';
import '../theme/app_theme.dart';

class CreateStoryDialog extends ConsumerStatefulWidget {
  const CreateStoryDialog({super.key});

  static Future<StorySummary?> show(BuildContext context) {
    return showDialog<StorySummary>(
      context: context,
      builder: (context) => const Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(20)),
        ),
        child: CreateStoryDialog(),
      ),
    );
  }

  @override
  ConsumerState<CreateStoryDialog> createState() => _CreateStoryDialogState();
}

class _CreateStoryDialogState extends ConsumerState<CreateStoryDialog> {
  final _titleController = TextEditingController();
  final _synopsisController = TextEditingController();
  final _imagePicker = ImagePicker();
  final Set<String> _selectedGenres = {'Misterio'};
  final Set<String> _selectedTags = {};
  XFile? _coverFile;
  Uint8List? _coverBytes;
  String? _coverMimeType;
  String _ageRating = 'all';
  bool _isLoading = false;

  @override
  void dispose() {
    _titleController.dispose();
    _synopsisController.dispose();
    super.dispose();
  }

  Future<void> _pickCover() async {
    final picked = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1800,
      imageQuality: 90,
    );
    if (picked == null) return;
    if (!mounted) return;
    final cropped = await ImageCropper().cropImage(
      sourcePath: picked.path,
      aspectRatio: const CropAspectRatio(ratioX: 2, ratioY: 3),
      maxWidth: 1200,
      maxHeight: 1800,
      compressFormat: ImageCompressFormat.jpg,
      compressQuality: 90,
      uiSettings: [
        AndroidUiSettings(
          toolbarTitle: 'Recortar portada',
          toolbarColor: ReadInnColors.primaryDeep,
          toolbarWidgetColor: Colors.white,
          lockAspectRatio: true,
          hideBottomControls: false,
        ),
        IOSUiSettings(
          title: 'Recortar portada',
          aspectRatioLockEnabled: true,
          resetAspectRatioEnabled: false,
        ),
        WebUiSettings(
          context: context,
          presentStyle: WebPresentStyle.dialog,
          size: const CropperSize(width: 420, height: 620),
        ),
      ],
    );
    if (cropped == null) return;
    final bytes = await cropped.readAsBytes();
    if (!mounted) return;
    if (bytes.length > 5 * 1024 * 1024) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('La portada no puede pesar más de 5 MB.')),
      );
      return;
    }
    setState(() {
      _coverFile = XFile(
        cropped.path,
        name: 'cover-${DateTime.now().millisecondsSinceEpoch}.jpg',
        mimeType: 'image/jpeg',
      );
      _coverBytes = bytes;
      _coverMimeType = 'image/jpeg';
    });
  }

  Future<void> _createStory() async {
    final title = _titleController.text.trim();
    final synopsis = _synopsisController.text.trim();
    if (title.length < 2 || synopsis.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'El título necesita 2 caracteres y la sinopsis al menos 10.',
          ),
        ),
      );
      return;
    }
    if (_selectedGenres.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecciona al menos un género.')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final auth = ref.read(authProvider);
      final api = ref.read(apiServiceProvider);
      String? coverUrl;
      if (_coverFile != null && _coverBytes != null && _coverMimeType != null) {
        coverUrl = await api.uploadMedia(
          bytes: _coverBytes!,
          filename: _coverFile!.name,
          mimeType: _coverMimeType!,
          purpose: 'cover',
          token: auth.token,
        );
      }
      final createdStory = await api.createStory(
        title: title,
        synopsis: synopsis,
        genres: _selectedGenres.toList(),
        tags: _selectedTags.toList(),
        ageRating: _ageRating,
        authorName: auth.user?.displayName ?? 'Invitado',
        authorUsername: auth.user?.username ?? 'invitado',
        coverUrl: coverUrl,
        token: auth.token,
      );

      if (mounted) {
        ref.invalidate(storiesProvider);
        ref.invalidate(writerStoriesProvider);
        Navigator.pop(context, createdStory);
      }
    } catch (error) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      var message =
          'No pudimos publicar la obra. Revisa tu conexión e inténtalo otra vez.';
      if (error is DioException) {
        final payload = error.response?.data;
        if (payload is Map && payload['error'] is Map) {
          final apiMessage = payload['error']['message'];
          if (apiMessage is String && apiMessage.isNotEmpty) {
            message = apiMessage;
          }
        }
      }
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final taxonomy = ref.watch(storyTaxonomyProvider);
    return ConstrainedBox(
      constraints: BoxConstraints(
        maxWidth: 480,
        maxHeight: MediaQuery.sizeOf(context).height * 0.86,
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Crear Nueva Obra',
                  style: Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: _isLoading ? null : () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                InkWell(
                  onTap: _isLoading ? null : _pickCover,
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    width: 92,
                    height: 138,
                    clipBehavior: Clip.antiAlias,
                    decoration: BoxDecoration(
                      color: ReadInnColors.softOrange,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: ReadInnColors.border),
                    ),
                    child: _coverBytes == null
                        ? const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.add_photo_alternate_outlined,
                                size: 32,
                              ),
                              SizedBox(height: 7),
                              Text(
                                'Portada',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          )
                        : Image.memory(_coverBytes!, fit: BoxFit.cover),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Imagen de portada',
                        style: TextStyle(fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 5),
                      const Text(
                        'Recorte vertical 2:3, hasta 5 MB.',
                        style: TextStyle(
                          color: ReadInnColors.muted,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 9),
                      Wrap(
                        spacing: 6,
                        children: [
                          OutlinedButton.icon(
                            onPressed: _isLoading ? null : _pickCover,
                            icon: const Icon(Icons.photo_library_outlined),
                            label: Text(
                              _coverFile == null ? 'Elegir' : 'Cambiar',
                            ),
                          ),
                          if (_coverFile != null)
                            IconButton(
                              tooltip: 'Quitar portada',
                              onPressed: _isLoading
                                  ? null
                                  : () => setState(() {
                                      _coverFile = null;
                                      _coverBytes = null;
                                      _coverMimeType = null;
                                    }),
                              icon: const Icon(Icons.delete_outline),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _titleController,
              enabled: !_isLoading,
              decoration: const InputDecoration(
                labelText: 'Título de la obra',
                hintText: 'Ej: El misterio de la marisma',
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _synopsisController,
              enabled: !_isLoading,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Sinopsis / Resumen',
                hintText: 'Describe brevemente de qué trata tu historia...',
              ),
            ),
            const SizedBox(height: 14),
            taxonomy.when(
              loading: () => const LinearProgressIndicator(),
              error: (_, _) => const Text('No pudimos cargar las categorías.'),
              data: (options) => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Géneros (hasta 5)',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 7),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: options.genres
                        .map(
                          (genre) => FilterChip(
                            label: Text(genre),
                            selected: _selectedGenres.contains(genre),
                            onSelected: _isLoading
                                ? null
                                : (selected) {
                                    if (selected &&
                                        _selectedGenres.length >= 5) {
                                      return;
                                    }
                                    setState(
                                      () => selected
                                          ? _selectedGenres.add(genre)
                                          : _selectedGenres.remove(genre),
                                    );
                                  },
                          ),
                        )
                        .toList(),
                  ),
                  const SizedBox(height: 8),
                  ...options.tagGroups.map(
                    (group) => ExpansionTile(
                      tilePadding: EdgeInsets.zero,
                      title: Text(group.label),
                      children: [
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: group.tags
                              .map(
                                (tag) => FilterChip(
                                  label: Text(tag),
                                  selected: _selectedTags.contains(tag),
                                  onSelected: _isLoading
                                      ? null
                                      : (selected) {
                                          if (selected &&
                                              _selectedTags.length >= 20) {
                                            return;
                                          }
                                          setState(
                                            () => selected
                                                ? _selectedTags.add(tag)
                                                : _selectedTags.remove(tag),
                                          );
                                        },
                                ),
                              )
                              .toList(),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            taxonomy.valueOrNull == null
                ? const SizedBox.shrink()
                : DropdownButtonFormField<String>(
                    initialValue: _ageRating,
                    decoration: const InputDecoration(
                      labelText: 'Clasificacion por edad',
                    ),
                    items: taxonomy.valueOrNull!.ageRatings
                        .map(
                          (rating) => DropdownMenuItem(
                            value: rating['value'],
                            child: Text(rating['label'] ?? rating['value']!),
                          ),
                        )
                        .toList(),
                    onChanged: _isLoading
                        ? null
                        : (value) =>
                              setState(() => _ageRating = value ?? 'all'),
                  ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: ReadInnColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                ),
                onPressed: _isLoading ? null : _createStory,
                child: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'Publicar Obra',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
