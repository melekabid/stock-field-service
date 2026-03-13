import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

GoRouter buildRouter({
  required Widget loginPage,
  required Widget homePage,
  required Widget interventionsPage,
  required Widget stocksPage,
  required Widget incomingStockPage,
  required Widget stockScanPage,
  required Widget cameraPage,
  required Widget futurePage,
  required Widget Function(String id) detailBuilder,
}) {
  return GoRouter(
    initialLocation: '/login',
    routes: [
      GoRoute(path: '/login', builder: (_, __) => loginPage),
      GoRoute(path: '/home', builder: (_, __) => homePage),
      GoRoute(path: '/interventions', builder: (_, __) => interventionsPage),
      GoRoute(path: '/stocks', builder: (_, __) => stocksPage),
      GoRoute(path: '/stocks/incoming', builder: (_, __) => incomingStockPage),
      GoRoute(path: '/stocks/scan', builder: (_, __) => stockScanPage),
      GoRoute(path: '/camera', builder: (_, __) => cameraPage),
      GoRoute(path: '/future', builder: (_, __) => futurePage),
      GoRoute(
        path: '/interventions/new',
        builder: (_, __) => detailBuilder('new'),
      ),
      GoRoute(
        path: '/interventions/:id',
        builder: (_, state) => detailBuilder(state.pathParameters['id']!),
      ),
    ],
  );
}
