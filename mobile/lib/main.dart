import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'core/constants/app_constants.dart';
import 'features/auth/presentation/login_page.dart';
import 'features/home/presentation/home_page.dart';
import 'features/home/presentation/section_placeholder_page.dart';
import 'features/interventions/presentation/intervention_detail_page.dart';
import 'features/interventions/presentation/interventions_page.dart';
import 'features/stock/presentation/stock_scan_page.dart';
import 'features/stock/presentation/stocks_page.dart';
import 'features/stock/presentation/incoming_stock_page.dart';
import 'shared/services/router.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox(AppConstants.sessionBox);
  await Hive.openBox(AppConstants.syncBox);
  runApp(const ProviderScope(child: TechnicianApp()));
}

class TechnicianApp extends StatelessWidget {
  const TechnicianApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Field Service',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: const ColorScheme.light(
          primary: Color(0xFF0F4CC9),
          secondary: Color(0xFF6FA9FF),
          surface: Colors.white,
          onPrimary: Colors.white,
          onSurface: Color(0xFF102348),
        ),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFEAF2FF),
        snackBarTheme: const SnackBarThemeData(
          behavior: SnackBarBehavior.floating,
          backgroundColor: Color(0xFF0F4CC9),
          contentTextStyle: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: Color(0xFFC8DAFF)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: Color(0xFFC8DAFF)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: Color(0xFF0F4CC9), width: 1.6),
          ),
        ),
      ),
      routerConfig: buildRouter(
        loginPage: const LoginPage(),
        homePage: const HomePage(),
        interventionsPage: const InterventionsPage(),
        stocksPage: const StocksPage(),
        incomingStockPage: const IncomingStockPage(),
        stockScanPage: const StockScanPage(),
        cameraPage: const SectionPlaceholderPage(
          title: 'Camera',
          subtitle:
              'Cette partie peut devenir votre hub media pour photos terrain, preuves visuelles et controles avant apres intervention.',
          icon: Icons.photo_camera_back_rounded,
        ),
        futurePage: const SectionPlaceholderPage(
          title: 'Nouvelle grande partie',
          subtitle:
              'Gardez cette case libre pour ajouter plus tard un nouveau module important sans refaire toute la navigation.',
          icon: Icons.auto_awesome_rounded,
        ),
        detailBuilder: (id) => InterventionDetailPage(interventionId: id),
      ),
    );
  }
}
