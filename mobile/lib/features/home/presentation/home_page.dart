import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../shared/widgets/sacoges_logo.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  static const _cards = [
    _HomeCardData(
      title: 'Interventions',
      subtitle: 'Creer, consulter et modifier les fiches terrain avec signatures et PDF.',
      route: '/interventions',
      icon: Icons.assignment_rounded,
      gradient: [Color(0xFF0A3EAF), Color(0xFF3F86FF)],
      surface: Color(0xFFDCE8FF),
      badge: 'Terrain',
    ),
    _HomeCardData(
      title: 'Gestion de stocks',
      subtitle: 'Suivre les quantites, scanner un code-barres et tracer les sorties produit.',
      route: '/stocks',
      icon: Icons.inventory_2_rounded,
      gradient: [Color(0xFF0C5F8A), Color(0xFF55C7FF)],
      surface: Color(0xFFE5FAFF),
      badge: 'Magasin',
    ),
    _HomeCardData(
      title: 'Camera',
      subtitle: 'Capturer des preuves visuelles et preparer les photos de chantier.',
      route: '/camera',
      icon: Icons.photo_camera_back_rounded,
      gradient: [Color(0xFF163C7A), Color(0xFF739DFF)],
      surface: Color(0xFFE4EBFF),
      badge: 'Media',
    ),
    _HomeCardData(
      title: "Produits commandes en attente d'arrivee",
      subtitle: "Suivre les commandes d'approvisionnement, modifier les lignes et valider l'arrivee du produit dans le stock.",
      route: '/stocks/incoming',
      icon: Icons.local_shipping_rounded,
      gradient: [Color(0xFF365A14), Color(0xFF7CCF53)],
      surface: Color(0xFFF1FFE5),
      badge: 'Appro',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF071A46),
              Color(0xFF0F4CC9),
              Color(0xFFEAF2FF),
            ],
            stops: [0, 0.45, 1],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _HomeHeader(),
                const SizedBox(height: 22),
                const _HeroPanel(),
                const SizedBox(height: 24),
                for (final card in _cards) ...[
                  _HomeCard(card: card),
                  const SizedBox(height: 18),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HomeHeader extends StatelessWidget {
  const _HomeHeader();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const SacogesLogo(size: 62, padding: 4),
        const SizedBox(width: 16),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Accueil',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 30,
                  fontWeight: FontWeight.w900,
                ),
              ),
              SizedBox(height: 4),
              Text(
                'Choisissez votre espace de travail pour avancer plus vite sur le terrain.',
                style: TextStyle(
                  color: Color(0xFFDCE8FF),
                  fontSize: 14,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _HeroPanel extends StatelessWidget {
  const _HeroPanel();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        color: Colors.white.withValues(alpha: 0.14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33061C4A),
            blurRadius: 30,
            offset: Offset(0, 18),
          ),
        ],
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Centre de pilotage mobile',
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.w900,
            ),
          ),
          SizedBox(height: 10),
          Text(
            'Un accueil clair, rapide et stable pour acceder aux interventions, au stock et aux outils terrain sans friction.',
            style: TextStyle(
              color: Color(0xFFE8F1FF),
              height: 1.5,
              fontSize: 15,
            ),
          ),
        ],
      ),
    );
  }
}

class _HomeCard extends StatelessWidget {
  const _HomeCard({required this.card});

  final _HomeCardData card;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(30),
        onTap: () => context.go(card.route),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(30),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: card.gradient,
            ),
            boxShadow: const [
              BoxShadow(
                color: Color(0x330A2E6F),
                blurRadius: 28,
                offset: Offset(0, 18),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          card.badge,
                          style: TextStyle(
                            color: card.surface,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      width: 68,
                      height: 68,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.20)),
                      ),
                      child: Icon(card.icon, color: Colors.white, size: 34),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Text(
                  card.title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  card.subtitle,
                  style: TextStyle(
                    color: card.surface,
                    height: 1.5,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Text(
                      'Ouvrir',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                      ),
                    ),
                    SizedBox(width: 8),
                    Icon(Icons.arrow_forward_rounded, color: Colors.white),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HomeCardData {
  const _HomeCardData({
    required this.title,
    required this.subtitle,
    required this.route,
    required this.icon,
    required this.gradient,
    required this.surface,
    required this.badge,
  });

  final String title;
  final String subtitle;
  final String route;
  final IconData icon;
  final List<Color> gradient;
  final Color surface;
  final String badge;
}
