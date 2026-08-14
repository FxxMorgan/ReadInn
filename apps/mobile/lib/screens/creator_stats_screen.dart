import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';
import '../widgets/readinn_widgets.dart';

class CreatorStatsScreen extends StatelessWidget {
  const CreatorStatsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ReadInnShell(
      currentIndex: 2,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 22, 16, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                IconButton(
                  onPressed: () => context.go('/writer/dashboard'),
                  icon: const Icon(Icons.arrow_back_rounded),
                ),
                const SizedBox(width: 4),
                const Text(
                  'Estadísticas',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
                ),
              ],
            ),
            const SizedBox(height: 4),
            const Padding(
              padding: EdgeInsets.only(left: 52),
              child: Text(
                'Analiza el impacto de tus obras en tus lectores.',
                style: TextStyle(color: ReadInnColors.muted),
              ),
            ),
            const SizedBox(height: 22),
            const Text(
              'Rendimiento',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.25,
              children: const [
                MetricTile(
                  label: 'Visitas totales',
                  value: '124.5K',
                  delta: '+12.4%',
                  icon: Icons.visibility_outlined,
                ),
                MetricTile(
                  label: 'Tiempo medio',
                  value: '18m',
                  delta: '+2.3m',
                  icon: Icons.timer_outlined,
                ),
                MetricTile(
                  label: 'Nuevos seguidores',
                  value: '842',
                  delta: '+8.1%',
                  icon: Icons.person_add_alt_1_outlined,
                ),
                MetricTile(
                  label: 'Finalización',
                  value: '68%',
                  delta: '+5.2%',
                  icon: Icons.check_circle_outline,
                ),
              ],
            ),
            const SizedBox(height: 26),
            Card(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 16, 14, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Crecimiento de lectores',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Últimos 30 días',
                      style: TextStyle(
                        color: ReadInnColors.muted,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      height: 170,
                      width: double.infinity,
                      child: CustomPaint(painter: _GrowthChartPainter()),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 26),
            const Text(
              'Desglose por obra',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            const _WorkStat(
              title: 'The Architect\'s Dream',
              reads: '84,210',
              completion: '76%',
              color: ReadInnColors.indigo,
            ),
            const SizedBox(height: 10),
            const _WorkStat(
              title: 'Echoes of the Valley',
              reads: '32,580',
              completion: '61%',
              color: ReadInnColors.primary,
            ),
            const SizedBox(height: 10),
            const _WorkStat(
              title: 'Silent Whispers',
              reads: '7,710',
              completion: '42%',
              color: Color(0xFF94A3B8),
            ),
          ],
        ),
      ),
    );
  }
}

class _WorkStat extends StatelessWidget {
  final String title;
  final String reads;
  final String completion;
  final Color color;

  const _WorkStat({
    required this.title,
    required this.reads,
    required this.completion,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 10,
              height: 44,
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(5),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    '$reads lecturas',
                    style: const TextStyle(
                      color: ReadInnColors.muted,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const Text(
                  'Finalización',
                  style: TextStyle(color: ReadInnColors.muted, fontSize: 10),
                ),
                const SizedBox(height: 4),
                Text(
                  completion,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _GrowthChartPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final grid = Paint()
      ..color = ReadInnColors.border
      ..strokeWidth = 1;
    for (var i = 1; i < 4; i++) {
      final y = size.height * i / 4;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }
    final line = Paint()
      ..color = ReadInnColors.primary
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;
    final fill = Paint()
      ..color = ReadInnColors.primary.withValues(alpha: 0.12)
      ..style = PaintingStyle.fill;
    final points = [
      Offset(0, size.height * .78),
      Offset(size.width * .16, size.height * .68),
      Offset(size.width * .32, size.height * .72),
      Offset(size.width * .48, size.height * .52),
      Offset(size.width * .64, size.height * .58),
      Offset(size.width * .8, size.height * .26),
      Offset(size.width, size.height * .12),
    ];
    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (var i = 1; i < points.length; i++) {
      final previous = points[i - 1];
      final current = points[i];
      final control = Offset((previous.dx + current.dx) / 2, previous.dy);
      final control2 = Offset((previous.dx + current.dx) / 2, current.dy);
      path.cubicTo(
        control.dx,
        control.dy,
        control2.dx,
        control2.dy,
        current.dx,
        current.dy,
      );
    }
    final fillPath = Path.from(path)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(fillPath, fill);
    canvas.drawPath(path, line);
    final dot = Paint()..color = ReadInnColors.primaryDeep;
    canvas.drawCircle(points.last, 5, dot);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
