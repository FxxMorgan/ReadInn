import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/story.dart';
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
  String _selectedGenre = 'Misterio';
  bool _isMature = false;
  String _coverColor = '#855300';
  bool _isLoading = false;

  static const genres = [
    'Misterio',
    'Ciencia ficción',
    'Fantasía',
    'Romance',
    'Terror',
    'Drama'
  ];

  static const coverColors = [
    '#855300',
    '#1F5F73',
    '#7F4F24',
    '#4F46E5',
    '#059669',
    '#DC2626'
  ];

  @override
  void dispose() {
    _titleController.dispose();
    _synopsisController.dispose();
    super.dispose();
  }

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
    return Container(
      width: 480,
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
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _titleController,
            decoration: const InputDecoration(
              labelText: 'Título de la obra',
              hintText: 'Ej: El misterio de la marisma',
            ),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _synopsisController,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Sinopsis / Resumen',
              hintText: 'Describe brevemente de qué trata tu historia...',
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _selectedGenre,
                  decoration: const InputDecoration(labelText: 'Género'),
                  items: genres
                      .map((g) => DropdownMenuItem(value: g, child: Text(g)))
                      .toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedGenre = val);
                  },
                ),
              ),
              const SizedBox(width: 16),
              Row(
                children: [
                  Checkbox(
                    value: _isMature,
                    activeColor: ReadInnColors.primary,
                    onChanged: (val) {
                      setState(() => _isMature = val ?? false);
                    },
                  ),
                  const Text('Contenido +18', style: TextStyle(fontSize: 13)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            'Color de portada',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: ReadInnColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: coverColors.map((colorHex) {
              final isSelected = _coverColor == colorHex;
              final color = _parseHexColor(colorHex);
              return GestureDetector(
                onTap: () => setState(() => _coverColor = colorHex),
                child: Container(
                  margin: const EdgeInsets.only(right: 10),
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isSelected ? ReadInnColors.primary : Colors.transparent,
                      width: isSelected ? 3 : 0,
                    ),
                  ),
                ),
              );
            }).toList(),
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
              onPressed: _isLoading
                  ? null
                  : () async {
                      if (_titleController.text.trim().isEmpty ||
                          _synopsisController.text.trim().isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Por favor completa el título y la sinopsis'),
                          ),
                        );
                        return;
                      }

                      setState(() => _isLoading = true);

                      final createdStory = StorySummary(
                        id: 'story-${DateTime.now().millisecondsSinceEpoch}',
                        title: _titleController.text.trim(),
                        author: 'Marina Solís',
                        authorUsername: 'marina-solis',
                        synopsis: _synopsisController.text.trim(),
                        genre: _selectedGenre,
                        status: 'published',
                        chapterCount: 0,
                        isMature: _isMature,
                        coverColor: _coverColor,
                      );

                      if (context.mounted) {
                        ref.invalidate(storiesProvider);
                        Navigator.pop(context, createdStory);
                      }
                    },
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
    );
  }
}
