import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class ReportDialog extends StatefulWidget {
  final String targetType;
  final String targetId;
  final String title;

  const ReportDialog({
    super.key,
    required this.targetType,
    required this.targetId,
    required this.title,
  });

  static Future<bool?> show(
    BuildContext context, {
    required String targetType,
    required String targetId,
    required String title,
  }) {
    return showDialog<bool>(
      context: context,
      builder: (context) => Dialog(
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(20)),
        ),
        child: ReportDialog(
          targetType: targetType,
          targetId: targetId,
          title: title,
        ),
      ),
    );
  }

  @override
  State<ReportDialog> createState() => _ReportDialogState();
}

class _ReportDialogState extends State<ReportDialog> {
  final _detailsController = TextEditingController();
  String _selectedReason = 'inappropriate';
  bool _isSubmitting = false;

  final Map<String, String> _reasonsMap = const {
    'inappropriate': 'Contenido Inapropiado',
    'copyright': 'Derechos de Autor / Copyright',
    'spam': 'Spam o Publicidad engañosa',
    'harassment': 'Acoso o Lenguaje de Odio',
    'other': 'Otro motivo',
  };

  @override
  void dispose() {
    _detailsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 440,
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: const [
                  Icon(Icons.flag_outlined, color: Colors.red, size: 22),
                  SizedBox(width: 8),
                  Text(
                    'Reportar Contenido',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context, false),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Estás reportando: "${widget.title}"',
            style: TextStyle(
              fontSize: 13,
              color: ReadInnColors.onSurfaceVariant,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _selectedReason,
            decoration: const InputDecoration(labelText: 'Motivo del reporte'),
            items: _reasonsMap.entries
                .map(
                  (entry) => DropdownMenuItem(
                    value: entry.key,
                    child: Text(entry.value),
                  ),
                )
                .toList(),
            onChanged: (val) {
              if (val != null) setState(() => _selectedReason = val);
            },
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _detailsController,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Detalles adicionales (Opcional)',
              hintText:
                  'Explica brevemente por qué este contenido incumple las normas...',
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                ),
              ),
              onPressed: _isSubmitting
                  ? null
                  : () async {
                      setState(() => _isSubmitting = true);
                      await Future.delayed(const Duration(milliseconds: 600));

                      if (context.mounted) {
                        Navigator.pop(context, true);
                      }
                    },
              child: _isSubmitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text(
                      'Enviar Reporte',
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
