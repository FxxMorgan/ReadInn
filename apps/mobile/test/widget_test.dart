import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:readinn/main.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('ReadInnApp smoke test', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(
      const ProviderScope(
        child: ReadInnApp(),
      ),
    );

    // Allow async providers and animations to settle
    await tester.pumpAndSettle();

    expect(find.text('ReadInn'), findsOneWidget);
    expect(find.text('Explorar historias'), findsOneWidget);
  });
}
