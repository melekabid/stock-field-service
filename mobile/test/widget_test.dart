import 'package:flutter_test/flutter_test.dart';
import 'package:stock_field_service_mobile/main.dart';

void main() {
  testWidgets('Technician app builds', (tester) async {
    await tester.pumpWidget(const TechnicianApp());
    expect(find.byType(TechnicianApp), findsOneWidget);
  });
}
